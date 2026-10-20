import type { PatchEdge, SurfaceIdentity, SurfacePosition, TangentTransform } from './contracts.ts';
import { createSolidCubeGeometry, SOLID_CUBE_CONNECTIONS, SOLID_CUBE_FACES, SOLID_CUBE_FRAMES, type SolidCubeConfiguration, type SolidCubeFace } from './solid-cube.ts';
import { CUBE_ONE_FRACTION, CUBE_ZERO_FRACTION, CubeRouteCertificationError, createCubeExactBudget, cubeDyadicGrid, cubeFraction, cubeFractionCompare, cubeFractionSubtract, cubeGcd, cubeRootInterval, type CubeBinaryRational, type CubeExactBudget, type CubeFraction, type CubeLengthInterval } from './cube-route-exact.ts';

export const CUBE_ROUTE_ALGORITHM = 'cube-simple-face-unfoldings' as const;
export const CUBE_ROUTE_VERSION = 1 as const;
export const CUBE_ROUTE_MAX_CANDIDATES = 252;
export interface CubeRouteOptions {
  readonly maxCandidates?: number;
  readonly maxWorkUnits?: number;
  readonly maxReturnedRoutes?: number;
  /** Applies to total AND reported segment lengths; unattainable Float64 precision fails. */
  readonly maxIntervalWidthMeters?: number;
}
type I2 = readonly [bigint, bigint];
type I3 = readonly [bigint, bigint, bigint];
interface HomogeneousPoint { readonly q: I3; readonly d: bigint }
interface UnfoldedFace { readonly face: SolidCubeFace; readonly basis: readonly [number, number, number, number]; readonly center: readonly [number, number] }
interface Candidate { readonly frames: readonly UnfoldedFace[]; readonly p: I2; readonly delta: I2; readonly squared: bigint; readonly parameters: readonly CubeFraction[] }
interface RawSegment { readonly face: SolidCubeFace; readonly from: HomogeneousPoint; readonly to: HomogeneousPoint; readonly start: CubeFraction; readonly end: CubeFraction; readonly direction: I2 }
interface RawRoute { readonly segments: readonly RawSegment[]; readonly key: string }
export interface CubeExactWorldPoint extends SurfaceIdentity { readonly numerator: I3; readonly denominator: bigint; readonly exponent: number }
export interface CubeExactChartPoint extends SurfaceIdentity { readonly patchId: SolidCubeFace; readonly u: CubeBinaryRational; readonly v: CubeBinaryRational }
export interface CubeRouteSegment {
  readonly face: SolidCubeFace;
  readonly from: CubeExactChartPoint; readonly to: CubeExactChartPoint;
  readonly fromWorld: CubeExactWorldPoint; readonly toWorld: CubeExactWorldPoint;
  readonly startParameter: CubeFraction; readonly endParameter: CubeFraction;
  /** Exact one-sided chart displacement per unit of total-route parameter, NOT a unit tangent. */
  readonly direction: { readonly du: CubeBinaryRational; readonly dv: CubeBinaryRational };
  readonly lengthMeters: CubeLengthInterval;
}
export interface CubeRouteCrossing {
  readonly parameter: CubeFraction; readonly point: CubeExactWorldPoint;
  readonly from: CubeExactChartPoint; readonly to: CubeExactChartPoint;
  readonly fromEdge: PatchEdge; readonly toEdge: PatchEdge; readonly edgeId: string;
  readonly transport: TangentTransform;
}
export interface CertifiedCubeRoute {
  /** Query-local deterministic order, identical under endpoint aliases and reversal; not a persisted ID. */
  readonly index: number;
  readonly faces: readonly SolidCubeFace[];
  readonly segments: readonly CubeRouteSegment[];
  readonly crossings: readonly CubeRouteCrossing[];
  readonly vertices: readonly CubeExactWorldPoint[];
  readonly lengthMeters: CubeLengthInterval;
}
const faceIndex = (face: SolidCubeFace) => SOLID_CUBE_FACES.indexOf(face);
function enumerateFaceSequences(start: SolidCubeFace, end: SolidCubeFace): readonly (readonly SolidCubeFace[])[] {
  const found: (readonly SolidCubeFace[])[] = [];
  const visit = (path: readonly SolidCubeFace[]) => {
    const face = path[path.length - 1]!;
    if (face === end) { found.push(Object.freeze([...path])); return; }
    for (const next of SOLID_CUBE_FACES) if (!path.includes(next) && SOLID_CUBE_CONNECTIONS.some((c) => c.face === face && c.toFace === next)) visit([...path, next]);
  };
  visit([start]); return Object.freeze(found);
}
/** Fixed cube-only table: 798 sequences overall, at most 28 for one ordered face pair. */
const SEQUENCES = new Map(SOLID_CUBE_FACES.flatMap((a) => SOLID_CUBE_FACES.map((b) => [`${a}:${b}`, enumerateFaceSequences(a, b)] as const)));
export const CUBE_ROUTE_SEQUENCE_COUNTS = Object.freeze(SOLID_CUBE_FACES.map((a) => Object.freeze(SOLID_CUBE_FACES.map((b) => SEQUENCES.get(`${a}:${b}`)!.length))));
const i3 = (fn: (axis: number) => bigint): I3 => Object.freeze([fn(0), fn(1), fn(2)] as const);
const localDot = (q: I3, axis: readonly number[]) => q[0] * BigInt(axis[0]!) + q[1] * BigInt(axis[1]!) + q[2] * BigInt(axis[2]!);
function samePoint(ctx: CubeExactBudget, a: HomogeneousPoint, b: HomogeneousPoint): boolean {
  for (let i = 0; i < 3; i++) { const x = a.q[i]! * b.d, y = b.q[i]! * a.d; ctx.check(x, y); if (x !== y) return false; }
  return true;
}
function normalizePoint(ctx: CubeExactBudget, p: HomogeneousPoint): HomogeneousPoint {
  const divisor = p.q.reduce((gcd, v) => cubeGcd(ctx, gcd, v), p.d);
  return Object.freeze({ q: i3((i) => p.q[i]! / divisor), d: p.d / divisor });
}
function collinearForward(ctx: CubeExactBudget, a: HomogeneousPoint, b: HomogeneousPoint, c: HomogeneousPoint): boolean {
  const u = i3((i) => b.q[i]! * a.d - a.q[i]! * b.d), v = i3((i) => c.q[i]! * b.d - b.q[i]! * c.d); ctx.check(...u, ...v);
  for (const [i, j] of [[0, 1], [0, 2], [1, 2]] as const) { const x = u[i] * v[j], y = u[j] * v[i]; ctx.check(x, y); if (x !== y) return false; }
  const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2]; ctx.check(dot); return dot >= 0n;
}
const representationCompare = (a: RawRoute, b: RawRoute) => {
  if (a.segments.length !== b.segments.length) return a.segments.length - b.segments.length;
  for (let i = 0; i < a.segments.length; i++) { const delta = faceIndex(a.segments[i]!.face) - faceIndex(b.segments[i]!.face); if (delta) return delta; }
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
};

/** Exact continuous global routes on the reference boundary. Elevations are never accessed. */
export function createSolidCubeRouter(configuration: SolidCubeConfiguration) {
  const geometry = createSolidCubeGeometry(configuration), identity = geometry.identity, halfNumber = geometry.metadata.sideLengthMeters / 2;
  const transforms = new Map(SOLID_CUBE_CONNECTIONS.map((c) => {
    const p = { ...identity, patchId: c.face, u: c.edge.startsWith('u') ? (c.edge.endsWith('min') ? -halfNumber : halfNumber) : 0,
      v: c.edge.startsWith('v') ? (c.edge.endsWith('min') ? -halfNumber : halfNumber) : 0 };
    return [`${c.face}:${c.toFace}`, geometry.crossEdge(p, c.edge).transport] as const;
  }));
  const unfold = (faces: readonly SolidCubeFace[]): readonly UnfoldedFace[] => {
    const frames: UnfoldedFace[] = [{ face: faces[0]!, basis: [1, 0, 0, 1], center: [0, 0] }];
    for (let i = 1; i < faces.length; i++) {
      const source = frames[i - 1]!, target = faces[i]!, c = SOLID_CUBE_CONNECTIONS.find((c) => c.face === source.face && c.toFace === target)!;
      const t = transforms.get(`${source.face}:${target}`)!, [a, b, d, e] = source.basis;
      // Destination basis in the plane = source basis * inverse(Cube-A fold).
      const basis = [a * t.uu + b * t.uv, a * t.vu + b * t.vv, d * t.uu + e * t.uv, d * t.vu + e * t.vv] as const;
      const sourceColumn = c.edge.startsWith('u') ? 0 : 1, targetColumn = c.toEdge.startsWith('u') ? 0 : 1;
      const sign = c.edge.endsWith('min') ? -1 : 1, toSign = c.toEdge.endsWith('min') ? -1 : 1;
      const center = [source.center[0] + sign * source.basis[sourceColumn]! - toSign * basis[targetColumn]!,
        source.center[1] + sign * source.basis[sourceColumn + 2]! - toSign * basis[targetColumn + 2]!] as const;
      if (center[0] - source.center[0] !== 2 * sign * source.basis[sourceColumn]!
        || center[1] - source.center[1] !== 2 * sign * source.basis[sourceColumn + 2]!) throw new CubeRouteCertificationError('certificate', 'Invalid cube unfolding side/orientation.');
      frames.push({ face: target, basis, center });
    }
    return frames;
  };
  const route = (first: SurfacePosition, second: SurfacePosition, options: CubeRouteOptions = {}) => {
    if (!options || typeof options !== 'object' || Array.isArray(options)) throw new RangeError('Cube route options must be an object.');
    const maxCandidates = options.maxCandidates === undefined ? CUBE_ROUTE_MAX_CANDIDATES : options.maxCandidates;
    const maxRoutes = options.maxReturnedRoutes === undefined ? CUBE_ROUTE_MAX_CANDIDATES : options.maxReturnedRoutes;
    for (const limit of [maxCandidates, maxRoutes]) if (!Number.isSafeInteger(limit) || limit < 1 || limit > CUBE_ROUTE_MAX_CANDIDATES) throw new RangeError('Cube candidate/result limit must be 1-252.');
    if (options.maxIntervalWidthMeters !== undefined && (!Number.isFinite(options.maxIntervalWidthMeters) || options.maxIntervalWidthMeters <= 0)) throw new RangeError('Positive finite cube precision width required.');
    const ctx = createCubeExactBudget(options.maxWorkUnits), a = geometry.referencePosition(first), b = geometry.referencePosition(second);
    // Solve a canonical physical endpoint ordering, then reverse the SAME selected curves.
    let order = 0;
    for (let axis = 0; axis < 3; axis++) if (a[axis] !== b[axis]) { order = a[axis]! < b[axis]! ? -1 : 1; break; }
    const reverse = order > 0, from = reverse ? b : a, to = reverse ? a : b;
    const fromAliases = geometry.positionsForReference(from), toAliases = geometry.positionsForReference(to);
    const grid = cubeDyadicGrid(ctx, [halfNumber, ...from, ...to]), h = grid.integers[0]!, exponent = grid.exponent;
    const p3: I3 = i3((i) => grid.integers[i + 1]!), q3: I3 = i3((i) => grid.integers[i + 4]!);
    const exact = (n: bigint, d = 1n): CubeBinaryRational => Object.freeze({ ...cubeFraction(ctx, n, d), exponent });
    const world = (p: HomogeneousPoint): CubeExactWorldPoint => Object.freeze({ ...identity, numerator: p.q, denominator: p.d, exponent });
    const chart = (p: HomogeneousPoint, face: SolidCubeFace): CubeExactChartPoint => Object.freeze({ ...identity, patchId: face,
      u: exact(localDot(p.q, SOLID_CUBE_FRAMES[face].u), p.d), v: exact(localDot(p.q, SOLID_CUBE_FRAMES[face].v), p.d) });
    const root = (n: bigint, d = 1n) => cubeRootInterval(ctx, n, d, 2 * exponent, options.maxIntervalWidthMeters);
    const endpoint = (aliases: typeof fromAliases) => Object.freeze({ kind: aliases.length === 3 ? 'corner' as const : aliases.length === 2 ? 'edge' as const : 'face' as const,
      incidentFaces: Object.freeze(aliases.map((p) => p.patchId)) });
    let visited = 0, feasible = 0, cornerRejected = 0, peakMinimizers = 0;
    const project = (q: I3, f: UnfoldedFace): I2 => {
      const u = localDot(q, SOLID_CUBE_FRAMES[f.face].u), v = localDot(q, SOLID_CUBE_FRAMES[f.face].v), [aa, bb, cc, dd] = f.basis;
      const p: I2 = [h * BigInt(f.center[0]) + BigInt(aa) * u + BigInt(bb) * v, h * BigInt(f.center[1]) + BigInt(cc) * u + BigInt(dd) * v]; ctx.check(...p); return p;
    };
    const at = (candidate: Candidate, frame: UnfoldedFace, t: CubeFraction): HomogeneousPoint => {
      const x = candidate.p[0] * t.d + candidate.delta[0] * t.n - h * BigInt(frame.center[0]) * t.d;
      const y = candidate.p[1] * t.d + candidate.delta[1] * t.n - h * BigInt(frame.center[1]) * t.d;
      const [aa, bb, cc, dd] = frame.basis, u = BigInt(aa) * x + BigInt(cc) * y, v = BigInt(bb) * x + BigInt(dd) * y, f = SOLID_CUBE_FRAMES[frame.face];
      const bound = h * t.d; ctx.check(bound);
      if (u < -bound || u > bound || v < -bound || v > bound) throw new CubeRouteCertificationError('certificate', 'Reconstructed point lies outside its cube face.');
      const q = i3((i) => h * t.d * BigInt(f.normal[i]!) + u * BigInt(f.u[i]!) + v * BigInt(f.v[i]!)); ctx.check(x, y, u, v, ...q); return { q, d: t.d };
    };
    const hit = (p: I2, delta: I2, axis: number, fixed: bigint, low: bigint, high: bigint): readonly [CubeFraction, CubeFraction] | null => {
      const other = 1 - axis;
      if (delta[axis] !== 0n) {
        const t = cubeFraction(ctx, fixed - p[axis]!, delta[axis]!);
        if (cubeFractionCompare(ctx, t, CUBE_ZERO_FRACTION) < 0 || cubeFractionCompare(ctx, t, CUBE_ONE_FRACTION) > 0) return null;
        const y = p[other]! * t.d + delta[other]! * t.n, lo = low * t.d, hi = high * t.d; ctx.check(y, lo, hi);
        return y >= lo && y <= hi ? [t, t] : null;
      }
      if (p[axis] !== fixed) return null;
      if (delta[other] === 0n) return p[other]! >= low && p[other]! <= high ? [CUBE_ZERO_FRACTION, CUBE_ONE_FRACTION] : null;
      let lo = cubeFraction(ctx, low - p[other]!, delta[other]!), hi = cubeFraction(ctx, high - p[other]!, delta[other]!);
      if (cubeFractionCompare(ctx, lo, hi) > 0) [lo, hi] = [hi, lo];
      if (cubeFractionCompare(ctx, lo, CUBE_ZERO_FRACTION) < 0) lo = CUBE_ZERO_FRACTION;
      if (cubeFractionCompare(ctx, hi, CUBE_ONE_FRACTION) > 0) hi = CUBE_ONE_FRACTION;
      return cubeFractionCompare(ctx, lo, hi) <= 0 ? [lo, hi] : null;
    };
    let bestSquared: bigint | undefined, minimizers: Candidate[] = [];
    if (order !== 0) for (const start of fromAliases) for (const end of toAliases) for (const faces of SEQUENCES.get(`${start.patchId}:${end.patchId}`)!) {
      if (++visited > maxCandidates) throw new CubeRouteCertificationError('work', 'Cube candidate limit reached before exhaustive certification.');
      ctx.step(); const frames = unfold(faces), p = project(p3, frames[0]!), q = project(q3, frames[frames.length - 1]!), delta: I2 = [q[0] - p[0], q[1] - p[1]];
      const squared = delta[0] * delta[0] + delta[1] * delta[1]; ctx.check(...delta, squared);
      const parameters: CubeFraction[] = [CUBE_ZERO_FRACTION]; let valid = true;
      for (let i = 0; i < frames.length - 1; i++) {
        const frame = frames[i]!, c = SOLID_CUBE_CONNECTIONS.find((c) => c.face === frame.face && c.toFace === frames[i + 1]!.face)!;
        const column = c.edge.startsWith('u') ? 0 : 1, axis = frame.basis[column] ? 0 : 1, other = 1 - axis, sign = c.edge.endsWith('min') ? -1 : 1;
        const fixed = h * BigInt(frame.center[axis]! + sign * frame.basis[column + 2 * axis]!);
        const range = hit(p, delta, axis, fixed, h * BigInt(frame.center[other]! - 1), h * BigInt(frame.center[other]! + 1));
        if (!range) { valid = false; break; }
        const previous = parameters[parameters.length - 1]!, next = cubeFractionCompare(ctx, previous, range[0]) > 0 ? previous : range[0];
        if (cubeFractionCompare(ctx, next, range[1]) > 0) { valid = false; break; }
        parameters.push(next);
      }
      if (!valid) continue;
      parameters.push(CUBE_ONE_FRACTION);
      const candidate: Candidate = { frames, p, delta, squared, parameters };
      for (let i = 1; i < parameters.length - 1; i++) {
        const t = parameters[i]!;
        if (t.n === 0n || t.n === t.d) continue;
        const point = at(candidate, frames[i - 1]!, t), boundary = h * point.d; ctx.check(boundary);
        if (point.q.every((v) => v === boundary || v === -boundary)) { valid = false; cornerRejected++; break; }
      }
      if (!valid) continue;
      if (squared === 0n) throw new CubeRouteCertificationError('certificate', 'Distinct cube endpoints produced a zero continuous route.');
      feasible++;
      if (bestSquared === undefined || squared < bestSquared) { bestSquared = squared; minimizers = [candidate]; }
      else if (squared === bestSquared) minimizers.push(candidate);
      peakMinimizers = Math.max(peakMinimizers, minimizers.length);
    }
    if (order === 0) bestSquared = 0n;
    if (bestSquared === undefined) throw new CubeRouteCertificationError('certificate', 'No cube route could be certified.');
    const lengthMeters = root(bestSquared), unique = new Map<string, RawRoute>();
    for (const c of minimizers) {
      const segments: RawSegment[] = [];
      for (let i = 0; i < c.frames.length; i++) {
        const start = c.parameters[i]!, end = c.parameters[i + 1]!; if (cubeFractionCompare(ctx, start, end) === 0) continue;
        const f = c.frames[i]!, from = normalizePoint(ctx, at(c, f, start)), to = normalizePoint(ctx, at(c, f, end));
        const direction: I2 = [BigInt(f.basis[0]) * c.delta[0] + BigInt(f.basis[2]) * c.delta[1], BigInt(f.basis[1]) * c.delta[0] + BigInt(f.basis[3]) * c.delta[1]];
        ctx.check(...direction);
        if (segments.length && !samePoint(ctx, segments[segments.length - 1]!.to, from)) throw new CubeRouteCertificationError('certificate', 'Disconnected exact cube reconstruction.');
        segments.push({ face: f.face, from, to, start, end, direction });
      }
      if (!samePoint(ctx, segments[0]!.from, { q: p3, d: 1n }) || !samePoint(ctx, segments[segments.length - 1]!.to, { q: q3, d: 1n })) {
        throw new CubeRouteCertificationError('certificate', 'Cube path endpoints do not match the requested physical locations.');
      }
      const vertices: HomogeneousPoint[] = [];
      for (const p of [segments[0]!.from, ...segments.map((s) => s.to)]) {
        if (vertices.length && samePoint(ctx, vertices[vertices.length - 1]!, p)) continue;
        while (vertices.length >= 2 && collinearForward(ctx, vertices[vertices.length - 2]!, vertices[vertices.length - 1]!, p)) vertices.pop();
        vertices.push(p);
      }
      const key = vertices.map((v) => `${v.q.join(',')}/${v.d}`).join(';'), raw: RawRoute = { segments, key }, previous = unique.get(key);
      if (!previous || representationCompare(raw, previous) < 0) unique.set(key, raw);
    }
    if (unique.size > maxRoutes) throw new CubeRouteCertificationError('work', 'Complete cube shortest-path tie set exceeds the requested result limit.');
    const rawRoutes = [...unique.values()].sort(representationCompare);
    const routes: CertifiedCubeRoute[] = rawRoutes.map((raw, index) => {
      const list = reverse ? [...raw.segments].reverse().map((s): RawSegment => ({ ...s, from: s.to, to: s.from,
        start: cubeFractionSubtract(ctx, CUBE_ONE_FRACTION, s.end), end: cubeFractionSubtract(ctx, CUBE_ONE_FRACTION, s.start), direction: [-s.direction[0], -s.direction[1]] })) : raw.segments;
      const segments = list.map((s): CubeRouteSegment => {
        const fraction = cubeFractionSubtract(ctx, s.end, s.start), n = bestSquared! * fraction.n * fraction.n, d = fraction.d * fraction.d; ctx.check(n, d);
        return Object.freeze({ face: s.face, from: chart(s.from, s.face), to: chart(s.to, s.face), fromWorld: world(s.from), toWorld: world(s.to),
          startParameter: s.start, endParameter: s.end, direction: Object.freeze({ du: exact(s.direction[0]), dv: exact(s.direction[1]) }), lengthMeters: root(n, d) });
      });
      const crossings = segments.slice(1).map((segment, i): CubeRouteCrossing => {
        const previous = segments[i]!, c = SOLID_CUBE_CONNECTIONS.find((c) => c.face === previous.face && c.toFace === segment.face);
        if (!c) throw new CubeRouteCertificationError('certificate', 'Nonadjacent reconstructed cube faces.');
        const sourceFixed = c.edge.startsWith('u') ? previous.to.u : previous.to.v, targetFixed = c.toEdge.startsWith('u') ? segment.from.u : segment.from.v;
        const sourceAlong = c.edge.startsWith('u') ? previous.to.v : previous.to.u, targetAlong = c.toEdge.startsWith('u') ? segment.from.v : segment.from.u;
        const left = sourceAlong.n * targetAlong.d, right = targetAlong.n * sourceAlong.d * (c.reversed ? -1n : 1n); ctx.check(left, right);
        if (sourceFixed.n !== h * sourceFixed.d * (c.edge.endsWith('min') ? -1n : 1n)
          || targetFixed.n !== h * targetFixed.d * (c.toEdge.endsWith('min') ? -1n : 1n) || left !== right) {
          throw new CubeRouteCertificationError('certificate', 'Exact cube crossing violates Cube-A orientation/edge membership.');
        }
        return Object.freeze({ parameter: segment.startParameter, point: segment.fromWorld, from: previous.to, to: segment.from,
          fromEdge: c.edge, toEdge: c.toEdge, edgeId: c.edgeId, transport: transforms.get(`${c.face}:${c.toFace}`)! });
      });
      return Object.freeze({ index, faces: Object.freeze(segments.map((s) => s.face)), segments: Object.freeze(segments), crossings: Object.freeze(crossings),
        vertices: Object.freeze([segments[0]!.fromWorld, ...segments.map((s) => s.toWorld)]), lengthMeters });
    });
    if (order === 0) {
      const point = world(normalizePoint(ctx, { q: p3, d: 1n }));
      routes.push(Object.freeze({ index: 0, faces: Object.freeze([fromAliases[0]!.patchId]), segments: Object.freeze([]), crossings: Object.freeze([]), vertices: Object.freeze([point]), lengthMeters }));
    }
    return Object.freeze({ identity, geometry: geometry.metadata, algorithm: CUBE_ROUTE_ALGORITHM, algorithmVersion: CUBE_ROUTE_VERSION,
      boundary: 'reference-surface-only' as const, distanceMeters: lengthMeters,
      distanceSquared: Object.freeze({ n: bestSquared, d: 1n, exponent: 2 * exponent }),
      routes: Object.freeze(routes), selected: routes[0]!, unique: routes.length === 1,
      start: endpoint(reverse ? toAliases : fromAliases), end: endpoint(reverse ? fromAliases : toAliases),
      directionPolicy: order === 0 ? 'undefined-zero-length' as const : 'one-sided-face-tangents' as const,
      certificate: Object.freeze({ candidateSequences: visited, feasibleSequences: feasible, rejectedInteriorCornerSequences: cornerRejected,
        peakRetainedMinimizers: peakMinimizers, completePhysicalShortestRoutes: routes.length, maxFaces: 6, maxSequencesPerFacePair: 28, maxCandidates: CUBE_ROUTE_MAX_CANDIDATES, ...ctx.snapshot() }) });
  };
  return Object.freeze({ geometry, route, algorithm: CUBE_ROUTE_ALGORITHM, algorithmVersion: CUBE_ROUTE_VERSION });
}
export type SolidCubeRouter = ReturnType<typeof createSolidCubeRouter>;
export type SolidCubeRouteResult = ReturnType<SolidCubeRouter['route']>;
