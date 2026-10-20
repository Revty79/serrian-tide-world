import type { SurfacePosition } from '../surfaces/contracts.ts';
import { createCubeBrushDistancePlan, cubeBrushFalloff, cubeBrushRatioRoot, CubeDabCertificationError, type CubeDabMeter } from '../surfaces/cube-brush-distance.ts';
import { assertFloat32Elevation } from './model.ts';
import { saturatedElevation } from './brush-math.ts';
import { MAX_CUBE_PATCH_SAMPLES, type CubePatchBlock, type SolidCubeSampleKey, type SolidCubeTerrain } from './solid-cube.ts';

export type CubeBrushSettings = { readonly version: 1; readonly radiusMeters: number; readonly maxFalloffError?: number } & (
  | { readonly tool: 'raise'; readonly strengthMeters: number }
  | { readonly tool: 'lower'; readonly strengthMeters: number }
  | { readonly tool: 'smooth'; readonly intensity: number }
  | { readonly tool: 'flatten'; readonly intensity: number; readonly targetElevation: number }
);
export const CUBE_DAB_LIMITS = Object.freeze({ maxCandidates: 131_072, maxWorkUnits: 16_000_000, maxScanSlots: 400_000,
  maxPreparedBytes: 786_432, maxChanges: MAX_CUBE_PATCH_SAMPLES, maxSourceReads: 655_360 });
export type CubeDabLimits = { readonly [K in keyof typeof CUBE_DAB_LIMITS]?: number };
export type CubeDabStatus = 'preparing' | 'ready' | 'committed' | 'cancelled' | 'failed';
const CHUNK = 1024;
function settingsSnapshot(input: CubeBrushSettings) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RangeError('Versioned cube brush settings required.');
  const s = Object.freeze({ ...input, maxFalloffError: input.maxFalloffError ?? 1e-12 });
  if (s.version !== 1 || !['raise', 'lower', 'smooth', 'flatten'].includes(s.tool) || !Number.isFinite(s.radiusMeters) || s.radiusMeters <= 0
    || !Number.isFinite(s.maxFalloffError) || s.maxFalloffError < 0 || s.maxFalloffError > 1e-3) throw new RangeError('Invalid cube brush radius, version, tool or accuracy.');
  if (s.tool === 'raise' || s.tool === 'lower') { assertFloat32Elevation(s.strengthMeters); if (Math.fround(s.strengthMeters) <= 0) throw new RangeError('Positive representable cube strength in meters required.'); }
  else {
    if (!Number.isFinite(s.intensity) || s.intensity < 0 || s.intensity > 1) throw new RangeError('Cube intensity must be in [0,1].');
    if (s.tool === 'flatten') assertFloat32Elevation(s.targetElevation);
  }
  return s;
}
function limitsSnapshot(input: CubeDabLimits) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RangeError('Cube dab limits must be an object.');
  const result = { ...CUBE_DAB_LIMITS, ...input };
  for (const name of Object.keys(CUBE_DAB_LIMITS) as (keyof typeof CUBE_DAB_LIMITS)[]) if (!Number.isSafeInteger(result[name]) || result[name] < 1 || result[name] > CUBE_DAB_LIMITS[name]) throw new RangeError('Cube dab limits can only lower supported bounds.');
  return Object.freeze(result);
}

/** Lazy, convex graph filter; reference mesh edge lengths define inverse-square conductance. */
export function cubeSmoothEstimate(terrain: SolidCubeTerrain, key: SolidCubeSampleKey, current: number, read: (key: SolidCubeSampleKey) => number = terrain.read) {
  const here = terrain.referencePositionAt(key), neighbors = terrain.neighbors(key);
  if (neighbors.length < 3 || neighbors.length > 4) throw new CubeDabCertificationError('certificate', 'Invalid connected cube stencil degree.');
  let sum = 0, delta = 0, largestDifference = 0;
  for (const neighbor of neighbors) {
    const q = terrain.referencePositionAt(neighbor), differences = here.map((v, i) => Math.abs(v-q[i]!)).filter((v) => v !== 0);
    // Each Cube-A neighbor is one REAL mesh edge on at least one common closed face.
    if (differences.length !== 1 || !Number.isFinite(differences[0]) || differences[0]! <= 0) throw new CubeDabCertificationError('certificate', 'Invalid physical cube neighbor segment.');
    const ratio = terrain.sampleSpacingMeters / differences[0]!, conductance = ratio*ratio, value = read(neighbor);
    if (!Number.isFinite(conductance) || conductance <= 0 || !Number.isFinite(value)) throw new CubeDabCertificationError('certificate', 'Invalid cube Smooth conductance/source.');
    const difference = value-current; sum += conductance; delta += conductance*difference; largestDifference = Math.max(largestDifference, Math.abs(difference));
  }
  const result = delta/(2*sum);
  if (!Number.isFinite(result)) throw new CubeDabCertificationError('certificate', 'Nonfinite cube Smooth estimate.');
  return { delta: result, neighbors: neighbors.length, roundoffErrorMeters: 256*Number.EPSILON*largestDifference };
}

/** Cooperative preparation of ONE dab. No timers, browser state, stroke, history or worker ownership. */
export function prepareSolidCubeDab(terrain: SolidCubeTerrain, input: SurfacePosition, inputSettings: CubeBrushSettings, inputLimits: CubeDabLimits = {}) {
  const settings = settingsSnapshot(inputSettings), limits = limitsSnapshot(inputLimits), revision = terrain.revision, binding = terrain.keyAt(0);
  const statistics = { pumps: 0, workUnits: 0, initializationWork: 0, scanSlots: 0, aliasSlotsSkipped: 0, candidates: 0,
    sequenceTests: 0, portalTests: 0, squaredRejected: 0, chordRejected: 0, commonFace: 0, rootComparisons: 0, rootFallbacks: 0,
    affectedSamples: 0, changesPrepared: 0, writes: 0, sourceReads: 0, maxSmoothNeighbors: 0,
    preparedBytes: 0, peakPreparedBytes: 0, maxFalloffError: 0, maxPreRoundElevationErrorMeters: 0 };
  const tick = () => { if (statistics.workUnits >= limits.maxWorkUnits) throw new CubeDabCertificationError('work', 'Cube dab work budget exhausted.'); statistics.workUnits++; };
  const meter = Object.assign(statistics, { tick }) satisfies CubeDabMeter;
  const plan = createCubeBrushDistancePlan(terrain, input, settings.radiusMeters, meter);
  statistics.initializationWork = statistics.workUnits;
  let status: CubeDabStatus = ((settings.tool === 'smooth' || settings.tool === 'flatten') && settings.intensity === 0) ? 'ready' : 'preparing';
  const blocks: { indices: Uint32Array; before: Float32Array; after: Float32Array; count: number }[] = [];
  let block: typeof blocks[number] | undefined;
  const synchronized = () => { if (terrain.revision !== revision) throw new CubeDabCertificationError('source', 'Cube dab source epoch changed.'); };
  const read = (key: SolidCubeSampleKey) => { if (statistics.sourceReads >= limits.maxSourceReads) throw new CubeDabCertificationError('work', 'Cube dab read limit exhausted.'); statistics.sourceReads++; const value = terrain.read(key); assertFloat32Elevation(value); return value; };
  const append = (index: number, before: number, after: number) => {
    if (statistics.changesPrepared >= limits.maxChanges) throw new CubeDabCertificationError('work', 'Cube dab atomic change limit exhausted.');
    if (!block || block.count === CHUNK) {
      if (statistics.preparedBytes + CHUNK*12 > limits.maxPreparedBytes) throw new CubeDabCertificationError('work', 'Cube dab preparation-buffer limit exhausted.');
      block = { indices: new Uint32Array(CHUNK), before: new Float32Array(CHUNK), after: new Float32Array(CHUNK), count: 0 }; blocks.push(block);
      statistics.preparedBytes += CHUNK*12; statistics.peakPreparedBytes = statistics.preparedBytes;
    }
    block.indices[block.count] = index; block.before[block.count] = before; block.after[block.count++] = after; statistics.changesPrepared++;
  };
  function* prepare(): Generator<void> {
    let previous = -1;
    for (const address of plan.slots()) {
      tick();
      if (statistics.scanSlots >= limits.maxScanSlots) throw new CubeDabCertificationError('work', 'Cube dab discovery-slot limit exhausted.'); statistics.scanSlots++;
      const key = terrain.resolve(address), own = terrain.owner(key), owned = own.patchId === address.patchId;
      if (!owned) statistics.aliasSlotsSkipped++;
      else {
        if (statistics.candidates >= limits.maxCandidates) throw new CubeDabCertificationError('work', 'Cube dab candidate limit exhausted.'); statistics.candidates++;
        if (key.index <= previous) throw new CubeDabCertificationError('certificate', 'Cube discovery violated canonical ordering.'); previous = key.index;
      }
      yield;
      if (!owned) continue;
      const squared = yield* plan.squared(address.patchId, address.column, address.row);
      if (squared === null) continue;
      const root = yield* cubeBrushRatioRoot(squared, plan.radiusSquared, meter), weight = cubeBrushFalloff(root);
      tick();
      if (weight.error > settings.maxFalloffError) throw new CubeDabCertificationError('precision', 'Cube influence cannot meet the requested error bound.');
      statistics.affectedSamples++; statistics.maxFalloffError = Math.max(statistics.maxFalloffError, weight.error);
      const current = read(key); let next: number, error: number;
      if (settings.tool === 'raise' || settings.tool === 'lower') {
        const delta = (settings.tool === 'raise' ? 1 : -1)*settings.strengthMeters*weight.value;
        next = delta === 0 ? current : current + delta;
        error = settings.strengthMeters*weight.error;
      } else {
        const blend = settings.intensity*weight.value;
        if (settings.tool === 'flatten') {
          next = blend === 0 ? current : blend === 1 ? settings.targetElevation : (1-blend)*current + blend*settings.targetElevation;
          error = settings.intensity*Math.abs(settings.targetElevation-current)*weight.error;
        } else {
          const estimate = cubeSmoothEstimate(terrain, key, current, read); statistics.maxSmoothNeighbors = Math.max(statistics.maxSmoothNeighbors, estimate.neighbors);
          const delta = blend*estimate.delta; next = delta === 0 ? current : current + delta;
          error = settings.intensity*Math.abs(estimate.delta)*weight.error + estimate.roundoffErrorMeters;
        }
      }
      error += 256*Number.EPSILON*Math.max(Math.abs(current), Math.abs(next), Number.MIN_VALUE);
      if (!Number.isFinite(next) || !Number.isFinite(error)) throw new CubeDabCertificationError('certificate', 'Nonfinite cube brush calculation.');
      statistics.maxPreRoundElevationErrorMeters = Math.max(statistics.maxPreRoundElevationErrorMeters, error);
      const preRound = next; next = saturatedElevation(next);
      // An underflowed delta does not manufacture a new zero sign. An explicit
      // full Flatten target still owns its selected (including -0) result.
      if (next === 0 && current === 0 && preRound !== 0 && !(settings.tool === 'flatten' && settings.intensity*weight.value === 1)) next = current;
      assertFloat32Elevation(next);
      if (!Object.is(current, next)) append(key.index, current, next);
      yield;
    }
  }
  let iterator: Generator<void> | undefined = status === 'preparing' ? prepare() : undefined;
  const release = () => { blocks.length = 0; block = undefined; iterator = undefined; statistics.preparedBytes = 0; };
  return Object.freeze({ settings, center: plan.center, sourceRevision: revision, plan: plan.summary, limits,
    get status(): CubeDabStatus { return status; }, get statistics() { const { tick: _tick, ...snapshot } = meter; return Object.freeze(snapshot); },
    pump(maxWorkUnits = 256): CubeDabStatus {
      if (!Number.isSafeInteger(maxWorkUnits) || maxWorkUnits < 1 || maxWorkUnits > 4096) throw new RangeError('Cube dab pump needs 1-4096 bounded work steps.');
      if (status !== 'preparing') return status;
      try {
        synchronized(); statistics.pumps++;
        for (let i = 0; i < maxWorkUnits; i++) if (iterator!.next().done) { iterator = undefined; status = 'ready'; break; }
        synchronized(); return status;
      } catch (error) { status = 'failed'; release(); throw error; }
    },
    /** Detached scalar records, suitable for a future C2 adapter, never mutable prepared buffers. */
    *preparedChanges(expectedTerrain: SolidCubeTerrain) {
      if (expectedTerrain !== terrain || status !== 'ready') throw new Error('Cube changes require the bound authority and a ready dab.');
      synchronized();
      for (const b of blocks) for (let i = 0; i < b.count; i++) {
        if (status !== 'ready') throw new Error('Cube prepared dab is no longer ready.'); synchronized();
        yield Object.freeze({ index: b.indices[i]!, before: b.before[i]!, after: b.after[i]! });
      }
      if (status !== 'ready') throw new Error('Cube prepared dab is no longer ready.'); synchronized();
    },
    commit(): number {
      if (status !== 'ready') throw new Error('Cube dab must be ready before commit.');
      try { synchronized(); const changes = terrain.commitPreparedPatch(binding, revision, blocks as readonly CubePatchBlock[]); statistics.writes = changes; status = 'committed'; release(); return changes; }
      catch (error) { status = 'failed'; release(); throw error; }
    },
    cancel(): void { if (status === 'preparing' || status === 'ready') { status = 'cancelled'; release(); } },
  });
}
export type PreparedSolidCubeDab = ReturnType<typeof prepareSolidCubeDab>;
