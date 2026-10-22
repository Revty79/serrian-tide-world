import test from 'node:test';import assert from 'node:assert/strict';
import {createHollowSphereWorld} from '../terrain/hollow-sphere.ts';
import {spherePassageBetween,validateSpherePassage,branchSpherePassage,resizeSphereChamber,addSphereOpening,relocateSphereOpening,moveSphereJunction} from './hollow-sphere-passages.ts';
import {sphereExcavation,sphereFreeVolume,traceSphereExcavation} from './hollow-sphere-excavation.ts';
import {physicalPassageRoute} from './passages.ts';
import {sphereMapLink,relocateSphereLink,validateSphereLink} from './hollow-sphere-links.ts';
import {validateSphereConnections} from '../editor/hollow-sphere-connections.ts';
import type {Vec3} from './cube-sphere.ts';
const world=()=>createHollowSphereWorld({provider:'physical-hollow-sphere',version:1,worldId:'network',outerRadiusMeters:1000,innerRadiusMeters:700,surfaces:{exterior:{surfaceId:'out',terrainId:'a'},interior:{surfaceId:'in',terrainId:'b'}}},8);
const anchor=(w:ReturnType<typeof world>,d:Vec3,inside=false)=>w.surfaces[inside?'interior':'exterior'].geometry.positionsForDirection(d)[0]!;
test('spherical physical routes: same/opposite sides, seams, poles and antipodes have whole-volume certificates and continuous real clearance',()=>{
 const w=world();for(const a of[[1,0,0],[1,1,1],[0,0,1]]as Vec3[])for(const b of[[1,0,0],[0,1,0],[-1,0,0]]as Vec3[])for(const fromInside of[false,true])for(const inside of[false,true]){
  if(fromInside===inside&&Math.hypot(...a.map((v,i)=>v-b[i]!))===0)continue;
  const p=spherePassageBetween(w,anchor(w,a,fromInside),anchor(w,b,inside),10),model=sphereExcavation(w,[],[p]),route=physicalPassageRoute(p,p.portals[0]!.id,p.portals[1]!.id);
  assert.equal(validateSpherePassage(w,p).nodes.length,p.nodes.length);assert(p.nodes.length+p.segments.length<=48);
  for(let j=1;j<route.length;j++)for(let i=0;i<=30;i++){const point=route[j-1]!.map((v,k)=>v+(route[j]![k]!-v)*i/30)as unknown as Vec3;assert(sphereFreeVolume(model,point,1));}

 }
});
test('sphere graph edits preserve identity, connected branches, material chambers, independent openings and relocation',()=>{
 const w=world(),p=spherePassageBetween(w,anchor(w,[1,0,0]),anchor(w,[0,1,0],true),10),joint=p.nodes[1]!,branch=branchSpherePassage(w,p,joint.id,30,8,'tangent'),chamber=resizeSphereChamber(w,branch,joint.id,25),added=addSphereOpening(w,chamber,joint.id,anchor(w,[1,0,1]),8),portal=added.portals[0]!,moved=relocateSphereOpening(w,added,portal.id,anchor(w,[1,-.15,0]));
 assert.equal(moved.id,p.id);assert.equal(moved.portals.length,3);assert.equal(moved.portals.find(a=>a.id===portal.id)!.nodeId,portal.nodeId);assert(moved.segments.some(s=>s.id===p.segments[0]!.id));assert(moved.nodes.some(n=>n.id===branch.nodes.at(-1)!.id));assert.equal(moved.nodes.find(n=>n.id===joint.id)!.radiusMeters,25);
 const adjusted=moveSphereJunction(w,p,joint.id,anchor(w,[1,0,0]),160);assert.equal(adjusted.nodes.find(n=>n.id===joint.id)!.position[0],840);
 assert.throws(()=>moveSphereJunction(w,p,joint.id,anchor(w,[1,0,0]),1850),/between/);
 assert.throws(()=>resizeSphereChamber(w,p,joint.id,151),/strictly/);assert.throws(()=>branchSpherePassage(w,p,joint.id,300,10,'deeper'),/strictly|capsule/);
});
test('spherical tunnels reject cavity shortcuts, oblique stubs, extra fields, sparse graphs, overlapping mouths and unsupported precision',()=>{
 const w=world(),p=spherePassageBetween(w,anchor(w,[1,0,0]),anchor(w,[0,1,0],true),10);
 assert.throws(()=>spherePassageBetween(w,anchor(w,[1,0,0]),anchor(w,[1,.001,0]),10),/overlap/);
 assert.throws(()=>validateSpherePassage(w,{...p,segments:[...p.segments,{id:'shortcut',from:p.nodes[1]!.id,to:p.nodes.at(-2)!.id,radiusMeters:10}]}),/Duplicate|capsule/);
 const shifted=p.nodes.map((n,i)=>i===0?{...n,position:[n.position[0],1,n.position[2]]as Vec3}:n);assert.throws(()=>validateSpherePassage(w,{...p,nodes:shifted}),/anchor/);
 const oblique=p.nodes.map((n,i)=>i===1?{...n,position:[n.position[0],1,n.position[2]]as Vec3}:n);assert.throws(()=>validateSpherePassage(w,{...p,nodes:oblique}),/radial/);
 assert.throws(()=>validateSpherePassage(w,{...p,segments:p.segments.map((s,i)=>i===0?{...s,extra:1}:s)}),/fields/);
 const sparse=[...p.nodes];delete sparse[1];assert.throws(()=>validateSpherePassage(w,{...p,nodes:sparse}),/dense/);
 const thin=createHollowSphereWorld({...w.configuration,innerRadiusMeters:999.95},8);assert.throws(()=>spherePassageBetween(thin,anchor(thin,[1,0,0]),anchor(thin,[0,1,0]),.01));
 assert.throws(()=>sphereFreeVolume(sphereExcavation(w,[],[p]),[Infinity,0,0]));assert.throws(()=>sphereFreeVolume(sphereExcavation(w,[],[p]),[0,0,0],-1));
});
test('reciprocal spherical links preserve independent anchors and external destinations without cutting material',()=>{
 const w=world(),p=anchor(w,[1,0,0]),q=anchor(w,[0,0,1],true),link=sphereMapLink(w,p,{kind:'surface',position:q}),external=relocateSphereLink(w,link,link.anchors[1]!.id,{kind:'map-location',worldId:'elsewhere',mapId:'map',locationId:'gate'});
 assert.deepEqual(external.anchors.map(a=>[a.id,a.targetAnchorId]),link.anchors.map(a=>[a.id,a.targetAnchorId]));assert.equal(validateSphereLink(w,external).anchors[1]!.location.kind,'map-location');assert.equal(validateSphereConnections(w,{holes:[],links:[external],passages:[]}).links.length,1);assert.equal(sphereExcavation(w,[]).primitives.length,0);
 assert.throws(()=>sphereMapLink(w,p,{kind:'surface',position:p}),/different/);assert.throws(()=>validateSphereLink(w,{...link,anchors:link.anchors.map(a=>({...a,targetAnchorId:'not-reciprocal'}))}),/reciprocal/);
 assert.throws(()=>validateSphereConnections(w,{holes:[],links:[link],passages:[]},'holes'),/version 10/);
 assert.throws(()=>validateSphereConnections(w,{holes:[],links:[link,{...link,id:'second'}],passages:[]}),/Duplicate/);
});

test('a curved spherical network cuts actual rock at its bend rather than faking a straight view or teleport through the cavity',()=>{
 const w=world(),p=spherePassageBetween(w,anchor(w,[1,0,0]),anchor(w,[0,1,0],true),10),model=sphereExcavation(w,[],[p]),wall=traceSphereExcavation(model,[.85,0,0],[0,0,1])!,bend=traceSphereExcavation(model,[4,0,0],[-1,0,0])!;
 assert.equal(wall.kind,'rock');assert(Math.abs(wall.point[2]-.01)<1e-10);assert.equal(bend.kind,'rock');assert(bend.point[0]>.8&&bend.point[0]<.85);assert(!sphereFreeVolume(model,[750,0,0]));
 const groups={holes:[],links:[],passages:Array.from({length:3},()=>spherePassageBetween(w,anchor(w,[1,0,0]),anchor(w,[-1,0,0],true),10))};assert.throws(()=>validateSphereConnections(w,groups),/48/);
});


test('spherical graph clearance remains physical at small and planet-scale supported dimensions',()=>{
 for(const outer of[2,1e12]){const w=createHollowSphereWorld({...world().configuration,outerRadiusMeters:outer,innerRadiusMeters:outer*.7},8),p=spherePassageBetween(w,anchor(w,[0,0,1],true),anchor(w,[1,1,1],true),outer*.01),model=sphereExcavation(w,[],[p]);for(const n of p.nodes)assert(sphereFreeVolume(model,n.position,outer*.001));assert.equal(model.radiusMeters,outer);assert.equal(model.innerRatio,.7);}
});
