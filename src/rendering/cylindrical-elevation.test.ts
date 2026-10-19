import assert from 'node:assert/strict';
import test from 'node:test';
import { createCylinderPreviewTerrain } from '../editor/cylinder-preview-session.ts';
import { CylinderDisplayCache, cylinderInterpolatedColor, cylinderPackedColor } from './cylindrical-raster.ts';
import { cylinderDisplayIndex, cylinderElevationField, cylinderElevationColor, cylinderRelief, cylinderSamplingIntervals } from './cylindrical-elevation.ts';
import { elevationToColor } from './elevation-colors.ts';
import type { CylinderRayHit } from './cylindrical-view.ts';
import { createCylindricalTerrain } from '../terrain/cylindrical.ts';

const near = (a: number, b: number, e = 1e-8) => assert.ok(Math.abs(a - b) <= e, `${a} / ${b}`);
const hit = (region: CylinderRayHit['region'], theta: number, radial: number, z: number): CylinderRayHit => ({ region, theta, radial, z, depth: 0 });

test('elevation reconstruction reproduces every canonical side, cap, center and rim sample without changing words at N64/128/256', () => {
  for (const n of [64, 128, 256]) {
    const t = createCylinderPreviewTerrain(n);
    for (const k of t.samples()) t.write(k, (k.index % 193 - 97) * 43.25);
    const original = new Uint32Array(t.copyElevations().buffer), values = t.copyElevations();
    for (const k of t.samples()) {
      const q = t.positionAt(t.owner(k)), xyz = t.geometry.referencePosition(q);
      const field = cylinderElevationField(values, t, hit(q.patchId, Math.atan2(xyz[1], xyz[0]), Math.hypot(xyz[0], xyz[1]) / 1e6, (xyz[2] - 8e5) / 1e6));
      near(field.height, t.read(k), 1e-7);
      assert.ok(Number.isFinite(field.dx) && Number.isFinite(field.dy));
    }
    assert.deepEqual(new Uint32Array(t.copyElevations().buffer), original);
  }
});

test('sea classification follows interpolated signed elevation, rather than interpolated palette classes', () => {
  const t = createCylinderPreviewTerrain(64), values = t.copyElevations(), a = 64;
  for (const row of [16, 17]) { values[row * a + 63] = -3000; values[row * a] = -1000; values[row * a + 1] = 1000; values[row * a + 2] = 3000; }
  const h = hit('side', Math.PI / a * .5, 1, 0), field = cylinderElevationField(values, t, h);
  near(field.height, -500); assert.deepEqual(cylinderElevationColor(field.height, 0), elevationToColor(-500, 0));
  const colors = Uint32Array.from(values, v => cylinderPackedColor(v, 0));
  assert.notEqual(cylinderInterpolatedColor(colors, t, h), cylinderPackedColor(field.height, 0));
  assert.deepEqual(cylinderElevationColor(0, 0), elevationToColor(0, 0));
  assert.deepEqual(cylinderElevationColor(-100, 0), elevationToColor(-100, 0));
  assert.deepEqual(cylinderElevationColor(100, 0), elevationToColor(100, 0));
});

test('interpolated heights match on both shared rims and angular cut; cap centers are single-valued', () => {
  const t = createCylinderPreviewTerrain(128), values = t.copyElevations();
  values.forEach((_, i) => { values[i] = Math.sin(i * .3) * 1300; });
  const read = (h: CylinderRayHit) => cylinderElevationField(values, t, h).height;
  for (let i = 0; i < 180; i++) {
    const theta = i * .077;
    near(read(hit('side', theta, 1, -.8)), read(hit('cap-start', theta, 1, -.8)));
    near(read(hit('side', theta, 1, .8)), read(hit('cap-end', theta, 1, .8)));
    near(read(hit('side', theta, 1, .13)), read(hit('side', theta + 2 * Math.PI, 1, .13)), 1e-7);
    for (const region of ['cap-start', 'cap-end'] as const) near(read(hit(region, theta, 0, 0)), values[cylinderDisplayIndex(t, region, 0, 0)]!);
  }
});

test('physical gradients use world meters, with finite Cartesian cap-center lighting and neutral flat terrain', () => {
  const t = createCylinderPreviewTerrain(64), values = t.copyElevations();
  for (let row = 0; row <= 32; row++) for (let col = 0; col < 64; col++) values[row * 64 + col] = col * 100 + row * 80;
  const f = cylinderElevationField(values, t, hit('side', .8, 1, .13));
  near(f.dx, 100 / (2 * Math.PI * 1e6 / 64)); near(f.dy, 80 / (1.6e6 / 32));
  assert.equal(cylinderRelief(0, 0), 1); assert.notEqual(cylinderRelief(f.dx, f.dy), 1);
  for (const region of ['cap-start', 'cap-end'] as const) {
    for (let c = 0; c < 64; c++) values[cylinderDisplayIndex(t, region, 1, c)] = 500 * Math.cos(c * 2 * Math.PI / 64);
    for (let i = 0; i < 20; i++) { const center = cylinderElevationField(values, t, hit(region, i * .2, 0, 0)); near(center.dx, 500 / 62500); near(center.dy, 0); }
  }
});

test('display snapshots are bounded coherent read-only epochs and retain exact unusual Float32 words', () => {
  const t = createCylinderPreviewTerrain(64), c = new CylinderDisplayCache(t);
  const data = new Float32Array(Uint32Array.from([0x80000000, 1, 0x7f7fffff, 0xff7fffff]).buffer);
  data.forEach((v, i) => t.write(t.keyAt(i), v)); for (const _ of c.prepare()) void _;
  const before = new Uint32Array(t.copyElevations().buffer), copy = c.elevationSnapshot();
  assert.deepEqual(new Uint32Array(copy.buffer), before); copy.fill(123); assert.deepEqual(new Uint32Array(t.copyElevations().buffer), before);
  t.write(t.keyAt(0), 1); assert.throws(() => c.elevationSnapshot(), /epoch/); c.refresh([0]); assert.equal(c.elevationSnapshot()[0], 1);
  assert.equal(c.byteLength, t.sampleCount * 4); c.dispose(); assert.equal(c.byteLength, 0);
});

test('physical sampling intervals quantify side anisotropy and collapsing polar ring spacing without increasing samples', () => {
  for (const n of [64, 128, 256]) { const s = cylinderSamplingIntervals(1e6, 1.6e6, n); near(s.sideAngularMeters * n, 2 * Math.PI * 1e6); near(s.sideAxialMeters * n / 2, 1.6e6); near(s.capRadialMeters * n / 4, 1e6); assert.equal(s.samples, n * (n - 1) + 2); near(s.capFirstRingAngularMeters, s.capRimAngularMeters / (n / 4)); }
});

test('shape-preserving reconstruction stays within adjacent actual heights and has continuous values and lighting across cells', () => {
  const t = createCylinderPreviewTerrain(64), values = t.copyElevations();
  values.forEach((_, i) => { values[i] = Math.sin(i * 1.37) * 2700; });
  for (const region of ['side', 'cap-start', 'cap-end'] as const) for (let i = 0; i < 400; i++) {
    const c = i * 17 % 64, r = i * 7 % (region === 'side' ? 32 : 16), x = (i * .371) % 1, y = (i * .217) % 1;
    const theta = (c + x) / 64 * 2 * Math.PI * (region === 'cap-end' ? -1 : 1);
    const f = cylinderElevationField(values, t, hit(region, theta, (r + y) / 16, (r + y) / 32 * 1.6 - .8));
    const bounds = [0, 1].flatMap(dr => [0, 1].map(dc => values[cylinderDisplayIndex(t, region, r + dr, c + dc)]!));
    assert.ok(f.height >= Math.min(...bounds) - 1e-7 && f.height <= Math.max(...bounds) + 1e-7);
    const at = (u: number) => cylinderElevationField(values, t, hit(region, u, .37, .13));
    const cut = c / 64 * 2 * Math.PI, before = at(cut - 1e-10), after = at(cut + 1e-10);
    near(before.height, after.height, .001); near(before.dx, after.dx, 1e-6); near(before.dy, after.dy, 1e-6);
  }
});

test('physical relief gradients scale with independently changed radius and axial length', () => {
  const base = createCylinderPreviewTerrain(64);
  const larger = createCylindricalTerrain({ terrainId: 'scaled-display', geometry: { ...base.metadata.geometry, radiusMeters: 2e6, lengthMeters: 8e6 }, resolution: base.metadata.representation.resolution });
  const values = larger.copyElevations();
  for (let row = 0; row <= 32; row++) for (let col = 0; col < 64; col++) values[row * 64 + col] = col * 100 + row * 80;
  const f = cylinderElevationField(values, larger, hit('side', .8, 1, .13));
  near(f.dx, 100 / (2 * Math.PI * 2e6 / 64)); near(f.dy, 80 / (8e6 / 32));
});
