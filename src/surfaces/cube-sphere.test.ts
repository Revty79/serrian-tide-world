import test from 'node:test';
import assert from 'node:assert/strict';
import { transportTangent, type PatchEdge } from './contracts.ts';
import { CUBE_FACES, FACE_BASES, FACE_CONNECTIONS, QUARTER_PI, add3, cross3, createCubeSphereGeometry, dot3, geodesicDistanceMeters, scale3, unitDirection, type CubeFace, type Vec3 } from './cube-sphere.ts';

const identity = { worldId: 'numerical-world', surfaceId: 'outside' }, radius = 1_250_000;
const geometry = createCubeSphereGeometry(identity, radius);
const at = (patchId: CubeFace, u = 0, v = 0) => ({ ...identity, patchId, u, v });
const close = (a: number, b: number, tolerance = 1e-12) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
const vectorClose = (a: Vec3, b: Vec3, tolerance = 1e-12) => a.forEach((value, axis) => close(value, b[axis]!, tolerance));
const seamPoint = (face: CubeFace, edge: PatchEdge, t: number) => at(face, edge.startsWith('u') ? (edge.endsWith('min') ? -QUARTER_PI : QUARTER_PI) : t, edge.startsWith('v') ? (edge.endsWith('min') ? -QUARTER_PI : QUARTER_PI) : t);

test('all six fixed face frames are right handed and map centers/angles to a round reference sphere', () => {
  const expected: Record<CubeFace, Vec3> = { px: [1, 0, 0], nx: [-1, 0, 0], py: [0, 1, 0], ny: [0, -1, 0], pz: [0, 0, 1], nz: [0, 0, -1] };
  for (const face of CUBE_FACES) {
    const frame = FACE_BASES[face]; vectorClose(frame.normal, expected[face]); vectorClose(cross3(frame.u, frame.v), frame.normal);
    close(dot3(frame.normal, frame.u), 0); close(dot3(frame.u, frame.v), 0);
    vectorClose(geometry.direction(at(face)), expected[face]);
    for (const u of [-QUARTER_PI, -.1, 0, .3, QUARTER_PI]) for (const v of [-QUARTER_PI, -.2, 0, QUARTER_PI]) {
      const direction = geometry.direction(at(face, u, v)); close(Math.hypot(...direction), 1);
      close(Math.hypot(...geometry.referencePosition(at(face, u, v))), radius, 5e-10);
      const recovered = geometry.positionsForDirection(direction).find((p) => p.patchId === face)!;
      close(recovered.u, u); close(recovered.v, v);
      vectorClose(geometry.direction(geometry.canonicalPosition(at(face, u, v))), direction);
    }
  }
});

test('independent 24-transition fixture covers all twelve edges with reciprocal orientation and physical continuity', () => {
  const expected: Record<CubeFace, readonly [CubeFace, PatchEdge, boolean][]> = {
    px: [['ny', 'u-max', false], ['py', 'u-min', false], ['nz', 'u-max', true], ['pz', 'u-max', false]],
    nx: [['py', 'u-max', false], ['ny', 'u-min', false], ['nz', 'u-min', false], ['pz', 'u-min', true]],
    py: [['px', 'u-max', false], ['nx', 'u-min', false], ['nz', 'v-min', true], ['pz', 'v-max', true]],
    ny: [['nx', 'u-max', false], ['px', 'u-min', false], ['nz', 'v-max', false], ['pz', 'v-min', false]],
    pz: [['nx', 'v-max', true], ['px', 'v-max', false], ['ny', 'v-max', false], ['py', 'v-max', true]],
    nz: [['nx', 'v-min', false], ['px', 'v-min', true], ['py', 'v-min', true], ['ny', 'v-min', false]],
  };
  const edges: PatchEdge[] = ['u-min', 'u-max', 'v-min', 'v-max'], undirected = new Set<string>();
  assert.equal(FACE_CONNECTIONS.length, 24);
  for (const face of CUBE_FACES) for (const [i, edge] of edges.entries()) {
    const actual = FACE_CONNECTIONS.find((c) => c.face === face && c.edge === edge)!;
    assert.deepEqual([actual.toFace, actual.toEdge, actual.reversed], expected[face][i]);
    undirected.add([`${face}/${edge}`, `${actual.toFace}/${actual.toEdge}`].sort().join('|'));
    for (const t of [-QUARTER_PI, -.45, 0, .28, QUARTER_PI]) {
      const source = seamPoint(face, edge, t), crossed = geometry.crossEdge(source, edge), back = geometry.crossEdge(crossed.position, actual.toEdge);
      assert.deepEqual(back.position, source);
      vectorClose(geometry.direction(crossed.position), geometry.direction(source));
      close(geometry.metric.distance(source, crossed.position).value, 0, 5e-10);
      const heading = { du: .002, dv: -.003 }, target = transportTangent(heading, crossed.transport);
      vectorClose(geometry.tangentVector(source, heading), geometry.tangentVector(crossed.position, target), 1e-10);
      const restored = transportTangent(target, back.transport); close(restored.du, heading.du); close(restored.dv, heading.dv);
      assert.ok(crossed.transport.uu * crossed.transport.vv - crossed.transport.uv * crossed.transport.vu > 0);
    }
  }
  assert.equal(undirected.size, 12);
});

test('all eight physical corners have three equivalent charts and consistent full-cycle tangent changes of basis', () => {
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const positions = geometry.positionsForDirection([x, y, z]); assert.equal(positions.length, 3);
    const direction = unitDirection([x, y, z]);
    for (const p of positions) vectorClose(geometry.direction(p), direction);
    let heading = { du: .01, dv: -.02 };
    for (let i = 0; i < 3; i++) heading = transportTangent(heading, geometry.tangentTransform(positions[i]!, positions[(i + 1) % 3]!));
    close(heading.du, .01); close(heading.dv, -.02);
  }
});

test('geodesic fixtures cover zero, quarter circumference, antipodes, small separations and non-Earth radius scaling', () => {
  close(geodesicDistanceMeters([1, 0, 0], [0, 1, 0], radius), Math.PI * radius / 2, 1e-9);
  close(geodesicDistanceMeters([1, 0, 0], [-1, 0, 0], radius), Math.PI * radius, 1e-9);
  assert.equal(geodesicDistanceMeters([2, 3, 4], [2, 3, 4], radius), 0);
  close(geodesicDistanceMeters([1, 0, 0], [Math.cos(1e-10), Math.sin(1e-10), 0], radius), radius * 1e-10, 1e-15);
  close(geodesicDistanceMeters([1, 0, 0], [-1, 1e-12, 0], radius), radius * (Math.PI - 1e-12), 1e-9);
  close(geodesicDistanceMeters([1, 0, 0], [0, 1, 0], 7), 7 * Math.PI / 2);
  vectorClose(unitDirection([1e308, 1e308, 0]), [Math.SQRT1_2, Math.SQRT1_2, 0]);
  vectorClose(unitDirection([Number.MIN_VALUE, 0, 0]), [1, 0, 0]);
});

test('arbitrary poles, near-corner and near-edge directions invert without a longitude singularity', () => {
  for (const direction of [[0, 0, 1], [0, 0, -1], [1, 2, 3], [-2, 7, -.1], [1, 1 + 1e-10, 1], [1, 1 - 1e-10, 0], [1, 1 + 1e-15, 0]] as const) {
    for (const p of geometry.positionsForDirection(direction)) vectorClose(geometry.direction(p), unitDirection(direction), 5e-14);
  }
  assert.equal(geometry.positionsForDirection([1, 1 + 1e-10, 0]).length, 1);
  assert.equal(geometry.positionsForDirection([1, 1, 0]).length, 2);
  assert.equal(geometry.positionsForDirection([1, 1, 1]).length, 3);
});

test('analytical chart derivatives agree with an independent finite-difference mapping', () => {
  const raw = (face: CubeFace, u: number, v: number) => { const b = FACE_BASES[face]; return unitDirection(add3(b.normal, add3(scale3(b.u, Math.tan(u)), scale3(b.v, Math.tan(v))))); };
  const h = 1e-6;
  for (const face of CUBE_FACES) for (const [u, v] of [[.1, -.2], [QUARTER_PI, .4], [-QUARTER_PI, QUARTER_PI]]) {
    const p = at(face, u!, v!), derivatives = geometry.derivatives(p);
    const a = raw(face, p.u + h, p.v), b = raw(face, p.u - h, p.v), c = raw(face, p.u, p.v + h), d = raw(face, p.u, p.v - h);
    vectorClose(derivatives.u, scale3(add3(a, scale3(b, -1)), 1 / (2 * h)), 2e-10);
    vectorClose(derivatives.v, scale3(add3(c, scale3(d, -1)), 1 / (2 * h)), 2e-10);
  }
});

test('geometry rejects invalid radii, foreign addresses, nonfinite directions and nonphysical tangent conversions', () => {
  for (const invalid of [0, -1, Infinity, NaN, Number.MAX_VALUE]) assert.throws(() => createCubeSphereGeometry(identity, invalid));
  for (const d of [[0, 0, 0], [NaN, 1, 0], [0, Infinity, 0]] as const) assert.throws(() => geometry.positionsForDirection(d));
  for (const replacement of [{ worldId: 'foreign' }, { surfaceId: 'inside' }, { patchId: 'cube' }, { u: 2 }, { v: Infinity }]) assert.throws(() => geometry.direction({ ...at('px'), ...replacement }));
  assert.throws(() => geometry.crossEdge(at('px'), 'u-min'));
  assert.throws(() => geometry.tangentTransform(at('px'), at('py')));
  assert.throws(() => geometry.tangentVector(at('px'), { du: Infinity, dv: 0 }));
});
