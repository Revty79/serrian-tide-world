import assert from 'node:assert/strict';
import test from 'node:test';
import { createCylinderGeometry, type CylinderRegion } from '../surfaces/cylinder.ts';
import { dot3 } from '../surfaces/cube-sphere.ts';
import { continuousCylinderScreenSegment, cylinderLayout, cylinderPositionVisible, initialCylinderView, navigateCylinder, projectCylinder, recenterCylinder, rotateCylinder, unprojectCylinder } from './cylindrical-view.ts';
const identity = { worldId: 'projection', surfaceId: 'outside' }, geometry = createCylinderGeometry({ identity, provider: 'physical-closed-cylinder', version: 1, configuration: 'solid-capped', role: 'exterior', radiusMeters: 1e6, lengthMeters: 1.6e6 });
const p = (patchId: CylinderRegion, u: number, v: number) => ({ ...identity, patchId, u, v });
const near = (a: readonly number[], b: readonly number[], e = .003) => assert.ok(Math.hypot(...a.map((v, i) => v - b[i]!)) < e, `${a} / ${b}`);
test('cylinder physical forward/inverse is independently front-facing through orientations, poles, rims and viewports', () => {
  let checked = 0, hidden = 0;
  for (const size of [{ width: 1440, height: 900 }, { width: 3840, height: 1080 }, { width: 800, height: 800 }, { width: 390, height: 844 }]) for (let angle = 0; angle < 8; angle++) {
    const view = rotateCylinder(initialCylinderView(), angle * .7, angle * .41);
    for (const region of ['side', 'cap-start', 'cap-end'] as const) for (let i = 0; i < 24; i++) {
      const point = p(region, i * 2 * Math.PI / 24, region === 'side' ? 800000 : i % 3 === 0 ? 0 : 713000), screen = projectCylinder(geometry, point, view, size);
      const facing = dot3(geometry.normal(point), view.frame.forward);
      if (facing < -1e-10) { assert.equal(screen, undefined); hidden++; }
      if (screen) { const hit = unprojectCylinder(geometry, screen, view, size); assert.ok(hit); near(geometry.referencePosition(hit), geometry.referencePosition(point)); checked++; }
    }
    for (const v of [0, 1600000]) for (let i = 0; i < 8; i++) { const a = p('side', i * Math.PI / 4, v), b = geometry.crossRim(a).position; assert.equal(cylinderPositionVisible(geometry, a, view.frame), cylinderPositionVisible(geometry, b, view.frame)); }
  }
  assert.ok(checked > 500); assert.ok(hidden > 500);
});
test('axial camera selects only the nearest actual cap; arbitrary rear points cannot project', () => {
  for (const region of ['cap-start', 'cap-end'] as const) {
    const view = recenterCylinder(geometry, initialCylinderView(), p(region, 0, 0)), size = { width: 900, height: 900 };
    assert.equal(unprojectCylinder(geometry, { x: 450, y: 450 }, view, size)!.patchId, region);
    const other = region === 'cap-start' ? 'cap-end' : 'cap-start'; assert.equal(projectCylinder(geometry, p(other, 0, 0), view, size), undefined);
    for (let i = 0; i < 16; i++) assert.equal(projectCylinder(geometry, p('side', i * Math.PI / 8, 800000), view, size), undefined);
  }
});
test('map uses actual circular caps, correct end orientation, shared tangent rims and a movable cut', () => {
  const size = { width: 1440, height: 900 };
  for (const phase of [0, 1.7, -Math.PI]) {
    const view = { ...initialCylinderView('map'), phase }, l = cylinderLayout(geometry, view, size);
    for (const region of ['side', 'cap-start', 'cap-end'] as const) for (let i = 0; i < 32; i++) {
      const point = p(region, i * .237, region === 'side' ? i / 32 * 1600000 : (i % 5) / 4 * 1000000), screen = projectCylinder(geometry, point, view, size)!;
      near(geometry.referencePosition(unprojectCylinder(geometry, screen, view, size)!), geometry.referencePosition(point));
    }
    for (const z of [0, 1600000]) {
      const a = p('side', phase, z), b = geometry.crossRim(a).position;
      near(Object.values(projectCylinder(geometry, a, view, size)!), Object.values(projectCylinder(geometry, b, view, size)!), 1e-8);
    }
    const end = projectCylinder(geometry, p('cap-end', -phase, 0), view, size)!;
    const east = projectCylinder(geometry, p('cap-end', -(phase + Math.PI / 2), 1000000), view, size)!;
    assert.ok(Math.abs(east.x - end.x - l.scale) < 1e-8); assert.ok(Math.abs(east.y - end.y) < 1e-8);
  }
});
test('only real projected tangent connections continue; gaps, false cap joins and long cut jumps reject', () => {
  const size = { width: 1440, height: 900 }, view = { ...initialCylinderView('map'), zoom: 2 };
  const screen = (q: ReturnType<typeof p>) => projectCylinder(geometry, q, view, size)!;
  for (const end of [false, true]) {
    const a = screen(p('side', 0, end ? 1580000 : 20000)), b = screen(p(end ? 'cap-end' : 'cap-start', 0, 980000));
    assert.ok(continuousCylinderScreenSegment(geometry, a, b, view, size));
    const c = screen(p('side', .2, end ? 1580000 : 20000)), d = screen(p(end ? 'cap-end' : 'cap-start', end ? -.2 : .2, 980000));
    assert.equal(continuousCylinderScreenSegment(geometry, c, d, view, size), false);
  }
  assert.equal(continuousCylinderScreenSegment(geometry, screen(p('side', 3.13, 800000)), screen(p('side', -3.13, 800000)), view, size), false);
});
test('recenter and pan preserve physical values, uniform scale and finite view bounds after resize', () => {
  for (const mode of ['physical', 'map'] as const) for (const region of ['side', 'cap-start', 'cap-end'] as const) {
    const point = p(region, 1.2, region === 'side' ? 480000 : 713000), view = recenterCylinder(geometry, initialCylinderView(mode), point), size = { width: 390, height: 844 };
    const screen = projectCylinder(geometry, point, view, size)!; near([screen.x, screen.y], [195, 422], 1e-8);
    near(geometry.referencePosition(unprojectCylinder(geometry, screen, view, size)!), geometry.referencePosition(point));
    assert.ok(Number.isFinite(cylinderLayout(geometry, navigateCylinder(geometry, view, 200, -500, size), { width: 3000, height: 800 }).scale));
  }
  assert.throws(() => cylinderLayout(geometry, { ...initialCylinderView(), zoom: 0 }, { width: 500, height: 500 }));
  assert.throws(() => cylinderLayout(geometry, initialCylinderView(), { width: 0, height: 500 }));
});
