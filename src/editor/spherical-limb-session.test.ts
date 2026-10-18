import test from 'node:test';
import assert from 'node:assert/strict';
import { createSphericalTerrain, type SphericalTerrain } from '../terrain/spherical.ts';
import { startSphericalBrushStroke, type SphericalBrushSettings } from '../terrain/spherical-brush.ts';
import { prepareSphericalSession } from './prepare-spherical-session.ts';
import { CUBE_FACES, dot3, type Vec3 } from '../surfaces/cube-sphere.ts';
import { greatCircleArc, unitArcAngle } from '../surfaces/great-circle.ts';

const identity = { worldId: 'moving-visibility', surfaceId: 'sphere' }, radiusMeters = 1000000;
const make = (n = 24) => createSphericalTerrain({ terrainId: 'limb', identity, radiusMeters, cellsPerEdge: n });
const bits = (t: SphericalTerrain) => new Uint32Array(t.copyElevations().buffer);
const p = (a: number): Vec3 => [Math.cos(a), Math.sin(a), 0];
for (const tool of ['raise', 'lower', 'smooth', 'flatten'] as const) test(`${tool}: moving visibility survives delayed processing, exact history and all chart transitions without fixed-hemisphere freezing`, async () => {
  const t = make(), reference = make(), brush: SphericalBrushSettings = { tool, radiusMeters: 180000, strengthMeters: 400, intensity: .7, targetElevation: 2300 };
  for (const k of t.samples()) { const v = Math.sin(k.index * 3.4) * 800; t.write(k, v); reference.write(k, v); }
  const original = bits(t), { editor } = await prepareSphericalSession(t, 'Moving domain', false);
  const theta = Math.asin(.98), first = p(theta), start = startSphericalBrushStroke(reference, { ...identity, direction: first }, brush, undefined, { hemisphere: p(0) });
  editor.begin(first, brush, p(0));
  // Queue a complete circuit before pumping, mutating every caller-owned vector afterward.
  for (let i = 1; i <= 420; i++) {
    const a = i * .015, direction = p(theta + a) as [number, number, number], from = p(a - .015) as [number, number, number], to = p(a) as [number, number, number];
    const visibility = { hemisphere: from, endHemisphere: to };
    editor.move(direction, visibility); start.moveTo({ ...identity, direction }, visibility);
    direction.fill(0); from.fill(0); to.fill(0);
  }
  start.end(); editor.release(); let frames = 0;
  while (editor.pump(.05)) assert.ok(++frames < 4000);
  assert.deepEqual(bits(t), bits(reference)); assert.equal(editor.history.length, 1); assert.ok(frames > 1);
  assert.ok([...t.samples()].some((k) => dot3(t.directionAt(k), [1, 0, 0]) < -.1 && bits(t)[k.index] !== original[k.index]), 'newly exposed geography is editable');
  const edited = bits(t); editor.undo(); assert.deepEqual(bits(t), original); editor.redo(); assert.deepEqual(bits(t), edited);
});

test('per-dab visibility and radius/4 spacing match independently enumerated fixed-domain stamps, including residuals and newly exposed samples', () => {
  const target = make(32), reference = make(32), theta = Math.asin(.99), alpha = .18, brush = { tool: 'raise' as const, radiusMeters: alpha * radiusMeters, strengthMeters: 600 };
  const stroke = startSphericalBrushStroke(target, { ...identity, direction: p(theta) }, brush, undefined, { hemisphere: p(0) });
  const stamp = (center: Vec3, hemisphere: Vec3) => { const dab = startSphericalBrushStroke(reference, { ...identity, direction: center }, brush, undefined, { hemisphere }); dab.end(); };
  stamp(p(theta), p(0)); let previous = p(theta), previousH = p(0), residual = alpha / 4, dabs = 1;
  for (let i = 1; i <= 180; i++) {
    const a = i * .017, next = p(theta + a), h = p(a), physical = greatCircleArc(previous, next), visibility = greatCircleArc(previousH, h), length = unitArcAngle(previous, next);
    // Separate residual integrator; each reference operation is one fixed-domain dab.
    while (residual <= length + 1e-14) { stamp(physical.at(Math.min(1, residual / length)), visibility.at(Math.min(1, residual / length))); residual += alpha / 4; dabs++; }
    residual -= length; stroke.moveTo({ ...identity, direction: next }, { hemisphere: previousH, endHemisphere: h }); previous = next; previousH = h;
  }
  stroke.end(); assert.equal(stroke.statistics.dabs, dabs); assert.deepEqual(bits(target), bits(reference));
});

test('complete globe circuits visit every chart without duplicating authority and cancellation retains one exact applied operation', async () => {
  const t = make(), { editor } = await prepareSphericalSession(t, 'Cancel', false), original = bits(t), theta = Math.asin(.98), charts = new Set<string>();
  editor.begin(p(theta), { tool: 'raise', radiusMeters: 80000, strengthMeters: 200 }, p(0));
  for (let i = 1; i <= 600; i++) {
    const a = i * .02, d: Vec3 = [Math.cos(theta + a) * Math.cos(a / 2), Math.sin(theta + a) * Math.cos(a / 2), Math.sin(a / 2)];
    charts.add(t.geometry.positionsForDirection(d)[0]!.patchId); editor.move(d, { hemisphere: d });
  }
  editor.pump(.001); editor.cancel(); const applied = bits(t); assert.ok(CUBE_FACES.every((f) => charts.has(f))); assert.equal(editor.pendingPoints, 0); assert.equal(editor.history.length, 1);
  editor.undo(); assert.deepEqual(bits(t), original); editor.redo(); assert.deepEqual(bits(t), applied);
  assert.equal(t.sampleCount, 6 * 24 ** 2 + 2);
});
