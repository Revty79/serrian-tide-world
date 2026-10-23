import type {IcosahedronTerrain} from '../terrain/icosahedron.ts';
import {beginIcosahedronStroke} from '../terrain/icosahedron-brush.ts';
import {PolyhedronDisplayCache} from '../rendering/polyhedron-field.ts';
import {icosahedronIndexVisible} from '../rendering/icosahedron-view.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {ConnectedPreviewSession} from './connected-preview-session.ts';
import {icosahedronStencil,icosahedronWorkerFactory,beginWorkerIcosahedronStroke} from './icosahedron-work.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';
export class IcosahedronSession extends ConnectedPreviewSession<IcosahedronTerrain,CylinderView>{
 declare readonly cache:PolyhedronDisplayCache<IcosahedronTerrain>;
 constructor(terrain:IcosahedronTerrain,name:string,saved=false){super(terrain,name,saved,true,{createCache:t=>new PolyhedronDisplayCache(t),begin:beginIcosahedronStroke,strokeOptions:view=>({view,rollingWork:true}),prepareStencil:icosahedronStencil,visibility:(t,v)=>(_center,indices)=>{for(const index of indices)if(!icosahedronIndexVisible(t,v,index))throw RangeError('Hidden icosahedron material cannot be painted.');},workers:{factory:icosahedronWorkerFactory,begin:beginWorkerIcosahedronStroke,preparedPatch:connectedPreparedPatch,startPreview:(worker,{terrain,task,revision,values,center,settings,view,measure})=>worker.postMessage({type:'start',task,metadata:terrain.metadata,revision,values,center,settings,options:{view},preview:view,measure},[values.buffer])}});this.message=saved?'Icosahedron reopened. Continue sculpting the same geography.':'Blank icosahedron ocean. Save explicitly through Atlas.';}
}
export async function prepareIcosahedronSession(terrain:IcosahedronTerrain,name:string,saved=false,work:PersistenceWork={}){const started=performance.now(),editor=new IcosahedronSession(terrain,name,saved),steps=editor.cache.prepare();try{let done=false;while(!done){const at=performance.now();do{done=!!steps.next().done;}while(!done&&performance.now()-at<5);await workStep(work,'Preparing icosahedron display',done?1:0);}return{terrain,editor,preparationMs:performance.now()-started};}catch(e){steps.return(undefined);editor.dispose();throw e;}}
