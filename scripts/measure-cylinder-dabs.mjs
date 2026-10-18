// node --expose-gc scripts/measure-cylinder-dabs.mjs
// Numerical Node observations, not browser/mobile brush responsiveness claims.
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { cpus,platform,release } from 'node:os';
import { createCylindricalTerrain } from '../src/terrain/cylindrical.ts';
import { prepareCylindricalDab } from '../src/terrain/cylindrical-brush.ts';
import { cylinderBrushCandidates } from '../src/terrain/cylindrical-candidates.ts';
const sha=a=>createHash('sha256').update(new Uint8Array(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
if(!global.gc)throw Error('Use --expose-gc.');
const identity={worldId:'measure-dabs',surfaceId:'exterior'},R=1000000,L=1600000;
const configurations=[
 {label:'representative',resolution:{angularSamples:128,axialCells:64,radialCells:32},region:'side',u:.13,v:.03*R,radius:.0837*R},
 {label:'medium',resolution:{angularSamples:256,axialCells:128,radialCells:64},region:'cap-end',u:-.29,v:.99*R,radius:.0437*R},
 {label:'maximum-side',resolution:{angularSamples:1024,axialCells:512,radialCells:256},region:'side',u:.13,v:.8*R,radius:.0137*R},
 {label:'maximum-rim',resolution:{angularSamples:1024,axialCells:512,radialCells:256},region:'side',u:.13,v:.006*R,radius:.0237*R},
 {label:'maximum-center',resolution:{angularSamples:1024,axialCells:512,radialCells:256},region:'cap-start',u:2.7,v:0,radius:.0137*R},
 {label:'all-regions',resolution:{angularSamples:17,axialCells:8,radialCells:4},region:'side',u:.17,v:.8*R,radius:4.137*R},
 {label:'maximum-safe-stop',resolution:{angularSamples:1024,axialCells:512,radialCells:256},region:'cap-start',u:0,v:0,radius:1.137*R,expectedFailure:true},
];
const records=[];
for(const config of configurations)for(const tool of config.expectedFailure?['raise']:['raise','lower','smooth','flatten'])for(let repeat=0;repeat<3;repeat++){
 const created=performance.now(),t=createCylindricalTerrain({terrainId:'measured',geometry:{identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:R,lengthMeters:L},resolution:config.resolution});
 const creationMs=performance.now()-created,center={...identity,patchId:config.region,u:config.u,v:config.v};
 let seeded=0;for(const item of cylinderBrushCandidates(t,center,config.radius*1.1).samples()){t.write(item.key,((item.key.index*13)%17-8)*20);if(++seeded>=8192)break;}
 const beforeHash=sha(t.copyElevations()),beforeRevision=t.revision;
 const settings={version:1,tool,radiusMeters:config.radius,...(tool==='raise'||tool==='lower'?{strengthMeters:100}:{intensity:.7,...(tool==='flatten'?{targetElevation:-300}:{})})};
 const job=prepareCylindricalDab(t,center,settings);await new Promise(setImmediate);global.gc();global.gc();const before=process.memoryUsage();
 const pumps=[],start=performance.now();let failure=null;
 try{while(job.status==='preparing'){const ts=performance.now();job.pump(64);pumps.push(performance.now()-ts);}}catch(e){failure={name:e.name,message:e.message};}
 const preparationMs=performance.now()-start;
 global.gc();const prepared=process.memoryUsage(),preparedStats=job.statistics;
 assert.equal(prepared.arrayBuffers-before.arrayBuffers,preparedStats.preparedBytes);
 const unchangedBeforeCommit=beforeHash===sha(t.copyElevations());assert.ok(unchangedBeforeCommit);assert.equal(t.revision,beforeRevision);
 let commitMs=0;if(!failure){const ts=performance.now();job.commit();commitMs=performance.now()-ts;}
 assert.equal(Boolean(failure),Boolean(config.expectedFailure));
 const resultHash=sha(t.copyElevations());if(failure){assert.equal(resultHash,beforeHash);assert.equal(t.revision,beforeRevision);}
 // Leave the commit stack before collecting: V8 can retain the last typed
 // patch chunk in a dead stack slot until the next event-loop turn.
 await new Promise(setImmediate);global.gc();global.gc();const after=process.memoryUsage();assert.equal(after.arrayBuffers-before.arrayBuffers,0);
 records.push({label:config.label,resolution:config.resolution,sampleCount:t.sampleCount,authorityBytes:t.elevationByteLength,center,radiusMeters:config.radius,tool,repeat,creationMs,seeded,preparationMs,commitMs,pumpCount:pumps.length,maxPumpMs:Math.max(0,...pumps),failure,status:job.status,beforeHash,resultHash,unchangedBeforeCommit,revisionDelta:t.revision-beforeRevision,statistics:job.statistics,memoryBefore:before,memoryPrepared:prepared,memoryAfterRelease:after,preparedArrayBufferDelta:prepared.arrayBuffers-before.arrayBuffers,retainedArrayBufferDelta:after.arrayBuffers-before.arrayBuffers});
 console.log(config.label,tool,repeat,preparationMs.toFixed(2),job.status);
}
const fixture=JSON.parse(readFileSync('src/terrain/fixtures/cylinder-dab-reference.json','utf8')),referenceComparisons=[];
const shared=new ArrayBuffer(4),f32=new Float32Array(shared),u32=new Uint32Array(shared);
for(const c of fixture.cases)for(const tool of ['raise','lower','smooth','flatten']){
 const t=createCylindricalTerrain({terrainId:'reference',geometry:{identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:1,lengthMeters:1.6},resolution:{angularSamples:5,axialCells:3,radialCells:2}});
 for(const s of c.samples)t.write(t.keyAt(s.index),Number(s.before));const center={...identity,patchId:c.center.region==='side'?'side':c.center.region==='start'?'cap-start':'cap-end',u:Number(c.center.angle)*(c.center.region==='end'?-1:1),v:Number(c.center.coordinate)};
 const j=prepareCylindricalDab(t,center,{version:1,tool,radiusMeters:Number(c.radius),maxFalloffError:1e-8,...(tool==='raise'||tool==='lower'?{strengthMeters:160}:{intensity:.65,...(tool==='flatten'?{targetElevation:-250}:{})})});
 while(j.status==='preparing')j.pump(64);j.commit();let maxError=0,wordMatches=0;
 for(const s of c.samples){const value=t.read(t.keyAt(s.index)),ideal=Number(s.expected[tool].real),error=Math.abs(value-ideal);f32[0]=value;if(u32[0]===s.expected[tool].float32Word)wordMatches++;maxError=Math.max(maxError,error);assert.ok(error<=j.statistics.maxPreRoundElevationErrorMeters+Math.max(Math.abs(value),Math.abs(ideal))*2**-23+2**-149);}
 referenceComparisons.push({case:c.name,tool,samples:t.sampleCount,maxAbsoluteErrorVsIdealMeters:maxError,float32WordMatches:wordMatches,statistics:j.statistics});
}
writeFileSync('docs/evidence/a7-b2a-dab-measurements.json',JSON.stringify({timestamp:new Date().toISOString(),environment:{node:process.version,cpu:cpus()[0]?.model,platform:platform(),release:release()},repetitions:3,records,referenceComparisons,caveat:'Numerical Node workload only. Initialization, proof copies/hashes and explicit GC are excluded from preparation/commit timings. A pump is candidate-count bounded; a synchronous B1 query cannot be preempted. No mobile frame-time or exact working-set claim. Prepared and retained ArrayBuffer deltas are after event-loop stack clearance and two explicit collections; caller/VM JS objects remain additional.'},null,2)+'\n');
console.log('complete',records.length,referenceComparisons.length);
