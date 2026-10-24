import {test} from 'node:test';import assert from 'node:assert/strict';
import {createSpiralGeometry,spiralDimensions,SPIRAL_DEFAULT_DIMENSIONS,SPIRAL_SEGMENTS,type SpiralConfiguration} from './spiral.ts';
import {createSpiralTerrain} from '../terrain/spiral.ts';
import {spiralCapPosition,spiralWallPosition,spiralDistance,spiralPlanarVisible,spiralProjectionLowerBound} from './spiral-distance.ts';
import {pyramidCross,pyramidDot,pyramidSub} from './pyramid.ts';
import {polyhedronPositionBounds} from './polyhedron-physical-bounds.ts';
const base:SpiralConfiguration={...SPIRAL_DEFAULT_DIMENSIONS,provider:'physical-prismatic-spiral',version:1,role:'exterior',identity:{worldId:'spiral',surfaceId:'exterior'}};
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
export const profiles=[base,{...base,turns:1.5,turnSpacingRatio:.28,bodyWidthRatio:.14,thicknessRatio:.12},{...base,turns:3,innerRadiusRatio:.10,turnSpacingRatio:.12,bodyWidthRatio:.10,thicknessRatio:.08},{...base,turns:2.5,turnSpacingRatio:.20,bodyWidthRatio:.07,thicknessRatio:.021},{...base,winding:'clockwise' as const},{...base,worldSizeMeters:100000},{...base,worldSizeMeters:1e9}];
const stationPoint=(g:ReturnType<typeof createSpiralGeometry>,k:number,cap:1|-1=1)=>{const A=g.outline[g.outer[k]!]!,B=g.outline[g.inner[k]!]!;return spiralCapPosition(g,[(A[0]+B[0])/2,(A[1]+B[1])/2],cap);};
for(const [i,configuration]of profiles.entries())test(`Spiral ${i}: closed oriented winding solid, normal stations, actual metrics and independent scale`,()=>{
 const g=createSpiralGeometry(configuration),d=g.metadata,N=SPIRAL_SEGMENTS;
 assert.equal(g.vertices.length,260);assert.equal(g.faces.length,516);assert.equal(g.physicalFaces.length,258);assert.equal(g.edges.length,774);assert.equal(g.vertices.length-g.edges.length+g.faces.length,2);
 assert.ok(g.volumeMeters3>0);assert.ok(g.minimumTurnGapMeters>0);assert.notEqual(g.outer[0],g.outer[N]);
 close(g.surfaceAreaMeters2,2*g.planarAreaMeters2+g.perimeterMeters*d.thicknessMeters);
 for(let k=0;k<=N;k++){const C=g.centers[k]!,A=g.outline[g.outer[k]!]!,B=g.outline[g.inner[k]!]!,theta=g.angles[k]!,r=d.innerRadiusMeters+d.radialGrowthMeters*theta,sign=d.winding==='clockwise'?-1:1;
  close(Math.hypot(...C),r);close(Math.hypot(A[0]-B[0],A[1]-B[1]),d.bodyWidthMeters);
  // Cross-section really is normal to the generating tangent, not radial.
  const tx=d.radialGrowthMeters*Math.cos(theta)-r*Math.sin(theta),tz=sign*(d.radialGrowthMeters*Math.sin(theta)+r*Math.cos(theta));close(((A[0]-B[0])*tx+(A[1]-B[1])*tz)/(d.bodyWidthMeters*Math.hypot(tx,tz)),0);
 }
 assert.ok(g.centerlineLengthMeters<d.generatingCenterlineLengthMeters);assert.ok(g.centerlineLengthMeters>.99*d.generatingCenterlineLengthMeters);
 // Independent Simpson integration of the generating arc length, not r*dθ.
 let integral=0;const steps=2048,h=d.angularRangeRadians/steps;for(let j=0;j<=steps;j++)integral+=(j===0||j===steps?1:j%2?4:2)*Math.hypot(d.innerRadiusMeters+d.radialGrowthMeters*j*h,d.radialGrowthMeters);close(integral*h/3,d.generatingCenterlineLengthMeters);
 for(const e of g.edges){const incident=g.faces.filter(f=>e.every(v=>g.vertexIds(f).includes(v)));assert.equal(incident.length,2);assert.notEqual(...incident.map(f=>g.vertexIds(f).some((v,k,a)=>v===e[0]&&a[(k+1)%3]===e[1]))as[boolean,boolean]);}
 for(const face of g.faces){const f=g.frame(face);close(Math.hypot(...f.normal),1);assert.ok(Math.hypot(...pyramidCross(f.u,f.v))>0);if(face.startsWith('upper-'))close(f.normal[1],1);if(face.startsWith('lower-'))close(f.normal[1],-1);const p={...g.identity,patchId:face,u:.2,v:.3},delta={du:.001,dv:-.002};close(g.metricSquared(p,delta),pyramidDot(pyramidSub(g.referencePosition({...p,u:p.u+delta.du,v:p.v+delta.dv}),g.referencePosition(p)),pyramidSub(g.referencePosition({...p,u:p.u+delta.du,v:p.v+delta.dv}),g.referencePosition(p))));}
 assert.equal(new Set(g.faces.map(f=>g.region(f))).size,6);
});
test('Spiral reconstruction is deterministic; invalid dimensions and real overlaps fail before terrain allocation',()=>{
 assert.deepEqual(createSpiralGeometry(structuredClone(base)).vertices,createSpiralGeometry(base).vertices);
 for(const change of[{worldSizeMeters:1},{turns:0},{turns:4},{turns:NaN},{innerRadiusRatio:0},{turnSpacingRatio:0},{bodyWidthRatio:0},{bodyWidthRatio:.16,turnSpacingRatio:.12},{thicknessRatio:0},{thicknessRatio:.2},{endShape:'open'},{winding:'random'},{provider:'physical-prismatic-arc'}])assert.throws(()=>createSpiralGeometry({...base,...change}as SpiralConfiguration));
 const a=createSpiralGeometry(base),b=createSpiralGeometry({...base,worldSizeMeters:4e6});a.vertices.forEach((v,i)=>v.forEach((x,k)=>close(b.vertices[i]![k]!,2*x)));
 assert.throws(()=>createSpiralTerrain({terrainId:'spiral',geometry:base,detail:128}));assert.throws(()=>createSpiralTerrain({terrainId:'t',geometry:base,detail:64 as 128}));
 assert.equal(spiralDimensions(base).segments,64);
});
for(const detail of[128,256]as const)test(`Spiral N${detail}: welded ownership at every edge, distinct turns/ends/banks and exact private words`,()=>{
 const t=createSpiralTerrain({terrainId:'heights',geometry:base,detail}),n=t.subdivisions;
 assert.equal(t.sampleCount,258*n*n+2);assert.equal(t.elevationByteLength,t.sampleCount*4);
 for(const e of t.geometry.edges){const ids=t.geometry.faces.filter(f=>e.every(v=>t.geometry.vertexIds(f).includes(v))).map(face=>{const p=t.geometry.fromWeights(face,new Map([[e[0],.5],[e[1],.5]]))!;return t.resolve({...p,column:Math.round(p.u*n),row:Math.round(p.v*n)}).index;});assert.equal(ids[0],ids[1]);}
 const indices=['upper-0:0','upper-32:0','upper-63:0','lower-0:0','wall-129:0','wall-64:0'].map(patchId=>t.resolve({...t.geometry.identity,patchId,column:5,row:7}).index);assert.equal(new Set(indices).size,6);
 t.write(t.keyAt(indices[0]!),234.567);t.write(t.keyAt(0),-0);indices.slice(1).forEach(i=>assert.equal(t.read(t.keyAt(i)),-100));
 const snapshot=t.copyElevations(),restored=createSpiralTerrain({terrainId:'heights',geometry:base,detail,initialValues:snapshot});assert.deepEqual(new Uint32Array(snapshot.buffer),new Uint32Array(restored.copyElevations().buffer));snapshot.fill(0);assert.notEqual(t.read(t.keyAt(indices[0]!)),0);
});
test('Global upper/lower metric follows winding material, not adjacent-turn chords; long connected distance remains available',()=>{
 const g=createSpiralGeometry({...base,turns:2,turnSpacingRatio:.12,bodyWidthRatio:.10,thicknessRatio:.08});
 const a=stationPoint(g,12),b=stationPoint(g,44),A=g.referencePosition(a),B=g.referencePosition(b),chord=Math.hypot(...pyramidSub(A,B));
 assert.equal(spiralPlanarVisible(g,[A[0],A[2]],[B[0],B[2]]),false);
 const d=spiralDistance(g,a,b),lower=spiralProjectionLowerBound(g,a,b,chord*2);assert.ok(lower>chord*2);assert.ok(d.lowerBoundMeters>chord*4);assert.ok(d.upperBoundMeters<g.centerlineLengthMeters);assert.ok(d.upperBoundMeters-d.lowerBoundMeters<.01);
 const opposite=stationPoint(g,12,-1);assert.throws(()=>spiralDistance(g,a,opposite),/certified local/);
 // Exact same-wall and cap-wall hinge distances, with actual physical units.
 const p=spiralWallPosition(g,8,.4,0),q=spiralWallPosition(g,8,.5,0),expected=Math.hypot(...pyramidSub(g.referencePosition(p),g.referencePosition(q))),wall=spiralDistance(g,p,q);assert.ok(wall.lowerBoundMeters<=expected&&wall.upperBoundMeters>=expected);
 // The Lipschitz bound never exceeds feasible full-body centerline routes.
 for(let k=0;k<64;k+=4){const x=stationPoint(g,k),y=stationPoint(g,k+4),d=spiralDistance(g,x,y);assert.ok(g.longitudinalLowerBound(x,y)<=d.upperBoundMeters);const bounds=polyhedronPositionBounds(g,x);for(let edge=0;edge<g.outline.length;edge+=7)assert.ok(Number.isFinite(g.boundaryDistanceLowerBound(bounds,edge)));}
});
