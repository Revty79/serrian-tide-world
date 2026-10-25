import {roundedVisible} from '../surfaces/rounded-crescent-ray.ts';
import type {RoundedCrescentGeometry} from '../surfaces/rounded-crescent-globe.ts';
import {roundedInputPath} from '../terrain/rounded-crescent-brush-metric.ts';
import {recordPaintingEvent} from './painting-metrics.ts';
import {cutGlobeVisible,type CrescentCutGlobeGeometry} from '../surfaces/crescent-cut-globe.ts';
import { startSphericalBrushStroke, validateSphericalBrushSettings, type SphericalBrushSettings, type SphericalBrushVisibility } from '../terrain/spherical-brush.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import type { SphericalHistory } from './spherical-history.ts';
import { greatCircleArc } from '../surfaces/great-circle.ts';
import { dot3,unitDirection,type Vec3 } from '../surfaces/cube-sphere.ts';
import { OrderedSurfaceInput,RevisionLease,SurfaceProgressSignal } from './surface-work.ts';
import type { SphereAcceptedPoint,SphereWorkInput,SphereWorkOutput,SphereWorkStats } from './sphere-work-protocol.ts';
export type SphereWorkerFactory=import('./connected-session-contracts.ts').ConnectedWorkerFactory;
export const sphereWorkerFactory:SphereWorkerFactory=()=>new Worker(new URL('./sphere-preparation.worker.ts',import.meta.url),{type:'module'});
let nextTask=0;
const copy=(v:Vec3):Vec3=>[v[0],v[1],v[2]];
const visibilityCopy=(v:SphericalBrushVisibility|undefined)=>v&&{hemisphere:copy(v.hemisphere),...(v.endHemisphere?{endHemisphere:copy(v.endHemisphere)}:{})};
const empty=():SphereWorkStats=>({dabs:0,writes:0,candidateChecks:0,affectedSamples:0,peakPreparedBytes:0});
export function beginSphereWorkerStroke(terrain:SphericalTerrain,history:SphericalHistory,first:Vec3,settings:SphericalBrushSettings,hemisphere:Vec3|undefined,changed:()=>void,factory:SphereWorkerFactory=sphereWorkerFactory,directions?:Float64Array,physicalGeometry?:CrescentCutGlobeGeometry,roundedGeometry?:RoundedCrescentGeometry){
 validateSphericalBrushSettings(terrain,settings);const initial=unitDirection(first),domain=hemisphere&&unitDirection(hemisphere),task=++nextTask,lease=new RevisionLease(task,terrain.revision),input=new OrderedSurfaceInput(2048,Number.MAX_SAFE_INTEGER),signal=new SurfaceProgressSignal(),points=new Map<number,SphereAcceptedPoint>([[1,{ordinal:1,direction:copy(first)}]]),fallbackPoints:SphereAcceptedPoint[]=[];
 let worker:Worker|undefined,status:'drawing'|'draining'|'complete'|'cancelled'|'failed'='drawing',closed=false,sequence=0,revision=terrain.revision,stats=empty(),failure:unknown;
 let local:ReturnType<typeof startSphericalBrushStroke>|undefined,localSegment:Generator<boolean>|undefined,localOrdinal=1;const localQueue:SphereAcceptedPoint[]=[];
 let watchdog:ReturnType<typeof setTimeout>|undefined;
 const diagnostics={backend:'worker',geometryPreparationMs:0,fallbackReason:'',readyRoundTripMs:0,snapshotMs:0,computeMs:0,proposals:0,staleResults:0,validationMaxMs:0,commitMaxMs:0,ackWait:{count:0,totalMs:0,maxMs:0,samples:[] as number[]}};
 const routeCache=new Map<number,ReturnType<typeof roundedInputPath>>();
 const started=performance.now(),inputTimes=new Map<number,number>([[1,started]]);history.begin();
 const notify=()=>{signal.notify();changed();};
 const send=(m:SphereWorkInput)=>worker!.postMessage(m);
 const close=(reason:typeof status)=>{if(closed)return;closed=true;status=reason;clearTimeout(timeout);clearTimeout(watchdog);const completedWorker=worker;worker=undefined;lease.cancel();fallbackPoints.length=0;points.clear();localQueue.length=0;localSegment?.return(undefined);localSegment=undefined;
  if(terrain.revision!==revision){failure=new Error('Untracked spherical edit: history was cleared to protect current terrain.');history.discardUntracked();status='failed';}
  else if(local)local.end();else history.commit();if(completedWorker){if(factory.release)factory.release(completedWorker,status==='complete');else completedWorker.terminate();}notify();};
 const fail=(error:unknown)=>{failure=error;close('failed');};
 // A held stationary brush is legitimately idle. Time out only outstanding
 // preparation/draining, and start a fresh wait when new input is accepted.
 const armWatchdog=(progress=true)=>{const pending=!closed&&!local&&(status==='draining'||input.processed<input.accepted);if(!pending){clearTimeout(watchdog);watchdog=undefined;return;}if(!progress&&watchdog)return;clearTimeout(watchdog);watchdog=setTimeout(()=>{watchdog=undefined;if(!closed&&!local&&(status==='draining'||input.processed<input.accepted))fail(new Error('Spherical background preparation stopped responding; the committed prefix is retained.'));},30000);};
 const fallback=(error:unknown)=>{if(closed||local)return;if(sequence||terrain.revision!==revision){fail(error);return;}clearTimeout(timeout);clearTimeout(watchdog);worker?.terminate();worker=undefined;diagnostics.backend='cooperative fallback';diagnostics.fallbackReason=String(error);
  try{history.commit();local=startSphericalBrushStroke(terrain,{...terrain.metadata.identity,direction:first},settings,history,hemisphere?{hemisphere,cutGlobe:physicalGeometry}:undefined,{roundedGlobe:roundedGeometry});revision=terrain.revision;input.progress(1);localQueue.push(...fallbackPoints);fallbackPoints.length=0;stats=local.statistics;notify();}catch(cause){revision=terrain.revision;fail(cause);}};
 const timeout=setTimeout(()=>fallback(new Error('Spherical worker startup timed out.')),10000);
 const progress=(processed:number)=>{input.progress(processed);for(const key of points.keys())if(key<processed){points.delete(key);inputTimes.delete(key);}};
 const expectedDab=(m:Extract<SphereWorkOutput,{type:'prepared'}>)=>{
  if(!Number.isSafeInteger(m.ordinal)||!Number.isFinite(m.fraction)||m.fraction<0||m.fraction>1)throw Error('Invalid spherical input certificate.');
  let center:Vec3,visible:Vec3|undefined;
  if(m.ordinal===1){if(m.fraction!==0)throw Error('Invalid initial spherical fraction.');center=initial;visible=domain;}
  else{const previous=points.get(m.ordinal-1),point=points.get(m.ordinal);if(!previous||!point)throw Error('Unknown spherical input ordinal.');if(roundedGeometry){let route=routeCache.get(m.ordinal);if(!route){route=roundedInputPath(roundedGeometry,unitDirection(previous.direction),unitDirection(point.direction));routeCache.clear();routeCache.set(m.ordinal,route);}center=route.at(m.fraction);}else center=greatCircleArc(unitDirection(previous.direction),unitDirection(point.direction)).at(m.fraction);const v=point.visibility;visible=v?unitDirection(v.hemisphere):domain;if(v?.endHemisphere)visible=greatCircleArc(visible!,unitDirection(v.endHemisphere)).at(m.fraction);}
  if(m.center.length!==3||m.center.some((v,i)=>!Number.isFinite(v)||Math.abs(v-center[i]!)>1e-12)||!!visible!==!!m.visible||visible&&(m.visible!.length!==3||m.visible!.some((v,i)=>!Number.isFinite(v)||Math.abs(v-visible![i]!)>1e-12)))throw Error('Spherical proposal left its accepted physical input or visibility.');return visible;
 };
 try{
  worker=factory();worker.onerror=e=>{e.preventDefault();fallback(e.message||'Spherical worker failed.');};worker.onmessageerror=()=>fallback(new Error('Spherical response could not be decoded.'));
  worker.onmessage=(event:MessageEvent<SphereWorkOutput>)=>{const m=event.data;if(closed||local||m.task!==task){diagnostics.staleResults++;return;}clearTimeout(timeout);
   try{
    if(m.type==='started'){diagnostics.readyRoundTripMs=performance.now()-started;diagnostics.snapshotMs=m.snapshotMs;diagnostics.geometryPreparationMs=m.geometryPreparationMs??0;armWatchdog();notify();return;}
    if(m.type==='error'){fail(new Error(m.message));return;}
    if(m.type==='prepared'){
     const at=performance.now();if(m.sequence!==sequence+1||m.statistics.dabs!==stats.dabs||m.statistics.writes!==stats.writes)throw Error('Out-of-order spherical proposal.');
     if(!Number.isSafeInteger(m.processed)||m.processed<input.processed||m.processed>input.accepted||Object.values(m.statistics).some(v=>!Number.isSafeInteger(v)||v<0))throw Error('Invalid spherical preparation statistics or progress.');
     lease.validate(m.task,m.sourceRevision,terrain.revision);const visible=expectedDab(m);
     if(!(m.indices instanceof Uint32Array)||!(m.before instanceof Uint32Array)||!(m.after instanceof Float32Array)||m.indices.length!==m.before.length||m.indices.length!==m.after.length||m.indices.length>terrain.sampleCount)throw Error('Invalid spherical patch buffers.');
     const seen=new Uint8Array(Math.ceil(terrain.sampleCount/8)),word=new Float32Array(1),bits=new Uint32Array(word.buffer),afterBits=new Uint32Array(m.after.buffer,m.after.byteOffset,m.after.length);
     for(let i=0;i<m.indices.length;i++){const index=m.indices[i]!;if(index>=terrain.sampleCount||seen[index>>3]!&(1<<(index&7)))throw Error('Invalid or repeated spherical sample.');seen[index>>3]!|=1<<(index&7);const key=terrain.keyAt(index);word[0]=terrain.read(key);if(bits[0]!==m.before[i]||!Number.isFinite(m.after[i])||m.before[i]===afterBits[i])throw Error('Spherical proposal no longer matches exact source words.');if(visible){const facing=directions?visible[0]*directions[index*3]!+visible[1]*directions[index*3+1]!+visible[2]*directions[index*3+2]!:dot3(visible,terrain.directionAt(key));if(roundedGeometry?!roundedVisible(roundedGeometry,directions?[directions[index*3]!,directions[index*3+1]!,directions[index*3+2]!]:terrain.directionAt(key),visible,terrain.metadata.representation.cellsPerEdge*1000000+index):physicalGeometry?!cutGlobeVisible(physicalGeometry,terrain.directionAt(key),visible):facing<0)throw Error('Spherical proposal reached hidden physical geography.');}}
     for(let i=0;i<m.after.length;i++)terrain.validateSample(terrain.keyAt(m.indices[i]!),m.after[i]!);
     diagnostics.validationMaxMs=Math.max(diagnostics.validationMaxMs,performance.now()-at);const commit=performance.now();for(let i=0;i<m.indices.length;i++)terrain.write(terrain.keyAt(m.indices[i]!),m.after[i]!);diagnostics.commitMaxMs=Math.max(diagnostics.commitMaxMs,performance.now()-commit);
     revision=terrain.revision;if(m.indices.length)recordPaintingEvent('commit',{revision,words:m.indices.length,inputAt:inputTimes.get(m.ordinal)??started});lease.acknowledged(revision);sequence=m.sequence;diagnostics.proposals++;stats={...m.statistics,dabs:m.statistics.dabs+1,writes:m.statistics.writes+m.indices.length};progress(Math.max(1,m.processed));fallbackPoints.length=0;send({type:'ack',task,sequence,revision});
    }else{if(m.statistics.dabs!==stats.dabs||m.statistics.writes!==stats.writes)throw Error('Spherical progress does not match canonical commits.');stats={...m.statistics};progress(m.processed);if(m.type==='done'){if(input.processed!==input.accepted)throw Error('Spherical preparation ended before all accepted input.');diagnostics.computeMs=m.computeMs;diagnostics.snapshotMs=m.snapshotMs;diagnostics.ackWait=m.ackWait;close('complete');return;}}
    armWatchdog();notify();
   }catch(error){fail(error);}
  };
  const values=terrain.copyElevations();worker.postMessage({type:'start',task,metadata:terrain.metadata,sourceRevision:revision,values,direction:copy(first),settings:{...settings},hemisphere:hemisphere&&copy(hemisphere),physicalGeometry,roundedGeometry},[values.buffer]);
 }catch(error){fallback(error);}
 return{
  diagnostics,get status(){return status;},get failure(){return failure;},get isRemote(){return!local;},get statistics(){return{...stats,acceptedPositions:input.accepted,processedPositions:input.processed,discardedPositions:closed&&status!=='complete'?input.accepted-input.processed:0,peakPendingPositions:input.peak};},get pending(){return input.pending;},get hasPending(){return!closed&&(input.processed<input.accepted||status==='draining');},
  move(direction:Vec3,visibility?:SphericalBrushVisibility){if(closed||status!=='drawing')return;try{const ordinal=input.accept(),point={ordinal,direction:copy(direction),visibility:visibilityCopy(visibility)};points.set(ordinal,point);inputTimes.set(ordinal,performance.now());if(local)localQueue.push(point);else{if(!sequence)fallbackPoints.push(point);send({type:'move',task,point});armWatchdog(false);}}catch(error){fail(error);}},
  release(){if(!closed&&status==='drawing'){status='draining';if(!local){send({type:'release',task});armWatchdog(false);}notify();}},
  cancel(){close('cancelled');},
  pump(){if(!local||closed)return;try{if(!localSegment&&localQueue.length){const point=localQueue.shift()!;localOrdinal=point.ordinal;localSegment=local.moveToSteps({...terrain.metadata.identity,direction:point.direction},point.visibility);}if(localSegment){const result=localSegment.next();stats=local.statistics;revision=terrain.revision;if(result.done){localSegment=undefined;progress(localOrdinal);}}if(status==='draining'&&!localSegment&&!localQueue.length)close('complete');}catch(error){revision=terrain.revision;fail(error);}},
  waitForProgress(){return closed?Promise.resolve():signal.wait();},
 };
}
