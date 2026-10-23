import {test} from 'node:test';import assert from 'node:assert/strict';
import {createTetrahedronGeometry} from './tetrahedron.ts';
import {polyhedronMaterial,polyhedronMaterialCapsuleFits} from './polyhedron-material.ts';
import {polyhedronHoleAt,polyhedronHoleCut,movePolyhedronHole,resizePolyhedronHole} from './polyhedron-holes.ts';
import {polyhedronPassageBetween,validatePolyhedronPassage,branchPolyhedronPassage,resizePolyhedronChamber,addPolyhedronOpening,relocatePolyhedronOpening,polyhedronMapLink,validatePolyhedronLink} from './polyhedron-passages.ts';
import {tracePolyhedronExcavation} from './polyhedron-excavation.ts';
const identity={worldId:'physical-tetrahedron-connections',surfaceId:'outside'},outer=createTetrahedronGeometry({provider:'physical-regular-tetrahedron',version:1,identity,role:'exterior',edgeLengthMeters:1e6}),inner=createTetrahedronGeometry({...outer.metadata,identity:{...identity,surfaceId:'inside'},role:'interior',edgeLengthMeters:8e5});
const anchor=(patchId:string,u=1/3,v=1/3,inside=false)=>({...identity,surfaceId:inside?'inside':'outside',patchId,u,v});
test('actual tetrahedral material supports holes on faces, real edges and vertices without a fabricated solid bank',()=>{
 for(const hollow of[false,true]){const body=polyhedronMaterial(outer,hollow?inner:undefined);assert.equal(body.outerPlanes.length,4);assert.equal(body.innerPlanes.length,hollow?4:0);
  for(const p of[anchor('south'),anchor('south',.5,0),anchor('south',0,1),anchor('base',0,0),...(hollow?[anchor('south',0,1,true)]:[])]){const h=polyhedronHoleAt(body,p,1000),cut=polyhedronHoleCut(body,h);assert.deepEqual(h.mouths.map(m=>body.select(m.position).role),hollow?['exterior','interior']:['exterior','exterior']);assert.ok(Math.hypot(...cut.a.map((x,k)=>x-cut.b[k]!))>2*cut.r);assert.deepEqual(resizePolyhedronHole(body,h,800).mouths.map(m=>m.id),h.mouths.map(m=>m.id));assert.deepEqual(movePolyhedronHole(body,h,anchor('east')).mouths.map(m=>m.id),h.mouths.map(m=>m.id));}
  if(!hollow)assert.throws(()=>body.select(anchor('south',.3,.3,true)),/Unknown actual/);
 }
});
test('both tetrahedron variants connect all six real face pairs with completely contained material capsules',()=>{
 for(const hollow of[false,true]){const body=polyhedronMaterial(outer,hollow?inner:undefined);for(let i=0;i<4;i++)for(let j=0;j<i;j++){
  const p=polyhedronPassageBetween(body,anchor(outer.faces[i]!),anchor(outer.faces[j]!,1/3,1/3,hollow),2000);assert.deepEqual(validatePolyhedronPassage(body,p),p);const portals=new Set(p.portals.map(a=>a.nodeId));for(const edge of p.segments)if(!portals.has(edge.from)&&!portals.has(edge.to))assert.ok(polyhedronMaterialCapsuleFits(body,p.nodes.find(n=>n.id===edge.from)!.position,p.nodes.find(n=>n.id===edge.to)!.position,edge.radiusMeters));
 }}
});
test('shared graph edits, actual physical ray hits and reciprocal identities work for solid and hollow tetrahedra',()=>{
 for(const hollow of[false,true]){const body=polyhedronMaterial(outer,hollow?inner:undefined),p=polyhedronPassageBetween(body,anchor('south'),anchor('east'),2000),joint=p.nodes.find(n=>!p.portals.some(a=>a.nodeId===n.id))!,branch=branchPolyhedronPassage(body,p,joint.id,4000,1000,'tangent'),chamber=resizePolyhedronChamber(body,branch,joint.id,3000),extra=addPolyhedronOpening(body,chamber,joint.id,anchor('base'),2000),moved=relocatePolyhedronOpening(body,extra,extra.portals.at(-1)!.id,anchor('west'));assert.equal(moved.portals.length,3);assert.equal(moved.portals.at(-1)!.id,extra.portals.at(-1)!.id);assert.equal(moved.id,p.id);
  const primitives=[...moved.nodes.map(n=>({a:n.position,b:n.position,radius:n.radiusMeters})),...moved.segments.map(s=>({a:moved.nodes.find(n=>n.id===s.from)!.position,b:moved.nodes.find(n=>n.id===s.to)!.position,radius:s.radiusMeters}))],hit=tracePolyhedronExcavation({body,primitives},joint.position,[1,0,0]);assert.equal(hit?.kind,'rock');assert.ok(hit!.distance>0);assert.throws(()=>resizePolyhedronChamber(body,moved,joint.id,1e6));
  const link=polyhedronMapLink(body,anchor('south'),{kind:'surface',position:anchor('base',.3,.3,hollow)});assert.deepEqual(validatePolyhedronLink(body,link),link);assert.notEqual(link.anchors[0]!.id,link.anchors[1]!.id);assert.equal(link.anchors[0]!.targetAnchorId,link.anchors[1]!.id);assert.throws(()=>validatePolyhedronLink(body,{...link,worldId:'foreign'}));
 }
});
