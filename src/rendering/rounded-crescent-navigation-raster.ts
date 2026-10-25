import {cutGlobeRasterGrid} from './crescent-cut-globe-raster-grid.ts';
import {sphericalFieldRaster} from './spherical-field-raster.ts';
import type {SphereFieldSnapshot,SphereAppearance} from './spherical-elevation.ts';
import type {SphericalView,Viewport} from './spherical-view.ts';
import type {RoundedRasterOutput,RoundedRasterInput} from './rounded-crescent-raster-protocol.ts';
/** At most six workers and one <=8 MiB derived field per worker. A bounded
 * strip queue balances expensive silhouette rays without adding threads.
 * Terrain authority, input, brush work and history stay on their shared paths. */
export class RoundedNavigationRaster {
 readonly statistics={workers:0,pending:false,completed:0,canceled:0,fieldBytes:0,maxComputeMs:0,lastFrameMs:0,maxFrameMs:0,error:'',idleFieldCopies:0};
 private workers:Worker[]=[];private epochs=new Map<Worker,number>();private warming=new Set<Worker>();private id=0;
 private receive:((m:RoundedRasterOutput,worker:Worker)=>void)|undefined;private disposed=false;private changed:()=>void;
 constructor(changed:()=>void){this.changed=changed;try{
  const count=Math.max(1,Math.min(6,Math.max(1,Math.floor((navigator.hardwareConcurrency||4)/2))));
  for(let i=0;i<count;i++){const worker=new Worker(new URL('./rounded-crescent-raster-worker.ts',import.meta.url),{type:'module'});worker.onmessage=e=>{if(e.data.type==='ready'){this.warming.delete(worker);this.changed();}this.receive?.(e.data,worker);};worker.onerror=e=>{this.statistics.error=e.message||'Navigation display worker failed.';const receive=this.receive;this.release();receive?.({type:'error',id:this.id,message:this.statistics.error},worker);this.changed();};this.workers.push(worker);}this.statistics.workers=count;
 }catch(e){this.statistics.error=String(e);this.release();}}
 get pending(){return this.statistics.pending;}
 needsWarm(field:SphereFieldSnapshot){return!this.disposed&&this.workers.some(w=>this.epochs.get(w)!==field.sourceRevision);}
 private sendField(w:Worker,field:SphereFieldSnapshot,view:SphericalView){w.postMessage({type:'field',field,view} satisfies RoundedRasterInput);this.epochs.set(w,field.sourceRevision);this.warming.add(w);this.statistics.fieldBytes=Object.values(field.data).reduce((n,a)=>n+a.byteLength,0)*this.workers.length;}
 /** One read-only field copy per yielding idle task, never during a stroke.
  * A navigation request still synchronously queues any missing worker fields. */
 warmNext(field:SphereFieldSnapshot,view:SphericalView){if(this.disposed||this.pending)return false;const w=this.workers.find(w=>this.epochs.get(w)!==field.sourceRevision&&!this.warming.has(w));if(!w)return false;try{this.sendField(w,field,view);this.statistics.idleFieldCopies++;return true;}catch(e){this.statistics.error=String(e);this.release();this.changed();return false;}}
 warm(field:SphereFieldSnapshot,view:SphericalView){if(this.disposed)return;for(const w of this.workers)if(this.epochs.get(w)!==field.sourceRevision)this.sendField(w,field,view);}
 *render(field:SphereFieldSnapshot,view:SphericalView,size:Viewport,appearance:SphereAppearance,budget:number,backing:Viewport):ReturnType<typeof sphericalFieldRaster>{
  if(!this.workers.length||this.disposed)return yield* sphericalFieldRaster(field,view,size,appearance,budget,undefined,undefined,backing);
  const started=performance.now();this.warm(field,view);const id=++this.id,grid=cutGlobeRasterGrid({left:0,top:0,width:size.width,height:size.height},size,budget,backing),pixels=new Uint8ClampedArray(grid.columns*grid.rows*4),count=Math.min(grid.rows,this.workers.length*4),tasks=Array.from({length:count},(_,i)=>({first:Math.floor(grid.rows*i/count),last:Math.floor(grid.rows*(i+1)/count)})),busy=new Map<Worker,{first:number;last:number}>();let remaining=count,cursor=0,done=false,error='';this.statistics.pending=true;
  const fail=(message:string)=>{error=message;done=true;this.statistics.pending=false;this.changed();};
  const dispatch=(worker:Worker)=>{if(cursor===tasks.length||done)return;const task=tasks[cursor++]!,{first,last}=task,top=Math.max(0,first-1),bottom=Math.min(grid.rows,last+1),sy=grid.rows/grid.height;busy.set(worker,task);worker.postMessage({type:'render',id,view,size,appearance,budget,backing,firstRow:first,rowCount:last-first,haloTop:first-top,grid:{left:grid.left,top:grid.top+top/sy,width:grid.width,height:(bottom-top)/sy,columns:grid.columns,rows:bottom-top,density:{sx:grid.columns/grid.width,sy,x0:0,y0:top,ox:grid.left,oy:grid.top}}} satisfies RoundedRasterInput);};
  this.receive=(m,worker)=>{if(m.type==='ready')return;if(m.id!==id||this.id!==id||done)return;if(m.type==='error'){fail(m.message);return;}const expected=busy.get(worker);if(m.revision!==field.sourceRevision||m.columns!==grid.columns||!expected||expected.first!==m.firstRow||expected.last-expected.first!==m.rowCount||m.pixels.length!==m.columns*m.rowCount*4){fail('Incoherent navigation display epoch or strip.');return;}busy.delete(worker);pixels.set(m.pixels,m.firstRow*grid.columns*4);this.statistics.maxComputeMs=Math.max(this.statistics.maxComputeMs,m.computeMs);if(--remaining===0){done=true;this.statistics.pending=false;this.statistics.completed++;this.statistics.lastFrameMs=performance.now()-started;this.statistics.maxFrameMs=Math.max(this.statistics.maxFrameMs,this.statistics.lastFrameMs);this.changed();}else dispatch(worker);};
  const watchdog=window.setTimeout(()=>{if(!done){this.release();fail('Rounded Crescent navigation worker timed out; cooperative display restored.');}},30000);
  for(const worker of this.workers)dispatch(worker);
  try{while(!done)yield;if(error){this.statistics.error=error;this.release();return yield* sphericalFieldRaster(field,view,size,appearance,budget,undefined,undefined,backing);}return{...grid,pixels,revision:field.sourceRevision};}
  finally{clearTimeout(watchdog);if(!done){for(const w of this.workers)w.postMessage({type:'cancel',id} satisfies RoundedRasterInput);this.statistics.canceled++;this.statistics.pending=false;}if(this.id===id)this.receive=undefined;}
 }
 private release(){for(const w of this.workers)w.terminate();this.workers=[];this.epochs.clear();this.warming.clear();this.statistics.workers=0;this.statistics.fieldBytes=0;this.statistics.pending=false;}
 dispose(){this.disposed=true;this.release();this.receive=undefined;}
}
