/** Cube-B exact arithmetic. No terrain, display, platform service or approximate predicates. */
export const CUBE_ROUTE_MAX_WORK = 200_000;
export const CUBE_ROUTE_MAX_INTEGER_BITS = 16_384;
export type CubeRouteFailure = 'work' | 'precision' | 'range' | 'certificate';
export class CubeRouteCertificationError extends Error {
  readonly code: CubeRouteFailure;
  constructor(code: CubeRouteFailure, message: string) { super(message); this.name = 'CubeRouteCertificationError'; this.code = code; }
}
export interface CubeFraction { readonly n: bigint; readonly d: bigint }
export interface CubeBinaryRational extends CubeFraction { readonly exponent: number }
export interface CubeLengthInterval { readonly lower: number; readonly upper: number; readonly units: 'meters' }
export function createCubeExactBudget(limit = CUBE_ROUTE_MAX_WORK) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > CUBE_ROUTE_MAX_WORK) throw new RangeError(`Cube routing work must be 1-${CUBE_ROUTE_MAX_WORK}.`);
  let workUnits = 0, peakIntegerBits = 0, rootComparisons = 0;
  const step = (cost = 1) => { workUnits += cost; if (workUnits > limit) throw new CubeRouteCertificationError('work', 'Cube exact-work limit reached; no partial distance is returned.'); };
  const check = (...values: bigint[]) => {
    step();
    for (const value of values) {
      const bits = (value < 0n ? -value : value).toString(2).length;
      peakIntegerBits = Math.max(peakIntegerBits, bits);
      if (bits > CUBE_ROUTE_MAX_INTEGER_BITS) throw new CubeRouteCertificationError('work', 'Cube exact integer range exceeded.');
    }
  };
  return { step, check, rootComparison: () => { step(); rootComparisons++; },
    snapshot: () => Object.freeze({ workUnits, peakIntegerBits, rootComparisons, workLimit: limit, integerBitLimit: CUBE_ROUTE_MAX_INTEGER_BITS }) };
}
export type CubeExactBudget = ReturnType<typeof createCubeExactBudget>;
export function cubeGcd(ctx: CubeExactBudget, a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b; ctx.check(a, b);
  while (b) { ctx.step(); const r = a % b; a = b; b = r; }
  return a;
}
export function cubeFraction(ctx: CubeExactBudget, n: bigint, d = 1n): CubeFraction {
  ctx.check(n, d);
  if (d === 0n) throw new CubeRouteCertificationError('certificate', 'Zero exact denominator.');
  if (d < 0n) { n = -n; d = -d; }
  const gcd = cubeGcd(ctx, n, d); return Object.freeze({ n: n / gcd, d: d / gcd });
}
export const CUBE_ZERO_FRACTION: CubeFraction = Object.freeze({ n: 0n, d: 1n });
export const CUBE_ONE_FRACTION: CubeFraction = Object.freeze({ n: 1n, d: 1n });
export function cubeFractionCompare(ctx: CubeExactBudget, a: CubeFraction, b: CubeFraction): number {
  const x = a.n * b.d, y = b.n * a.d; ctx.check(x, y); return x < y ? -1 : x > y ? 1 : 0;
}
export function cubeFractionSubtract(ctx: CubeExactBudget, a: CubeFraction, b: CubeFraction): CubeFraction {
  return cubeFraction(ctx, a.n * b.d - b.n * a.d, a.d * b.d);
}
const bitsView = new DataView(new ArrayBuffer(8));
/** Exact IEEE value = n*2^exponent, including subnormals. Coordinate signed zero is immaterial. */
export function cubeFloatDyadic(value: number): { readonly n: bigint; readonly exponent: number } {
  if (!Number.isFinite(value)) throw new RangeError('Finite exact cube input required.');
  bitsView.setFloat64(0, value, false); const bits = bitsView.getBigUint64(0, false), e = Number((bits >> 52n) & 0x7ffn);
  let n = (bits & ((1n << 52n) - 1n)) + (e ? 1n << 52n : 0n), exponent = e ? e - 1023 - 52 : -1074;
  if (!n) return { n: 0n, exponent: 0 };
  while ((n & 1n) === 0n) { n >>= 1n; exponent++; }
  return { n: bits >> 63n ? -n : n, exponent };
}
export function cubeDyadicGrid(ctx: CubeExactBudget, values: readonly number[]) {
  const dyadics = values.map(cubeFloatDyadic), exponent = Math.min(...dyadics.filter((d) => d.n !== 0n).map((d) => d.exponent));
  if (!Number.isFinite(exponent)) throw new CubeRouteCertificationError('certificate', 'Empty cube dyadic scale.');
  const integers = dyadics.map((d) => d.n ? d.n << BigInt(d.exponent - exponent) : 0n); ctx.check(...integers);
  return { integers, exponent };
}
const floatFromBits = (bits: bigint) => { bitsView.setBigUint64(0, bits, false); return bitsView.getFloat64(0, false); };
const MAX_FINITE_BITS = 0x7fefffffffffffffn;
/** Compare double^2 to exact n/d * 2^exponent, without floating-point products. */
function compareRoot(ctx: CubeExactBudget, bits: bigint, n: bigint, d: bigint, exponent: number): number {
  ctx.rootComparison(); const x = cubeFloatDyadic(floatFromBits(bits));
  let left = x.n * x.n * d, right = n;
  const shift = 2 * x.exponent - exponent;
  if (shift >= 0) left <<= BigInt(shift); else right <<= BigInt(-shift);
  ctx.check(left, right); return left < right ? -1 : left > right ? 1 : 0;
}
/** Adjacent representable bounds, proven by exact squared comparisons. At most 64 comparisons. */
export function cubeRootInterval(ctx: CubeExactBudget, n: bigint, d: bigint, exponent: number, maxWidth?: number): CubeLengthInterval {
  ctx.check(n, d);
  if (n < 0n || d <= 0n || !Number.isSafeInteger(exponent) || Math.abs(exponent) > 4096) throw new CubeRouteCertificationError('certificate', 'Invalid cube squared length.');
  if (maxWidth !== undefined && (!Number.isFinite(maxWidth) || maxWidth <= 0)) throw new RangeError('Positive finite length interval width required.');
  if (n === 0n) return Object.freeze({ lower: 0, upper: 0, units: 'meters' });
  let low = 0n, high = MAX_FINITE_BITS;
  while (low < high) {
    const mid = (low + high + 1n) >> 1n;
    if (compareRoot(ctx, mid, n, d, exponent) <= 0) low = mid; else high = mid - 1n;
  }
  const exact = compareRoot(ctx, low, n, d, exponent) === 0;
  if (!exact && low === MAX_FINITE_BITS) throw new CubeRouteCertificationError('range', 'Cube length has no finite Float64 enclosure.');
  const lower = floatFromBits(low), upper = exact ? lower : floatFromBits(low + 1n);
  if (maxWidth !== undefined && upper - lower > maxWidth) throw new CubeRouteCertificationError('precision', 'Requested cube length interval is narrower than adjacent Float64 bounds.');
  return Object.freeze({ lower, upper, units: 'meters' });
}
