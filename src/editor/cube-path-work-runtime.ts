import {createSolidCubeStrokePath, type SolidCubeStrokePath} from '../surfaces/solid-cube-stroke-path.ts';
import {createCubeValueComparison, cubeWorkValueBytes} from './cube-work-value.ts';
import {CUBE_PATH_WORK_LIMITS, type CubePathAck, type CubePathBody, type CubePathHeader, type CubePathWorkInput, type CubePathWorkOutput, type CubeReplayAction} from './cube-path-work-protocol.ts';
import {paintingMetrics,resetPaintingMetrics} from './painting-metrics.ts';

function validAck(ack:CubePathAck){if(!ack||![ack.revision,ack.committedDabs,ack.writes].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('Invalid cube source acknowledgement');}
/** Two instances execute the unchanged path provider. This realm owns no elevation array or history. */
export function createCubePathWorkRuntime(send:(message:CubePathWorkOutput)=>void,schedule:(fn:()=>void)=>void){
 let header:CubePathHeader|undefined,path:SolidCubeStrokePath|undefined,ack:CubePathAck|undefined,sequence=0,closed=false,queued=false,busy=false;
 let start:Extract<CubePathWorkInput,{type:'start'}>|undefined,actions:readonly CubeReplayAction[]=[],index=0,replayStarted=0;
 let comparison:ReturnType<typeof createCubeValueComparison>|undefined,comparisonKind:'actions'|'event'|'statistics'|undefined;
 let step:Extract<CubePathWorkInput,{type:'step'}>|undefined;
 const fail=(e:unknown)=>{if(closed)return;closed=true;path?.cancel();path=undefined;actions=[];comparison=undefined;start=undefined;step=undefined;if(header)send({...header,type:'error',message:String(e).slice(0,512)});};
 const kick=()=>{if(!closed&&!queued){queued=true;schedule(tick);}};
 function tick(){
  queued=false;if(closed)return;
  try{
   if(start){
    if(comparison){
     if(!comparison.pump(CUBE_PATH_WORK_LIMITS.comparisonSteps)){kick();return;}
     if(comparisonKind==='actions'){actions=comparison.value as readonly CubeReplayAction[];path=createSolidCubeStrokePath(start.configuration,start.radius,start.limits);}
     else if(comparisonKind==='event')index++;
     else{
      if(path!.status!==start.expectedStatus||path!.statistics.dabs!==start.ack.committedDabs)throw Error('Cube replay checkpoint mismatch');
      ack=Object.freeze({...start.ack});const message:CubePathWorkOutput={...header!,type:'ready',statistics:path!.statistics,status:path!.status,replayedActions:actions.length,replayWorkUnits:path!.statistics.workUnits,replayMs:performance.now()-replayStarted};
      start=undefined;actions=[];comparison=undefined;comparisonKind=undefined;send(message);return;
     }
     comparison=undefined;comparisonKind=undefined;kick();return;
    }
    if(index<actions.length){
     const action=actions[index]!;
     if(action.kind==='accept'){if(!path!.accept(action.point))throw Error('Cube replay admission mismatch');index++;}
     else if(action.kind==='release'){path!.release();index++;}
     else if(action.kind==='pump'){path!.pump();index++;}
     else if(action.kind==='take'){comparison=createCubeValueComparison(path!.take(),action.event,CUBE_PATH_WORK_LIMITS.maxResponseBytes);comparisonKind='event';}
     else throw Error('Unknown cube replay action');
     kick();return;
    }
    comparison=createCubeValueComparison(path!.statistics,start.expectedStatistics);comparisonKind='statistics';kick();return;
   }
   if(step){
    const request=step;step=undefined;resetPaintingMetrics(true);const at=performance.now();let error:CubePathBody['error'];
    try{path!.pump();}catch(e){error={name:e instanceof Error?e.name:'Error',message:e instanceof Error?e.message:String(e)};}
    const workMs=performance.now()-at,body:CubePathBody={status:path!.status,statistics:path!.statistics,event:path!.take(),...(error?{error}:{})};
    busy=false;send({...header!,type:'step',sequence:request.sequence,revision:ack!.revision,body,workMs,stages:paintingMetrics()});return;
   }
  }catch(e){fail(e);}
 }
 return {
  get completed(){return !closed&&!start&&!busy&&!queued&&path?.status==='complete';},
  receive(input:CubePathWorkInput){
   if(closed)return;
   try{
    if(input.type==='start'){
     if(header)throw Error('Cube worker already started');
     if(!Number.isSafeInteger(input.task)||input.task<1||!Number.isSafeInteger(input.generation)||input.generation<1||!['primary','verifier'].includes(input.role)||typeof input.binding!=='string'||input.binding.length>4096)throw Error('Invalid cube worker identity');
     header=Object.freeze({task:input.task,generation:input.generation,binding:input.binding,role:input.role});validAck(input.ack);
     if(!Array.isArray(input.actions)||input.actions.length>CUBE_PATH_WORK_LIMITS.maxReplayActions||input.actions.filter(a=>a.kind==='take').length>CUBE_PATH_WORK_LIMITS.maxReplayEvents)throw Error('Cube replay action budget');
     // A bounded clone is built cooperatively, rejecting accessors/cycles/oversized data.
     start=input;replayStarted=performance.now();comparison=createCubeValueComparison(input.actions,input.actions,CUBE_PATH_WORK_LIMITS.maxReplayBytes);comparisonKind='actions';kick();return;
    }
    if(!header||input.task!==header.task||input.generation!==header.generation||input.binding!==header.binding||input.role!==header.role)return;
    if(start||busy||!path||input.sequence!==sequence+1)throw Error('Out-of-order cube worker request');validAck(input.ack);
    const changedDabs=input.ack.committedDabs-ack!.committedDabs,changedWords=input.ack.writes-ack!.writes;
    if(input.ack.committedDabs!==path.statistics.dabs||changedDabs<0||changedDabs>1||changedWords<0||changedWords>65_536*changedDabs||input.ack.revision!==ack!.revision+changedWords)throw Error('Unacknowledged cube geography');
    if(!Array.isArray(input.inputs)||input.inputs.length>path.limits.maxPendingInputs||cubeWorkValueBytes(input.inputs)>CUBE_PATH_WORK_LIMITS.maxResponseBytes)throw Error('Cube worker input queue budget');
    for(const item of input.inputs){if(item.ordinal!==path.statistics.acceptedInputs||!path.accept(item.point))throw Error('Out-of-order cube physical input');}
    if(input.released)path.release();ack=Object.freeze({...input.ack});sequence=input.sequence;busy=true;step=input;
    send({...header,type:'accepted',sequence,revision:ack.revision});kick();
   }catch(e){fail(e);}
  },
  dispose(){closed=true;path?.cancel();path=undefined;actions=[];start=undefined;step=undefined;comparison=undefined;},
 };
}
