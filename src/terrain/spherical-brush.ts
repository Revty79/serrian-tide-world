import {cutGlobeVisible,type CrescentCutGlobeGeometry} from '../surfaces/crescent-cut-globe.ts';
import type {RoundedCrescentGeometry} from '../surfaces/rounded-crescent-globe.ts';
import {roundedBrushMetric,validateRoundedBrush} from './rounded-crescent-brush-metric.ts';
import {roundedVisible} from '../surfaces/rounded-crescent-ray.ts';
import type { SurfaceIdentity, SurfacePosition } from '../surfaces/contracts.ts';
import { dot3, unitDirection, type Vec3 } from '../surfaces/cube-sphere.ts';
import { greatCircleArc, unitArcAngle } from '../surfaces/great-circle.ts';
import type { SphericalHistory } from '../editor/spherical-history.ts';
import { assertFloat32Elevation } from './model.ts';
import { radialFalloff, saturatedElevation } from './brush-math.ts';
import type { SphericalTerrain } from './spherical.ts';
import { sphericalCapCandidates } from './spherical-cap.ts';
import { sphericalSmoothDelta } from './spherical-smoothing.ts';

export type SphericalBrushPoint = SurfacePosition | (SurfaceIdentity & { readonly direction: Vec3 });
export type SphericalBrushSettings = { readonly radiusMeters: number } & (
  | { readonly tool: 'raise'; readonly strengthMeters: number }
  | { readonly tool: 'lower'; readonly strengthMeters: number }
  | { readonly tool: 'smooth'; readonly intensity: number }
  | { readonly tool: 'flatten'; readonly intensity: number; readonly targetElevation: number }
);
/** Immutable physical visibility for one input segment; interpolation follows its arc fraction. */
export interface SphericalBrushVisibility { readonly hemisphere: Vec3; readonly endHemisphere?: Vec3 }
export const MAX_SEGMENT_DABS = 65_536;
const CHUNK_SAMPLES = 4096;
const activeTerrains = new WeakSet<SphericalTerrain>();
function directionOf(terrain: SphericalTerrain, point: SphericalBrushPoint): Vec3 {
  const identity = terrain.metadata.identity;
  if (point.worldId !== identity.worldId || point.surfaceId !== identity.surfaceId) throw new RangeError('Brush position belongs to another World or surface.');
  return 'direction' in point ? unitDirection(point.direction) : terrain.geometry.direction(point);
}
export function validateSphericalBrushSettings(terrain: SphericalTerrain, settings: SphericalBrushSettings) {
  const angular = settings.radiusMeters / terrain.metadata.geometry.radiusMeters;
  if (!['raise', 'lower', 'smooth', 'flatten'].includes(settings.tool) || !Number.isFinite(settings.radiusMeters) || !Number.isFinite(angular) || angular < 1e-12 || settings.radiusMeters > terrain.metadata.geometry.radiusMeters * Math.PI || settings.radiusMeters / 4 === 0) throw new RangeError('Spherical brush radius must be finite, at least 1e-12 radians and at most pi radians, in meters.');
  if (settings.tool === 'raise' || settings.tool === 'lower') {
    assertFloat32Elevation(settings.strengthMeters);
    if (Math.fround(settings.strengthMeters) <= 0) throw new RangeError('Spherical strength must be positive meters per dab.');
  } else {
    if (!Number.isFinite(settings.intensity) || settings.intensity < 0 || settings.intensity > 1) throw new RangeError('Spherical intensity must be a blend factor in [0,1].');
    if (settings.tool === 'flatten') assertFloat32Elevation(settings.targetElevation);
  }
}

/** Physical great-circle input; one initial dab then radius/4 meters, independent of charts/UI. */
export interface PreparedSphericalDab { readonly center: Vec3; readonly visible?: Vec3; readonly fraction: number; changes(): Generator<{index:number;before:number;after:number}> }
export interface SphericalPreparationOptions { readonly deferInitial?: boolean; readonly commitReady?: (job: PreparedSphericalDab) => boolean;readonly roundedGlobe?:RoundedCrescentGeometry }
export function startSphericalBrushStroke(terrain: SphericalTerrain, point: SphericalBrushPoint, settings: SphericalBrushSettings, history?: SphericalHistory, domain?: { readonly hemisphere: Vec3;readonly cutGlobe?:CrescentCutGlobeGeometry }, preparation: SphericalPreparationOptions = {}) {
  validateSphericalBrushSettings(terrain, settings); const initial = directionOf(terrain, point);
  const rounded=preparation.roundedGlobe,metric=rounded&&roundedBrushMetric(rounded,terrain);if(rounded)validateRoundedBrush(rounded,settings);
  const hemisphere = domain ? unitDirection(domain.hemisphere) : undefined;
  if (activeTerrains.has(terrain)) throw new Error('A spherical stroke is already active on this terrain.');
  if (history && !history.owns(terrain)) throw new RangeError('History belongs to another spherical terrain.');
  const snapshot = Object.freeze({ ...settings }), radius = terrain.metadata.geometry.radiusMeters, spacing = snapshot.radiusMeters / 4;
  const stats = { dabs: 0, candidateChecks: 0, affectedSamples: 0, writes: 0, peakPreparedBytes: 0 };
  let previous = initial, untilNext = spacing, active = true, advancing = false;
  function* stamp(center: Vec3, visible = hemisphere, fraction = 0): Generator<boolean,boolean> {
    const candidates = sphericalCapCandidates(terrain, center, metric?metric.angularRadius(snapshot.radiusMeters):Math.min(Math.PI, snapshot.radiusMeters / radius),metric?.coordinateBounds(center,snapshot.radiusMeters));
    const chunks: { indices: Uint32Array; values: Float32Array; count: number }[] = [];
    let chunk: typeof chunks[number] | undefined, allocated = 0;
    for (const sample of candidates.samples(metric?.directionAt)) {
      stats.candidateChecks++;
      if(metric&&stats.candidateChecks%128===0)yield false;
      if(metric&&metric.lowerBound(center,sample.direction)>=snapshot.radiusMeters)continue;
      const distance = (metric?metric.distance(center,sample.direction):unitArcAngle(center, sample.direction) * radius) / snapshot.radiusMeters;
      if (distance >= 1) continue;
      // Optional physical editing domain. Default numerical behavior remains the complete cap.
      if (visible && (rounded?!roundedVisible(rounded,sample.direction,visible,terrain.metadata.representation.cellsPerEdge*1000000+sample.key.index):domain?.cutGlobe?!cutGlobeVisible(domain.cutGlobe,sample.direction,visible):dot3(visible, sample.direction) < 0)) continue;
      const current = terrain.read(sample.key);
      if (!Number.isFinite(current)) throw new RangeError('Spherical brush region contains a nonfinite elevation.');
      stats.affectedSamples++;
      let next: number;
      if (snapshot.tool === 'raise' || snapshot.tool === 'lower') {
        // Preserve A6-B's expression and Float32 results exactly.
        next = saturatedElevation(current + (snapshot.tool === 'raise' ? 1 : -1) * snapshot.strengthMeters * radialFalloff(distance));
      } else {
        const blend = snapshot.intensity * radialFalloff(distance);
        if (blend === 0) continue;
        next = saturatedElevation(snapshot.tool === 'flatten'
          ? (1 - blend) * current + blend * snapshot.targetElevation
          : current + blend * (metric?metric.smooth(sample.key,current):sphericalSmoothDelta(terrain, sample.key, current)));
      }
      if (next === current) continue;
      if (!chunk || chunk.count === CHUNK_SAMPLES) {
        chunk = { indices: new Uint32Array(CHUNK_SAMPLES), values: new Float32Array(CHUNK_SAMPLES), count: 0 };
        chunks.push(chunk); allocated += chunk.indices.byteLength + chunk.values.byteLength;
      }
      chunk.indices[chunk.count] = sample.key.index; chunk.values[chunk.count++] = next;
    }
    // Host geometry bounds are checked for the whole prepared dab before any write.
    for(const block of chunks)for(let i=0;i<block.count;i++)terrain.validateSample(terrain.keyAt(block.indices[i]!),block.values[i]!);
    // All affected elevations are checked and prepared before the first write of this dab.
    stats.peakPreparedBytes = Math.max(stats.peakPreparedBytes, allocated); let changed = false;
    if (preparation.commitReady) {
      const job: PreparedSphericalDab = { center, visible, fraction, *changes() { for (const block of chunks) for (let i = 0; i < block.count; i++) { const index = block.indices[i]!; yield { index, before: terrain.read(terrain.keyAt(index)), after: block.values[i]! }; } } };
      while (active && !preparation.commitReady(job)) yield false;
    }
    if (!active) return false;
    for (const block of chunks) for (let i = 0; i < block.count; i++) { terrain.write(terrain.keyAt(block.indices[i]!), block.values[i]!); stats.writes++; changed = true; }
    stats.dabs++; return changed;
  }
  const end = () => { if (!active) return; active = false; activeTerrains.delete(terrain); history?.commit(); };
  history?.begin(); activeTerrains.add(terrain);
  let initialPending = !!preparation.deferInitial;
  function* initialSteps(): Generator<boolean,void> { if (!active || !initialPending) return; try { yield* stamp(initial); initialPending = false; } catch(cause) { end(); throw cause; } }
  const initialWork = initialSteps();
  if (!initialPending) { try { const steps = stamp(initial); let result = steps.next(); while (!result.done) result = steps.next(); } catch (cause) { end(); throw cause; } }
  function* steps(target: SphericalBrushPoint, visibility?: SphericalBrushVisibility): Generator<boolean> {
      if (!active) return;
      if (initialPending) throw new Error('Finish initial spherical preparation before accepting a segment.');
      if (advancing) throw new Error('Finish the pending spherical segment before supplying another.');
      const visible = visibility ? unitDirection(visibility.hemisphere) : hemisphere;
      const visibilityArc = visibility?.endHemisphere ? greatCircleArc(visible!, unitDirection(visibility.endHemisphere)) : undefined;
      const next = directionOf(terrain, target), arc = metric?metric.path(previous,next):greatCircleArc(previous, next), length = 'lengthMeters' in arc?arc.lengthMeters:arc.angle * radius;
      if (length === 0) return;
      const tolerance = Number.EPSILON * 64 * Math.max(length, spacing);
      const count = Math.max(0, Math.floor((length - untilNext + tolerance) / spacing) + 1);
      if (count > MAX_SEGMENT_DABS) throw new RangeError('Stroke segment exceeds the dab-work limit; use a larger physical radius or shorter segments.');
      advancing = true;
      try {
        for (let i = 0; i < count; i++) {
          if (!active) return;
          const fraction = Math.min(1, (untilNext + i * spacing) / length);
          const changed = yield* stamp(arc.at(fraction), visibilityArc ? visibilityArc.at(fraction) : visible, fraction);
          yield changed;
        }
        untilNext = untilNext + count * spacing - length; previous = next;
      } catch (cause) { end(); throw cause; }
      finally { advancing = false; }
  }
  return {
    settings: snapshot,
    get statistics() { return { ...stats }; },
    moveTo(target: SphericalBrushPoint, visibility?: SphericalBrushVisibility): boolean {
      let changed = false;
      for (const value of steps(target, visibility)) changed ||= value;
      return changed;
    },
    moveToSteps: steps,
    initialSteps: () => initialWork,
    end,
  };
}
