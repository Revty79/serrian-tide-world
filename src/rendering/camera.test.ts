import test from 'node:test';
import assert from 'node:assert/strict';
import { FIT_CAMERA, cameraRect, constrainCamera, panBy, zoomAt } from './camera.ts';

const map = { width: 2, height: 1 }, stage = { width: 1000, height: 700 };
test('camera fits correct terrain proportions and zooms around a pointer anchor', () => {
  const before = cameraRect(FIT_CAMERA, map, stage), pointer = { x: 650, y: 400 };
  assert.equal(before.width / before.height, 2);
  const after = cameraRect(zoomAt(FIT_CAMERA, 3, pointer, map, stage), map, stage);
  assert.equal(after.width / after.height, 2);
  assert.ok(Math.abs((pointer.x - before.left) / before.width - (pointer.x - after.left) / after.width) < 1e-12);
  assert.ok(Math.abs((pointer.y - before.top) / before.height - (pointer.y - after.top) / after.height) < 1e-12);
});
test('panning preserves zoom, constrains edges, and never loses a small fitted map', () => {
  const zoomed = zoomAt(FIT_CAMERA, 4, { x: 500, y: 350 }, map, stage);
  const camera = panBy(zoomed, { x: 1e6, y: -1e6 }, map, stage), rect = cameraRect(camera, map, stage);
  assert.equal(camera.zoom, 4); assert.equal(rect.left, 0); assert.equal(rect.top + rect.height, stage.height);
  const small = cameraRect(panBy(FIT_CAMERA, { x: 1e6, y: -1e6 }, map, stage), map, stage);
  assert.ok(small.left >= 0 && small.top >= 0 && small.left + small.width <= stage.width && small.top + small.height <= stage.height);
});
test('zoom limits, resize constraints and explicit Fit are deterministic', () => {
  assert.equal(zoomAt(FIT_CAMERA, 1000, { x: 500, y: 350 }, map, stage).zoom, 8);
  assert.equal(zoomAt(FIT_CAMERA, .001, { x: 500, y: 350 }, map, stage).zoom, 1);
  const next = constrainCamera({ zoom: 4, centerX: -500, centerY: 500 }, map, { width: 320, height: 900 });
  const rect = cameraRect(next, map, { width: 320, height: 900 });
  assert.equal(rect.left, 0); assert.ok(rect.top >= 0 && rect.top + rect.height <= 900);
  assert.deepEqual(cameraRect(FIT_CAMERA, map, stage), { left: 0, top: 100, width: 1000, height: 500 });
  assert.throws(() => constrainCamera({ zoom: NaN, centerX: 0, centerY: 0 }, map, stage));
});
