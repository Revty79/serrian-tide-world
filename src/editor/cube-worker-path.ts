import {createSolidCubeStrokePath, type CubeStrokePathEvent, type CubeStrokePathLimits, type SolidCubeStrokePath} from '../surfaces/solid-cube-stroke-path.ts';
import {createSolidCubeGeometry, type SolidCubeConfiguration, type SolidCubePosition} from '../surfaces/solid-cube.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CubeExecutionPath} from './solid-cube-session.ts';
import {OrderedSurfaceInput,RevisionLease,SurfaceProgressSignal} from './surface-work.ts';
import {createCubeValueComparison,cubeWorkValueBytes} from './cube-work-value.ts';
import {createCubePathCertificateCheck} from './cube-path-certificate.ts';
import {CUBE_PATH_WORK_LIMITS, type CubePathAck, type CubePathBody, type CubePathRole, type CubePathWorkInput, type CubePathWorkOutput, type CubeReplayAction} from './cube-path-work-protocol.ts';

export type CubeExecutionMode='auto'|'cooperative'|'worker';
export type CubePathWorkerFactory=(role:CubePathRole)=>Worker;
export const cubePathWorkerFactory:CubePathWorkerFactory=()=>new Worker(new URL('./cube-path.worker.ts',import.meta.url),{type:'module'});
/** Largest measured prefix staying below 10 ms in the accepted CDP4x many-bend baseline. */
export const CUBE_RESPONSIVE_POLICY=Object.freeze({offloadAfterCertifiedIntervals:8});
const roles=['primary','verifier'] as const;
let nextTask=0;
const workerOwners=new WeakMap<Worker,number>();
/** Pool owners may retain idle instances, but cannot borrow or destroy another active lease. */
export const cubeWorkerIsIdle=(worker:Worker)=>!workerOwners.has(worker);
type Slot={body:CubePathBody;workMs:number;stages:Extract<CubePathWorkOutput,{type:'step'}>['stages'];receivedAt:number};
type Pending={sequence:number;ack:CubePathAck;accepted:Partial<Record<CubePathRole,boolean>>;slots:Partial<Record<CubePathRole,Slot>>;sentAt:number;expectedAccepted:number;
 comparison?:ReturnType<typeof createCubeValueComparison>;verified?:CubePathBody;meta?:ReturnType<typeof createCubeValueComparison>;metaIndex:number};
function error(value:unknown){return value instanceof Error?value:new Error(String(value));}
function packet(value:unknown):asserts value is CubePathWorkOutput{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)throw Error('Invalid cube worker envelope');
 const keys=Reflect.ownKeys(value);if(keys.length>24)throw Error('Cube worker envelope size');
 for(const key of keys){if(typeof key!=='string'||!('value'in Object.getOwnPropertyDescriptor(value,key)!))throw Error('Cube worker envelope accessor');}
}
function checkStatistics(previous:SolidCubeStrokePath['statistics'],next:SolidCubeStrokePath['statistics'],expectedAccepted:number,limits:SolidCubeStrokePath['limits']){
 if(!next||typeof next!=='object'||Object.keys(next).sort().join(',')!==Object.keys(previous).sort().join(',')||next.acceptedInputs!==expectedAccepted||next.processedInputs<previous.processedInputs||next.processedInputs>next.acceptedInputs||next.processedInputs>previous.processedInputs+1
  ||next.pumps!==previous.pumps+1||next.dabs<previous.dabs||next.dabs>previous.dabs+1||next.routeQueries<previous.routeQueries||next.routeQueries>previous.routeQueries+1||next.workUnits<previous.workUnits||next.workUnits>limits.maxTotalWork)throw Error('Invalid cube worker progress certificate');
 for(const [key,value]of Object.entries(next))if(key!=='activeRoute'&&key!=='activeInputSequence'&&(!Number.isSafeInteger(value)||Number(value)<0))throw Error('Invalid cube worker progress word');
 if(typeof next.activeRoute!=='boolean'||next.dabs>limits.maxDabs||next.acceptedInputs>limits.maxAcceptedInputs||next.pendingInputs>limits.maxPendingInputs||next.peakPendingInputs>limits.maxPendingInputs||next.outputEvents>limits.maxOutputEvents||next.peakOutputEvents>limits.maxOutputEvents||next.peakArcTerms>128||next.peakStepWork>limits.maxStepWork||next.routeWorkUnits+next.arcWorkUnits!==next.workUnits
  ||(next.activeRoute?(!Number.isSafeInteger(next.activeInputSequence)||next.activeInputSequence!<0||next.activeInputSequence!>=next.acceptedInputs):next.activeInputSequence!==undefined))throw Error('Cube worker progress exceeds accepted numerical limits');
}

/** A bounded path-only adapter. C1 and exact history never leave the main authority. */
export function createCubeWorkerPath(configuration:SolidCubeConfiguration,radius:number,limits:CubeStrokePathLimits,options:{mode:CubeExecutionMode;binding:string;revision:()=>number;factory?:CubePathWorkerFactory;startupTimeoutMs?:number;workTimeoutMs?:number;releaseWorker?:(role:CubePathRole,worker:Worker,reusable:boolean)=>void}){
 let local:SolidCubeStrokePath|undefined=createSolidCubeStrokePath(configuration,radius,limits),latest=local.statistics;
 const geometry=createSolidCubeGeometry(configuration),pathGeometry=local.geometry,spacingMeters=local.spacingMeters,pathLimits=local.limits;
 const checkPhysicalCertificate=createCubePathCertificateCheck(configuration);
 const task=++nextTask;if(!Number.isSafeInteger(task))throw Error('Cube task identity exhausted');
 const lease=new RevisionLease(task,options.revision()),signal=new SurfaceProgressSignal(),factory=options.factory??cubePathWorkerFactory;
 let ack:CubePathAck=Object.freeze({revision:options.revision(),committedDabs:0,writes:0}),generation=1,input:OrderedSurfaceInput|undefined;
 let backend:'local'|'starting'|'worker'='local',state=local.status,released=false,closed=false,fatal:Error|undefined,adopted=false,promotionDisabled=options.mode==='cooperative';
 let log:CubeReplayAction[]=[],logBytes=0,logEvents=0,allInputs:SolidCubePosition[]=[],afterCheckpoint:SolidCubePosition[]=[],unsent:{ordinal:number;point:SolidCubePosition}[]=[];
 let captured:{status:SolidCubeStrokePath['status'];statistics:SolidCubeStrokePath['statistics'];actions:readonly CubeReplayAction[]}|undefined;
 let output:CubeStrokePathEvent|undefined,pending:Pending|undefined,sequence=0,timer:ReturnType<typeof setTimeout>|undefined,workTimer:ReturnType<typeof setTimeout>|undefined,startAt=0;
 const workers:Partial<Record<CubePathRole,Worker>>={},ready:Partial<Record<CubePathRole,boolean>>={};
 const counters={mode:options.mode,backend:'cooperative',fallbackReason:'',failureReason:'',workerAttachments:0,workersReleased:0,peakWorkers:0,sourceElevationCopies:0,pathActionCopies:0,replayActionBytes:0,
  replayWorkUnits:0,requests:0,acceptedAcks:0,verifiedSteps:0,verifiedDabs:0,staleMessages:0,peakStoredResponses:0,peakPendingInputs:0,comparisonNodes:0,comparisonBytes:0};
 const stages:Record<string,{count:number;totalMs:number;maxMs:number;samples:number[]}>={};
 const measure=(name:string,ms:number)=>{if(!Number.isFinite(ms)||ms<0)throw Error('Invalid cube timing certificate');const s=stages[name]??={count:0,totalMs:0,maxMs:0,samples:[]};s.count++;s.totalMs+=ms;s.maxMs=Math.max(s.maxMs,ms);if(s.samples.length===128)s.samples.shift();s.samples.push(ms);};
 const stopWorkers=(reusable=false)=>{if(timer!==undefined){clearTimeout(timer);timer=undefined;}if(workTimer!==undefined){clearTimeout(workTimer);workTimer=undefined;}for(const role of roles){const w=workers[role];if(w){w.onmessage=null;w.onerror=null;w.onmessageerror=null;if(workerOwners.get(w)===task)workerOwners.delete(w);if(options.releaseWorker)options.releaseWorker(role,w,reusable);else w.terminate();delete workers[role];counters.workersReleased++;}}};
 const fail=(reason:unknown)=>{fatal=error(reason);state='failed';counters.backend='failed';counters.failureReason=String(reason);stopWorkers();pending=undefined;output=undefined;signal.notify();};
 const fallback=(reason:unknown)=>{
  if(closed)return;if(adopted||!local){fail(reason);return;}
  stopWorkers();generation++;pending=undefined;captured=undefined;backend='local';counters.backend='cooperative fallback';counters.fallbackReason=String(reason);promotionDisabled=true;log=[];logBytes=logEvents=0;
  try{for(const point of afterCheckpoint)if(!local.accept(point))throw Error('Cube fallback input admission mismatch');if(released)local.release();afterCheckpoint=[];unsent=[];latest=local.statistics;state=local.status;}catch(e){fail(e);}signal.notify();
 };
 const record=(action:CubeReplayAction)=>{
  if(promotionDisabled)return;
  try{
   const bytes=cubeWorkValueBytes(action),events=logEvents+(action.kind==='take'?1:0);
   if(log.length>=CUBE_PATH_WORK_LIMITS.maxReplayActions||events>CUBE_PATH_WORK_LIMITS.maxReplayEvents||logBytes+bytes>CUBE_PATH_WORK_LIMITS.maxReplayBytes)throw Error('Optional cube replay log budget; staying cooperative');
   log.push(action);logBytes+=bytes;logEvents=events;
  }catch(e){promotionDisabled=true;counters.fallbackReason=String(e);log=[];logBytes=logEvents=0;}
 };
 const samePoint=(a:SurfacePosition,b:SurfacePosition)=>{const x=geometry.identity;return a.worldId===x.worldId&&a.surfaceId===x.surfaceId&&a.patchId===b.patchId&&Object.is(a.u,b.u)&&Object.is(a.v,b.v);};
 const receive=(role:CubePathRole,value:unknown)=>{
  if(closed)return;
  try{
   packet(value);const m=value;if(m.task!==task||m.generation!==generation){counters.staleMessages++;return;}
   if(m.binding!==options.binding||m.role!==role)throw Error('Foreign cube worker binding');
   if(m.type==='error'){fallback(m.message);return;}
   if(m.type==='ready'){
    if(backend!=='starting'||ready[role]||!captured||m.replayedActions!==captured.actions.length||m.replayWorkUnits!==captured.statistics.workUnits||m.status!==captured.status)throw Error('Invalid cube worker readiness');
    const comparison=createCubeValueComparison(m.statistics,captured.statistics);while(!comparison.complete)comparison.pump(4096);
    measure(role+'.startupReady',performance.now()-startAt);measure(role+'.replay',m.replayMs);counters.replayWorkUnits+=m.replayWorkUnits;ready[role]=true;
    if(roles.every(r=>ready[r])){if(timer!==undefined)clearTimeout(timer);timer=undefined;backend='worker';counters.backend='paired path workers';}signal.notify();return;
   }
   if(!pending||m.sequence!==pending.sequence||m.revision!==pending.ack.revision)throw Error('Out-of-order cube worker response');
   if(m.type==='accepted'){
    if(pending.accepted[role]||pending.slots[role])throw Error('Duplicate cube source acknowledgement');pending.accepted[role]=true;counters.acceptedAcks++;measure(role+'.acknowledgement',performance.now()-pending.sentAt);signal.notify();return;
   }
   if(m.type!=='step'||!pending.accepted[role]||pending.slots[role])throw Error('Duplicate/reordered cube path proposal');
   pending.slots[role]={body:m.body,workMs:m.workMs,stages:m.stages,receivedAt:performance.now()};counters.peakStoredResponses=Math.max(counters.peakStoredResponses,Object.keys(pending.slots).length);if(roles.every(r=>pending!.slots[r])&&workTimer!==undefined){clearTimeout(workTimer);workTimer=undefined;}signal.notify();
  }catch(e){fail(e);}
 };
 const promote=()=>{
  backend='starting';counters.backend='starting paired path workers';startAt=performance.now();captured={status:local!.status,statistics:local!.statistics,actions:log};counters.replayActionBytes=logBytes;
  try{
   for(const role of roles){const worker=factory(role);if(workerOwners.has(worker))throw Error('Cube worker instance is already owned');workerOwners.set(worker,task);workers[role]=worker;counters.workerAttachments++;counters.peakWorkers=Math.max(counters.peakWorkers,Object.keys(workers).length);
    worker.onmessage=e=>receive(role,e.data);worker.onerror=e=>{e.preventDefault();fallback(e.message||'Cube worker failed');};worker.onmessageerror=()=>fallback('Cube worker message decoding failed');}
   timer=setTimeout(()=>fallback('Cube worker startup timed out'),options.startupTimeoutMs??CUBE_PATH_WORK_LIMITS.startupTimeoutMs);
   for(const role of roles){workers[role]!.postMessage({type:'start',task,generation,binding:options.binding,role,configuration,radius,limits:pathLimits,actions:captured.actions,expectedStatus:captured.status,expectedStatistics:captured.statistics,ack} satisfies CubePathWorkInput);counters.pathActionCopies++;}
  }catch(e){fallback(e);}
 };
 const verifyBody=(body:CubePathBody,request:Pending)=>{
  lease.validate(task,request.ack.revision,options.revision());checkStatistics(latest,body.statistics,request.expectedAccepted,pathLimits);
  if(!['accepting','draining','complete','failed'].includes(body.status))throw Error('Invalid cube path status');
  const event=body.event;
  if(event){
   const began=performance.now();checkPhysicalCertificate(event);measure('host.physicalCertificate',performance.now()-began);
   if(event.kind==='dab'){
    if(event.ordinal!==latest.dabs||body.statistics.dabs!==latest.dabs+1||!Number.isSafeInteger(event.inputSequence)||event.inputSequence<0||event.inputSequence>=request.expectedAccepted||event.rounding!=='nearest-even-chart-coordinates'||!event.coordinateBounds)throw Error('Invalid cube physical dab ordinal');
    const point=geometry.canonicalPosition(event.center);if(!samePoint(point,event.center))throw Error('Invalid cube physical center');counters.verifiedDabs++;
   }else if(event.kind==='path'){
    if(!Number.isSafeInteger(event.inputSequence)||event.inputSequence<1||event.inputSequence>=request.expectedAccepted||body.statistics.routeQueries!==latest.routeQueries+1||!samePoint(geometry.canonicalPosition(event.to),allInputs[event.inputSequence]!)||!samePoint(geometry.canonicalPosition(event.from),allInputs[event.inputSequence-1]!))throw Error('Cube path certificate does not match accepted input');
   }else throw Error('Unknown cube path event');
  }else if(body.statistics.dabs!==latest.dabs)throw Error('Missing cube physical dab certificate');
  if(body.status==='complete'&&(body.statistics.processedInputs!==input!.accepted||event||!released))throw Error('Incomplete cube ordered drain');
  latest=body.statistics;input!.progress(latest.processedInputs);state=body.status;if(released&&state==='accepting')state='draining';output=event;
  if(body.error||body.status==='failed'){const e=new Error(body.error?.message??'Cube path failed');e.name=body.error?.name??'Error';throw e;}
 };
 const progressComparison=()=>{
  const request=pending!;
  if(!request.comparison){request.comparison=createCubeValueComparison(request.slots.primary!.body,request.slots.verifier!.body,CUBE_PATH_WORK_LIMITS.maxResponseBytes);}
  if(!request.comparison.complete){request.comparison.pump(CUBE_PATH_WORK_LIMITS.comparisonSteps);if(!request.comparison.complete)return;request.verified=request.comparison.value as CubePathBody;counters.comparisonNodes+=request.comparison.statistics.nodes;counters.comparisonBytes+=request.comparison.statistics.bytes;}
  if(request.metaIndex<roles.length){
   const role=roles[request.metaIndex]!,slot=request.slots[role]!;
   request.meta??=createCubeValueComparison({workMs:slot.workMs,stages:slot.stages},{workMs:slot.workMs,stages:slot.stages},CUBE_PATH_WORK_LIMITS.maxResponseBytes);
   if(!request.meta.pump(CUBE_PATH_WORK_LIMITS.comparisonSteps))return;
   const meta=request.meta.value as {workMs:number;stages:Slot['stages']};measure(role+'.pathPump',meta.workMs);measure(role+'.roundTrip',slot.receivedAt-request.sentAt);measure(role+'.queueAndTransfer',Math.max(0,slot.receivedAt-request.sentAt-meta.workMs));
   for(const [name,value]of Object.entries(meta.stages)){
    if(!['routeCertification','spacingCenter'].includes(name)||value.count!==1||value.samples.length!==1||value.totalMs!==value.maxMs||value.samples[0]!==value.totalMs)throw Error('Invalid cube worker stage measurement');measure(role+'.'+name,value.totalMs);
   }
   request.meta=undefined;request.metaIndex++;return;
  }
  verifyBody(request.verified!,request);counters.verifiedSteps++;
  if(!adopted){adopted=true;local!.cancel();local=undefined;captured=undefined;log=[];logBytes=logEvents=0;afterCheckpoint=[];}
  pending=undefined;
 };
 const path:CubeExecutionPath=Object.freeze({geometry:pathGeometry,spacingMeters,limits:pathLimits,
  get status(){return backend==='local'&&local&&!fatal?local.status:state;},get failure(){return fatal?Object.freeze({name:fatal.name,message:fatal.message}):local?.failure;},
  get statistics(){
   const base=backend==='local'&&local?local.statistics:latest,accepted=input?.accepted??base.acceptedInputs;
   return Object.freeze({...base,acceptedInputs:accepted,pendingInputs:closed?0:Math.max(0,accepted-base.processedInputs-(base.activeRoute?1:0)),outputEvents:closed?0:backend==='local'&&local?base.outputEvents:output?1:0,
    peakPendingInputs:Math.max(base.peakPendingInputs,counters.peakPendingInputs),...(closed?{discardedInputs:state==='complete'?0:accepted-base.processedInputs,activeRoute:false,retainedArcTerms:0}:{})});
  },
  synchronized(){if(fatal)throw fatal;lease.validate(task,ack.revision,options.revision());},
  acknowledge(revision:number,committedDabs:number,writes:number){
   if(committedDabs!==path.statistics.dabs||revision!==options.revision()||revision!==ack.revision+writes-ack.writes||committedDabs!==ack.committedDabs+1||writes<ack.writes||writes-ack.writes>65_536)throw Error('Invalid authoritative cube acknowledgement');
   ack=Object.freeze({revision,committedDabs,writes});lease.acknowledged(revision);
  },
  accept(point:SurfacePosition){
   if(closed||released||fatal)throw fatal??Error('Cube path no longer accepts input');
   const normalized=geometry.canonicalPosition(point);if(input&&input.pending>=input.maxPending)return false;
   if(backend==='local'){
    if(!local!.accept(normalized))return false;if(!input)input=new OrderedSurfaceInput(pathLimits.maxPendingInputs,pathLimits.maxAcceptedInputs);else input.accept();record({kind:'accept',point:normalized});
   }else{
    input!.accept();unsent.push({ordinal:input!.accepted-1,point:normalized});if(!adopted)afterCheckpoint.push(normalized);
   }
   allInputs.push(normalized);counters.peakPendingInputs=Math.max(counters.peakPendingInputs,input!.pending);signal.notify();return true;
  },
  release():ReturnType<SolidCubeStrokePath['release']>{if(!closed&&!released){released=true;if(backend==='local'){local!.release();record({kind:'release'});}state='draining';signal.notify();}return path.status as ReturnType<SolidCubeStrokePath['release']>;},
  cancel():ReturnType<SolidCubeStrokePath['cancel']>{
   if(closed)return path.status as ReturnType<SolidCubeStrokePath['cancel']>;state=path.status;if(state==='accepting'||state==='draining')state='cancelled';latest=backend==='local'&&local?local.statistics:latest;closed=true;stopWorkers(state==='complete');local?.cancel();local=undefined;pending=undefined;captured=undefined;log=[];logBytes=logEvents=0;allInputs=[];afterCheckpoint=[];unsent=[];output=undefined;lease.cancel();signal.notify();return state;
  },
  take(){
   if(backend==='local'&&local){const event=local.take();if(event)record({kind:'take',event});return event;}
   const event=output;output=undefined;return event;
  },
  pump(){
   if(fatal)throw fatal;if(closed)return state;
   try{
    if(backend==='local'){
     if(!promotionDisabled&&local!.statistics.dabs===ack.committedDabs&&local!.statistics.dabs>0&&(options.mode==='worker'||local!.statistics.routeQueries>=CUBE_RESPONSIVE_POLICY.offloadAfterCertifiedIntervals)){promote();return path.status;}
     local!.pump();record({kind:'pump'});latest=local!.statistics;input?.progress(latest.processedInputs);state=local!.status;return state;
    }
    if(backend==='starting')return path.status;
    if(pending){if(roles.every(role=>pending!.slots[role]))progressComparison();return path.status;}
    const sent=unsent;unsent=[];pending={sequence:++sequence,ack,accepted:{},slots:{},sentAt:performance.now(),expectedAccepted:input!.accepted,metaIndex:0};counters.requests++;
    workTimer=setTimeout(()=>fallback('Cube worker request timed out'),options.workTimeoutMs??CUBE_PATH_WORK_LIMITS.workTimeoutMs);
    for(const role of roles)workers[role]!.postMessage({type:'step',task,generation,binding:options.binding,role,sequence,inputs:sent,released,ack} satisfies CubePathWorkInput);
    return path.status;
   }catch(e){fail(e);throw e;}
  },
 });
 return {path,
  get waiting(){return !closed&&!fatal&&(backend==='starting'||backend==='worker'&&Boolean(pending)&&!roles.every(r=>pending!.slots[r]));},
  get idle(){const stats=path.statistics;return !closed&&!fatal&&path.status==='accepting'&&!stats.pendingInputs&&!stats.activeRoute&&!stats.outputEvents&&stats.dabs===ack.committedDabs;},
  waitForProgress:()=>signal.wait(),
  get diagnostics(){return structuredClone({...counters,task,generation,policy:CUBE_RESPONSIVE_POLICY,stages,retainedReplayBytes:logBytes,liveWorkers:Object.keys(workers).length,pendingSourceRevision:pending?.ack.revision});},
 };
}
