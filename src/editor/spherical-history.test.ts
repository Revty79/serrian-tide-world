import test from 'node:test';
import assert from 'node:assert/strict';
import { createSphericalTerrain } from '../terrain/spherical.ts';
import { startSphericalBrushStroke } from '../terrain/spherical-brush.ts';
import { SphericalHistory } from './spherical-history.ts';

const make = () => createSphericalTerrain({ terrainId: 'history', identity: { worldId: 'w', surfaceId: 's' }, radiusMeters: 1000, cellsPerEdge: 16 });
const words = (terrain: ReturnType<typeof make>) => new Uint32Array(terrain.copyElevations().buffer);

test('protected spherical support rejects whole Undo/Redo before terrain or history stacks change',()=>{
 let blocked=false;const t=createSphericalTerrain({terrainId:'protected',identity:{worldId:'w',surfaceId:'s'},radiusMeters:1000,cellsPerEdge:16,initialElevation:0,validateSample:(i,h,b)=>{if(blocked&&i===8&&!Object.is(h,b))throw Error('Protected excavation support.');}}),h=new SphericalHistory(t),before=words(t);
 h.begin();t.write(t.keyAt(0),10);t.write(t.keyAt(8),20);h.commit();const after=words(t),state=h.stateId,bytes=h.retainedBytes;blocked=true;assert.throws(()=>h.undo(),/Protected/);assert.deepEqual(words(t),after);assert.equal(h.stateId,state);assert.equal(h.retainedBytes,bytes);assert(h.canUndo);assert(!h.canRedo);blocked=false;assert(h.undo());assert.deepEqual(words(t),before);blocked=true;assert.throws(()=>h.redo(),/Protected/);assert.deepEqual(words(t),before);assert(h.canRedo);blocked=false;assert(h.redo());assert.deepEqual(words(t),after);
});
test('spherical history branches, no-ops, idempotent writes and signed-zero changes retain exact bits and state IDs', () => {
  const terrain = make(), history = new SphericalHistory(terrain), key = terrain.keyAt(0), initial = words(terrain);
  history.begin(); terrain.write(key, -0); assert.equal(history.commit(), true); const zero = words(terrain), saved = history.stateId;
  history.begin(); terrain.write(key, 12.75); history.commit(); history.undo(); assert.deepEqual(words(terrain), zero); assert.equal(history.stateId, saved);
  history.begin(); const revision = terrain.revision; terrain.write(key, -0); assert.equal(terrain.revision, revision); assert.equal(history.commit(), false); assert.equal(history.canRedo, true);
  history.begin(); terrain.write(key, 0); history.commit(); assert.equal(history.canRedo, false); history.undo(); assert.ok(Object.is(terrain.read(key), -0)); history.undo(); assert.deepEqual(words(terrain), initial);
});

test('retained byte/entry budgets evict oldest operations and permit a complete surface operation without six face copies', () => {
  const terrain = make(), budget = terrain.elevationByteLength * 2 + 64, history = new SphericalHistory(terrain, budget, 3);
  for (let i = 0; i < 6; i++) {
    history.begin(); assert.equal(history.pendingBytes, terrain.elevationByteLength);
    for (const key of terrain.samples()) terrain.write(key, i + .25);
    history.commit(); assert.ok(history.retainedBytes <= budget);
  }
  assert.equal(history.pendingBytes, 0); assert.equal(history.length, 1); history.undo(); assert.ok(terrain.copyElevations().every((v) => v === 4.25));
  const sparse = new SphericalHistory(terrain, budget, 3);
  for (let i = 0; i < 10; i++) { sparse.begin(); terrain.write(terrain.keyAt(0), i); terrain.write(terrain.keyAt(terrain.sampleCount - 1), i); sparse.commit(); }
  assert.equal(sparse.length, 3); assert.equal(sparse.retainedBytes, 3 * (2 * 12 + 64));
  for (const invalid of [0, budget - 1, Infinity, NaN]) assert.throws(() => new SphericalHistory(terrain, invalid));
});

test('history refuses conflicting active operations and clears stale history instead of overwriting untracked terrain', () => {
  const terrain = make(), history = new SphericalHistory(terrain), center = { ...terrain.metadata.identity, direction: [1, 0, 0] as const }, settings = { tool: 'raise' as const, radiusMeters: 200, strengthMeters: 100 };
  const stroke = startSphericalBrushStroke(terrain, center, settings, history);
  assert.throws(() => history.begin()); assert.throws(() => history.redo()); assert.throws(() => history.clear());
  assert.throws(() => startSphericalBrushStroke(terrain, center, settings)); stroke.end(); history.undo();
  terrain.write(terrain.keyAt(100), 555); const before = words(terrain);
  assert.throws(() => history.redo(), /Untracked/); assert.deepEqual(words(terrain), before); assert.equal(history.length, 0);
  const next = startSphericalBrushStroke(terrain, center, settings, history); next.end(); assert.equal(history.length, 1);
});
