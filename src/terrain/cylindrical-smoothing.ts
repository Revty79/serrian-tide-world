import {connectedSmoothEstimate} from './connected-smoothing.ts';
import { paintingStage } from '../editor/painting-metrics.ts';
import type { CylinderSampleKey, CylindricalTerrain } from './cylindrical.ts';

/** Fold-aware polar/side finite-volume conductances; a local lazy graph filter, not exact heat flow. */
function cylindricalSmoothEstimateImpl(terrain: CylindricalTerrain, key: CylinderSampleKey, current: number) {
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
  return connectedSmoothEstimate(terrain, neighbors, conductances, current, areaOverRadiusSquared);
}

export function cylindricalSmoothEstimate(...args: Parameters<typeof cylindricalSmoothEstimateImpl>) { return paintingStage('smoothNeighborhood', () => cylindricalSmoothEstimateImpl(...args)); }
