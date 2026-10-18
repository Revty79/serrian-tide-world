import { unitArcAngle } from '../surfaces/great-circle.ts';
import type { SphericalSampleKey, SphericalTerrain } from './spherical.ts';

/** Lazy inverse-geodesic-square graph smoother. Reads only; caller prepares the entire dab before writing. */
export function sphericalSmoothDelta(terrain: SphericalTerrain, key: SphericalSampleKey, current: number): number {
  const center = terrain.directionAt(key);
  // Four edge-connected neighbors normally, three at a cube corner; never duplicate face aliases.
  const neighborhood = terrain.neighbors(key, 'edges').map((neighbor) => {
    const value = terrain.read(neighbor);
    if (!Number.isFinite(value)) throw new RangeError('Spherical smooth neighborhood contains a nonfinite elevation.');
    return { value, angle: unitArcAngle(center, terrain.directionAt(neighbor)) };
  });
  const minimum = Math.min(...neighborhood.map((neighbor) => neighbor.angle));
  if (!(minimum > 0) || !Number.isFinite(minimum)) throw new RangeError('Invalid spherical smooth neighborhood geometry.');
  let total = 0, delta = 0;
  for (const neighbor of neighborhood) {
    // Equivalent to 1/distance² after normalization. Ratios avoid overflow for extreme physical radii.
    const weight = (minimum / neighbor.angle) ** 2;
    total += weight; delta += weight * (neighbor.value - current);
  }
  // Half stays at the center: convex, no full-intensity checkerboard swap. Differences preserve constants exactly.
  return delta / (2 * total);
}
