import type {PyramidTerrain} from '../terrain/pyramid.ts';
import {beginPyramidStroke} from '../terrain/pyramid-brush.ts';
import {PyramidDisplayCache} from '../rendering/pyramid-field.ts';
import {pyramidIndexVisible} from '../rendering/pyramid-view.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {ConnectedPreviewSession} from './connected-preview-session.ts';
import {pyramidStencil,pyramidWorkerFactory,beginWorkerPyramidStroke} from './pyramid-work.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';
export class PyramidSession extends ConnectedPreviewSession<PyramidTerrain,CylinderView>{
 declare readonly cache:PyramidDisplayCache;
 constructor(terrain:PyramidTerrain,name:string,saved=false){super(terrain,name,saved,true,{createCache:t=>new PyramidDisplayCache(t),begin:beginPyramidStroke,strokeOptions:view=>({view,rollingWork:true}),prepareStencil:pyramidStencil,visibility:(t,v)=>(_center,indices)=>{for(const index of indices)if(!pyramidIndexVisible(t,v,index))throw RangeError('Hidden pyramid material cannot be painted.');},workers:{factory:pyramidWorkerFactory,begin:beginWorkerPyramidStroke,preparedPatch:connectedPreparedPatch,startPreview:(worker,{terrain,task,revision,values,center,settings,view,measure})=>worker.postMessage({type:'start',task,metadata:terrain.metadata,revision,values,center,settings,options:{view},preview:view,measure},[values.buffer])}});this.message=saved?'Pyramid reopened. Continue sculpting the same geography.':'Blank pyramid ocean. Save explicitly through Atlas.';}
}
export async function preparePyramidSession(terrain:PyramidTerrain,name:string,saved=false,work:PersistenceWork={}){const started=performance.now(),editor=new PyramidSession(terrain,name,saved),steps=editor.cache.prepare();try{let done=false;while(!done){const at=performance.now();do{done=!!steps.next().done;}while(!done&&performance.now()-at<5);await workStep(work,'Preparing pyramid display',done?1:0);}return{terrain,editor,preparationMs:performance.now()-started};}catch(e){steps.return(undefined);editor.dispose();throw e;}}
