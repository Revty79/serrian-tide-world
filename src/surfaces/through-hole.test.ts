import test from 'node:test';
import assert from 'node:assert/strict';
import {createHollowCubeWorld} from '../terrain/hollow-cube.ts';
import {cutHoleAt,moveHole,resizeHole,validateHollowHole,holeCut} from './through-hole.ts';
import {SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,type CubeVector} from './solid-cube.ts';
import {hollowExcavation,hollowFreeVolume,traceHollowExcavation} from './hollow-cube-csg.ts';
import {HollowCubeDocument,validateHollowConnections} from '../editor/hollow-cube-document.ts';
import {tunnelBetween,tunnelAt} from '../editor/hollow-excavation-authoring.ts';
import {encodeHollowCube,decodeHollowCube,validateHollowCube} from '../persistence/hollow-cube-format.ts';
import {payloadChecksum} from '../persistence/heightmap-payload.ts';
const config={provider:'physical-hollow-cube' as const,version:1 as const,worldId:'holes',outerSideLengthMeters:1000000,innerSideLengthMeters:800000,surfaces:{exterior:{surfaceId:'out',terrainId:'ot'},interior:{surfaceId:'in',terrainId:'it'}}};
const fast={yield:async()=>{}};
for(const role of ['exterior','interior'] as const)for(const face of SOLID_CUBE_FACES)test(`hole ${role}/${face}: corresponding mouths, exact circular clearance and cutter`,()=>{
 const w=createHollowCubeWorld(config),g=w.surfaces[role].geometry,h=cutHoleAt(w,{...g.identity,patchId:face,u:15000,v:-27000},8000),cut=holeCut(w,h),model=hollowExcavation(w,[],[h]),f=SOLID_CUBE_FRAMES[face];
 assert.equal(h.kind,'through-hole');assert(!('nodes' in h));assert.equal(model.primitives.length,1);
 assert.deepEqual(w.surfaces.exterior.geometry.toReferenceChart(h.mouths[0]!.position).u,w.surfaces.interior.geometry.toReferenceChart(h.mouths[1]!.position).u);
 const at=(fraction:number,offset=0)=>cut.a.map((v,i)=>v+(cut.b[i]!-v)*fraction+f.u[i]!*offset) as unknown as CubeVector;
 for(let i=0;i<=20;i++)assert(hollowFreeVolume(model,at(i/20),100));
 assert(hollowFreeVolume(model,at(.5,7899),100));assert.equal(hollowFreeVolume(model,at(.5,7901),100),false);assert.equal(hollowFreeVolume(model,at(.5,8001)),false);
 const origin=cut.a.map((v,i)=>(v+f.normal[i]!*16000)/model.halfSideMeters) as unknown as CubeVector,ray=f.normal.map(v=>-v) as unknown as CubeVector,hit=traceHollowExcavation(model,origin,ray);
 assert(hit&&hit.kind==='interior'); // The first solid surface is the far cavity wall, not a cap over the mouth.
 const moved=moveHole(w,resizeHole(w,h,12000),{...g.identity,patchId:face,u:-10000,v:16000});assert.equal(moved.id,h.id);assert.deepEqual(moved.mouths.map(m=>m.id),h.mouths.map(m=>m.id));assert.equal(moved.radiusMeters,12000);
});
test('ship-sized hole is constrained by its two faces, not a universal size or wall-thickness radius cap',()=>{
 const w=createHollowCubeWorld(config),p={...w.surfaces.exterior.geometry.identity,patchId:'pz',u:0,v:0},h=cutHoleAt(w,p,250000);assert(h.radiusMeters>w.dimensions.nominalWallThicknessMeters);validateHollowHole(w,h);
 assert.throws(()=>resizeHole(w,h,400000),/edges/);assert.throws(()=>cutHoleAt(w,{...p,u:200000},250000),/edges/);
 assert.throws(()=>resizeHole(w,h,9),/precision/);assert.throws(()=>resizeHole(w,h,NaN),/precision/);
});
test('hole strict fields and opposite-side correspondence are enforced independently of tunnel graphs',()=>{
 const w=createHollowCubeWorld(config),h=cutHoleAt(w,{...w.surfaces.exterior.geometry.identity,patchId:'pz',u:0,v:0},8000);
 for(const bad of [{...h,nodes:[]},{...h,version:2},{...h,geometry:'sphere-capsule-union'},{...h,worldId:'other'},{...h,mouths:[h.mouths[0],h.mouths[0]]},{...h,mouths:[h.mouths[0],{...h.mouths[1],position:{...h.mouths[1]!.position,u:1}}]}])assert.throws(()=>validateHollowHole(w,bad as typeof h));
});
test('hole create, resize, move, delete and exact history are separate from network counts and v7 persistence',async()=>{
 const w=createHollowCubeWorld(config),doc=new HollowCubeDocument(w,'Hole history'),g=w.surfaces.exterior.geometry,h=cutHoleAt(w,{...g.identity,patchId:'pz',u:0,v:0},8000);
 await doc.changeConnections({...doc.connections,holes:[h]});assert.equal(doc.connections.passages.length,0);assert.equal(doc.connections.holes.length,1);assert.equal(doc.connectionHistory.length,1);
 const larger=resizeHole(w,h,12000);await doc.changeConnections({...doc.connections,holes:[larger]});await doc.replay();assert.deepEqual(doc.connections.holes,[h]);await doc.replay(true);assert.deepEqual(doc.connections.holes,[larger]);
 const moved=moveHole(w,larger,{...g.identity,patchId:'px',u:20000,v:40000});await doc.changeConnections({...doc.connections,holes:[moved]});
 const saved=await encodeHollowCube(doc,undefined,fast),opened=await decodeHollowCube(saved,fast);assert.equal(saved.formatVersion,7);assert.deepEqual(opened.editor.connections,doc.connections);assert.equal(opened.editor.canUndo,true);await opened.editor.replay();assert.deepEqual(opened.editor.connections.holes,[larger]);await opened.editor.replay(true);assert.deepEqual(opened.editor.connections.holes,[moved]);
 await doc.replay();const undoneSave=await encodeHollowCube(doc,undefined,fast),undoneOpen=await decodeHollowCube(undoneSave,fast);assert(undoneOpen.editor.canRedo);await undoneOpen.editor.replay(true);assert.deepEqual(undoneOpen.editor.connections.holes,[moved]);undoneOpen.editor.dispose();await doc.replay(true);
 await doc.changeConnections({...doc.connections,holes:[]});await doc.replay();assert.deepEqual(doc.connections.holes,[moved]);assert.equal(doc.connections.passages.length,0);
 const corrupt={...structuredClone(saved),connections:{...saved.connections,holes:saved.connections.holes!.map(h=>({...h,radiusMeters:-1}))}};const {elevations,checksum,...header}=corrupt;corrupt.checksum=await payloadChecksum(header,elevations);await assert.rejects(validateHollowCube(corrupt,fast),/precision/);
 doc.dispose();opened.editor.dispose();
});
test('proposal validation is read-only, failed hole resize is atomic, and terrain support remains guarded',async()=>{
 const w=createHollowCubeWorld(config),doc=new HollowCubeDocument(w,'Proposal'),g=w.surfaces.exterior.geometry,h=cutHoleAt(w,{...g.identity,patchId:'pz',u:0,v:0},8000),before=doc.connectionWords.slice();
 await doc.checkConnections({...doc.connections,holes:[h]});assert.deepEqual(doc.connectionWords,before);assert.equal(doc.revision,0);assert.equal(doc.connectionHistory.length,0);assert.equal(doc.modified,false);
 await doc.changeConnections({...doc.connections,holes:[h]});const state=doc.connections,words=doc.connectionWords.slice(),history=doc.connectionHistory.length;
 const t=w.surfaces.exterior.referenceTerrain;t.write(t.resolve({...t.metadata.identity,patchId:'pz',column:68,row:64}),200);
 await assert.rejects(doc.changeConnections({...doc.connections,holes:[resizeHole(w,h,40000)]}),/Terrain-aware/);assert.equal(doc.connections,state);assert.deepEqual(doc.connectionWords,words);assert.equal(doc.connectionHistory.length,history);assert.equal(doc.locked,false);
 doc.dispose();
});
test('v6 headers/checksums and legacy passage identities open unchanged; only explicit Save upgrades to v7',async()=>{
 const w=createHollowCubeWorld(config),doc=new HollowCubeDocument(w,'Legacy shaft'),p=tunnelAt(w,{...w.surfaces.exterior.geometry.identity,patchId:'pz',u:0,v:0},8000);await doc.changeConnections({links:[],passages:[p]});
 const current=await encodeHollowCube(doc,undefined,fast),legacy={...((({connectionHistory,...rest})=>rest)(current)),formatVersion:6 as const,connections:{links:current.connections.links,passages:current.connections.passages}};const {elevations,checksum,...header}=legacy;legacy.checksum=await payloadChecksum(header,elevations);
 const snapshot=structuredClone(legacy),validated=await validateHollowCube(legacy,fast),opened=await decodeHollowCube(legacy,fast);assert.deepEqual(legacy,snapshot);assert.deepEqual(validated,legacy);assert.deepEqual(opened.editor.connections.passages,[p]);assert.deepEqual(opened.editor.connections.holes,[]);
 const upgraded=await encodeHollowCube(opened.editor,undefined,fast);assert.equal(upgraded.formatVersion,7);assert.deepEqual(upgraded.connections.passages,[p]);assert.deepEqual(new Uint32Array(upgraded.elevations),new Uint32Array(legacy.elevations));
 const h=cutHoleAt(w,{...w.surfaces.exterior.geometry.identity,patchId:'nx',u:0,v:0},8000),network=tunnelBetween(w,{...w.surfaces.exterior.geometry.identity,patchId:'pz',u:0,v:0},{...w.surfaces.interior.geometry.identity,patchId:'px',u:0,v:0},8000),both=validateHollowConnections(w,{links:[],holes:[h],passages:[network]});assert.equal(both.passages.length,1);assert.equal(both.holes.length,1);
 doc.dispose();opened.editor.dispose();
});
