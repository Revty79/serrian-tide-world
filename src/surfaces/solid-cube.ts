import { assertIdentity, IDENTITY_TRANSPORT, type ChartSeam, type PatchEdge, type SurfaceIdentity, type SurfacePosition, type SurfaceTangent, type TangentTransform } from './contracts.ts';

/** Physical polyhedron, independent of the round cube-sphere and its angular charts. */
export const SOLID_CUBE_PROVIDER = 'physical-solid-cube' as const;
export const SOLID_CUBE_VERSION = 1 as const;
export const SOLID_CUBE_FACES = Object.freeze(['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const);
export type SolidCubeFace = typeof SOLID_CUBE_FACES[number];
export type CubeVector = readonly [number, number, number];
export interface SolidCubePosition extends SurfacePosition { readonly patchId: SolidCubeFace }
export interface SolidCubeConfiguration {
  readonly identity: SurfaceIdentity;
  readonly provider: typeof SOLID_CUBE_PROVIDER;
  readonly version: 1;
  readonly configuration: 'solid';
  readonly role: 'exterior';
  readonly sideLengthMeters: number;
}
interface CubeFrame { readonly normal: CubeVector; readonly u: CubeVector; readonly v: CubeVector }
const frame = (normal: CubeVector, u: CubeVector, v: CubeVector): CubeFrame => Object.freeze({ normal: Object.freeze(normal), u: Object.freeze(u), v: Object.freeze(v) });
/** Fixed representation axes, not gravity, north or camera orientation. U cross V = outward N. */
export const SOLID_CUBE_FRAMES: Readonly<Record<SolidCubeFace, CubeFrame>> = Object.freeze({
  px: frame([1, 0, 0], [0, 1, 0], [0, 0, 1]), nx: frame([-1, 0, 0], [0, -1, 0], [0, 0, 1]),
  py: frame([0, 1, 0], [-1, 0, 0], [0, 0, 1]), ny: frame([0, -1, 0], [1, 0, 0], [0, 0, 1]),
  pz: frame([0, 0, 1], [1, 0, 0], [0, 1, 0]), nz: frame([0, 0, -1], [1, 0, 0], [0, -1, 0]),
});
export const SOLID_CUBE_EDGES: readonly PatchEdge[] = Object.freeze(['u-min', 'u-max', 'v-min', 'v-max']);
export const cubeDot = (a: CubeVector, b: CubeVector): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: CubeVector, b: CubeVector): CubeVector => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const clean = (value: number) => value === 0 ? 0 : value;
export function assertSolidCubeFace(face: string): asserts face is SolidCubeFace {
  if (!(SOLID_CUBE_FACES as readonly string[]).includes(face)) throw new RangeError('Unknown physical cube face.');
}
export function assertCubeIdentity(identity: SurfaceIdentity): void {
  if (!identity) throw new RangeError('Cube surface identity is required.');
  assertIdentity(identity);
  if (identity.worldId.length > 128 || identity.surfaceId.length > 128) throw new RangeError('Cube identities must contain 1-128 characters.');
}
export interface SolidCubeConnection {
  /** Stable local edge ID; scope with World/surface identity when used outside this provider. */
  readonly edgeId: string;
  readonly face: SolidCubeFace; readonly edge: PatchEdge;
  readonly toFace: SolidCubeFace; readonly toEdge: PatchEdge; readonly reversed: boolean;
}
function connections(): readonly SolidCubeConnection[] {
  return Object.freeze(SOLID_CUBE_FACES.flatMap((face) => SOLID_CUBE_EDGES.map((edge): SolidCubeConnection => {
    const source = SOLID_CUBE_FRAMES[face], axis = edge.startsWith('u') ? source.u : source.v, sign = edge.endsWith('min') ? -1 : 1;
    const toFace = SOLID_CUBE_FACES.find((candidate) => cubeDot(SOLID_CUBE_FRAMES[candidate].normal, axis) === sign)!;
    const target = SOLID_CUBE_FRAMES[toFace], fixedU = cubeDot(source.normal, target.u), fixedV = cubeDot(source.normal, target.v);
    const toEdge: PatchEdge = fixedU ? (fixedU < 0 ? 'u-min' : 'u-max') : (fixedV < 0 ? 'v-min' : 'v-max');
    const alongSource = edge.startsWith('u') ? source.v : source.u, alongTarget = toEdge.startsWith('u') ? target.v : target.u;
    const pair = [face, toFace].sort((a, b) => SOLID_CUBE_FACES.indexOf(a) - SOLID_CUBE_FACES.indexOf(b));
    return Object.freeze({ edgeId: pair.join(':'), face, edge, toFace, toEdge, reversed: cubeDot(alongSource, alongTarget) < 0 });
  })));
}
/** 24 directed connections = twelve real edges, not projection cuts. */
export const SOLID_CUBE_CONNECTIONS = connections();
export const SOLID_CUBE_PHYSICAL_EDGES = Object.freeze(SOLID_CUBE_CONNECTIONS.filter((c) => SOLID_CUBE_FACES.indexOf(c.face) < SOLID_CUBE_FACES.indexOf(c.toFace)));
export const SOLID_CUBE_CORNERS = Object.freeze(Array.from({ length: 8 }, (_, bits) => {
  const signs = Object.freeze([bits & 4 ? 1 : -1, bits & 2 ? 1 : -1, bits & 1 ? 1 : -1] as const);
  return Object.freeze({ cornerId: signs.map((s) => s > 0 ? '+' : '-').join(''), signs,
    faces: Object.freeze(SOLID_CUBE_FACES.filter((face) => cubeDot(signs, SOLID_CUBE_FRAMES[face].normal) === 1)) });
}));
export function solidCubeConnection(face: SolidCubeFace, edge: PatchEdge): SolidCubeConnection {
  const result = SOLID_CUBE_CONNECTIONS.find((c) => c.face === face && c.edge === edge);
  if (!result) throw new RangeError('Unknown physical cube face or edge.');
  return result;
}

/** Closed reference boundary; local u,v are meters in [-L/2,L/2]. No global route solver. */
export function createSolidCubeGeometry(input: SolidCubeConfiguration) {
  if (!input) throw new RangeError('Cube configuration is required.');
  assertCubeIdentity(input.identity);
  if (input.provider !== SOLID_CUBE_PROVIDER || input.version !== 1 || input.configuration !== 'solid' || input.role !== 'exterior') {
    throw new RangeError('Only version 1 physical solid exterior cubes are implemented.');
  }
  const side = input.sideLengthMeters, half = side / 2, faceAreaMeters2 = side * side, surfaceAreaMeters2 = 6 * faceAreaMeters2;
  if (![side, half, faceAreaMeters2, surfaceAreaMeters2, Math.SQRT2 * side].every((value) => Number.isFinite(value) && value > 0)) {
    throw new RangeError('Cube dimensions and derived lengths/areas must be positive and finite.');
  }
  const identity = Object.freeze({ worldId: input.identity.worldId, surfaceId: input.identity.surfaceId });
  const metadata: SolidCubeConfiguration = Object.freeze({ identity, provider: SOLID_CUBE_PROVIDER, version: 1, configuration: 'solid', role: 'exterior', sideLengthMeters: side });
  const normalize = (p: SurfacePosition): SolidCubePosition => {
    if (!p || p.worldId !== identity.worldId || p.surfaceId !== identity.surfaceId) throw new RangeError('Position belongs to another cube surface.');
    assertSolidCubeFace(p.patchId);
    if (![p.u, p.v].every((value) => Number.isFinite(value) && value >= -half && value <= half)) throw new RangeError('Position outside physical cube face.');
    return { ...identity, patchId: p.patchId, u: clean(p.u), v: clean(p.v) };
  };
  const referencePosition = (input: SurfacePosition): CubeVector => {
    const p = normalize(input), f = SOLID_CUBE_FRAMES[p.patchId];
    return [0, 1, 2].map((axis) => clean(half * f.normal[axis]! + p.u * f.u[axis]! + p.v * f.v[axis]!)) as unknown as CubeVector;
  };
  /** Exact face membership: do not snap a near-edge interior point onto another face. */
  const positionsForReference = (q: CubeVector): readonly SolidCubePosition[] => {
    if (!Array.isArray(q) || q.length !== 3 || ![q[0], q[1], q[2]].every((value) => Number.isFinite(value) && Math.abs(value) <= half)
      || Math.max(Math.abs(q[0]), Math.abs(q[1]), Math.abs(q[2])) !== half) {
      throw new RangeError('Point must lie on the physical cube reference boundary.');
    }
    return SOLID_CUBE_FACES.filter((face) => cubeDot(q, SOLID_CUBE_FRAMES[face].normal) === half).map((face) => normalize({ ...identity, patchId: face, u: cubeDot(q, SOLID_CUBE_FRAMES[face].u), v: cubeDot(q, SOLID_CUBE_FRAMES[face].v) }));
  };
  const aliases = (p: SurfacePosition) => positionsForReference(referencePosition(p));
  /** Pairwise fold isometry. Ambient vectors differ; this is NOT a smooth chart Jacobian. */
  const tangentTransform = (from: SurfacePosition, to: SurfacePosition): TangentTransform => {
    const a = normalize(from), b = normalize(to), x = referencePosition(a), y = referencePosition(b);
    if (!x.every((value, axis) => value === y[axis])) throw new RangeError('Cube fold transport requires the same physical point.');
    if (a.patchId === b.patchId) return IDENTITY_TRANSPORT;
    const f = SOLID_CUBE_FRAMES[a.patchId], g = SOLID_CUBE_FRAMES[b.patchId];
    if (cubeDot(f.normal, g.normal) !== 0) throw new RangeError('Cube fold requires adjacent faces.');
    const axis = cross(f.normal, g.normal);
    // Rodrigues at +pi/2 around N_from cross N_to: R(N_from) = N_to.
    const fold = (v: CubeVector): CubeVector => {
      const w = cross(axis, v), along = cubeDot(axis, v);
      return [w[0] + along * axis[0], w[1] + along * axis[1], w[2] + along * axis[2]];
    };
    const u = fold(f.u), v = fold(f.v);
    return Object.freeze({ uu: clean(cubeDot(u, g.u)), uv: clean(cubeDot(v, g.u)), vu: clean(cubeDot(u, g.v)), vv: clean(cubeDot(v, g.v)) });
  };
  const crossEdge = (input: SurfacePosition, edge: PatchEdge) => {
    const from = normalize(input), c = solidCubeConnection(from.patchId, edge), uEdge = edge.startsWith('u');
    if ((uEdge ? from.u : from.v) !== (edge.endsWith('min') ? -half : half)) throw new RangeError('Position is not on the requested physical edge.');
    const along = (uEdge ? from.v : from.u) * (c.reversed ? -1 : 1), fixed = c.toEdge.endsWith('min') ? -half : half;
    const position = normalize({ ...identity, patchId: c.toFace, u: c.toEdge.startsWith('u') ? fixed : along, v: c.toEdge.startsWith('v') ? fixed : along });
    return { position, transport: tangentTransform(from, position) };
  };
  const seams: readonly ChartSeam[] = Object.freeze(SOLID_CUBE_CONNECTIONS.map((c) => Object.freeze({
    from: Object.freeze({ chart: Object.freeze({ ...identity, patchId: c.face }), edge: c.edge }),
    to: Object.freeze({ chart: Object.freeze({ ...identity, patchId: c.toFace }), edge: c.toEdge }), alongEdge: c.reversed ? 'reversed' as const : 'same' as const,
  })));
  return Object.freeze({
    metadata, identity, faceAreaMeters2, surfaceAreaMeters2, seams, normalize, referencePosition, positionsForReference, aliases, crossEdge, tangentTransform,
    canonicalPosition: (p: SurfacePosition): SolidCubePosition => aliases(p)[0]!,
    /** At edges/corners this is the selected face's one-sided normal, not an averaged normal. */
    normal: (p: SurfacePosition): CubeVector => SOLID_CUBE_FRAMES[normalize(p).patchId].normal,
    tangentVector: (p: SurfacePosition, tangent: SurfaceTangent): CubeVector => {
      const f = SOLID_CUBE_FRAMES[normalize(p).patchId];
      if (!tangent || ![tangent.du, tangent.dv].every(Number.isFinite)) throw new RangeError('Finite cube tangent required.');
      return [0, 1, 2].map((axis) => clean(tangent.du * f.u[axis]! + tangent.dv * f.v[axis]!)) as unknown as CubeVector;
    },
    faceMetric: (p: SurfacePosition) => { normalize(p); return { uu: 1, uv: 0, vv: 1, areaScale: 1, coordinateUnits: 'meters' as const }; },
    sameFaceDistance: (first: SurfacePosition, second: SurfacePosition) => {
      const a = normalize(first), b = normalize(second);
      if (a.patchId !== b.patchId) throw new RangeError('Face-restricted distance requires one face. Global cube routes are not implemented.');
      return { value: Math.hypot(a.u - b.u, a.v - b.v), units: 'meters' as const, scope: 'face-restricted' as const };
    },
    distanceToEdge: (input: SurfacePosition, edge: PatchEdge) => {
      const p = normalize(input); solidCubeConnection(p.patchId, edge);
      const value = edge.startsWith('u') ? p.u : p.v;
      return { value: clean(edge.endsWith('min') ? value + half : half - value), units: 'meters' as const, scope: 'face-restricted' as const };
    },
  });
}
export type SolidCubeGeometry = ReturnType<typeof createSolidCubeGeometry>;
