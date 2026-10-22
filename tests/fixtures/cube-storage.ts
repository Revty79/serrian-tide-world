import {LocalMapStore} from '../../src/persistence/local-map-store.ts';
import {encodeSolidCubeHeightmap} from '../../src/persistence/solid-cube-format.ts';
import {createSolidCubeTerrain} from '../../src/terrain/solid-cube.ts';
import {encodeCylindricalHeightmap} from '../../src/persistence/cylindrical-format.ts';
import {createCylinderPreviewTerrain} from '../../src/editor/cylinder-preview-session.ts';
import {encodeMap} from '../../src/persistence/map-format.ts';
import {createBlankTerrain} from '../../src/terrain/model.ts';
import {seed as seedPlanarSphere} from './sphere-storage.ts';
const store=new LocalMapStore();
async function database(){return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('serrian-tide-atlas',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function raw(id:string):Promise<any>{const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('heightmaps','readonly'),r=tx.objectStore('heightmaps').get(id);tx.oncomplete=()=>resolve(r.result);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
const hash=async(b:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),n=>n.toString(16).padStart(2,'0')).join('');
export async function summary(id?:string){const catalog=await store.list(),r=await raw(id??catalog.find(m=>m.kind==='cube')!.id);return{id:r.id,name:r.name,formatVersion:r.formatVersion,metadata:r.metadata,checksum:r.checksum,payloadSha256:await hash(r.elevations),bytes:r.elevations.byteLength,catalog};}
export async function seedLegacy(){await seedPlanarSphere();const terrain=createCylinderPreviewTerrain(64);terrain.write(terrain.keyAt(0),-0);await store.save(await encodeCylindricalHeightmap(terrain,'Legacy v4 cylinder'));return await store.list();}
export async function corrupt(id:string){const r=await raw((await store.list()).find(m=>m.kind==='cube')!.id);r.id=id;r.metadata.terrainId=id;r.name='Corrupt cube';new DataView(r.elevations).setFloat32(0,123,true);const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction(['heightmaps','catalog'],'readwrite');tx.objectStore('heightmaps').put(r);tx.objectStore('catalog').put({id,name:r.name,savedAt:r.savedAt,kind:'cube'});tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
const put=IDBObjectStore.prototype.put;
export function fault(mode:'none'|'quota'|'abort'){
 IDBObjectStore.prototype.put=put;if(mode==='none')return;
 IDBObjectStore.prototype.put=function(value,key?){if(this.name==='heightmaps'&&value.formatVersion===5){if(mode==='quota')throw new DOMException('Cube storage quota exhausted for test','QuotaExceededError');const request=key===undefined?put.call(this,value):put.call(this,value,key);queueMicrotask(()=>this.transaction.abort());return request;}return key===undefined?put.call(this,value):put.call(this,value,key);};
}
export async function overwriteProof(id:string){
 const before=await summary(id),r=await raw(id),meta=r.metadata,failures:string[]=[];
 const geometry={...meta.geometry,sideLengthMeters:meta.geometry.sideLengthMeters+1};const changed=createSolidCubeTerrain({terrainId:id,geometry,cellsPerEdge:meta.representation.cellsPerEdge});
 const identity=createSolidCubeTerrain({terrainId:id,geometry:{...meta.geometry,identity:{...meta.identity,worldId:'foreign'}},cellsPerEdge:meta.representation.cellsPerEdge});
 for(const candidate of[await encodeSolidCubeHeightmap(changed,'Wrong cube geometry'),await encodeSolidCubeHeightmap(identity,'Wrong cube identity'),await encodeMap(createBlankTerrain({id}),'Wrong existing format')])try{await store.save(candidate);}catch(error){failures.push(String(error));}
 return{failures,unchanged:(await summary(id)).payloadSha256===before.payloadSha256};
}
export async function seedUnrenderable(){
 const terrain=createSolidCubeTerrain({terrainId:'finite-extreme-cube',cellsPerEdge:128,geometry:{identity:{worldId:'finite-extreme',surfaceId:'exterior'},provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters:1}});
 terrain.write(terrain.keyAt(0),3.4028234663852886e38);await store.save(await encodeSolidCubeHeightmap(terrain,'Extreme finite cube'));return await summary('finite-extreme-cube');
}

// A real old-format header verifies that Open does not rewrite v6 data.
export async function seedHollowV6(){
 const {createHollowCubeWorld}=await import('../../src/terrain/hollow-cube.ts'),{HollowCubeDocument}=await import('../../src/editor/hollow-cube-document.ts'),{encodeHollowCube}=await import('../../src/persistence/hollow-cube-format.ts'),{payloadChecksum}=await import('../../src/persistence/heightmap-payload.ts');
 const world=createHollowCubeWorld({provider:'physical-hollow-cube',version:1,worldId:'legacy-v6-hollow',outerSideLengthMeters:1000000,innerSideLengthMeters:800000,surfaces:{exterior:{surfaceId:'legacy-out',terrainId:'legacy-ot'},interior:{surfaceId:'legacy-in',terrainId:'legacy-it'}}},128),editor=new HollowCubeDocument(world,'Legacy v6 hollow');
 try{const current=await encodeHollowCube(editor),old={...((({connectionHistory,...rest})=>rest)(current)),formatVersion:6 as const,connections:{links:current.connections.links,passages:current.connections.passages}}, {elevations,checksum,...header}=old;old.checksum=await payloadChecksum(header,elevations);await store.save(old);return old.id;}finally{editor.dispose();}
}
