import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceGlobeLimb, globeLimbZone, LIMB_ZONE, MAX_LIMB_FRAME_MS, MAX_LIMB_RADIANS_PER_SECOND } from './spherical-limb-assist.ts';
import { INITIAL_SPHERICAL_VIEW, projectSphere, recenterSphere, sphericalLayout, unprojectSphere } from './spherical-view.ts';
import { createSphericalTerrain } from '../terrain/spherical.ts';
import { CUBE_FACES, FACE_BASES, dot3, unitDirection, type Vec3 } from '../surfaces/cube-sphere.ts';
import { unitArcAngle } from '../surfaces/great-circle.ts';

const terrain = createSphericalTerrain({ terrainId: 'limb', identity: { worldId: 'geometry', surfaceId: 'sphere' }, radiusMeters: 1000, cellsPerEdge: 8 });
const distance = (a: Vec3, b: Vec3) => Math.hypot(...a.map((v, i) => v - b[i]!));
test('limb detection follows the actual projected circle, not the viewport boundary, with strict valid-domain handling', () => {
  const size = { width: 1440, height: 900 }, l = sphericalLayout(INITIAL_SPHERICAL_VIEW, size);
  assert.equal(globeLimbZone(INITIAL_SPHERICAL_VIEW, { x: 1439, y: 450 }, size), null);
  assert.equal(globeLimbZone(INITIAL_SPHERICAL_VIEW, { x: l.x + l.radius * .8, y: l.y }, size), null);
  assert.ok(globeLimbZone(INITIAL_SPHERICAL_VIEW, { x: l.x + l.radius * .99, y: l.y }, size));
  assert.equal(globeLimbZone({ ...INITIAL_SPHERICAL_VIEW, mode: 'net' }, { x: l.x + l.radius * .99, y: l.y }, size), null);
  assert.equal(globeLimbZone(INITIAL_SPHERICAL_VIEW, { x: NaN, y: 0 }, size), null);
  const enlarged = { ...INITIAL_SPHERICAL_VIEW, zoom: 4 };
  assert.equal(globeLimbZone(enlarged, { x: 1439, y: 899 }, size), null, 'viewport edge inside a zoomed globe is not its limb');
  assert.equal(advanceGlobeLimb(INITIAL_SPHERICAL_VIEW, { x: l.x + l.radius * .99, y: l.y }, size, Infinity, .08), null);
  assert.equal(advanceGlobeLimb(INITIAL_SPHERICAL_VIEW, { x: l.x + l.radius * .99, y: l.y }, size, 16, .3), null);
});

test('rigid recentering, inverse projection and analytic great-circle continuity agree near seams, corners, poles and rolled cameras', () => {
  const directions: Vec3[] = CUBE_FACES.map((face) => FACE_BASES[face].normal);
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) directions.push(unitDirection([x, y, z]));
  for (const z of [-1, 1]) directions.push(unitDirection([1e-10, 0, z]));
  let checks = 0;
  for (const size of [{ width: 1440, height: 900 }, { width: 3440, height: 1440 }, { width: 900, height: 900 }, { width: 412, height: 839 }]) for (const zoom of [1, 2, 3, 4]) for (const d of directions) {
    const base = recenterSphere({ ...INITIAL_SPHERICAL_VIEW, zoom }, d), l = sphericalLayout(base, size);
    for (let i = 0; i < 16; i++) for (const rho of [.85, .98, 1]) {
      const phi = i * Math.PI / 8, point = { x: l.x + l.radius * rho * Math.cos(phi), y: l.y - l.radius * rho * Math.sin(phi) };
      const step = advanceGlobeLimb(base, point, size, 5000, .08);
      if (!step) continue;
      checks++;
      const before = unprojectSphere(terrain, point, base, size)!, after = unprojectSphere(terrain, point, step.view, size)!;
      assert.ok(Math.abs(unitArcAngle(before, after) - step.angle) < 2e-13);
      // Use the actual floating-point screen coordinate. At the exact horizon,
      // sqrt(1-rho^2) amplifies a one-ulp coordinate rounding to about 1e-8.
      const x = (point.x - l.x) / l.radius, y = (l.y - point.y) / l.radius;
      const f = base.frame, tangent = unitDirection(f.right.map((v, k) => v * x + f.up[k]! * y) as unknown as Vec3), theta = Math.atan2(Math.hypot(x, y), Math.sqrt(Math.max(0, 1 - (x * x + y * y))));
      // Independent closed-form meridian, without the implementation's Rodrigues transform.
      const expected = unitDirection(f.forward.map((v, k) => v * Math.cos(theta + step.angle) + tangent[k]! * Math.sin(theta + step.angle)) as unknown as Vec3);
      assert.ok(distance(expected, after) < 4e-13);
      const projected = projectSphere(terrain, after, step.view, size)[0]!;
      assert.ok(Math.hypot(projected.x - point.x, projected.y - point.y) < 1e-8);
      assert.ok(dot3(before, step.view.frame.forward) >= dot3(before, base.frame.forward) - 1e-13, 'previous brush center becomes more visible');
      assert.ok(Math.abs(dot3(step.view.frame.up, step.view.frame.right)) < 1e-13);
    }
  }
  assert.ok(checks > 3000);
});

test('speed and per-step physical spacing are bounded, and every intermediate visible brush cap remains visible in the displayed end frame', () => {
  const size = { width: 900, height: 900 }, l = sphericalLayout(INITIAL_SPHERICAL_VIEW, size);
  for (const alpha of [.005, .08, .2]) for (const rho of [LIMB_ZONE + .001, .95, .999, 1]) {
    const point = { x: l.x + l.radius * rho, y: l.y }, result = advanceGlobeLimb(INITIAL_SPHERICAL_VIEW, point, size, 10000, alpha)!;
    assert.ok(result.angle <= alpha / 8); assert.ok(result.angle <= MAX_LIMB_RADIANS_PER_SECOND * MAX_LIMB_FRAME_MS / 1000);
    const theta = Math.asin(rho), angle = result.angle;
    for (let t = 0; t <= 10; t++) for (let j = 0; j < 64; j++) for (const radial of [.5, 1]) {
      const a = angle * t / 10, center: Vec3 = [Math.cos(theta + a), Math.sin(theta + a), 0], h: Vec3 = [Math.cos(a), Math.sin(a), 0];
      const capAngle = alpha * radial, around = j * Math.PI / 32;
      const q: Vec3 = [center[0] * Math.cos(capAngle) - center[1] * Math.sin(capAngle) * Math.cos(around), center[1] * Math.cos(capAngle) + center[0] * Math.sin(capAngle) * Math.cos(around), Math.sin(capAngle) * Math.sin(around)];
      if (dot3(q, h) >= 0) assert.ok(dot3(q, result.toHemisphere) >= -1e-14, 'no delayed visible dab writes into the displayed hidden hemisphere');
    }
  }
});
