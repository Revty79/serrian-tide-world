import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createCylinderGeometry, type CylinderConfiguration, type CylinderRegion } from './cylinder.ts';
import { cylinderGlobalDistance, CylinderDistanceUnsupportedError, type CylinderDistanceResult } from './cylinder-distance.ts';
import { createCylindricalTerrain } from '../terrain/cylindrical.ts';
import type { SurfacePosition } from './contracts.ts';

const identity = { worldId: 'distance-world', surfaceId: 'exterior' };
const configuration = (radius = 1, length = 2): CylinderConfiguration => ({ identity, provider: 'physical-closed-cylinder', version: 1, configuration: 'solid-capped', role: 'exterior', radiusMeters: radius, lengthMeters: length });
const point = (patchId: CylinderRegion, theta: number, coordinate: number): SurfacePosition => ({ ...identity, patchId, u: patchId === 'cap-end' ? -theta : theta, v: coordinate });
const encloses = (r: CylinderDistanceResult, exact: number) => {
  assert.ok(r.lowerBoundMeters >= 0); assert.ok(r.upperBoundMeters >= r.lowerBoundMeters);
  assert.ok(r.lowerBoundMeters <= exact && exact <= r.upperBoundMeters, `${r.lowerBoundMeters} <= ${exact} <= ${r.upperBoundMeters}`);
  assert.equal(r.value, r.upperBoundMeters);
  assert.equal(r.absoluteErrorBoundMeters, r.upperBoundMeters - r.lowerBoundMeters);
  assert.ok(r.absoluteErrorBoundMeters <= r.requestedToleranceMeters);
  assert.equal(r.scope, 'global-reference-surface'); assert.equal(r.units, 'meters');
  assert.ok(r.evaluatedBoxes <= 32768); assert.ok(r.peakQueuedBoxes <= 16384);
};
interface Reference { name: string; length: string; region0: string; coordinate0: string; region1: string; coordinate1: string; angle: string; distance: string; route: string }
const references = JSON.parse(readFileSync(new URL('./fixtures/cylinder-distance-reference.json', import.meta.url), 'utf8')) as { records: Reference[] };
const region = (r: string): CylinderRegion => r === 'side' ? 'side' : r === 'start' ? 'cap-start' : 'cap-end';

for (const ref of references.records) test(`global cylinder independent 65-digit stationary reference: ${ref.name}`, () => {
  const g = createCylinderGeometry(configuration(1, Number(ref.length))), tolerance = Math.max(1e-10, 1e-11 * Number(ref.length));
  const r = g.globalDistance(point(region(ref.region0), 0, Number(ref.coordinate0)), point(region(ref.region1), Number(ref.angle), Number(ref.coordinate1)), { absoluteToleranceMeters: tolerance });
  encloses(r, Number(ref.distance)); assert.equal(r.bestRoute, ref.route);
});

test('global cylinder independent analytic side, disk, radial, center and opposite-cap cases', () => {
  const g = createCylinderGeometry(configuration(3, 8));
  for (const [a, b, expected] of [
    [point('side', .3, 2), point('side', .3, 6), 4],
    [point('cap-start', 0, 3), point('cap-start', Math.PI, 3), 6],
    [point('cap-end', 0, 2), point('cap-end', Math.PI / 2, 2), Math.sqrt(8)],
    [point('cap-start', .4, 1), point('cap-start', .4, 3), 2],
    [point('side', .7, 2), point('cap-start', -2.1, 0), 5],
    [point('cap-start', 2, 0), point('cap-end', -1, 0), 14],
    [point('cap-start', -2, 0), point('cap-end', .7, 2), 12],
    [point('cap-start', 1, 2), point('cap-end', 1, 1), 11],
  ] as const) encloses(g.globalDistance(a, b, { absoluteToleranceMeters: 1e-8 }), expected);
});

test('global cylinder side-only distance is beaten by a real cap shortcut', () => {
  const g = createCylinderGeometry(configuration(1, 5)), a = point('side', 0, .02), b = point('side', Math.PI, .03), r = g.globalDistance(a, b);
  encloses(r, 2.05); assert.equal(r.bestRoute, 'via-start-cap');
  assert.ok(r.value < g.sameRegionDistance(a, b).value - 1);
  const ca = g.referencePosition(a), cb = g.referencePosition(b), chord = Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]);
  assert.ok(r.lowerBoundMeters > chord + .04);
});

test('global cylinder every sampled rim alias, all wrap directions and both query directions are equivalent', () => {
  const t = createCylindricalTerrain({ terrainId: 'aliases', geometry: configuration(), resolution: { angularSamples: 7, axialCells: 5, radialCells: 4 } });
  const targets = [point('side', .83, .61), point('cap-start', -2.4, .3), point('cap-end', 1.7, .84)];
  for (const row of [0, 5]) for (let column = 0; column < 7; column++) {
    const d = { ...identity, patchId: 'side' as const, row, column }, p = t.positionAt(d), alias = t.positionAt(t.crossRim(d).address);
    for (const target of targets) {
      const x = t.geometry.globalDistance(p, target), y = t.geometry.globalDistance(alias, target), reverse = t.geometry.globalDistance(target, p);
      assert.equal(x.value, y.value); assert.equal(x.lowerBoundMeters, y.lowerBoundMeters);
      assert.ok(Math.abs(x.value - reverse.value) <= x.requestedToleranceMeters);
      for (const turns of [-2, 3]) {
        const wrapped = t.geometry.globalDistance({ ...p, u: p.u + turns * 2 * Math.PI }, target);
        assert.ok(Math.abs(wrapped.value - x.value) <= x.requestedToleranceMeters);
      }
    }
    encloses(t.geometry.globalDistance(p, alias), 0);
  }
});

test('global cylinder exact physical identity has zero distance, including all center descriptions', () => {
  const g = createCylinderGeometry(configuration());
  for (const p of [point('side', 1, .3), point('cap-start', 2, 0), point('cap-end', -1, 0), point('cap-start', 1, .3)]) {
    const r = g.globalDistance(p, p, { absoluteToleranceMeters: Number.MIN_VALUE });
    assert.equal(r.value, 0); assert.equal(r.lowerBoundMeters, 0); assert.equal(r.absoluteErrorBoundMeters, 0);
  }
  for (const cap of ['cap-start', 'cap-end'] as const) for (const theta of [-100, -Math.PI, 0, 2.3, 100]) encloses(g.globalDistance(point(cap, theta, 0), point(cap, 0, 0)), 0);
});

test('global cylinder tied and nearly tied routes retain conservative candidate classes', () => {
  const g = createCylinderGeometry(configuration(1, .2)), a = point('side', 0, .1), b = point('side', Math.PI, .1), r = g.globalDistance(a, b, { absoluteToleranceMeters: 1e-9 });
  encloses(r, 2.2); assert.ok(r.possibleRouteClasses.includes('via-start-cap')); assert.ok(r.possibleRouteClasses.includes('via-end-cap'));
  const perturbed = g.globalDistance(a, { ...b, v: b.v + 1e-11 }, { absoluteToleranceMeters: 1e-9 });
  assert.ok(Math.abs(r.value - perturbed.value) <= r.requestedToleranceMeters + 1e-11);
});

for (const scale of [1e-100, 1e-8, 1, 1e8, 1e100]) test(`global cylinder scaled physical units and precision ${scale}`, () => {
  const g = createCylinderGeometry(configuration(scale, 8 * scale));
  encloses(g.globalDistance(point('cap-start', 0, 0), point('cap-end', 2, .3 * scale), { absoluteToleranceMeters: scale * 1e-8 }), 9.7 * scale);
  const ref = references.records.find((c) => c.name === 'side-cap-interior')!;
  const q = createCylinderGeometry(configuration(scale, 2 * scale));
  encloses(q.globalDistance(point('side', 0, .7 * scale), point('cap-start', 2.2, .8 * scale), { absoluteToleranceMeters: scale * 1e-8 }), Number(ref.distance) * scale);
});

for (const length of [1e-9, 1e-4, .1, 1, 100, 1e9]) test(`global cylinder extreme radius/length ratio L/R=${length}`, () => {
  const g = createCylinderGeometry(configuration(1, length)), r = g.globalDistance(point('cap-start', -2, 0), point('cap-end', 1, .3));
  encloses(r, length + 1.7);
  const a = point('cap-start', 0, .97), b = point('cap-end', -2.9, .82), d = g.globalDistance(a, b), reverse = g.globalDistance(b, a);
  assert.ok(Math.abs(d.value - reverse.value) <= d.requestedToleranceMeters);
  assert.ok(d.lowerBoundMeters >= length - d.requestedToleranceMeters);
});

test('global cylinder deterministic random symmetry and triangle inequalities respect interval errors', () => {
  let seed = 93; const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const g = createCylinderGeometry(configuration());
  const position = () => { const r = Math.floor(random() * 3); return point(r === 0 ? 'side' : r === 1 ? 'cap-start' : 'cap-end', (random() * 2 - 1) * Math.PI, random() * (r === 0 ? 2 : 1)); };
  for (let j = 0; j < 100; j++) {
    const a = position(), b = position(), c = position(), ab = g.globalDistance(a, b), ba = g.globalDistance(b, a), bc = g.globalDistance(b, c), ac = g.globalDistance(a, c);
    assert.ok(ab.value >= 0 && ac.value >= 0);
    assert.ok(Math.abs(ab.value - ba.value) <= ab.requestedToleranceMeters + ba.requestedToleranceMeters);
    assert.ok(ac.lowerBoundMeters <= ab.upperBoundMeters + bc.upperBoundMeters);
    assert.ok(ac.value <= ab.value + bc.value + ac.absoluteErrorBoundMeters);
  }
});

test('global cylinder independent direct rim-grid references converge from above, without claiming exact mesh distance', () => {
  const g = createCylinderGeometry(configuration(1, .15)), delta = 3.05, r = g.globalDistance(point('cap-start', 0, .93), point('cap-end', delta, .88), { absoluteToleranceMeters: 1e-9 });
  let previous = Infinity;
  for (const n of [16, 32, 64, 128, 256]) {
    let best = Infinity;
    // Independent original Cartesian cap chords and unrolled side, no production bound helpers.
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) {
      const x = delta * i / n, y = delta * j / n;
      const first = Math.hypot(Math.cos(x) - .93, Math.sin(x));
      const last = Math.hypot(Math.cos(y) - .88, Math.sin(y));
      best = Math.min(best, first + Math.hypot(.15, delta - x - y) + last);
    }
    assert.ok(best + 1e-14 >= r.lowerBoundMeters); assert.ok(best <= previous + 1e-14);
    assert.ok(best - r.lowerBoundMeters <= 4 * Math.PI / n + r.absoluteErrorBoundMeters); previous = best;
  }
});

test('global cylinder queries preserve authority, revision, metadata, source identity, normal and rim fold', () => {
  const t = createCylindricalTerrain({ terrainId: 'unchanged', geometry: configuration(), resolution: { angularSamples: 7, axialCells: 5, radialCells: 4 } });
  t.write(t.keyAt(3), -0); t.write(t.keyAt(9), 123.75);
  const before = t.snapshot(), metadata = JSON.stringify(t.metadata), n = t.geometry.normal(point('side', 1, 2)), fold = t.geometry.crossRim(point('side', 1, 2));
  for (const k of t.samples()) t.geometry.globalDistance(t.positionAt(t.owner(k)), point('cap-end', 2, .6));
  assert.deepEqual(t.copyElevations(), before.elevations); assert.equal(t.revision, before.revision); assert.equal(JSON.stringify(t.metadata), metadata);
  assert.deepEqual(t.geometry.normal(point('side', 1, 2)), n); assert.deepEqual(t.geometry.crossRim(point('side', 1, 2)), fold);
});

test('global cylinder unsupported precision/work/range and invalid inputs fail explicitly without partial success', () => {
  const g = createCylinderGeometry(configuration()), a = point('cap-start', 0, .7), b = point('cap-end', 2.4, .8);
  assert.throws(() => g.globalDistance(a, b, { absoluteToleranceMeters: 1e-20 }), (e) => e instanceof CylinderDistanceUnsupportedError && e.code === 'precision');
  assert.throws(() => g.globalDistance(a, b, { absoluteToleranceMeters: 1e-9, maxBoxes: 1 }), (e) => e instanceof CylinderDistanceUnsupportedError && e.code === 'work-budget');
  for (const absoluteToleranceMeters of [0, -1, NaN, Infinity]) assert.throws(() => g.globalDistance(a, b, { absoluteToleranceMeters }));
  for (const maxBoxes of [0, -1, .5, 32769, NaN, Infinity]) assert.throws(() => g.globalDistance(a, b, { maxBoxes }));
  for (const p of [{ ...a, worldId: 'foreign' }, { ...a, surfaceId: 'foreign' }, { ...a, patchId: 'open' }, { ...a, v: -1 }, { ...a, u: NaN }]) assert.throws(() => g.globalDistance(p, b));
  for (const patch of [{ radiusMeters: 0 }, { lengthMeters: -1 }, { provider: 'other' }, { version: 2 }, { configuration: 'open' }, { role: 'interior' }]) assert.throws(() => cylinderGlobalDistance({ ...g, metadata: { ...g.metadata, ...patch } as CylinderConfiguration }, a, b));
  const huge = createCylinderGeometry(configuration(1e307, 1.77e308));
  assert.throws(() => huge.globalDistance(point('cap-start', 0, 0), point('cap-end', 0, 0)), (e) => e instanceof CylinderDistanceUnsupportedError && e.code === 'range');
});

test('global cylinder rejects an elementary square root that violates its checked residual contract', () => {
  const g = createCylinderGeometry(configuration()), original = Math.sqrt;
  try {
    Math.sqrt = (value: number) => original(value) * 1.001;
    assert.throws(() => g.globalDistance(point('cap-start', 0, .7), point('cap-end', 2.4, .8)), (e) => e instanceof CylinderDistanceUnsupportedError && e.code === 'precision');
  } finally { Math.sqrt = original; }
});
