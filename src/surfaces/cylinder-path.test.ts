import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCylinderGeometry, type CylinderRegion } from './cylinder.ts';
import { cylinderGlobalDistance, CylinderDistanceUnsupportedError } from './cylinder-distance.ts';
import { reconstructCylinderPath, type CylinderPhysicalPath } from './cylinder-path.ts';
import { pathAngle, pathNorm } from './cylinder-path-math.ts';
import { createCylindricalTerrain } from '../terrain/cylindrical.ts';

const identity = { worldId: 'path-world', surfaceId: 'outside' };
const config = (R = 1, L = 2) => ({ identity, provider: 'physical-closed-cylinder' as const, version: 1 as const, configuration: 'solid-capped' as const, role: 'exterior' as const, radiusMeters: R, lengthMeters: L });
const make = (R = 1, L = 2) => createCylinderGeometry(config(R, L));
const point = (patchId: CylinderRegion, theta: number, v: number) => ({ ...identity, patchId, u: patchId === 'cap-end' ? -theta : theta, v });
const separation = (a: readonly number[], b: readonly number[]) => Math.hypot(...a.map((v, i) => v - b[i]!));
function verify(g: ReturnType<typeof make>, path: CylinderPhysicalPath) {
  const error = path.positionErrorBoundMeters, eps = 2e-14 * Math.max(g.metadata.radiusMeters, g.metadata.lengthMeters);
  assert.ok(path.shortestExcessUpperBoundMeters <= path.requestedToleranceMeters);
  assert.ok(path.lengthUpperBoundMeters >= path.distance.lowerBoundMeters); assert.ok(path.pieces.length <= 3);
  assert.ok(separation(g.referencePosition(path.start), path.atDistance(0).referencePosition) <= error + eps);
  assert.ok(separation(g.referencePosition(path.end), path.atDistance(path.lengthMeters).referencePosition) <= error + eps);
  let measured = 0, boundary = 0;
  for (const piece of path.pieces) {
    assert.equal(piece.fromMeters, boundary); assert.ok(piece.toMeters > piece.fromMeters); boundary = piece.toMeters;
    const a = g.referencePosition(piece.start), b = g.referencePosition(piece.end);
    const independent = piece.kind === 'disk-chord' ? separation(a, b) : Math.hypot(g.metadata.radiusMeters * piece.angleDelta, piece.end.v - piece.start.v);
    measured += independent;
    for (const t of [0, .01, .25, .5, .75, .99, 1]) {
      const d = t === 1 ? piece.toMeters : piece.fromMeters + t * piece.lengthMeters, value = path.atDistance(d, t === 1 ? 'incoming' : 'outgoing');
      const xyz = value.referencePosition;
      const expected = piece.kind === 'disk-chord' ? a.map((v, i) => (1 - t) * v + t * b[i]!) : (() => { const theta = piece.startAngle + t * piece.angleDelta; return [g.metadata.radiusMeters * Math.cos(theta), g.metadata.radiusMeters * Math.sin(theta), (1 - t) * piece.start.v + t * piece.end.v]; })();
      assert.ok(separation(xyz, expected) <= 4 * error + eps, 'continuous physical interpolation');
      assert.ok(xyz.every(Number.isFinite)); assert.ok(value.tangent); assert.ok(Math.abs(Math.hypot(...value.tangent!) - 1) < 1e-12);
    }
    if (piece.toMeters < path.lengthMeters) {
      const incoming = path.atDistance(piece.toMeters, 'incoming'), outgoing = path.atDistance(piece.toMeters, 'outgoing');
      assert.ok(separation(incoming.referencePosition, outgoing.referencePosition) <= 2 * error + eps, 'rim has no physical jump');
      assert.notEqual(incoming.oneSidedPatchId, outgoing.oneSidedPatchId);
      const step = Math.min(piece.lengthMeters, path.lengthMeters - piece.toMeters) * 1e-5;
      assert.ok(separation(path.atDistance(piece.toMeters - step).referencePosition, path.atDistance(piece.toMeters + step).referencePosition) <= 2 * step + 4 * error + eps);
    }
  }
  assert.ok(Math.abs(measured - path.lengthMeters) <= path.lengthErrorBoundMeters + eps);
  assert.equal(boundary, path.lengthMeters);
}
const refs = JSON.parse(readFileSync(new URL('./fixtures/cylinder-distance-reference.json', import.meta.url), 'utf8')) as { records: { name: string; length: string; region0: string; region1: string; coordinate0: string; coordinate1: string; angle: string; distance: string; route: string }[] };
for (const c of refs.records) test(`independent Decimal physical route: ${c.name}`, () => {
  const g = make(1, Number(c.length)), patch = (r: string): CylinderRegion => r === 'side' ? 'side' : r === 'start' ? 'cap-start' : 'cap-end';
  const a = point(patch(c.region0), 0, Number(c.coordinate0)), b = point(patch(c.region1), Number(c.angle), Number(c.coordinate1));
  const path = reconstructCylinderPath(g, a, b, { version: 1, absoluteToleranceMeters: Math.max(1e-9, 1e-10 * Number(c.length)) });
  assert.ok(Math.abs(path.lengthMeters - Number(c.distance)) <= path.requestedToleranceMeters); assert.equal(path.routeClass, c.route);
  verify(g, path); verify(g, reconstructCylinderPath(g, b, a, { version: 1 }));
});

test('same disk chord crosses the center without a polar tangent singularity or an interior-solid shortcut', () => {
  for (const region of ['cap-start', 'cap-end'] as const) {
    const g = make(2, 7), p = reconstructCylinderPath(g, point(region, 0, 1.6), point(region, Math.PI, 1.6), { version: 1 });
    assert.equal(p.routeClass, 'same-cap'); assert.ok(Math.abs(p.lengthMeters - 3.2) < 1e-14); verify(g, p);
    const middle = p.atDistance(p.lengthMeters / 2); assert.ok(Math.hypot(middle.referencePosition[0], middle.referencePosition[1]) < 1e-14); assert.ok(middle.position.v < 1e-14); assert.ok(middle.tangent);
  }
  const g = make(1, .2), p = reconstructCylinderPath(g, point('cap-start', 0, 0), point('cap-end', 2, 0), { version: 1 });
  assert.ok(Math.abs(p.lengthMeters - 2.2) < 1e-14); assert.equal(p.pieces.length, 3); verify(g, p);
});

test('exact and near angular cuts use deterministic lifts and optional physical incoming preference', () => {
  const g = make(1, 20), a = point('side', 0, 10);
  for (const delta of [Math.PI, Math.PI - 1e-8]) {
    const b = point('side', delta, 10), positive = reconstructCylinderPath(g, a, b, { version: 1 });
    const negative = reconstructCylinderPath(g, a, b, { version: 1, continuity: { patchId: 'side', direction: [0, -1, 0] } });
    assert.equal(positive.routeClass, 'side'); assert.ok(positive.atDistance(0).tangent![1] > 0); assert.ok(negative.atDistance(0).tangent![1] < 0);
    assert.equal(negative.uniqueness, 'not-certified'); assert.ok(negative.shortestExcessUpperBoundMeters <= negative.requestedToleranceMeters); assert.ok(negative.continuityAlignment! > .999999);
    assert.equal(JSON.stringify(reconstructCylinderPath(g, a, b, { version: 1 })), JSON.stringify(positive)); verify(g, negative);
  }
});

test('cap-choice ties and free opposite-center azimuth honor direction without inventing uniqueness', () => {
  const g = make(1, .2), a = point('side', 0, .1), b = point('side', Math.PI, .1);
  const p = reconstructCylinderPath(g, a, b, { version: 1, continuity: { patchId: 'side', direction: [0, 0, 1] } });
  const q = reconstructCylinderPath(g, a, b, { version: 1, continuity: { patchId: 'side', direction: [0, 0, -1] } });
  assert.equal(p.routeClass, 'via-end-cap'); assert.equal(q.routeClass, 'via-start-cap'); verify(g, p); verify(g, q);
  for (const reverse of [false, true]) {
    const first = point(reverse ? 'cap-end' : 'cap-start', 2, 0), second = point(reverse ? 'cap-start' : 'cap-end', -1, 0);
    const path = reconstructCylinderPath(g, first, second, { version: 1, continuity: { patchId: first.patchId, direction: [0, 1, 0] } });
    assert.ok(path.atDistance(0).tangent![1] > .999); assert.ok(Math.abs(path.lengthMeters - 2.2) < 1e-14); verify(g, path);
  }
});

test('both one-sided rim folds preserve incoming physical direction and expose the outgoing sheet', () => {
  const g = make();
  for (const [region, z, direction] of [['cap-start', 0, -1], ['cap-end', 2, 1]] as const) {
    const p = reconstructCylinderPath(g, point('side', 0, z), point(region, 0, .2), { version: 1, continuity: { patchId: 'side', direction: [0, 0, direction] } });
    assert.equal(p.atDistance(0).position.patchId, 'side'); assert.equal(p.atDistance(0).oneSidedPatchId, region); assert.ok(p.continuityAlignment! > .9999); verify(g, p);
    const q = reconstructCylinderPath(g, point(region, 0, 1), point('side', 0, 1), { version: 1, continuity: { patchId: region, direction: [1, 0, 0] } });
    assert.ok(q.continuityAlignment! > .9999); verify(g, q);
  }
});

test('all small odd canonical endpoints and rim/center aliases preserve terrain, identity and metadata', () => {
  const t = createCylindricalTerrain({ terrainId: 'untouched', geometry: config(), resolution: { angularSamples: 5, axialCells: 3, radialCells: 2 } });
  t.write(t.keyAt(3), -0); t.write(t.keyAt(9), 123); const before = t.snapshot(), metadata = JSON.stringify(t.metadata);
  for (const a of t.samples()) for (const b of t.samples()) {
    const p = reconstructCylinderPath(t.geometry, t.positionAt(t.owner(a)), t.positionAt(t.owner(b)), { version: 1 }); verify(t.geometry, p);
  }
  for (const k of t.samples()) for (const address of t.aliases(k)) {
    const a = t.positionAt(address), b = point('side', -.3, .7), p = reconstructCylinderPath(t.geometry, a, b, { version: 1 });
    const q = reconstructCylinderPath(t.geometry, t.positionAt(t.owner(k)), b, { version: 1 }); assert.ok(Math.abs(p.lengthMeters - q.lengthMeters) <= p.requestedToleranceMeters);
  }
  assert.deepEqual(t.copyElevations(), before.elevations); assert.equal(t.revision, before.revision); assert.equal(JSON.stringify(t.metadata), metadata);
});

for (const scale of [1e-100, 1e-8, 1, 1e8, 1e100]) test(`continuous path scaling and physical lengths ${scale}`, () => {
  const g = make(2 * scale, 7 * scale), p = reconstructCylinderPath(g, point('cap-start', 2, 0), point('cap-end', -1, .6 * scale), { version: 1 });
  assert.ok(Math.abs(p.lengthMeters / scale - 10.4) < 1e-12); verify(g, p);
});
for (const ratio of [1e-9, 1e-4, .1, 1, 1000, 1e9]) test(`continuous rim/cap paths on unequal dimensions L/R=${ratio}`, () => {
  const g = make(1, ratio), p = reconstructCylinderPath(g, point('cap-start', .2, .97), point('cap-end', -2.9, .82), { version: 1 }); verify(g, p);
});

test('deterministic random physical paths have connected pieces, length certificates and no projection dependence', () => {
  let seed = 71; const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 200; i++) {
    const R = 10 ** (-4 + 8 * rand()), L = R * 10 ** (-6 + 12 * rand()), g = make(R, L);
    const p = () => { const region = (['side', 'cap-start', 'cap-end'] as const)[Math.floor(3 * rand())]!; return point(region, (2 * rand() - 1) * Math.PI, rand() * (region === 'side' ? L : R)); };
    const a = p(), b = p(), path = reconstructCylinderPath(g, a, b, { version: 1 }); verify(g, path);
    const reverse = reconstructCylinderPath(g, b, a, { version: 1 }); assert.ok(Math.abs(path.lengthMeters - reverse.lengthMeters) <= 2 * path.requestedToleranceMeters);
  }
});

test('opt-in feasible parameters preserve every original B1 result and solver count', () => {
  const g = make(), a = point('side', .2, .7), b = point('cap-start', 2.4, .8), original = g.globalDistance(a, b);
  const { feasibleRoutes, ...rest } = g.globalDistance(a, b, { includeFeasibleRoutes: true });
  assert.deepEqual(rest, original); assert.ok(feasibleRoutes!.every(r=>r.version===1&&Object.isFrozen(r.angles))); assert.equal(original.feasibleRoutes, undefined);
  assert.throws(() => cylinderGlobalDistance(g, a, b, { includeFeasibleRoutes: 1 as unknown as boolean }));
});

test('zero movement, bounds, precision/work/range, identities and continuity validation fail explicitly', () => {
  const g = make(), a = point('cap-start', 2, 0), b = point('cap-end', 2.4, .8);
  const z = reconstructCylinderPath(g, a, a, { version: 1, absoluteToleranceMeters: Number.MIN_VALUE }); assert.equal(z.lengthMeters, 0); assert.equal(z.pieces.length, 0); assert.equal(z.atDistance(0).tangent, null); assert.ok(z.atDistance(0).atEnd);
  const p = reconstructCylinderPath(g, a, b, { version: 1 });
  for (const d of [-1, Infinity, NaN, p.lengthMeters + 1]) assert.throws(() => p.atDistance(d));
  assert.throws(() => p.atDistance(0, 'bad' as 'incoming'));
  for (const options of [{ version: 2 }, { version: 1, absoluteToleranceMeters: 0 }, { version: 1, absoluteToleranceMeters: 1e-30 }, { version: 1, maxBoxes: 1 }]) assert.throws(() => reconstructCylinderPath(g, point('cap-start', 0, .7), b, options as { version: 1 }));
  for (const bad of [{ ...a, worldId: 'foreign' }, { ...a, surfaceId: 'foreign' }, { ...a, patchId: 'interior' }, { ...a, v: 3 }, { ...a, u: NaN }]) assert.throws(() => reconstructCylinderPath(g, bad, b, { version: 1 }));
  for (const continuity of [{ patchId: 'side', direction: [1, 0, 0] }, { patchId: 'cap-start', direction: [0, 0, 0] }, { patchId: 'cap-start', direction: [0, 0, 1] }, { patchId: 'cap-start', direction: [NaN, 0, 0] }]) assert.throws(() => reconstructCylinderPath(g, a, b, { version: 1, continuity: continuity as unknown as { patchId: CylinderRegion; direction: readonly [number, number, number] } }));
  assert.throws(() => reconstructCylinderPath(make(1e307, 1.77e308), a, point('cap-end', 0, 0), { version: 1 }), CylinderDistanceUnsupportedError);
  assert.throws(() => pathNorm(Infinity), CylinderDistanceUnsupportedError);
  for (const L of [1e-30, 1e30]) assert.throws(() => reconstructCylinderPath(make(1, L), a, point('cap-end', 0, 0), { version: 1 }), /cumulative-distance/);
  const original = Math.atan2; try { Math.atan2 = () => 0; assert.throws(() => pathAngle(0, 1), CylinderDistanceUnsupportedError); } finally { Math.atan2 = original; }
});
