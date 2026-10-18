// Node-only numerical workload; not a cylinder browser/editor performance claim.
// node --expose-gc scripts/measure-cylinder-distance.mjs
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { cpus, platform, release } from 'node:os';
import { createCylinderGeometry } from '../src/surfaces/cylinder.ts';
const identity={worldId:'measurement',surfaceId:'exterior'};
const geometry=length=>createCylinderGeometry({identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:1,lengthMeters:length});
const point=(region,theta,v)=>({...identity,patchId:region==='side'?'side':region==='start'?'cap-start':'cap-end',u:region==='end'?-theta:theta,v});
const fixture=JSON.parse(readFileSync('src/surfaces/fixtures/cylinder-distance-reference.json'));
const references=fixture.records.map(c=>{
 const g=geometry(Number(c.length)),start=performance.now();
 const result=g.globalDistance(point(c.region0,0,Number(c.coordinate0)),point(c.region1,Number(c.angle),Number(c.coordinate1)),{absoluteToleranceMeters:Math.max(1e-10,1e-11*Number(c.length))});
 const queryMs=performance.now()-start,reference=Number(c.distance);
 assert.ok(result.lowerBoundMeters<=reference&&reference<=result.upperBoundMeters);
 return {name:c.name,reference:c.distance,errorVsRoundedReferenceMeters:result.value-reference,queryMs,...result};
});
let seed=17;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
const cases=Array.from({length:1500},(_,i)=>{
 const length=10**(-6+12*rand()),q0=i%4===0?1:i%4===1?1-10**(-2-10*rand()):rand(),q1=i%5===0?1:i%5===1?1-10**(-2-10*rand()):rand(),angle=i%7===0?Math.PI:Math.PI*rand();
 return {length,q0,q1,angle,g:geometry(length)};
});
if(!global.gc)throw Error('Run with --expose-gc.');
global.gc();const memoryBefore=process.memoryUsage(),times=[],failures=[];
let maxBoxes=0,maxQueue=0,maxEvaluations=0,maxObservedHeap=memoryBefore.heapUsed;
const workloadStart=performance.now();
for(let i=0;i<cases.length;i++){
 const c=cases[i],start=performance.now();
 try{const r=c.g.globalDistance(point('start',0,c.q0),point('end',c.angle,c.q1));times.push(performance.now()-start);maxBoxes=Math.max(maxBoxes,r.evaluatedBoxes);maxQueue=Math.max(maxQueue,r.peakQueuedBoxes);maxEvaluations=Math.max(maxEvaluations,r.objectiveEvaluations);assert.ok(r.absoluteErrorBoundMeters<=r.requestedToleranceMeters);}
 catch(e){failures.push({index:i,code:e.code,message:e.message});}
 maxObservedHeap=Math.max(maxObservedHeap,process.memoryUsage().heapUsed);
}
const workloadWallMs=performance.now()-workloadStart;
global.gc();const memoryAfterGC=process.memoryUsage();
times.sort((a,b)=>a-b);const quantile=p=>times[Math.floor((times.length-1)*p)];
const output={timestamp:new Date().toISOString(),environment:{node:process.version,cpu:cpus()[0]?.model,platform:platform(),release:release()},references,stress:{seed:17,queries:1500,lengthToRadiusRange:[1e-6,1e6],failed:failures.length,failures,queryMs:{min:times[0],median:quantile(.5),p95:quantile(.95),max:times.at(-1)},workloadWallMs,maxBoxes,maxQueue,maxEvaluations},memory:{memoryBefore,memoryAfterGC,maxObservedHeap,retainedArrayBufferDelta:memoryAfterGC.arrayBuffers-memoryBefore.arrayBuffers,queueLimit:16384,boxLimit:32768,caveat:'Heap readings include VM, temporary query objects and measurement machinery; caller-held timings/geometry remain live. No exact per-object byte or mobile/browser frame-time claim. Solver retains no per-query cache or terrain/sample arrays.'}};
assert.equal(failures.length,0);assert.equal(output.memory.retainedArrayBufferDelta,0);
writeFileSync('docs/evidence/a7-b1-distance-measurements.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({referenceQueries:references.length,stress:output.stress,memory:output.memory},null,2));
