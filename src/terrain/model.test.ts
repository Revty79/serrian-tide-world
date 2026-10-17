import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBlankTerrain } from './model.ts';
import { setElevation } from './modifications.ts';

test('the initial world is a versioned, entirely underwater 512 × 512 Float32 grid', () => {
  const terrain = createBlankTerrain({ id: 'initial-world' });
  assert.ok(terrain.elevations instanceof Float32Array);
  assert.equal(terrain.elevations.length, 512 * 512);
  assert.equal(terrain.elevations.byteLength, 1_048_576);
  assert.ok(terrain.elevations.every((value) => value === -100 && value < terrain.metadata.seaLevel));
  assert.deepEqual(terrain.metadata, {
    dataVersion: 1,
    id: 'initial-world',
    surface: 'planar',
    dimensions: { width: 1, height: 1, units: 'map-units' },
    resolution: { columns: 512, rows: 512 },
    elevationUnits: 'meters',
    seaLevel: 0,
  });
});

test('map extent, grid resolution, and separate terrain instances are independent', () => {
  const first = createBlankTerrain({ id: 'first', width: 30, height: 10, columns: 5, rows: 3 });
  const second = createBlankTerrain({ id: 'second' });
  setElevation(first, { column: 4, row: 2 }, 100);
  assert.equal(first.elevations.length, 15);
  assert.equal(first.elevations[14], 100);
  assert.ok(second.elevations.every((value) => value === -100));
  assert.ok(Object.isFrozen(first.metadata.dimensions));
  assert.ok(Object.isFrozen(first.metadata.resolution));
});

test('invalid grid, extent, metadata, and non-finite elevations are rejected', () => {
  for (const options of [
    { id: '' }, { id: 'bad', columns: 1 }, { id: 'bad', rows: 3.5 },
    { id: 'bad', width: 0 }, { id: 'bad', height: Infinity },
    { id: 'bad', seaLevel: NaN }, { id: 'bad', initialElevation: Infinity },
    { id: 'bad', initialElevation: 1e40 },
  ]) assert.throws(() => createBlankTerrain(options), RangeError);
});

test('the modification primitive changes exactly one sample using Float32 precision', () => {
  const terrain = createBlankTerrain({ id: 'mutation' });
  const buffer = terrain.elevations;
  setElevation(terrain, { column: 3, row: 2 }, 123.456);
  assert.strictEqual(terrain.elevations, buffer);
  assert.equal(terrain.elevations[2 * 512 + 3], Math.fround(123.456));
  assert.equal(terrain.elevations.filter((value) => value !== -100).length, 1);
});

test('invalid modifications fail without changing the terrain', () => {
  const terrain = createBlankTerrain({ id: 'invalid-mutation' });
  assert.throws(() => setElevation(terrain, { column: 512, row: 0 }, 10), RangeError);
  assert.throws(() => setElevation(terrain, { column: 0, row: 0 }, NaN), RangeError);
  assert.throws(() => setElevation(terrain, { column: 0, row: 0 }, 1e40), RangeError);
  assert.ok(terrain.elevations.every((value) => value === -100));
});
