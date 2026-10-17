import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FLOAT32_MAX, startBrushStroke, type BrushSettings } from './brush.ts';
import { createBlankTerrain, type Terrain } from './model.ts';
import { resetTerrainToOcean, setElevation } from './modifications.ts';
import { inspectElevation } from './sampling.ts';

const create = (base = 0) => createBlankTerrain({ id: 'refinement', columns: 101, rows: 101, initialElevation: base });
const center = { x: 0.5, y: 0.5 };
const smooth: BrushSettings = { tool: 'smooth', radius: 0.2, intensity: 1 };
const valueAt = (terrain: Terrain, column = 50, row = 50) => terrain.elevations[row * 101 + column]!;
const dab = (terrain: Terrain, settings: BrushSettings, point = center) => startBrushStroke(terrain, point, settings).end();

test('Smooth reduces a peak toward neighboring elevations, with predictable intensity', () => {
  const strong = create();
  const gentle = create();
  setElevation(strong, { column: 50, row: 50 }, 900);
  setElevation(gentle, { column: 50, row: 50 }, 900);
  dab(strong, smooth);
  dab(gentle, { ...smooth, intensity: 0.25 });
  assert.equal(valueAt(strong), 100);
  assert.equal(valueAt(gentle), 700);
  assert.ok(valueAt(strong, 51) > 0);
  assert.notEqual(valueAt(strong), valueAt(strong, 51));
});

test('Smooth uses a pre-dab source snapshot and introduces no directional scanning bias', () => {
  const terrain = create();
  setElevation(terrain, { column: 50, row: 50 }, 900);
  dab(terrain, smooth);
  for (let offset = 1; offset <= 20; offset += 1) {
    assert.equal(valueAt(terrain, 50 - offset), valueAt(terrain, 50 + offset));
    assert.equal(valueAt(terrain, 50, 50 - offset), valueAt(terrain, 50, 50 + offset));
    assert.equal(valueAt(terrain, 50 + offset), valueAt(terrain, 50, 50 + offset));
  }
});

test('repeated Smooth passes progressively reduce sharp local differences', () => {
  const terrain = create();
  setElevation(terrain, { column: 50, row: 50 }, 900);
  const contrast = () => valueAt(terrain) - valueAt(terrain, 51);
  const original = contrast();
  dab(terrain, { ...smooth, intensity: 0.5 });
  const first = contrast();
  dab(terrain, { ...smooth, intensity: 0.5 });
  assert.ok(contrast() < first && first < original);
});

test('Smooth works above and below sea level and preserves uniform terrain', () => {
  for (const base of [-500, 100]) {
    const terrain = create(base);
    const before = terrain.elevations.slice();
    dab(terrain, smooth);
    assert.deepEqual(terrain.elevations, before);
    setElevation(terrain, { column: 50, row: 50 }, base + 900);
    dab(terrain, smooth);
    assert.equal(valueAt(terrain), base + 100);
  }
});

test('Smooth clips neighborhoods at corners and never wraps to the opposite edge', () => {
  const terrain = create();
  setElevation(terrain, { column: 0, row: 0 }, 900);
  dab(terrain, smooth, { x: 0, y: 0 });
  assert.equal(valueAt(terrain, 0, 0), 225);
  assert.equal(valueAt(terrain, 100, 0), 0);
  assert.equal(valueAt(terrain, 0, 100), 0);
  assert.ok(terrain.elevations.every(Number.isFinite));
});

for (const targetElevation of [500, 0, -300]) {
  test(`Flatten can reach a ${targetElevation} m target without overshooting`, () => {
    const terrain = create(-100);
    dab(terrain, { tool: 'flatten', radius: 0.2, intensity: 1, targetElevation });
    assert.equal(valueAt(terrain), targetElevation);
    assert.ok(terrain.elevations.every((value) => value >= Math.min(-100, targetElevation) && value <= Math.max(-100, targetElevation)));
  });
}

test('Flatten intensity and smooth edge falloff blend toward the chosen height', () => {
  const terrain = create(-100);
  dab(terrain, { tool: 'flatten', radius: 0.2, intensity: 0.25, targetElevation: 500 });
  assert.equal(valueAt(terrain), 50);
  assert.ok(Math.abs(valueAt(terrain, 60) - -25) < 0.0001);
  assert.equal(valueAt(terrain, 70), -100);
  assert.equal(valueAt(terrain, 71), -100);
});

test('both refinement tools preserve every sample outside their influence', () => {
  for (const brush of [smooth, { tool: 'flatten', radius: 0.2, intensity: 0.6, targetElevation: 500 } as const]) {
    const terrain = create();
    for (let index = 0; index < terrain.elevations.length; index += 1) terrain.elevations[index] = index % 97;
    const before = terrain.elevations.slice();
    dab(terrain, brush);
    for (let row = 0; row <= 100; row += 1) {
      for (let column = 0; column <= 100; column += 1) {
        if (Math.hypot(column / 100 - 0.5, row / 100 - 0.5) >= 0.2) {
          assert.equal(valueAt(terrain, column, row), before[row * 101 + column]);
        }
      }
    }
  }
});

for (const tool of ['smooth', 'flatten'] as const) {
  test(`${tool} strokes are consistent with equivalent sparse and dense input paths`, () => {
    const results: Terrain[] = [];
    for (const subdivisions of [1, 80]) {
      const terrain = create();
      for (let index = 0; index < terrain.elevations.length; index += 1) terrain.elevations[index] = (index * 17) % 1000 - 500;
      const brush: BrushSettings = tool === 'smooth'
        ? { tool, radius: 0.12, intensity: 0.6 }
        : { tool, radius: 0.12, intensity: 0.6, targetElevation: 200 };
      const stroke = startBrushStroke(terrain, { x: 0.1, y: 0.5 }, brush);
      for (let step = 1; step <= subdivisions; step += 1) stroke.moveTo({ x: 0.1 + step / subdivisions * 0.8, y: 0.5 });
      stroke.end();
      results.push(terrain);
    }
    let maxDifference = 0;
    results[0]!.elevations.forEach((value, index) => { maxDifference = Math.max(maxDifference, Math.abs(value - results[1]!.elevations[index]!)); });
    assert.ok(maxDifference < 0.001, `Maximum difference: ${maxDifference} m`);
  });
}

test('refinement rejects invalid intensity, invalid targets, and corrupt source data before writing', () => {
  const terrain = create();
  const invalid = [
    { ...smooth, intensity: NaN }, { ...smooth, intensity: -0.1 }, { ...smooth, intensity: 1.01 },
    { tool: 'flatten', radius: 0.2, intensity: 0.5, targetElevation: Infinity },
    { tool: 'flatten', radius: 0.2, intensity: 0.5, targetElevation: 1e40 },
  ] as BrushSettings[];
  const before = terrain.elevations.slice();
  for (const brush of invalid) {
    assert.throws(() => dab(terrain, brush), RangeError);
    assert.deepEqual(terrain.elevations, before);
  }
  terrain.elevations[0] = NaN;
  const corrupt = terrain.elevations.slice();
  assert.throws(() => dab(terrain, smooth), RangeError);
  assert.deepEqual(terrain.elevations, corrupt);
});

test('Smooth validates its read halo before writing any of a later dab', () => {
  const terrain = create();
  const stroke = startBrushStroke(terrain, center, smooth);
  terrain.elevations[50 * 101 + 76] = NaN;
  const before = terrain.elevations.slice();
  assert.throws(() => stroke.moveTo({ x: 0.55, y: 0.5 }), RangeError);
  assert.deepEqual(terrain.elevations, before);
});

test('refinement remains finite at Float32 extremes and zero intensity is a no-op', () => {
  for (const tool of ['smooth', 'flatten'] as const) {
    const terrain = create();
    for (let index = 0; index < terrain.elevations.length; index += 1) terrain.elevations[index] = index % 2 ? FLOAT32_MAX : -FLOAT32_MAX;
    const brush: BrushSettings = tool === 'smooth' ? { tool, radius: 0.2, intensity: 1 } : { tool, radius: 0.2, intensity: 1, targetElevation: FLOAT32_MAX };
    dab(terrain, brush);
    assert.ok(terrain.elevations.every(Number.isFinite));
    const before = terrain.elevations.slice();
    dab(terrain, { ...brush, intensity: 0 });
    assert.deepEqual(terrain.elevations, before);
  }
});

test('Reset restores all 262,144 samples while retaining terrain, metadata, and buffer identity', () => {
  const terrain = createBlankTerrain({ id: 'reset-identity' });
  const buffer = terrain.elevations;
  const metadata = terrain.metadata;
  terrain.elevations.fill(900);
  terrain.elevations[0] = NaN;
  resetTerrainToOcean(terrain);
  assert.strictEqual(terrain.elevations, buffer);
  assert.strictEqual(terrain.metadata, metadata);
  assert.ok(terrain.elevations.every((value) => value === -100));
  assert.equal(terrain.metadata.id, 'reset-identity');
  assert.throws(() => resetTerrainToOcean({ ...terrain, elevations: new Float32Array(1) }), RangeError);
});

test('elevation inspection samples the numerical grid and distinguishes above, at, and below sea level', () => {
  const terrain = createBlankTerrain({ id: 'readout', columns: 101, rows: 101, seaLevel: 10 });
  for (const [elevation, relation] of [[9, 'below'], [10, 'at'], [11, 'above']] as const) {
    setElevation(terrain, { column: 25, row: 75 }, elevation);
    assert.deepEqual(inspectElevation(terrain, { x: 0.251, y: 0.749 }), {
      position: { x: 0.251, y: 0.749 }, elevation, seaLevelRelation: relation,
    });
  }
  assert.throws(() => inspectElevation(terrain, { x: 2, y: 0 }), RangeError);
  terrain.elevations[75 * 101 + 25] = NaN;
  assert.throws(() => inspectElevation(terrain, { x: 0.25, y: 0.75 }), RangeError);
});
