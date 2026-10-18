// Numerical-only B2B2 observations. Run: node --expose-gc scripts/measure-cylinder-strokes.mjs
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { createCylindricalTerrain } from '../src/terrain/cylindrical.ts';
import { cylinderBrushCandidates } from '../src/terrain/cylindrical-candidates.ts';
import { prepareCylindricalDab } from '../src/terrain/cylindrical-brush.ts';
import { createCylindricalHistory } from '../src/editor/cylindrical-history.ts';
import { beginCylindricalStroke } from '../src/terrain/cylindrical-stroke.ts';

const identity = {worldId:'b2b2-measurement',surfaceId:'outside'}, tools=['raise','lower','smooth','flatten'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const words=t=>new Uint32Array(t.copyElevations().buffer);
const digest=t=>hash(Buffer.from(t.copyElevations().buffer));
const point=(region,coordinate,angle=.13)=>({...identity,patchId:region==='start'?'cap-start':region==='end'?'cap-end':'side',u:region==='end'?-angle:angle,v:coordinate});
const make=(resolution,R=1,L=1.6)=>createCylindricalTerrain({terrainId:'measurement',geometry:{identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:R,lengthMeters:L},resolution});
const settings=(tool,radiusMeters,reference=false)=>({version:1,tool,radiusMeters,...(reference?{maxFalloffError:1e-8}:{}),...(tool==='raise'||tool==='lower'?{strengthMeters:43.7}:{intensity:.65,...(tool==='flatten'?{targetElevation:-250}:{})})});
const distribution=a=>({samples:a.length,min:Math.min(...a),median:[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)],p95:[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*.95))],max:Math.max(...a),sum:a.reduce((x,y)=>x+y,0)});
function drain(s,batch=64,trace){let n=0;const durations=[],committing=[];while(s.statistics.hasPendingWork&&(s.status==='drawing'||s.status==='draining')){assert.ok(++n<2000000);const count=s.statistics.committedDabs,start=performance.now();s.pump(batch);const elapsed=performance.now()-start;durations.push(elapsed);if(s.statistics.committedDabs>count){committing.push(elapsed);trace?.push({...s.statistics.lastCommittedCenter});}}return{pumpMs:distribution(durations),committingPumpMs:committing.length?distribution(committing):null};}
function reversible(t,h,before){const final=words(t),a=performance.now();assert.ok(h.undo());const undoMs=performance.now()-a;assert.deepEqual(words(t),before);const b=performance.now();assert.ok(h.redo());const redoMs=performance.now()-b;assert.deepEqual(words(t),final);return{undoMs,redoMs,exactUndo:true,exactRedo:true,finalSha256:hash(Buffer.from(final.buffer))};}
const fixture=JSON.parse(readFileSync(new URL('../src/terrain/fixtures/cylinder-stroke-reference.json',import.meta.url),'utf8'));
function measureReferences(){ const references=[];
for(const c of fixture.cases)for(const tool of tools)for(const density of ['sparse','dense']){
 const t=make(fixture.resolution,1,Number(c.length)),source=new Float32Array(Uint32Array.from(c.beforeWords).buffer);for(const key of t.samples())t.write(key,source[key.index]);
 const before=words(t),h=createCylindricalHistory(t),input=density==='sparse'?c.inputs:c.denseInputs,q=p=>point(p.region,Number(p.coordinate),Number(p.angle)),first=q(input[0]);
 const s=beginCylindricalStroke(t,h,first,settings(tool,Number(c.brushRadius),true),{spacingMeters:Number(c.spacing),initialDirection:c.initialDirection?{patchId:first.patchId,direction:c.initialDirection}:undefined});
 for(const p of input.slice(1))s.move(q(p),'shortest-surface');s.release();const trace=[],timing=drain(s,density==='dense'?1:64,trace);assert.equal(s.status,'complete');assert.equal(trace.length,c.dabCount);
 const centerError=Math.max(...trace.map((p,i)=>{const a=t.geometry.referencePosition(p),b=t.geometry.referencePosition(q(c.centers[i]));return Math.hypot(...a.map((v,j)=>v-b[j]));}));
 const actual=t.copyElevations(),expected=c.expected[tool],magnitude=Math.max(1,...actual.map(Math.abs),...expected.values.map(v=>Math.abs(Number(v))));
 const bound=s.statistics.sumPreRoundElevationErrorMeters+c.dabCount*(magnitude*2**-23+2**-149)+1500*c.dabCount*centerError/Number(c.brushRadius);
 const maxError=Math.max(...actual.map((v,i)=>Math.abs(v-Number(expected.values[i]))));assert.ok(maxError<=bound);assert.ok(centerError<1e-8);
 const changedWords=[...h.changes(0)],wordMatches=[...words(t)].filter((v,i)=>v===expected.words[i]).length;
 references.push({name:c.name,tool,density,dabCount:c.dabCount,trace,maxCenterErrorMeters:centerError,maxElevationErrorMeters:maxError,declaredComparisonBoundMeters:bound,independentWordMatches:wordMatches,totalSamples:actual.length,initialWords:[...before],finalWords:[...words(t)],changedWords,statistics:s.statistics,history:h.statistics,timing,...reversible(t,h,before)});
}
return references;} const references=measureReferences();
const profiles=[
 {name:'representative-round-trip',resolution:{angularSamples:128,axialCells:64,radialCells:32},radius:.0837,spacing:.021013,first:['start',0],route:[['start',1],['side',1.6],['end',0],['end',1],['side',0],['start',0]]},
 {name:'maximum-side',resolution:{angularSamples:1024,axialCells:512,radialCells:256},radius:.0137,spacing:.00625,first:['side',.8],route:[['side',.825]]},
 {name:'maximum-rim',resolution:{angularSamples:1024,axialCells:512,radialCells:256},radius:.0237,spacing:.00625,first:['side',.02],route:[['start',.96],['side',.03]]},
 {name:'maximum-center',resolution:{angularSamples:1024,axialCells:512,radialCells:256},radius:.0137,spacing:.005,first:['start',0],route:[['start',.01],['start',0]]},
];
// Seed bounded canonical candidate neighborhoods outside timed work. No full-field copies per dab.
function seedLocal(t,centers,radius){const seen=new Set();for(const center of centers)for(const item of cylinderBrushCandidates(t,center,radius*1.1).samples()){seen.add(item.key.index);if(seen.size>=16384)break;}for(const index of seen)t.write(t.keyAt(index),((index*13)%17-8)*20);}
function measureCosts(){ const records=[],dabCosts=[];
for(const profile of profiles)for(const tool of tools){
 const R=1e6,ps=p=>point(p[0],p[1]*R),first=ps(profile.first),route=profile.route.map(ps),t=make(profile.resolution,R,1.6*R);seedLocal(t,[first,...route],profile.radius*R);
 const h=createCylindricalHistory(t),before=words(t),start=performance.now(),s=beginCylindricalStroke(t,h,first,settings(tool,profile.radius*R),{spacingMeters:profile.spacing*R});for(const p of route)s.move(p,'shortest-surface');s.release();const timing=drain(s);const strokeMs=performance.now()-start;assert.equal(s.status,'complete');
 records.push({profile:profile.name,tool,resolution:profile.resolution,samples:t.sampleCount,strokeMs,...timing,statistics:s.statistics,history:h.statistics,...reversible(t,h,before)});
 console.log(`${profile.name} ${tool}: ${strokeMs.toFixed(2)} ms / ${s.statistics.committedDabs} dabs`);
 const q=make(profile.resolution,R,1.6*R);seedLocal(q,[first],profile.radius*R);const hh=createCylindricalHistory(q),op=hh.beginOperation(q),begin=performance.now(),job=prepareCylindricalDab(q,first,settings(tool,profile.radius*R));const constructMs=performance.now()-begin,slices=[];while(job.status==='preparing'){const a=performance.now();job.pump(64);slices.push(performance.now()-a);}const prepared=performance.now(),writes=op.commitDab(job),commitMs=performance.now()-prepared,finish=performance.now();op.finish('released');const finishMs=performance.now()-finish;
 dabCosts.push({profile:profile.name,tool,constructMs,prepareSlicesMs:distribution(slices),prepareTotalMs:slices.reduce((a,b)=>a+b,0),historyPreflightAndAtomicCommitMs:commitMs,historyFinishMs:finishMs,writes,statistics:job.statistics,history:hh.statistics});
}
return {records,dabCosts};} const {records,dabCosts}=measureCosts();
const tick=()=>new Promise(r=>setImmediate(r)),gc=async()=>{assert.ok(global.gc,'Use --expose-gc');await tick();global.gc();await tick();global.gc();return process.memoryUsage();};
const memory=[];
async function measureMemory(profile){
 const t=make(profile.resolution),h=createCylindricalHistory(t),baseline=await gc(),s=beginCylindricalStroke(t,h,point(...profile.first),settings('smooth',profile.radius),{spacingMeters:profile.spacing});
 // Non-flat local source without retaining temporary buffers across the baseline.
 s.cancel();h.clear();seedLocal(t,[point(...profile.first),...profile.route.map(p=>point(...p))],profile.radius);
 const clean=await gc(),stroke=beginCylindricalStroke(t,h,point(...profile.first),settings('smooth',profile.radius),{spacingMeters:profile.spacing});for(const p of profile.route)stroke.move(point(...p),'shortest-surface');stroke.release();drain(stroke);const retained=await gc(),payload=h.statistics.retainedBytes;h.undo();h.redo();const afterHistory=await gc();h.clear();stroke.dispose();const cleared=await gc();
 assert.equal(retained.arrayBuffers-clean.arrayBuffers,payload);assert.equal(afterHistory.arrayBuffers-clean.arrayBuffers,payload);assert.equal(cleared.arrayBuffers-clean.arrayBuffers,0);
 return {profile:profile.name,excludedAuthorityBytes:t.elevationByteLength,initialHeapBytes:baseline.heapUsed,baseline:clean,retained,afterHistory,cleared,declaredTypedPayloadBytes:payload,retainedArrayBufferDelta:retained.arrayBuffers-clean.arrayBuffers,afterHistoryArrayBufferDelta:afterHistory.arrayBuffers-clean.arrayBuffers,afterClearArrayBufferDelta:cleared.arrayBuffers-clean.arrayBuffers,finishedSessionStillReferenced:true};
}
for(const profile of profiles.slice(1))memory.push(await measureMemory(profile));
const t=make({angularSamples:16,axialCells:4,radialCells:3}),h=createCylindricalHistory(t,{maxEntries:4,maxBytes:49152}),sessions=[],baseline=await gc(),evictionStart=performance.now();
for(let i=0;i<100;i++){const s=beginCylindricalStroke(t,h,point('side',.8,i*.07),settings('raise',.217));s.release();drain(s);sessions.push(s);}const retained=await gc(),retainedPayload=h.statistics.retainedBytes,evictionStatistics=h.statistics;assert.equal(h.statistics.entries,4);assert.equal(h.statistics.evictions,96);assert.equal(retained.arrayBuffers-baseline.arrayBuffers,retainedPayload);h.clear();const cleared=await gc();assert.equal(cleared.arrayBuffers-baseline.arrayBuffers,0);
const eviction={completedSessionsRetained:sessions.length,workloadIncludingGCms:performance.now()-evictionStart,statistics:evictionStatistics,retainedArrayBufferDelta:retained.arrayBuffers-baseline.arrayBuffers,afterClearArrayBufferDelta:cleared.arrayBuffers-baseline.arrayBuffers};
const longT=make({angularSamples:16,axialCells:4,radialCells:3}),longBefore=words(longT),longH=createCylindricalHistory(longT),longS=beginCylindricalStroke(longT,longH,point('side',.8,0),settings('raise',.217),{spacingMeters:.1,maxPendingPositions:8}),longStart=performance.now();
for(let i=1;i<=2000;i++){longS.move(point('side',.8,i*.01));if(i%8===0)drain(longS);}longS.release();drain(longS);assert.equal(longS.statistics.committedDabs,201);assert.equal(longH.statistics.entries,1);const longStroke={processingMs:performance.now()-longStart,statistics:longS.statistics,history:longH.statistics,...reversible(longT,longH,longBefore)};
const stops=[];
for(const name of ['maximum-center-history','aggregate-query','queue','external-source']){
 const max=name==='maximum-center-history',t=make(max?profiles[1].resolution:{angularSamples:8,axialCells:4,radialCells:4}),h=createCylindricalHistory(t,max?{maxStrokeSamples:64}:{}),before=words(t),s=beginCylindricalStroke(t,h,point('start',0,0),settings('raise',max?.0137:.001),name==='aggregate-query'?{maxTotalDistanceQueries:1,spacingMeters:.25}:name==='queue'?{maxPendingPositions:1}:{});
 try{drain(s);if(name==='external-source')t.write(t.keyAt(0),1234);s.move(point('start',.25,0),'shortest-surface');if(name==='queue')s.move(point('start',.5,0),'shortest-surface');s.release();drain(s);assert.fail('Expected bounded stop');}catch(e){assert.equal(s.status,'failed');}
 const prefix=words(t),externallyEdited=name==='external-source';let proof={};if(h.canUndo){h.undo();const undone=words(t);if(externallyEdited){assert.equal(undone[0],prefix[0]);before[0]=prefix[0];}assert.deepEqual(undone,before);h.redo();assert.deepEqual(words(t),prefix);proof={exactUndo:true,exactRedo:true,externalUnrelatedWordPreserved:externallyEdited};}else assert.deepEqual(prefix,before);
 stops.push({name,status:s.status,failure:s.failure,statistics:s.statistics,history:h.statistics,...proof});
}
{
 const t=make(profiles[0].resolution,1e6,1.6e6),h=createCylindricalHistory(t),before=words(t),s=beginCylindricalStroke(t,h,point('start',0),settings('raise',83700),{spacingMeters:20925});
 for(const p of profiles[0].route)s.move(point(p[0],p[1]*1e6),'shortest-surface');s.release();
 assert.throws(()=>drain(s),/precision floor/);assert.equal(s.status,'failed');
 stops.push({name:'existing-B2A-exact-boundary-precision-stop',status:s.status,failure:s.failure,statistics:s.statistics,history:h.statistics,...reversible(t,h,before)});
}
const receipt={baseline:'f424d09a144c2696dbc2aa5f9cc5570a7f82c4c6',environment:{node:process.version,platform:process.platform,release:os.release(),cpu:os.cpus()[0].model,date:new Date().toISOString()},method:'Single-run local numerical observations, not browser/mobile frame measurements or a controlled improvement comparison. Authority creation, bounded source seeding, proof copies/hashes and GC excluded from timed stroke/dab work. Caller stats/clock overhead included. Pump batches 64 except dense reference 1. GC baselines follow event-loop yields and two forced collections. maxBytes bounds typed history payload; JS Map/object/array and VM overhead additional and bounded by counts. Completed sessions deliberately remain referenced during clear/eviction checks.',references,records,dabCosts,memory,eviction,longStroke,stops};
writeFileSync('docs/evidence/a7-b2b2-stroke-measurements.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({references:references.length,records:records.length,dabCosts:dabCosts.length,memory:memory.map(x=>({profile:x.profile,retained:x.retainedArrayBufferDelta,cleared:x.afterClearArrayBufferDelta})),eviction,longStrokeMs:longStroke.processingMs,stops:stops.map(x=>({name:x.name,failure:x.failure}))},null,2));
