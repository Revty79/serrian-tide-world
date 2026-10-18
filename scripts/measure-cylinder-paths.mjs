// Node reference geometry observations, not interactive/mobile cylinder performance.
// node --expose-gc scripts/measure-cylinder-paths.mjs
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {cpus,platform,release} from 'node:os';
import {createCylinderGeometry} from '../src/surfaces/cylinder.ts';
import {reconstructCylinderPath} from '../src/surfaces/cylinder-path.ts';
import {cylinderPathSpacings} from '../src/surfaces/cylinder-path-spacing.ts';
import {createCylindricalTerrain} from '../src/terrain/cylindrical.ts';
import {createHash} from 'node:crypto';
const identity={worldId:'measure-paths',surfaceId:'outside'},geometry=(R,L)=>createCylinderGeometry({identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:R,lengthMeters:L});
const point=(region,theta,v)=>({...identity,patchId:region==='start'?'cap-start':region==='end'?'cap-end':region,u:region==='end'?-theta:theta,v});
const refs=JSON.parse(readFileSync('src/surfaces/fixtures/cylinder-distance-reference.json','utf8'));
const definitions=refs.records.map(c=>({name:c.name,R:1,L:Number(c.length),a:point(c.region0,0,Number(c.coordinate0)),b:point(c.region1,Number(c.angle),Number(c.coordinate1)),reference:c.distance,options:{version:1,absoluteToleranceMeters:Math.max(1e-9,1e-10*Number(c.length))}}));
definitions.push(
 {name:'same-cap-center-crossing',R:2,L:7,a:point('start',0,1.6),b:point('start',Math.PI,1.6),reference:'3.2'},
 {name:'same-end-disk',R:3,L:8,a:point('end',.2,.8),b:point('end',-2.4,2.7)},
 {name:'side-wrap',R:2,L:7,a:point('side',Math.PI-.05,3),b:point('side',-Math.PI+.07,3.3)},
 {name:'opposite-centers',R:1,L:.2,a:point('start',2,0),b:point('end',-1,0),reference:'2.2'},
 {name:'free-azimuth-preference',R:1,L:.2,a:point('end',2,0),b:point('start',-1,0),reference:'2.2',options:{version:1,continuity:{patchId:'cap-end',direction:[0,1,0]}}},
 {name:'exact-cut-positive',R:1,L:20,a:point('side',0,10),b:point('side',Math.PI,10),reference:String(Math.PI)},
 {name:'near-cut-negative',R:1,L:20,a:point('side',0,10),b:point('side',Math.PI-1e-8,10),reference:String(Math.PI-1e-8),options:{version:1,continuity:{patchId:'side',direction:[0,-1,0]}}},
 {name:'end-cap-preference-tie',R:1,L:.2,a:point('side',0,.1),b:point('side',Math.PI,.1),reference:'2.2',options:{version:1,continuity:{patchId:'side',direction:[0,0,1]}}},
 {name:'start-rim-fold',R:1,L:2,a:point('side',0,0),b:point('start',0,.2),reference:'.8',options:{version:1,continuity:{patchId:'side',direction:[0,0,-1]}}},
 {name:'end-rim-fold',R:1,L:2,a:point('side',0,2),b:point('end',0,.2),reference:'.8',options:{version:1,continuity:{patchId:'side',direction:[0,0,1]}}},
 {name:'zero-rim-alias',R:1,L:2,a:point('side',.3,2),b:point('end',.3,1),reference:'0'},
);
for(const scale of [1e-100,1e-8,1e8,1e100])definitions.push({name:`scaled-${scale}`,R:2*scale,L:7*scale,a:point('start',2,0),b:point('end',-1,.6*scale),reference:String(10.4*scale)});
for(const ratio of [1e-9,1e9])definitions.push({name:`aspect-${ratio}`,R:1,L:ratio,a:point('start',.2,.97),b:point('end',-2.9,.82)});
const records=[];
for(const c of definitions){const g=geometry(c.R,c.L),ts=performance.now(),path=reconstructCylinderPath(g,c.a,c.b,c.options??{version:1}),constructionMs=performance.now()-ts;
 const samples=[];for(let i=0;i<=32;i++)samples.push(path.atDistance(path.lengthMeters*(i/32)));
 for(const piece of path.pieces){for(const d of [piece.fromMeters,piece.toMeters])for(const boundary of ['incoming','outgoing'])samples.push({...path.atDistance(d,boundary),boundary});const step=Math.min(piece.lengthMeters/10000,path.lengthMeters/10000);for(const d of [piece.toMeters-step,piece.toMeters+step])if(d>=0&&d<=path.lengthMeters)samples.push(path.atDistance(d));}
 assert.ok(path.shortestExcessUpperBoundMeters<=path.requestedToleranceMeters);records.push({...c,path,constructionMs,samples});
}
if(!global.gc)throw Error('Use --expose-gc.');
await new Promise(setImmediate);global.gc();global.gc();const memoryBefore=process.memoryUsage();
let seed=83;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296),times=[],evaluationTimes=[],failures=[];let maxHeap=memoryBefore.heapUsed,maxBoxes=0,maxQueue=0,maxPieces=0,maxCandidates=0,checksum=0;
const stressStart=performance.now();
for(let i=0;i<1500;i++){
 const R=1000000,L=R*10**(-6+12*rand()),g=geometry(R,L),p=()=>{const r=['side','start','end'][Math.floor(3*rand())];return point(r,(2*rand()-1)*Math.PI,rand()*(r==='side'?L:R));},a=p(),b=p();
 try{const ts=performance.now(),path=reconstructCylinderPath(g,a,b,{version:1});times.push(performance.now()-ts);maxBoxes=Math.max(maxBoxes,path.distance.evaluatedBoxes);maxQueue=Math.max(maxQueue,path.distance.peakQueuedBoxes);maxPieces=Math.max(maxPieces,path.pieces.length);maxCandidates=Math.max(maxCandidates,path.candidateCount);assert.ok(path.shortestExcessUpperBoundMeters<=path.requestedToleranceMeters);
 if(i<100){const begin=performance.now();for(let j=0;j<=256;j++){const q=path.atDistance(path.lengthMeters*(j/256));checksum+=q.referencePosition[0]/R;}evaluationTimes.push(performance.now()-begin);}
 }catch(e){failures.push({index:i,code:e.code,message:e.message});}
 if(i%100===0)maxHeap=Math.max(maxHeap,process.memoryUsage().heapUsed);
}
const workloadMs=performance.now()-stressStart;
const path=reconstructCylinderPath(geometry(1000000,4000000),point('side',0,500000),point('side',0,3000000),{version:1}),sampler=cylinderPathSpacings(path,{spacingMeters:path.lengthMeters/65536});const begin=performance.now();let points=0;
for(const value of sampler){points++;checksum+=value.referencePosition[2]/1000000;}const samplingMs=performance.now()-begin,spacingEnd=sampler.next();assert.ok(spacingEnd.done);assert.equal(points,65536);
const cancelled=cylinderPathSpacings(path,{spacingMeters:1000});cancelled.next();const cancel=cancelled.return();assert.ok(cancel.done);assert.ok(cancelled.next().done);
const safeStops=[];for(const [name,fn]of [
 ['path-work',()=>reconstructCylinderPath(geometry(1,2),point('start',0,.7),point('end',2.4,.8),{version:1,maxBoxes:1})],
 ['path-precision',()=>reconstructCylinderPath(geometry(1,2),point('start',0,.7),point('end',2.4,.8),{version:1,absoluteToleranceMeters:1e-30})],
 ['spacing-work',()=>cylinderPathSpacings(path,{spacingMeters:1})],
 ['cumulative-precision',()=>reconstructCylinderPath(geometry(1,1e30),point('start',0,0),point('end',0,0),{version:1})],
 ]){try{fn();throw Error(`Expected safe stop ${name}`);}catch(e){assert.ok(['precision','work-budget'].includes(e.code));safeStops.push({name,code:e.code,message:e.message});}}
await new Promise(setImmediate);global.gc();global.gc();const memoryAfter=process.memoryUsage();assert.equal(memoryAfter.arrayBuffers-memoryBefore.arrayBuffers,0);assert.equal(failures.length,0);
const t=createCylindricalTerrain({terrainId:'path-isolation',geometry:geometry(1,2).metadata,resolution:{angularSamples:1024,axialCells:512,radialCells:256}});t.write(t.keyAt(3),-0);t.write(t.keyAt(7),200);const sha=a=>createHash('sha256').update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).digest('hex'),hashBefore=sha(t.copyElevations()),revision=t.revision;
for(let i=0;i<100;i++)reconstructCylinderPath(t.geometry,point('side',.1,.2),point('end',2.7,.83),{version:1});const hashAfter=sha(t.copyElevations());assert.equal(hashBefore,hashAfter);assert.equal(t.revision,revision);
const stats=a=>{const s=[...a].sort((x,y)=>x-y);return {min:s[0],median:s[Math.floor((s.length-1)*.5)],p95:s[Math.floor((s.length-1)*.95)],max:s.at(-1)};};
writeFileSync('docs/evidence/a7-b2b1-path-measurements.json',JSON.stringify({timestamp:new Date().toISOString(),environment:{node:process.version,cpu:cpus()[0]?.model,platform:platform(),release:release()},records,stress:{seed:83,queries:1500,failed:failures.length,failures,constructionMs:stats(times),workloadMs,maxBoxes,maxQueue,maxPieces,maxCandidates,evaluationBatches:{batches:100,pointsPerBatch:257,batchMs:stats(evaluationTimes)}},spacing:{points,samplingMs,spacingEnd:spacingEnd.value,cancellation:cancel.value},safeStops,memory:{memoryBefore,memoryAfter,maxSampledHeap:maxHeap,retainedArrayBufferDelta:memoryAfter.arrayBuffers-memoryBefore.arrayBuffers},authorityPreservation:{sampleCount:t.sampleCount,authorityBytes:t.elevationByteLength,hashBefore,hashAfter,revisionBefore:revision,revisionAfter:t.revision},checksum,caveat:'One desktop Node workload, not mobile/browser cylinder latency or a controlled speedup comparison. Explicit GC/stack clearance, fixture/proof copies and maximum authority creation are outside measured path work. Heap includes caller/VM/receipt state; no exact JS working-set claim. Route and spacing state are O(1); evaluations perform no global distance queries.'},null,2)+'\n');
console.log(JSON.stringify({records:records.length,queries:times.length,failures,constructionMs:stats(times),maxBoxes,maxCandidates,spacing:{points,samplingMs},memoryDelta:memoryAfter.arrayBuffers-memoryBefore.arrayBuffers},null,2));
