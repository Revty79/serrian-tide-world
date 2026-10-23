import {test} from 'node:test';import assert from 'node:assert/strict';
import {createTetrahedronGeometry,TETRAHEDRON_FACES,TETRAHEDRON_EDGES} from './tetrahedron.ts';
import {pyramidDot,pyramidSub} from './pyramid.ts';
import {polyhedronDistance,polyhedronDistanceReference,reconstructPolyhedronPath,polyhedronUnfoldings} from './polyhedron-path.ts';
const identity={worldId:'tetra',surfaceId:'outside'},configuration={provider:'physical-regular-tetrahedron' as const,version:1 as const,identity,role:'exterior' as const,edgeLengthMeters:1e6};
const point=(patchId:string,u=1/3,v=1/3)=>({...identity,patchId,u,v});
test('regular tetrahedron has four genuine equilateral triangles, six edges and four outward shared vertices',()=>{
 const g=createTetrahedronGeometry(configuration),incidence=new Map<string,number>();assert.equal(g.vertices.length,4);assert.equal(g.faces.length,4);assert.equal(g.edges.length,6);
 for(const[i,j]of TETRAHEDRON_EDGES)assert.ok(Math.abs(Math.hypot(...pyramidSub(g.vertices[i]!,g.vertices[j]!))-configuration.edgeLengthMeters)<1e-8);
 for(const face of g.faces){assert.equal(g.vertexIds(face).length,3);assert.ok(g.isTriangle(face));const f=g.frame(face);assert.ok(Math.abs(Math.hypot(...f.normal)-1)<1e-14);assert.ok(pyramidDot(f.normal,g.referencePosition(point(face)))>0);assert.ok(Math.abs(pyramidDot(f.normal,g.referencePosition(point(face)))-g.inradiusMeters)<1e-8);for(let i=0;i<3;i++){const key=[g.vertexIds(face)[i]!,g.vertexIds(face)[(i+1)%3]!].sort().join(':');incidence.set(key,(incidence.get(key)??0)+1);}}
 assert.equal(incidence.size,6);assert.ok([...incidence.values()].every(x=>x===2));assert.equal(g.surfaceAreaMeters2,Math.sqrt(3)*1e12);assert.throws(()=>g.normalize(point('base',.7,.7)));assert.ok(!('baseWidthMeters' in g.metadata));
});
test('tetrahedron charts, all vertex/edge aliases and immutable interval coordinates describe the real physical model',()=>{
 const g=createTetrahedronGeometry(configuration);for(const face of g.faces)for(const[u,v]of[[0,0],[1,0],[0,1],[.5,0],[0,.5],[.5,.5],[.2,.3]]){const p=point(face,u!,v!),q=g.referencePosition(p),aliases=g.aliases(p);assert.equal(aliases.length,p.u===0&&p.v===0||p.u===1||p.v===1?3:p.u===0||p.v===0||p.u+p.v===1?2:1);for(const a of aliases)assert.ok(g.referencePosition(a).every((x,k)=>Math.abs(x-q[k]!)<1e-8));}
 for(let i=0;i<4;i++){const bounds=g.physicalVertexBounds(i);for(let k=0;k<3;k++)assert.ok(bounds[k]![0]<=g.vertices[i]![k]!&&bounds[k]![1]>=g.vertices[i]![k]!);assert.throws(()=>{(bounds[0] as unknown as number[])[0]=Infinity;});}
 assert.throws(()=>{(g.chartVertexBounds('base')[0]![0] as unknown as number[])[0]=Infinity;});assert.throws(()=>{(g.vertices[0] as unknown as number[])[0]=Infinity;});
 for(const patch of[{edgeLengthMeters:0},{edgeLengthMeters:NaN},{edgeLengthMeters:1e10}])assert.throws(()=>createTetrahedronGeometry({...configuration,...patch}));assert.throws(()=>g.normalize({...point('base'),surfaceId:'foreign'}));
 const inside=createTetrahedronGeometry({...configuration,role:'interior'});for(const face of g.faces)assert.ok(pyramidDot(g.normal(point(face)),inside.normal(point(face)))<-.999999);
});
test('tetrahedron certified planar and adjacent routes enclose analytic lengths and never substitute a material chord',()=>{
 const g=createTetrahedronGeometry(configuration),a=point('base',.1,.2),b=point('base',.4,.3),expected=1e6*Math.sqrt(.3**2+.1**2+.3*.1),d=polyhedronDistance(g,a,b);assert.ok(d.lowerBoundMeters<=expected&&d.upperBoundMeters>=expected);
 // Every pair of distinct tetrahedron faces shares an edge. There is no
 // nonadjacent face pair to fabricate; exhaustive routes still include paths
 // through either/both other faces, including vertex-grazing alternatives.
 for(const face of g.faces)for(const other of g.faces){const a=point(face),b=point(other),d=polyhedronDistance(g,a,b),reference=polyhedronDistanceReference(g,a,b),reverse=polyhedronDistance(g,b,a);assert.ok(d.lowerBoundMeters<=reference.upperBoundMeters&&reference.lowerBoundMeters<=d.upperBoundMeters);assert.ok(d.upperBoundMeters-d.lowerBoundMeters<.001);assert.ok(Math.abs(d.lowerBoundMeters-reverse.lowerBoundMeters)<.001);if(face!==other){const expected=1e6/Math.sqrt(3);assert.ok(d.lowerBoundMeters<=expected&&d.upperBoundMeters>=expected);assert.ok(d.lowerBoundMeters>Math.hypot(...pyramidSub(g.referencePosition(a),g.referencePosition(b))));assert.equal(polyhedronUnfoldings(g,face,other).length,5);}const path=reconstructPolyhedronPath(g,a,b);assert.deepEqual(path.atDistance(0).referencePosition,g.referencePosition(a));assert.deepEqual(path.atDistance(path.lengthMeters).referencePosition,g.referencePosition(b));}
});
test('tetrahedron carried paths remain continuous through all vertices/edges with bounded work and explicit certification failures',()=>{
 const g=createTetrahedronGeometry(configuration);for(const face of TETRAHEDRON_FACES)for(const[u,v]of[[0,0],[0,1],[.001,.998],[0,.5],[.2,.3]])for(const other of g.faces){const a=point(face,u!,v!),b=point(other,.21,.29),path=reconstructPolyhedronPath(g,a,b);let previous=path.atDistance(0);for(let i=1;i<=30;i++){const p=path.atDistance(path.lengthMeters*(i/30));g.normalize(p.position);assert.ok(Math.hypot(...pyramidSub(p.referencePosition,previous.referencePosition))<=path.lengthMeters/30+.001);previous=p;}}
 assert.throws(()=>polyhedronDistance(g,point('base'),point('south'),{maxBoxes:1}));assert.throws(()=>polyhedronDistance(g,point('base'),point('south'),{absoluteToleranceMeters:1e-12}));
});
