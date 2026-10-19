import test from 'node:test';
import assert from 'node:assert/strict';
import { CylinderPreviewSession, createCylinderPreviewTerrain } from './cylinder-preview-session.ts';
import { initialCylinderView, recenterCylinder } from '../rendering/cylindrical-view.ts';
import { prepareCylinderSession } from './prepare-cylinder-session.ts';
import { createAtlasDocument, documentModified, documentShape } from './atlas-document.ts';
import { projectCylinder, unprojectCylinder } from '../rendering/cylindrical-view.ts';
const make = () => { const t = createCylinderPreviewTerrain(64); t.write(t.keyAt(0), -0); return new CylinderPreviewSession(t, 'Checkpoint cylinder', true, true); };
const center = (s: CylinderPreviewSession, u = 0) => ({ ...s.terrain.metadata.identity, patchId: 'side' as const, u, v: 800000 });
const brush = { version: 1 as const, tool: 'raise' as const, radiusMeters: 83700, strengthMeters: 200 };
async function dab(s: CylinderPreviewSession, u = 0) { assert.ok(s.begin(center(s, u), brush, initialCylinderView('map'))); s.release(); await s.drainForSave(async () => {}); }
const words = (s: CylinderPreviewSession) => new Uint32Array(s.terrain.copyElevations().buffer);
test('saved cylinder checkpoint tracks exact content through Undo/Redo, renaming, branching and history eviction', async () => {
  const s = make(), baseline = words(s); assert.equal(s.modified, false); await dab(s); assert.equal(s.modified, true); const saved = words(s); s.markSaved(s.name); assert.equal(s.modified, false);
  s.undo(); assert.deepEqual(words(s), baseline); assert.equal(s.modified, true); s.redo(); assert.deepEqual(words(s), saved); assert.equal(s.modified, false);
  s.name += ' renamed'; assert.equal(s.modified, true); s.name = 'Checkpoint cylinder'; assert.equal(s.modified, false);
  s.undo(); await dab(s, .15); assert.equal(s.history.canRedo, false); assert.equal(s.modified, true); s.markSaved(s.name);
  for (let i = 0; i < 35; i++) await dab(s, i % 2 ? .15 : .25); assert.ok(s.history.statistics.evictions > 0); assert.equal(s.modified, true);
  while (s.history.canUndo) s.undo(); assert.equal(s.modified, true); s.markSaved(s.name); assert.equal(s.modified, false); s.redo(); assert.equal(s.modified, true); s.undo(); assert.equal(s.modified, false); s.dispose(); assert.equal(s.checkpointSamples, 0);
});
test('saved signed zero is restored exactly and a reopened nonzero revision starts clean with fresh history', async () => {
  const t = createCylinderPreviewTerrain(64), p = { ...t.metadata.identity, patchId: 'cap-start' as const, u: 0, v: 0 }, index = 64 * 33;
  t.write(t.keyAt(index), -0); const s = new CylinderPreviewSession(t, 'Signed zero', true, true); assert.ok(t.revision > 0); assert.equal(s.modified, false); assert.equal(s.history.statistics.entries, 0);
  s.begin(p, brush, initialCylinderView('map')); s.release(); await s.drainForSave(async () => {}); assert.equal(s.modified, true); s.undo(); assert.ok(Object.is(t.read(t.keyAt(index)), -0)); assert.equal(s.modified, false);
});
test('cylinder Save drains accepted queued input while locked and refuses a failed queued dab', async () => {
  const s = make(); s.begin(center(s), brush, initialCylinderView('map')); for (let i = 1; i < 20; i++) s.move(center(s, i * .002)); assert.throws(() => s.markSaved('bad'), /Finish/); s.locked = true;
  assert.equal(s.begin(center(s), brush, initialCylinderView('map')), false); assert.equal(s.move(center(s)), false); await s.drainForSave(async () => {}); assert.equal(s.painting, false); assert.equal(s.history.statistics.entries, 1); assert.equal((s.statistics.lastStroke as {discardedPositions:number}).discardedPositions, 0); s.markSaved('Saved'); assert.equal(s.modified, false);
  s.locked = false; const hidden = center(s, Math.PI), view = recenterCylinder(s.terrain.geometry, initialCylinderView(), center(s)); s.begin(hidden, brush, view); s.locked = true; await assert.rejects(s.drainForSave(async () => {}), /failed/); assert.equal(s.hasSaved, true); s.dispose();
});
test('cylinder document validates dimensions/detail and cancelled display preparation preserves the caller-owned authority', async () => {
  const setup = { shape: 'cylinder' as const, name: 'Integrated', radiusMeters: 820000, lengthMeters: 1200000, cylinderDetail: 64 as const, cellsPerEdge: 128 as const };
  const doc = await createAtlasDocument(setup, { yield: async () => {} }); assert.equal(documentShape(doc), 'cylinder'); assert.equal(documentModified(doc), false); assert.equal(doc.kind, 'cylinder'); if (doc.kind !== 'cylinder') throw Error('kind'); assert.equal(doc.editor.hasSaved, false); assert.equal(doc.terrain.metadata.geometry.radiusMeters, 820000); doc.editor.dispose();
  for (const bad of [{...setup,lengthMeters:0},{...setup,radiusMeters:Infinity},{...setup,cylinderDetail:512 as 64}]) await assert.rejects(createAtlasDocument(bad));
  const t = createCylinderPreviewTerrain(), before = new Uint32Array(t.copyElevations().buffer); await assert.rejects(prepareCylinderSession(t, 'Cancel', false, { yield: async () => { throw Error('cancelled'); } }), /cancelled/); assert.deepEqual(new Uint32Array(t.copyElevations().buffer), before);
});
test('interactive cylinder dimension extremes retain physical projection/inverse and exact saved metadata', async () => {
  for (const [radiusMeters,lengthMeters] of [[10,1],[1,20],[1e9,1e9],[5e7,1e9]]) {
    const doc=await createAtlasDocument({shape:'cylinder',name:'Dimensions',radiusMeters:radiusMeters!,lengthMeters:lengthMeters!,cylinderDetail:64,cellsPerEdge:128},{yield:async()=>{}});if(doc.kind!=='cylinder')throw Error('kind');
    for(const mode of ['physical','map'] as const)for(const patchId of ['side','cap-start','cap-end'] as const){const p={...doc.terrain.metadata.identity,patchId,u:.17,v:patchId==='side'?lengthMeters!*.5:radiusMeters!*.5},view=recenterCylinder(doc.terrain.geometry,initialCylinderView(mode),p),size={width:412,height:915},screen=projectCylinder(doc.terrain.geometry,p,view,size);assert.ok(screen);const hit=unprojectCylinder(doc.terrain.geometry,screen,view,size);assert.ok(hit);const a=doc.terrain.geometry.referencePosition(p),b=doc.terrain.geometry.referencePosition(hit);assert.ok(Math.hypot(...a.map((n,i)=>n-b[i]!))/Math.max(radiusMeters!,lengthMeters!)<1e-10);}
    doc.editor.dispose();
  }
});
