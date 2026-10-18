import { unitArcAngle } from '../surfaces/great-circle.ts';
import type { SphericalSampleKey, SphericalTerrain } from './spherical.ts';

const MAX_STENCILS = 8192;
interface Stencil { indices: Uint32Array; weights: Float64Array; total: number }
const stencils = new WeakMap<SphericalTerrain, Map<number, Stencil>>();
export function sphericalSmoothingCacheBytes(terrain: SphericalTerrain): number {
  return [...(stencils.get(terrain)?.values() ?? [])].reduce((sum, value) => sum + value.indices.byteLength + value.weights.byteLength, 0);
}

/** Lazy inverse-geodesic-square graph smoother. Reads only; caller prepares the entire dab before writing. */
export function sphericalSmoothDelta(terrain: SphericalTerrain, key: SphericalSampleKey, current: number): number {
  const { identity, representation, terrainId } = terrain.metadata;
  if (key.worldId !== identity.worldId || key.surfaceId !== identity.surfaceId || key.terrainId !== terrainId || key.representationVersion !== representation.version || key.cellsPerEdge !== representation.cellsPerEdge || !Number.isInteger(key.index) || key.index < 0 || key.index >= terrain.sampleCount) throw new RangeError('Sample belongs to another terrain, surface or representation.');
  let cache = stencils.get(terrain);
  if (!cache) { cache = new Map(); stencils.set(terrain, cache); }
  let stencil = cache.get(key.index);
  if (!stencil) {
  const center = terrain.directionAt(key);
  // Four edge-connected neighbors normally, three at a cube corner; never duplicate face aliases.
  const neighborhood = terrain.neighbors(key, 'edges').map((neighbor) => {
    return { index: neighbor.index, angle: unitArcAngle(center, terrain.directionAt(neighbor)) };
  });
  const minimum = Math.min(...neighborhood.map((neighbor) => neighbor.angle));
  if (!(minimum > 0) || !Number.isFinite(minimum)) throw new RangeError('Invalid spherical smooth neighborhood geometry.');
  let total = 0;
  const weights: number[] = [];
  for (const neighbor of neighborhood) {
    // Equivalent to 1/distance² after normalization. Ratios avoid overflow for extreme physical radii.
    const weight = (minimum / neighbor.angle) ** 2;
    total += weight; weights.push(weight);
  }
  stencil = { indices: Uint32Array.from(neighborhood, (neighbor) => neighbor.index), weights: Float64Array.from(weights), total };
  if (cache.size >= MAX_STENCILS) cache.delete(cache.keys().next().value!);
  cache.set(key.index, stencil);
  } else { cache.delete(key.index); cache.set(key.index, stencil); }
  let delta = 0;
  for (let i = 0; i < stencil.indices.length; i++) {
    const value = terrain.read(terrain.keyAt(stencil.indices[i]!));
    if (!Number.isFinite(value)) throw new RangeError('Spherical smooth neighborhood contains a nonfinite elevation.');
    delta += stencil.weights[i]! * (value - current);
  }
  // Half stays at the center: convex, no full-intensity checkerboard swap. Differences preserve constants exactly.
  return delta / (2 * stencil.total);
}
