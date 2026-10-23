import test from 'node:test';import assert from 'node:assert/strict';
import {createDodecahedronGeometry} from './dodecahedron.ts';
import {pyramidCross,pyramidDot,pyramidSub} from './pyramid.ts';
const configuration={provider:'physical-regular-dodecahedron' as const,version:1 as const,identity:{worldId:'dodecahedron',surfaceId:'outside'},role:'exterior' as const,edgeLengthMeters:1e6};
test('regular dodecahedron has twelve regular planar outward pentagons, thirty physical edges, twenty valence-three vertices, and certified dimensions',()=>{
 for(const edgeLengthMeters of[1,1e6,1e9]){const g=createDodecahedronGeometry({...configuration,edgeLengthMeters}),e=edgeLengthMeters,tolerance=e*1e-12;
 assert.equal(g.physicalFaces.length,12);assert.equal(g.physicalEdges.length,30);assert.equal(g.vertices.length,20);assert.equal(g.faces.length,36);assert.equal(g.edges.length,54);
 assert.ok(g.vertices.every((_,i)=>g.physicalEdges.filter(e=>e.includes(i)).length===3));
 for(const f of g.physicalFaces){const p=f.vertices.map(i=>g.vertices[i]!),normal=g.frame(`${f.id}:0`).normal,offset=pyramidDot(normal,p[0]!);assert.ok(Math.abs(offset-g.inradiusMeters)<tolerance);
 for(const q of p)assert.ok(Math.abs(pyramidDot(normal,q)-offset)<tolerance);for(const q of g.vertices)assert.ok(pyramidDot(normal,q)<=offset+tolerance);
 for(let i=0;i<5;i++){const a=pyramidSub(p[(i+1)%5]!,p[i]!),b=pyramidSub(p[(i+4)%5]!,p[i]!);assert.ok(Math.abs(Math.hypot(...a)-e)<tolerance);assert.ok(Math.abs(Math.acos(pyramidDot(a,b)/(e*e))*180/Math.PI-108)<1e-10);assert.ok(pyramidDot(pyramidCross(a,pyramidSub(p[(i+2)%5]!,p[(i+1)%5]!)),normal)>0);}}
 for(const edge of g.physicalEdges)assert.equal(g.physicalFaces.filter(f=>edge.every(v=>f.vertices.includes(v))).length,2);
 assert.ok(Math.abs(g.surfaceAreaMeters2/((3*Math.sqrt(25+10*Math.sqrt(5)))*e*e)-1)<1e-13);assert.ok(Math.abs(g.volumeMeters3/((15+7*Math.sqrt(5))*e**3/4)-1)<1e-13);
 for(let i=0;i<20;i++)for(let k=0;k<3;k++){const b=g.physicalVertexBounds(i)[k]!;assert.ok(g.vertices[i]![k]!>=b[0]&&g.vertices[i]![k]!<=b[1]);}
 }
});
