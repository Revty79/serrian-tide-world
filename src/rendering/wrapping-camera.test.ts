import test from 'node:test';
import assert from 'node:assert/strict';
import { FIT_CAMERA, baseMapSize, cameraRect, constrainCamera, panBy, zoomAt } from './camera.ts';

test('Fill preserves aspect and covers desktop, ultrawide, square and tall stages; Fit remains separate', () => {
  for (const stage of [{ width: 1440, height: 900 }, { width: 3440, height: 1440 }, { width: 900, height: 900 }, { width: 412, height: 839 }]) {
    const dimensions = { width: 2, height: 1 }, options = { mode: 'fill' } as const;
    const rect = cameraRect(FIT_CAMERA, dimensions, stage, options);
    assert.equal(rect.width / rect.height, 2); assert.ok(rect.width >= stage.width && rect.height >= stage.height);
    const atEnd = panBy(FIT_CAMERA, { x: -1e6, y: -1e6 }, dimensions, stage, options), shifted = cameraRect(atEnd, dimensions, stage, options);
    assert.ok(Math.abs(shifted.left + shifted.width - stage.width) < 1e-8 && Math.abs(shifted.top + shifted.height - stage.height) < 1e-8);
    const fit = baseMapSize(dimensions, stage, { mode: 'fit' }); assert.ok(fit.width <= stage.width && fit.height <= stage.height);
  }
});
test('continuous horizontal phase rebases every pan without changing zoom or vertical bounds', () => {
  const dimensions = { width: 1, height: 1 }, stage = { width: 2560, height: 900 }, options = { mode: 'fill', periodicU: true } as const;
  let camera = FIT_CAMERA;
  for (let i = 0; i < 10000; i++) {
    camera = panBy(camera, { x: i % 2 ? 9951 : -3862, y: 500 }, dimensions, stage, options);
    assert.ok(camera.centerX >= 0 && camera.centerX < 1); assert.equal(camera.centerY, .5); assert.equal(camera.zoom, 1);
  }
  const wholePeriods = panBy(camera, { x: 900 * 1e9, y: 0 }, dimensions, stage, options);
  assert.equal(wholePeriods.centerX, camera.centerX);
  assert.equal(constrainCamera({ zoom: 2, centerX: -1234.25, centerY: 100 }, dimensions, stage, options).centerX, .75);
});
test('periodic pointer zoom keeps the same physical anchor even when phase rebases', () => {
  const dimensions = { width: 1, height: 1 }, stage = { width: 1440, height: 900 }, options = { mode: 'fill', periodicU: true } as const;
  const camera = { zoom: 1, centerX: .02, centerY: .5 }, point = { x: 1300, y: 600 };
  const before = cameraRect(camera, dimensions, stage, options), after = cameraRect(zoomAt(camera, 3, point, dimensions, stage, options), dimensions, stage, options);
  const a = (point.x - before.left) / before.width, b = (point.x - after.left) / after.width;
  assert.ok(Math.abs((a - b) - Math.round(a - b)) < 1e-12);
  assert.ok(Math.abs((point.y - before.top) / before.height - (point.y - after.top) / after.height) < 1e-12);
});
