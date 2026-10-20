import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transportTangent, type PatchEdge, type SurfacePosition } from './contracts.ts';
import { createSolidCubeGeometry, SOLID_CUBE_CONNECTIONS, SOLID_CUBE_CORNERS, SOLID_CUBE_FACES, SOLID_CUBE_FRAMES, SOLID_CUBE_PHYSICAL_EDGES, SOLID_CUBE_PROVIDER, type CubeVector, type SolidCubeConfiguration, type SolidCubeFace } from './solid-cube.ts';
import { defineWorld } from './world.ts';

const identity = { worldId: 'cube-world', surfaceId: 'outside' };
const config: SolidCubeConfiguration = { identity, provider: SOLID_CUBE_PROVIDER, version: 1, configuration: 'solid', role: 'exterior', sideLengthMeters: 10 };
const g = createSolidCubeGeometry(config);
const pos = (patchId: SolidCubeFace, u = 0, v = 0) => ({ ...identity, patchId, u: u === 0 ? 0 : u, v: v === 0 ? 0 : v });
// Independent literal net. Each row follows u-min,u-max,v-min,v-max.
// Destination and reversal are reasoned from the six explicit Cartesian planes.
const net: Record<SolidCubeFace, readonly (readonly [SolidCubeFace, PatchEdge, boolean])[]> = {
  px: [['ny', 'u-max', false], ['py', 'u-min', false], ['nz', 'u-max', true], ['pz', 'u-max', false]],
  nx: [['py', 'u-max', false], ['ny', 'u-min', false], ['nz', 'u-min', false], ['pz', 'u-min', true]],
  py: [['px', 'u-max', false], ['nx', 'u-min', false], ['nz', 'v-min', true], ['pz', 'v-max', true]],
  ny: [['nx', 'u-max', false], ['px', 'u-min', false], ['nz', 'v-max', false], ['pz', 'v-min', false]],
  pz: [['nx', 'v-max', true], ['px', 'v-max', false], ['ny', 'v-max', false], ['py', 'v-max', true]],
  nz: [['nx', 'v-min', false], ['px', 'v-min', true], ['py', 'v-min', true], ['ny', 'v-min', false]],
};
const edges: readonly PatchEdge[] = ['u-min', 'u-max', 'v-min', 'v-max'];
const pointOnEdge = (face: SolidCubeFace, edge: PatchEdge, along: number) => pos(face, edge.startsWith('u') ? edge.endsWith('min') ? -5 : 5 : along, edge.startsWith('v') ? edge.endsWith('min') ? -5 : 5 : along);
const dot = (a: CubeVector, b: CubeVector) => a.reduce((sum, x, i) => sum + x * b[i]!, 0);

test('cube is six planar squares at the expected Cartesian positions, with right handed outward frames', () => {
  const expected: Record<SolidCubeFace, CubeVector> = { px: [5, 2, 3], nx: [-5, -2, 3], py: [-2, 5, 3], ny: [2, -5, 3], pz: [2, 3, 5], nz: [2, -3, -5] };
  for (const face of SOLID_CUBE_FACES) {
    const p = pos(face, 2, 3), f = SOLID_CUBE_FRAMES[face];
    assert.deepEqual(g.referencePosition(p), expected[face]);
    assert.deepEqual(g.tangentVector(p, { du: 2, dv: 3 }), expected[face].map((x, i) => x - 5 * f.normal[i]!));
    assert.equal(dot(f.u, f.v), 0); assert.equal(dot(f.normal, f.u), 0); assert.equal(dot(f.normal, f.v), 0);
    assert.equal(dot(f.u, f.u), 1); assert.equal(dot(f.v, f.v), 1); assert.equal(dot(f.normal, f.normal), 1);
    assert.deepEqual([f.u[1] * f.v[2] - f.u[2] * f.v[1], f.u[2] * f.v[0] - f.u[0] * f.v[2], f.u[0] * f.v[1] - f.u[1] * f.v[0]].map((x) => x === 0 ? 0 : x), f.normal);
    assert.deepEqual(g.positionsForReference(expected[face]), [p]);
  }
  assert.equal(g.faceAreaMeters2, 100); assert.equal(g.surfaceAreaMeters2, 600);
  // A physical cube corner lies sqrt(75) from its center; face centers lie 5 away.
  assert.ok(Math.abs(Math.hypot(...g.referencePosition(pos('px', 5, 5))) - Math.sqrt(75)) < 2e-15);
  assert.equal(Math.hypot(...g.referencePosition(pos('px'))), 5);
});

for (const face of SOLID_CUBE_FACES) test(`${face}: exact local lengths, metric and boundary distances, without spherical scaling`, () => {
  assert.deepEqual(g.faceMetric(pos(face)), { uu: 1, uv: 0, vv: 1, areaScale: 1, coordinateUnits: 'meters' });
  assert.equal(g.sameFaceDistance(pos(face, -2, -1), pos(face, 1, 3)).value, 5); // 3-4-5 triangle
  assert.equal(g.sameFaceDistance(pos(face, -5, -5), pos(face, 5, 5)).value, Math.hypot(10, 10));
  assert.equal(g.sameFaceDistance(pos(face, -5, 5), pos(face, 5, 5)).value, 10);
  assert.deepEqual(edges.map((edge) => g.distanceToEdge(pos(face, 2, -3), edge).value), [7, 3, 2, 8]);
  assert.equal(g.distanceToEdge(pos(face, 5, 0), 'u-max').value, 0);
  assert.equal(Math.hypot(...g.tangentVector(pos(face), { du: 3, dv: 4 })), 5);
});

for (const face of SOLID_CUBE_FACES) test(`${face}: all four physical edges match the independent net and invert exactly`, () => {
  for (const [i, edge] of edges.entries()) {
    const [toFace, toEdge, reversed] = net[face][i]!;
    const c = SOLID_CUBE_CONNECTIONS.find((c) => c.face === face && c.edge === edge)!;
    assert.deepEqual([c.toFace, c.toEdge, c.reversed], [toFace, toEdge, reversed]);
    for (const along of [-5, -3.125, 0, 2, 5]) {
      const p = pointOnEdge(face, edge, along), result = g.crossEdge(p, edge), back = g.crossEdge(result.position, toEdge);
      assert.deepEqual(result.position, pointOnEdge(toFace, toEdge, reversed ? -along : along));
      assert.deepEqual(g.referencePosition(result.position), g.referencePosition(p));
      assert.deepEqual(back.position, p);
      assert.equal(dot(g.normal(p), g.normal(result.position)), 0); // true right angle
      const { uu, uv, vu, vv } = result.transport;
      assert.equal(uu * vv - uv * vu, 1);
      assert.equal(uu * uu + vu * vu, 1); assert.equal(uv * uv + vv * vv, 1); assert.ok(uu * uv + vu * vv === 0);
      const t = { du: 3.25, dv: -4.75 }, folded = transportTangent(t, result.transport);
      assert.deepEqual(transportTangent(folded, back.transport), t);
      assert.equal(Math.hypot(folded.du, folded.dv), Math.hypot(t.du, t.dv));
    }
  }
});

test('twelve edges are distinct reciprocal pairs and every ChartSeam has the correct scoped identity', () => {
  assert.equal(SOLID_CUBE_CONNECTIONS.length, 24); assert.equal(SOLID_CUBE_PHYSICAL_EDGES.length, 12);
  assert.equal(new Set(SOLID_CUBE_PHYSICAL_EDGES.map((c) => c.edgeId)).size, 12);
  for (const c of SOLID_CUBE_PHYSICAL_EDGES) {
    assert.equal(SOLID_CUBE_CONNECTIONS.filter((other) => other.edgeId === c.edgeId).length, 2);
    assert.ok(SOLID_CUBE_CONNECTIONS.some((other) => other.face === c.toFace && other.edge === c.toEdge && other.toFace === c.face && other.toEdge === c.edge && other.reversed === c.reversed));
  }
  for (const [i, seam] of g.seams.entries()) {
    const c = SOLID_CUBE_CONNECTIONS[i]!;
    assert.deepEqual(seam.from, { chart: { ...identity, patchId: c.face }, edge: c.edge });
    assert.deepEqual(seam.to, { chart: { ...identity, patchId: c.toFace }, edge: c.toEdge });
    assert.equal(seam.alongEdge, c.reversed ? 'reversed' : 'same');
  }
});

test('all eight corners have exactly three correct aliases, one canonical face and three one-sided normals', () => {
  assert.equal(SOLID_CUBE_CORNERS.length, 8); assert.equal(new Set(SOLID_CUBE_CORNERS.map((c) => c.cornerId)).size, 8);
  for (const x of [-5, 5]) for (const y of [-5, 5]) for (const z of [-5, 5]) {
    const q: CubeVector = [x, y, z], aliases = g.positionsForReference(q);
    assert.equal(aliases.length, 3);
    assert.deepEqual(aliases.map((p) => p.patchId), [x > 0 ? 'px' : 'nx', y > 0 ? 'py' : 'ny', z > 0 ? 'pz' : 'nz']);
    for (const a of aliases) { assert.deepEqual(g.referencePosition(a), q); assert.deepEqual(g.canonicalPosition(a), aliases[0]); }
    const normals = aliases.map(g.normal);
    assert.equal(dot(normals[0]!, normals[1]!), 0); assert.equal(dot(normals[1]!, normals[2]!), 0);
    assert.ok(SOLID_CUBE_CORNERS.some((c) => c.signs.every((s, i) => s * 5 === q[i]) && c.faces.join() === aliases.map((a) => a.patchId).join()));
  }
});

test('edge transport folds real ambient tangents; corner holonomy forbids a path-independent smooth tangent', () => {
  const a = pos('px', 5, 5), b = pos('py', -5, 5), c = pos('pz', 5, 5);
  const initial = { du: 1, dv: 0 };
  const ab = g.tangentTransform(a, b), bc = g.tangentTransform(b, c), ca = g.tangentTransform(c, a);
  assert.deepEqual(g.tangentVector(pos('px', 0, 5), { du: 0, dv: 1 }), [0, 0, 1]);
  assert.deepEqual(g.tangentVector(pos('pz', 5, 0), transportTangent({ du: 0, dv: 1 }, g.tangentTransform(pos('px', 0, 5), pos('pz', 5, 0)))), [-1, 0, 0]);
  const viaB = transportTangent(transportTangent(initial, ab), bc), direct = transportTangent(initial, g.tangentTransform(a, c));
  assert.notDeepEqual(viaB, direct);
  assert.deepEqual(transportTangent(viaB, ca), { du: 0, dv: 1 }); // pi/2 angular deficit
});

test('exact boundary semantics do not identify near-edge points or introduce geometric tolerances', () => {
  assert.equal(g.aliases(pos('px', 5 - 1e-12)).length, 1);
  assert.equal(g.aliases(pos('px', 5)).length, 2);
  assert.throws(() => g.crossEdge(pos('px', 5 - 1e-12), 'u-max'), RangeError);
  assert.deepEqual(g.normalize(pos('px', -0, -0)), pos('px', 0, 0));
});

test('dimensions, versions, roles, identities, coordinates and tangent/route misuse fail closed', () => {
  for (const sideLengthMeters of [0, -1, NaN, Infinity, Number.MAX_VALUE, Number.MIN_VALUE, 1e-200, 1e200]) assert.throws(() => createSolidCubeGeometry({ ...config, sideLengthMeters }), RangeError);
  for (const patch of [{ provider: 'equiangular-cube-sphere' }, { version: 2 }, { configuration: 'hollow' }, { role: 'interior' }, { identity: { ...identity, surfaceId: '' } }, { identity: { ...identity, worldId: 'x'.repeat(129) } }]) {
    assert.throws(() => createSolidCubeGeometry({ ...config, ...patch } as SolidCubeConfiguration), RangeError);
  }
  for (const patch of [{ worldId: 'elsewhere' }, { surfaceId: 'inside' }, { patchId: 'not-a-face' }, { u: NaN }, { v: Infinity }, { u: 5.000001 }]) assert.throws(() => g.referencePosition({ ...pos('px'), ...patch }), RangeError);
  for (const q of [[0, 0, 0], [5, 6, 0], [Infinity, 5, 0], [4.999999, 0, 0], [5, 0]] as CubeVector[]) assert.throws(() => g.positionsForReference(q), RangeError);
  const sparse = [5]; sparse.length = 3;
  for (const q of [sparse, null, undefined, { 0: 5, 1: 0, 2: 0, length: 3 }]) assert.throws(() => g.positionsForReference(q as unknown as CubeVector), RangeError);
  assert.throws(() => g.tangentVector(pos('px'), { du: NaN, dv: 0 }), RangeError);
  assert.throws(() => g.tangentTransform(pos('px'), pos('py')), RangeError);
  assert.throws(() => g.crossEdge(pos('px'), 'u-max'), RangeError);
  assert.throws(() => g.crossEdge(pos('px'), 'bad' as PatchEdge), RangeError);
  assert.throws(() => g.sameFaceDistance(pos('px'), pos('py')), /Global cube routes are not implemented/);
  const foreign: SurfacePosition = { ...pos('px'), surfaceId: 'inside' };
  assert.throws(() => g.sameFaceDistance(pos('px'), foreign), RangeError);
});

test('provider snapshots inputs and fits the existing custom World/Surface contracts without UI support', () => {
  const mutable = { ...config, identity: { ...identity } }, cube = createSolidCubeGeometry(mutable);
  mutable.identity.worldId = 'changed'; mutable.sideLengthMeters = 20;
  assert.deepEqual(cube.metadata, config); assert.ok(Object.isFrozen(cube.metadata)); assert.ok(Object.isFrozen(cube.metadata.identity));
  const world = defineWorld({ id: identity.worldId, shape: { kind: 'custom', geometry: { id: SOLID_CUBE_PROVIDER, version: 1 } }, surfaces: [{ identity, role: 'exterior', terrainId: 'cube-terrain', topology: { id: SOLID_CUBE_PROVIDER, version: 1 }, representation: { id: 'physical-cube-shared-boundary-vertices', version: 1 } }] });
  assert.equal(world.surfaces[0]!.identity.worldId, cube.identity.worldId);
  assert.equal(world.surfaces[0]!.identity.surfaceId, cube.identity.surfaceId);
  assert.equal(world.shape.kind, 'custom');
});
