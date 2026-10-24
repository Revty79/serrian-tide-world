import type {TorusTerrain} from '../terrain/torus.ts';
import {beginTorusStroke} from '../terrain/torus-brush.ts';
import {TorusDisplayCache} from '../rendering/torus-field.ts';
import {torusVisible} from '../rendering/torus-view.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {ConnectedPreviewSession} from './connected-preview-session.ts';
import {torusStencil,torusWorkerFactory,beginWorkerTorusStroke} from './torus-work.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';
import {torusPointerInputs} from '../surfaces/torus-path.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
export class TorusSession extends ConnectedPreviewSession<TorusTerrain,CylinderView>{
 declare readonly cache:TorusDisplayCache;
 private inputCenter?:SurfacePosition;private inputLimit=0;
 override begin(center:SurfacePosition,settings:CylindricalBrushSettings,view:CylinderView,at=performance.now()){const accepted=super.begin(center,settings,view,at);if(accepted){this.inputCenter=this.terrain.geometry.normalize(center);this.inputLimit=Math.min(settings.radiusMeters*4,Math.PI*this.terrain.geometry.metadata.minorRadiusMeters/4);}return accepted;}
 override move(center:SurfacePosition,at=performance.now()){if(!this.inputCenter)return super.move(center,at);const points=torusPointerInputs(this.terrain.geometry,this.inputCenter,center,this.inputLimit);for(const point of points)if(!super.move(point,at))return false;this.inputCenter=points.at(-1)!;return true;}
 constructor(terrain:TorusTerrain,name:string,saved=false){super(terrain,name,saved,true,{createCache:t=>new TorusDisplayCache(t),begin:beginTorusStroke,strokeOptions:view=>({view,rollingWork:true}),prepareStencil:torusStencil,visibility:(t,v)=>(_center,indices)=>{for(const index of indices)if(!torusVisible(t.geometry,t.positionAt(t.owner(t.keyAt(index))),v))throw RangeError('Hidden torus material cannot be painted.');},workers:{factory:torusWorkerFactory,begin:beginWorkerTorusStroke,preparedPatch:connectedPreparedPatch,startPreview:(worker,{terrain,task,revision,values,center,settings,view,measure})=>worker.postMessage({type:'start',task,metadata:terrain.metadata,revision,values,center,settings,options:{view},preview:view,measure},[values.buffer])}});this.message=saved?'Torus reopened. Continue sculpting the same geography.':'Blank torus ocean. Save explicitly through Atlas.';}
}
export async function prepareTorusSession(terrain:TorusTerrain,name:string,saved=false,work:PersistenceWork={}){const started=performance.now(),editor=new TorusSession(terrain,name,saved),steps=editor.cache.prepare();try{let done=false;while(!done){const at=performance.now();do{done=!!steps.next().done;}while(!done&&performance.now()-at<5);await workStep(work,'Preparing torus display',done?1:0);}return{terrain,editor,preparationMs:performance.now()-started};}catch(e){steps.return(undefined);editor.dispose();throw e;}}
