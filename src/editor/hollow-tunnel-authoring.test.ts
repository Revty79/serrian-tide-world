import test from 'node:test';
import assert from 'node:assert/strict';
import {createHollowCubeWorld} from '../terrain/hollow-cube.ts';
import {tunnelBetween} from './hollow-excavation-authoring.ts';
import {validateHollowCubePassage} from '../surfaces/hollow-cube-passages.ts';
import {SOLID_CUBE_FACES} from '../surfaces/solid-cube.ts';
import {hollowExcavation,hollowFreeVolume} from '../surfaces/hollow-cube-csg.ts';
import {prepareHollowCubeDocument} from './hollow-cube-document.ts';
import {encodeHollowCube,decodeHollowCube} from '../persistence/hollow-cube-format.ts';
const config={provider:'physical-hollow-cube' as const,version:1 as const,worldId:'picked-tunnels',outerSideLengthMeters:1000000,innerSideLengthMeters:800000,surfaces:{exterior:{surfaceId:'out',terrainId:'ot'},interior:{surfaceId:'in',terrainId:'it'}}};
const world=createHollowCubeWorld(config);
for(const from of ['exterior','interior'] as const)for(const to of ['exterior','interior'] as const)for(const a of SOLID_CUBE_FACES)for(const b of SOLID_CUBE_FACES)test(`picked physical tunnel ${from}/${a} to ${to}/${b}`,()=>{
 const first={...world.surfaces[from].geometry.identity,patchId:a,u:12500,v:-17000},last={...world.surfaces[to].geometry.identity,patchId:b,u:-27000,v:19000},p=tunnelBetween(world,first,last,8000);validateHollowCubePassage(world,p);
 assert.equal(p.portals.length,2);assert.deepEqual(p.portals[0]!.position,first);assert.deepEqual(p.portals[1]!.position,last);assert(p.nodes.length+p.segments.length<=48);
 const model=hollowExcavation(world,[p]);for(const segment of p.segments){const x=p.nodes.find(n=>n.id===segment.from)!,y=p.nodes.find(n=>n.id===segment.to)!;for(let i=0;i<=10;i++)assert(hollowFreeVolume(model,x.position.map((v,k)=>v+(y.position[k]!-v)*i/10) as [number,number,number],100));}
});
test('picked long tunnel saves exact route/anchors, replays once and rejects invalid width or duplicate opening',async()=>{
 const first={...world.surfaces.exterior.geometry.identity,patchId:'pz',u:450000,v:10000},last={...world.surfaces.interior.geometry.identity,patchId:'nz',u:-20000,v:19000},p=tunnelBetween(world,first,last,8000);validateHollowCubePassage(world,p);
 assert.throws(()=>tunnelBetween(world,first,first,8000),/separate/);assert.throws(()=>tunnelBetween(world,first,last,25000),/quarter/);
 const {editor}=await prepareHollowCubeDocument(world,'Picked long tunnel');await editor.changeConnections({links:[],passages:[p]});await editor.replay();assert.equal(editor.connections.passages.length,0);await editor.replay(true);assert.deepEqual(editor.connections.passages,[p]);const saved=await encodeHollowCube(editor,undefined,{yield:async()=>{}}),loaded=await decodeHollowCube(saved,{yield:async()=>{}});assert.deepEqual(loaded.editor.connections.passages,[p]);editor.dispose();loaded.editor.dispose();
});
