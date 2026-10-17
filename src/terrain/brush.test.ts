import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brushRadiusLimits, FLOAT32_MAX, startBrushStroke, type BrushSettings } from './brush.ts';
import { createBlankTerrain, type Terrain } from './model.ts';
import type { Point } from './sampling.ts';
import { viewportToWorld } from './sampling.ts';
import { elevationToColor, WATER_SHALLOW } from '../rendering/elevation-colors.ts';

const settings: BrushSettings = { tool: 'raise', radius: 0.2, strength: 200 };
const makeTerrain = () => createBlankTerrain({ id: 'brush-test', columns: 101, rows: 101 });
const at = (terrain: Terrain, column: number, row = 50) => terrain.elevations[row * 101 + column]!;

function strokeAlong(points: Point[], brush = settings): Terrain {
  const terrain = makeTerrain();
  const stroke = startBrushStroke(terrain, points[0]!, brush);
  for (const point of points.slice(1)) stroke.moveTo(point);
  stroke.end();
  return terrain;
}

function assertEquivalent(first: Terrain, second: Terrain): void {
  let largestDifference = 0;
  for (let index = 0; index < first.elevations.length; index += 1) {
    largestDifference = Math.max(largestDifference, Math.abs(first.elevations[index]! - second.elevations[index]!));
  }
  assert.ok(largestDifference < 0.001, `Largest Float32 difference: ${largestDifference} meters`);
}

test('Raise changes the existing Float32 buffer, creates land, and can build high terrain', () => {
  const terrain = makeTerrain();
  const buffer = terrain.elevations;
  const metadata = terrain.metadata;
  startBrushStroke(terrain, { x: 0.5, y: 0.5 }, settings).end();
  assert.equal(at(terrain, 50), 100);
  assert.notDeepEqual(elevationToColor(at(terrain, 50), 0), WATER_SHALLOW);
  for (let count = 0; count < 5; count += 1) {
    startBrushStroke(terrain, { x: 0.5, y: 0.5 }, { ...settings, strength: 1000 }).end();
  }
  assert.equal(at(terrain, 50), 5100);
  assert.strictEqual(terrain.elevations, buffer);
  assert.strictEqual(terrain.metadata, metadata);
});

test('Lower crosses land through sea level and continues lowering the ocean floor', () => {
  const terrain = makeTerrain();
  const center = { x: 0.5, y: 0.5 };
  startBrushStroke(terrain, center, settings).end();
  startBrushStroke(terrain, center, { ...settings, tool: 'lower', strength: 100 }).end();
  assert.equal(at(terrain, 50), 0);
  assert.deepEqual(elevationToColor(at(terrain, 50), 0), WATER_SHALLOW);
  startBrushStroke(terrain, center, { ...settings, tool: 'lower' }).end();
  assert.equal(at(terrain, 50), -200);
  startBrushStroke(terrain, center, { ...settings, tool: 'lower' }).end();
  assert.equal(at(terrain, 50), -400);
});

test('the rounded falloff is strongest at the center and fades smoothly to an unchanged edge', () => {
  const terrain = strokeAlong([{ x: 0.5, y: 0.5 }]);
  assert.equal(at(terrain, 50), 100);
  assert.equal(at(terrain, 55), 68.75);
  assert.ok(Math.abs(at(terrain, 60)) < 0.0001);
  assert.equal(at(terrain, 65), -68.75);
  assert.equal(at(terrain, 70), -100);
  assert.equal(at(terrain, 71), -100);
  assert.equal(at(terrain, 45), at(terrain, 55));
});

test('radius changes the footprint, and strength scales elevation change', () => {
  const center = [{ x: 0.5, y: 0.5 }];
  const small = strokeAlong(center, { ...settings, radius: 0.1 });
  const large = strokeAlong(center);
  const strong = strokeAlong(center, { ...settings, strength: 400 });
  assert.ok(large.elevations.filter((value) => value !== -100).length > small.elevations.filter((value) => value !== -100).length);
  assert.equal(at(strong, 50) + 100, 2 * (at(large, 50) + 100));
});

test('one fast pointer segment creates a continuous raised path with no gaps', () => {
  const terrain = strokeAlong([{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }], { ...settings, radius: 0.05 });
  for (let column = 10; column <= 90; column += 1) assert.ok(at(terrain, column) > 0, `Gap at ${column}`);
});

test('equivalent sparse and dense straight paths produce the same terrain within Float32 tolerance', () => {
  const sparse = strokeAlong([{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }]);
  const dense = strokeAlong(Array.from({ length: 81 }, (_, index) => ({ x: 0.1 + index / 100, y: 0.5 })));
  assertEquivalent(sparse, dense);
});

test('stamp phase carries through corners and uneven event subdivisions', () => {
  const sparse = strokeAlong([{ x: 0.1, y: 0.1 }, { x: 0.7, y: 0.1 }, { x: 0.7, y: 0.9 }]);
  const dense = strokeAlong([
    ...Array.from({ length: 31 }, (_, index) => ({ x: 0.1 + index * 0.02, y: 0.1 })),
    ...Array.from({ length: 41 }, (_, index) => ({ x: 0.7, y: 0.1 + index * 0.02 })),
  ]);
  assertEquivalent(sparse, dense);
});

test('duplicate events, a stationary hold, and release do not add elevation', () => {
  const terrain = makeTerrain();
  const stroke = startBrushStroke(terrain, { x: 0.5, y: 0.5 }, settings);
  const afterDab = terrain.elevations.slice();
  for (let count = 0; count < 100; count += 1) assert.equal(stroke.moveTo({ x: 0.5, y: 0.5 }), false);
  stroke.end();
  stroke.end();
  assert.equal(stroke.moveTo({ x: 0.8, y: 0.5 }), false);
  assert.deepEqual(terrain.elevations, afterDab);
});

test('a stroke snapshots settings until release', () => {
  const terrain = makeTerrain();
  const changing = { ...settings };
  const stroke = startBrushStroke(terrain, { x: 0.2, y: 0.5 }, changing);
  changing.tool = 'lower';
  changing.strength = 1000;
  changing.radius = 0.3;
  stroke.moveTo({ x: 0.8, y: 0.5 });
  assertEquivalent(terrain, strokeAlong([{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }]));
});

test('corner and edge strokes clip to grid bounds without wrapping or non-finite values', () => {
  const terrain = strokeAlong([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]);
  assert.ok(terrain.elevations.every(Number.isFinite));
  assert.ok(terrain.elevations[0]! > -100);
  assert.ok(terrain.elevations[100]! > -100);
  assert.equal(terrain.elevations[100 * 101], -100);
});

test('invalid settings fail before any mutation', () => {
  const terrain = makeTerrain();
  const before = terrain.elevations.slice();
  const limits = brushRadiusLimits(terrain);
  const invalid = [
    { tool: 'flatten' }, { radius: 0 }, { radius: -1 }, { radius: NaN },
    { radius: Infinity }, { radius: limits.min / 2 }, { radius: limits.max + 1 },
    { strength: 0 }, { strength: -1 }, { strength: NaN }, { strength: Infinity }, { strength: 1e40 }, { strength: 1e-50 },
  ];
  for (const value of invalid) {
    assert.throws(() => startBrushStroke(terrain, { x: 0.5, y: 0.5 }, { ...settings, ...value } as BrushSettings), RangeError);
    assert.deepEqual(terrain.elevations, before);
  }
});

test('invalid coordinates fail before a dab or movement changes samples', () => {
  const terrain = makeTerrain();
  assert.throws(() => startBrushStroke(terrain, { x: NaN, y: 0.5 }, settings), RangeError);
  assert.ok(terrain.elevations.every((value) => value === -100));
  const stroke = startBrushStroke(terrain, { x: 0.5, y: 0.5 }, settings);
  const before = terrain.elevations.slice();
  for (const point of [{ x: -1, y: 0 }, { x: 0, y: Infinity }, { x: 2, y: 0 }]) {
    assert.throws(() => stroke.moveTo(point), RangeError);
    assert.deepEqual(terrain.elevations, before);
  }
});

test('corrupt input elevations or an inconsistent grid are rejected without additional writes', () => {
  for (const corruptValue of [NaN, Infinity, -Infinity]) {
    const terrain = makeTerrain();
    terrain.elevations[0] = corruptValue;
    const before = terrain.elevations.slice();
    assert.throws(() => startBrushStroke(terrain, { x: 0.5, y: 0.5 }, settings), RangeError);
    assert.deepEqual(terrain.elevations, before);
  }
  const terrain = makeTerrain();
  assert.throws(() => startBrushStroke({ ...terrain, elevations: new Float32Array(1) }, { x: 0.5, y: 0.5 }, settings), RangeError);
});

test('an invalid value introduced during a stroke prevents that dab from partially writing', () => {
  const terrain = makeTerrain();
  const stroke = startBrushStroke(terrain, { x: 0.5, y: 0.5 }, settings);
  terrain.elevations[50 * 101 + 70] = NaN;
  const before = terrain.elevations.slice();
  assert.throws(() => stroke.moveTo({ x: 0.6, y: 0.5 }), RangeError);
  assert.deepEqual(terrain.elevations, before);
});

test('extreme valid edits saturate at finite Float32 limits instead of overflowing', () => {
  for (const tool of ['raise', 'lower'] as const) {
    const terrain = createBlankTerrain({ id: 'limit', columns: 101, rows: 101, initialElevation: tool === 'raise' ? FLOAT32_MAX : -FLOAT32_MAX });
    startBrushStroke(terrain, { x: 0.5, y: 0.5 }, { ...settings, tool, strength: FLOAT32_MAX }).end();
    assert.ok(terrain.elevations.every(Number.isFinite));
    assert.equal(at(terrain, 50), tool === 'raise' ? FLOAT32_MAX : -FLOAT32_MAX);
  }
});

test('equivalent desktop and mobile canvas paths use identical map-unit brush settings', () => {
  const terrain = makeTerrain();
  const desktop = [{ x: 240, y: 400 }, { x: 960, y: 400 }].map((point) => viewportToWorld(terrain, point, { width: 1200, height: 800 }));
  const mobile = [{ x: 60, y: 300 }, { x: 240, y: 300 }].map((point) => viewportToWorld(terrain, point, { width: 300, height: 600 }));
  assertEquivalent(strokeAlong(desktop), strokeAlong(mobile));
});
