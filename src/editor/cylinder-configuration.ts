/** Initial interactive host envelope; the numerical cylinder engine has its own broader contract. */
export const CYLINDER_DETAILS = [64, 128, 256] as const;
export function cylinderResolution(detail: number) {
  if (!(CYLINDER_DETAILS as readonly number[]).includes(detail)) throw new RangeError('Select cylinder detail 64, 128 or 256.');
  return { angularSamples: detail, axialCells: detail / 2, radialCells: detail / 4 };
}
export function assertInteractiveCylinderDimensions(radius: number, length: number) {
  if (![radius, length].every(n => Number.isFinite(n) && n >= 1 && n <= 1e9) || length / radius < .1 || length / radius > 20) {
    throw new RangeError('Cylinder radius and axial length must be 1–1,000,000,000 m, with length between 0.1 and 20 times the radius.');
  }
}
