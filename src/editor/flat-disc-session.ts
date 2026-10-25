import type{FlatDisc}from'../terrain/flat-disc.ts';
import{flatDiscBrushPolicy}from'../terrain/flat-disc.ts';
import{CylinderPreviewSession}from'./cylinder-preview-session.ts';
import{defaultCylinderControls,physicalBrushFromControls,type CylinderControls}from'./cylinder-controls.ts';
import{initialCylinderView,cylinderFrameLayout,type CylinderView}from'../rendering/cylindrical-view.ts';
import{cross3,unitDirection}from'../surfaces/cube-sphere.ts';
import{workStep,type PersistenceWork}from'../persistence/cooperative-work.ts';

export interface FlatDiscEditing{readonly navigation:'rotate'|'pan';readonly view:CylinderView;readonly controls:CylinderControls}
export function initialFlatDiscView(mode:CylinderView['mode']='physical'):CylinderView{
 const forward=unitDirection([.75,-1,1.4]),right=unitDirection(cross3([0,0,1],forward));
 return{...initialCylinderView(mode),frame:{forward,right,up:unitDirection(cross3(forward,right))}};
}
export function defaultFlatDiscEditing(world:FlatDisc):FlatDiscEditing{return{navigation:'rotate',view:initialFlatDiscView(),controls:{...defaultCylinderControls(world.configuration.radiusMeters),radius:String(flatDiscBrushPolicy(world.configuration).defaultRadius)}};}
export function validateFlatDiscEditing(world:FlatDisc,input:FlatDiscEditing):FlatDiscEditing{
 if(!input||!['rotate','pan'].includes(input.navigation)||!input.view||input.view.interior||input.view.interiorView||input.view.eyeMeters!==undefined)throw RangeError('Invalid Flat Disc editing state.');
 const v=input.view;if(!Array.isArray(v.target)||v.target.length!==3||v.target.some(x=>!Number.isFinite(x)||Math.abs(x)>16)||!v.pan||![v.pan.x,v.pan.y].every(x=>Number.isFinite(x)&&Math.abs(x)<=16)||!Number.isFinite(v.phase)||Math.abs(v.phase)>Math.PI)throw RangeError('Invalid Flat Disc camera bounds.');
 cylinderFrameLayout(world.terrain.geometry.metadata,v,{width:100,height:100});const p=flatDiscBrushPolicy(world.configuration),c=input.controls;
 if(!c||!['navigate','raise','lower','smooth','flatten'].includes(c.tool)||Object.values(c).some(x=>typeof x!=='string')||!(['raise','smooth','flatten']as const).every(tool=>physicalBrushFromControls({...c,tool},p.minimum,p.maximum)))throw RangeError('Invalid Flat Disc brush controls.');
 return{navigation:input.navigation,controls:structuredClone(c),view:structuredClone({mode:v.mode,frame:v.frame,zoom:v.zoom,target:v.target,pan:v.pan,phase:v.phase})};
}
export class FlatDiscSession extends CylinderPreviewSession{
 readonly world:FlatDisc;editing:FlatDiscEditing;captureEditing=()=>{};private savedEditing:string;
 constructor(world:FlatDisc,name:string,saved=false,editing=defaultFlatDiscEditing(world)){
  super(world.terrain,name,saved,true,{rollingWork:true});this.world=world;this.editing=validateFlatDiscEditing(world,editing);this.savedEditing=JSON.stringify(this.editing);
  this.message=saved?'Flat Disc reopened. Continue sculpting its upper, lower and sidewall geography.':'Blank Flat Disc ocean. Upper, lower and sidewall geography share real connected rims.';
 }
 override get modified(){return super.modified||JSON.stringify(this.editing)!==this.savedEditing;}
 override markSaved(name:string){this.captureEditing();super.markSaved(name);this.savedEditing=JSON.stringify(this.editing);this.changed();}
 override async drainForSave(yieldWork?:()=>Promise<void>){await super.drainForSave(yieldWork);this.captureEditing();}
}
export async function prepareFlatDiscSession(world:FlatDisc,name:string,saved=false,work:PersistenceWork={},editing?:FlatDiscEditing){
 const started=performance.now(),editor=new FlatDiscSession(world,name,saved,editing),steps=editor.cache.prepare();try{let done=false;while(!done){const at=performance.now();do{done=!!steps.next().done;}while(!done&&performance.now()-at<5);await workStep(work,'Preparing Flat Disc terrain',done?1:0);}return{world,terrain:world.terrain,editor,preparationMs:performance.now()-started};}catch(error){steps.return(undefined);editor.dispose();throw error;}
}
