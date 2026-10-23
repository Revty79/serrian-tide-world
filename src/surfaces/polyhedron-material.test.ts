import {test} from 'node:test';import assert from 'node:assert/strict';
import {createPyramidGeometry} from './pyramid.ts';
import {polyhedronMaterial,polyhedronOuterBallFits,polyhedronMaterialCapsuleFits,polyhedronRayInterval,polyhedronPositionAt,polyhedronCavityBallFits,polyhedronBallOutside} from './polyhedron-material.ts';
import {polyhedronHoleAt,polyhedronHoleCut,movePolyhedronHole,resizePolyhedronHole,validatePolyhedronHole} from './polyhedron-holes.ts';
const identity={worldId:'physical-pyramid',surfaceId:'outer'},outer=createPyramidGeometry({provider:'physical-square-pyramid',version:1,identity,role:'exterior',baseWidthMeters:2e6,heightMeters:1.6e6,baseZMeters:0}),inner=createPyramidGeometry({provider:'physical-square-pyramid',version:1,identity:{...identity,surfaceId:'inner'},role:'interior',baseWidthMeters:1.2e6,heightMeters:1e6,baseZMeters:1e5}),anchor=(patchId:string,u:number,v:number)=>({...identity,patchId,u,v});
test('actual pyramid material planes certify solid volume, complete cavity containment and immutable bounds',()=>{
 const solid=polyhedronMaterial(outer),hollow=polyhedronMaterial(outer,inner);assert.equal(solid.interior,undefined);assert.equal(solid.outerPlanes.length,5);assert.ok(solid.minimumClearanceMeters>0);assert.ok(hollow.minimumClearanceMeters>0);assert.ok(polyhedronOuterBallFits(solid,solid.seed,1000));assert.equal(polyhedronOuterBallFits(solid,[0,0,-1],1),false);assert.equal(polyhedronMaterialCapsuleFits(hollow,hollow.seed,hollow.seed,1000),false);
 assert.ok(polyhedronCavityBallFits(hollow,inner.inspectionEyeMeters,1000));assert.ok(polyhedronBallOutside(solid,[0,0,-10000],1000));assert.throws(()=>{(solid.outerPlanes[0]!.bounds.normal[0] as unknown as number[])[0]=1e9;});assert.throws(()=>{(solid.bounds[0] as unknown as number[])[0]=1e9;});assert.throws(()=>polyhedronMaterial(outer,outer));assert.throws(()=>polyhedronMaterial(inner));
 const crossing=createPyramidGeometry({...inner.metadata,baseWidthMeters:1.9e6,heightMeters:1.5e6,baseZMeters:1e5});assert.throws(()=>polyhedronMaterial(outer,crossing));
});
test('normal solid bores have two real exterior mouths, free cutter endpoints and stable move/resize identities',()=>{
 const body=polyhedronMaterial(outer);for(const p of[anchor('south',.3,.3),anchor('base',.5,.5),anchor('east',.45,.1)]){
  const h=polyhedronHoleAt(body,p,5000),c=polyhedronHoleCut(body,h);assert.equal(h.mouths.length,2);assert.ok(h.mouths.every(m=>m.position.surfaceId===identity.surfaceId));assert.ok(polyhedronBallOutside(body,c.a,c.r));assert.ok(polyhedronBallOutside(body,c.b,c.r));assert.deepEqual(resizePolyhedronHole(body,h,6000).mouths,h.mouths);
  const moved=movePolyhedronHole(body,h,anchor('north',.3,.3));assert.equal(moved.id,h.id);assert.equal(moved.sourceMouthId,h.sourceMouthId);assert.deepEqual(moved.mouths.map(m=>m.id).sort(),h.mouths.map(m=>m.id).sort());
  assert.throws(()=>validatePolyhedronHole(body,{...h,mouths:[h.mouths[0]!,{...h.mouths[1]!,position:anchor('north',.1,.1)}]}));
 }
 for(const p of[anchor('south',.5,0),anchor('south',0,1),anchor('base',0,0)])assert.ok(polyhedronHoleAt(body,p,5000).mouths.length===2);
});
test('hollow normal bores use both actual boundaries, certify whole free cap balls and reject cavity misses',()=>{
 const body=polyhedronMaterial(outer,inner);for(const p of[anchor('south',.3,.3),{...anchor('base',.5,.5),surfaceId:'inner'}]){
  const h=polyhedronHoleAt(body,p,5000),c=polyhedronHoleCut(body,h),source=h.mouths.find(m=>m.id===h.sourceMouthId)!;assert.equal(source.position.surfaceId,p.surfaceId);assert.equal(h.mouths[0]!.position.surfaceId,'outer');assert.equal(h.mouths[1]!.position.surfaceId,'inner');assert.ok(polyhedronBallOutside(body,c.a,c.r)||polyhedronCavityBallFits(body,c.a,c.r));assert.ok(polyhedronBallOutside(body,c.b,c.r)||polyhedronCavityBallFits(body,c.b,c.r));
 }
 assert.throws(()=>polyhedronHoleAt(body,anchor('south',.2,.01),5000),/boundary|material/);assert.throws(()=>polyhedronHoleAt(body,{...anchor('south',.3,.3),surfaceId:'foreign'},5000));
 const h=polyhedronHoleAt(body,anchor('south',.3,.3),5000),moved=movePolyhedronHole(body,h,{...anchor('base',.5,.5),surfaceId:'inner'});assert.deepEqual(moved.mouths.map(m=>m.id),h.mouths.map(m=>m.id));assert.equal(moved.sourceMouthId,h.mouths[1]!.id);assert.equal(moved.mouths[0]!.position.surfaceId,'outer');
 for(const surfaceId of['outer','inner'])for(const p of[anchor('south',.5,0),anchor('south',0,1),anchor('base',0,0)])assert.equal(polyhedronHoleAt(body,{...p,surfaceId},5000).mouths.length,2);
});
test('physical ray clips and reference coordinates agree on all real pyramid faces',()=>{
 const body=polyhedronMaterial(outer);for(const face of outer.faces){const p=outer.normalize(anchor(face,.3,.3)),q=outer.referencePosition(p),n=outer.frame(face).normal,o=q.map((x,k)=>x+100000*n[k]!) as unknown as readonly[number,number,number],d=n.map(x=>-x) as unknown as readonly[number,number,number],hit=polyhedronRayInterval(body.outerPlanes,o,d)!;assert.ok(Math.abs(hit.enter-100000)<1e-7);assert.equal(hit.enterFace,face);const restored=polyhedronPositionAt(outer,face,q);assert.ok(Math.hypot(...outer.referencePosition(restored).map((x,k)=>x-q[k]!))<1e-7);}
});
