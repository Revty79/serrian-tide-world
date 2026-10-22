import assert from 'node:assert/strict';
import test from 'node:test';
import type { SurfacePosition } from '../surfaces/contracts.ts';
import { createCylindricalTerrain, type CylindricalTerrain } from './cylindrical.ts';
import { prepareCylindricalDab, cylinderFalloffEnclosure, type CylindricalBrushSettings } from './cylindrical-brush.ts';
import { cylinderBrushCandidates } from './cylindrical-candidates.ts';
import { cylindricalSmoothEstimate } from './cylindrical-smoothing.ts';
import { FLOAT32_MAX } from './brush-math.ts';

const identity = { worldId: 'dab-world', surfaceId: 'exterior' };
const make = (angularSamples = 7, axialCells = 3, radialCells = 3, lengthMeters = 1.6) => createCylindricalTerrain({ terrainId: 't', geometry: { identity, provider: 'physical-closed-cylinder', version: 1, configuration: 'solid-capped', role: 'exterior', radiusMeters: 1, lengthMeters }, resolution: { angularSamples, axialCells, radialCells } });
const p = (patchId: 'side' | 'cap-start' | 'cap-end', u: number, v: number): SurfacePosition => ({ ...identity, patchId, u, v });
const raise = (radiusMeters = .713): CylindricalBrushSettings => ({ version: 1, tool: 'raise', radiusMeters, strengthMeters: 100 });
function apply(t: CylindricalTerrain, point: SurfacePosition, settings: CylindricalBrushSettings, pump = 7) {
  const j = prepareCylindricalDab(t, point, settings); let count = 0;
  while (j.status === 'preparing') { assert.ok(++count < 65538); j.pump(pump); }
  j.commit(); return j;
}
function seed(t: CylindricalTerrain) { for (const k of t.samples()) t.write(k, ((k.index * 13) % 17 - 8) * 20); }

for (const [A, Z, P] of [[4, 2, 2], [7, 3, 2]]) test(`candidate completeness for every canonical center, wraps and rims A=${A}`, () => {
  const t = make(A, Z, P);
  for (const centerKey of t.samples()) for (const radius of [.317, 1.137, 3.713]) {
    const center = t.positionAt(t.owner(centerKey)), plan = cylinderBrushCandidates(t, center, radius);
    const candidates = [...plan.samples()].map((v) => v.key.index), set = new Set(candidates);
    assert.equal(set.size, candidates.length); assert.deepEqual(candidates, [...candidates].sort((a, b) => a - b));
    for (const key of t.samples()) {
      const position = t.positionAt(t.owner(key)), distance = t.geometry.globalDistance(center, position);
      if (distance.upperBoundMeters < radius) assert.ok(set.has(key.index), `${centerKey.index} -> ${key.index} @ ${radius}`);
      if (set.has(key.index) && distance.upperBoundMeters < radius) assert.ok(plan.chordLowerBound(position) < radius);
    }
  }
});

test('all chart addresses and shared aliases give the same numerical dab; angular wrap has no cut', () => {
  const t = make(7, 3, 2);
  for (const key of t.samples()) {
    const aliases = t.aliases(key);
    if (aliases.length === 1) continue;
    const outputs = aliases.map((address) => {
      const other = make(7, 3, 2); seed(other); apply(other, other.positionAt(address), raise(.713)); return other.copyElevations();
    });
    for (const output of outputs) assert.deepEqual(output, outputs[0]);
  }
  const outputs = [-4, 0, 3].map((turns) => { const t = make(); seed(t); apply(t, p('side', turns * 2 * Math.PI, .27), raise(.713)); return t.copyElevations(); });
  assert.deepEqual(outputs[0], outputs[1]); assert.deepEqual(outputs[1], outputs[2]);
});

test('brush crosses both rims in both directions and large footprints reach all connected regions', () => {
  for (const center of [p('side', .13, .06), p('side', -.21, 1.54), p('cap-start', .2, .97), p('cap-end', -.17, .97)]) {
    const t = make(), before = t.snapshot(), job = apply(t, center, raise(.713));
    const regions = new Set<string>();
    for (const k of t.samples()) if (!Object.is(t.read(k), before.elevations[k.index])) regions.add(t.owner(k).patchId);
    assert.ok(regions.has('side')); assert.ok(regions.has(center.patchId === 'cap-end' || center.patchId === 'side' && center.v > 1 ? 'cap-end' : 'cap-start'));
    assert.equal(t.revision - before.revision, job.statistics.writes);
  }
  const t = make(), j = apply(t, p('side', .17, .8), raise(4.713));
  assert.equal(j.statistics.writes, t.sampleCount);
});

test('global cap shortcuts influence side geography; interior 3D chords never paint the opposite center', () => {
  const t = make(4, 2, 2, 2), target = t.resolve({ ...identity, patchId: 'side', column: 2, row: 0 });
  const center = p('side', 0, .05), position = t.positionAt(t.owner(target));
  assert.ok(t.geometry.sameRegionDistance(center, position).value > 2.137);
  apply(t, center, raise(2.137)); assert.notEqual(t.read(target), -100);
  const q = make(7, 3, 3, .5), opposite = q.resolve({ ...identity, patchId: 'cap-end', column: 0, row: 0 });
  apply(q, p('cap-start', 1, 0), raise(.913)); assert.equal(q.read(opposite), -100);
  assert.ok(q.geometry.globalDistance(p('cap-start', 0, 0), q.positionAt(q.owner(opposite))).lowerBoundMeters > .913);
});

test('a certified zero-influence exact boundary preserves its samples while the interior dab commits', () => {
  const t = make(4, 2, 2, 2); seed(t); const before = t.snapshot(), j = prepareCylindricalDab(t, p('side', 0, 1), raise(1));
  while(j.status==='preparing')j.pump(1);assert.equal(j.commit(),1);const center=t.resolve({...identity,patchId:'side',column:0,row:1});
  for(const key of t.samples())assert.ok(Object.is(t.read(key),key.index===center.index?Math.fround(before.elevations[key.index]!+100):before.elevations[key.index]));assert.equal(j.statistics.preparedBytes,0);assert.ok(j.statistics.maxFalloffError<=1e-6);
});
test('a genuinely unresolved subprecision influence still fails before any commit',()=>{
 const t=make(4,2,2,2);seed(t);const before=t.snapshot(),job=prepareCylindricalDab(t,p('side',1e-13,1),raise(1e-12));assert.throws(()=>{while(job.status==='preparing')job.pump(1);job.commit();},/precision|tolerance/);assert.equal(job.status,'failed');assert.deepEqual(t.copyElevations(),before.elevations);assert.equal(t.revision,before.revision);
});

test('cancellation, source conflicts, failed distance and memory/work limits preserve atomicity', () => {
  for (const limits of [{ maxCandidates: 1 }, { distanceQueryMaxBoxes: 1 }, { maxPreparedBytes: 1 }, { maxDistanceQueries: 1 }, { maxDistanceBoxes: 1 }]) {
    const t = make(); seed(t); const before = t.snapshot(), j = prepareCylindricalDab(t, p('side', .13, .09), raise(1.37), limits);
    assert.throws(() => { while (j.status === 'preparing') j.pump(3); j.commit(); });
    assert.equal(j.status, 'failed'); assert.equal(j.statistics.preparedBytes, 0); assert.deepEqual(t.copyElevations(), before.elevations); assert.equal(t.revision, before.revision);
  }
  for (const prepareFully of [false, true]) {
    const t = make(); seed(t); const before = t.snapshot(), j = prepareCylindricalDab(t, p('side', .13, .09), raise(1.37));
    if (prepareFully) while (j.status === 'preparing') j.pump(7); else j.pump(3);
    j.cancel(); assert.equal(j.status, 'cancelled'); assert.equal(j.statistics.preparedBytes, 0); assert.throws(() => j.commit()); assert.deepEqual(t.copyElevations(), before.elevations); assert.equal(t.revision, before.revision);
  }
  for (const ready of [false, true]) {
    const t = make(), j = prepareCylindricalDab(t, p('side', .13, .09), raise(1.37));
    if (ready) while (j.status === 'preparing') j.pump(7); else j.pump(1);
    t.write(t.keyAt(0), 123); const external = t.snapshot();
    assert.throws(() => ready ? j.commit() : j.pump()); assert.deepEqual(t.copyElevations(), external.elevations); assert.equal(t.revision, external.revision);
  }
});

test('nonfinite source and calculation failures discard preparation', () => {
  const t = make(); seed(t); const before = t.snapshot();
  const bad = { ...t, read: () => NaN };
  const j = prepareCylindricalDab(bad, p('cap-start', 0, 0), raise(.713));
  assert.throws(() => { while (j.status === 'preparing') j.pump(); j.commit(); });
  assert.deepEqual(t.copyElevations(), before.elevations); assert.equal(t.revision, before.revision);
});

test('Smooth conductances are reciprocal, areas tile the surface, and center valence is physical', () => {
  const t = make(9, 5, 4); let area = 0;
  for (const k of t.samples()) {
    const stencil = cylindricalSmoothEstimate(t, k, t.read(k)); area += stencil.areaOverRadiusSquared;
    assert.equal(stencil.delta, 0);
    const d = t.owner(k); assert.equal(stencil.neighbors, d.patchId !== 'side' && d.row === 0 ? 9 : 4);
    for (let i = 0; i < stencil.keys.length; i++) {
      const other = cylindricalSmoothEstimate(t, stencil.keys[i]!, t.read(stencil.keys[i]!)), reverse = other.keys.findIndex((q) => q.index === k.index);
      assert.ok(reverse >= 0); assert.ok(Math.abs(stencil.conductances[i]! - other.conductances[reverse]!) < 1e-12);
    }
  }
  assert.ok(Math.abs(area - (2 * Math.PI * 1.6 + 2 * Math.PI)) < 1e-12);
});

test('Smooth preserves constants/signs and repeated applications obey the maximum principle', () => {
  for (const value of [-0, 0, -100, 1024]) {
    const t = make(); for (const k of t.samples()) t.write(k, value); const before = t.snapshot();
    apply(t, p('side', .17, .8), { version: 1, tool: 'smooth', radiusMeters: 4.713, intensity: 1 });
    assert.deepEqual(t.copyElevations(), before.elevations); assert.equal(t.revision, before.revision);
  }
  const t = make(); seed(t); let min = -160, max = 160;
  for (let pass = 0; pass < 8; pass++) {
    apply(t, p('side', .17, .8), { version: 1, tool: 'smooth', radiusMeters: 4.713, intensity: 1 });
    const values = t.copyElevations(), nextMin = Math.min(...values), nextMax = Math.max(...values);
    assert.ok(nextMin >= min && nextMax <= max); min = nextMin; max = nextMax;
  }
});

test('source-epoch smoothing is independent of cooperative chunk size', () => {
  const outputs = [1, 3, 512].map((budget) => { const t = make(); seed(t); apply(t, p('side', .13, .09), { version: 1, tool: 'smooth', radiusMeters: 1.37, intensity: .8 }, budget); return t.copyElevations(); });
  assert.deepEqual(outputs[0], outputs[1]); assert.deepEqual(outputs[1], outputs[2]);
});

test('zero intensity, saturation, explicit high/low targets and signed zero have defined behavior', () => {
  for (const tool of ['smooth', 'flatten'] as const) {
    const t = make(); t.write(t.keyAt(0), -0); const before = t.snapshot();
    const j = apply(t, p('side', 0, .7), { version: 1, tool, radiusMeters: 1.37, intensity: 0, ...(tool === 'flatten' ? { targetElevation: 0 } : {}) } as CylindricalBrushSettings);
    assert.equal(j.statistics.distanceQueries, 0); assert.deepEqual(t.copyElevations(), before.elevations); assert.equal(t.revision, before.revision);
  }
  for (const targetElevation of [-FLOAT32_MAX, FLOAT32_MAX, -300, 0, -0]) {
    const t = make(), key = t.resolve({ ...identity, patchId: 'cap-start', column: 0, row: 0 });
    apply(t, p('cap-start', 0, 0), { version: 1, tool: 'flatten', radiusMeters: .001, intensity: 1, targetElevation });
    assert.ok(Object.is(t.read(key), Math.fround(targetElevation)));
  }
  for (const tool of ['raise', 'lower'] as const) {
    const t = make(), key = t.resolve({ ...identity, patchId: 'cap-start', column: 0, row: 0 }); t.write(key, tool === 'raise' ? FLOAT32_MAX : -FLOAT32_MAX);
    apply(t, p('cap-start', 0, 0), { version: 1, tool, radiusMeters: .001, strengthMeters: FLOAT32_MAX });
    assert.equal(t.read(key), tool === 'raise' ? FLOAT32_MAX : -FLOAT32_MAX);
  }
});

test('settings, identities, preparation state and error intervals validate explicitly', () => {
  const t = make(), before = t.snapshot(), center = p('side', .1, .7);
  for (const patch of [{ version: 2 }, { tool: 'unknown' }, { radiusMeters: 0 }, { radiusMeters: Infinity }, { strengthMeters: -1 }, { strengthMeters: 1e40 }, { maxFalloffError: 0 }, { maxFalloffError: NaN }]) assert.throws(() => prepareCylindricalDab(t, center, { ...raise(), ...patch } as CylindricalBrushSettings));
  for (const intensity of [-1, 2, NaN]) assert.throws(() => prepareCylindricalDab(t, center, { version: 1, tool: 'smooth', radiusMeters: 1, intensity }));
  assert.throws(() => prepareCylindricalDab(t, center, { version: 1, tool: 'flatten', radiusMeters: 1, intensity: 0, targetElevation: Infinity }));
  for (const key of ['worldId', 'surfaceId']) assert.throws(() => prepareCylindricalDab(t, { ...center, [key]: 'foreign' }, raise()));
  assert.throws(() => prepareCylindricalDab(t, { ...center, patchId: 'interior' }, raise()));
  for (const limits of [{ maxCandidates: 65537 }, { distanceQueryMaxBoxes: 32769 }, { maxDistanceBoxes: Infinity }]) assert.throws(() => prepareCylindricalDab(t, center, raise(), limits));
  const j = prepareCylindricalDab(t, center, raise()); assert.throws(() => j.commit()); assert.throws(() => j.pump(0)); assert.throws(() => j.pump(513)); j.cancel();
  for (const values of [[-1, 2, 1], [1, 0, 1], [0, Infinity, 1], [0, 1, 0]]) assert.throws(() => cylinderFalloffEnclosure(values[0]!, values[1]!, values[2]!));
  assert.deepEqual(t.copyElevations(), before.elevations); assert.equal(t.revision, before.revision);
});

test('maximum-resolution center footprint is complete and sparse, with no duplicate center/rim authority', () => {
  const t = make(1024, 512, 256), radius = .0137, j = apply(t, p('cap-start', 2.7, 0), raise(radius), 64);
  const expected = 1 + 3 * 1024;
  assert.equal(j.statistics.writes, expected); assert.equal(t.revision, expected);
  assert.ok(j.statistics.candidates < t.sampleCount / 100); assert.equal(j.statistics.distanceQueries, expected);
  assert.ok(j.statistics.peakPreparedBytes < t.elevationByteLength / 100);
  for (let row = 0; row <= 4; row++) {
    const first = t.read(t.resolve({ ...identity, patchId: 'cap-start', row, column: 0 }));
    for (let column = 0; column < 1024; column++) assert.equal(t.read(t.resolve({ ...identity, patchId: 'cap-start', row, column })), first);
    if (row <= 3) assert.notEqual(first, -100); else assert.equal(first, -100);
  }
});

test('maximum-resolution safe stop leaves every source sample and revision unchanged', () => {
  const t = make(1024, 512, 256), j = prepareCylindricalDab(t, p('cap-start', 0, 0), raise(.0137), { maxDistanceQueries: 20 });
  assert.throws(() => { while (j.status === 'preparing') j.pump(64); j.commit(); }, /budget/);
  assert.equal(j.status, 'failed'); assert.equal(t.revision, 0); assert.ok(t.copyElevations().every((v) => v === -100)); assert.equal(j.statistics.preparedBytes, 0);
  assert.equal(j.statistics.distanceQueries, 20);
});

test('an oblique zero-influence radius boundary completes within the existing influence contract and preserves signed-zero ground',()=>{
 const terrain=createCylindricalTerrain({terrainId:'boundary-regression',geometry:{identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:1000,lengthMeters:1600},resolution:{angularSamples:128,axialCells:64,radialCells:32},initialElevation:0}),boundary=terrain.resolve({...identity,patchId:'side',column:0,row:32});terrain.write(boundary,-0);
 // The 42/56/70 unfolded-wall triangle previously exhausted sub-ULP distance
 // refinement even though its complete influence enclosure was effectively 0.
 const job=prepareCylindricalDab(terrain,{...identity,patchId:'side',u:.056,v:842},{version:1,tool:'raise',radiusMeters:70,strengthMeters:2});while(job.status==='preparing')job.pump(32);assert.equal(job.status,'ready');assert.ok(job.commit()>0);assert.equal(job.status,'committed');assert.ok(Object.is(terrain.read(boundary),-0));assert.ok(job.statistics.maxFalloffError<=1e-6);assert.ok(job.statistics.maxPreRoundElevationErrorMeters<2.0001e-6);
});
