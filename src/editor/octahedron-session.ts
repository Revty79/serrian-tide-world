import type {OctahedronTerrain} from '../terrain/octahedron.ts';
import {beginOctahedronStroke} from '../terrain/octahedron-brush.ts';
import {PolyhedronDisplayCache} from '../rendering/polyhedron-field.ts';
import {octahedronIndexVisible} from '../rendering/octahedron-view.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {ConnectedPreviewSession} from './connected-preview-session.ts';
import {octahedronStencil,octahedronWorkerFactory,beginWorkerOctahedronStroke} from './octahedron-work.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';
export class OctahedronSession extends ConnectedPreviewSession<OctahedronTerrain,CylinderView>{
 declare readonly cache:PolyhedronDisplayCache<OctahedronTerrain>;
 constructor(terrain:OctahedronTerrain,name:string,saved=false){super(terrain,name,saved,true,{createCache:t=>new PolyhedronDisplayCache(t),begin:beginOctahedronStroke,strokeOptions:view=>({view,rollingWork:true}),prepareStencil:octahedronStencil,visibility:(t,v)=>(_center,indices)=>{for(const index of indices)if(!octahedronIndexVisible(t,v,index))throw RangeError('Hidden octahedron material cannot be painted.');},workers:{factory:octahedronWorkerFactory,begin:beginWorkerOctahedronStroke,preparedPatch:connectedPreparedPatch,startPreview:(worker,{terrain,task,revision,values,center,settings,view,measure})=>worker.postMessage({type:'start',task,metadata:terrain.metadata,revision,values,center,settings,options:{view},preview:view,measure},[values.buffer])}});this.message=saved?'Octahedron reopened. Continue sculpting the same geography.':'Blank octahedron ocean. Save explicitly through Atlas.';}
}
export async function prepareOctahedronSession(terrain:OctahedronTerrain,name:string,saved=false,work:PersistenceWork={}){const started=performance.now(),editor=new OctahedronSession(terrain,name,saved),steps=editor.cache.prepare();try{let done=false;while(!done){const at=performance.now();do{done=!!steps.next().done;}while(!done&&performance.now()-at<5);await workStep(work,'Preparing octahedron display',done?1:0);}return{terrain,editor,preparationMs:performance.now()-started};}catch(e){steps.return(undefined);editor.dispose();throw e;}}
