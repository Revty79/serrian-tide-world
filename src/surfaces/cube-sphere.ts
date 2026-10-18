import { assertIdentity, type PatchEdge, type SurfaceIdentity, type SurfacePosition, type SurfaceTangent, type TangentTransform } from './contracts.ts';

export type Vec3 = readonly [number, number, number];
export const CUBE_FACES = Object.freeze(['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const);
export type CubeFace = typeof CUBE_FACES[number];
export const FACE_EDGES: readonly PatchEdge[] = Object.freeze(['u-min', 'u-max', 'v-min', 'v-max']);
export const QUARTER_PI = Math.PI / 4;
export const CHART_TOLERANCE = 64 * Number.EPSILON;
export interface FaceBasis { readonly normal: Vec3; readonly u: Vec3; readonly v: Vec3 }
const basis = (normal: Vec3, u: Vec3, v: Vec3): FaceBasis => Object.freeze({ normal: Object.freeze(normal), u: Object.freeze(u), v: Object.freeze(v) });
/** Fixed representation frame, not an Earth axis or a viewing orientation. U cross V = N. */
export const FACE_BASES: Readonly<Record<CubeFace, FaceBasis>> = Object.freeze({
  px: basis([1, 0, 0], [0, 1, 0], [0, 0, 1]), nx: basis([-1, 0, 0], [0, -1, 0], [0, 0, 1]),
  py: basis([0, 1, 0], [-1, 0, 0], [0, 0, 1]), ny: basis([0, -1, 0], [1, 0, 0], [0, 0, 1]),
  pz: basis([0, 0, 1], [1, 0, 0], [0, 1, 0]), nz: basis([0, 0, -1], [1, 0, 0], [0, -1, 0]),
});
export const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross3 = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const scale3 = (a: Vec3, t: number): Vec3 => [a[0] * t, a[1] * t, a[2] * t];
export const add3 = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export function unitDirection(vector: Vec3): Vec3 {
  if (vector.length !== 3 || !vector.every(Number.isFinite)) throw new RangeError('A finite 3D direction is required.');
  const largest = Math.max(...vector.map(Math.abs));
  if (largest === 0) throw new RangeError('A zero direction has no spherical location.');
  // Divide individually: reciprocal of a subnormal largest can overflow.
  const safe: Vec3 = [vector[0] / largest, vector[1] / largest, vector[2] / largest];
  return scale3(safe, 1 / Math.hypot(...safe));
}
export function assertSphereRadius(radius: number) {
  if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(radius * Math.PI)) throw new RangeError('Sphere radius must be positive with finite geodesic distances.');
}
export function geodesicDistanceMeters(first: Vec3, second: Vec3, radius: number): number {
  assertSphereRadius(radius);
  const a = unitDirection(first), b = unitDirection(second);
  return radius * Math.atan2(Math.hypot(...cross3(a, b)), Math.max(-1, Math.min(1, dot3(a, b))));
}
export function assertCubeFace(face: string): asserts face is CubeFace {
  if (!(CUBE_FACES as readonly string[]).includes(face)) throw new RangeError('Unknown cube-sphere face.');
}
export interface CubePosition extends SurfacePosition { readonly patchId: CubeFace }
export interface FaceConnection { readonly face: CubeFace; readonly edge: PatchEdge; readonly toFace: CubeFace; readonly toEdge: PatchEdge; readonly reversed: boolean }
function makeConnections(): readonly FaceConnection[] {
  return Object.freeze(CUBE_FACES.flatMap((face) => FACE_EDGES.map((edge): FaceConnection => {
    const source = FACE_BASES[face], uEdge = edge.startsWith('u'), sign = edge.endsWith('min') ? -1 : 1;
    const normal = scale3(uEdge ? source.u : source.v, sign);
    const toFace = CUBE_FACES.find((candidate) => dot3(FACE_BASES[candidate].normal, normal) === 1)!;
    const destination = FACE_BASES[toFace];
    const fixedU = dot3(source.normal, destination.u), fixedV = dot3(source.normal, destination.v);
    const toEdge: PatchEdge = fixedU ? (fixedU < 0 ? 'u-min' : 'u-max') : (fixedV < 0 ? 'v-min' : 'v-max');
    const alongSource = uEdge ? source.v : source.u, alongDestination = toEdge.startsWith('u') ? destination.v : destination.u;
    return Object.freeze({ face, edge, toFace, toEdge, reversed: dot3(alongSource, alongDestination) < 0 });
  })));
}
/** 24 directed seams, paired into twelve undirected edges. */
export const FACE_CONNECTIONS = makeConnections();
export function faceConnection(face: CubeFace, edge: PatchEdge): FaceConnection {
  const connection = FACE_CONNECTIONS.find((value) => value.face === face && value.edge === edge);
  if (!connection) throw new RangeError('Unknown cube-sphere face or edge.');
  return connection;
}
const slope = (angle: number) => angle === QUARTER_PI ? 1 : angle === -QUARTER_PI ? -1 : Math.tan(angle);
function angle(value: number): number {
  if (!Number.isFinite(value) || Math.abs(value) > QUARTER_PI + CHART_TOLERANCE) throw new RangeError('Position lies outside its cube-sphere chart.');
  return Math.max(-QUARTER_PI, Math.min(QUARTER_PI, value));
}

/** Pure reference-sphere geometry. Angular chart coordinates are radians; distances are meters. */
export function createCubeSphereGeometry(identityInput: SurfaceIdentity, radiusMeters: number) {
  assertIdentity(identityInput); assertSphereRadius(radiusMeters);
  const identity = Object.freeze({ worldId: identityInput.worldId, surfaceId: identityInput.surfaceId });
  const checked = (position: SurfacePosition): CubePosition => {
    if (position.worldId !== identity.worldId || position.surfaceId !== identity.surfaceId) throw new RangeError('Position belongs to another spherical surface.');
    assertCubeFace(position.patchId);
    return { ...identity, patchId: position.patchId, u: angle(position.u), v: angle(position.v) };
  };
  const direction = (input: SurfacePosition): Vec3 => {
    const position = checked(input), frame = FACE_BASES[position.patchId];
    return unitDirection(add3(frame.normal, add3(scale3(frame.u, slope(position.u)), scale3(frame.v, slope(position.v)))));
  };
  const positionsForDirection = (input: Vec3): readonly CubePosition[] => {
    const d = unitDirection(input), maximum = Math.max(...d.map(Math.abs));
    return CUBE_FACES.filter((face) => dot3(d, FACE_BASES[face].normal) >= maximum - CHART_TOLERANCE).map((face) => {
      const frame = FACE_BASES[face], normal = dot3(d, frame.normal);
      return { ...identity, patchId: face, u: angle(Math.atan2(dot3(d, frame.u), normal)), v: angle(Math.atan2(dot3(d, frame.v), normal)) };
    });
  };
  const canonicalPosition = (input: SurfacePosition): CubePosition => positionsForDirection(direction(input))[0]!;
  const derivatives = (input: SurfacePosition): { readonly u: Vec3; readonly v: Vec3 } => {
    const position = checked(input), frame = FACE_BASES[position.patchId], x = slope(position.u), y = slope(position.v);
    const d = direction(position), length = Math.hypot(1, x, y);
    return {
      u: scale3(add3(frame.u, scale3(d, -dot3(d, frame.u))), (1 + x * x) / length),
      v: scale3(add3(frame.v, scale3(d, -dot3(d, frame.v))), (1 + y * y) / length),
    };
  };
  const tangentTransform = (from: SurfacePosition, to: SurfacePosition): TangentTransform => {
    const a = direction(from), b = direction(to);
    if (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > CHART_TOLERANCE * 4) throw new RangeError('Chart tangent conversion requires the same physical point.');
    const source = derivatives(from), target = derivatives(to);
    const g11 = dot3(target.u, target.u), g12 = dot3(target.u, target.v), g22 = dot3(target.v, target.v), determinant = g11 * g22 - g12 * g12;
    const components = (vector: Vec3) => {
      const u = dot3(target.u, vector), v = dot3(target.v, vector);
      return { u: (g22 * u - g12 * v) / determinant, v: (g11 * v - g12 * u) / determinant };
    };
    const u = components(source.u), v = components(source.v);
    return { uu: u.u, uv: v.u, vu: u.v, vv: v.v };
  };
  const crossEdge = (input: SurfacePosition, edge: PatchEdge) => {
    const from = checked(input), connection = faceConnection(from.patchId, edge), uEdge = edge.startsWith('u');
    const fixed = edge.endsWith('min') ? -QUARTER_PI : QUARTER_PI;
    if (Math.abs((uEdge ? from.u : from.v) - fixed) > CHART_TOLERANCE) throw new RangeError('Position is not on the requested edge.');
    const along = (uEdge ? from.v : from.u) * (connection.reversed ? -1 : 1), toFixed = connection.toEdge.endsWith('min') ? -QUARTER_PI : QUARTER_PI;
    const position: CubePosition = { ...identity, patchId: connection.toFace, u: connection.toEdge.startsWith('u') ? toFixed : along, v: connection.toEdge.startsWith('v') ? toFixed : along };
    return { position, transport: tangentTransform(from, position) };
  };
  return Object.freeze({
    identity, radiusMeters, direction, positionsForDirection, canonicalPosition, crossEdge, tangentTransform, derivatives,
    referencePosition: (position: SurfacePosition): Vec3 => scale3(direction(position), radiusMeters),
    tangentVector: (position: SurfacePosition, tangent: SurfaceTangent): Vec3 => {
      if (![tangent.du, tangent.dv].every(Number.isFinite)) throw new RangeError('Tangent components must be finite.');
      const frame = derivatives(position), vector = scale3(add3(scale3(frame.u, tangent.du), scale3(frame.v, tangent.dv)), radiusMeters);
      if (!vector.every(Number.isFinite)) throw new RangeError('Physical tangent overflow.');
      return vector;
    },
    metric: Object.freeze({ distance: (a: SurfacePosition, b: SurfacePosition) => ({ value: geodesicDistanceMeters(direction(a), direction(b), radiusMeters), units: 'meters' as const }) }),
  });
}
