import {test} from 'node:test';import assert from 'node:assert/strict';
import {createIcosahedronGeometry,ICOSAHEDRON_EDGES} from './icosahedron.ts';
import {pyramidDot,pyramidSub} from './pyramid.ts';
import {polyhedronDistance,polyhedronDistanceReference,reconstructPolyhedronPath,polyhedronUnfoldings} from './polyhedron-path.ts';
const identity={worldId:'octa',surfaceId:'outside'},configuration={provider:'physical-regular-icosahedron' as const,version:1 as const,identity,role:'exterior' as const,edgeLengthMeters:1e6},point=(patchId:string,u=1/3,v=1/3)=>({...identity,patchId,u,v});
test('regular icosahedron has twenty real equilateral outward triangles, thirty edges and twelve five-face vertices',()=>{
 const g=createIcosahedronGeometry(configuration),incidence=new Map<string,number>();assert.equal(g.faces.length,20);assert.equal(g.edges.length,30);assert.equal(g.vertices.length,12);assert.equal(g.vertices.length-g.edges.length+g.faces.length,2);
 for(const[i,j]of ICOSAHEDRON_EDGES)assert.ok(Math.abs(Math.hypot(...pyramidSub(g.vertices[i]!,g.vertices[j]!))-1e6)<1e-8);
 for(const face of g.faces){const f=g.frame(face),p=g.referencePosition(point(face));assert.equal(g.vertexIds(face).length,3);assert.ok(g.isTriangle(face));assert.ok(Math.abs(Math.hypot(...f.normal)-1)<1e-14);assert.ok(Math.abs(pyramidDot(f.normal,p)-g.inradiusMeters)<1e-8);for(let i=0;i<3;i++){const pair=[g.vertexIds(face)[i]!,g.vertexIds(face)[(i+1)%3]!].sort().join(':');incidence.set(pair,(incidence.get(pair)??0)+1);}}
 assert.equal(incidence.size,30);assert.ok([...incidence.values()].every(n=>n===2));for(let i=0;i<12;i++)assert.equal(g.faces.filter(f=>g.vertexIds(f).includes(i)).length,5);assert.equal(g.surfaceAreaMeters2,5*Math.sqrt(3)*1e12);assert.equal(g.volumeMeters3,5*(3+Math.sqrt(5))*1e18/12);
});
test('icosahedron aliases, chart winding and frozen physical intervals preserve real edges, vertices and inward normals',()=>{
 const g=createIcosahedronGeometry(configuration),inside=createIcosahedronGeometry({...configuration,role:'interior'});
 for(const face of g.faces)for(const[u,v]of[[0,0],[1,0],[0,1],[.5,0],[0,.5],[.5,.5],[.2,.3]]){const p=point(face,u!,v!),q=g.referencePosition(p),aliases=g.aliases(p);assert.equal(aliases.length,p.u===0&&p.v===0||p.u===1||p.v===1?5:p.u===0||p.v===0||p.u+p.v===1?2:1);for(const a of aliases)assert.ok(g.referencePosition(a).every((x,k)=>Math.abs(x-q[k]!)<1e-8));assert.ok(pyramidDot(g.normal(p),inside.normal(p))<-.999999);}
 for(let i=0;i<12;i++){const bounds=g.physicalVertexBounds(i);for(let k=0;k<3;k++)assert.ok(bounds[k]![0]<=g.vertices[i]![k]!&&bounds[k]![1]>=g.vertices[i]![k]!);assert.throws(()=>{(bounds[0] as unknown as number[])[0]=Infinity;});}assert.throws(()=>{(g.chartVertexBounds('f0')[0]![0] as unknown as number[])[0]=1;});assert.throws(()=>{(g.vertices[0] as unknown as number[])[0]=1;});
 for(const patch of[{edgeLengthMeters:0},{edgeLengthMeters:NaN},{edgeLengthMeters:1e10},{provider:'physical-regular-tetrahedron'}])assert.throws(()=>createIcosahedronGeometry({...configuration,...patch} as never));for(const p of[point('f0',.7,.7),point('base'),{...point('f0'),surfaceId:'foreign'}])assert.throws(()=>g.normalize(p));
});

test('icosahedron certified global routes cover all twenty face destinations, independently matching exhaustive witnesses',()=>{
 const g=createIcosahedronGeometry(configuration),a=point('f0',.23,.31);let maxRoutes=0;
 for(const face of g.faces){const b=point(face,.29,.37),d=polyhedronDistance(g,a,b),r=polyhedronDistanceReference(g,a,b),path=reconstructPolyhedronPath(g,a,b);assert.ok(d.lowerBoundMeters<=r.upperBoundMeters&&r.lowerBoundMeters<=d.upperBoundMeters);assert.ok(d.upperBoundMeters-d.lowerBoundMeters<.001);assert.ok(Math.abs(path.lengthMeters-r.upperBoundMeters)<.001);maxRoutes=Math.max(maxRoutes,polyhedronUnfoldings(g,'f0',face).length);let prev=path.atDistance(0);for(let i=1;i<=20;i++){const next=path.atDistance(path.lengthMeters*i/20);assert.ok(Math.hypot(...pyramidSub(next.referencePosition,prev.referencePosition))<=path.lengthMeters/20+.001);prev=next;}}
 assert.equal(maxRoutes,780);assert.throws(()=>polyhedronDistance(g,a,point('f6'),{maxBoxes:1}),/budget/);
});
test('every five-face vertex has certified short local routes, exact endpoints, and no ambient chord substitution',()=>{
 const g=createIcosahedronGeometry(configuration);
 for(let vertex=0;vertex<12;vertex++){const faces=g.faces.filter(f=>g.vertexIds(f).includes(vertex)),source=g.fromWeights(faces[0]!,new Map([[vertex,1]]))!;
 for(const face of faces){const ids=g.vertexIds(face),weights=new Map(ids.map(id=>[id,id===vertex?.998:.001])),end=g.fromWeights(face,weights)!,d=polyhedronDistance(g,source,end),r=polyhedronDistanceReference(g,source,end),path=reconstructPolyhedronPath(g,source,end);assert.ok(d.lowerBoundMeters<=r.upperBoundMeters&&r.lowerBoundMeters<=d.upperBoundMeters);assert.ok(Math.abs(path.lengthMeters-r.upperBoundMeters)<.001);assert.deepEqual(path.atDistance(0).position,source);}
 }
});
