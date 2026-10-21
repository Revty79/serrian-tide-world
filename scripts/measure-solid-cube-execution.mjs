import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createSolidCubeTerrain} from '../src/terrain/solid-cube.ts';
import {createSolidCubeSession} from '../src/editor/solid-cube-session.ts';
const output=process.argv[2]??'.local/cube-c2b1-performance.json',identity={worldId:'c2b1-performance',surfaceId:'outside'},geometry={identity,provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters:1024};
const p=(patchId,u=0,v=0)=>({...identity,patchId,u,v}),words=t=>new Uint32Array(t.copyElevations().buffer),sha=v=>createHash('sha256').update(v).digest('hex'),yieldTurn=()=>new Promise(r=>setImmediate(r));
const trials=[];
for(const n of [128,256]){
 const terrain=createSolidCubeTerrain({terrainId:`performance-${n}`,geometry,cellsPerEdge:n});
 for(const key of terrain.samples())terrain.write(key,key.index===0?-0:((key.index*17)%41-20)*3);
 const original=words(terrain);
 const workloads=[
  {label:'ordinary-edge',radius:40.96,inputs:[p('px',490),p('py',-490)],repeats:3},
  {label:'ordinary-corner',radius:40.96,inputs:[p('px',500,500),p('py',-500,500)],repeats:3},
  {label:'wide-edge',radius:563.2,inputs:[p('px',500),p('py',-200)],repeats:1},
  {label:'wide-corner',radius:563.2,inputs:[p('px',500,500),p('py',-300,500)],repeats:1},
  {label:'bending-65',radius:128,inputs:Array.from({length:65},(_,i)=>p('px',-128+4*i,64*Math.sin(i/8))),repeats:1},
 ];
 for(const workload of workloads)for(const tool of ['raise','lower','smooth','flatten'])for(let trial=0;trial<workload.repeats;trial++){
  global.gc?.();const memoryBefore=process.memoryUsage(),session=createSolidCubeSession(terrain),settings={version:1,tool,radiusMeters:workload.radius,
   ...(tool==='raise'||tool==='lower'?{strengthMeters:30}:{intensity:.8,...(tool==='flatten'?{targetElevation:43}:{})})};
  const started=performance.now(),stroke=session.begin(workload.inputs[0],settings),beginMs=performance.now()-started;
  const pumps=[];let at=1,released=false,error,previousYield=performance.now(),maxGap=0;
  try{
   while(stroke.status==='drawing'||stroke.status==='draining'){
    if(!released){while(at<workload.inputs.length&&stroke.accept(workload.inputs[at]))at++;if(at===workload.inputs.length){stroke.release();released=true;}}
    const before=performance.now();
    try{stroke.pump(256);}finally{const ms=performance.now()-before;pumps.push({stage:stroke.statistics.lastStage,ms});}
    await yieldTurn();const now=performance.now();maxGap=Math.max(maxGap,now-previousYield);previousYield=now;
   }
  }catch(e){error=String(e);}
  const executionWallMs=performance.now()-started,memoryAfterExecution=process.memoryUsage(),final=words(terrain),operations=session.history.operations;
  if(stroke.status==='failed')assert.match(stroke.failure.message,/budget|limit|exhaust/);else assert.equal(stroke.status,'complete');
  if(stroke.status==='failed')assert.ok(workload.label.startsWith('wide-'),'Unexpected non-wide resource exhaustion.');
  let undoMs=0,redoMs=0;
  if(operations.length){
   let time=performance.now();session.undo();undoMs=performance.now()-time;assert.deepEqual(words(terrain),original);
   time=performance.now();session.redo();redoMs=performance.now()-time;assert.deepEqual(words(terrain),final);
   session.undo();assert.deepEqual(words(terrain),original);
  }else assert.deepEqual(final,original);
  const result={n,tool,label:workload.label,trial,radiusMeters:workload.radius,inputCount:workload.inputs.length,status:stroke.status,error,beginMs,executionWallMs,
   maxPumpMs:Math.max(...pumps.map(p=>p.ms)),maxNodeTurnGapMs:maxGap,undoMs,redoMs,statistics:stroke.statistics,history:session.history.statistics,operations,
   memoryBefore,memoryAfterExecution,sourceSha256:sha(original),prefixSha256:sha(final),afterUndoSha256:sha(words(terrain)),completeWordReplayVerified:true,pumps};
  trials.push(result);session.clearHistory();session.dispose();
 }
}
const data={node:process.version,platform:process.platform,architecture:process.arch,units:'milliseconds',pumpSteps:256,notes:[
 'All trials retained; no warmup exclusion. Source initialization/seeding is excluded from the gesture timer.',
 'Begin timer stops immediately after begin. Execution wall stops before final source copies, assertions and Undo/Redo.',
 'Individual pump timers stop before reading diagnostic snapshots; stage categories distinguish path, initialization, C1 preparation, history reservation and publication.',
 'Execution wall and Node turn gaps include host admission, diagnostic recording and setImmediate yields; they are not isolated CPU time or browser frames.',
 'Undo/Redo call timers stop before complete-word comparisons. All successful or bounded-failure prefixes are verified over the full canonical authority.',
 'Process memory includes authority, verification snapshots, timing records, VM and garbage; it is not an exact per-query heap bound.',
 'Wide N256 strokes may explicitly exhaust the unchanged 65536-word atomic history cap; this is a handled stopped prefix, not a completed gesture.',
 'No worker, interactive acceptance, phone, rendering or persistence claim.'
 ],trials};
writeFileSync(output,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({trials:trials.length,complete:trials.filter(t=>t.status==='complete').length,stoppedPrefixes:trials.filter(t=>t.status==='failed').map(t=>({n:t.n,tool:t.tool,label:t.label,committedDabs:t.statistics.committedDabs,error:t.error})),maxPumpMs:Math.max(...trials.map(t=>t.maxPumpMs)),maxNodeTurnGapMs:Math.max(...trials.map(t=>t.maxNodeTurnGapMs)),maxUndoMs:Math.max(...trials.map(t=>t.undoMs)),maxRedoMs:Math.max(...trials.map(t=>t.redoMs))},null,2));
