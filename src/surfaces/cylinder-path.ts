import { paintingStage } from '../editor/painting-metrics.ts';
import type { SurfacePosition } from './contracts.ts';
import { cylinderAngle, createCylinderGeometry, type CylinderPosition, type CylinderRegion, type CylinderVector } from './cylinder.ts';
import { cylinderGlobalDistance, type CylinderDistanceOptions, type CylinderRouteClass } from './cylinder-distance.ts';
import { pathAngle, pathFailure, pathNorm, pathTrig } from './cylinder-path-math.ts';

type Geometry = ReturnType<typeof createCylinderGeometry>;
export interface CylinderPathOptions extends Omit<CylinderDistanceOptions, 'includeFeasibleRoutes'> {
  readonly version: 1;
  /** Incoming physical tangent, in the named one-sided sheet at the first endpoint. */
  readonly continuity?: { readonly patchId: CylinderRegion; readonly direction: CylinderVector };
}
interface PieceBase { readonly start: CylinderPosition; readonly end: CylinderPosition; readonly lengthMeters: number; readonly fromMeters: number; readonly toMeters: number }
export type CylinderPathPiece = PieceBase & (
  | { readonly kind: 'side-geodesic'; readonly startAngle: number; readonly angleDelta: number }
  | { readonly kind: 'disk-chord'; readonly patchId: 'cap-start' | 'cap-end'; readonly startXY: readonly [number, number]; readonly endXY: readonly [number, number] }
);
type Unplaced = Omit<PieceBase, 'fromMeters' | 'toMeters'> & (
  | { readonly kind: 'side-geodesic'; readonly startAngle: number; readonly angleDelta: number }
  | { readonly kind: 'disk-chord'; readonly patchId: 'cap-start' | 'cap-end'; readonly startXY: readonly [number, number]; readonly endXY: readonly [number, number] }
);
export interface CylinderPathLocation {
  readonly position: CylinderPosition;
  readonly referencePosition: CylinderVector;
  readonly tangent: CylinderVector | null;
  readonly pieceIndex: number;
  readonly distanceMeters: number;
  readonly atEnd: boolean;
  readonly oneSidedPatchId: CylinderRegion | null;
}
interface Physical { region: 'side' | 'start' | 'end'; theta: number; coordinate: number }
const EPS = Number.EPSILON, TAU = 2 * Math.PI;
const vector = (v: readonly number[]): CylinderVector => Object.freeze([v[0]!, v[1]!, v[2]!]);
const xy = (theta: number, radius: number): readonly [number, number] => { const [s, c] = pathTrig(theta); return Object.freeze([radius * c, radius * s]); };

/** Pure continuous reference geometry. No sample ownership, elevation, history, input or projection. */
function reconstructCylinderPathImpl(g: Geometry, first: SurfacePosition, second: SurfacePosition, options: CylinderPathOptions) {
  if (options.version !== 1) throw new RangeError('Only cylinder physical path version 1 is supported.');
  const start = Object.freeze(g.normalize(first)), end = Object.freeze(g.normalize(second)), { radiusMeters: R, lengthMeters: L } = g.metadata;
  const scale = Math.max(R, L), guard = Math.max(8192 * Number.MIN_VALUE, 8192 * EPS * scale);
  const tolerance = options.absoluteToleranceMeters ?? Math.max(1e-6 * R, 128 * guard);
  if (!Number.isFinite(tolerance) || tolerance <= 0) throw new RangeError('Finite positive cylinder path tolerance required.');
  const physical = (p: CylinderPosition): Physical => {
    const theta = cylinderAngle(p.patchId === 'cap-end' ? -p.u : p.u);
    if (p.patchId === 'side') return p.v === 0 ? { region: 'start', theta, coordinate: R } : p.v === L ? { region: 'end', theta, coordinate: R } : { region: 'side', theta, coordinate: p.v };
    return { region: p.patchId === 'cap-start' ? 'start' : 'end', theta: p.v === 0 ? 0 : theta, coordinate: p.v };
  };
  const originalP = physical(start), originalQ = physical(end);
  const samePoint = originalP.region === originalQ.region && originalP.coordinate === originalQ.coordinate && (originalP.theta === originalQ.theta || originalP.region !== 'side' && originalP.coordinate === 0);
  if (!samePoint && tolerance < 16 * guard) pathFailure('Cylinder path tolerance cannot cover reconstruction arithmetic.');
  const position = (region: Physical['region'], theta: number, coordinate: number): CylinderPosition => Object.freeze({ ...g.identity, patchId: region === 'side' ? 'side' : region === 'start' ? 'cap-start' : 'cap-end', u: coordinate === 0 && region !== 'side' ? 0 : cylinderAngle(region === 'end' ? -theta : theta), v: coordinate });
  const alias = (patchId: CylinderRegion): CylinderPosition => {
    if (patchId === start.patchId) return start;
    if (originalP.region === 'side' || originalP.coordinate !== R || patchId !== 'side' && patchId !== (originalP.region === 'start' ? 'cap-start' : 'cap-end')) throw new RangeError('Continuity sheet is not a physical alias of the initial endpoint.');
    return patchId === 'side' ? position('side', originalP.theta, originalP.region === 'start' ? 0 : L) : position(originalP.region, originalP.theta, R);
  };
  let preference: { patchId: CylinderRegion; direction: CylinderVector } | undefined;
  if (options.continuity) {
    const input = options.continuity, p = alias(input.patchId);
    if (!Array.isArray(input.direction) || input.direction.length !== 3 || !input.direction.every(Number.isFinite)) throw new RangeError('Finite three-component physical continuity direction required.');
    const length = pathNorm(...input.direction);
    if (length === 0) throw new RangeError('Nonzero physical continuity direction required.');
    const direction = vector(input.direction.map((v) => v / length)), normal = g.normal(p);
    if (Math.abs(direction.reduce((sum, value, i) => sum + value * normal[i]!, 0)) > 4096 * EPS) throw new RangeError('Continuity direction must be tangent to its one-sided sheet.');
    preference = { patchId: input.patchId, direction };
  }
  const distance = cylinderGlobalDistance(g, start, end, { absoluteToleranceMeters: Math.max(Number.MIN_VALUE, tolerance / 4), maxBoxes: options.maxBoxes, includeFeasibleRoutes: true });
  let p = originalP, q = originalQ, reversed = false;
  if (p.region !== 'side' && q.region === 'side' || p.region === 'end' && q.region === 'start') { [p, q] = [q, p]; reversed = true; }
  // Center angle is free, not the artificial u=0 returned by polar normalization.
  if (p.region !== 'side' && p.coordinate === 0 || q.region !== 'side' && q.coordinate === 0) {
    const both = p.region !== 'side' && p.coordinate === 0 && q.region !== 'side' && q.coordinate === 0;
    const theta = both ? preference ? pathAngle(preference.direction[0], preference.direction[1]) : 0 : p.region !== 'side' && p.coordinate === 0 ? q.theta : p.theta;
    p = { ...p, theta }; q = { ...q, theta };
  }
  let signed = cylinderAngle(q.theta - p.theta);
  if (Math.abs(signed) === Math.PI) signed = Math.PI; // deterministic positive angular lift at the exact cut
  const lifts = signed === 0 ? [0] : [signed, signed > 0 ? signed - TAU : signed + TAU];
  const side = (theta0: number, z0: number, theta1: number, z1: number): Unplaced => ({ kind: 'side-geodesic', start: position('side', theta0, z0), end: position('side', theta1, z1), startAngle: theta0, angleDelta: theta1 - theta0, lengthMeters: pathNorm(R * (theta1 - theta0), z1 - z0) });
  const cap = (region: 'start' | 'end', theta0: number, r0: number, theta1: number, r1: number): Unplaced => {
    const startXY = xy(theta0, r0), endXY = xy(theta1, r1);
    return { kind: 'disk-chord', patchId: region === 'start' ? 'cap-start' : 'cap-end', start: position(region, theta0, r0), end: position(region, theta1, r1), startXY, endXY, lengthMeters: pathNorm(endXY[0] - startXY[0], endXY[1] - startXY[1]) };
  };
  const reverse = (piece: Unplaced): Unplaced => piece.kind === 'side-geodesic' ? { ...piece, start: piece.end, end: piece.start, startAngle: piece.startAngle + piece.angleDelta, angleDelta: -piece.angleDelta } : { ...piece, start: piece.end, end: piece.start, startXY: piece.endXY, endXY: piece.startXY };
  const tangent = (piece: CylinderPathPiece | Unplaced, t: number): CylinderVector => {
    if (piece.kind === 'disk-chord') return vector([(piece.endXY[0] - piece.startXY[0]) / piece.lengthMeters, (piece.endXY[1] - piece.startXY[1]) / piece.lengthMeters, 0]);
    const [s, c] = pathTrig(piece.startAngle + t * piece.angleDelta);
    return vector([-s * (R * piece.angleDelta / piece.lengthMeters), c * (R * piece.angleDelta / piece.lengthMeters), (piece.end.v - piece.start.v) / piece.lengthMeters]);
  };
  const score = (piece: Unplaced | undefined): number => {
    if (!preference || !piece) return 0;
    let prior = preference.direction;
    if (preference.patchId !== piece.start.patchId) {
      const [s, c] = pathTrig(originalP.theta), angular = -s * prior[0] + c * prior[1], fold = originalP.region === 'start' ? 1 : -1;
      prior = preference.patchId === 'side' ? vector([angular * -s + fold * prior[2] * c, angular * c + fold * prior[2] * s, 0]) : vector([angular * -s, angular * c, fold * (prior[0] * c + prior[1] * s)]);
    }
    return tangent(piece, 0).reduce((sum, value, i) => sum + value * prior[i]!, 0);
  };
  const candidates: { routeClass: CylinderRouteClass; pieces: Unplaced[]; length: number; alignment: number; lift: number; error: number }[] = [];
  const feasibleCandidates = distance.feasibleRoutes!.flatMap((f) => f.routeClass === 'opposite-caps' && p.coordinate === q.coordinate && f.angles[0] !== f.angles[1]
    ? [f, { ...f, angles: [f.angles[1], f.angles[0]] as const }] : [f]);
  for (const feasible of feasibleCandidates) {
    if (feasible.upperBoundMeters > distance.lowerBoundMeters + tolerance / 2) continue;
    for (const lift of feasible.routeClass === 'same-cap' ? [signed] : lifts) {
      const sign = lift < 0 ? -1 : 1, terminal = p.theta + lift, [x, y] = feasible.angles;
      let pieces: Unplaced[];
      switch (feasible.routeClass) {
        case 'same-cap': pieces = [cap(p.region === 'end' ? 'end' : 'start', p.theta, p.coordinate, q.theta, q.coordinate)]; break;
        case 'side': pieces = [side(p.theta, p.coordinate, terminal, q.coordinate)]; break;
        case 'via-start-cap': case 'via-end-cap': {
          const region = feasible.routeClass === 'via-start-cap' ? 'start' : 'end', z = region === 'start' ? 0 : L;
          const h0 = Math.abs(p.coordinate - z), h1 = Math.abs(q.coordinate - z), h = h0 + h1;
          const entry = p.theta + (lift - sign * x) * (h0 / h), exit = entry + sign * x;
          pieces = [side(p.theta, p.coordinate, entry, z), cap(region, entry, R, exit, R), side(exit, z, terminal, q.coordinate)]; break;
        }
        case 'side-to-cap': {
          // At a zero-turn crease, use the actual terminal angle. Rebuilding
          // it as p.theta + lift can differ by an ULP and fabricate a tiny cap
          // chord after the long helix, below cumulative-distance resolution.
          const region = q.region === 'start' ? 'start' : 'end', entry = terminal - sign * x;
          pieces = [side(p.theta, p.coordinate, entry, region === 'start' ? 0 : L), cap(region, x === 0 ? q.theta : entry, R, q.theta, q.coordinate)]; break;
        }
        case 'opposite-caps': {
          const entry = p.theta + sign * x, exit = terminal - sign * y;
          pieces = [cap('start', p.theta, p.coordinate, entry, R), side(entry, 0, exit, L), cap('end', exit, R, q.theta, q.coordinate)]; break;
        }
      }
      if (samePoint) pieces = [];
      pieces = pieces.filter((piece) => piece.lengthMeters !== 0);
      if (!samePoint && pieces.length === 0) continue;
      if (reversed) pieces = pieces.reverse().map(reverse);
      const length = pieces.reduce((sum, piece) => sum + piece.lengthMeters, 0), error = samePoint ? 0 : guard;
      if (!Number.isFinite(length) || length + error - distance.lowerBoundMeters > tolerance || length + error < distance.lowerBoundMeters) continue;
      candidates.push({ routeClass: feasible.routeClass, pieces, length, alignment: score(pieces[0]), lift, error });
    }
  }
  if (candidates.length === 0) pathFailure('No reconstructed cylinder route satisfies its global length certificate.');
  candidates.sort((a, b) => preference ? b.alignment - a.alignment || a.length - b.length : a.length - b.length);
  const selected = candidates[0]!;
  let cumulative = 0;
  const pieces: readonly CylinderPathPiece[] = Object.freeze(selected.pieces.map((piece) => {
    const fromMeters = cumulative; cumulative += piece.lengthMeters;
    if (!(cumulative > fromMeters)) pathFailure('Cylinder path segment is below cumulative-distance resolution.');
    return Object.freeze({ ...piece, fromMeters, toMeters: cumulative });
  }));
  const reference = (p: CylinderPosition): CylinderVector => {
    const a = physical(p), [x, y] = xy(a.theta, a.region === 'side' ? R : a.coordinate);
    return vector([x, y, a.region === 'side' ? a.coordinate : a.region === 'start' ? 0 : L]);
  };
  return Object.freeze({
    provider: 'physical-cylinder-path' as const, version: 1 as const, geometry: g.metadata, start, end, routeClass: selected.routeClass, pieces,
    lengthMeters: selected.length, lengthErrorBoundMeters: selected.error, positionErrorBoundMeters: guard,
    lengthLowerBoundMeters: Math.max(0, selected.length - selected.error), lengthUpperBoundMeters: selected.length + selected.error,
    shortestExcessUpperBoundMeters: Math.max(0, selected.length + selected.error - distance.lowerBoundMeters), requestedToleranceMeters: tolerance,
    validity: 'certified-feasible-approximate-shortest' as const, uniqueness: 'not-certified' as const,
    selection: preference ? 'best-incoming-alignment-among-certified-candidates' as const : 'minimum-measured-length-stable-order' as const,
    candidateCount: candidates.length, continuityAlignment: preference ? selected.alignment : null, distance,
    atDistance(meters: number, boundary: 'incoming' | 'outgoing' = 'outgoing'): CylinderPathLocation {
      if (!Number.isFinite(meters) || meters < 0 || meters > selected.length || !['incoming', 'outgoing'].includes(boundary)) throw new RangeError('Cylinder path distance must lie in the closed path interval.');
      if (!pieces.length) return Object.freeze({ position: start, referencePosition: reference(start), tangent: null, pieceIndex: -1, distanceMeters: 0, atEnd: true, oneSidedPatchId: null });
      let index = pieces.findIndex((piece) => boundary === 'incoming' ? meters <= piece.toMeters : meters < piece.toMeters);
      if (index === -1) index = pieces.length - 1;
      const piece = pieces[index]!, t = Math.max(0, Math.min(1, (meters - piece.fromMeters) / piece.lengthMeters));
      let point: CylinderPosition;
      if (t === 0) point = piece.start; else if (t === 1) point = piece.end;
      else if (piece.kind === 'side-geodesic') point = position('side', piece.startAngle + t * piece.angleDelta, Math.max(0, Math.min(L, (1 - t) * piece.start.v + t * piece.end.v)));
      else {
        const x = (1 - t) * piece.startXY[0] + t * piece.endXY[0], y = (1 - t) * piece.startXY[1] + t * piece.endXY[1], radius = pathNorm(x, y);
        if (radius > R + guard) pathFailure('Cylinder disk interpolation left its physical disk.');
        point = position(piece.patchId === 'cap-start' ? 'start' : 'end', pathAngle(x, y), Math.min(R, radius));
      }
      if (meters === 0) point = start; if (meters === selected.length) point = end;
      return Object.freeze({ position: point, referencePosition: reference(point), tangent: tangent(piece, t), pieceIndex: index, distanceMeters: meters, atEnd: meters === selected.length, oneSidedPatchId: piece.start.patchId });
    },
  });
}
export type CylinderPhysicalPath = ReturnType<typeof reconstructCylinderPath>;

export function reconstructCylinderPath(...args: Parameters<typeof reconstructCylinderPathImpl>) { return paintingStage('path', () => reconstructCylinderPathImpl(...args)); }
