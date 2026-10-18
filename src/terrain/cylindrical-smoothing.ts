import type { CylinderSampleKey, CylindricalTerrain } from './cylindrical.ts';

/** Fold-aware polar/side finite-volume conductances; a local lazy graph filter, not exact heat flow. */
export function cylindricalSmoothEstimate(terrain: CylindricalTerrain, key: CylinderSampleKey, current: number) {
  const owner = terrain.owner(key), { angularSamples: A, axialCells: Z, radialCells: P } = terrain.metadata.representation.resolution;
  const R = terrain.metadata.geometry.radiusMeters, q = terrain.metadata.geometry.lengthMeters / Z / R, dr = 1 / P, angle = 2 * Math.PI / A;
  if (!(q > 0) || !Number.isFinite(q)) throw new RangeError('Smooth aspect ratio is outside supported numerical range.');
  const center = owner.patchId !== 'side' && owner.row === 0, rim = owner.patchId === 'side' && (owner.row === 0 || owner.row === Z);
  const r = owner.row / P;
  const areaOverRadiusSquared = center ? Math.PI * dr * dr / 4 : rim ? angle * (q / 2 + dr / 2 - dr * dr / 8) : owner.patchId === 'side' ? angle * q : angle * r * dr;
  const neighbors = terrain.neighbors(key);
  const conductances = neighbors.map((neighbor) => {
    const other = terrain.owner(neighbor);
    if (center) return angle / 2;
    if (owner.patchId === 'side') {
      if (other.patchId !== 'side') return angle * (1 - dr / 2) / dr;
      if (owner.row !== other.row) return angle / q;
      return rim ? (q + dr) / (2 * angle) : q / angle;
    }
    if (other.patchId === 'side') return angle * (r + dr / 2) / dr;
    if (other.row === owner.row) return dr / (r * angle);
    return angle * (r + (other.row > owner.row ? dr / 2 : -dr / 2)) / dr;
  });
  if (!(areaOverRadiusSquared > 0) || !Number.isFinite(areaOverRadiusSquared) || !conductances.every((v) => Number.isFinite(v) && v > 0)) throw new RangeError('Invalid cylinder Smooth area/conductance.');
  const maximum = Math.max(...conductances);
  let sum = 0, delta = 0, maxDifference = 0;
  for (let i = 0; i < neighbors.length; i++) {
    const value = terrain.read(neighbors[i]!);
    if (!Number.isFinite(value)) throw new RangeError('Cylinder Smooth source contains nonfinite elevation.');
    const weight = conductances[i]! / maximum, difference = value - current;
    sum += weight; delta += weight * difference; maxDifference = Math.max(maxDifference, Math.abs(difference));
  }
  // Local half-CFL pseudo-time. Constants survive exactly; repeated full applications are lazy and convex.
  return { delta: delta / (2 * sum), neighbors: neighbors.length, areaOverRadiusSquared,
    roundoffErrorMeters: 128 * Number.EPSILON * neighbors.length * maxDifference,
    conductances, keys: neighbors };
}
