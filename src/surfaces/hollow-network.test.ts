import test from 'node:test';
import assert from 'node:assert/strict';
import {createHollowCubeWorld} from '../terrain/hollow-cube.ts';
import {tunnelAt,branchFrom,addPassageOpening,editPassageNode,nodeWallCoordinates} from '../editor/hollow-excavation-authoring.ts';
import {validateHollowCubePassage} from './hollow-cube-passages.ts';
import {hollowExcavation,hollowFreeVolume,traceHollowExcavation} from './hollow-cube-csg.ts';
import {SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,type CubeVector} from './solid-cube.ts';
import {prepareHollowCubeDocument} from '../editor/hollow-cube-document.ts';
import {encodeHollowCube,decodeHollowCube} from '../persistence/hollow-cube-format.ts';
const config={provider:'physical-hollow-cube' as const,version:1 as const,worldId:'network-audit',outerSideLengthMeters:1000000,innerSideLengthMeters:800000,surfaces:{exterior:{surfaceId:'out',terrainId:'ot'},interior:{surfaceId:'in',terrainId:'it'}}};
for(const role of ['exterior','interior'] as const)for(const face of SOLID_CUBE_FACES)test(`I4 ${role} ${face}: physical aperture agrees with free volume and moved/resized portal`,()=>{
 const w=createHollowCubeWorld(config),g=w.surfaces[role].geometry,p=tunnelAt(w,{...g.identity,patchId:face,u:20000,v:-15000},8000);validateHollowCubePassage(w,p);
 const portal=p.portals.find(a=>a.position.surfaceId===g.identity.surfaceId)!,coords=nodeWallCoordinates(w,p,portal.nodeId),moved=editPassageNode(w,p,portal.nodeId,{...coords,u:coords.u+5000,v:coords.v+3000,radius:6000});validateHollowCubePassage(w,moved);
 const model=hollowExcavation(w,[moved]),f=SOLID_CUBE_FRAMES[face],node=moved.nodes.find(n=>n.id===portal.nodeId)!,normal=g.normal(portal.position);
 // Approach the actual moved opening from the selected side, independently
 // checking passability along its perpendicular neck in physical meters.
 for(let offset=-4000;offset<=4000;offset+=500){const q=node.position.map((v,i)=>v+normal[i]!*offset) as unknown as CubeVector;assert(hollowFreeVolume(model,q,100));}
 const origin=node.position.map((v,i)=>(v+normal[i]!*12000)/model.halfSideMeters) as unknown as CubeVector,direction=normal.map(v=>-v) as unknown as CubeVector,hit=traceHollowExcavation(model,origin,direction)!;assert(!hit||hit.kind!=='rock');
 const wall=node.position.map((v,i)=>v+f.u[i]!*12000-normal[i]!*12000) as unknown as CubeVector;assert.equal(hollowFreeVolume(model,wall),false);
});
test('I4/I6 bent looping network, vertical shaft, chamber and third opening survive exact replay and v6',async()=>{
 const w=createHollowCubeWorld(config),g=w.surfaces.exterior.geometry;let p=tunnelAt(w,{...g.identity,patchId:'pz',u:0,v:0},8000),junction=p.nodes[2]!.id;
 for(const direction of ['right','up','left'] as const)p=branchFrom(w,p,p.nodes.at(-1)===p.nodes[4]?junction:p.nodes.at(-1)!.id,direction,35000,8000);
 p={...p,segments:[...p.segments,{id:'loop-close',from:p.nodes.at(-1)!.id,to:junction,radiusMeters:8000}]};
 p=branchFrom(w,p,p.nodes[6]!.id,'deeper',12000,8000);const shaft=p.nodes.at(-1)!;p=editPassageNode(w,p,shaft.id,{...nodeWallCoordinates(w,p,shaft.id),radius:12000});
 p=addPassageOpening(w,p,p.nodes[6]!.id,{...g.identity,patchId:'pz',u:35000,v:35000},8000);validateHollowCubePassage(w,p);
 const model=hollowExcavation(w,[p]);for(const segment of p.segments){const a=p.nodes.find(n=>n.id===segment.from)!,b=p.nodes.find(n=>n.id===segment.to)!;for(let i=0;i<=20;i++){const q=a.position.map((v,k)=>v+(b.position[k]!-v)*i/20) as unknown as CubeVector;assert(hollowFreeVolume(model,q,100));}}
 const {editor}=await prepareHollowCubeDocument(w,'Looping mine');await editor.changeConnections({links:[],passages:[p]});await editor.replay();assert.equal(editor.connections.passages.length,0);await editor.replay(true);assert.deepEqual(editor.connections.passages,[p]);
 const record=await encodeHollowCube(editor,undefined,{yield:async()=>{}}),loaded=await decodeHollowCube(record,{yield:async()=>{}});assert.deepEqual(loaded.editor.connections.passages,[p]);assert.deepEqual(hollowExcavation(loaded.world,loaded.editor.connections.passages),model);editor.dispose();loaded.editor.dispose();
});
