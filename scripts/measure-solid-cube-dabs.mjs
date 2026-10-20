import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { setImmediate as yieldTurn } from 'node:timers/promises';
import { createSolidCubeTerrain } from '../src/terrain/solid-cube.ts';
import { prepareSolidCubeDab } from '../src/terrain/solid-cube-brush.ts';
import { SOLID_CUBE_PROVIDER } from '../src/surfaces/solid-cube.ts';
const output = process.argv[2] ?? '.local/cube-c1-performance.json';
const sha = (b) => createHash('sha256').update(b).digest('hex'), records=[];
const identity={worldId:'cube-c1-performance',surfaceId:'exterior'}, config={identity,provider:SOLID_CUBE_PROVIDER,version:1,configuration:'solid',role:'exterior',sideLengthMeters:1024};
const point=(u,v)=>({...identity,patchId:'px',u,v});
const quantile=(a,p)=>a[Math.min(a.length-1,Math.ceil(a.length*p)-1)]??0;
for(const n of [128,256]) {
  // One source authority, restored exactly after each successful trial; no per-face elevation copies.
  const terrain=createSolidCubeTerrain({terrainId:`performance-${n}`,geometry:config,cellsPerEdge:n});
  for(const key of terrain.samples())terrain.write(key,key.index===0?-0:((key.index*17)%41-20)*3);
  const source=terrain.copyElevations(),sourceSha=sha(source);
  for(const tool of ['raise','lower','smooth','flatten']) for(const [location,center] of [['face',point(0,0)],['edge',point(512,0)],['corner',point(512,512)],['near-corner',point(508,508)]]) for(const [size,radius] of [['ordinary',40.96],['wide',563.2]]) {
    const trials=size==='ordinary'?3:1;
    for(let trial=0;trial<trials;trial++){
      global.gc?.(); const memoryBefore=process.memoryUsage(),at=performance.now();
      const settings=tool==='raise'||tool==='lower'?{version:1,tool,radiusMeters:radius,strengthMeters:30}:tool==='smooth'?{version:1,tool,radiusMeters:radius,intensity:.7}:{version:1,tool,radiusMeters:radius,intensity:.7,targetElevation:-43};
      const initAt=performance.now(),dab=prepareSolidCubeDab(terrain,center,settings),initializationMs=performance.now()-initAt;
      const pumpTimes=[],yieldGaps=[];let failure=null;
      try{while(dab.status==='preparing'){const start=performance.now();dab.pump(256);pumpTimes.push(performance.now()-start);const yieldedAt=performance.now();await yieldTurn();yieldGaps.push(performance.now()-yieldedAt);}}
      catch(error){failure={name:error.name,code:error.code,message:error.message};}
      const preparationWallMs=performance.now()-at,memoryAfterPrepare=process.memoryUsage(),dryRunSha=sha(terrain.copyElevations()); assert.equal(dryRunSha,sourceSha);
      const prepared=failure?[]:[...dab.preparedChanges(terrain)],commitAt=performance.now();let writes=0;
      if(!failure)writes=dab.commit();const commitMs=performance.now()-commitAt,memoryAfterCommit=process.memoryUsage();
      if(!failure){assert.equal(writes,prepared.length);for(const c of prepared)assert.ok(Object.is(terrain.read(terrain.keyAt(c.index)),c.after));}
      pumpTimes.sort((a,b)=>a-b);yieldGaps.sort((a,b)=>a-b);
      records.push({n,tool,location,size,trial,radiusMeters:radius,initializationMs,preparationWallMs,pumpSteps:256,pumpCalls:pumpTimes.length,
        pumpP50Ms:quantile(pumpTimes,.5),pumpP95Ms:quantile(pumpTimes,.95),maxPumpMs:pumpTimes.at(-1)??0,
        yieldP95Ms:quantile(yieldGaps,.95),maxYieldGapMs:yieldGaps.at(-1)??0,commitMs,writes,failure,plan:dab.plan,statistics:dab.statistics,
        memoryBefore,memoryAfterPrepare,memoryAfterCommit,sourceSha256:sourceSha,dryRunSha256:dryRunSha});
      for(const c of prepared)terrain.write(terrain.keyAt(c.index),c.before);assert.equal(sha(terrain.copyElevations()),sourceSha);
    }
  }
  // Measured failure at the real hard change cap; nothing is partially published.
  const at=performance.now(),dab=prepareSolidCubeDab(terrain,point(0,0),{version:1,tool:'raise',radiusMeters:4096,strengthMeters:10});let failure;
  const pumpTimes=[];try{while(dab.status==='preparing'){const start=performance.now();dab.pump(256);pumpTimes.push(performance.now()-start);await yieldTurn();}}
  catch(error){failure={name:error.name,code:error.code,message:error.message};}
  assert.equal(failure?.code,'work');assert.equal(sha(terrain.copyElevations()),sourceSha);
  records.push({n,tool:'raise',location:'whole-cube',size:'over-limit',preparationWallMs:performance.now()-at,maxPumpMs:Math.max(...pumpTimes),failure,plan:dab.plan,statistics:dab.statistics,sourceSha256:sourceSha,dryRunSha256:sha(terrain.copyElevations())});
}
const report={node:process.version,platform:process.platform,recordedAtUtc:new Date().toISOString(),gcAvailable:typeof global.gc==='function',
  conditions:'Single Windows Node process. N128/N256, four tools, four center locations, ordinary 0.04L (3 trials) / wide 0.55L (1 trial); 256 cooperative steps/pump and setImmediate between pumps. GC before trials. No browser/mobile/frame-rate claim. Timings include instrumentation and GC. Memory is whole process, including retained prior records, source authority, source snapshot, prepared scalar replay records and GC garbage. Exact restoration between trials changes revision but not source words. Initialization/atomic commit measured separately.',
  records};writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({trials:records.length,ordinary:records.filter((r)=>r.size==='ordinary').length,wide:records.filter((r)=>r.size==='wide').length,
  failures:records.filter((r)=>r.failure).map(({n,tool,location,size,failure})=>({n,tool,location,size,failure})),maxCandidateCount:Math.max(...records.map((r)=>r.statistics.candidates)),maxWorkUnits:Math.max(...records.map((r)=>r.statistics.workUnits)),
  maxInitializationMs:Math.max(...records.map((r)=>r.initializationMs??0)),maxPumpMs:Math.max(...records.map((r)=>r.maxPumpMs)),maxCommitMs:Math.max(...records.map((r)=>r.commitMs??0)),peakPreparedBytes:Math.max(...records.map((r)=>r.statistics.peakPreparedBytes))},null,2));
