import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSolidCubeTerrain} from '../terrain/solid-cube.ts';
import {createSolidCubeHistory} from './solid-cube-history.ts';
import {CubeEditorSession,CUBE_EDITOR_INPUT_LIMIT} from './cube-editor-session.ts';
import {CubeEditorField} from '../rendering/solid-cube-editor-field.ts';
import {prepareCubeDisplayField,cubeTaskYield} from '../rendering/solid-cube-field.ts';
import {SOLID_CUBE_FACES} from '../surfaces/solid-cube.ts';
const identity={worldId:'cube-e-tests',surfaceId:'exterior'};
const make=(n=8)=>createSolidCubeTerrain({terrainId:'cube-e',cellsPerEdge:n,geometry:{identity,provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters:8}});
const point=(u=0,patchId='pz')=>({...identity,patchId,u,v:0});
const settings={version:1,tool:'raise',radiusMeters:1,strengthMeters:600} as const;
const words=(t:ReturnType<typeof make>)=>new Uint32Array(t.copyElevations().buffer);
test('whole-surface opt-in history exceeds 65,536 words: exact signed-zero replay and all-or-nothing final-word conflict',()=>{
 const t=make(128);t.write(t.keyAt(0),-0);const original=words(t),history=createSolidCubeHistory(t,{capacity:'surface'}),operation=history.beginOperation(t);
 for(const patchId of SOLID_CUBE_FACES){operation.startDab(point(0,patchId),{...settings,radiusMeters:4.6});while(operation.stage==='preparing')operation.pumpPreparation(4096);while(operation.stage==='collecting')operation.pumpBookkeeping(4096);assert.equal(operation.stage,'reserved');operation.commitDab();}
 operation.finish('released');const after=words(t);assert.ok(history.operations[0]!.samples>65536);assert.equal(history.operations.length,1);assert.ok(history.statistics.retainedBytes<=8*1024*1024);
 const last=[...history.changes(0)].at(-1)!;t.write(t.keyAt(last.index),10000);const conflict=words(t),revision=t.revision;assert.throws(()=>history.undo(),/source|conflict|match/);assert.deepEqual(words(t),conflict);assert.equal(t.revision,revision);assert.equal(history.statistics.cursor,1);
 t.write(t.keyAt(last.index),new Float32Array(new Uint32Array([last.afterWord]).buffer)[0]!);assert.equal(history.undo(),true);assert.deepEqual(words(t),original);assert.equal(words(t)[0],0x80000000);assert.equal(history.redo(),true);assert.deepEqual(words(t),after);
 assert.equal(createSolidCubeHistory(make(128)).limits.maxStrokeSamples,65536);assert.throws(()=>createSolidCubeHistory(make(128),{capacity:'surface',maxStrokeSamples:t.sampleCount+1}));
});
test('UI scheduler drains retained inputs, one held gesture, exact undo/redo and saved baseline',async()=>{
 const t=make(),editor=new CubeEditorSession(t,'Test',false,{mode:'cooperative'}),original=words(t);editor.visualize=cubeTaskYield;
 assert.equal(editor.begin(point(-2),settings),true);for(let i=0;i<12;i++)assert.equal(editor.accept(point(-2+i/3)),true);editor.release();await editor.drainForSave();
 assert.equal(editor.core.lastStroke?.status,'complete');assert.equal(editor.history.operations.length,1);const after=words(t);assert.notDeepEqual(after,original);assert.equal(editor.modified,true);
 await editor.replay();assert.deepEqual(words(t),original);assert.equal(editor.modified,false);await editor.replay(true);assert.deepEqual(words(t),after);editor.markSaved();assert.equal(editor.modified,false);assert.equal(editor.hasSaved,true);editor.dispose();
});
test('UI overflow is explicit, recoverable, never a successful truncated stroke or save',async()=>{
 const t=make(),editor=new CubeEditorSession(t,'Test',false,{mode:'cooperative'});let unblock!:()=>void;editor.visualize=()=>new Promise<void>(r=>{unblock=r;});
 editor.begin(point(),settings);while(!unblock)await cubeTaskYield();const prefix=words(t);
 for(let i=0;i<CUBE_EDITOR_INPUT_LIMIT;i++)assert.equal(editor.accept(point(i%3)),true);assert.equal(editor.accept(point()),false);unblock();
 while(editor.processing)await cubeTaskYield();assert.equal(editor.needsRecovery,true);assert.equal(editor.core.lastStroke?.status,'cancelled');assert.match(editor.error,/stopped early/);assert.deepEqual(words(t),prefix);await assert.rejects(editor.drainForSave(),/Resolve/);
 editor.keepPartial();assert.equal(editor.needsRecovery,false);await editor.drainForSave();editor.dispose();
});
test('editor field cache preserves accepted physical gradients, every alias, and updated canonical source',async()=>{
 const t=make(16),cache=new CubeEditorField();for(let i=0;i<t.sampleCount;i++)t.write(t.keyAt(i),i===0?-0:(i*17)%410);
 const compare=async()=>{const actual=await cache.refresh(t,()=>true),expected=await prepareCubeDisplayField(t);assert.deepEqual(new Uint32Array(actual.data.buffer),new Uint32Array(expected.data.buffer));};
 await compare();t.write(t.resolve({...identity,patchId:'px',column:16,row:16}),2500);await compare();
});
