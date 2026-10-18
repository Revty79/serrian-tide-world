import { assertIdentity, type SurfacePosition } from './contracts.ts';
import type { CylinderConfiguration, CylinderPosition } from './cylinder.ts';

export type CylinderRouteClass = 'same-cap' | 'side' | 'via-start-cap' | 'via-end-cap' | 'side-to-cap' | 'opposite-caps';
export interface CylinderDistanceOptions {
  /** Required enclosure width, not a screen/mesh tolerance. Defaults to max(1e-6 R, Float64 floor). */
  readonly absoluteToleranceMeters?: number;
  /** Hard total evaluated-box budget. Defaults to 32768; cannot exceed it. */
  readonly maxBoxes?: number;
  /** Opt-in feasible parameters for versioned physical path construction; no extra solver work. */
  readonly includeFeasibleRoutes?: boolean;
}
export interface CylinderFeasibleRoute {
  readonly version: 1;
  readonly routeClass: CylinderRouteClass;
  readonly angles: readonly [number, number];
  readonly upperBoundMeters: number;
}
export interface CylinderDistanceResult {
  /** Conservative upper endpoint. The real intrinsic distance lies in the returned interval. */
  readonly value: number;
  readonly units: 'meters';
  readonly scope: 'global-reference-surface';
  readonly method: 'continuous-route-affine-bounds-v1';
  readonly lowerBoundMeters: number;
  readonly upperBoundMeters: number;
  readonly absoluteErrorBoundMeters: number;
  readonly requestedToleranceMeters: number;
  readonly bestRoute: CylinderRouteClass;
  /** Competitive classes, not a claim of unique geodesic/path selection. */
  readonly possibleRouteClasses: readonly CylinderRouteClass[];
  readonly bestAngles: readonly [number, number];
  readonly evaluatedBoxes: number;
  readonly objectiveEvaluations: number;
  readonly peakQueuedBoxes: number;
  readonly feasibleRoutes?: readonly CylinderFeasibleRoute[];
}
export class CylinderDistanceUnsupportedError extends RangeError {
  readonly code: 'precision' | 'work-budget' | 'range';
  constructor(code: CylinderDistanceUnsupportedError['code'], message: string) { super(message); this.name = 'CylinderDistanceUnsupportedError'; this.code = code; }
}
interface GeometryInput { readonly metadata: CylinderConfiguration; normalize(p: SurfacePosition): CylinderPosition }
interface PhysicalPoint { region: 'side' | 'start' | 'end'; theta: number; coordinate: number }
interface Route { kind: CylinderRouteClass; scale: number; radius: number; height: number; q0: number; q1: number; delta: number; dimensions: 1 | 2; guard: number; lower: number; upper: number; angles: [number, number] }
interface Box { route: Route; l0: number; u0: number; l1: number; u1: number; lower: number }
const MAX_BOXES = 32768;
const MAX_QUEUE = 16384;
const FP_ALLOWANCE = 2048 * Number.EPSILON;
const TAU = 2 * Math.PI;
const wrap = (angle: number) => { const a = angle % TAU; return a >= Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a; };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
function checkedSqrt(value: number): number {
  const root = Math.sqrt(value);
  // Verify the primitive instead of assuming an undocumented libm ulp contract.
  // With Float64 product roundoff included, this residual limits its relative
  // error; absolute subnormal loss is covered by the query's precision floor.
  if (!Number.isFinite(root) || root < 0 || Math.abs(root * root - value) > 32 * Number.EPSILON * value + 8 * Number.MIN_VALUE) {
    throw new CylinderDistanceUnsupportedError('precision', 'Square-root residual exceeds the cylinder distance arithmetic contract.');
  }
  return root;
}
function norm(x: number, y: number): number {
  const scale = Math.max(Math.abs(x), Math.abs(y));
  if (scale === 0) return 0;
  const a = x / scale, b = y / scale;
  return scale * checkedSqrt(a * a + b * b);
}
// Fixed Taylor polynomials on [0, pi/2], through powers 29 / 28. Real truncation
// error < 3e-27; coefficient/Horner roundoff is covered by FP_ALLOWANCE. This keeps
// the bound independent of unspecified Math.sin/Math.cos implementation accuracy.
const coefficients = (cosine: boolean) => Object.freeze(Array.from({ length: 15 }, (_, n) => {
  let factorial = 1; for (let j = 2; j <= 2 * n + (cosine ? 0 : 1); j++) factorial *= j;
  return (n % 2 ? -1 : 1) / factorial;
}));
const SIN = coefficients(false), COS = coefficients(true);
function halfTrig(angle: number, cosine = false): number {
  const x = angle / 2, xx = x * x, table = cosine ? COS : SIN;
  let sum = table[14]!; for (let j = 13; j >= 0; j--) sum = sum * xx + table[j]!;
  return cosine ? sum : x * sum;
}

/** Min heap with bounded live boxes. No sample/terrain/view dependencies or retained cache. */
class Boxes {
  items: Box[] = [];
  push(box: Box) {
    if (this.items.length >= MAX_QUEUE) throw new CylinderDistanceUnsupportedError('work-budget', 'Cylinder distance queue budget exhausted.');
    let i = this.items.length; this.items.push(box);
    while (i > 0) { const parent = (i - 1) >> 1; if (this.items[parent]!.lower <= box.lower) break; this.items[i] = this.items[parent]!; i = parent; }
    this.items[i] = box;
  }
  pop(): Box | undefined {
    const first = this.items[0]!, last = this.items.pop()!;
    if (this.items.length) {
      let i = 0;
      while (2 * i + 1 < this.items.length) {
        let child = 2 * i + 1; if (child + 1 < this.items.length && this.items[child + 1]!.lower < this.items[child]!.lower) child++;
        if (last.lower <= this.items[child]!.lower) break;
        this.items[i] = this.items[child]!; i = child;
      }
      this.items[i] = last;
    }
    return first;
  }
}

/**
 * Continuous-surface branch-and-bound. Completeness and affine lower-envelope proof:
 * docs/CYLINDER-GLOBAL-DISTANCE.md. No adjacent-sample graph distance is used.
 * Float64 allowance is included at each bound; requests below its floor fail.
 */
export function cylinderGlobalDistance(g: GeometryInput, first: SurfacePosition, second: SurfacePosition, options: CylinderDistanceOptions = {}): CylinderDistanceResult {
  const metadata = g.metadata;
  if (options.includeFeasibleRoutes !== undefined && typeof options.includeFeasibleRoutes !== 'boolean') throw new RangeError('Invalid feasible-route reporting option.');
  assertIdentity(metadata.identity);
  if (metadata.provider !== 'physical-closed-cylinder' || metadata.version !== 1 || metadata.configuration !== 'solid-capped' || metadata.role !== 'exterior'
    || ![metadata.radiusMeters, metadata.lengthMeters].every((n) => Number.isFinite(n) && n > 0)
    || !Number.isFinite(2 * Math.PI * metadata.radiusMeters)
    || !Number.isFinite(Math.hypot(Math.PI * metadata.radiusMeters, metadata.lengthMeters))) throw new RangeError('Invalid or unsupported cylinder distance geometry.');
  for (const p of [first, second]) if (p.worldId !== metadata.identity.worldId || p.surfaceId !== metadata.identity.surfaceId) throw new RangeError('Foreign cylinder distance position.');
  const a = g.normalize(first), b = g.normalize(second), R = g.metadata.radiusMeters, L = g.metadata.lengthMeters;
  const physical = (p: CylinderPosition): PhysicalPoint => {
    const theta = wrap(p.patchId === 'cap-end' ? -p.u : p.u);
    if (p.patchId === 'side') return p.v === 0 ? { region: 'start', theta, coordinate: R } : p.v === L ? { region: 'end', theta, coordinate: R } : { region: 'side', theta, coordinate: p.v };
    return { region: p.patchId === 'cap-start' ? 'start' : 'end', theta: p.v === 0 ? 0 : theta, coordinate: p.v };
  };
  let p = physical(a), q = physical(b);
  if (p.region !== 'side' && q.region === 'side' || p.region === 'end' && q.region === 'start') [p, q] = [q, p];
  const identical = p.region === q.region && p.coordinate === q.coordinate && (p.theta === q.theta || p.region !== 'side' && p.coordinate === 0);
  const axial = p.region === 'side' && q.region === 'side' ? Math.abs(p.coordinate - q.coordinate)
    : p.region === 'side' ? Math.abs(p.coordinate - (q.region === 'start' ? 0 : L)) : p.region !== q.region ? L : 0;
  const queryScale = Math.max(R, axial), floor = Math.max(4096 * Number.MIN_VALUE, FP_ALLOWANCE * queryScale);
  const tolerance = options.absoluteToleranceMeters ?? Math.max(1e-6 * R, 8 * floor);
  const maxBoxes = options.maxBoxes ?? MAX_BOXES;
  if (!Number.isFinite(tolerance) || tolerance <= 0 || !Number.isInteger(maxBoxes) || maxBoxes < 1 || maxBoxes > MAX_BOXES) throw new RangeError('Invalid cylinder distance tolerance or box budget.');
  if (!identical && tolerance < 4 * floor) throw new CylinderDistanceUnsupportedError('precision', 'Requested cylinder distance tolerance is below its Float64 precision floor.');
  let delta = Math.abs(wrap(p.theta - q.theta));
  if (p.region !== 'side' && p.coordinate === 0 || q.region !== 'side' && q.coordinate === 0) delta = 0;
  let evaluatedBoxes = 0, objectiveEvaluations = 0, peakQueuedBoxes = 0;
  const routes: Route[] = [], queue = new Boxes();
  let upper = Infinity, best: Route | undefined;
  const disk = (radius: number, ratio: number, angle: number) => radius * norm(1 - ratio, 2 * checkedSqrt(ratio) * halfTrig(angle));
  const slope = (radius: number, ratio: number, angle: number) => {
    if (ratio === 0 || radius === 0) return 0;
    if (ratio === 1) return radius * halfTrig(angle, true);
    return radius * ratio * (2 * halfTrig(angle) * halfTrig(angle, true)) / norm(1 - ratio, 2 * checkedSqrt(ratio) * halfTrig(angle));
  };
  const objective = (r: Route, x: number, y: number) => {
    objectiveEvaluations++;
    return disk(r.radius, r.q0, x) + disk(r.radius, r.q1, y) + norm(r.height, r.radius * Math.max(0, r.delta - x - y));
  };
  const offer = (r: Route, x: number, y: number) => {
    const value = objective(r, x, y) * r.scale + r.guard;
    if (value < r.upper) { r.upper = value; r.angles = [x, y]; }
    if (value < upper) { upper = value; best = r; }
  };
  const analytic = (kind: CylinderRouteClass, value: number) => {
    const guard = Math.max(floor, Math.abs(value) * FP_ALLOWANCE);
    const r: Route = { kind, scale: queryScale, radius: 0, height: 0, q0: 1, q1: 1, delta: 0, dimensions: 1, guard, lower: Math.max(0, value - guard), upper: value + guard, angles: [0, 0] };
    routes.push(r); if (r.upper < upper) { upper = r.upper; best = r; }
  };
  // Lower bound is the minimum of an affine cap minorant plus the convex side term.
  const boundBox = (r: Route, l0: number, u0: number, l1: number, u1: number): Box | undefined => {
    if (l0 + l1 > r.delta) return;
    if (++evaluatedBoxes > maxBoxes) throw new CylinderDistanceUnsupportedError('work-budget', 'Cylinder distance evaluation budget exhausted; no successful distance returned.');
    u0 = Math.min(u0, r.delta - l1); u1 = Math.min(u1, r.delta - l0);
    const m0 = (l0 + u0) / 2, m1 = (l1 + u1) / 2;
    const s0 = slope(r.radius, r.q0, m0), s1 = slope(r.radius, r.q1, m1);
    const c0 = disk(r.radius, r.q0, m0) - s0 * m0 - r.radius * (u0 - l0) ** 2 / 8;
    const c1 = disk(r.radius, r.q1, m1) - s1 * m1 - r.radius * (u1 - l1) ** 2 / 8;
    let lower = Infinity;
    const check = (x: number, y: number) => {
      lower = Math.min(lower, c0 + s0 * x + c1 + s1 * y + norm(r.height, r.radius * Math.max(0, r.delta - x - y)));
      offer(r, x, y);
    };
    const edge = (fixed: number, lo: number, hi: number, varyingSlope: number, flip: boolean) => {
      hi = Math.min(hi, r.delta - fixed); if (lo > hi) return;
      const at = (value: number) => flip ? check(value, fixed) : check(fixed, value);
      at(lo); at(hi);
      if (r.height > 0 && r.radius > 0 && varyingSlope < r.radius) {
        const t = clamp(varyingSlope / r.radius, 0, 1);
        const sLo = Math.max(0, r.delta - fixed - lo), sHi = Math.max(0, r.delta - fixed - hi);
        const dLo = varyingSlope - r.radius * (r.radius * sLo / norm(r.height, r.radius * sLo));
        const dHi = varyingSlope - r.radius * (r.radius * sHi / norm(r.height, r.radius * sHi));
        // The conjugate minimum avoids an ill-conditioned critical argument near
        // slope=R. Near-zero endpoint derivatives conservatively include it too.
        const slack = 64 * Number.EPSILON * r.radius;
        if (varyingSlope >= 0 && dLo <= slack && dHi >= -slack) {
          const fixedSlope = flip ? s1 : s0;
          lower = Math.min(lower, c0 + c1 + fixedSlope * fixed + varyingSlope * (r.delta - fixed) + r.height * checkedSqrt((1 - t) * (1 + t)));
        }
        const remaining = (r.height / r.radius) * (t / checkedSqrt((1 - t) * (1 + t)));
        const value = r.delta - fixed - remaining;
        if (Number.isFinite(value) && value >= lo && value <= hi) at(value);
      }
    };
    edge(l0, l1, u1, s1, false); edge(u0, l1, u1, s1, false);
    edge(l1, l0, u0, s0, true); edge(u1, l0, u0, s0, true);
    offer(r, m0, Math.min(m1, r.delta - m0));
    // Also use monotonic cap/side minima; all operations are in scale-normalized units.
    const monotone = disk(r.radius, r.q0, l0) + disk(r.radius, r.q1, l1) + norm(r.height, r.radius * Math.max(0, r.delta - u0 - u1));
    lower = Math.max(lower, monotone, r.height) * r.scale - r.guard;
    return { route: r, l0, u0, l1, u1, lower: Math.max(0, lower) };
  };
  const search = (kind: CylinderRouteClass, height: number, q0: number, q1: number, dimensions: 1 | 2) => {
    // Infinite/backtracking candidates cannot beat an already finite side-only route.
    if (!Number.isFinite(height) || height - Math.max(floor, height * FP_ALLOWANCE) > upper) return;
    const scale = Math.max(R, height), guard = Math.max(4096 * Number.MIN_VALUE, scale * FP_ALLOWANCE);
    const r: Route = { kind, scale, radius: R / scale, height: height / scale, q0, q1, delta, dimensions, guard, lower: Math.max(0, height - guard), upper: Infinity, angles: [0, 0] };
    routes.push(r);
    if (delta === 0) { offer(r, 0, 0); r.lower = Math.max(0, r.upper - 2 * guard); return; }
    const box = boundBox(r, 0, delta, 0, dimensions === 2 ? delta : 0)!;
    r.lower = box.lower; queue.push(box); peakQueuedBoxes = Math.max(peakQueuedBoxes, queue.items.length);
  };
  if (identical) analytic(p.region === 'side' ? 'side' : 'same-cap', 0);
  else if (p.region === q.region && p.region !== 'side') {
    const x = p.coordinate / R, y = q.coordinate / R;
    analytic('same-cap', R * norm(x - y, 2 * checkedSqrt(x) * checkedSqrt(y) * halfTrig(delta)));
  } else if (p.region === 'side' && q.region === 'side') {
    analytic('side', norm(R * delta, axial));
    search('via-start-cap', p.coordinate + q.coordinate, 1, 1, 1);
    search('via-end-cap', (L - p.coordinate) + (L - q.coordinate), 1, 1, 1);
  } else if (p.region === 'side') search('side-to-cap', axial, q.coordinate / R, 1, 1);
  else search('opposite-caps', L, p.coordinate / R, q.coordinate / R, 2);
  if (!best || !Number.isFinite(upper)) throw new CylinderDistanceUnsupportedError('range', 'No finite representable cylinder distance enclosure.');
  // Analytic zero is exact for identical canonical physical points.
  if (identical) { upper = 0; best.upper = 0; best.lower = 0; }
  // Keep the original route lower bounds for route reporting; completed/pruned routes
  // have no unresolved boxes and can be bounded below by the incumbent upper endpoint.
  const analyticRoutes = routes.filter((r) => r.delta === 0 || r.kind === 'side' || r.kind === 'same-cap');
  let lower = Math.min(upper, ...analyticRoutes.map((r) => r.lower), queue.items[0]?.lower ?? Infinity);
  while (upper - lower > tolerance) {
    const box = queue.pop();
    if (!box) throw new CylinderDistanceUnsupportedError('precision', 'Requested enclosure is below floating-point bound uncertainty.');
    if (box.lower < upper) {
      const xWidth = box.u0 - box.l0, yWidth = box.u1 - box.l1;
      const splitX = xWidth >= yWidth, mid = splitX ? (box.l0 + box.u0) / 2 : (box.l1 + box.u1) / 2;
      if (splitX && (mid === box.l0 || mid === box.u0) || !splitX && (mid === box.l1 || mid === box.u1)) throw new CylinderDistanceUnsupportedError('precision', 'Cylinder distance subdivision reached Float64 resolution.');
      const children = splitX
        ? [boundBox(box.route, box.l0, mid, box.l1, box.u1), boundBox(box.route, mid, box.u0, box.l1, box.u1)]
        : [boundBox(box.route, box.l0, box.u0, box.l1, mid), boundBox(box.route, box.l0, box.u0, mid, box.u1)];
      for (const child of children) if (child && child.lower < upper) queue.push(child);
      peakQueuedBoxes = Math.max(peakQueuedBoxes, queue.items.length);
    }
    lower = Math.min(upper, ...analyticRoutes.map((r) => r.lower), queue.items[0]?.lower ?? Infinity);
  }
  if (![lower, upper, upper - lower].every(Number.isFinite) || lower < 0 || upper < lower || upper - lower > tolerance) throw new CylinderDistanceUnsupportedError('range', 'No finite valid cylinder distance enclosure.');
  const possibleRouteClasses = routes.filter((r) => r.lower <= upper).map((r) => r.kind);
  const feasibleRoutes = options.includeFeasibleRoutes ? { feasibleRoutes: Object.freeze(routes.filter((r) => Number.isFinite(r.upper)).map((r) => Object.freeze({ version: 1 as const, routeClass: r.kind, angles: Object.freeze([...r.angles]) as readonly [number, number], upperBoundMeters: r.upper }))) } : {};
  return Object.freeze({ value: upper, units: 'meters', scope: 'global-reference-surface', method: 'continuous-route-affine-bounds-v1', lowerBoundMeters: lower, upperBoundMeters: upper, absoluteErrorBoundMeters: upper - lower, requestedToleranceMeters: tolerance, bestRoute: best.kind, possibleRouteClasses: Object.freeze(possibleRouteClasses), bestAngles: Object.freeze(best.angles), evaluatedBoxes, objectiveEvaluations, peakQueuedBoxes, ...feasibleRoutes });
}
