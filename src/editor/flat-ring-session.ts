import type {FlatRing} from '../terrain/flat-ring.ts';
import {FLAT_RING_MAX_SAMPLES,flatRingResolution,flatRingBrushPolicy} from '../terrain/flat-ring.ts';
import {IndexedDisplayCache} from '../rendering/indexed-display-cache.ts';
import {createOpenCylinderTerrain,type OpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import {initialOpenCylinderView,type OpenCylinderView} from '../rendering/open-cylinder-view.ts';
import {openCylinderRasterSteps,openCylinderVisibilityGuard} from '../rendering/open-cylinder-raster.ts';
import {ringworldHitFieldBytes,releaseRingworldHitField} from '../rendering/ringworld-hit-field.ts';
import {ringworldPointerInputs} from './ringworld-document.ts';
import {ConnectedPreviewSession} from './connected-preview-session.ts';
import {beginFlatRingStroke} from '../terrain/flat-ring-stroke.ts';
import {prepareFlatRingDab} from '../terrain/flat-ring-brush.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS} from './physical-brush-policy.ts';
import {flatRingWorkerFactory,beginWorkerFlatRingStroke} from './flat-ring-work.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import {defaultCylinderControls,physicalBrushFromControls,type CylinderControls} from './cylinder-controls.ts';
import {cylinderFrameLayout} from '../rendering/cylindrical-view.ts';
import {cross3,unitDirection} from '../surfaces/cube-sphere.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';
let fieldPrepared=false;

export class FlatRingDisplayCache extends IndexedDisplayCache<OpenCylinderTerrain>{
 constructor(world:FlatRing){const actual=world.terrain.metadata.representation.resolution,expected=flatRingResolution(world.configuration,world.detail);if(JSON.stringify(actual)!==JSON.stringify(expected))throw RangeError('Unqualified Flat Ring terrain profile.');super(world.terrain,FLAT_RING_MAX_SAMPLES,'Flat Ring display sample budget exceeded.');}
 get ownedArrayBufferBytes(){return this.byteLength+ringworldHitFieldBytes(this);}
 override dispose(){releaseRingworldHitField(this);super.dispose();}
 /** Prepare all accepted coast/land/relief paths once, on an isolated private
  * numerical fixture. Its tiny output is never published. This avoids a cold
  * first land dab without touching the active World's canonical geography. */
 override *prepare(){yield* super.prepare();if(fieldPrepared)return;const t=this.terrain,values=new Float32Array(t.sampleCount);for(let i=0;i<values.length;i++)values[i]=(i%31-15)*.8;const fixture=createOpenCylinderTerrain({terrainId:'ringworld-display-preparation',geometry:{...t.geometry.metadata,identity:{worldId:'ringworld-preparation',surfaceId:'boundary'}},resolution:t.metadata.representation.resolution,initialValues:values}),cache=new IndexedDisplayCache(fixture,FLAT_RING_MAX_SAMPLES,'Flat Ring preparation budget exceeded.');try{for(const view of[initialOpenCylinderView('exterior'),initialOpenCylinderView('interior'),initialOpenCylinderView('exterior','map')]){const steps=openCylinderRasterSteps(cache,view,{width:128,height:96},12288,undefined,'relief');for(const step of steps){void step;yield;}}fieldPrepared=true;}finally{cache.dispose();}}

}
export interface FlatRingEditing{readonly navigation:'rotate'|'pan';readonly view:OpenCylinderView;readonly controls:CylinderControls}
export function initialFlatRingView(mode:OpenCylinderView['mode']='physical'):OpenCylinderView{
 const forward=unitDirection([.75,-1,1.4]),right=unitDirection(cross3([0,0,1],forward));
 return{...initialOpenCylinderView('exterior',mode),frame:{forward,right,up:unitDirection(cross3(forward,right))}};
}
export function defaultFlatRingEditing(world:FlatRing):FlatRingEditing{return{navigation:'rotate',view:initialFlatRingView(),controls:{...defaultCylinderControls(world.configuration.outerRadiusMeters),radius:String(flatRingBrushPolicy(world.configuration).defaultRadius)}};}
export function validateFlatRingEditing(world:FlatRing,input:FlatRingEditing):FlatRingEditing{
 if(!input||!['rotate','pan'].includes(input.navigation)||!input.view||input.view.scope!=='exterior'||input.view.interior!==false||input.view.interiorView!=='edit'||input.view.eyeMeters!==undefined)throw RangeError('Invalid Flat Ring editing state.');
 const v=input.view;if(v.mapProjection!==undefined&&!['upper-annulus','lower-annulus','inner-wall','outer-wall'].includes(v.mapProjection))throw RangeError('Unsupported Flat Ring map.');if(!Array.isArray(v.target)||v.target.length!==3||v.target.some(x=>!Number.isFinite(x)||Math.abs(x)>16)||!v.pan||![v.pan.x,v.pan.y].every(x=>Number.isFinite(x)&&Math.abs(x)<=16)||!Number.isFinite(v.phase)||Math.abs(v.phase)>Math.PI)throw RangeError('Invalid Flat Ring camera bounds.');
 cylinderFrameLayout({radiusMeters:world.configuration.outerRadiusMeters,lengthMeters:world.configuration.thicknessMeters},v,{width:100,height:100});const p=flatRingBrushPolicy(world.configuration),c=input.controls;
 if(!c||!['navigate','raise','lower','smooth','flatten'].includes(c.tool)||Object.values(c).some(x=>typeof x!=='string')||!(['raise','smooth','flatten']as const).every(tool=>physicalBrushFromControls({...c,tool},p.minimum,p.maximum)))throw RangeError('Invalid Flat Ring brush controls.');
 return{navigation:input.navigation,controls:structuredClone(c),view:structuredClone({mode:v.mode,frame:v.frame,zoom:v.zoom,target:v.target,pan:v.pan,phase:v.phase,scope:v.scope,interior:v.interior,interiorView:v.interiorView,...(v.mapProjection?{mapProjection:v.mapProjection}:{})})};
}
export class FlatRingSession extends ConnectedPreviewSession<OpenCylinderTerrain,OpenCylinderView>{
 readonly world:FlatRing;editing:FlatRingEditing;captureEditing=()=>{};private savedEditing:string;private inputCenter?:SurfacePosition;private inputLimit=0;
 constructor(world:FlatRing,name:string,saved=false,editing=defaultFlatRingEditing(world)){
  const visibility=(t:OpenCylinderTerrain,v:OpenCylinderView)=>openCylinderVisibilityGuard(t,v,{width:1,height:1});
  super(world.terrain,name,saved,true,{createCache:()=>new FlatRingDisplayCache(world),begin:beginFlatRingStroke,visibility,strokeOptions:()=>({rollingWork:true}),
   prepareStencil:(t,center,settings,view)=>{const job=prepareFlatRingDab(t,center,settings,PHYSICAL_PREVIEW_DAB_LIMITS),guard=visibility(t,view);return{job,finish:()=>{const indices=Uint32Array.from(job.preparedChanges(t),c=>c.index);guard(job.center,indices);const result={center:job.center,indices,revision:job.sourceRevision,settings:job.settings,affectedSamples:job.statistics.affectedSamples};job.cancel();return result;}};},
   workers:{factory:flatRingWorkerFactory,begin:beginWorkerFlatRingStroke,preparedPatch:connectedPreparedPatch,startPreview:(worker,{terrain,task,revision,values,center,settings,view,measure})=>worker.postMessage({type:'start',task,metadata:terrain.metadata,revision,values,center,settings,options:{},preview:view,measure},[values.buffer])},
  });this.world=world;this.editing=validateFlatRingEditing(world,editing);this.savedEditing=JSON.stringify(this.editing);this.message=saved?'Flat Ring reopened. Continue sculpting the same connected geography.':'Blank Flat Ring ocean. Four real regions surround an open center.';
 }
 override releaseViewport(){if(this.closed)return;this.cancel('Surface view released');this.lastDab=undefined;}
 override begin(center:SurfacePosition,settings:CylindricalBrushSettings,view:OpenCylinderView,at=performance.now()){const accepted=super.begin(center,settings,view,at);if(accepted){this.inputCenter=this.terrain.geometry.normalize(center);this.inputLimit=Math.min(settings.radiusMeters*4,Math.PI*this.terrain.geometry.metadata.innerRadiusMeters/4);}return accepted;}
 override move(center:SurfacePosition,at=performance.now()){if(!this.inputCenter)return super.move(center,at);let points;try{points=ringworldPointerInputs(this.terrain,this.inputCenter,center,this.inputLimit);}catch{return super.move(center,at);}for(const p of points)if(!super.move(p,at))return false;this.inputCenter=points.at(-1)!;return true;}
 override get modified(){return super.modified||JSON.stringify(this.editing)!==this.savedEditing;}
 override markSaved(name:string){this.captureEditing();super.markSaved(name);this.savedEditing=JSON.stringify(this.editing);this.changed();}
 override async drainForSave(yieldWork?:()=>Promise<void>){await super.drainForSave(yieldWork);this.captureEditing();}
}
export async function prepareFlatRingSession(world:FlatRing,name:string,saved=false,work:PersistenceWork={},editing?:FlatRingEditing){
 const started=performance.now(),editor=new FlatRingSession(world,name,saved,editing),steps=editor.cache.prepare();try{let done=false;while(!done){const at=performance.now();do{done=!!steps.next().done;}while(!done&&performance.now()-at<5);await workStep(work,'Preparing Flat Ring terrain',done?1:0);}return{world,terrain:world.terrain,editor,preparationMs:performance.now()-started};}catch(error){steps.return(undefined);editor.dispose();throw error;}
}
