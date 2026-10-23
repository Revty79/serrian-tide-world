import type {TetrahedronTerrain} from '../terrain/tetrahedron.ts';
import {beginTetrahedronStroke} from '../terrain/tetrahedron-brush.ts';
import {PolyhedronDisplayCache} from '../rendering/polyhedron-field.ts';
import {tetrahedronIndexVisible} from '../rendering/tetrahedron-view.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {ConnectedPreviewSession} from './connected-preview-session.ts';
import {tetrahedronStencil,tetrahedronWorkerFactory,beginWorkerTetrahedronStroke} from './tetrahedron-work.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';
export class TetrahedronSession extends ConnectedPreviewSession<TetrahedronTerrain,CylinderView>{
 declare readonly cache:PolyhedronDisplayCache<TetrahedronTerrain>;
 constructor(terrain:TetrahedronTerrain,name:string,saved=false){super(terrain,name,saved,true,{createCache:t=>new PolyhedronDisplayCache(t),begin:beginTetrahedronStroke,strokeOptions:view=>({view,rollingWork:true}),prepareStencil:tetrahedronStencil,visibility:(t,v)=>(_center,indices)=>{for(const index of indices)if(!tetrahedronIndexVisible(t,v,index))throw RangeError('Hidden tetrahedron material cannot be painted.');},workers:{factory:tetrahedronWorkerFactory,begin:beginWorkerTetrahedronStroke,preparedPatch:connectedPreparedPatch,startPreview:(worker,{terrain,task,revision,values,center,settings,view,measure})=>worker.postMessage({type:'start',task,metadata:terrain.metadata,revision,values,center,settings,options:{view},preview:view,measure},[values.buffer])}});this.message=saved?'Tetrahedron reopened. Continue sculpting the same geography.':'Blank tetrahedron ocean. Save explicitly through Atlas.';}
}
export async function prepareTetrahedronSession(terrain:TetrahedronTerrain,name:string,saved=false,work:PersistenceWork={}){const started=performance.now(),editor=new TetrahedronSession(terrain,name,saved),steps=editor.cache.prepare();try{let done=false;while(!done){const at=performance.now();do{done=!!steps.next().done;}while(!done&&performance.now()-at<5);await workStep(work,'Preparing tetrahedron display',done?1:0);}return{terrain,editor,preparationMs:performance.now()-started};}catch(e){steps.return(undefined);editor.dispose();throw e;}}
