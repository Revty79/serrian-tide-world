import assert from 'node:assert/strict';
import test from 'node:test';
import { transportTangent, type SurfacePosition } from './contracts.ts';
import { CYLINDER_PROVIDER, CYLINDER_REGIONS, createCylinderGeometry, type CylinderConfiguration, type CylinderVector } from './cylinder.ts';

const identity = { worldId: 'cylinder-world', surfaceId: 'closed-exterior' };
const config: CylinderConfiguration = { identity, provider: CYLINDER_PROVIDER, version: 1, configuration: 'solid-capped', role: 'exterior', radiusMeters: 3, lengthMeters: 8 };
const point = (patchId: string, u: number, v: number): SurfacePosition => ({ ...identity, patchId, u, v });
const close = (a: number, b: number, eps = 2e-13) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b)), `${a} != ${b}`);
const vectorClose = (a: CylinderVector, b: CylinderVector) => a.forEach((v, i) => close(v, b[i]!));
const cross = (a: CylinderVector, b: CylinderVector): CylinderVector => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

test('cylinder independent reference fixtures: curved side, real disks, dimensions and normals', () => {
  const g = createCylinderGeometry(config);
  for (const [p, expected, normal] of [
    [point('side', 0, 4), [3, 0, 4], [1, 0, 0]],
    [point('side', Math.PI / 2, 8), [0, 3, 8], [0, 1, 0]],
    [point('side', -Math.PI / 2, 0), [0, -3, 0], [0, -1, 0]],
    [point('cap-start', Math.PI / 2, 1), [0, 1, 0], [0, 0, -1]],
    [point('cap-end', Math.PI / 2, 2), [0, -2, 8], [0, 0, 1]],
    [point('cap-start', 2.3, 0), [0, 0, 0], [0, 0, -1]],
    [point('cap-end', -1.7, 0), [0, 0, 8], [0, 0, 1]],
  ] as const) { vectorClose(g.referencePosition(p), expected); vectorClose(g.normal(p), normal); }
  close(g.circumferenceMeters, 6 * Math.PI);
  assert.equal(g.metadata.role, 'exterior');
  assert.ok(Object.isFrozen(g.metadata.identity));
});

test('cylinder full angular periodicity and cap center canonicalization', () => {
  const g = createCylinderGeometry(config);
  for (const region of CYLINDER_REGIONS) for (const u of [-Math.PI, -1.1, 0, .7, Math.PI]) {
    for (const turns of [-8, -1, 0, 1, 11]) vectorClose(g.referencePosition(point(region, u + turns * 2 * Math.PI, 2)), g.referencePosition(point(region, u, 2)));
  }
  for (const region of ['cap-start', 'cap-end']) for (const u of [-100, -Math.PI, 0, 1, 100]) assert.equal(g.normalize(point(region, u, 0)).u, 0);
});

test('cylinder both rims have exact same-point reciprocal aliases, including angular cut', () => {
  const g = createCylinderGeometry(config);
  for (const z of [0, 8]) for (const theta of [-Math.PI, -2.7, -Math.PI / 2, 0, .123, Math.PI / 2, Math.PI]) {
    const a = g.normalize(point('side', theta, z)), b = g.crossRim(a);
    assert.deepEqual(g.referencePosition(a), g.referencePosition(b.position));
    assert.deepEqual(g.crossRim(b.position).position, a);
    assert.equal(b.position.patchId, z ? 'cap-end' : 'cap-start');
    assert.equal(b.position.v, 3);
  }
});

test('cylinder all chart orientations agree with outward normals; center uses Cartesian tangent', () => {
  const g = createCylinderGeometry(config);
  for (const region of CYLINDER_REGIONS) for (const theta of [0, .7, -2]) {
    const p = point(region, theta, 2), u = g.tangentVector(p, { du: 1, dv: 0 }), v = g.tangentVector(p, { du: 0, dv: 1 });
    const n = cross(u, v), length = Math.hypot(...n);
    vectorClose(n.map((x) => x / length) as unknown as CylinderVector, g.normal(p));
  }
  assert.throws(() => g.tangentVector(point('cap-start', 0, 0), { du: 1, dv: 1 }), /singular/);
  assert.deepEqual(g.capCartesianTangent('cap-start', 2, -3), [2, -3, 0]);
  assert.throws(() => g.capCartesianTangent('side' as 'cap-start', 0, 1));
});

test('cylinder rim transport is a reciprocal isometric fold with genuinely different tangent planes', () => {
  const g = createCylinderGeometry(config);
  for (const end of [false, true]) for (const theta of [-Math.PI, -.41, 0, 1.31]) {
    const a = point('side', theta, end ? 8 : 0), b = g.crossRim(a), reverse = g.crossRim(b.position);
    for (const tangent of [{ du: 1, dv: 0 }, { du: 0, dv: 1 }, { du: .37, dv: -2.4 }]) {
      const transported = transportTangent(tangent, b.transport), source = g.tangentVector(a, tangent), target = g.tangentVector(b.position, transported);
      close(Math.hypot(...source), Math.hypot(...target));
      const restored = transportTangent(transported, reverse.transport);
      close(restored.du, tangent.du); close(restored.dv, tangent.dv);
      // Independent fold: circumferential component stays fixed, axial component turns radial.
      const s = Math.sin(theta), c = Math.cos(theta), radial = tangent.dv * (end ? -1 : 1);
      vectorClose(target, [-3 * tangent.du * s + radial * c, 3 * tangent.du * c + radial * s, 0]);
    }
    assert.notDeepEqual(g.normal(a), g.normal(b.position));
    assert.notDeepEqual(g.tangentVector(a, { du: 0, dv: 1 }), g.tangentVector(b.position, { du: 0, dv: end ? -1 : 1 }));
  }
});

test('cylinder restricted metrics have independent exact axial, wrap, disk and radial fixtures', () => {
  const g = createCylinderGeometry(config), d = (a: SurfacePosition, b: SurfacePosition) => g.sameRegionDistance(a, b).value;
  close(d(point('side', .4, 1), point('side', .4, 7)), 6);
  close(d(point('side', Math.PI - .1, 0), point('side', -Math.PI + .1, 0)), .6);
  close(d(point('side', 0, 0), point('side', Math.PI / 2, 8)), Math.hypot(1.5 * Math.PI, 8));
  for (const cap of ['cap-start', 'cap-end']) {
    close(d(point(cap, .8, 1), point(cap, .8, 3)), 2);
    close(d(point(cap, 0, 3), point(cap, Math.PI, 3)), 6);
    close(d(point(cap, 0, 3), point(cap, Math.PI / 2, 3)), Math.sqrt(18));
    close(d(point(cap, 234, 0), point(cap, 0, 3)), 3);
  }
  // Diametrically opposite side-rim points have cap shortcut 2R < piR.
  close(d(point('side', 0, 0), point('side', Math.PI, 0)), 3 * Math.PI);
  assert.equal(g.sameRegionDistance(point('side', 0, 0), point('side', 1, 1)).scope, 'region-restricted');
  assert.throws(() => g.globalDistance(point('side', 0, 0), point('side', Math.PI, 0)), /not implemented/);
  assert.throws(() => g.sameRegionDistance(point('side', 0, 0), point('cap-start', 0, 0)), /cross-rim/);
});

test('cylinder rejects unsupported configurations, invalid identities and nonfinite/overflow dimensions', () => {
  for (const bad of [0, -1, NaN, Infinity, -Infinity, Number.MAX_VALUE]) for (const dimension of ['radiusMeters', 'lengthMeters']) {
    // Maximum finite axial length is valid if the derived metric remains finite.
    if (dimension === 'lengthMeters' && bad === Number.MAX_VALUE) continue;
    assert.throws(() => createCylinderGeometry({ ...config, [dimension]: bad }));
  }
  for (const [key, value] of [['provider', 'flat'], ['version', 2], ['configuration', 'open'], ['configuration', 'hollow'], ['configuration', 'domed'], ['role', 'interior']] as const) assert.throws(() => createCylinderGeometry({ ...config, [key]: value } as CylinderConfiguration));
  for (const field of ['worldId', 'surfaceId']) for (const value of ['', '  ', 'x'.repeat(129), 123]) assert.throws(() => createCylinderGeometry({ ...config, identity: { ...identity, [field]: value } } as CylinderConfiguration));
});

test('cylinder rejects invalid/foreign charts, seam requests and tangent overflow', () => {
  const g = createCylinderGeometry(config);
  for (const p of [point('unknown', 0, 0), point('side', NaN, 0), point('side', 0, -1), point('side', 0, 9), point('cap-start', 0, 4), point('cap-end', 0, Infinity), { ...point('side', 0, 0), worldId: 'foreign' }, { ...point('side', 0, 0), surfaceId: 'foreign' }]) assert.throws(() => g.referencePosition(p));
  assert.throws(() => g.crossRim(point('side', 0, 4)));
  assert.throws(() => g.crossRim(point('cap-start', 0, 2)));
  assert.throws(() => g.tangentVector(point('side', 0, 1), { du: Infinity, dv: 0 }));
  assert.throws(() => g.tangentVector(point('side', 0, 1), { du: Number.MAX_VALUE, dv: 0 }));
});
