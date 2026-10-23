import {test} from 'node:test';import assert from 'node:assert/strict';
import {createPyramidGeometry} from './pyramid.ts';
import {polyhedronMaterial,polyhedronMaterialCapsuleFits} from './polyhedron-material.ts';
import {polyhedronPassageBetween,validatePolyhedronPassage,branchPolyhedronPassage,resizePolyhedronChamber,movePolyhedronJunction,addPolyhedronOpening,relocatePolyhedronOpening,polyhedronMapLink,relocatePolyhedronLink,validatePolyhedronLink} from './polyhedron-passages.ts';
import {physicalPassageRoute,physicalPassageContains} from './passages.ts';
const identity={worldId:'passage-pyramid',surfaceId:'outer'},outer=createPyramidGeometry({provider:'physical-square-pyramid',version:1,identity,role:'exterior',baseWidthMeters:2e6,heightMeters:1.6e6,baseZMeters:0}),inner=createPyramidGeometry({...outer.metadata,identity:{...identity,surfaceId:'inner'},role:'interior',baseWidthMeters:1.2e6,heightMeters:1e6,baseZMeters:1e5});
const anchor=(patchId:string,u=1/3,v=1/3,surfaceId='outer')=>({...identity,surfaceId,patchId,u,v});
test('solid and hollow physical pyramid networks connect all real faces without crossing the cavity',()=>{
 for(const hollow of[false,true]){const body=polyhedronMaterial(outer,hollow?inner:undefined),started=performance.now();let largest=0;
  for(let i=0;i<outer.faces.length;i++)for(let j=0;j<i;j++){
   const p=polyhedronPassageBetween(body,anchor(outer.faces[i]!),anchor(outer.faces[j]!,1/3,1/3,hollow?'inner':'outer'),5000);largest=Math.max(largest,p.nodes.length+p.segments.length);assert.equal(p.portals.length,2);assert.ok(p.nodes.length+p.segments.length<=48);assert.deepEqual(validatePolyhedronPassage(body,p),p);
   const route=physicalPassageRoute(p,p.portals[0]!.id,p.portals[1]!.id);assert.ok(route.length>=3);for(const q of route)assert.ok(physicalPassageContains(p,q));
   const portalIds=new Set(p.portals.map(a=>a.nodeId));for(const s of p.segments){if(portalIds.has(s.from)||portalIds.has(s.to))continue;assert.ok(polyhedronMaterialCapsuleFits(body,p.nodes.find(n=>n.id===s.from)!.position,p.nodes.find(n=>n.id===s.to)!.position,s.radiusMeters));}
  }
  console.log(JSON.stringify({family:'pyramid',hollow,facePairs:10,milliseconds:performance.now()-started,largestPrimitives:largest}));
 }
});
test('branches, chambers, multiple portals and stable opening edits reuse the actual graph',()=>{
 for(const hollow of[false,true]){const body=polyhedronMaterial(outer,hollow?inner:undefined),p=polyhedronPassageBetween(body,anchor('south'),anchor('north'),5000),junction=p.nodes.find(n=>!p.portals.some(a=>a.nodeId===n.id))!;
  const branched=branchPolyhedronPassage(body,p,junction.id,12000,2500,'tangent');assert.equal(branched.nodes.length,p.nodes.length+1);assert.equal(branched.portals.length,2);
  const chamber=resizePolyhedronChamber(body,branched,junction.id,6000);assert.equal(chamber.nodes.find(n=>n.id===junction.id)!.radiusMeters,6000);assert.throws(()=>resizePolyhedronChamber(body,p,junction.id,1e6));
  const moved=movePolyhedronJunction(body,chamber,branched.nodes.at(-1)!.id,branched.nodes.at(-1)!.position.map((x,i)=>x+(i===0?10:0)) as unknown as readonly[number,number,number]);assert.equal(moved.nodes.at(-1)!.id,branched.nodes.at(-1)!.id);
  const extra=addPolyhedronOpening(body,p,junction.id,anchor('east'),5000);assert.equal(extra.portals.length,3);assert.ok(extra.nodes.length+extra.segments.length<=48);
  const relocated=relocatePolyhedronOpening(body,p,p.portals[1]!.id,anchor('west'));assert.equal(relocated.portals.at(-1)!.id,p.portals[1]!.id);assert.equal(relocated.portals.at(-1)!.nodeId,p.portals[1]!.nodeId);assert.equal(relocated.id,p.id);
 }
});
test('real edge and vertex reference axes produce contained solid entries; malformed or foreign graphs reject',()=>{
 const body=polyhedronMaterial(outer);for(const start of[anchor('south',.5,0),anchor('south',0,1),anchor('base',0,0)])assert.ok(polyhedronPassageBetween(body,start,anchor('east'),5000).portals.length===2);
 const p=polyhedronPassageBetween(body,anchor('south'),anchor('north'),5000),node=p.nodes.find(n=>!p.portals.some(a=>a.nodeId===n.id))!;
 assert.throws(()=>validatePolyhedronPassage(body,{...p,worldId:'foreign'}));assert.throws(()=>movePolyhedronJunction(body,p,node.id,[0,0,-100]));assert.throws(()=>validatePolyhedronPassage(body,{...p,portals:p.portals.map((a,i)=>i?a:{...a,position:{...a.position,surfaceId:'inner'}})}));assert.throws(()=>validatePolyhedronPassage(body,{...p,nodes:p.nodes.map(n=>n.id===node.id?{...n,extra:true}:n)}));
 const shell=polyhedronMaterial(outer,inner),outerStart=anchor('base',.5,.5),base=polyhedronPassageBetween(shell,outerStart,anchor('south'),5000),first=base.nodes.find(n=>n.id===base.portals[0]!.nodeId)!,stub=base.segments.find(s=>s.from===first.id||s.to===first.id)!,endId=stub.from===first.id?stub.to:stub.from;
 assert.throws(()=>validatePolyhedronPassage(shell,{...base,nodes:base.nodes.map(n=>n.id===endId?{...n,position:[0,0,1.5e6] as const}:n)}));
});
test('acute real pyramid apices use actual contained entrance depth rather than an arbitrary fraction of global clearance',()=>{for(const hollow of[false,true]){const tall=createPyramidGeometry({...outer.metadata,heightMeters:16e6}),cavity=hollow?createPyramidGeometry({...inner.metadata,heightMeters:10e6,baseZMeters:1e6}):undefined,body=polyhedronMaterial(tall,cavity);assert.equal(polyhedronPassageBetween(body,anchor('south',0,1),anchor('base',.5,.5),hollow?30000:50000).portals.length,2);}});
test('map links keep independent reciprocal identity and actual bank validation separate from material routes',()=>{
 const body=polyhedronMaterial(outer,inner),link=polyhedronMapLink(body,anchor('south'),{kind:'surface',position:anchor('base',.5,.5,'inner')});assert.notEqual(link.anchors[0]!.id,link.anchors[1]!.id);assert.equal(link.anchors[0]!.targetAnchorId,link.anchors[1]!.id);
 const external=relocatePolyhedronLink(body,link,link.anchors[1]!.id,{kind:'map-location',worldId:'external',mapId:'map',locationId:'door'});assert.equal(external.id,link.id);assert.deepEqual(external.anchors.map(a=>a.id),link.anchors.map(a=>a.id));assert.deepEqual(validatePolyhedronLink(body,external),external);
 assert.throws(()=>polyhedronMapLink(body,{...anchor('south'),surfaceId:'fake'},{kind:'map-location',worldId:'external',mapId:'map',locationId:'door'}));assert.throws(()=>validatePolyhedronLink(body,{...link,anchors:link.anchors.map((a,i)=>i?a:{...a,targetAnchorId:a.id})}));
 assert.throws(()=>polyhedronMapLink(body,anchor('south'),{kind:'surface',position:anchor('south')}));assert.throws(()=>relocatePolyhedronLink(body,external,external.anchors[0]!.id,{kind:'map-location',worldId:body.worldId,mapId:'map',locationId:'door'}));assert.throws(()=>validatePolyhedronLink(body,{...external,anchors:external.anchors.map((a,i)=>i?a:{...a,location:{kind:'surface',position:{...anchor('south'),worldId:'external',extra:true}}})}));
});
