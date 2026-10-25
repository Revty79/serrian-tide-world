import test from 'node:test';import assert from 'node:assert/strict';
import {createRibbonGeometry,ribbonDimensions,ribbonFrame,ribbonUnexpectedContact,RIBBON_DEFAULT_DIMENSIONS,RIBBON_PRESETS,type RibbonConfiguration} from './ribbon.ts';
import {pyramidDot,pyramidCross,pyramidSub} from './pyramid.ts';
import {ribbonDistance,ribbonPath} from './ribbon-distance.ts';
const base:RibbonConfiguration={...RIBBON_DEFAULT_DIMENSIONS,provider:'physical-faceted-ribbon',version:1,role:'exterior',identity:{worldId:'ribbon',surfaceId:'boundary'}};
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
for(const[name,patch]of Object.entries(RIBBON_PRESETS))for(const twistDirection of['right','left'] as const)test(`${name} ${twistDirection}: actual closed twisted material, outward frames and stable six regions`,()=>{
 const g=createRibbonGeometry({...base,...patch,twistDirection}),d=g.metadata;assert.equal(g.vertices.length,260);assert.equal(g.faces.length,516);assert.equal(g.edges.length,774);assert.equal(g.vertices.length-g.edges.length+g.faces.length,2);assert.ok(g.volumeMeters3>0);assert.equal(new Set(g.faces.map(f=>g.region(f))).size,6);
 for(let i=0;i<=64;i++){const f=g.frames[i]!;close(Math.hypot(...f.T),1);close(Math.hypot(...f.N),1);close(Math.hypot(...f.B),1);close(pyramidDot(f.T,f.N),0);close(pyramidDot(f.T,f.B),0);close(pyramidDot(f.N,f.B),0);close(pyramidDot(pyramidCross(f.N,f.B),f.T),1);close(Math.hypot(...pyramidSub(g.vertices[i*4]!,g.vertices[i*4+1]!)),d.widthMeters);close(Math.hypot(...pyramidSub(g.vertices[i*4+1]!,g.vertices[i*4+2]!)),d.thicknessMeters);if(i)assert.ok(pyramidDot(g.frames[i-1]!.N,f.N)>.95);}
 for(const face of g.faces){const f=g.frame(face),p={...g.identity,patchId:face,u:.2,v:.3},delta={du:1e-4,dv:-2e-4},t=g.tangentVector(p,delta),actual=pyramidSub(g.referencePosition({...p,u:p.u+delta.du,v:p.v+delta.dv}),g.referencePosition(p));close(Math.hypot(...t),Math.hypot(...actual));close(Math.hypot(...f.normal),1);}
 for(const edge of g.edges){const incident=g.faces.filter(f=>edge.every(v=>g.vertexIds(f).includes(v)));assert.equal(incident.length,2);const orientation=incident.map(f=>g.vertexIds(f).some((v,k,a)=>v===edge[0]&&a[(k+1)%3]===edge[1]));assert.notEqual(orientation[0],orientation[1]);}
});
test('Ribbon configuration is immutable, deterministic, scale-exact and rejects unqualified twist/bend/material',()=>{
 const a=createRibbonGeometry(base),b=createRibbonGeometry({...base,worldSizeMeters:base.worldSizeMeters*2});for(let i=0;i<a.vertices.length;i++)a.vertices[i]!.forEach((x,k)=>close(b.vertices[i]![k]!,x*2));
 assert.deepEqual(createRibbonGeometry(structuredClone(base)).vertices,a.vertices);assert.throws(()=>{(a.frames[0]!.N as unknown as number[])[0]=123;});assert.throws(()=>{(a.physicalFaces[0]!.vertices as number[])[0]=123;});
 for(const p of[{worldSizeMeters:0},{lengthRatio:0},{widthRatio:NaN},{thicknessRatio:0},{thicknessRatio:.3,twistTurns:2},{twistTurns:3},{bendDegrees:100},{lengthRatio:.5,widthRatio:.35,thicknessRatio:.8,bendDegrees:90},{twistDirection:'random'},{twistDistribution:'keyframes'},{provider:'physical-prismatic-spiral'}])assert.throws(()=>createRibbonGeometry({...base,...p} as RibbonConfiguration));
 const straight=createRibbonGeometry({...base,twistTurns:0}),d=straight.metadata;close(straight.volumeMeters3,d.lengthMeters*d.widthMeters*d.thicknessMeters);close(pyramidDot(ribbonFrame(ribbonDimensions(base),0).N,ribbonFrame(ribbonDimensions(base),1).N),-1);
});
test('Untwisted coplanar routes attain the ambient lower bound across numerical station/diagonal cuts',()=>{
 const g=createRibbonGeometry({...base,twistTurns:0});let n=0;
 for(const face of g.faces.filter(f=>f.startsWith('first-face-')).filter((_,i)=>i%13===0)){
  const A=g.vertexIds(face);for(const next of g.faces.filter(f=>f.startsWith('first-face-')&&g.vertexIds(f).some(i=>A.includes(i)))){const B=g.vertexIds(next),edge=A.filter(i=>B.includes(i));if(edge.length!==2||face===next)continue;
   const p=g.fromWeights(face,new Map(A.map(i=>[i,edge.includes(i)?.495:.01])))!,q=g.fromWeights(next,new Map(B.map(i=>[i,edge.includes(i)?.495:.01])))!,expected=Math.hypot(...pyramidSub(g.referencePosition(p),g.referencePosition(q))),distance=ribbonDistance(g,p,q,{absoluteToleranceMeters:.001});assert.ok(distance.lowerBoundMeters<=expected&&distance.upperBoundMeters>=expected);assert.ok(distance.upperBoundMeters-distance.lowerBoundMeters<.001);const path=ribbonPath(g,p,q,{version:1,absoluteToleranceMeters:.001});close(path.lengthMeters,expected);close(Math.hypot(...pyramidSub(path.atDistance(path.lengthMeters).referencePosition,g.referencePosition(q))),0);n++;}
 }assert.ok(n>10);
});
test('Twisted crease routes have feasible continuous witnesses and bounded certificates',()=>{
 const g=createRibbonGeometry(base);let n=0;
 for(const face of[g.faces[0]!,g.faces[1]!,g.faces[100]!,g.faces.at(-1)!])for(const next of g.faces){const A=g.vertexIds(face),B=g.vertexIds(next),edge=A.filter(i=>B.includes(i));if(edge.length!==2||face===next)continue;const p=g.fromWeights(face,new Map(A.map(i=>[i,edge.includes(i)?.495:.01])))!,q=g.fromWeights(next,new Map(B.map(i=>[i,edge.includes(i)?.495:.01])))!,d=ribbonDistance(g,p,q,{absoluteToleranceMeters:.01}),path=ribbonPath(g,p,q,{version:1,absoluteToleranceMeters:.01});assert.ok(d.upperBoundMeters-d.lowerBoundMeters<.01);assert.ok(d.lowerBoundMeters<=path.lengthMeters&&d.upperBoundMeters>=path.lengthMeters);for(let i=0;i<=10;i++)assert.ok(path.atDistance(path.lengthMeters*i/10).referencePosition.every(Number.isFinite));n++;}assert.equal(n,12);
});
test('Endpoint chart aliases retain the shorter real corner route without zero-length portal artifacts',()=>{
 for(const patch of[RIBBON_PRESETS.Wide,RIBBON_PRESETS.Thick]){const g=createRibbonGeometry({...base,...patch}),a={...g.identity,patchId:'second-face-12-0:0',u:0,v:0},b={...g.identity,patchId:'left-side-10-0:0',u:2/3,v:1-2/3},reach=g.minimumDimensionMeters*.24,d=ribbonDistance(g,a,b,{absoluteToleranceMeters:.001,reachMeters:reach});assert.ok(d.upperBoundMeters-d.lowerBoundMeters<.001);const path=ribbonPath(g,a,b,{version:1,absoluteToleranceMeters:.001,reachMeters:reach});assert.ok(d.lowerBoundMeters<=path.lengthMeters&&d.upperBoundMeters>=path.lengthMeters);}
});
test('Adjacent triangle validation permits only the real shared point or edge',()=>{
 const A=[[0,0,0],[2,0,0],[0,2,0]] as const;assert.equal(ribbonUnexpectedContact(A,[[0,0,0],[0,0,2],[-2,0,0]],[[0,0,0]],1e-9),false);assert.equal(ribbonUnexpectedContact(A,[[0,0,0],[1,1,-1],[1,1,1]],[[0,0,0]],1e-9),true);assert.equal(ribbonUnexpectedContact(A,[[0,0,0],[2,0,0],[2,-2,0]],[[0,0,0],[2,0,0]],1e-9),false);assert.equal(ribbonUnexpectedContact(A,[[0,0,0],[2,0,0],[1,1,0]],[[0,0,0],[2,0,0]],1e-9),true);
});
