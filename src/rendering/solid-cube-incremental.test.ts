import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSolidCubeTerrain} from '../terrain/solid-cube.ts';
import {CubeEditorField} from './solid-cube-editor-field.ts';
import {prepareCubeDisplayField} from './solid-cube-field.ts';
import {createResponsiveSolidCubeSession} from '../editor/solid-cube-responsive-session.ts';
const identity={worldId:'incremental-cube',surfaceId:'exterior'};
const make=(n=8)=>createSolidCubeTerrain({terrainId:'incremental',cellsPerEdge:n,geometry:{identity,provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters:8}});
const same=(a:Float32Array,b:Float32Array)=>assert.deepEqual(new Uint32Array(a.buffer),new Uint32Array(b.buffer));
test('publication-driven stencils equal complete reconstruction at every N8 vertex, including folds and singular corners',async()=>{
 const terrain=make(),cache=new CubeEditorField();await cache.refresh(terrain,()=>true);
 for(let index=0;index<terrain.sampleCount;index++){
  const revision=terrain.revision;terrain.write(terrain.keyAt(index),index%2?-0:1800+index);
  cache.queue(terrain,{kind:'delta',indices:new Uint32Array([index]),sourceRevision:revision,revision:terrain.revision});
  const actual=await cache.refresh(terrain,()=>true),expected=await prepareCubeDisplayField(terrain);same(actual.data,expected.data);
 }
 assert.equal(cache.statistics.fullRefreshes,1);assert.equal(cache.statistics.incrementalRefreshes,terrain.sampleCount);assert.equal(cache.statistics.canonicalWordsRead,2*terrain.sampleCount);
});
for(const n of[128,256])test(`N${n} burst publications keep exact signed words and snapshot epochs without scanning canonical terrain again`,async()=>{
 const terrain=make(n),cache=new CubeEditorField();await cache.refresh(terrain,()=>true);let expectedRevision=terrain.revision;
 for(const face of['px','nx','py','ny','pz','nz'] as const)for(const[column,row]of[[0,0],[n,n],[0,n],[n,0],[1,n/2],[n-1,n/2],[n/2,1],[n/2,n-1],[n/2,n/2]]){
  const key=terrain.resolve({...identity,patchId:face,column:column!,row:row!});terrain.write(key,key.index%3?-0:key.index+42);cache.queue(terrain,{kind:'delta',indices:new Uint32Array([key.index]),sourceRevision:expectedRevision,revision:terrain.revision});expectedRevision=terrain.revision;
 }
 const actual=await cache.refresh(terrain,()=>true),expected=await prepareCubeDisplayField(terrain);same(actual.data,expected.data);assert.equal(actual.sourceRevision,terrain.revision);assert.equal(cache.statistics.fullRefreshes,1);assert.ok(cache.statistics.canonicalWordsRead<terrain.sampleCount+60);
 const sourceRevision=terrain.revision,indices=new Uint32Array([0]);terrain.write(terrain.keyAt(0),999);cache.queue(terrain,{kind:'delta',indices,sourceRevision,revision:terrain.revision});let alive=true;const inFlight=cache.refresh(terrain,()=>alive);const old=await inFlight;alive=false;assert.equal(old.sourceRevision,terrain.revision);same(old.data,(await prepareCubeDisplayField(terrain)).data);
});
test('untracked changes force complete truthful reconstruction and disposed preparation can be retried',async()=>{
 const terrain=make(),cache=new CubeEditorField();await cache.refresh(terrain,()=>true);terrain.write(terrain.keyAt(0),3000);same((await cache.refresh(terrain,()=>true)).data,(await prepareCubeDisplayField(terrain)).data);assert.equal(cache.statistics.fullRefreshes,2);
 await assert.rejects(cache.refresh(terrain,()=>false),/closed/);same((await cache.refresh(terrain,()=>true)).data,(await prepareCubeDisplayField(terrain)).data);
});
test('optional publication handoff cannot mutate history; unread handoffs request a full display refresh',async()=>{
 const terrain=make(),core=createResponsiveSolidCubeSession(terrain,{mode:'cooperative',trackPublications:true}),before=new Uint32Array(terrain.copyElevations().buffer);
 core.begin({...identity,patchId:'pz',u:0,v:0},{version:1,tool:'raise',radiusMeters:2,strengthMeters:600});core.release();while(core.stroke)core.pump(4096);
 const after=new Uint32Array(terrain.copyElevations().buffer),publication=core.history.takePublication();assert.equal(publication?.kind,'delta');if(publication?.kind==='delta')publication.indices.fill(terrain.sampleCount-1);
 core.undo();same(terrain.copyElevations(),new Float32Array(before.buffer));core.redo();same(terrain.copyElevations(),new Float32Array(after.buffer));assert.equal(core.history.takePublication()?.kind,'all');core.dispose();
});
test('a later numerical publication cannot leak into an in-flight earlier display epoch',async()=>{
 const terrain=make(128),cache=new CubeEditorField();await cache.refresh(terrain,()=>true);const start=terrain.revision,indices=Uint32Array.from({length:7500},(_,i)=>i);
 for(const index of indices)terrain.write(terrain.keyAt(index),index/17);cache.queue(terrain,{kind:'delta',indices,sourceRevision:start,revision:terrain.revision});
 const oldRevision=terrain.revision,expectedOld=await prepareCubeDisplayField(terrain),inFlight=cache.refresh(terrain,()=>true);
 terrain.write(terrain.keyAt(7000),9999);cache.queue(terrain,{kind:'delta',indices:new Uint32Array([7000]),sourceRevision:oldRevision,revision:terrain.revision});
 const actualOld=await inFlight;assert.equal(actualOld.sourceRevision,oldRevision);same(actualOld.data,expectedOld.data);
 const latest=await cache.refresh(terrain,()=>true);assert.equal(latest.sourceRevision,terrain.revision);same(latest.data,(await prepareCubeDisplayField(terrain)).data);assert.equal(cache.statistics.fullRefreshes,1);
});
