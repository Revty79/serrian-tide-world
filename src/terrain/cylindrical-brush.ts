import type { SurfacePosition } from '../surfaces/contracts.ts';
import { assertFloat32Elevation } from './model.ts';
import { radialFalloff, saturatedElevation } from './brush-math.ts';
import { cylinderBrushCandidates } from './cylindrical-candidates.ts';
import { cylindricalSmoothEstimate } from './cylindrical-smoothing.ts';
import { MAX_CYLINDER_PATCH_SAMPLES, type CylinderPatchBlock, type CylindricalTerrain } from './cylindrical.ts';

export type CylindricalBrushSettings = {
  readonly version: 1;
  readonly radiusMeters: number;
  /** Absolute cubic falloff-weight error, not a distance treated as exact. Default 1e-6. */
  readonly maxFalloffError?: number;
} & (
  | { readonly tool: 'raise'; readonly strengthMeters: number }
  | { readonly tool: 'lower'; readonly strengthMeters: number }
  | { readonly tool: 'smooth'; readonly intensity: number }
  | { readonly tool: 'flatten'; readonly intensity: number; readonly targetElevation: number }
);
export interface CylinderDabLimits {
  readonly maxCandidates?: number;
  readonly maxDistanceQueries?: number;
  readonly maxDistanceBoxes?: number;
  readonly distanceQueryMaxBoxes?: number;
  readonly maxPreparedBytes?: number;
}
export type CylinderDabStatus = 'preparing' | 'ready' | 'committed' | 'cancelled' | 'failed';
const CHUNK = 1024;
export const CYLINDER_DAB_LIMITS = Object.freeze({ maxCandidates: 65536, maxDistanceQueries: 16384, maxDistanceBoxes: 262144, distanceQueryMaxBoxes: 32768, maxPreparedBytes: 1024 * 1024 });
const limitSnapshot = (input: CylinderDabLimits) => {
  const output = { ...CYLINDER_DAB_LIMITS, ...input };
  for (const name of Object.keys(CYLINDER_DAB_LIMITS) as (keyof typeof CYLINDER_DAB_LIMITS)[]) {
    if (!Number.isSafeInteger(output[name]) || output[name] < 1 || output[name] > CYLINDER_DAB_LIMITS[name]) throw new RangeError('Cylinder dab budgets can only lower the supported hard limits.');
  }
  return Object.freeze(output);
};
function settingsSnapshot(input: CylindricalBrushSettings) {
  const s = Object.freeze({ ...input, maxFalloffError: input.maxFalloffError ?? 1e-6 });
  if (s.version !== 1 || !['raise', 'lower', 'smooth', 'flatten'].includes(s.tool) || !Number.isFinite(s.radiusMeters) || s.radiusMeters <= 0
    || !Number.isFinite(s.maxFalloffError) || s.maxFalloffError < 1e-9 || s.maxFalloffError > 1e-3) throw new RangeError('Invalid versioned physical cylinder brush settings.');
  if (s.tool === 'raise' || s.tool === 'lower') {
    assertFloat32Elevation(s.strengthMeters); if (Math.fround(s.strengthMeters) <= 0) throw new RangeError('Positive cylinder strength in meters per dab required.');
  } else {
    if (!Number.isFinite(s.intensity) || s.intensity < 0 || s.intensity > 1) throw new RangeError('Cylinder intensity must be in [0,1].');
    if (s.tool === 'flatten') assertFloat32Elevation(s.targetElevation);
  }
  return s;
}
/** Monotone cubic influence enclosure on a certified distance interval. */
export function cylinderFalloffEnclosure(lower: number, upper: number, radius: number) {
  if (![lower, upper, radius].every(Number.isFinite) || lower < 0 || upper < lower || radius <= 0) throw new RangeError('Invalid distance interval for cylinder falloff.');
  if (lower >= radius) return { lower: 0, upper: 0, value: 0, error: 0 };
  if (upper === 0) return { lower: 1, upper: 1, value: 1, error: 0 };
  const first = lower / radius, last = upper / radius;
  const ratioPad = 32 * Number.EPSILON * Math.max(1, first, last);
  const f = (t: number) => t >= 1 ? 0 : t <= 0 ? 1 : radialFalloff(t);
  // Expand the divided interval, then use relative polynomial roundoff. An
  // absolute weight pad would needlessly swamp the cubic's tiny boundary tail.
  const lo = Math.max(0, f(last + ratioPad) * (1 - 32 * Number.EPSILON) - 8 * Number.MIN_VALUE);
  const hi = Math.min(1, f(Math.max(0, first - ratioPad)) * (1 + 32 * Number.EPSILON) + 8 * Number.MIN_VALUE);
  return { lower: lo, upper: hi, value: (lo + hi) / 2, error: (hi - lo) / 2 + 8 * Number.EPSILON * hi + 8 * Number.MIN_VALUE };
}

/** One numerical dab only. pump prepares a guarded source epoch; commit is explicit and atomic. */
export function prepareCylindricalDab(terrain: CylindricalTerrain, input: SurfacePosition, inputSettings: CylindricalBrushSettings, inputLimits: CylinderDabLimits = {}) {
  const settings = settingsSnapshot(inputSettings), limits = limitSnapshot(inputLimits);
  const plan = cylinderBrushCandidates(terrain, input, settings.radiusMeters), center = Object.freeze({ ...plan.center });
  const revision = terrain.revision, binding = terrain.keyAt(0);
  let status: CylinderDabStatus = (settings.tool === 'smooth' || settings.tool === 'flatten') && settings.intensity === 0 ? 'ready' : 'preparing';
  let iterator: ReturnType<typeof plan.samples> | undefined = status === 'preparing' ? plan.samples() : undefined;
  const blocks: { indices: Uint32Array; values: Float32Array; count: number }[] = [];
  let block: typeof blocks[number] | undefined;
  const statistics = { pumps: 0, candidates: 0, chordRejected: 0, distanceQueries: 0, refinements: 0, distanceBoxes: 0, failedQueryBoxAllowance: 0,
    affectedSamples: 0, changesPrepared: 0, writes: 0, preparedBytes: 0, peakPreparedBytes: 0, sourceReads: 0, maxSmoothNeighbors: 0,
    maxFalloffError: 0, maxPreRoundElevationErrorMeters: 0 };
  const release = () => { blocks.length = 0; block = undefined; iterator = undefined; statistics.preparedBytes = 0; };
  const synchronized = () => { if (terrain.revision !== revision) throw new Error('Cylinder dab source changed during preparation.'); };
  const influence = (position: SurfacePosition) => {
    let tolerance = Math.max(Number.MIN_VALUE, settings.radiusMeters * settings.maxFalloffError);
    for (let refinement = 0; refinement < 6; refinement++) {
      if (statistics.distanceQueries >= limits.maxDistanceQueries) throw new RangeError('Cylinder dab distance-query budget exceeded.');
      const maxBoxes = Math.min(limits.distanceQueryMaxBoxes, limits.maxDistanceBoxes - statistics.distanceBoxes);
      if (maxBoxes < 1) throw new RangeError('Cylinder dab distance-box budget exceeded.');
      statistics.distanceQueries++;
      statistics.failedQueryBoxAllowance = maxBoxes;
      const distance = terrain.geometry.globalDistance(center, position, { absoluteToleranceMeters: tolerance, maxBoxes });
      statistics.failedQueryBoxAllowance = 0; statistics.distanceBoxes += distance.evaluatedBoxes;
      const lo = distance.lowerBoundMeters, hi = distance.upperBoundMeters;
      if (distance.scope !== 'global-reference-surface' || ![lo, hi].every(Number.isFinite) || lo < 0 || hi < lo || hi - lo > tolerance) throw new RangeError('Invalid global distance enclosure.');
      if (lo >= settings.radiusMeters) return { value: 0, error: 0 };
      if (hi < settings.radiusMeters) {
        const weight = cylinderFalloffEnclosure(lo, hi, settings.radiusMeters);
        if (weight.error <= settings.maxFalloffError) return weight;
      }
      statistics.refinements++; tolerance = Math.max(Number.MIN_VALUE, tolerance / 16);
    }
    throw new RangeError('Cylinder dab cannot certify a boundary or falloff within its refinement limit.');
  };
  const append = (index: number, value: number) => {
    if (statistics.changesPrepared >= MAX_CYLINDER_PATCH_SAMPLES) throw new RangeError('Cylinder dab patch budget exceeded.');
    if (!block || block.count === CHUNK) {
      if (statistics.preparedBytes + CHUNK * 8 > limits.maxPreparedBytes) throw new RangeError('Cylinder dab prepared-memory budget exceeded.');
      block = { indices: new Uint32Array(CHUNK), values: new Float32Array(CHUNK), count: 0 };
      blocks.push(block); statistics.preparedBytes += CHUNK * 8; statistics.peakPreparedBytes = statistics.preparedBytes;
    }
    block.indices[block.count] = index; block.values[block.count++] = value; statistics.changesPrepared++;
  };
  return Object.freeze({
    settings, center, sourceRevision: revision,
    get status(): CylinderDabStatus { return status; },
    get statistics() { return Object.freeze({ ...statistics }); },
    /** Read-only source-epoch handoff. Never exposes mutable prepared arrays. */
    *preparedChanges(expectedTerrain: CylindricalTerrain) {
      if (expectedTerrain !== terrain || status !== 'ready') throw new Error('Prepared cylinder changes require the bound authority and a ready dab.');
      synchronized();
      for (const block of blocks) for (let i = 0; i < block.count; i++) {
        if (status !== 'ready') throw new Error('Prepared cylinder dab is no longer ready.');
        synchronized();
        const index = block.indices[i]!;
        yield Object.freeze({ index, before: terrain.read(terrain.keyAt(index)), after: block.values[i]! });
      }
      if (status !== 'ready') throw new Error('Prepared cylinder dab is no longer ready.');
      synchronized();
    },
    pump(maxSamples = 64): CylinderDabStatus {
      if (!Number.isSafeInteger(maxSamples) || maxSamples < 1 || maxSamples > 512) throw new RangeError('Cylinder dab pump requires 1-512 candidate steps.');
      if (status !== 'preparing') return status;
      try {
        synchronized(); statistics.pumps++;
        for (let i = 0; i < maxSamples; i++) {
          const item = iterator!.next();
          if (item.done) { iterator = undefined; status = 'ready'; break; }
          if (++statistics.candidates > limits.maxCandidates) throw new RangeError('Cylinder dab candidate budget exceeded.');
          const { key, position } = item.value;
          if (plan.chordLowerBound(position) >= settings.radiusMeters) { statistics.chordRejected++; continue; }
          const weight = influence(position);
          if (weight.value === 0) continue;
          statistics.affectedSamples++; statistics.maxFalloffError = Math.max(statistics.maxFalloffError, weight.error);
          const current = terrain.read(key); statistics.sourceReads++;
          assertFloat32Elevation(current);
          let next: number, error: number;
          if (settings.tool === 'raise' || settings.tool === 'lower') {
            next = current + (settings.tool === 'raise' ? 1 : -1) * settings.strengthMeters * weight.value;
            error = settings.strengthMeters * weight.error;
          } else {
            const blend = settings.intensity * weight.value;
            if (settings.tool === 'flatten') {
              next = blend === 1 ? settings.targetElevation : (1 - blend) * current + blend * settings.targetElevation;
              error = settings.intensity * Math.abs(settings.targetElevation - current) * weight.error;
            } else {
              const estimate = cylindricalSmoothEstimate(terrain, key, current);
              statistics.sourceReads += estimate.neighbors; statistics.maxSmoothNeighbors = Math.max(statistics.maxSmoothNeighbors, estimate.neighbors);
              next = estimate.delta === 0 ? current : current + blend * estimate.delta;
              error = settings.intensity * Math.abs(estimate.delta) * weight.error + estimate.roundoffErrorMeters;
            }
          }
          if (!Number.isFinite(next) || !Number.isFinite(error)) throw new RangeError('Nonfinite cylinder dab calculation.');
          error += 128 * Number.EPSILON * Math.max(Math.abs(current), Math.abs(next), Number.MIN_VALUE);
          statistics.maxPreRoundElevationErrorMeters = Math.max(statistics.maxPreRoundElevationErrorMeters, error);
          next = saturatedElevation(next); assertFloat32Elevation(next);
          if (!Object.is(next, current)) append(key.index, next);
        }
        synchronized(); return status;
      } catch (cause) { status = 'failed'; release(); throw cause; }
    },
    commit(): number {
      if (status !== 'ready') throw new Error('Cylinder dab must be ready before committing.');
      try {
        synchronized(); const changed = terrain.commitPreparedPatch(binding, revision, blocks as readonly CylinderPatchBlock[]);
        statistics.writes = changed; status = 'committed'; release(); return changed;
      } catch (cause) { status = 'failed'; release(); throw cause; }
    },
    cancel(): void { if (status === 'preparing' || status === 'ready') { status = 'cancelled'; release(); } },
  });
}
