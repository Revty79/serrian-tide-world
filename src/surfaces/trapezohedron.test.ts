import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrapezohedronGeometry} from './trapezohedron.ts';
import {pyramidCross,pyramidDot,pyramidSub} from './pyramid.ts';
const configuration={provider:'physical-pentagonal-trapezohedron' as const,version:1 as const,identity:{worldId:'trapezohedron',surfaceId:'outside'},role:'exterior' as const,radiusMeters:1e6};
test('decahedron physical size scales consistently; equatorial diameter is distinct from the full three-dimensional diameter',()=>{const unit=createTrapezohedronGeometry({...configuration,radiusMeters:1});for(const radiusMeters of[1,1e6,1e9]){const g=createTrapezohedronGeometry({...configuration,radiusMeters});assert.equal(g.heightMeters,2*radiusMeters);assert.equal(g.equatorialDiameterMeters,2*radiusMeters);const diameter=Math.max(...g.vertices.flatMap(a=>g.vertices.map(b=>Math.hypot(...pyramidSub(a,b)))));assert.ok(Math.abs(g.diameterMeters-diameter)<diameter*1e-13);assert.ok(g.diameterMeters>g.equatorialDiameterMeters);assert.ok(Math.abs(g.surfaceAreaMeters2/unit.surfaceAreaMeters2-radiusMeters**2)<radiusMeters**2*1e-12);assert.ok(Math.abs(g.volumeMeters3/unit.volumeMeters3-radiusMeters**3)<radiusMeters**3*1e-12);}});
test('Trapezohedron physical kites have 10 faces, 20 edges, 12 vertices, planar convex outward incidence and no physical diagonals',()=>{
 const g=createTrapezohedronGeometry(configuration);assert.equal(g.physicalFaces.length,10);assert.equal(g.physicalEdges.length,20);assert.equal(g.vertices.length,12);
 assert.equal(g.faces.length,20);assert.equal(g.edges.length,30);assert.equal(g.heightMeters,2e6);
 for(const e of g.physicalEdges)assert.equal(g.physicalFaces.filter(f=>f.vertices.includes(e[0])&&f.vertices.includes(e[1])).length,2);
 assert.deepEqual(g.vertices.map((_,i)=>g.physicalEdges.filter(e=>e.includes(i)).length),[5,5,...Array(10).fill(3)]);
 for(const face of g.physicalFaces){const p=face.vertices.map(i=>g.vertices[i]!),normal=g.frame(`${face.id}:0`).normal,offset=pyramidDot(normal,p[0]!);assert.ok(offset>0);
  for(const q of p)assert.ok(Math.abs(pyramidDot(normal,q)-offset)<1e-8);
  for(const q of g.vertices)assert.ok(pyramidDot(normal,q)<=offset+1e-8);
  for(let i=0;i<4;i++)assert.ok(pyramidDot(pyramidCross(pyramidSub(p[(i+1)%4]!,p[i]!),pyramidSub(p[(i+2)%4]!,p[(i+1)%4]!)),normal)>0);
  const lengths=p.map((q,i)=>Math.hypot(...pyramidSub(q,p[(i+1)%4]!)));assert.ok(Math.abs(lengths[0]!-lengths[3]!)<1e-8);assert.ok(Math.abs(lengths[1]!-lengths[2]!)<1e-8);
  assert.ok(Math.abs(offset-g.inradiusMeters)<1e-8);
 }
 for(let i=0;i<12;i++)for(let k=0;k<3;k++){const b=g.physicalVertexBounds(i)[k]!;assert.ok(g.vertices[i]![k]!>=b[0]&&g.vertices[i]![k]!<=b[1]);}
});
test('Trapezohedron charts weld internal diagonals with the same physical kite identity, coordinates and inward/outward normals',()=>{
 const g=createTrapezohedronGeometry(configuration),inside=createTrapezohedronGeometry({...configuration,role:'interior'});
 for(const face of g.physicalFaces){const a={...g.identity,patchId:`${face.id}:0`,u:0,v:.5},aliases=g.aliases(a),b=aliases.find(p=>p.patchId===`${face.id}:1`)!;assert.ok(b);assert.equal(g.physicalFaceId(a.patchId),g.physicalFaceId(b.patchId));
  assert.ok(Math.hypot(...pyramidSub(g.referencePosition(a),g.referencePosition(b)))<1e-8);
  assert.ok(pyramidDot(g.normal(a),inside.normal(a))<-.999999999);
 }
});

import {polyhedronUnfoldings,polyhedronRouteCacheStatistics} from './polyhedron-path.ts';
test('polygon route geometry cache stays within 8192 placements without truncating complete route sets',()=>{const g=createTrapezohedronGeometry(configuration);for(const to of g.faces.slice(1,8)){const routes=polyhedronUnfoldings(g,g.faces[0]!,to);assert.ok(routes.length>400);assert.ok(polyhedronRouteCacheStatistics(g).placements<=8192);}const a=polyhedronUnfoldings(g,g.faces[0]!,g.faces[1]!);assert.equal(a.length,558);assert.ok(polyhedronRouteCacheStatistics(g).placements<=8192);});
