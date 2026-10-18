import test from 'node:test';
import assert from 'node:assert/strict';
import { focusedPeriodicSize, periodicContextFrame } from './periodic-view.ts';
import { FIT_CAMERA, cameraRect, panBy, zoomAt } from './camera.ts';

test('focused desktop periods take 82% width with symmetric connected previews and uniform scale', () => {
  for (const stage of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 3440, height: 1440 }]) {
    const size = focusedPeriodicSize({ width: 1, height: 1 }, stage), frame = periodicContextFrame(size.width, stage.width);
    assert.equal(size.width, stage.width * .82); assert.equal(size.width / size.height, 1);
    assert.ok(Math.abs(frame.previewWidth / stage.width - .09) < 1e-12);
    assert.ok(Math.abs(stage.width - frame.right - frame.previewWidth) < 1e-9);
    assert.ok(size.height >= stage.height);
  }
});

test('square/tall focus retains coverage, extreme width caps vertical cropping, and non-square geography keeps proportions', () => {
  for (const stage of [{ width: 900, height: 900 }, { width: 412, height: 839 }]) {
    const size = focusedPeriodicSize({ width: 1, height: 1 }, stage);
    assert.equal(size.height, stage.height); assert.equal(size.width, stage.height);
    assert.equal(periodicContextFrame(size.width, stage.width).previewWidth, 0);
  }
  assert.equal(focusedPeriodicSize({ width: 1, height: 1 }, { width: 5120, height: 1440 }).height, 2880);
  assert.equal(focusedPeriodicSize({ width: 2, height: 1 }, { width: 1920, height: 1080 }).width / 1080, 2);
  assert.throws(() => focusedPeriodicSize({ width: 0, height: 1 }, { width: 1000, height: 800 }));
});

test('focused cut moves under a centered period during many pans; vertical bounds remain fully reachable', () => {
  const map = { width: 1, height: 1 }, stage = { width: 1920, height: 1080 }, options = { mode: 'focus', periodicU: true } as const;
  let camera = FIT_CAMERA;
  const initial = cameraRect(camera, map, stage, options), frame = periodicContextFrame(initial.width, stage.width);
  const phase = (x: number) => ((x % 1) + 1) % 1;
  for (let i = 0; i < 1000; i++) {
    const before = cameraRect(camera, map, stage, options), oldCut = phase((frame.left - before.left) / before.width);
    camera = panBy(camera, { x: 133, y: 0 }, map, stage, options);
    const after = cameraRect(camera, map, stage, options), newCut = phase((frame.left - after.left) / after.width);
    assert.ok(Math.abs(newCut - phase(oldCut - 133 / after.width)) < 1e-12);
    assert.deepEqual(periodicContextFrame(after.width, stage.width), frame);
  }
  const north = cameraRect(panBy(camera, { x: 0, y: 1e6 }, map, stage, options), map, stage, options);
  const south = cameraRect(panBy(camera, { x: 0, y: -1e6 }, map, stage, options), map, stage, options);
  assert.equal(north.top, 0); assert.equal(south.top + south.height, stage.height);
});

test('pointer zoom in focus preserves physical anchors; full-height and Fit keep their original meanings', () => {
  const map = { width: 1, height: 1 }, stage = { width: 1920, height: 1080 }, options = { mode: 'focus', periodicU: true } as const;
  const anchor = { x: 800, y: 500 }, before = cameraRect(FIT_CAMERA, map, stage, options);
  const after = cameraRect(zoomAt(FIT_CAMERA, 2, anchor, map, stage, options), map, stage, options);
  assert.ok(Math.abs((anchor.x - after.left) / after.width - (anchor.x - before.left) / before.width) < 1e-12);
  assert.ok(Math.abs((anchor.y - after.top) / after.height - (anchor.y - before.top) / before.height) < 1e-12);
  assert.equal(cameraRect(FIT_CAMERA, map, stage, { mode: 'fill', periodicU: true }).height, 1080);
  assert.deepEqual(cameraRect(FIT_CAMERA, map, stage, { mode: 'fit', periodicU: true }), { left: 420, top: 0, width: 1080, height: 1080 });
});
