import {test} from 'node:test';import assert from 'node:assert/strict';
import {createFloatingIslandGeometry} from './floating-island.ts';
import {pyramidDot,pyramidSub} from './pyramid.ts';
import {polyhedronDistance,polyhedronDistanceReference,reconstructPolyhedronPath} from './polyhedron-path.ts';
import {floatingIslandNetPoint,floatingIslandNetRoutes,initialFloatingIslandView,projectFloatingIsland,unprojectFloatingIsland} from '../rendering/floating-island-view.ts';
export const islandConfig={provider:'physical-floating-island' as const,version:1 as const,role:'exterior' as const,identity:{worldId:'islands',surfaceId:'island-a'},widthMeters:1e6,lengthMeters:1e6,thicknessMeters:4e5,seed:0};
function overlap(a:readonly(readonly number[])[],b:readonly(readonly number[])[]){for(const p of[a,b])for(let i=0;i<3;i++){const q=p[i]!,r=p[(i+1)%3]!,axis=[q[1]!-r[1]!,r[0]!-q[0]!],project=(c:typeof a)=>c.map(v=>v[0]!*axis[0]!+v[1]!*axis[1]!),x=project(a),y=project(b);if(Math.min(...x)>=Math.max(...y)-1e-10||Math.min(...y)>=Math.max(...x)-1e-10)return false;}return true;}
test('bounded island provider: closed outward convex material, finite positive thickness, rational bounds and deterministic outlines',()=>{
 for(let seed=0;seed<6;seed++)for(const length of[.75,1,1.5])for(const thickness of[.25,.4,.65]){
 const g=createFloatingIslandGeometry({...islandConfig,seed,lengthMeters:length*1e6,thicknessMeters:thickness*1e6}),edges=new Map<string,number>();assert.equal(g.vertices.length,11);assert.equal(g.faces.length,18);assert.equal(g.edges.length,27);assert.equal(g.physicalFaces.length,11);assert.equal(g.physicalEdges.length,20);assert.ok(g.volumeMeters3>0);
 assert.deepEqual(g.vertices,createFloatingIslandGeometry({...g.metadata}).vertices);
 for(const face of g.faces){const f=g.frame(face);assert.ok(Math.abs(Math.hypot(...f.normal)-1)<1e-12);for(const p of g.vertices)assert.ok(pyramidDot(f.normal,pyramidSub(p,f.origin))<1e-7,'every vertex inside every oriented halfspace proves a convex, non-self-intersecting body');const ids=g.vertexIds(face);for(let i=0;i<3;i++){const a=ids[i]!,b=ids[(i+1)%3]!,key=[Math.min(a,b),Math.max(a,b)].join(':');edges.set(key,(edges.get(key)??0)+(a<b?1:-1));}}
 assert.equal(edges.size,27);assert.ok([...edges.values()].every(v=>v===0),'each edge has two opposite windings');for(let i=0;i<11;i++)for(let k=0;k<3;k++){const bound=g.physicalVertexBounds(i)[k]!;assert.ok(bound[0]<=g.vertices[i]![k]!&&bound[1]>=g.vertices[i]![k]!);}
 }
 for(const patch of[{seed:-1},{seed:1.5},{widthMeters:9999},{lengthMeters:2e6},{thicknessMeters:0},{role:'interior'},{version:2}])assert.throws(()=>createFloatingIslandGeometry({...islandConfig,...patch} as never));
});
test('all supported outline/aspect extremes unfold without overlap, retain all eighteen real attached charts, and roundtrip map picking',()=>{
 for(let seed=0;seed<6;seed++)for(const length of[.75,1,1.5])for(const thickness of[.25,.4,.65]){const g=createFloatingIslandGeometry({...islandConfig,seed,lengthMeters:length*1e6,thicknessMeters:thickness*1e6}),routes=floatingIslandNetRoutes(g);assert.equal(routes.length,18);const triangles=g.faces.map(patchId=>[[0,0],[1,0],[0,1]].map(([u,v])=>floatingIslandNetPoint(g,{...g.identity,patchId,u:u!,v:v!})));for(let i=0;i<18;i++)for(let j=0;j<i;j++)assert.equal(overlap(triangles[i]!,triangles[j]!),false);const view=initialFloatingIslandView(g,'map'),size={width:1440,height:950};for(const patchId of g.faces){const p={...g.identity,patchId,u:.23,v:.31},screen=projectFloatingIsland(g,p,view,size)!,hit=unprojectFloatingIsland(g,view,size,screen)!;assert.equal(hit.patchId,patchId);assert.ok(Math.hypot(hit.u-p.u,hit.v-p.v)<1e-12);}}
});
test('certified island surface routes follow real upper/cliff/underside topology and never cut through material',()=>{
 const g=createFloatingIslandGeometry(islandConfig),a={...g.identity,patchId:'upper:1',u:.23,v:.31};
 for(const patchId of g.faces){const b={...g.identity,patchId,u:.27,v:.37},d=polyhedronDistance(g,a,b),r=polyhedronDistanceReference(g,a,b),path=reconstructPolyhedronPath(g,a,b);assert.ok(d.lowerBoundMeters<=r.upperBoundMeters&&r.lowerBoundMeters<=d.upperBoundMeters);assert.ok(d.upperBoundMeters-d.lowerBoundMeters<.001);assert.ok(Math.abs(path.lengthMeters-r.upperBoundMeters)<.001);assert.ok(path.lengthMeters+1e-6>=Math.hypot(...pyramidSub(g.referencePosition(a),g.referencePosition(b))));}
 assert.throws(()=>g.normalize({...a,surfaceId:'other-island'}));
});
