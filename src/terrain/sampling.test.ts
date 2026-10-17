import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBlankTerrain } from './model.ts';
import { setElevation } from './modifications.ts';
import { gridToWorld, sampleElevation, viewportToWorld, worldToGrid } from './sampling.ts';

test('planar coordinates include all four edges without spherical wrapping', () => {
  const terrain = createBlankTerrain({ id: 'coordinates', columns: 5, rows: 3, width: 40, height: 20 });
  for (const point of [
    { column: 0, row: 0 }, { column: 4, row: 0 },
    { column: 0, row: 2 }, { column: 4, row: 2 }, { column: 2, row: 1 },
  ]) assert.deepEqual(worldToGrid(terrain, gridToWorld(terrain, point)), point);
  assert.deepEqual(gridToWorld(terrain, { column: 4, row: 2 }), { x: 40, y: 20 });
});

test('nearest-sample lookup reads the actual elevation buffer in row-major order', () => {
  const terrain = createBlankTerrain({ id: 'sampling', columns: 5, rows: 3, width: 40, height: 20 });
  setElevation(terrain, { column: 2, row: 1 }, 75);
  assert.equal(sampleElevation(terrain, { x: 21, y: 11 }), 75);
  assert.equal(sampleElevation(terrain, { x: 0, y: 0 }), -100);
});

test('different canvas sizes map to the same location without changing grid data', () => {
  const terrain = createBlankTerrain({ id: 'viewport' });
  const before = terrain.elevations.slice();
  const desktop = viewportToWorld(terrain, { x: 600, y: 200 }, { width: 1200, height: 800 });
  const mobile = viewportToWorld(terrain, { x: 150, y: 150 }, { width: 300, height: 600 });
  assert.deepEqual(desktop, mobile);
  assert.deepEqual(worldToGrid(terrain, desktop), { column: 256, row: 128 });
  assert.deepEqual(terrain.elevations, before);
  assert.deepEqual(terrain.metadata.resolution, { columns: 512, rows: 512 });
});

test('invalid coordinates and viewport sizes fail at the boundary', () => {
  const terrain = createBlankTerrain({ id: 'bounds' });
  for (const point of [{ x: -0.01, y: 0 }, { x: 1.01, y: 0 }, { x: NaN, y: 0 }]) {
    assert.throws(() => worldToGrid(terrain, point), RangeError);
  }
  assert.throws(() => gridToWorld(terrain, { column: 0.5, row: 0 }), RangeError);
  assert.throws(() => viewportToWorld(terrain, { x: 0, y: 0 }, { width: 0, height: 10 }), RangeError);
});
