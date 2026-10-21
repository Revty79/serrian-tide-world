import test from 'node:test';
import assert from 'node:assert/strict';
import {createHollowCubeWorld} from '../terrain/hollow-cube.ts';
import {tunnelAt,branchFrom,editPassageNode,nodeWallCoordinates} from '../editor/hollow-excavation-authoring.ts';
import {validateHollowCubePassage} from './hollow-cube-passages.ts';
import {hollowExcavation,traceHollowExcavation,hollowFreeVolume,rayCapsuleInterval,type ExcavationPrimitive} from './hollow-cube-csg.ts';
import {prepareHollowCubeDocument} from '../editor/hollow-cube-document.ts';
import {encodeHollowCube,decodeHollowCube} from '../persistence/hollow-cube-format.ts';
const config={provider:'physical-hollow-cube' as const,version:1 as const,worldId:'csg',outerSideLengthMeters:1000000,innerSideLengthMeters:800000,surfaces:{exterior:{surfaceId:'out',terrainId:'ot'},interior:{surfaceId:'in',terrainId:'it'}}};
test('H4 genuine difference: open portal ray crosses shell into cavity, rock walls and branches have actual volume',()=>{
 const world=createHollowCubeWorld(config),p=tunnelAt(world,{...world.surfaces.exterior.geometry.identity,patchId:'pz',u:0,v:0},8000);validateHollowCubePassage(world,p);
 const model=hollowExcavation(world,[p]),unexcavated=hollowExcavation(world,[]),before=traceHollowExcavation(unexcavated,[0,0,4],[0,0,-1])!,after=traceHollowExcavation(model,[0,0,4],[0,0,-1])!;
 assert.equal(before.kind,'exterior');assert.equal(before.point[2],1);assert.equal(after.kind,'interior');assert.ok(Math.abs(after.point[2]+.8)<1e-10);
 const wall=traceHollowExcavation(model,[0,0,.9],[1,0,0])!;assert.equal(wall.kind,'rock');assert.ok(Math.abs(wall.point[0]-.016)<1e-10);
 const branch=branchFrom(world,p,p.nodes[2]!.id,'right',35000,8000);validateHollowCubePassage(world,branch);assert(hollowFreeVolume(hollowExcavation(world,[branch]),[25000,0,450000],100));
 for(let z=380000;z<=520000;z+=500)assert(hollowFreeVolume(model,[0,0,z],100));assert.equal(hollowFreeVolume(model,[20000,0,450000]),false);
});
test('H4 exact capsule intervals: axial, perpendicular, tangent and no-hit',()=>{const p:ExcavationPrimitive={a:[0,0,0],b:[0,0,2],radius:1};assert.deepEqual(rayCapsuleInterval([0,0,-3],[0,0,1],p),[2,6]);assert.deepEqual(rayCapsuleInterval([-3,0,1],[1,0,0],p),[2,4]);assert.equal(rayCapsuleInterval([-3,2,1],[1,0,0],p),undefined);assert.deepEqual(rayCapsuleInterval([-3,1,1],[1,0,0],p),[3,3]);});
test('H4/H5 protected ground, safe chamber changes, exact metadata replay and restored physical holes',async()=>{
 const world=createHollowCubeWorld(config),prepared=await prepareHollowCubeDocument(world,'Physical'),doc=prepared.editor,p=tunnelAt(world,{...world.surfaces.exterior.geometry.identity,patchId:'pz',u:0,v:0},8000);await doc.changeConnections({links:[],passages:[p]});assert(doc.canUndo);
 const session=doc.sessions.exterior;session.begin({...world.surfaces.exterior.geometry.identity,patchId:'pz',u:0,v:0},{version:1,tool:'raise',radiusMeters:15000,strengthMeters:200});session.release();await assert.rejects(session.drainForSave(),/Resolve/);assert.equal(session.terrain.revision,0);session.keepPartial();
 doc.historyScope='connections';await doc.replay();assert.equal(doc.connections.passages.length,0);await doc.replay(true);assert.deepEqual(doc.connections.passages,[p]);
 const middle=p.nodes[2]!,coord=nodeWallCoordinates(world,p,middle.id),grown=editPassageNode(world,p,middle.id,{...coord,radius:12000});await doc.changeConnections({links:[],passages:[grown]});const saved=await encodeHollowCube(doc,undefined,{yield:async()=>{}}),restored=await decodeHollowCube(saved,{yield:async()=>{}});assert.deepEqual(restored.editor.connections.passages,[grown]);assert.equal(traceHollowExcavation(hollowExcavation(restored.world,restored.editor.connections.passages),[0,0,4],[0,0,-1])!.kind,'interior');doc.dispose();restored.editor.dispose();
});
