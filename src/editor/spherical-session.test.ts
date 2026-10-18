import test from 'node:test';
import assert from 'node:assert/strict';
import { createSphericalTerrain, type SphericalTerrain } from '../terrain/spherical.ts';
import { startSphericalBrushStroke, type SphericalBrushSettings } from '../terrain/spherical-brush.ts';
import { CUBE_FACES, type CubeFace, type Vec3 } from '../surfaces/cube-sphere.ts';
import { buildSphericalFaceTexture, makeSphericalDisplayCache, type FaceTexture } from '../rendering/spherical-raster.ts';
import { SphericalSession } from './spherical-session.ts';
import { sphericalSmoothDelta, sphericalSmoothingCacheBytes } from '../terrain/spherical-smoothing.ts';
import { unitArcAngle } from '../surfaces/great-circle.ts';
import { encodeMap } from '../persistence/map-format.ts';
import { encodeHeightmap } from '../persistence/terrain-format.ts';
import { encodeWrappedHeightmap } from '../persistence/wrapped-format.ts';
import type { Terrain } from '../terrain/model.ts';

const identity = { worldId: 'session', surfaceId: 'sphere' }, radiusMeters = 1_000_000;
const make = (cellsPerEdge = 16) => createSphericalTerrain({ terrainId: 'editing', identity, radiusMeters, cellsPerEdge });
const bits = (t: SphericalTerrain) => new Uint32Array(t.copyElevations().buffer);
function session(t: SphericalTerrain) {
  const source = t.copyElevations(), faces = Object.fromEntries(CUBE_FACES.map((f) => [f, buildSphericalFaceTexture(t, source, f, true)])) as Record<CubeFace, FaceTexture>;
  return new SphericalSession(t, makeSphericalDisplayCache(faces, t.revision));
}
const path: Vec3[] = [[1, 0, 0], [1, 1, 1], [0, 1, 0], [-1, .1, .1], [-1, -1, -1], [0, 0, -1], [1, 0, 0], [1e-9, 0, 1]];
const settings: SphericalBrushSettings[] = [
  { tool: 'raise', radiusMeters: 180000, strengthMeters: 400 }, { tool: 'lower', radiusMeters: 180000, strengthMeters: 400 },
  { tool: 'smooth', radiusMeters: 180000, intensity: .73 }, { tool: 'flatten', radiusMeters: 180000, intensity: .73, targetElevation: 2400 },
];
for (const brush of settings) test(`cooperative ${brush.tool} retains exact continuous stroke bits, one operation and cross-view history`, () => {
  const t = make(), reference = make();
  for (const key of t.samples()) { const v = key.index % 11 ? Math.sin(key.index) * 2000 : -0; t.write(key, v); reference.write(key, v); }
  const original = bits(t), editor = session(t), stroke = startSphericalBrushStroke(reference, { ...identity, direction: path[0]! }, brush);
  editor.begin(path[0]!, brush);
  for (const direction of path.slice(1)) { editor.move(direction); stroke.moveTo({ ...identity, direction }); }
  editor.release(); let frames = 0;
  while (editor.pump(.05)) { editor.updateDisplay(); assert.ok(++frames < 2000); }
  editor.updateDisplay(); stroke.end();
  assert.ok(frames > 1); assert.deepEqual(bits(t), bits(reference)); assert.equal(editor.history.length, 1); assert.equal(editor.modified, true);
  const edited = bits(t); assert.equal(editor.undo(), true); editor.updateDisplay(); assert.deepEqual(bits(t), original); assert.equal(editor.modified, false);
  assert.equal(editor.redo(), true); editor.updateDisplay(); assert.deepEqual(bits(t), edited);
  assert.equal(editor.cache.sourceRevision, t.revision); assert.equal(editor.statistics.fullRebuilds, 0);
});
test('release drains all queued positions; interruption preserves applied work as one operation; no-op preserves Redo', () => {
  const t = make(), editor = session(t), original = bits(t);
  editor.begin([1, 0, 0], settings[0]!); editor.move([0, 0, 1]); editor.pump(.001); editor.cancel();
  assert.equal(editor.painting, false); assert.equal(editor.pendingPoints, 0); assert.equal(editor.history.length, 1); assert.equal(editor.modified, true);
  editor.undo(); assert.deepEqual(bits(t), original); assert.equal(editor.modified, false);
  editor.begin([1, 0, 0], { tool: 'smooth', radiusMeters: 100000, intensity: 0 }); editor.release(); editor.pump();
  assert.equal(editor.history.canRedo, true); assert.equal(editor.modified, false); editor.redo(); assert.equal(editor.modified, true);
});
test('incremental texture regions equal fresh full builds at all shared edges/corners and after Undo/Redo', () => {
  const t = make(), editor = session(t), dirty = [...t.samples()].filter((key) => t.aliases(key).length > 1);
  const check = () => { const source = t.copyElevations(); for (const f of CUBE_FACES) assert.deepEqual(editor.cache.faces[f].pixels, buildSphericalFaceTexture(t, source, f).pixels); };
  for (const key of dirty) {
    const beforePixels = editor.statistics.updatedPixels;
    editor.begin(t.directionAt(key), { tool: 'raise', radiusMeters: 1000, strengthMeters: 250 }); editor.release(); editor.pump();
    const regions = editor.updateDisplay(); assert.equal(regions.length, t.aliases(key).length);
    assert.ok(editor.statistics.updatedPixels - beforePixels < editor.cache.faces.px.side ** 2); check();
  }
  editor.undo(); editor.updateDisplay(); check(); editor.redo(); editor.updateDisplay(); check();
  assert.equal(editor.statistics.fullRebuilds, 0);
  t.write(t.keyAt(0), 1800); editor.updateDisplay(); assert.equal(editor.statistics.fullRebuilds, 1); check();
});
test('cached Smooth weights are bit-equivalent to the uncached ordered formula and never cache elevations', () => {
  const t = make(40);
  const reference = (key: ReturnType<typeof t.keyAt>, current: number) => {
    const center = t.directionAt(key), neighbors = t.neighbors(key, 'edges').map((k) => ({ k, angle: unitArcAngle(center, t.directionAt(k)) }));
    const minimum = Math.min(...neighbors.map((n) => n.angle)); let total = 0, delta = 0;
    for (const n of neighbors) { const w = (minimum / n.angle) ** 2; total += w; delta += w * (t.read(n.k) - current); }
    return delta / (2 * total);
  };
  for (let pass = 0; pass < 2; pass++) {
    for (const key of t.samples()) t.write(key, Math.sin(key.index * 2.7 + pass) * 2300);
    for (const key of t.samples()) assert.equal(sphericalSmoothDelta(t, key, t.read(key)), reference(key, t.read(key)));
  }
  assert.ok(sphericalSmoothingCacheBytes(t) <= 8192 * 4 * 12);
  const key = t.keyAt(t.sampleCount - 1); sphericalSmoothDelta(t, key, 0);
  assert.throws(() => sphericalSmoothDelta(t, { ...key, worldId: 'foreign' }, 0));
});
test('legacy v1/v2 encoders reject spherical authority before any payload or save write', async () => {
  const t = make(), wrong = t as unknown as Terrain;
  for (const encode of [encodeMap, encodeHeightmap, encodeWrappedHeightmap]) await assert.rejects(async () => encode(wrong, 'sphere'));
  assert.equal(t.revision, 0); assert.ok(t.copyElevations().every((v) => v === -100));
});
