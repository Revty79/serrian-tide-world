import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBlankTerrain } from '../terrain/model.ts';
import { setElevation } from '../terrain/modifications.ts';
import { elevationToColor, LAND_LOW, WATER_SHALLOW } from './elevation-colors.ts';
import { createElevationRaster } from './elevation-raster.ts';

test('every initial raster pixel is the same opaque water color', () => {
  const terrain = createBlankTerrain({ id: 'ocean' });
  const raster = createElevationRaster(terrain);
  assert.equal(raster.width, 512);
  assert.equal(raster.height, 512);
  const expected = [...elevationToColor(-100, 0), 255];
  for (let offset = 0; offset < raster.pixels.length; offset += 4) {
    assert.deepEqual(Array.from(raster.pixels.subarray(offset, offset + 4)), expected);
  }
});

test('sea level itself is water, and the threshold follows map metadata', () => {
  assert.deepEqual(elevationToColor(0, 0), WATER_SHALLOW);
  assert.deepEqual(elevationToColor(20, 20), WATER_SHALLOW);
  assert.deepEqual(elevationToColor(19, 20), elevationToColor(-1, 0));
  assert.deepEqual(elevationToColor(20.001, 20), LAND_LOW);
  assert.notDeepEqual(elevationToColor(0.001, 0), WATER_SHALLOW);
});

test('a synthetic positive elevation produces land at exactly its raster sample', () => {
  const terrain = createBlankTerrain({ id: 'synthetic-land', columns: 3, rows: 2 });
  setElevation(terrain, { column: 1, row: 0 }, 100);
  const { pixels } = createElevationRaster(terrain);
  assert.deepEqual(Array.from(pixels.slice(4, 8)), [...elevationToColor(100, 0), 255]);
  assert.notDeepEqual(Array.from(pixels.slice(4, 8)), Array.from(pixels.slice(0, 4)));
  assert.deepEqual(Array.from(pixels.slice(8, 12)), [...elevationToColor(-100, 0), 255]);
  assert.equal(terrain.elevations[1], 100);
});

test('depth and positive height affect presentation without modifying numerical data', () => {
  assert.notDeepEqual(elevationToColor(-1000, 0), elevationToColor(-100, 0));
  assert.notDeepEqual(elevationToColor(100, 0), elevationToColor(3000, 0));
  const terrain = createBlankTerrain({ id: 'read-only-render' });
  const before = terrain.elevations.slice();
  createElevationRaster(terrain);
  assert.deepEqual(terrain.elevations, before);
});
