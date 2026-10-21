import {createResponsiveSolidCubeSession,type ResponsiveCubeOptions} from './solid-cube-responsive-session.ts';
import type {CubeBrushSettings} from '../terrain/solid-cube-brush.ts';
import type {SolidCubeTerrain} from '../terrain/solid-cube.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CubeStrokeOptions,CubeDabTimeline} from './solid-cube-session.ts';
import {cubeTaskYield} from '../rendering/solid-cube-field.ts';
import type {CubePublication} from './solid-cube-history.ts';
import {CUBE_INTERACTIVE_PATH_LIMITS,CUBE_STROKE_PATH_LIMITS} from '../surfaces/solid-cube-stroke-path.ts';
import {OrderedSurfaceInput,SurfaceProgressSignal} from './surface-work.ts';

export const CUBE_EDITOR_INPUT_LIMIT=128;
export interface CubeEditTiming extends Partial<CubeDabTimeline> {inputAt:number;commitAt:number;displayPreparedAt?:number;visibleAt?:number;revision:number;inputToCommitMs:number;commitToVisibleMs?:number;inputToVisibleMs?:number}
/** UI scheduling only. The accepted C2B2 session owns paths, C1 dabs and exact history. */
export class CubeEditorSession {
 readonly terrain:SolidCubeTerrain;readonly core:ReturnType<typeof createResponsiveSolidCubeSession>;
 name:string;hasSaved:boolean;locked=false;changed=()=>{};
 visualize:()=>Promise<number|void|{revision:number;preparedAt:number}>=async()=>{};
 published:((change:CubePublication)=>void)=()=>{};
 private displayJob?:Promise<void>;private displayRequested=false;private displayedRevision:number;
 private queue:{point:SurfacePosition;at:number}[]=[];private released=false;private job?:Promise<void>;
 private readonly progressSignal=new SurfaceProgressSignal();private admission?:OrderedSurfaceInput;
 private closed=false;private baseline:Uint32Array;private baselineName:string;private dirty=false;
 private readonly placement:'exact'|'bounded-phase';
 private checkpointDifferences=new Set<number>();private trackedRevision:number;
 private readonly word=new DataView(new ArrayBuffer(4));
 private failure='';private unresolved=false;private inputAt=0;private inputTimes:number[]=[];
 status='Ready to sculpt';readonly timings:CubeEditTiming[]=[];maxPumpMs=0;
 constructor(terrain:SolidCubeTerrain,name:string,saved=false,options:ResponsiveCubeOptions={}){
  this.terrain=terrain;this.name=name;this.baselineName=name;this.hasSaved=saved;
  this.baseline=new Uint32Array(terrain.copyElevations().buffer);
  this.trackedRevision=terrain.revision;
  this.displayedRevision=terrain.revision;
  this.placement=options.placement??(options.mode==='worker'?'exact':'bounded-phase');
  this.core=createResponsiveSolidCubeSession(terrain,{...options,placement:this.placement,historyLimits:{capacity:'surface',workWindow:this.placement==='bounded-phase'?'dab':'gesture',...options.historyLimits},trackPublications:true});
 }
 get history(){return this.core.history;}get modified(){return this.dirty||this.name!==this.baselineName;}
 get gestureInputLimit(){return(this.placement==='bounded-phase'?CUBE_INTERACTIVE_PATH_LIMITS:CUBE_STROKE_PATH_LIMITS).maxAcceptedInputs;}
 get painting(){return !!this.core.stroke;}get processing(){return !!this.job;}get pendingPoints(){return this.queue.length;}
 get error(){return this.failure;}get needsRecovery(){return this.unresolved;}get disposed(){return this.closed;}
 snapshot(){return {status:this.status,error:this.error,needsRecovery:this.unresolved,modified:this.modified,processing:this.processing,painting:this.painting,pending:this.queue.length,admission:this.admission&&{accepted:this.admission.accepted,processed:this.admission.processed,pending:this.admission.pending,peak:this.admission.peak},revision:this.terrain.revision,history:this.history.statistics,operations:this.history.operations,stroke:this.core.stroke?.statistics??this.core.lastStroke?.statistics,termination:this.core.lastStroke?.status,failure:this.core.lastStroke?.failure,placement:this.placement,executionBackend:this.core.diagnostics?.backend??'cooperative certified fixed-phase',diagnostics:this.core.diagnostics,timings:this.timings.slice(),maxPumpMs:this.maxPumpMs};}
 begin(point:SurfacePosition,settings:CubeBrushSettings,options:CubeStrokeOptions={},inputTime=performance.now()){
  if(this.closed||this.locked||this.job||this.unresolved)return false;
  try{const now=performance.now();this.inputAt=Number.isFinite(inputTime)&&inputTime>=0&&inputTime<=now?inputTime:now;this.core.begin(point,settings,{workWindow:this.placement==='bounded-phase'?'dab':'gesture',...options});this.admission=new OrderedSurfaceInput(CUBE_EDITOR_INPUT_LIMIT,this.gestureInputLimit);this.failure='';this.queue=[];this.inputTimes=[this.inputAt];this.released=false;this.status='Drawing';this.start();return true;}
  catch(error){this.failed(error);return false;}
 }
 accept(point:SurfacePosition,inputTime=performance.now()){
  if(!this.core.stroke||this.released||this.closed)return false;
  try{this.admission!.accept();}catch(error){this.failed(Error(`Input queue/count limit reached: ${error instanceof Error?error.message:String(error)}`));this.core.cancel();this.queue=[];this.signal();return false;}
  const now=performance.now();this.queue.push({point,at:Number.isFinite(inputTime)&&inputTime>=0&&inputTime<=now?inputTime:now});this.signal();return true;
 }
 release(){this.released=true;if(this.core.stroke)this.status='Finishing accepted stroke';this.signal();}
 cancel(){
  this.queue=[];this.released=true;
  if(this.core.stroke){this.core.cancel();this.unresolved=true;this.failure='Stroke cancelled. Its committed portion is preserved. Undo it or keep the partial result.';this.status='Cancelled stroke';}
  this.signal();this.changed();
 }
 private signal(){this.progressSignal.notify();}
 private failed(error:unknown){this.failure=`Stroke stopped early: ${error instanceof Error?error.message:String(error)} Its committed portion is retained. Undo it or keep the partial result before continuing.`;this.unresolved=true;this.status='Stroke stopped early';this.changed();}
 private start(){
  this.job=this.run().finally(()=>{this.job=undefined;this.changed();});this.changed();
 }
 private collectPublication(){
  const publication=this.history.takePublication();if(!publication)return;
  if(publication.kind==='delta'&&publication.sourceRevision===this.trackedRevision){
   for(const index of publication.indices){this.word.setFloat32(0,this.terrain.read(this.terrain.keyAt(index)),true);if(this.word.getUint32(0,true)===this.baseline[index])this.checkpointDifferences.delete(index);else this.checkpointDifferences.add(index);}
   this.trackedRevision=publication.revision;this.dirty=this.checkpointDifferences.size>0;
  }else this.dirty=true; // A missed/untracked epoch gets a full reconciliation once, never each dab.
  this.published(publication);
 }
 /** Display owns snapshots of committed epochs. It cannot hold up C1 or path progress. */
 private requestDisplay(){
  this.displayRequested=true;if(this.displayJob||this.closed)return;
  this.displayJob=(async()=>{try{
   while(this.displayRequested&&!this.closed){this.displayRequested=false;if(this.displayedRevision===this.terrain.revision)continue;
    const result=await this.visualize();if(this.closed)return;this.displayedRevision=typeof result==='object'?result.revision:result??this.terrain.revision;const now=performance.now();
    for(const timing of this.timings)if(timing.visibleAt===undefined&&timing.revision<=this.displayedRevision){timing.displayPreparedAt=typeof result==='object'?result.preparedAt:undefined;timing.visibleAt=now;timing.commitToVisibleMs=now-timing.commitAt;timing.inputToVisibleMs=now-timing.inputAt;}
    if(this.displayedRevision!==this.terrain.revision)this.displayRequested=true;
   }
  }catch(error){this.queue=[];this.core.cancel();this.failed(error);this.signal();}
  })().finally(()=>{this.displayJob=undefined;this.changed();});
 }
 private async run(){
  try{
   while(!this.closed&&this.core.stroke){
    const stroke=this.core.stroke;
    while(this.queue.length&&stroke.status==='drawing'){
     if(!stroke.accept(this.queue[0]!.point))break;this.inputTimes.push(this.queue.shift()!.at);
    }
    if(this.released&&!this.queue.length)this.core.release();
    const before=this.terrain.revision,at=performance.now();
    do{this.core.pump(256);if(this.terrain.revision!==before||!this.core.stroke||this.core.stroke.statistics.lastStage==='idle'||this.core.waitingForPath)break;}while(performance.now()-at<4);
    this.admission?.progress(stroke.statistics.fullyExecutedInputs);
    this.maxPumpMs=Math.max(this.maxPumpMs,performance.now()-at);
    if(this.terrain.revision!==before){
     this.collectPublication();const commitAt=performance.now(),inputAt=this.inputTimes[stroke.statistics.lastCommittedInputSequence??0]??this.inputAt,record:CubeEditTiming={...stroke.statistics.lastCommittedTiming,inputAt,commitAt,revision:this.terrain.revision,inputToCommitMs:commitAt-inputAt};
     if(this.timings.length===240)this.timings.shift();this.timings.push(record);this.status=this.released?'Finishing stroke · updating terrain':'Drawing · updating terrain';this.changed();
     this.requestDisplay();if(this.closed)return;
    }
    this.changed();if(!this.core.stroke)break;
    if(this.core.stroke.statistics.lastStage==='idle'&&!this.queue.length&&!this.released)await this.progressSignal.wait();
    else await this.core.waitForProgress();
   }
   if(!this.closed){await this.displayJob;if(!this.unresolved)this.status=this.core.lastStroke?.status==='complete'?'Stroke complete':'Ready to sculpt';await this.reconcile();}
  }catch(error){this.queue=[];this.core.cancel();this.failed(error);if(!this.closed){this.requestDisplay();await this.displayJob;await this.reconcile();}}
 }
 private async reconcile(){
  if(this.trackedRevision===this.terrain.revision)return;
  const values=new Uint32Array(this.terrain.copyElevations().buffer),revision=this.terrain.revision,differences=new Set<number>();
  for(let i=0;i<values.length;i++){if(values[i]!==this.baseline[i])differences.add(i);if(i%8192===8191)await cubeTaskYield();}
  if(!this.closed&&revision===this.terrain.revision){this.checkpointDifferences=differences;this.trackedRevision=revision;this.dirty=differences.size>0;}
 }
 async replay(redo=false){
  if(this.closed||this.locked)return;this.cancel();await this.job;
  try{if(redo?this.core.redo():this.core.undo()){this.collectPublication();this.unresolved=false;this.failure='';this.status=redo?'Redo · updating terrain':'Undo · updating terrain';
    this.job=(async()=>{this.requestDisplay();await this.displayJob;await this.reconcile();})().finally(()=>{this.job=undefined;if(!this.unresolved)this.status=redo?'Redo complete':'Undo complete';this.changed();});await this.job;
   }else this.changed();
  }catch(error){this.failed(error);}
 }
 keepPartial(){if(this.processing)return;this.unresolved=false;this.failure='';this.status='Partial stroke retained · ready to sculpt';this.changed();}
 async drainForSave(yieldWork=cubeTaskYield){this.release();await this.job;await yieldWork();if(this.unresolved)throw Error('Resolve the stopped stroke: Undo it or choose Keep partial result before saving.');}
 markSaved(name=this.name){this.name=this.baselineName=name;this.baseline=new Uint32Array(this.terrain.copyElevations().buffer);this.checkpointDifferences.clear();this.trackedRevision=this.terrain.revision;this.hasSaved=true;this.dirty=false;this.changed();}
 dispose(){this.closed=true;this.queue=[];this.core.dispose();this.signal();this.changed=()=>{};this.published=()=>{};this.visualize=async()=>{};}
}
