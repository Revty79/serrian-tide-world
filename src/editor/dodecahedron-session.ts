import type {DodecahedronTerrain} from '../terrain/dodecahedron.ts';
import {beginDodecahedronStroke} from '../terrain/dodecahedron-brush.ts';
import {PolyhedronDisplayCache} from '../rendering/polyhedron-field.ts';
import {dodecahedronIndexVisible} from '../rendering/dodecahedron-view.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {ConnectedPreviewSession} from './connected-preview-session.ts';
import {dodecahedronStencil,dodecahedronWorkerFactory,beginWorkerDodecahedronStroke} from './dodecahedron-work.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';
export class DodecahedronSession extends ConnectedPreviewSession<DodecahedronTerrain,CylinderView>{
 declare readonly cache:PolyhedronDisplayCache<DodecahedronTerrain>;
 constructor(terrain:DodecahedronTerrain,name:string,saved=false){super(terrain,name,saved,true,{createCache:t=>new PolyhedronDisplayCache(t),begin:beginDodecahedronStroke,strokeOptions:view=>({view,rollingWork:true}),prepareStencil:dodecahedronStencil,visibility:(t,v)=>(_center,indices)=>{for(const index of indices)if(!dodecahedronIndexVisible(t,v,index))throw RangeError('Hidden dodecahedron material cannot be painted.');},workers:{factory:dodecahedronWorkerFactory,begin:beginWorkerDodecahedronStroke,preparedPatch:connectedPreparedPatch,startPreview:(worker,{terrain,task,revision,values,center,settings,view,measure})=>worker.postMessage({type:'start',task,metadata:terrain.metadata,revision,values,center,settings,options:{view},preview:view,measure},[values.buffer])}});this.message=saved?'Dodecahedron reopened. Continue sculpting the same geography.':'Blank dodecahedron ocean. Save explicitly through Atlas.';}
}
export async function prepareDodecahedronSession(terrain:DodecahedronTerrain,name:string,saved=false,work:PersistenceWork={}){const started=performance.now(),editor=new DodecahedronSession(terrain,name,saved),steps=editor.cache.prepare();try{let done=false;while(!done){const at=performance.now();do{done=!!steps.next().done;}while(!done&&performance.now()-at<5);await workStep(work,'Preparing dodecahedron display',done?1:0);}return{terrain,editor,preparationMs:performance.now()-started};}catch(e){steps.return(undefined);editor.dispose();throw e;}}
