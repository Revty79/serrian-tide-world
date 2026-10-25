import type { SurfacePosition } from '../surfaces/contracts.ts';
import type { CylinderRegion } from '../surfaces/cylinder.ts';
import type { CylindricalTerrain } from './cylindrical.ts';

const TAU = 2 * Math.PI;
const PAD = 1024 * Number.EPSILON;
/** Conservative chord-ball chart windows; ownership order, no global scan or dedup table. */
export function cylinderBrushCandidates(terrain: CylindricalTerrain, input: SurfacePosition, radiusMeters: number) {
  const center = terrain.geometry.normalize(input), { radiusMeters: R, lengthMeters: L } = terrain.metadata.geometry;
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) throw new RangeError('Finite positive physical brush radius required.');
  const { angularSamples: A, axialCells: Z, radialCells: P } = terrain.metadata.representation.resolution;
  const theta = center.patchId === 'cap-end' ? -center.u : center.u, rho = center.patchId === 'side' ? R : center.v;
  const z = center.patchId === 'side' ? center.v : center.patchId === 'cap-start' ? 0 : L;
  const centerXYZ = terrain.geometry.referencePosition(center), radialPad = PAD * Math.max(R, radiusMeters), axialPad = PAD * Math.max(L, radiusMeters);
  const rows = (c: number, extent: number, cells: number, padding: number) => [
    Math.max(0, Math.floor((c / extent - (radiusMeters + padding) / extent) * cells) - 1),
    Math.min(cells, Math.ceil((c / extent + (radiusMeters + padding) / extent) * cells) + 1),
  ] as const;
  const columns = (region: CylinderRegion, r: number): readonly (readonly [number, number])[] => {
    const denominator = 2 * Math.sqrt(r) * Math.sqrt(rho);
    if (denominator === 0 || radiusMeters + radialPad >= denominator) return [[0, A - 1]];
    const angle = 2 * Math.asin(Math.min(1, (radiusMeters + radialPad) / denominator));
    const chartAngle = region === 'cap-end' ? -theta : theta;
    const phase = ((chartAngle % TAU) + TAU) % TAU / TAU * A;
    const lo = Math.floor(phase - angle / TAU * A) - 1, hi = Math.ceil(phase + angle / TAU * A) + 1;
    if (hi - lo + 1 >= A) return [[0, A - 1]];
    const first = ((lo % A) + A) % A, last = ((hi % A) + A) % A;
    return Math.floor(lo / A) === Math.floor(hi / A) ? [[first, last]] : [[0, last], [first, A - 1]];
  };
  return Object.freeze({
    center, centerXYZ,
    /** Legacy API name: both the ambient chord and mandatory rim/axial
     * travel are exclusion lower bounds, never influential brush distances.
     * A path between opposite caps must traverse both radial clearances and
     * the wall's full axial span; cap/wall paths traverse one clearance. */
    chordLowerBound(position: SurfacePosition): number {
      const xyz = terrain.geometry.referencePosition(position);
      const chord = Math.hypot(xyz[0] - centerXYZ[0], xyz[1] - centerXYZ[1], xyz[2] - centerXYZ[2]);
      const error = PAD * Math.max(R, Math.abs(xyz[2]), Math.abs(centerXYZ[2]), radiusMeters);
      const target=terrain.geometry.normalize(position),targetRho=target.patchId==='side'?R:target.v;
      let route=0;
      if(center.patchId!=='side'&&target.patchId!=='side'&&center.patchId!==target.patchId)route=2*R-rho-targetRho+L;
      else if((center.patchId==='side')!==(target.patchId==='side'))route=R-(center.patchId==='side'?targetRho:rho)+Math.abs(xyz[2]-centerXYZ[2]);
      return Math.max(0,chord-error,route-error);
    },
    *samples() {
      const emit = function* (patchId: CylinderRegion, row: number, r: number) {
        for (const [first, last] of columns(patchId, r)) for (let column = first; column <= last; column++) {
          const address = { ...terrain.metadata.identity, patchId, row, column };
          yield { key: terrain.resolve(address), position: terrain.positionAt(address) };
        }
      };
      const [firstZ, lastZ] = rows(z, L, Z, axialPad);
      // Side owns both rims. All emitted canonical indices are strictly increasing.
      if (Math.abs(R - rho) <= radiusMeters + radialPad) for (let row = firstZ; row <= lastZ; row++) yield* emit('side', row, R);
      for (const patchId of ['cap-start', 'cap-end'] as const) {
        const capZ = patchId === 'cap-start' ? 0 : L;
        if (Math.abs(capZ - z) > radiusMeters + axialPad) continue;
        const [firstR, lastR] = rows(rho, R, P, radialPad);
        if (firstR === 0) {
          const address = { ...terrain.metadata.identity, patchId, row: 0, column: 0 };
          yield { key: terrain.resolve(address), position: terrain.positionAt(address) };
        }
        for (let row = Math.max(1, firstR); row <= Math.min(P - 1, lastR); row++) yield* emit(patchId, row, R * (row / P));
      }
    },
  });
}
