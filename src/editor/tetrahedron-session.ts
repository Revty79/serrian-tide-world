import {polyhedronMaterial} from '../surfaces/polyhedron-material.ts';
import {PolyhedronConnectionStore} from './polyhedron-connection-store.ts';
import type {PolyhedronConnections} from './polyhedron-connections.ts';
import type {WordHistoryJournal} from './terrain-history.ts';
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
export class SolidTetrahedronSession extends TetrahedronSession{
 readonly connectionStore:PolyhedronConnectionStore;
 private connectionBusy=false;
 override get locked(){return super.locked||this.connectionBusy;}override set locked(value:boolean){super.locked=value;}
 constructor(terrain:TetrahedronTerrain,name:string,saved=false){super(terrain,name,saved);this.connectionStore=new PolyhedronConnectionStore(polyhedronMaterial(terrain.geometry),{exterior:terrain},{locked:()=>this.locked,setBusy:busy=>{this.connectionBusy=busy;},drain:()=>super.drainForSave(),changed:()=>this.changed()});this.beforeOperation=()=>{this.connectionStore.historyScope='terrain';this.changed();};}
 override get modified(){return super.modified||!!this.connectionStore?.modified;}override get processing(){return super.processing||!!this.connectionStore?.processing;}
 override markSaved(name:string){super.markSaved(name);this.connectionStore.markSaved();}
 override async drainForSave(yieldWork?:()=>Promise<void>){if(this.connectionStore?.processing)throw Error('Wait for the physical connection update.');await super.drainForSave(yieldWork);}
 override dispose(){this.connectionStore?.dispose();super.dispose();}
}
async function prepareSession<S extends TetrahedronSession>(editor:S,work:PersistenceWork){const started=performance.now(),steps=editor.cache.prepare();try{let done=false;while(!done){const at=performance.now();do{done=!!steps.next().done;}while(!done&&performance.now()-at<5);await workStep(work,'Preparing tetrahedron display',done?1:0);}return{terrain:editor.terrain,editor,preparationMs:performance.now()-started};}catch(e){steps.return(undefined);editor.dispose();throw e;}}
export async function prepareTetrahedronSession(terrain:TetrahedronTerrain,name:string,saved=false,work:PersistenceWork={}){return prepareSession(new TetrahedronSession(terrain,name,saved),work);}
export async function prepareSolidTetrahedronSession(terrain:TetrahedronTerrain,name:string,saved=false,work:PersistenceWork={},connections?:PolyhedronConnections,journal?:WordHistoryJournal){const prepared=await prepareSession(new SolidTetrahedronSession(terrain,name,saved),work);try{if(connections)await prepared.editor.connectionStore.restoreConnections(connections,journal,work);return prepared;}catch(e){prepared.editor.dispose();throw e;}}
