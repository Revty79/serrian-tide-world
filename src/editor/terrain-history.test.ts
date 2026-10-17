import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankTerrain } from '../terrain/model.ts';
import { startBrushStroke, type BrushSettings } from '../terrain/brush.ts';
import { resetTerrainToOcean } from '../terrain/modifications.ts';
import { TerrainHistory } from './terrain-history.ts';
import { TerrainDocument } from './terrain-document.ts';

const bits = (data: Float32Array) => new Uint32Array(data.buffer, data.byteOffset, data.length).slice();
for (const tool of ['raise', 'lower', 'smooth', 'flatten'] as const) {
  test(`complete and partially cancelled ${tool} strokes restore every exact bit and identity`, () => {
    const terrain = createBlankTerrain({ id: tool, columns: 32, rows: 32 });
    terrain.elevations.forEach((_, i, data) => { data[i] = i % 2 ? -0 : Math.fround(i / 3); });
    const metadata = terrain.metadata, elevations = terrain.elevations;
    const history = new TerrainHistory(terrain), before = bits(elevations);
    const settings: BrushSettings = tool === 'raise' || tool === 'lower' ? { tool, radius: .15, strength: 43.7 }
      : tool === 'smooth' ? { tool, radius: .15, intensity: .6 } : { tool, radius: .15, intensity: .6, targetElevation: -56.78 };
    history.begin(); const stroke = startBrushStroke(terrain, { x: .3, y: .4 }, settings);
    stroke.moveTo({ x: .6, y: .5 }); stroke.end(); history.commit();
    const edited = bits(elevations); assert.notDeepEqual(before, edited);
    assert.equal(history.length, 1); history.undo(); assert.deepEqual(bits(elevations), before);
    history.redo(); assert.deepEqual(bits(elevations), edited);
    assert.equal(terrain.metadata, metadata); assert.equal(terrain.elevations, elevations);
  });
}
test('multiple strokes, reset, redo branching and no-op operations preserve order', () => {
  const terrain = createBlankTerrain({ id: 'sequence', columns: 16, rows: 16 }), history = new TerrainHistory(terrain);
  const initial = bits(terrain.elevations), states = [initial];
  for (let i = 0; i < 3; i++) { history.begin(); terrain.elevations[i] = i + .75; history.commit(); states.push(bits(terrain.elevations)); }
  history.begin(); resetTerrainToOcean(terrain); history.commit();
  history.undo(); assert.deepEqual(bits(terrain.elevations), states[3]);
  for (let i = 2; i >= 0; i--) { history.undo(); assert.deepEqual(bits(terrain.elevations), states[i]); }
  for (let i = 1; i <= 3; i++) { history.redo(); assert.deepEqual(bits(terrain.elevations), states[i]); }
  history.undo(); history.begin(); assert.equal(history.commit(), false); assert.ok(history.canRedo);
  history.begin(); terrain.elevations[100] = -0; history.commit(); assert.equal(history.canRedo, false);
  history.undo(); history.redo(); assert.ok(Object.is(terrain.elevations[100], -0));
});
test('memory and entry caps evict oldest operations; sparse changes use compact representation', () => {
  const terrain = createBlankTerrain({ id: 'budget', columns: 32, rows: 32 });
  const budget = terrain.elevations.byteLength * 2 + 64;
  const history = new TerrainHistory(terrain, budget, 3);
  for (let i = 0; i < 20; i++) { history.begin(); terrain.elevations.fill(i); history.commit(); assert.ok(history.retainedBytes <= budget); }
  assert.equal(history.length, 1); history.undo(); assert.ok(terrain.elevations.every((v) => v === 18));
  const sparse = new TerrainHistory(terrain, budget, 3);
  for (let i = 0; i < 10; i++) { sparse.begin(); terrain.elevations[0] = i; terrain.elevations[1023] = i; sparse.commit(); }
  assert.equal(sparse.length, 3); assert.equal(sparse.retainedBytes, 3 * (2 * 12 + 64));
});
test('saved checkpoint tracks undo/redo and naming, independently of camera and storage', () => {
  const doc = new TerrainDocument(createBlankTerrain({ id: 'checkpoint' }));
  assert.equal(doc.dirty, false); assert.equal(doc.hasSaved, false);
  doc.history.begin(); doc.terrain.elevations[5] = 1; doc.history.commit(); assert.ok(doc.dirty);
  doc.markSaved(); assert.equal(doc.dirty, false);
  doc.history.undo(); assert.ok(doc.dirty); doc.history.redo(); assert.equal(doc.dirty, false);
  doc.name = 'Renamed'; assert.ok(doc.dirty); doc.markSaved(); assert.equal(doc.dirty, false);
});
