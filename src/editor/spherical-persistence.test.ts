import test from 'node:test';
import assert from 'node:assert/strict';
import { createSphericalTerrain } from '../terrain/spherical.ts';
import { startSphericalBrushStroke } from '../terrain/spherical-brush.ts';
import { prepareSphericalSession } from './prepare-spherical-session.ts';
import { CUBE_FACES } from '../surfaces/cube-sphere.ts';
import { buildSphericalFaceTexture } from '../rendering/spherical-raster.ts';
const make = () => createSphericalTerrain({ terrainId: 'saved-session', identity: { worldId: 'world', surfaceId: 'sphere' }, radiusMeters: 1000000, cellsPerEdge: 16 });
const work = { yield: async () => {} };
test('cooperative texture preparation equals the existing synchronous renderer and starts fresh saved history', async () => {
  const t = make(); for (const k of t.samples()) t.write(k, Math.sin(k.index) * 3000);
  const { editor, cache } = await prepareSphericalSession(t, 'Restored sphere', true, work), source = t.copyElevations();
  for (const face of CUBE_FACES) assert.deepEqual(cache.faces[face], buildSphericalFaceTexture(t, source, face, true));
  assert.equal(editor.history.length, 0); assert.equal(editor.hasSaved, true); assert.equal(editor.modified, false);
});
test('Save drains all accepted great-circle input before checkpoint; subsequent Undo/Redo/name changes track dirty state', async () => {
  const t = make(), reference = make(), { editor } = await prepareSphericalSession(t, 'New sphere', false, work);
  const brush = { tool: 'raise', radiusMeters: 80000, strengthMeters: 800 } as const;
  const path = [[1, 0, 0], [1, 1, 1], [0, 0, 1]] as const, stroke = startSphericalBrushStroke(reference, { ...reference.metadata.identity, direction: path[0] }, brush);
  editor.begin(path[0], brush); for (const direction of path.slice(1)) { editor.move(direction); stroke.moveTo({ ...reference.metadata.identity, direction }); } stroke.end();
  editor.locked = true; assert.equal(editor.begin([1, 0, 0], brush), false); assert.equal(editor.undo(), false);
  await editor.drainForSave(work.yield); assert.deepEqual(t.copyElevations(), reference.copyElevations()); assert.equal(editor.history.length, 1); assert.equal(editor.pendingPoints, 0);
  editor.markSaved('Saved sphere'); editor.locked = false; assert.equal(editor.modified, false);
  editor.undo(); assert.equal(editor.modified, true); editor.redo(); assert.equal(editor.modified, false);
  editor.name = 'Renamed'; assert.equal(editor.modified, true); editor.name = 'Saved sphere'; assert.equal(editor.modified, false);
});
