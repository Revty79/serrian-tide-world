// Numerical adapter/display allocation observations; browser evidence is recorded separately.
// Run with: node --expose-gc scripts/measure-cylinder-preview.mjs
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {cpus,release} from 'node:os';
import {createHash} from 'node:crypto';
import {createCylinderPreviewTerrain,CylinderPreviewSession} from '../src/editor/cylinder-preview-session.ts';
import {initialCylinderView} from '../src/rendering/cylindrical-view.ts';
import {cylinderRasterSteps} from '../src/rendering/cylindrical-raster.ts';
const gc=async()=>{assert.ok(global.gc,'Use --expose-gc');await new Promise(setImmediate);global.gc();await new Promise(setImmediate);global.gc();return process.memoryUsage();};
const hash=t=>createHash('sha256').update(Buffer.from(t.copyElevations().buffer)).digest('hex');
const pump=s=>{let calls=0;while(s.painting){assert.ok(++calls<100000);s.pump(10);}};
async function renderObservations(s){
 const baseline=await gc(),size={width:800,height:600},budget=20000,job=cylinderRasterSteps(s.cache,initialCylinderView(),size,budget);assert.equal(job.next().done,false);const pending=await gc();
 const scale=Math.sqrt(budget/(size.width*size.height)),pixels=Math.floor(size.width*scale)*Math.floor(size.height*scale)*4;
 assert.equal(pending.arrayBuffers-baseline.arrayBuffers,s.cache.byteLength+pixels);
 job.return();const cancelled=await gc();assert.equal(cancelled.arrayBuffers-baseline.arrayBuffers,0);
 return{pendingArrayBufferDelta:pending.arrayBuffers-baseline.arrayBuffers,expectedSnapshotBytes:s.cache.byteLength,expectedRasterBytes:pixels,cancelledArrayBufferDelta:cancelled.arrayBuffers-baseline.arrayBuffers};
}
async function measure(n){
 const t=createCylinderPreviewTerrain(n),authorityBytes=t.elevationByteLength,blank=hash(t),baseline=await gc(),start=performance.now(),s=new CylinderPreviewSession(t);for(const _ of s.cache.prepare())void _;
 const preparationMs=performance.now()-start,prepared=await gc();assert.equal(prepared.arrayBuffers-baseline.arrayBuffers,s.cache.byteLength);
 const center={...t.metadata.identity,patchId:'cap-start',u:0,v:0},settings={version:1,tool:'raise',radiusMeters:83700,strengthMeters:1200},view=initialCylinderView('map');
 const begun=performance.now();s.begin(center,settings,view);s.release();pump(s);const strokeMs=performance.now()-begun,final=hash(t);s.undo();assert.equal(hash(t),blank);s.redo();assert.equal(hash(t),final);
 s.requestPreview(center,settings,view);while(s.previewPending)s.pumpPreview();const retained=await gc(),payload=s.cache.byteLength+s.history.statistics.retainedBytes+(s.lastDab?.indices.byteLength??0)+(s.stencil?.indices.byteLength??0);
 assert.equal(retained.arrayBuffers-baseline.arrayBuffers,payload);
 const render=await renderObservations(s);
 for(let i=0;i<100;i++){s.requestPreview(undefined,undefined,view);s.requestPreview(center,settings,view);s.pumpPreview();s.requestPreview(undefined,undefined,view);}const afterCancelled=await gc(),withoutStencil=s.cache.byteLength+s.history.statistics.retainedBytes+(s.lastDab?.indices.byteLength??0);assert.equal(afterCancelled.arrayBuffers-baseline.arrayBuffers,withoutStencil);
 const stats={...s.statistics},history=s.history.statistics;const colors=s.cache.byteLength,lastDabBytes=s.lastDab?.indices.byteLength??0;
 s.dispose();const disposed=await gc();assert.equal(disposed.arrayBuffers-baseline.arrayBuffers,0);assert.equal(s.cache.byteLength,0);assert.equal(s.history.statistics.retainedBytes,0);assert.equal(s.terrain,t);
 return{n,samples:t.sampleCount,authorityBytes,preparationMs,strokeMs,exactUndo:true,exactRedo:true,blankSha256:blank,finalSha256:final,canonicalColorBytes:colors,lastDabBytes,history,statistics:stats,baseline,prepared,retained,afterCancelled,disposed,retainedArrayBufferDelta:retained.arrayBuffers-baseline.arrayBuffers,expectedRetainedPayload:payload,after100CancelledPreviewsArrayBufferDelta:afterCancelled.arrayBuffers-baseline.arrayBuffers,expectedAfterCancellationPayload:withoutStencil,disposedArrayBufferDelta:disposed.arrayBuffers-baseline.arrayBuffers,disposedSessionAndAuthorityStillReferenced:true,render};
}
const records=[];for(const n of [64,128,256]){records.push(await measure(n));console.log(n,records.at(-1).retainedArrayBufferDelta,records.at(-1).disposedArrayBufferDelta);}
writeFileSync('docs/evidence/a7-c-preview-allocation.json',JSON.stringify({baseline:'a5d7c8bc329f946628be1190b70c0a6604c75e4b',timestamp:new Date().toISOString(),environment:{node:process.version,platform:process.platform,release:release(),cpu:cpus()[0].model},method:'Node adapter/display observations; not browser/mobile memory or controlled speedup. Authority exists before GC baseline and remains referenced. Event-loop yields plus two explicit collections before each reading. Derived RGBA only, no display elevation buffer. Pending raster snapshot is coherently copied color data; generator cancellation releases it. 100 dry-preview cancellations do not mutate terrain. Disposed session deliberately remains referenced; derived cache/history/stencils release while its caller-owned authority remains. JS objects, VM/Map overhead, native Canvas and browser GPU/compositor are additional; browser receipt records actual heap and backing dimensions.',records},null,2)+'\n');
