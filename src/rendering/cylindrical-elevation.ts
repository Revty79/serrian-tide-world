import type { CylindricalTerrain } from '../terrain/cylindrical.ts';
import type { CylinderRayHit } from './cylindrical-view.ts';
import { elevationToColor } from './elevation-colors.ts';

export type CylinderAppearance = 'elevation' | 'relief';
export const CYLINDER_RELIEF_EXAGGERATION = 5;

/** Canonical ownership, including reversed end-cap angles and shared rim words. */
export function cylinderDisplayIndex(terrain: CylindricalTerrain, region: CylinderRayHit['region'], row: number, column: number) {
  const { angularSamples: a, axialCells: z, radialCells: p } = terrain.metadata.representation.resolution;
  row = Math.max(0, row);
  const c = (column % a + a) % a, end = region === 'cap-end';
  if (region === 'side') return Math.min(z, row) * a + c;
  if (row >= p) return (end ? z * a : 0) + (end ? (a - c) % a : c);
  return a * (z + 1) + (end ? 1 + a * (p - 1) : 0) + (row === 0 ? 0 : 1 + (row - 1) * a + c);
}

function tangent(a: number, b: number, c: number) {
  const u = b - a, v = c - b;
  return u > 0 && v > 0 || u < 0 && v < 0 ? 2 * u * (v / (u + v)) : 0;
}
function cubic(a: number, b: number, c: number, d: number, t: number) {
  const m = tangent(a, b, c), n = tangent(b, c, d), q = 3 * (c - b) - 2 * m - n, r = 2 * (b - c) + m + n;
  return b + t * (m + t * (q + t * r));
}

/** Shape-preserving tensor Hermite reconstruction through actual samples.
 * Harmonic-mean tangents prevent new extrema between adjacent samples.
 * No palette mixing, resampling, authority change or numerical terrain writes.
 */
export function cylinderElevationSampler(values: Float32Array, terrain: CylindricalTerrain, light: 'all' | 'land' | 'none' = 'all') {
  const { angularSamples: a, axialCells: z, radialCells: p } = terrain.metadata.representation.resolution;
  const { radiusMeters: radius, lengthMeters: length } = terrain.metadata.geometry;
  const q = new Float64Array(16), columns = new Uint32Array(4), cosine = new Float64Array(a), sine = new Float64Array(a), capBase = a * (z + 1);
  for (let i = 0; i < a; i++) { cosine[i] = Math.cos(i / a * 2 * Math.PI); sine[i] = Math.sin(i / a * 2 * Math.PI); }
  return (hit: CylinderRayHit) => {
    const side = hit.region === 'side', end = hit.region === 'cap-end', last = side ? z : p;
    const column = ((end ? -hit.theta : hit.theta) / (2 * Math.PI) * a % a + a) % a;
    const row = Math.max(0, Math.min(last, side ? (hit.z + length / radius / 2) / (length / radius) * z : hit.radial * p));
    const left = Math.floor(column), top = Math.min(Math.floor(row), last - 1), x = column - left, y = row - top;
    for (let dc = 0; dc < 4; dc++) columns[dc] = (left + dc - 1 + a) % a;
    for (let dr = 0; dr < 4; dr++) {
      const r = Math.max(0, Math.min(last, top + dr - 1)), base = side ? r * a : r === p ? end ? z * a : 0 : capBase + (end ? 1 + a * (p - 1) : 0) + (r === 0 ? 0 : 1 + (r - 1) * a);
      for (let dc = 0; dc < 4; dc++) { const c = columns[dc]!; q[dr * 4 + dc] = values[base + (side ? c : r === 0 ? 0 : r === p && end ? (a - c) % a : c)]!; }
    }
    const height = cubic(cubic(q[0]!, q[1]!, q[2]!, q[3]!, x), cubic(q[4]!, q[5]!, q[6]!, q[7]!, x), cubic(q[8]!, q[9]!, q[10]!, q[11]!, x), cubic(q[12]!, q[13]!, q[14]!, q[15]!, x), y);
    const sea = terrain.metadata.seaLevel, crossesSea = Math.min(q[5]!, q[6]!, q[9]!, q[10]!) <= sea && Math.max(q[5]!, q[6]!, q[9]!, q[10]!) > sea;
    if (light === 'none' || light === 'land' && height <= sea) return { height, dx: 0, dy: 0, crossesSea };
    // Continuous interpolation of actual sample finite-difference normals avoids
    // the lighting creases caused by differentiating a nonlinear slope limiter.
    let dx = 0, dy = 0;
    for (let dr = 0; dr < 2; dr++) for (let dc = 0; dc < 2; dc++) {
      const r = top + dr, c = columns[dc + 1]!, at = (dr + 1) * 4 + dc + 1;
      const angular = (q[at + 1]! - q[at - 1]!) * a / (4 * Math.PI * radius), vertical = (q[at + 4]! - q[at - 4]!) / (r === 0 || r === last ? 1 : 2);
      let gx = angular, gy = vertical * z / length;
      if (!side) {
        if (r === 0) { gx = (values[cylinderDisplayIndex(terrain, hit.region, 1, 0)]! - values[cylinderDisplayIndex(terrain, hit.region, 1, a / 2)]!) * p / (2 * radius); gy = (values[cylinderDisplayIndex(terrain, hit.region, 1, a / 4)]! - values[cylinderDisplayIndex(terrain, hit.region, 1, a * 3 / 4)]!) * p / (2 * radius); }
        else { const radial = vertical * p / radius, tangential = angular * p / r; gx = cosine[c]! * radial - sine[c]! * tangential; gy = sine[c]! * radial + cosine[c]! * tangential; }
      }
      const weight = (dr ? y : 1 - y) * (dc ? x : 1 - x); dx += gx * weight; dy += gy * weight;
    }
    return { height, dx, dy, crossesSea };
  };
}

export function cylinderElevationField(values: Float32Array, terrain: CylindricalTerrain, hit: CylinderRayHit) { return cylinderElevationSampler(values, terrain)(hit); }

/** A fixed surface-local light, with explicitly display-only vertical exaggeration. */
export function cylinderRelief(dx: number, dy: number) {
  const x = Math.max(-1e6, Math.min(1e6, dx * CYLINDER_RELIEF_EXAGGERATION));
  const y = Math.max(-1e6, Math.min(1e6, dy * CYLINDER_RELIEF_EXAGGERATION));
  return Math.max(.55, Math.min(1.25, (1 + .6 * x - .6 * y) / Math.hypot(x, y, 1)));
}

export function cylinderElevationColor(height: number, seaLevel: number) { return elevationToColor(height, seaLevel); }

export function cylinderSamplingIntervals(radiusMeters: number, lengthMeters: number, n: number) {
  return { n, sideAngularMeters: 2 * Math.PI * radiusMeters / n, sideAxialMeters: lengthMeters / (n / 2), capRadialMeters: radiusMeters / (n / 4), capRimAngularMeters: 2 * Math.PI * radiusMeters / n, capFirstRingAngularMeters: 2 * Math.PI * radiusMeters / (n / 4) / n, samples: n * (n - 1) + 2 };
}
