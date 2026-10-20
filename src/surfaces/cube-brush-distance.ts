import type { SurfacePosition } from './contracts.ts';
import { cubeFloatDyadic } from './cube-route-exact.ts';
import { CUBE_ROUTE_ALGORITHM, CUBE_ROUTE_SEQUENCE_COUNTS, CUBE_ROUTE_VERSION } from './solid-cube-routing.ts';
import { SOLID_CUBE_CONNECTIONS, SOLID_CUBE_FACES, SOLID_CUBE_FRAMES, type SolidCubeFace } from './solid-cube.ts';
import type { SolidCubeTerrain } from '../terrain/solid-cube.ts';

export class CubeDabCertificationError extends Error {
  readonly code: 'work' | 'precision' | 'source' | 'certificate';
  constructor(code: CubeDabCertificationError['code'], message: string) { super(message); this.name = 'CubeDabCertificationError'; this.code = code; }
}
export interface CubeDabMeter {
  tick(): void;
  sequenceTests: number; portalTests: number; squaredRejected: number; chordRejected: number; commonFace: number;
  rootComparisons: number; rootFallbacks: number;
}
type Pair = readonly [bigint, bigint];
type Fraction = readonly [bigint, bigint];
interface Portal { readonly axis: number; readonly fixed: bigint; readonly low: bigint; readonly high: bigint }
interface Image { readonly p: Pair; readonly basis: readonly [number, number, number, number]; readonly center: Pair; readonly portals: readonly Portal[] }
const ZERO: Fraction = [0n, 1n], ONE: Fraction = [1n, 1n];
const compare = (a: Fraction, b: Fraction) => a[0] * b[1] - b[0] * a[1];
const fraction = (n: bigint, d: bigint): Fraction => d < 0n ? [-n, -d] : [n, d];
const bits = (n: bigint) => (n < 0n ? -n : n).toString(2).length;
const dot = (q: readonly bigint[], axis: readonly number[]) => q[0]! * BigInt(axis[0]!) + q[1]! * BigInt(axis[1]!) + q[2]! * BigInt(axis[2]!);

/** No gcd, root, path reconstruction or per-sample unfolding. Closed portal intersections are exact. */
function feasible(image: Image, delta: Pair, meter: CubeDabMeter): boolean {
  let previous = ZERO;
  for (const portal of image.portals) {
    meter.portalTests++;
    const axis = portal.axis, other = 1 - axis, p = image.p;
    let low: Fraction, high: Fraction;
    if (delta[axis] !== 0n) {
      low = high = fraction(portal.fixed - p[axis]!, delta[axis]!);
      if (compare(low, ZERO) < 0n || compare(low, ONE) > 0n) return false;
      const along = p[other]! * low[1] + delta[other]! * low[0];
      if (along < portal.low * low[1] || along > portal.high * low[1]) return false;
    } else {
      if (p[axis] !== portal.fixed) return false;
      if (delta[other] === 0n) {
        if (p[other]! < portal.low || p[other]! > portal.high) return false;
        low = ZERO; high = ONE;
      } else {
        low = fraction(portal.low - p[other]!, delta[other]!); high = fraction(portal.high - p[other]!, delta[other]!);
        if (compare(low, high) > 0n) [low, high] = [high, low];
        if (compare(low, ZERO) < 0n) low = ZERO;
        if (compare(high, ONE) > 0n) high = ONE;
        if (compare(low, high) > 0n) return false;
      }
    }
    if (compare(previous, low) < 0n) previous = low;
    if (compare(previous, high) > 0n) return false;
  }
  return true;
}
const allSequences = (start: SolidCubeFace, end: SolidCubeFace) => {
  const found: SolidCubeFace[][] = [];
  const visit = (path: SolidCubeFace[]) => {
    const face = path.at(-1)!;
    if (face === end) { found.push(path); return; }
    for (const c of SOLID_CUBE_CONNECTIONS) if (c.face === face && !path.includes(c.toFace)) visit([...path, c.toFace]);
  };
  visit([start]); return found.sort((a, b) => a.length - b.length || (a.join() < b.join() ? -1 : a.join() > b.join() ? 1 : 0));
};
const sequences = SOLID_CUBE_FACES.map((a, i) => SOLID_CUBE_FACES.map((b, j) => {
  const result = allSequences(a, b);
  if (result.length !== CUBE_ROUTE_SEQUENCE_COUNTS[i]![j]) throw new Error('Cube-B sequence coverage mismatch.');
  return result;
}));

/** One center/lattice compilation, at most 133 unfoldings and 257 coordinate values. No N-squared cache. */
export function createCubeBrushDistancePlan(terrain: SolidCubeTerrain, input: SurfacePosition, radiusMeters: number, meter: CubeDabMeter) {
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) throw new RangeError('Positive finite cube radius in meters required.');
  const geometry = terrain.geometry, center = Object.freeze(geometry.canonicalPosition(input)), xyz = geometry.referencePosition(center);
  const n = terrain.metadata.representation.cellsPerEdge, hNumber = geometry.metadata.sideLengthMeters / 2;
  const coordinateNumbers = Array.from({ length: n + 1 }, (_, column) => terrain.positionAt({ ...geometry.identity, patchId: 'px', column, row: 0 }).u);
  const values = [hNumber, radiusMeters, ...xyz, ...coordinateNumbers].map((value) => { meter.tick(); return cubeFloatDyadic(value); });
  const exponent = Math.min(...values.filter((v) => v.n !== 0n).map((v) => v.exponent));
  const integers = values.map((v) => v.n === 0n ? 0n : v.n << BigInt(v.exponent - exponent));
  const peakInputBits = Math.max(...integers.map(bits));
  // All finite admitted geometry/radius/lattice values need <= 2,200 grid bits.
  // Portal products, rational comparisons and root alignment then need < 16,384 bits.
  if (peakInputBits > 2200) throw new CubeDabCertificationError('work', 'Cube brush exact input-size limit exceeded.');
  const h = integers[0]!, radius = integers[1]!, source = integers.slice(2, 5), coordinates = integers.slice(5), radiusSquared = radius * radius;
  const sourceFaceIndex = SOLID_CUBE_FACES.indexOf(center.patchId), images = new Map<SolidCubeFace, readonly Image[]>();
  const retainedIntegers: bigint[] = [...integers, radiusSquared]; let portals = 0, imageCount = 0;
  const folds = new Map(SOLID_CUBE_CONNECTIONS.map((connection) => {
    meter.tick(); const fixed = connection.edge.endsWith('min') ? -hNumber : hNumber;
    const crossing = { ...geometry.identity, patchId: connection.face, u: connection.edge.startsWith('u') ? fixed : 0, v: connection.edge.startsWith('v') ? fixed : 0 };
    return [`${connection.face}:${connection.toFace}`, geometry.crossEdge(crossing,connection.edge).transport] as const;
  }));
  for (const [faceIndex, face] of SOLID_CUBE_FACES.entries()) {
    const list: Image[] = [];
    for (const path of sequences[sourceFaceIndex]![faceIndex]!) {
      meter.tick(); let basis: [number, number, number, number] = [1, 0, 0, 1], planeCenter: Pair = [0n, 0n];
      const p: Pair = [dot(source, SOLID_CUBE_FRAMES[center.patchId].u), dot(source, SOLID_CUBE_FRAMES[center.patchId].v)], gates: Portal[] = [];
      for (let i = 1; i < path.length; i++) {
        meter.tick(); const before = path[i - 1]!, after = path[i]!, c = SOLID_CUBE_CONNECTIONS.find((v) => v.face === before && v.toFace === after)!;
        const t = folds.get(`${before}:${after}`)!, [a, b, d, e] = basis;
        const next: [number, number, number, number] = [a * t.uu + b * t.uv, a * t.vu + b * t.vv, d * t.uu + e * t.uv, d * t.vu + e * t.vv];
        const column = c.edge.startsWith('u') ? 0 : 1, toColumn = c.toEdge.startsWith('u') ? 0 : 1, axis = basis[column] ? 0 : 1, other = 1 - axis;
        const sign = c.edge.endsWith('min') ? -1 : 1, toSign = c.toEdge.endsWith('min') ? -1 : 1;
        const portal = { axis, fixed: planeCenter[axis]! + h * BigInt(sign * basis[column + 2 * axis]!), low: planeCenter[other]! - h, high: planeCenter[other]! + h };
        gates.push(portal); retainedIntegers.push(portal.fixed, portal.low, portal.high); portals++;
        const nextCenter: Pair = [planeCenter[0] + h * BigInt(sign * basis[column]! - toSign * next[toColumn]!),
          planeCenter[1] + h * BigInt(sign * basis[column + 2]! - toSign * next[toColumn + 2]!)];
        if (nextCenter[0] - planeCenter[0] !== 2n * h * BigInt(sign * basis[column]!) || nextCenter[1] - planeCenter[1] !== 2n * h * BigInt(sign * basis[column + 2]!)) throw new CubeDabCertificationError('certificate', 'Cube unfolding orientation mismatch.');
        basis = next; planeCenter = nextCenter;
      }
      retainedIntegers.push(...p, ...planeCenter); imageCount++;
      list.push({ p, basis, center: planeCenter, portals: gates });
    }
    images.set(face, list);
  }
  const bound = (projection: bigint, freeSquared: bigint, right: boolean) => {
    let lo = 0, hi = coordinates.length;
    while (lo < hi) {
      meter.tick(); const mid = (lo + hi) >>> 1, delta = coordinates[mid]!-projection;
      // Monotone false/true boundary tests; no rounded sqrt or radius/index conversion.
      const advance = right ? delta <= 0n || delta*delta < freeSquared : delta < 0n && delta*delta >= freeSquared;
      if (advance) lo = mid + 1; else hi = mid;
    }
    return lo;
  };
  const rectangles = SOLID_CUBE_FACES.flatMap((face) => {
    const f = SOLID_CUBE_FRAMES[face], normal = dot(source, f.normal) - h;
    if (normal * normal >= radiusSquared) return [];
    const u = dot(source, f.u), v = dot(source, f.v), freeSquared = radiusSquared-normal*normal;
    return [{ face, minColumn: bound(u,freeSquared,false), endColumn: bound(u,freeSquared,true), minRow: bound(v,freeSquared,false), endRow: bound(v,freeSquared,true) }];
  });
  const incident = geometry.aliases(center).map((a) => SOLID_CUBE_FRAMES[a.patchId].normal);
  const summary = Object.freeze({ sourceAlgorithm: CUBE_ROUTE_ALGORITHM, sourceAlgorithmVersion: CUBE_ROUTE_VERSION, compiledSequences: imageCount,
    compiledPortals: portals, coordinateValues: coordinates.length, peakInputBits, gridExponent: exponent,
    retainedIntegerCount: retainedIntegers.length, retainedIntegerPayloadBytes: retainedIntegers.reduce((sum, v) => sum + Math.ceil(bits(v) / 8), 0),
    candidateSlotUpperBound: rectangles.reduce((sum, r) => sum + (r.endColumn-r.minColumn)*(r.endRow-r.minRow), 0) });
  return Object.freeze({ center, radiusMeters, radiusSquared, exponent, summary,
    *slots() { for (const r of rectangles) for (let row = r.minRow; row < r.endRow; row++) for (let column = r.minColumn; column < r.endColumn; column++) yield { ...geometry.identity, patchId: r.face, column, row }; },
    /** null means outside/on radius. Otherwise the exact GLOBAL squared distance on this dyadic grid. */
    *squared(face: SolidCubeFace, column: number, row: number): Generator<void, bigint | null> {
      if (!SOLID_CUBE_FACES.includes(face) || !Number.isSafeInteger(column) || !Number.isSafeInteger(row) || column < 0 || column > n || row < 0 || row > n) throw new RangeError('Invalid cube brush lattice position.');
      meter.tick(); const f = SOLID_CUBE_FRAMES[face], u = coordinates[column]!, v = coordinates[row]!;
      const q = [0, 1, 2].map((i) => h * BigInt(f.normal[i]!) + u * BigInt(f.u[i]!) + v * BigInt(f.v[i]!));
      const chord = q.reduce((sum, value, i) => sum + (value - source[i]!) * (value - source[i]!), 0n);
      const common = incident.some((normal) => dot(q, normal) === h); yield;
      if (chord >= radiusSquared) { meter.chordRejected++; return null; }
      if (common) { meter.commonFace++; return chord; }
      let best = radiusSquared;
      for (const image of images.get(face)!) {
        meter.tick(); meter.sequenceTests++;
        const [a, b, c, d] = image.basis, delta: Pair = [image.center[0] + BigInt(a)*u + BigInt(b)*v - image.p[0], image.center[1] + BigInt(c)*u + BigInt(d)*v - image.p[1]];
        const squared = delta[0]*delta[0] + delta[1]*delta[1];
        if (squared >= best) meter.squaredRejected++;
        else if (feasible(image, delta, meter)) best = squared;
        yield;
      }
      return best < radiusSquared ? best : null;
    },
  });
}

const view = new DataView(new ArrayBuffer(8));
const floatBits = (x: number) => { view.setFloat64(0, x, false); return view.getBigUint64(0, false); };
const fromBits = (x: bigint) => { view.setBigUint64(0, x, false); return view.getFloat64(0, false); };
export function cubeNextUp(x: number): number {
  if (x === Infinity) return x; if (x === 0) return Number.MIN_VALUE;
  return fromBits(floatBits(x) + (x > 0 ? 1n : -1n));
}
export const cubeNextDown = (x: number) => -cubeNextUp(-x);

/** Exact floor/adjacent root of n/d in [0,1]. Math.sqrt supplies ONLY an untrusted seed. */
export function* cubeBrushRatioRoot(n: bigint, d: bigint, meter: CubeDabMeter): Generator<void, { lower: number; upper: number }> {
  if (n < 0n || d <= 0n || n > d || bits(n) > 4400 || bits(d) > 4400) throw new CubeDabCertificationError('certificate', 'Invalid bounded cube distance ratio.');
  if (n === 0n) return { lower: 0, upper: 0 };
  if (n === d) return { lower: 1, upper: 1 };
  function* cmp(bit: bigint): Generator<void, number> {
    meter.tick(); meter.rootComparisons++;
    const x = cubeFloatDyadic(fromBits(bit)); let left = x.n*x.n*d, right = n;
    if (x.exponent >= 0) left <<= BigInt(2*x.exponent); else right <<= BigInt(-2*x.exponent);
    const result = left < right ? -1 : left > right ? 1 : 0; yield; return result;
  }
  const ns = Math.max(0, bits(n)-53), ds = Math.max(0, bits(d)-53), shift = ns-ds, half = Math.floor(shift/2);
  const seed = Math.sqrt(Number(n >> BigInt(ns)) / Number(d >> BigInt(ds)) * (shift-2*half ? 2 : 1)) * 2**half;
  let candidate = floatBits(Number.isFinite(seed) ? Math.max(0, Math.min(1, seed)) : 0);
  for (let i = 0; i < 8; i++) {
    const c = yield* cmp(candidate);
    if (c === 0) return { lower: fromBits(candidate), upper: fromBits(candidate) };
    if (c > 0) { if (candidate === 0n) break; candidate--; continue; }
    const next = yield* cmp(candidate+1n);
    if (next > 0) return { lower: fromBits(candidate), upper: fromBits(candidate+1n) };
    if (next === 0) return { lower: fromBits(candidate+1n), upper: fromBits(candidate+1n) };
    candidate++;
  }
  meter.rootFallbacks++; let low = 0n, high = floatBits(1);
  while (low < high) { const mid = (low+high+1n)>>1n; if ((yield* cmp(mid)) <= 0) low = mid; else high = mid-1n; }
  const exact = (yield* cmp(low)) === 0;
  return { lower: fromBits(low), upper: fromBits(exact ? low : low+1n) };
}

/** Monotone cubic influence, with outward-rounded bounds for the ideal real-valued kernel. */
export function cubeBrushFalloff(root: { lower: number; upper: number }) {
  const { lower, upper } = root;
  if (![lower, upper].every(Number.isFinite) || lower < 0 || upper > 1 || upper < lower) throw new RangeError('Invalid cube radius ratio enclosure.');
  if (upper === 0) return { value: 1, lower: 1, upper: 1, error: 0 };
  if (lower === 1) return { value: 0, lower: 0, upper: 0, error: 0 };
  const polynomial = (t: number) => { const tail = 1-t; return Math.max(0, Math.min(1, tail*tail*(1+2*t))); };
  const bound = (t: number, upward: boolean) => {
    const outward = upward ? cubeNextUp : cubeNextDown, tail = Math.max(0, outward(1-t));
    return Math.max(0, Math.min(1, outward(outward(tail*tail)*outward(1+outward(2*t)))));
  };
  const lo = bound(upper, false), hi = bound(lower, true), value = polynomial(lower);
  return { value, lower: lo, upper: hi, error: cubeNextUp(Math.max(Math.abs(value-lo), Math.abs(hi-value))) };
}
