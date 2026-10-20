import { startSphericalBrushStroke } from '../terrain/spherical-brush.ts';
import { sphereWorkEpoch } from './sphere-work-epoch.ts';
import type { SphereWorkInput,SphereWorkOutput,SphereAcceptedPoint } from './sphere-work-protocol.ts';
/** One ready dab waits for the host. No speculative source-epoch advancement. */
export function createSphereWorkRuntime(send:(message:SphereWorkOutput)=>void,schedule:(fn:()=>void)=>void){
 let task=-1,sequence=0,waiting=false,acknowledged=false,scheduled=false,released=false,processed=0,ordinal=1,expectedWrites=0,computeMs=0,snapshotMs=0;
 let terrain:ReturnType<typeof sphereWorkEpoch>|undefined,stroke:ReturnType<typeof startSphericalBrushStroke>|undefined,initial:Generator<boolean,void>|undefined,segment:Generator<boolean>|undefined;
 const queue:SphereAcceptedPoint[]=[];
 let waitingAt=0;const ackWait={count:0,totalMs:0,maxMs:0,samples:[] as number[]};
 const fail=(error:unknown)=>{const statistics=stroke?.statistics;stroke?.end();stroke=undefined;terrain=undefined;queue.length=0;initial=undefined;segment=undefined;waiting=false;send({type:'error',task,message:String(error),processed,statistics});};
 const kick=()=>{if(!scheduled&&!waiting&&stroke&&(initial||segment||queue.length||released)){scheduled=true;schedule(tick);}};
 function tick(){scheduled=false;const start=performance.now();try{
  let count=0;while(stroke&&!waiting&&count++<64&&performance.now()-start<6){
   if(initial){const next=initial.next();if(next.done){initial=undefined;processed=1;}if(waiting)break;}
   else if(segment){const next=segment.next();if(next.done){segment=undefined;processed=ordinal;}if(waiting)break;}
   else if(queue.length){const point=queue.shift()!;ordinal=point.ordinal;segment=stroke.moveToSteps({...terrain!.metadata.identity,direction:point.direction},point.visibility);}
   else if(released){const statistics=stroke.statistics;stroke.end();stroke=undefined;terrain=undefined;computeMs+=performance.now()-start;send({type:'done',task,processed,statistics,computeMs,snapshotMs,ackWait:{...ackWait,samples:[...ackWait.samples]}});return;}
   else break;
  }
  computeMs+=performance.now()-start;if(stroke&&!waiting)send({type:'progress',task,processed,statistics:stroke.statistics});kick();
 }catch(error){computeMs+=performance.now()-start;fail(error);}}
 return{receive(message:SphereWorkInput){try{
  if(message.type==='start'){
   if(stroke)throw Error('A spherical preparation task is already active.');task=message.task;sequence=0;waiting=false;acknowledged=false;released=false;processed=0;ordinal=1;computeMs=0;queue.length=0;ackWait.count=0;ackWait.totalMs=0;ackWait.maxMs=0;ackWait.samples.length=0;const start=performance.now();terrain=sphereWorkEpoch(message.metadata,message.values,message.sourceRevision);snapshotMs=performance.now()-start;send({type:'started',task,snapshotMs});
   stroke=startSphericalBrushStroke(terrain,{...terrain.metadata.identity,direction:message.direction},message.settings,undefined,message.hemisphere?{hemisphere:message.hemisphere}:undefined,{deferInitial:true,commitReady(job){
    if(acknowledged){acknowledged=false;return true;}const changes=[...job.changes()];waiting=true;waitingAt=performance.now();expectedWrites=changes.length;
    const before=new Uint32Array(changes.length),word=new Float32Array(1),bits=new Uint32Array(word.buffer);for(let i=0;i<changes.length;i++){word[0]=changes[i]!.before;before[i]=bits[0]!;}
    send({type:'prepared',task,sequence:++sequence,sourceRevision:terrain!.revision,ordinal,fraction:job.fraction,center:job.center,visible:job.visible,indices:Uint32Array.from(changes,c=>c.index),before,after:Float32Array.from(changes,c=>c.after),statistics:stroke!.statistics,processed});return false;
   }});initial=stroke.initialSteps();kick();return;
  }
  if(message.task!==task||!stroke)return;
  if(message.type==='move'){if(released||queue.length>=2048)throw Error('Released or bounded spherical worker input.');const expected=(queue.at(-1)?.ordinal??(segment?ordinal:Math.max(1,processed)))+1;if(message.point.ordinal!==expected)throw Error('Out-of-order spherical worker input.');queue.push(message.point);}
  else if(message.type==='release')released=true;
  else if(message.type==='ack'){if(!waiting||message.sequence!==sequence||message.revision!==terrain!.revision+expectedWrites)throw Error('Invalid spherical canonical acknowledgement.');const elapsed=performance.now()-waitingAt;ackWait.count++;ackWait.totalMs+=elapsed;ackWait.maxMs=Math.max(ackWait.maxMs,elapsed);if(ackWait.samples.length===512)ackWait.samples.shift();ackWait.samples.push(elapsed);waiting=false;acknowledged=true;}
  kick();
 }catch(error){fail(error);}}};
}
