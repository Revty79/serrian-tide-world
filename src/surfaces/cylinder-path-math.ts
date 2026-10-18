import { CylinderDistanceUnsupportedError } from './cylinder-distance.ts';

const EPS = Number.EPSILON;
export const pathFailure = (message: string): never => { throw new CylinderDistanceUnsupportedError('precision', message); };
/** Checked scaled Euclidean norm, including very large/small reference dimensions. */
export function pathNorm(...components: readonly number[]): number {
  const scale = Math.max(...components.map(Math.abs));
  if (scale === 0) return 0;
  if (!Number.isFinite(scale)) return pathFailure('Nonfinite cylinder path component.');
  const squared = components.reduce((sum, value) => sum + (value / scale) ** 2, 0), root = Math.sqrt(squared);
  if (!Number.isFinite(root) || root < 0 || Math.abs(root * root - squared) > 32 * EPS * squared + 8 * Number.MIN_VALUE) return pathFailure('Cylinder path square-root residual exceeds its arithmetic contract.');
  const result = scale * root;
  if (!Number.isFinite(result)) throw new CylinderDistanceUnsupportedError('range', 'Unrepresentable cylinder path length.');
  return result;
}
const coefficients = (cosine: boolean) => Object.freeze(Array.from({ length: 15 }, (_, n) => {
  let factorial = 1; for (let j = 2; j <= 2 * n + (cosine ? 0 : 1); j++) factorial *= j;
  return (n % 2 ? -1 : 1) / factorial;
}));
const SIN = coefficients(false), COS = coefficients(true);
/** Fixed Taylor polynomials after range reduction to [-pi/2,pi/2], not native libm sin/cos. */
export function pathTrig(angle: number): readonly [number, number] {
  let x = angle % (2 * Math.PI);
  if (x >= Math.PI) x -= 2 * Math.PI;
  if (x < -Math.PI) x += 2 * Math.PI;
  let sign = 1;
  if (x > Math.PI / 2) { x = Math.PI - x; sign = -1; }
  if (x < -Math.PI / 2) { x = -Math.PI - x; sign = -1; }
  const xx = x * x;
  let sine = SIN[14]!, cosine = COS[14]!;
  for (let j = 13; j >= 0; j--) { sine = sine * xx + SIN[j]!; cosine = cosine * xx + COS[j]!; }
  return [x * sine, sign * cosine];
}
export function pathAngle(x: number, y: number): number {
  const radius = pathNorm(x, y);
  if (radius === 0) return 0;
  const angle = Math.atan2(y, x), [sine, cosine] = pathTrig(angle);
  if (!Number.isFinite(angle) || Math.max(Math.abs(sine - y / radius), Math.abs(cosine - x / radius)) > 512 * EPS) return pathFailure('Cylinder path polar inverse exceeds its checked residual contract.');
  return angle;
}
