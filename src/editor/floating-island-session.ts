import type {PhysicalPieceTerrain as FloatingIslandTerrain} from '../terrain/physical-piece.ts';
import {beginFloatingIslandStroke} from '../terrain/floating-island-brush.ts';
import {PolyhedronDisplayCache} from '../rendering/polyhedron-field.ts';
import {floatingIslandIndexVisible} from '../rendering/floating-island-view.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {ConnectedPreviewSession} from './connected-preview-session.ts';
import {floatingIslandStencil,floatingIslandWorkerFactory,beginWorkerFloatingIslandStroke} from './floating-island-work.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';
export class FloatingIslandSession extends ConnectedPreviewSession<FloatingIslandTerrain,CylinderView>{
 declare readonly cache:PolyhedronDisplayCache<FloatingIslandTerrain>;
 constructor(terrain:FloatingIslandTerrain,name:string,saved=false){super(terrain,name,saved,true,{createCache:t=>new PolyhedronDisplayCache(t),begin:beginFloatingIslandStroke,strokeOptions:view=>({view,rollingWork:true}),prepareStencil:floatingIslandStencil,visibility:(t,v)=>(_center,indices)=>{for(const index of indices)if(!floatingIslandIndexVisible(t,v,index))throw RangeError('Hidden floating-island material cannot be painted.');},workers:{factory:floatingIslandWorkerFactory,begin:beginWorkerFloatingIslandStroke,preparedPatch:connectedPreparedPatch,startPreview:(worker,{terrain,task,revision,values,center,settings,view,measure})=>worker.postMessage({type:'start',task,metadata:terrain.metadata,revision,values,center,settings,options:{view},preview:view,measure},[values.buffer])}});this.message=saved?'Island reopened. Continue sculpting the same geography.':'New floating island. Save explicitly through Atlas.';}
}
export async function prepareFloatingIslandSession(terrain:FloatingIslandTerrain,name:string,saved=false,work:PersistenceWork={}){const started=performance.now(),editor=new FloatingIslandSession(terrain,name,saved),steps=editor.cache.prepare();try{let done=false;while(!done){const at=performance.now();do{done=!!steps.next().done;}while(!done&&performance.now()-at<5);await workStep(work,'Preparing floating-island display',done?1:0);}return{terrain,editor,preparationMs:performance.now()-started};}catch(e){steps.return(undefined);editor.dispose();throw e;}}
