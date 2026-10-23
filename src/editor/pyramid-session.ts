import type {PyramidTerrain} from '../terrain/pyramid.ts';
import {beginPyramidStroke} from '../terrain/pyramid-brush.ts';
import {PyramidDisplayCache} from '../rendering/pyramid-field.ts';
import {pyramidIndexVisible} from '../rendering/pyramid-view.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import {ConnectedPreviewSession} from './connected-preview-session.ts';
import {pyramidStencil,pyramidWorkerFactory,beginWorkerPyramidStroke} from './pyramid-work.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {workStep,type PersistenceWork} from '../persistence/cooperative-work.ts';
import {polyhedronMaterial} from '../surfaces/polyhedron-material.ts';
import {PolyhedronConnectionStore} from './polyhedron-connection-store.ts';
import type {PolyhedronConnections} from './polyhedron-connections.ts';
import type {WordHistoryJournal} from './terrain-history.ts';
export class PyramidSession extends ConnectedPreviewSession<PyramidTerrain,CylinderView>{
 declare readonly cache:PyramidDisplayCache;
 constructor(terrain:PyramidTerrain,name:string,saved=false){super(terrain,name,saved,true,{createCache:t=>new PyramidDisplayCache(t),begin:beginPyramidStroke,strokeOptions:view=>({view,rollingWork:true}),prepareStencil:pyramidStencil,visibility:(t,v)=>(_center,indices)=>{for(const index of indices)if(!pyramidIndexVisible(t,v,index))throw RangeError('Hidden pyramid material cannot be painted.');},workers:{factory:pyramidWorkerFactory,begin:beginWorkerPyramidStroke,preparedPatch:connectedPreparedPatch,startPreview:(worker,{terrain,task,revision,values,center,settings,view,measure})=>worker.postMessage({type:'start',task,metadata:terrain.metadata,revision,values,center,settings,options:{view},preview:view,measure},[values.buffer])}});this.message=saved?'Pyramid reopened. Continue sculpting the same geography.':'Blank pyramid ocean. Save explicitly through Atlas.';}
}
export class SolidPyramidSession extends PyramidSession{
 readonly connectionStore:PolyhedronConnectionStore;
 private connectionBusy=false;
 override get locked(){return super.locked||this.connectionBusy;}override set locked(value:boolean){super.locked=value;}
 constructor(terrain:PyramidTerrain,name:string,saved=false){super(terrain,name,saved);this.connectionStore=new PolyhedronConnectionStore(polyhedronMaterial(terrain.geometry),{exterior:terrain},{locked:()=>this.locked,setBusy:busy=>{this.connectionBusy=busy;},drain:()=>super.drainForSave(),changed:()=>this.changed()});this.beforeOperation=()=>{this.connectionStore.historyScope='terrain';this.changed();};}
 override get modified(){return super.modified||!!this.connectionStore?.modified;}override get processing(){return super.processing||!!this.connectionStore?.processing;}
 override markSaved(name:string){super.markSaved(name);this.connectionStore.markSaved();}
 override async drainForSave(yieldWork?:()=>Promise<void>){if(this.connectionStore?.processing)throw Error('Wait for the physical connection update.');await super.drainForSave(yieldWork);}
 override dispose(){this.connectionStore?.dispose();super.dispose();}
}
async function prepareSession<S extends PyramidSession>(editor:S,work:PersistenceWork){const started=performance.now(),steps=editor.cache.prepare();try{let done=false;while(!done){const at=performance.now();do{done=!!steps.next().done;}while(!done&&performance.now()-at<5);await workStep(work,'Preparing pyramid display',done?1:0);}return{terrain:editor.terrain,editor,preparationMs:performance.now()-started};}catch(e){steps.return(undefined);editor.dispose();throw e;}}
export async function preparePyramidSession(terrain:PyramidTerrain,name:string,saved=false,work:PersistenceWork={}){return prepareSession(new PyramidSession(terrain,name,saved),work);}
export async function prepareSolidPyramidSession(terrain:PyramidTerrain,name:string,saved=false,work:PersistenceWork={},connections?:PolyhedronConnections,journal?:WordHistoryJournal){const prepared=await prepareSession(new SolidPyramidSession(terrain,name,saved),work);try{if(connections)await prepared.editor.connectionStore.restoreConnections(connections,journal,work);return prepared;}catch(e){prepared.editor.dispose();throw e;}}
