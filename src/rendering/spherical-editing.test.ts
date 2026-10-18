import test from 'node:test';
import assert from 'node:assert/strict';
import { CUBE_FACES, FACE_BASES, FACE_CONNECTIONS, dot3, unitDirection, type Vec3 } from '../surfaces/cube-sphere.ts';
import { createSphericalTerrain } from '../terrain/spherical.ts';
import { startSphericalBrushStroke } from '../terrain/spherical-brush.ts';
import { sphericalBrushContains, sphericalBrushPreview } from './spherical-brush-preview.ts';
import { INITIAL_SPHERICAL_VIEW, netFaceRect, recenterSphere, type SphericalView } from './spherical-view.ts';
import { unitArcAngle } from '../surfaces/great-circle.ts';
import { continuousNetSegment } from './spherical-gesture-path.ts';

const identity = { worldId: 'preview', surfaceId: 'sphere' }, radius = 1000000, size = { width: 1400, height: 1000 };
const terrain = () => createSphericalTerrain({ terrainId: 'preview', identity, radiusMeters: radius, cellsPerEdge: 16 });
const centers: Vec3[] = CUBE_FACES.map((f) => FACE_BASES[f].normal);
for (const e of FACE_CONNECTIONS) if (CUBE_FACES.indexOf(e.face) < CUBE_FACES.indexOf(e.toFace)) centers.push(unitDirection(FACE_BASES[e.face].normal.map((v, i) => v + FACE_BASES[e.toFace].normal[i]!) as unknown as Vec3));
for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) centers.push(unitDirection([x, y, z]));
centers.push(unitDirection([1e-9, 1e-9, 1]), unitDirection([1e-9, 1e-9, -1]), unitDirection([.025, 1, 0]));
test('geodesic preview footprint equals actual Raise influence at six faces, twelve edges, eight corners, poles and silhouette', () => {
  for (const center of centers) for (const mode of ['globe', 'net'] as const) {
    const t = terrain(), view: SphericalView = mode === 'net' ? { ...INITIAL_SPHERICAL_VIEW, mode } : center[0] > 0 && center[1] > .9 ? INITIAL_SPHERICAL_VIEW : recenterSphere(INITIAL_SPHERICAL_VIEW, center);
    const hemisphere = mode === 'globe' ? view.frame.forward : undefined;
    const preview = sphericalBrushPreview(t, center, radius * .31, view, size); assert.ok(preview.length > 0);
    for (const s of preview) for (const [i, d] of s.directions.entries()) {
      if (s.kind === 'cap') assert.ok(Math.abs(unitArcAngle(center, d) - .31) < 1e-12);
      else assert.ok(unitArcAngle(center, d) <= .31 + 1e-12);
      assert.ok(Number.isFinite(s.points[i]!.x) && Number.isFinite(s.points[i]!.y));
      if (hemisphere) assert.ok(dot3(d, hemisphere) > -1e-12);
    }
    const stroke = startSphericalBrushStroke(t, { ...identity, direction: center }, { tool: 'raise', radiusMeters: radius * .31, strengthMeters: 10000 }, undefined, hemisphere ? { hemisphere } : undefined); stroke.end();
    for (const key of t.samples()) assert.equal(t.read(key) !== -100, sphericalBrushContains(center, t.directionAt(key), .31, hemisphere), `${mode} ${center} ${key.index}`);
  }
});
test('net previews split at visual cuts and never draw long connecting lines across gaps', () => {
  const t = terrain(), view: SphericalView = { ...INITIAL_SPHERICAL_VIEW, mode: 'net' };
  const segments = sphericalBrushPreview(t, unitDirection([-1, 0, 1]), radius * .2, view, size);
  assert.ok(segments.some((s) => s.kind === 'clip')); assert.ok(segments.filter((s) => s.kind === 'cap').length >= 2);
  for (const s of segments) for (let i = 1; i < s.points.length; i++) assert.ok(Math.hypot(s.points[i]!.x - s.points[i - 1]!.x, s.points[i]!.y - s.points[i - 1]!.y) < 40);
});
test('continuous net paths allow all five joined folds, but reject gaps, distant cuts and ambiguous corner jumps', () => {
  const t = terrain(), view: SphericalView = { ...INITIAL_SPHERICAL_VIEW, mode: 'net' };
  const center = (face: typeof CUBE_FACES[number]) => { const r = netFaceRect(face, view, size); return { x: r.x + r.side / 2, y: r.y + r.side / 2 }; };
  for (const pair of [['ny', 'px'], ['px', 'py'], ['py', 'nx'], ['pz', 'px'], ['px', 'nz']] as const) assert.ok(continuousNetSegment(t, center(pair[0]), center(pair[1]), view, size));
  assert.equal(continuousNetSegment(t, center('pz'), center('nx'), view, size), false);
  const r = netFaceRect('pz', view, size);
  assert.equal(continuousNetSegment(t, center('pz'), { x: r.x - r.side / 2, y: r.y + r.side / 2 }, view, size), false);
  const py = netFaceRect('py', view, size);
  assert.equal(continuousNetSegment(t, { x: r.x + .75 * r.side, y: r.y + .75 * r.side }, { x: py.x + .25 * py.side, y: py.y + .25 * py.side }, view, size), false);
});
