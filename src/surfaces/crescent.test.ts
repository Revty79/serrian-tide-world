import {test} from 'node:test';import assert from 'node:assert/strict';
import {createCrescentGeometry,type CrescentConfiguration} from './crescent.ts';
import {CRESCENT_DEFAULT_DIMENSIONS,createCrescentTerrain} from '../terrain/crescent.ts';
import {pyramidCross,pyramidDot,pyramidSub} from './pyramid.ts';
const base:CrescentConfiguration={...CRESCENT_DEFAULT_DIMENSIONS,identity:{worldId:'crescent',surfaceId:'boundary'},provider:'physical-prismatic-crescent',version:1,role:'exterior'};
const close=(a:number,b:number,t=1e-10)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const cases=[base,{...base,bodyWidthMeters:250000,thicknessMeters:100000,openingDegrees:160,curvature:.8},{...base,bodyWidthMeters:600000,thicknessMeters:300000,openingDegrees:60,curvature:1.25},{...base,tipShape:'full' as const}];
for(const [i,configuration]of cases.entries())test(`Crescent physical profile ${i}: closed manifold, positive facets, outward normals, real concavity and both tapered terminals`,()=>{
 const g=createCrescentGeometry(configuration),M=g.outline.length;
 assert.equal(g.vertices.length,128);assert.equal(g.faces.length,252);assert.equal(g.edges.length,378);assert.equal(g.vertices.length-g.edges.length+g.faces.length,2);
 for(const edge of g.edges){const incident=g.faces.filter(f=>edge.every(i=>g.vertexIds(f).includes(i)));assert.equal(incident.length,2);const directions=incident.map(f=>{const ids=g.vertexIds(f);return ids.some((v,i)=>v===edge[0]&&ids[(i+1)%3]===edge[1]);});assert.notEqual(directions[0],directions[1]);}
 for(const f of g.faces){const frame=g.frame(f);assert.ok(Math.hypot(...pyramidCross(frame.u,frame.v))>0);close(Math.hypot(...frame.normal),1);if(f.startsWith('upper-'))close(frame.normal[1],1);if(f.startsWith('lower-'))close(frame.normal[1],-1);if(f.startsWith('wall-')){const j=Number(g.physicalFaceId(f).slice(5)),a=g.outline[j]!,b=g.outline[(j+1)%M]!;assert.ok(frame.normal[0]*(b[1]-a[1])+frame.normal[2]*(a[0]-b[0])>0);}}
 assert.ok(g.planarAreaMeters2>0);close(g.surfaceAreaMeters2,2*g.planarAreaMeters2+g.perimeterMeters*configuration.thicknessMeters);close(g.volumeMeters3,g.planarAreaMeters2*configuration.thicknessMeters);
 assert.equal(g.outer[0],g.inner[0]);assert.equal(g.outer[32],g.inner[32]);assert.notEqual(g.outer[16],g.inner[16]);
 for(let k=1;k<=16;k++){const width=(i:number)=>Math.hypot(...g.outline[g.outer[i]!]!.map((v,j)=>v-g.outline[g.inner[i]!]![j]!));assert.ok(width(k)>width(k-1));close(width(k),width(32-k));}
 const turn=(a:readonly number[],b:readonly number[],c:readonly number[])=>(b[0]!-a[0]!)*(c[1]!-b[1]!)-(b[1]!-a[1]!)*(c[0]!-b[0]!);
 for(let k=1;k<32;k++){assert.ok(turn(g.outline[g.outer[k-1]!]!,g.outline[g.outer[k]!]!,g.outline[g.outer[k+1]!]!)>0,'outer arc must remain convex');assert.ok(turn(g.outline[g.inner[k-1]!]!,g.outline[g.inner[k]!]!,g.outline[g.inner[k+1]!]!)>0,'inner arc is concave toward the material');}
 // The boundary outline is simple, including near tips; nonneighbor segments
 // never cross. This tests the actual serialized-generation vertices.
 for(let a=0;a<M;a++)for(let b=a+1;b<M;b++){if(b===a+1||a===0&&b===M-1)continue;const p=g.outline[a]!,q=g.outline[(a+1)%M]!,r=g.outline[b]!,s=g.outline[(b+1)%M]!;assert.ok(!(turn(p,q,r)*turn(p,q,s)<0&&turn(r,s,p)*turn(r,s,q)<0));}
});
test('Crescent dimensions reject nonfinite, unsupported and mixed identities without clamping',()=>{
 for(const change of[{worldSizeMeters:99999},{curvature:.79},{openingDegrees:161},{bodyWidthMeters:1},{thicknessMeters:0},{tipShape:'unknown'},{worldSizeMeters:Infinity},{provider:'physical-torus'}])assert.throws(()=>createCrescentGeometry({...base,...change} as CrescentConfiguration),RangeError);
 assert.throws(()=>createCrescentTerrain({terrainId:'crescent',geometry:base,detail:128}),RangeError);
});
test('Crescent generation is deterministic; affine chart metrics equal physical tangent lengths',()=>{
 const a=createCrescentGeometry(base),b=createCrescentGeometry(JSON.parse(JSON.stringify(base)));assert.deepEqual(a.vertices,b.vertices);assert.deepEqual(a.metadata,b.metadata);
 for(const patchId of a.faces){const p={...a.identity,patchId,u:.2,v:.3},t={du:.001,dv:-.002},q={...p,u:p.u+t.du,v:p.v+t.dv},delta=pyramidSub(a.referencePosition(q),a.referencePosition(p));close(a.metricSquared(p,t),pyramidDot(delta,delta),1e-9);}
});
test('Crescent immutable geometry is reused while private terrain words and keys remain independent',()=>{
 const a=createCrescentTerrain({terrainId:'first-heights',geometry:base,detail:128}),b=createCrescentTerrain({terrainId:'second-heights',geometry:structuredClone(base),detail:128});assert.equal(a.geometry,b.geometry);a.write(a.keyAt(100),500);assert.equal(b.read(b.keyAt(100)),-100);assert.equal(a.revision,1);assert.equal(b.revision,0);assert.throws(()=>b.read(a.keyAt(100)),/Foreign/);const changed=createCrescentGeometry({...base,openingDegrees:120});assert.notEqual(changed,a.geometry);assert.equal(a.geometry.metadata.openingDegrees,90);
});
for(const detail of[128,256]as const)test(`Crescent N${detail}: bounded canonical authority, welded aliases, independent caps and exact Float32 snapshot`,()=>{
 const t=createCrescentTerrain({terrainId:'heights',geometry:base,detail}),g=t.geometry;assert.equal(t.sampleCount,126*(detail/4)**2+2);assert.equal(t.elevationByteLength,t.sampleCount*4);assert.equal(t.minElevation,-25000);
 for(const edge of g.edges){const faces=g.faces.filter(f=>edge.every(v=>g.vertexIds(f).includes(v))),keys=faces.map(f=>{const p=g.fromWeights(f,new Map([[edge[0],.5],[edge[1],.5]]))!;return t.resolve({...p,row:Math.round(p.v*t.subdivisions),column:Math.round(p.u*t.subdivisions)});});assert.equal(keys[0]!.index,keys[1]!.index);assert.ok(t.aliases(keys[0]!).length>=2);}
 const p=(patchId:string)=>t.resolve({...g.identity,patchId,row:3,column:4}),upper=p('upper-16:0'),lower=p('lower-16:0');t.write(upper,2000);assert.equal(t.read(lower),-100);t.write(lower,-0);const saved=t.copyElevations(),reopened=createCrescentTerrain({terrainId:'heights',geometry:base,detail,initialValues:saved});assert.deepEqual(new Uint32Array(reopened.copyElevations().buffer),new Uint32Array(saved.buffer));assert.ok(Object.is(reopened.read(lower),-0));saved.fill(0);assert.equal(t.read(upper),2000);
});
