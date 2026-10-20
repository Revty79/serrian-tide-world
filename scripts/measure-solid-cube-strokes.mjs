import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {createSolidCubeStrokePath} from '../src/surfaces/solid-cube-stroke-path.ts';
import {createSolidCubeRouter} from '../src/surfaces/solid-cube-routing.ts';
import {SOLID_CUBE_PROVIDER} from '../src/surfaces/solid-cube.ts';
import {createSolidCubeTerrain} from '../src/terrain/solid-cube.ts';
import {prepareSolidCubeDab} from '../src/terrain/solid-cube-brush.ts';
const out=process.argv[2]??'.local/cube-c2a-performance.json';
const identity={worldId:'c2a-performance',surfaceId:'outside'},configuration={identity,provider:SOLID_CUBE_PROVIDER,version:1,configuration:'solid',role:'exterior',sideLengthMeters:1024};
const p=(patchId,u=0,v=0)=>({...identity,patchId,u,v}),yieldTurn=()=>new Promise(r=>setImmediate(r));
const trials=[],dabTrials=[],failures=[];
const routes=[['same-face',[p('px',-128,-128),p('px',128,128)]],['edge',[p('px',480,0),p('py',-480,0)]],
 ['opposite',[p('px'),p('nx')]],['corner',[p('px',512,512),p('nx',512,-512)]],
 ['dense-collinear',Array.from({length:129},(_,i)=>p('px',-128+2*i,-128+2*i))],
 ['bending',Array.from({length:65},(_,i)=>p('px',-128+4*i,64*Math.sin(i/8)))]];
for(const [label,inputs] of routes)for(let trial=0;trial<3;trial++){
 global.gc?.();const initialMemory=process.memoryUsage(),started=performance.now(),s=createSolidCubeStrokePath(configuration,128),events=[];let at=0,released=false,maxPumpMs=0,maxYieldGapMs=0,previousYield=performance.now();
 const pumps=[];let caught;
 try{
  while(s.status==='accepting'||s.status==='draining'){
   if(!released){while(at<inputs.length&&s.accept(inputs[at]))at++;if(at===inputs.length){s.release();released=true;}}
   const before=s.statistics,start=performance.now();s.pump();const ms=performance.now()-start,after=s.statistics;
   pumps.push({stage:after.routeQueries>before.routeQueries?'route':after.dabs>before.dabs?'dab-center':'transition',ms,admittedWork:after.workUnits-before.workUnits});maxPumpMs=Math.max(maxPumpMs,ms);
   for(;;){const e=s.take();if(!e)break;events.push(e);}
   await yieldTurn();const now=performance.now();maxYieldGapMs=Math.max(maxYieldGapMs,now-previousYield);previousYield=now;
  }
 }catch(e){caught=String(e);}
 const result={label,trial,status:s.status,error:caught,acceptedInputs:s.statistics.acceptedInputs,elapsedMs:performance.now()-started,maxPumpMs,maxNodeYieldGapMs:maxYieldGapMs,statistics:s.statistics,pumps,
  initialMemory,afterMemory:process.memoryUsage(),outputDabs:events.filter(e=>e.kind==='dab').length};
 trials.push(result);assert.equal(s.status,'complete');
}
// Full Cube-B routing is deliberately indivisible today. Measure it separately.
const router=createSolidCubeRouter(configuration),routeTrials=[];
for(const [label,inputs] of routes.slice(0,4))for(let trial=0;trial<3;trial++){
 const start=performance.now(),result=router.route(inputs[0],inputs.at(-1));routeTrials.push({label,trial,ms:performance.now()-start,certificate:result.certificate});
}
for(const n of [128,256]){
 const terrain=createSolidCubeTerrain({terrainId:`c2a-performance-${n}`,geometry:configuration,cellsPerEdge:n});
 const source=terrain.copyElevations(),revision=terrain.revision;
 for(const radius of [40.96,563.2])for(const center of [p('px',500,0),p('px',500,500)])for(const tool of ['raise','lower','smooth','flatten']){
  const settings={version:1,tool,radiusMeters:radius,...(tool==='raise'||tool==='lower'?{strengthMeters:30}:{intensity:.8,...(tool==='flatten'?{targetElevation:43}:{})})};
  global.gc?.();const at=performance.now(),job=prepareSolidCubeDab(terrain,center,settings),initMs=performance.now()-at,pumps=[];let maxPumpMs=0,previous=performance.now(),maxGap=0;
  while(job.status==='preparing'){const start=performance.now();job.pump(256);const ms=performance.now()-start;pumps.push(ms);maxPumpMs=Math.max(maxPumpMs,ms);await yieldTurn();const now=performance.now();maxGap=Math.max(maxGap,now-previous);previous=now;}
  assert.equal(job.status,'ready');assert.equal(terrain.revision,revision);assert.deepEqual(terrain.copyElevations(),source);
  dabTrials.push({n,radiusMeters:radius,center,tool,status:job.status,initializationMs:initMs,totalPreparationMs:performance.now()-at,maxPumpMs,maxNodeYieldGapMs:maxGap,pumps:pumps.length,statistics:job.statistics});job.cancel();
 }
}
for(const [label,limits] of [['input',{maxAcceptedInputs:1}],['route',{maxStepWork:1}],['dabs',{maxDabs:1}],['aggregate',{maxTotalWork:1}]]){
 const s=createSolidCubeStrokePath(configuration,128,limits);s.accept(p('px'));const at=performance.now();let error;
 try{s.accept(p('nx'));s.release();while(s.status==='draining'){s.pump();while(s.take());}}catch(e){error=String(e);}
 assert.equal(s.status,'failed');failures.push({label,elapsedMs:performance.now()-at,status:s.status,error,statistics:s.statistics});
}
const data={node:process.version,platform:process.platform,architecture:process.arch,units:'milliseconds',notes:[
 'All trials retained, no warmup removal. Path pumps and full Cube-B route calls are separately timed from C1 dab preparation.',
 'Node setImmediate yield gaps are not browser frame gaps or physical mobile measurements.',
 'Process memory includes authorities, snapshots, retained evidence, VM and garbage; it is not a per-query heap bound.',
 'No terrain writes or history operations. Wide N256 preparation remains unsuitable per pointer event.',
 'Bending workload has 65 inputs; this finite measurement does not establish unlimited gesture capacity.'
],trials,routeTrials,dabTrials,failures};
writeFileSync(out,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({pathTrials:trials.length,pathStatuses:trials.map(t=>[t.label,t.status,t.elapsedMs]),routeTrials:routeTrials.length,dabTrials:dabTrials.length,failures:failures.length,maxPathPumpMs:Math.max(...trials.map(t=>t.maxPumpMs)),maxDabPumpMs:Math.max(...dabTrials.map(t=>t.maxPumpMs))},null,2));
