import test from 'node:test';
import assert from 'node:assert/strict';
import { edgePanVelocity, periodicStrokeOffset } from './edge-pan.ts';
import { FIT_CAMERA, cameraRect, panBy } from './camera.ts';

test('edge scrolling has a quiet center, symmetric capped speed, and no time-based brush input', () => {
  const stage = { width: 1440, height: 900 };
  assert.deepEqual(edgePanVelocity({ x: 720, y: 450 }, stage), { x: 0, y: 0 });
  assert.deepEqual(edgePanVelocity({ x: 0, y: 450 }, stage), { x: 360, y: 0 });
  assert.deepEqual(edgePanVelocity({ x: 1440, y: 450 }, stage), { x: -360, y: 0 });
  assert.deepEqual(edgePanVelocity({ x: 24, y: 450 }, stage), { x: 90, y: 0 });
  assert.ok(Math.abs(Math.hypot(...Object.values(edgePanVelocity({ x: -100, y: -100 }, stage))) - 360) < 1e-10);
});

test('active stroke winding survives many camera phase rebases in either direction', () => {
  const stage = { width: 1440, height: 900 }, dimensions = { width: 1, height: 1 }, options = { mode: 'fill', periodicU: true } as const;
  for (const direction of [-1, 1]) {
    let camera = FIT_CAMERA, offset = 0, travel = 0;
    const first = cameraRect(camera, dimensions, stage, options), pointer = 1000;
    const start = (pointer - first.left) / first.width;
    for (let i = 0; i < 10000; i++) {
      const old = cameraRect(camera, dimensions, stage, options), dx = direction * 7;
      camera = panBy(camera, { x: dx, y: 0 }, dimensions, stage, options);
      const next = cameraRect(camera, dimensions, stage, options);
      offset += periodicStrokeOffset(old.left, next.left, dx, next.width, 1);
      travel += dx;
      assert.ok(Math.abs((pointer - next.left) / next.width + offset - (start - travel / next.width)) < 1e-10);
    }
  }
});
