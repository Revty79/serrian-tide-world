import type {TrapezohedronTerrain} from '../terrain/trapezohedron.ts';
import {beginTrapezohedronStroke} from '../terrain/trapezohedron-brush.ts';
import {PolyhedronDisplayCache} from '../rendering/polyhedron-field.ts';
import {trapezohedronIndexVisible} from '../rendering/trapezohedron-view.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {ConnectedPreviewSession} from './connected-preview-session.ts';
import {trapezohedronStencil,trapezohedronWorkerFactory,beginWorkerTrapezohedronStroke} from './trapezohedron-work.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';
export class TrapezohedronSession extends ConnectedPreviewSession<TrapezohedronTerrain,CylinderView>{
 declare readonly cache:PolyhedronDisplayCache<TrapezohedronTerrain>;
 constructor(terrain:TrapezohedronTerrain,name:string,saved=false){super(terrain,name,saved,true,{createCache:t=>new PolyhedronDisplayCache(t),begin:beginTrapezohedronStroke,strokeOptions:view=>({view,rollingWork:true}),prepareStencil:trapezohedronStencil,visibility:(t,v)=>(_center,indices)=>{for(const index of indices)if(!trapezohedronIndexVisible(t,v,index))throw RangeError('Hidden trapezohedron material cannot be painted.');},workers:{factory:trapezohedronWorkerFactory,begin:beginWorkerTrapezohedronStroke,preparedPatch:connectedPreparedPatch,startPreview:(worker,{terrain,task,revision,values,center,settings,view,measure})=>worker.postMessage({type:'start',task,metadata:terrain.metadata,revision,values,center,settings,options:{view},preview:view,measure},[values.buffer])}});this.message=saved?'Decahedron reopened. Continue sculpting the same geography.':'Blank decahedron ocean. Save explicitly through Atlas.';}
}
export async function prepareTrapezohedronSession(terrain:TrapezohedronTerrain,name:string,saved=false,work:PersistenceWork={}){const started=performance.now(),editor=new TrapezohedronSession(terrain,name,saved),steps=editor.cache.prepare();try{let done=false;while(!done){const at=performance.now();do{done=!!steps.next().done;}while(!done&&performance.now()-at<5);await workStep(work,'Preparing trapezohedron display',done?1:0);}return{terrain,editor,preparationMs:performance.now()-started};}catch(e){steps.return(undefined);editor.dispose();throw e;}}
