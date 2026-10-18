import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankTerrain } from '../terrain/model.ts';
import { createWrappedTerrain } from '../terrain/topology.ts';
import { coastCoverage, createDisplayRaster, displayElevation } from './display-raster.ts';
import { elevationToColor } from './elevation-colors.ts';

test('display interpolation blends elevation before coloring, without changing numerical data or signed zero', () => {
  const terrain = createBlankTerrain({ id: 'display', columns: 2, rows: 2 });
  terrain.elevations.set([-100, 100, -0, 200]); const before = new Uint32Array(terrain.elevations.buffer).slice();
  assert.equal(displayElevation(terrain, .5, 0), 0);
  assert.equal(displayElevation(terrain, .5, .5), 50);
  const raster = createDisplayRaster(terrain, 1_048_576, false);
  const middle = Math.floor(raster.width / 2);
  assert.deepEqual(Array.from(raster.pixels.slice(middle * 4, middle * 4 + 3)), [...elevationToColor(0, 0)]);
  assert.deepEqual(new Uint32Array(terrain.elevations.buffer), before);
});
test('periodic display interpolation follows the same height field across either side of the seam', () => {
  const terrain = createWrappedTerrain({ id: 'display-wrap', identity: { worldId: 'w', surfaceId: 's', patchId: 'p' }, columns: 4, rows: 2 });
  terrain.elevations.set([200, -100, -100, 100, 200, -100, -100, 100]);
  assert.equal(displayElevation(terrain, -.5, .5), 150); assert.equal(displayElevation(terrain, 3.5, .5), 150);
  assert.equal(displayElevation(terrain, 0, .5), displayElevation(terrain, 4, .5));
});
test('default display caches have a bounded pixel count and do not grow with zoom', () => {
  const terrain = createBlankTerrain({ id: 'budget' });
  for (const budget of [589_824, 1_048_576]) {
    const raster = createDisplayRaster(terrain, budget);
    assert.ok(raster.width * raster.height <= budget); assert.ok(raster.width > 512);
    assert.ok(raster.pixels.every((v, i) => v === [35, 104, 136, 255][i % 4]));
  }
});
test('shoreline antialiasing uses local height coverage rather than blurring adjacent geography', () => {
  assert.equal(coastCoverage(0, 0, 100, 0), .5);
  assert.equal(coastCoverage(25, 0, 100, 0), .75);
  assert.equal(coastCoverage(0, 0, 100, 100), .5);
  assert.equal(coastCoverage(-100, 0, 100, 100), 0);
  assert.equal(coastCoverage(100, 0, 100, 100), 1);
  assert.equal(coastCoverage(0, 0, 0, 0), 0);
});
