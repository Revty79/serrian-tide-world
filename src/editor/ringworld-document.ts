import type {Ringworld} from '../terrain/ringworld.ts';
import {RINGWORLD_MAX_SAMPLES,ringworldResolution} from '../terrain/ringworld.ts';
import {IndexedDisplayCache} from '../rendering/indexed-display-cache.ts';
import {OpenCylinderPreviewSession} from './open-cylinder-preview-session.ts';
import {createOpenCylinderTerrain,type OpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import {initialOpenCylinderView,type OpenCylinderView} from '../rendering/open-cylinder-view.ts';
import {cylinderFrameLayout} from '../rendering/cylindrical-view.ts';
import type {OpenCylinderScope} from '../surfaces/open-cylinder.ts';
import {defaultCylinderControls,type CylinderControls,physicalBrushFromControls} from './cylinder-controls.ts';
import {openCylinderBrushRadiusLimit} from '../terrain/open-cylinder-candidates.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import {cylinderAngle} from '../surfaces/cylinder.ts';
import {openCylinderRasterSteps} from '../rendering/open-cylinder-raster.ts';
import {ringworldHitFieldBytes,releaseRingworldHitField} from '../rendering/ringworld-hit-field.ts';
let fieldPrepared=false;

export class RingworldDisplayCache extends IndexedDisplayCache<OpenCylinderTerrain>{
 constructor(world:Ringworld){const actual=world.terrain.metadata.representation.resolution,expected=ringworldResolution(world.configuration,world.detail);if(JSON.stringify(actual)!==JSON.stringify(expected))throw RangeError('Unqualified Ringworld terrain profile.');super(world.terrain,RINGWORLD_MAX_SAMPLES,'Ringworld display sample budget exceeded.');}
 get ownedArrayBufferBytes(){return this.byteLength+ringworldHitFieldBytes(this);}
 override dispose(){releaseRingworldHitField(this);super.dispose();}
 /** Prepare all accepted coast/land/relief paths once, on an isolated private
  * numerical fixture. Its tiny output is never published. This avoids a cold
  * first land dab without touching the active World's canonical geography. */
 override *prepare(){yield* super.prepare();if(fieldPrepared)return;const t=this.terrain,values=new Float32Array(t.sampleCount);for(let i=0;i<values.length;i++)values[i]=(i%31-15)*.8;const fixture=createOpenCylinderTerrain({terrainId:'ringworld-display-preparation',geometry:{...t.geometry.metadata,identity:{worldId:'ringworld-preparation',surfaceId:'boundary'}},resolution:t.metadata.representation.resolution,initialValues:values}),cache=new IndexedDisplayCache(fixture,RINGWORLD_MAX_SAMPLES,'Ringworld preparation budget exceeded.');try{for(const view of[initialOpenCylinderView('exterior'),initialOpenCylinderView('interior'),initialOpenCylinderView('exterior','map')]){const steps=openCylinderRasterSteps(cache,view,{width:128,height:96},12288,undefined,'relief');for(const step of steps){void step;yield;}}fieldPrepared=true;}finally{cache.dispose();}}

}
/** A known pointer curve is split before the unchanged local route guard. This
 * retains compressed native events without increasing any stroke/queue budget.
 * The cyclic angle and meridian define a feasible upper-bounded surface curve. */
export function ringworldPointerInputs(t:OpenCylinderTerrain,a:SurfacePosition,b:SurfacePosition,limit:number){
 const g=t.geometry,p=g.normalize(a),q=g.normalize(b),S=g.meridianLengthMeters,da=cylinderAngle(q.u-p.u);let dm=g.meridianAt(q)-g.meridianAt(p);if(dm>S/2)dm-=S;if(dm< -S/2)dm+=S;
 const count=Math.max(1,Math.ceil(Math.hypot(g.metadata.outerRadiusMeters*da,dm)/(limit*.5)));
 if(!Number.isFinite(limit)||limit<=0||count>256)throw RangeError('Ringworld pointer curve exceeds the bounded local input budget.');
 return Array.from({length:count},(_,i)=>i===count-1?q:g.fromMeridian(p.u+da*(i+1)/count,g.meridianAt(p)+dm*(i+1)/count));
}
export class RingworldSession extends OpenCylinderPreviewSession{
 private inputCenter?:SurfacePosition;private inputLimit=0;
 constructor(world:Ringworld,name:string,saved=false){super(world.terrain,name,saved,()=>undefined,{createCache:()=>new RingworldDisplayCache(world),rollingWork:true});this.message=saved?'Ringworld reopened. Continue sculpting the same geography.':'Blank Ringworld ocean. Inner and outer bands have independent geography.';}
 // Band switches change the projection, not the authority or worker adapter.
 // Cancel viewport input/preview, retain the one valid warm numerical realm;
 // normal session disposal still terminates it. Every task loads fresh words.
 override releaseViewport(){if(this.closed)return;this.cancel('Surface view released');this.lastDab=undefined;}
 override begin(center:SurfacePosition,settings:CylindricalBrushSettings,view:OpenCylinderView,at=performance.now()){const accepted=super.begin(center,settings,view,at);if(accepted){this.inputCenter=this.terrain.geometry.normalize(center);this.inputLimit=Math.min(settings.radiusMeters*4,Math.PI*this.terrain.geometry.metadata.innerRadiusMeters/4);}return accepted;}
 override move(center:SurfacePosition,at=performance.now()){if(!this.inputCenter)return super.move(center,at);let points:ReturnType<typeof ringworldPointerInputs>;try{points=ringworldPointerInputs(this.terrain,this.inputCenter,center,this.inputLimit);}catch{return super.move(center,at);}for(const p of points)if(!super.move(p,at))return false;this.inputCenter=points.at(-1)!;return true;}
}
export interface RingworldEditing {readonly navigation:'rotate'|'pan';readonly scope:OpenCylinderScope;readonly view:OpenCylinderView;readonly controls:CylinderControls}
export function defaultRingworldEditing(world:Ringworld):RingworldEditing{const max=openCylinderBrushRadiusLimit(world.terrain)*(1-1e-9);return{navigation:'rotate',scope:'exterior',view:initialOpenCylinderView('exterior'),controls:{...defaultCylinderControls(world.configuration.outerRadiusMeters),radius:String(Math.min(world.configuration.outerRadiusMeters*.03,max*.75))}};}
export function validateRingworldEditing(world:Ringworld,input:RingworldEditing):RingworldEditing{
 if(!input||!['rotate','pan'].includes(input.navigation)||!['interior','exterior'].includes(input.scope)||input.view?.scope!==input.scope||input.view.interior!==(input.scope==='interior')||input.view.interiorView!=='edit'||input.view.eyeMeters!==undefined)throw RangeError('Unsupported Ringworld editing selection or inspection configuration.');
 if(!Array.isArray(input.view.target)||input.view.target.length!==3||input.view.target.some(v=>!Number.isFinite(v)||Math.abs(v)>16)||Math.abs(input.view.phase)>Math.PI||Object.values(input.view.pan).some(v=>!Number.isFinite(v)||Math.abs(v)>16))throw RangeError('Ringworld camera is outside supported bounds.');
 cylinderFrameLayout({radiusMeters:world.configuration.outerRadiusMeters,lengthMeters:world.configuration.widthMeters},input.view,{width:100,height:100});
 const controls=input.controls,max=openCylinderBrushRadiusLimit(world.terrain)*(1-1e-9),min=Math.min(max*.001,world.configuration.outerRadiusMeters*1e-7);
 if(!controls||!['navigate','raise','lower','smooth','flatten'].includes(controls.tool)||Object.values(controls).some(v=>typeof v!=='string')||!(['raise','smooth','flatten']as const).every(tool=>physicalBrushFromControls({...controls,tool},min,max)))throw RangeError('Invalid Ringworld brush configuration.');
 const v=input.view;return{navigation:input.navigation,scope:input.scope,controls:structuredClone(controls),view:structuredClone({mode:v.mode,frame:v.frame,zoom:v.zoom,target:v.target,pan:v.pan,phase:v.phase,scope:v.scope,interior:v.interior,interiorView:v.interiorView})};
}
export class RingworldDocument{
 captureEditing=()=>{};readonly world:Ringworld;readonly session:RingworldSession;editing:RingworldEditing;error='';changed=()=>{};private savedEditing:string;private switching=false;private hostLocked=false;
 constructor(world:Ringworld,name:string,saved=false,editing=defaultRingworldEditing(world)){this.world=world;this.editing=validateRingworldEditing(world,editing);this.savedEditing=JSON.stringify(this.editing);this.session=new RingworldSession(world,name,saved);}
 get selectedSurface(){return this.editing.scope;}get name(){return this.session.name;}set name(v:string){this.session.name=v;}get hasSaved(){return this.session.hasSaved;}get modified(){return this.session.modified||JSON.stringify(this.editing)!==this.savedEditing;}get painting(){return this.session.painting;}get processing(){return this.session.processing||this.switching;}get locked(){return this.hostLocked||this.switching;}set locked(v:boolean){this.hostLocked=v;this.session.locked=this.locked;}
 get canUndo(){return this.session.history.canUndo;}get canRedo(){return this.session.history.canRedo;}
 markSaved(name:string){this.session.markSaved(name);this.savedEditing=JSON.stringify(this.editing);this.changed();}
 async drainForSave(yieldWork?:()=>Promise<void>){await this.session.drainForSave(yieldWork);this.captureEditing();}
 async select(scope:OpenCylinderScope){if(this.locked||scope===this.selectedSurface)return;this.switching=true;this.session.locked=true;this.changed();try{await this.session.drainForSave();this.editing={...this.editing,scope,view:initialOpenCylinderView(scope,this.editing.view.mode)};}finally{this.switching=false;this.session.locked=this.locked;this.changed();}}
 dispose(){this.session.dispose();this.changed=()=>{};}
}
export async function prepareRingworldDocument(world:Ringworld,name:string,saved=false,work:PersistenceWork={},editing?:RingworldEditing){const started=performance.now(),editor=new RingworldDocument(world,name,saved,editing),steps=editor.session.cache.prepare();try{let done=false;while(!done){const at=performance.now();do{done=!!steps.next().done;}while(!done&&performance.now()-at<5);await workStep(work,'Preparing Ringworld display',done?1:0);}return{editor,preparationMs:performance.now()-started};}catch(e){steps.return(undefined);editor.dispose();throw e;}}
