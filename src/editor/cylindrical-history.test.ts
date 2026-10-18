import assert from 'node:assert/strict';
import test from 'node:test';
import {createCylindricalTerrain} from '../terrain/cylindrical.ts';
import {prepareCylindricalDab} from '../terrain/cylindrical-brush.ts';
import {createCylindricalHistory} from './cylindrical-history.ts';
const identity={worldId:'history',surfaceId:'outside'},point=(v=0)=>({...identity,patchId:'cap-start',u:0,v});
const make=()=>createCylindricalTerrain({terrainId:'h',geometry:{identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:1,lengthMeters:1.6},resolution:{angularSamples:8,axialCells:4,radialCells:4}});
const settings={version:1 as const,tool:'raise' as const,radiusMeters:.001,strengthMeters:10};
function dab(t:ReturnType<typeof make>,v=0){const j=prepareCylindricalDab(t,point(v),settings);while(j.status==='preparing')j.pump();return j;}
const words=(t:ReturnType<typeof make>)=>new Uint32Array(t.copyElevations().buffer);
function paint(t:ReturnType<typeof make>,h:ReturnType<typeof createCylindricalHistory>,v=0){const tx=h.beginOperation(t);tx.commitDab(dab(t,v));tx.finish('released');}
test('read-only prepared changes require the exact authority, ready state and unchanged epoch',()=>{
 const t=make(),j=prepareCylindricalDab(t,point(),settings);assert.throws(()=>[...j.preparedChanges(t)]);while(j.status==='preparing')j.pump();
 assert.throws(()=>[...j.preparedChanges(make())]);const changes=[...j.preparedChanges(t)];assert.equal(changes.length,1);assert.ok(Object.isFrozen(changes[0]));assert.equal(changes[0]!.before,-100);assert.equal(changes[0]!.after,-90);
 const iterator=j.preparedChanges(t);iterator.next();j.cancel();assert.throws(()=>iterator.next());assert.equal(t.revision,0);
 const q=dab(t);t.write(t.keyAt(0),3);assert.throws(()=>[...q.preparedChanges(t)]);
});
test('whole-operation original/final Float32 words survive repeated writes and signed zero',()=>{
 const t=make(),key=t.resolve({...identity,patchId:'cap-start',row:0,column:0});t.write(key,-0);const before=words(t),h=createCylindricalHistory(t),tx=h.beginOperation(t);
 for(let i=0;i<5;i++)tx.commitDab(dab(t));assert.throws(()=>h.undo());assert.throws(()=>h.clear());assert.throws(()=>h.beginOperation(t));tx.finish('released');assert.equal(tx.finish('released'),false);
 const after=words(t),changes=[...h.changes(0)];assert.equal(changes.length,1);assert.equal(changes[0]!.beforeWord,0x80000000);assert.equal(changes[0]!.afterWord,new Uint32Array(new Float32Array([50]).buffer)[0]);
 assert.equal(h.operations[0]!.dabs,5);assert.ok(h.undo());assert.deepEqual(words(t),before);assert.ok(h.redo());assert.deepEqual(words(t),after);assert.equal(h.redo(),false);
});
test('branching, no-op operations and exact entry/memory eviction keep the remaining timeline valid',()=>{
 const t=make(),h=createCylindricalHistory(t,{maxEntries:2,maxBytes:24576});paint(t,h);const first=words(t);paint(t,h,.25);paint(t,h,.5);const after=words(t);
 assert.equal(h.statistics.entries,2);assert.equal(h.statistics.evictions,1);assert.ok(h.statistics.retainedBytes<=24576);h.undo();h.undo();assert.deepEqual(words(t),first);assert.equal(h.undo(),false);h.redo();h.redo();assert.deepEqual(words(t),after);
 h.undo();const empty=h.beginOperation(t);empty.finish('released');assert.ok(h.canRedo);paint(t,h,.75);assert.equal(h.canRedo,false);assert.equal(h.statistics.branches,1);h.clear();assert.equal(h.statistics.retainedBytes,0);
});
test('failed history reservation leaves the pending dab untouched and retains its committed prefix',()=>{
 const t=make(),before=words(t),h=createCylindricalHistory(t,{maxStrokeSamples:1}),tx=h.beginOperation(t);tx.commitDab(dab(t));const prefix=words(t),pending=dab(t,.25);
 assert.throws(()=>tx.commitDab(pending),/budget/);assert.equal(pending.status,'ready');assert.deepEqual(words(t),prefix);pending.cancel();tx.finish('failed');assert.equal(h.operations[0]!.termination,'failed');h.undo();assert.deepEqual(words(t),before);h.redo();assert.deepEqual(words(t),prefix);
 const q=make(),tiny=createCylindricalHistory(q,{maxBytes:1}),op=tiny.beginOperation(q);assert.throws(()=>op.commitDab(dab(q)),/budget/);op.finish('failed');assert.equal(q.revision,0);assert.equal(tiny.statistics.entries,0);
});
test('source conflicts preserve external edits; overlapping Undo conflicts are all-or-nothing',()=>{
 const t=make(),h=createCylindricalHistory(t),tx=h.beginOperation(t);tx.commitDab(dab(t));const prefix=words(t);t.write(t.keyAt(0),321);assert.throws(()=>tx.synchronized());tx.finish('failed');h.undo();assert.equal(t.read(t.keyAt(0)),321);h.redo();assert.equal(t.read(t.keyAt(0)),321);
 const center=t.resolve({...identity,patchId:'cap-start',row:0,column:0});t.write(center,123);const external=words(t),revision=t.revision;assert.throws(()=>h.undo(),/externally/);assert.deepEqual(words(t),external);assert.equal(t.revision,revision);assert.equal(h.statistics.cursor,1);assert.notDeepEqual(external,prefix);
});
test('foreign identity, malformed limits and stale dabs cannot enter a history operation',()=>{
 const t=make(),h=createCylindricalHistory(t);assert.throws(()=>h.beginOperation(make()));for(const limits of [{maxEntries:33},{maxBytes:0},{maxStrokeSamples:65537}])assert.throws(()=>createCylindricalHistory(t,limits));
 const tx=h.beginOperation(t);assert.throws(()=>tx.commitDab(dab(make())));const j=dab(t);t.write(t.keyAt(1),1);assert.throws(()=>tx.commitDab(j));tx.finish('failed');assert.equal(h.statistics.entries,0);assert.throws(()=>[...h.changes(0)]);
});
