import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CubeRouteCertificationError, type CubeBinaryRational } from './cube-route-exact.ts';
import { createSolidCubeRouter, CUBE_ROUTE_SEQUENCE_COUNTS, type SolidCubeRouteResult } from './solid-cube-routing.ts';
import { SOLID_CUBE_FACES, SOLID_CUBE_PROVIDER, type SolidCubeConfiguration, type SolidCubeFace } from './solid-cube.ts';
import { createSolidCubeTerrain } from '../terrain/solid-cube.ts';

const identity = { worldId: 'route-world', surfaceId: 'exterior' };
const configuration: SolidCubeConfiguration = { identity, provider: SOLID_CUBE_PROVIDER, version: 1, configuration: 'solid', role: 'exterior', sideLengthMeters: 10 };
const router = createSolidCubeRouter(configuration);
const p = (patchId: SolidCubeFace, u = 0, v = 0) => ({ ...identity, patchId, u, v });
const value = (r: CubeBinaryRational) => Number(r.n) / Number(r.d) * 2 ** r.exponent;
function squared(result: SolidCubeRouteResult, expected: bigint) {
  const r = result.distanceSquared;
  if (r.exponent < 0) assert.equal(r.n, expected * r.d << BigInt(-r.exponent));
  else assert.equal(r.n << BigInt(r.exponent), expected * r.d);
}
function checkPath(result: SolidCubeRouteResult) {
  assert.ok(result.certificate.candidateSequences <= 252); assert.ok(result.certificate.workUnits <= 200000);
  assert.equal(result.routes.length, result.certificate.completePhysicalShortestRoutes);
  for (const route of result.routes) {
    assert.equal(route.crossings.length, Math.max(0, route.segments.length - 1));
    assert.equal(new Set(route.faces).size, route.faces.length);
    let parameter = 0;
    for (const segment of route.segments) {
      assert.equal(Number(segment.startParameter.n) / Number(segment.startParameter.d), parameter);
      parameter = Number(segment.endParameter.n) / Number(segment.endParameter.d);
      for (const point of [segment.from, segment.to]) { assert.ok(Math.abs(value(point.u)) <= 5); assert.ok(Math.abs(value(point.v)) <= 5); }
    }
    if (route.segments.length) assert.equal(parameter, 1);
    for (const [i, crossing] of route.crossings.entries()) {
      const before = route.segments[i]!, after = route.segments[i + 1]!;
      assert.deepEqual(before.toWorld, after.fromWorld);
      const a = crossing.fromEdge.startsWith('u') ? crossing.from.u : crossing.from.v;
      const b = crossing.toEdge.startsWith('u') ? crossing.to.u : crossing.to.v;
      assert.equal(value(a), crossing.fromEdge.endsWith('min') ? -5 : 5);
      assert.equal(value(b), crossing.toEdge.endsWith('min') ? -5 : 5);
      const t = crossing.transport;
      assert.ok(value(after.direction.du) === t.uu * value(before.direction.du) + t.uv * value(before.direction.dv));
      assert.ok(value(after.direction.dv) === t.vu * value(before.direction.du) + t.vv * value(before.direction.dv));
      // No positive-length shortest route may pass through a singular corner internally.
      const point = crossing.point; assert.ok(!point.numerator.every((v) => v === 5n * point.denominator * (1n << BigInt(-point.exponent)) || -v === 5n * point.denominator * (1n << BigInt(-point.exponent))));
    }
  }
}
test('the complete fixed graph contains 798 simple sequences; every ordered pair uses at most six faces', () => {
  assert.equal(CUBE_ROUTE_SEQUENCE_COUNTS.flat().reduce((a, b) => a + b, 0), 798);
  for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) assert.equal(CUBE_ROUTE_SEQUENCE_COUNTS[a]![b], a === b ? 1 : Math.floor(a / 2) === Math.floor(b / 2) ? 28 : 26);
});
for (const face of SOLID_CUBE_FACES) test(`${face}: same-face 3-4-5 path is the exact global Euclidean lower bound`, () => {
  const result = router.route(p(face), p(face, 3, 4)); squared(result, 25n);
  assert.deepEqual(result.distanceMeters, { lower: 5, upper: 5, units: 'meters' });
  assert.deepEqual(result.selected.faces, [face]); assert.equal(result.unique, true); checkPath(result);
});
for (const face of ['py', 'ny', 'pz', 'nz'] as const) test(`px to ${face}: literal two-square center unfolding has length L`, () => {
  const result = router.route(p('px'), p(face)); squared(result, 100n);
  assert.equal(result.distanceMeters.lower, 10); assert.equal(result.unique, true);
  assert.equal(result.selected.crossings.length, 1); assert.equal(result.selected.crossings[0]!.parameter.n, 1n); assert.equal(result.selected.crossings[0]!.parameter.d, 2n); checkPath(result);
});
test('opposite face centers have four distinct exact 2L routes, not the 3D chord L', () => {
  const result = router.route(p('px'), p('nx')); squared(result, 400n);
  assert.equal(result.distanceMeters.lower, 20); assert.equal(result.routes.length, 4); assert.equal(result.unique, false);
  assert.deepEqual(result.routes.map((r) => r.faces[1]).sort(), ['ny', 'nz', 'py', 'pz']); checkPath(result);
});
test('a literal four-square unfolding wins over every three-face strip', () => {
  // In the px/ny/pz/nx net, centers (0,0),(-10,0),(-10,10),(-20,10).
  // P=(-4,-3), Q=(-16,13): displacement (-12,16), length20.
  const result = router.route(p('px', -4, -3), p('nx', -3, 4)); squared(result, 400n);
  assert.equal(result.unique, true); assert.deepEqual(result.selected.faces, ['px', 'ny', 'pz', 'nx']);
  assert.deepEqual(result.selected.crossings.map((c) => c.parameter), [{ n: 1n, d: 12n }, { n: 1n, d: 2n }, { n: 11n, d: 12n }]); checkPath(result);
});
test('opposite corners have six sqrt(5)L routes, no invented smooth corner transport', () => {
  const result = router.route(p('px', 5, 5), p('nx', 5, -5)); squared(result, 500n);
  assert.equal(result.routes.length, 6); assert.equal(result.start.kind, 'corner'); assert.equal(result.end.kind, 'corner');
  assert.equal(result.start.incidentFaces.length, 3); assert.equal(result.directionPolicy, 'one-sided-face-tangents'); checkPath(result);
});
test('edge aliases do not count as different shortest curves or create spurious zero segments', () => {
  const a = p('px', 5, -3), b = p('py', -5, 4), result = router.route(a, b); squared(result, 49n);
  assert.equal(result.routes.length, 1); assert.deepEqual(result.selected.faces, ['px']);
  assert.equal(result.start.kind, 'edge'); assert.equal(result.end.kind, 'edge');
  assert.deepEqual(router.route(p('py', -5, -3), p('px', 5, 4)), result); checkPath(result);
  const face = router.route(p('px', 5, 0), p('py')); squared(face, 25n); assert.deepEqual(face.selected.faces, ['py']);
});
test('corner endpoints and identical aliases reconstruct a constant curve with undefined direction', () => {
  const result = router.route(p('px', 5, 5), p('pz', 5, 5)); squared(result, 0n);
  assert.equal(result.selected.vertices.length, 1); assert.equal(result.selected.segments.length, 0);
  assert.equal(result.directionPolicy, 'undefined-zero-length'); assert.equal(result.unique, true);
  assert.equal(result.distanceMeters.upper, 0);
  const edge = router.route(p('px', 5, 5), p('px', 5, -5)); squared(edge, 100n); assert.equal(edge.unique, true); checkPath(edge);
  const diagonal = router.route(p('px', -5, -5), p('px', 5, 5)); squared(diagonal, 200n); assert.equal(diagonal.unique, true); checkPath(diagonal);
});
test('reversal chooses exactly the reversed physical curves with inverse fold direction and lengths', () => {
  for (const [a, b] of [[p('px', -4, -3), p('nx', -3, 4)], [p('px'), p('nx')], [p('px', 5, 5), p('nx', 5, -5)]]) {
    const forward = router.route(a!, b!), backward = router.route(b!, a!);
    assert.deepEqual(forward.distanceSquared, backward.distanceSquared); assert.deepEqual(forward.distanceMeters, backward.distanceMeters);
    assert.equal(forward.routes.length, backward.routes.length);
    for (let i = 0; i < forward.routes.length; i++) {
      const x = forward.routes[i]!, y = backward.routes[i]!;
      assert.deepEqual(x.vertices, [...y.vertices].reverse()); assert.deepEqual(x.faces, [...y.faces].reverse());
      assert.deepEqual(x.segments.map((s) => s.lengthMeters), [...y.segments].reverse().map((s) => s.lengthMeters));
      for (const [j, c] of x.crossings.entries()) {
        const inverse = y.crossings[y.crossings.length - 1 - j]!;
        assert.deepEqual(c.transport, { uu: inverse.transport.uu, uv: inverse.transport.vu, vu: inverse.transport.uv, vv: inverse.transport.vv });
      }
    }
  }
});
test('a subnormal displacement resolves a genuine shortest-path choice far below one output ULP', () => {
  const result = router.route(p('px', Number.MIN_VALUE, 0), p('nx'));
  assert.equal(result.unique, true); assert.deepEqual(result.selected.faces, ['px', 'py', 'nx']);
  assert.deepEqual(result.distanceMeters, { lower: 19.999999999999996, upper: 20, units: 'meters' });
  const tiny = router.route(p('px'), p('px', Number.MIN_VALUE)); assert.equal(tiny.distanceMeters.lower, Number.MIN_VALUE); assert.equal(tiny.distanceMeters.upper, Number.MIN_VALUE);
});
for (const length of [2e-162, 1e-160, 1e100, 5e153]) test(`extreme Cube-A-supported dimension L=${length} keeps exact ranking and finite bounds`, () => {
  const r = createSolidCubeRouter({ ...configuration, sideLengthMeters: length }), result = r.route(p('px', Number.MIN_VALUE), p('nx'));
  assert.equal(result.unique, true); assert.deepEqual(result.selected.faces, ['px', 'py', 'nx']);
  assert.ok(Number.isFinite(result.distanceMeters.upper)); assert.ok(result.distanceMeters.lower > 0);
  assert.ok(result.certificate.peakIntegerBits < 16384); assert.ok(result.certificate.workUnits < 200000);
});
test('near-edge and near-corner locations are not snapped; aliases preserve the same physical route', () => {
  const near = router.route(p('px', 5 - 1e-12, 5 - 1e-12), p('nx', 5 - 1e-12, -5 + 1e-12));
  assert.equal(near.start.kind, 'face'); assert.equal(near.end.kind, 'face'); assert.ok(near.distanceMeters.lower > 0);
  const aliases = router.geometry.aliases(p('px', 5, 5)), target = p('ny', 2, -1);
  for (const alias of aliases) assert.deepEqual(router.route(alias, target), router.route(aliases[0]!, target));
});
test('invalid configuration, foreign identities, coordinates, budgets and impossible precision fail closed', () => {
  for (const bad of [p('px', NaN), p('px', 6), { ...p('px'), worldId: 'foreign' }, { ...p('px'), surfaceId: 'interior' }, { ...p('px'), patchId: 'wrong' }]) assert.throws(() => router.route(bad, p('nx')), RangeError);
  for (const options of [{ maxCandidates: 0 }, { maxWorkUnits: Infinity }, { maxReturnedRoutes: 253 }, { maxIntervalWidthMeters: 0 }]) assert.throws(() => router.route(p('px'), p('nx'), options), RangeError);
  for (const options of [{ maxCandidates: 1 }, { maxWorkUnits: 1 }, { maxReturnedRoutes: 1 }]) assert.throws(() => router.route(p('px'), p('nx'), options), (e: unknown) => e instanceof CubeRouteCertificationError && e.code === 'work');
  assert.throws(() => router.route(p('px', 5, 5), p('nx', 5, -5), { maxIntervalWidthMeters: 1e-20 }), (e: unknown) => e instanceof CubeRouteCertificationError && e.code === 'precision');
  for (const sideLengthMeters of [0, NaN, Infinity, 1e200]) assert.throws(() => createSolidCubeRouter({ ...configuration, sideLengthMeters }), RangeError);
  for (const options of [null, [], false]) assert.throws(() => router.route(p('px'), p('nx'), options as unknown as Parameters<typeof router.route>[2]), RangeError);
});
for (const n of [128, 256]) test(`N${n}: existing sample addresses feed physical routes without touching canonical words, revisions or versions`, () => {
  const terrain = createSolidCubeTerrain({ terrainId: `terrain-${n}`, geometry: configuration, cellsPerEdge: n });
  terrain.write(terrain.keyAt(0), -0); terrain.write(terrain.keyAt(1), 123.25);
  const before = terrain.copyElevations(), revision = terrain.revision, metadata = terrain.metadata;
  const a = terrain.resolve({ ...identity, patchId: 'px', column: n / 2, row: n / 2 }), b = terrain.resolve({ ...identity, patchId: 'nx', column: n / 2, row: n / 2 });
  const result = router.route(terrain.positionAt(terrain.owner(a)), terrain.positionAt(terrain.owner(b))); squared(result, 400n);
  assert.equal(terrain.sampleCount, 6 * n * n + 2); assert.deepEqual(terrain.copyElevations(), before); assert.equal(terrain.revision, revision);
  assert.equal(terrain.metadata, metadata); assert.equal(terrain.metadata.representation.version, 1); assert.equal(terrain.metadata.geometry.version, 1);
  assert.throws(() => terrain.owner({ ...a, worldId: 'foreign' }), RangeError);
});
