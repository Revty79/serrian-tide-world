import {test} from 'node:test';import assert from 'node:assert/strict';
import {createFragmentGeometry,fragmentReference,type FragmentConfiguration} from './fragment.ts';
import {pyramidDot,pyramidSub} from './pyramid.ts';
import {floatingIslandNetPoint,initialFloatingIslandView,projectFloatingIsland,unprojectFloatingIsland} from '../rendering/floating-island-view.ts';
import {createPhysicalPieceTerrain} from '../terrain/physical-piece.ts';
import {createFragmentComponents} from '../editor/fragment-generation.ts';
import {islandPointToLocal,islandPointToWorld,validateIslandArrangement} from '../editor/floating-islands-placement.ts';
import {islandDescriptor} from '../editor/floating-islands-document.ts';
import {polyhedronDistance,polyhedronDistanceReference} from './polyhedron-path.ts';
const config:FragmentConfiguration={provider:'physical-tetrahedral-fragment',version:1,role:'exterior',identity:{worldId:'fragments',surfaceId:'surface'},parentWidthMeters:1e6,fractureSeed:0,piece:0};
function overlap(a:readonly(readonly number[])[],b:readonly(readonly number[])[]){for(const p of[a,b])for(let i=0;i<3;i++){const q=p[i]!,r=p[(i+1)%3]!,axis=[q[1]!-r[1]!,r[0]!-q[0]!],project=(c:typeof a)=>c.map(v=>v[0]!*axis[0]!+v[1]!*axis[1]!),x=project(a),y=project(b);if(Math.min(...x)>=Math.max(...y)-1e-10||Math.min(...y)>=Math.max(...x)-1e-10)return false;}return true;}
test('fracture partitions one parent exactly: positive closed convex material, outward normals, paired break faces and preserved parent boundary',()=>{
 for(let seed=0;seed<8;seed++)for(const width of[1e4,1e6,1e9]){let volume=0;const breaks=new Map<string,{normal:readonly number[];count:number}>();const ref=fragmentReference(width,seed);
 for(let piece=0;piece<4;piece++){const g=createFragmentGeometry({...config,parentWidthMeters:width,fractureSeed:seed,piece});volume+=g.volumeMeters3;assert.ok(g.volumeMeters3>0);assert.deepEqual(g.vertices,createFragmentGeometry(g.metadata).vertices);assert.equal(g.faces.length,4);assert.equal(g.edges.length,6);const incidence=new Map<string,number>();
 for(const f of g.faces){const frame=g.frame(f);assert.ok(Math.abs(Math.hypot(...frame.normal)-1)<1e-12);for(const v of g.vertices)assert.ok(pyramidDot(frame.normal,pyramidSub(v,frame.origin))<width*1e-12);const ids=g.vertexIds(f);for(let i=0;i<3;i++){const a=ids[i]!,b=ids[(i+1)%3]!,key=[Math.min(a,b),Math.max(a,b)].join(',');incidence.set(key,(incidence.get(key)??0)+(a<b?1:-1));}if(g.physicalFaceId(f)!=='outer'){const key=ids.map(i=>g.parentVertexIds[i]).sort().join(','),other=breaks.get(key);if(other){assert.ok(pyramidDot(frame.normal,other.normal as never)<-1+1e-12);other.count++;}else breaks.set(key,{normal:frame.normal,count:1});}}
 assert.ok([...incidence.values()].every(x=>x===0));for(let i=0;i<4;i++)for(let k=0;k<3;k++)assert.ok(Math.abs(g.vertices[i]![k]!+g.parentCenter[k]!-ref.vertices[g.parentVertexIds[i]!]![k]!)<width*1e-14);
 }assert.ok(Math.abs(volume-width**3/3)<width**3*1e-13);assert.equal(breaks.size,6);assert.ok([...breaks.values()].every(x=>x.count===2));}
});
test('all bounded patterns have a complete nonoverlapping net, accurate picking, welded edge aliases and certified intrinsic distances',()=>{
 for(let seed=0;seed<8;seed++)for(let piece=0;piece<4;piece++){const g=createFragmentGeometry({...config,fractureSeed:seed,piece}),triangles=g.faces.map(patchId=>[[0,0],[1,0],[0,1]].map(([u,v])=>floatingIslandNetPoint(g,{...g.identity,patchId,u:u!,v:v!}))),view=initialFloatingIslandView(g,'map'),size={width:1440,height:950};for(let i=0;i<4;i++)for(let j=0;j<i;j++)assert.equal(overlap(triangles[i]!,triangles[j]!),false);
 const t=createPhysicalPieceTerrain({terrainId:'terrain',geometry:g.metadata,subdivisions:128});assert.equal(t.sampleCount,32770);for(const patchId of g.faces){const p={...g.identity,patchId,u:.27,v:.31},screen=projectFloatingIsland(g,p,view,size)!,hit=unprojectFloatingIsland(g,view,size,screen)!;assert.equal(hit.patchId,patchId);assert.ok(Math.hypot(hit.u-p.u,hit.v-p.v)<1e-12);const a={...p,patchId:g.faces[0]!},d=polyhedronDistance(g,a,p),r=polyhedronDistanceReference(g,a,p);assert.ok(d.lowerBoundMeters<=r.upperBoundMeters&&r.lowerBoundMeters<=d.upperBoundMeters);assert.ok(d.upperBoundMeters-d.lowerBoundMeters<.001);}
 for(let i=0;i<t.boundarySampleCount;i++){const k=t.keyAt(i);for(const alias of t.aliases(k))assert.equal(t.resolve(alias).index,i);}
 }
});
test('four generated N256 fragments fit the unchanged budget, transform exactly, and reject duplicate parent pieces and collisions',()=>{
 const components=createFragmentComponents('world',{parent:'regular-tetrahedron',version:1,widthMeters:1e6,seed:3,separationPercent:80},256),descriptors=components.map(islandDescriptor);assert.equal(components.reduce((s,c)=>s+c.terrain.sampleCount,0),524296);validateIslandArrangement('world',descriptors);
 for(const c of components)for(const scale of[.5,1,2]){const p={...c.placement,positionMeters:[1e6,-2e6,3e6] as const,rotationDegrees:[17,-37,92] as const,scale};for(const v of c.terrain.geometry.vertices){const roundtrip=islandPointToLocal(p,islandPointToWorld(p,v));assert.ok(Math.hypot(...v.map((x,k)=>x-roundtrip[k]!))<1e-8);}}
 assert.throws(()=>validateIslandArrangement('world',[descriptors[0]!,{...descriptors[1]!,placement:descriptors[0]!.placement}]));assert.throws(()=>validateIslandArrangement('world',[descriptors[0]!,{...descriptors[1]!,geometry:{...descriptors[0]!.geometry,identity:descriptors[1]!.geometry.identity}}]));
});
