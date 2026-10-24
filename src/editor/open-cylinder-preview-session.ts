import type {OpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import {beginOpenCylinderStroke} from '../terrain/open-cylinder-stroke.ts';
import {prepareOpenCylinderDab} from '../terrain/open-cylinder-brush.ts';
import {OpenCylinderDisplayCache,openCylinderVisibilityGuard} from '../rendering/open-cylinder-raster.ts';
import type {OpenCylinderView} from '../rendering/open-cylinder-view.ts';
import type {CylinderExcavation} from '../surfaces/hollow-cylinder-excavation.ts';
import {ConnectedPreviewSession} from './connected-preview-session.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS} from './physical-brush-policy.ts';
import type {ConnectedSessionHooks} from './connected-session-contracts.ts';
import {openCylinderWorkerFactory,beginWorkerOpenCylinderStroke} from './open-cylinder-work.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import type {IndexedDisplayCache} from '../rendering/indexed-display-cache.ts';
/** One connected authority/history; geometry is supplied through the accepted
 * session's hooks. No closed-provider metadata or second bank is fabricated. */
export class OpenCylinderPreviewSession extends ConnectedPreviewSession<OpenCylinderTerrain,OpenCylinderView>{
 constructor(terrain:OpenCylinderTerrain,name:string,saved=false,scene:()=>CylinderExcavation|undefined=()=>undefined,profile?:{createCache:(t:OpenCylinderTerrain)=>IndexedDisplayCache<OpenCylinderTerrain>;rollingWork:boolean}){
  const visibility:ConnectedSessionHooks<OpenCylinderTerrain,OpenCylinderView>['visibility']=(t,v)=>openCylinderVisibilityGuard(t,v,{width:1,height:1},scene());
  super(terrain,name,saved,true,{createCache:profile?.createCache??(t=>new OpenCylinderDisplayCache(t)),begin:beginOpenCylinderStroke,visibility,strokeOptions:profile?()=>({rollingWork:profile.rollingWork}):undefined,
   prepareStencil:(t,center,settings,view)=>{const job=prepareOpenCylinderDab(t,center,settings,PHYSICAL_PREVIEW_DAB_LIMITS),guard=visibility(t,view);return{job,finish:()=>{const indices=Uint32Array.from(job.preparedChanges(t),c=>c.index);guard(job.center,indices);const result={center:job.center,indices,revision:job.sourceRevision,settings:job.settings,affectedSamples:job.statistics.affectedSamples};job.cancel();return result;}};},
   workers:{factory:openCylinderWorkerFactory,begin:beginWorkerOpenCylinderStroke,preparedPatch:connectedPreparedPatch,startPreview:(worker,{terrain,task,revision,values,center,settings,view,measure})=>worker.postMessage({type:'start',task,metadata:terrain.metadata,revision,values,center,settings,options:{},preview:view,measure},[values.buffer])},
  });
  this.message=saved?'Open cylinder reopened. Continue editing the same geography.':'Blank open-cylinder ocean. Save explicitly to this browser.';
 }
}
