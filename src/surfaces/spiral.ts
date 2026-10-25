import {assertIdentity,type SurfaceIdentity,type SurfacePosition} from './contracts.ts';
import {polygonPrismGeometry,type PrismWallRegion} from './polygon-prism.ts';
import type {PolyhedronPhysicalBounds,PolyhedronVector} from './polyhedron-contract.ts';
import * as I from './pyramid-interval.ts';

/** These straight facets ARE the reference solid; no hidden smooth sweep. */
export const SPIRAL_SEGMENTS=64;
export interface SpiralDimensions {
 readonly worldSizeMeters:number;readonly turns:number;readonly innerRadiusRatio:number;
 readonly turnSpacingRatio:number;readonly bodyWidthRatio:number;readonly thicknessRatio:number;
 readonly winding:'counterclockwise'|'clockwise';readonly endShape:'flat';
}
export interface SpiralConfiguration extends SpiralDimensions {
 readonly provider:'physical-prismatic-spiral';readonly version:1;
 readonly identity:SurfaceIdentity;readonly role:'exterior';
}
export const SPIRAL_DEFAULT_DIMENSIONS:SpiralDimensions=Object.freeze({worldSizeMeters:2000000,turns:2,innerRadiusRatio:.16,turnSpacingRatio:.18,bodyWidthRatio:.12,thicknessRatio:.10,winding:'counterclockwise',endShape:'flat'});
export function spiralDimensions(d:SpiralDimensions){
 const {worldSizeMeters:S,turns,innerRadiusRatio:a,turnSpacingRatio:p,bodyWidthRatio:w,thicknessRatio:h,winding,endShape}=d;
 if(![S,turns,a,p,w,h].every(Number.isFinite)||S<100000||S>1e9||turns<1.5||turns>3||a<.10||a>.25||p<.12||p>.28||w<.07||w>.16||w>=.9*p||h<.3*w||h>.9*w||!['clockwise','counterclockwise'].includes(winding)||endShape!=='flat')throw RangeError('Spiral requires size 100,000–1,000,000,000 m, 1.5–3 turns, inner radius 10–25%, spacing 12–28%, width 7–16% of size and thickness 30–90% of width. Width must be below 90% of turn spacing.');
 const innerRadiusMeters=S*a,turnSpacingMeters=S*p,bodyWidthMeters=S*w,thicknessMeters=S*h,angularRangeRadians=2*Math.PI*turns,radialGrowthMeters=turnSpacingMeters/(2*Math.PI),outerRadiusMeters=innerRadiusMeters+turnSpacingMeters*turns;
 const primitive=(r:number)=>.5*(r*Math.hypot(r,radialGrowthMeters)+radialGrowthMeters**2*Math.asinh(r/radialGrowthMeters));
 const generatingCenterlineLengthMeters=(primitive(outerRadiusMeters)-primitive(innerRadiusMeters))/radialGrowthMeters;
 const maximumCurvature=(innerRadiusMeters**2+2*radialGrowthMeters**2)/(innerRadiusMeters**2+radialGrowthMeters**2)**1.5;
 if(bodyWidthMeters*maximumCurvature/2>=.75)throw RangeError('Spiral width folds the inner generating sweep.');
 return Object.freeze({worldSizeMeters:S,turns,innerRadiusRatio:a,turnSpacingRatio:p,bodyWidthRatio:w,thicknessRatio:h,winding,endShape,centerlineModel:'archimedean-normal-stations' as const,crossSection:'rectangular' as const,segments:SPIRAL_SEGMENTS,angularStartRadians:0,angularRangeRadians,innerRadiusMeters,outerRadiusMeters,turnSpacingMeters,radialGrowthMeters,bodyWidthMeters,thicknessMeters,generatingCenterlineLengthMeters});
}
type P=readonly[number,number];
const cross=(a:P,b:P,c:P)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function pointSegment(p:P,a:P,b:P){const x=b[0]-a[0],z=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*z)/(x*x+z*z)));return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*z);}
function segmentDistance(a:P,b:P,c:P,d:P){if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 0;return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));}
function buildSpiralGeometry(input:SpiralConfiguration){
 assertIdentity(input.identity);if(input.provider!=='physical-prismatic-spiral'||input.version!==1||input.role!=='exterior')throw RangeError('Unsupported Spiral geometry.');
 const d=spiralDimensions(input),N=SPIRAL_SEGMENTS,sign=d.winding==='clockwise'?-1:1,identity=Object.freeze({...input.identity}),metadata=Object.freeze({provider:input.provider,version:1 as const,identity,role:input.role,...d});
 const angles=Object.freeze(Array.from({length:N+1},(_,i)=>d.angularRangeRadians*i/N));
 const centers=angles.map(theta=>{const r=d.innerRadiusMeters+d.radialGrowthMeters*theta;return[r*Math.cos(theta),sign*r*Math.sin(theta)]as P;});
 // True tangent-normal stations, not radial offsets. Linear interpolation of
 // these stations defines each actual convex physical strip and its metric.
 const O:P[]=[],J:P[]=[];
 for(const theta of angles){const r=d.innerRadiusMeters+d.radialGrowthMeters*theta,c=Math.cos(theta),s=Math.sin(theta),norm=Math.hypot(r,d.radialGrowthMeters),nx=(r*c+d.radialGrowthMeters*s)/norm,nz=sign*(r*s-d.radialGrowthMeters*c)/norm,center:P=[r*c,sign*r*s];O.push([center[0]+d.bodyWidthMeters/2*nx,center[1]+d.bodyWidthMeters/2*nz]);J.push([center[0]-d.bodyWidthMeters/2*nx,center[1]-d.bodyWidthMeters/2*nz]);}
 // Clockwise reverses planar orientation, so swap chart banks while retaining
 // inner -> outer longitudinal station order and real lateral region labels.
 const A=sign===1?O:J,B=sign===1?J:O,outline=[...A,...B.toReversed()],outer=A.map((_,i)=>i),inner=B.map((_,i)=>2*N+1-i),M=outline.length;
 const wallRegions=outline.map((_,i):PrismWallRegion=>i<N?(sign===1?'outer':'inner'):i===N?'second-end':i===M-1?'first-end':sign===1?'inner':'outer');
 const tolerance=d.worldSizeMeters*1e-9;
 // Check the constructed binary64 outline itself, not spacing parameters alone.
 // A simple outline plus positive convex strip cells certifies the extrusion.
 let minimumTurnGapMeters=Infinity;
 for(let i=0;i<M;i++)for(let j=i+1;j<M;j++){
  if(j===i+1||i===0&&j===M-1)continue;
  const distance=segmentDistance(outline[i]!,outline[(i+1)%M]!,outline[j]!,outline[(j+1)%M]!);
  if(distance<=tolerance)throw RangeError('Spiral material outline touches or intersects itself. Increase turn spacing or reduce body width.');
  const station=(k:number)=>k<=N?k:2*N+1-k;
  if(Math.abs(station(i)-station(j))>N/d.turns*.6)minimumTurnGapMeters=Math.min(minimumTurnGapMeters,distance);
 }
 for(let i=0;i<N;i++){const q=[A[i]!,B[i]!,B[i+1]!,A[i+1]!];for(let k=0;k<4;k++)if(cross(q[k]!,q[(k+1)%4]!,q[(k+2)%4]!)>=-tolerance*tolerance)throw RangeError('Spiral station creates a folded or degenerate material strip.');}
 const g=polygonPrismGeometry({metadata,outline,outer,inner,wallRegions,scaleMeters:d.worldSizeMeters/2});
 const station=(vertex:number)=>{const k=vertex%M;return k<=N?k:2*N+1-k;};
 // A continuous piecewise affine station scalar on the COMPLETE exterior.
 // Its outward-rounded maximum gradient is a global Lipschitz certificate.
 // It can reject a distant winding station without confusing spatial proximity
 // with intrinsic distance. It never supplies an influential brush distance.
 const capModels=g.faces.filter(f=>f.startsWith('upper-')).map(face=>{
  const ids=g.vertexIds(face),p=ids.map(i=>g.vertices[i]!),x=I.subtract(I.exact(p[1]![0]),I.exact(p[0]![0])),z=I.subtract(I.exact(p[1]![2]),I.exact(p[0]![2])),u=I.subtract(I.exact(p[2]![0]),I.exact(p[0]![0])),v=I.subtract(I.exact(p[2]![2]),I.exact(p[0]![2])),det=I.subtract(I.multiply(x,v),I.multiply(z,u)),ds=I.exact(station(ids[1]!)-station(ids[0]!)),dt=I.exact(station(ids[2]!)-station(ids[0]!)),gx=I.divide(I.subtract(I.multiply(ds,v),I.multiply(dt,z)),det),gz=I.divide(I.subtract(I.multiply(x,dt),I.multiply(u,ds)),det);
  return{p:p[0]!,base:station(ids[0]!),gx,gz,gradient:I.root(I.add(I.square(gx),I.square(gz)))[1],minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),minZ:Math.min(...p.map(v=>v[2])),maxZ:Math.max(...p.map(v=>v[2]))};
 });
 const stationLipschitz=I.adjacentFloat(Math.max(...capModels.map(c=>c.gradient)),true);
 let lastBounds:PolyhedronPhysicalBounds|undefined,lastStation:I.Interval=[0,N];
 const boundsStation=(p:PolyhedronPhysicalBounds):I.Interval=>{if(lastBounds&&[0,2].every(k=>lastBounds![k]![0]===p[k]![0]&&lastBounds![k]![1]===p[k]![1]))return lastStation;let lo=Infinity,hi=-Infinity;for(const c of capModels){if(p[0][1]<c.minX-tolerance||p[0][0]>c.maxX+tolerance||p[2][1]<c.minZ-tolerance||p[2][0]>c.maxZ+tolerance)continue;const value=I.add(I.exact(c.base),I.add(I.multiply(c.gx,I.subtract(p[0],I.exact(c.p[0]))),I.multiply(c.gz,I.subtract(p[2],I.exact(c.p[2])))));lo=Math.min(lo,value[0]);hi=Math.max(hi,value[1]);}lastBounds=p;lastStation=lo<=hi?[Math.max(0,lo),Math.min(N,hi)]:[0,N];return lastStation;};
 const difference=(a:I.Interval,b:I.Interval)=>Math.max(0,I.divide(I.subtract(a,b),I.exact(stationLipschitz))[0],I.divide(I.subtract(b,a),I.exact(stationLipschitz))[0]);
 const positionStation=(p:SurfacePosition)=>{const q=g.normalize(p),ids=g.vertexIds(q.patchId);return I.add(I.exact(station(ids[0]!)),I.add(I.multiply(I.exact(q.u),I.exact(station(ids[1]!)-station(ids[0]!))),I.multiply(I.exact(q.v),I.exact(station(ids[2]!)-station(ids[0]!)))));};
 // Immutable edge/chart incidence avoids rediscovering all vertex aliases
 // for every derived gutter texel. Distances, tie order and UVs are unchanged.
 const polygonEdges=new Map(g.physicalFaces.map(p=>{const charts=g.faces.filter(f=>g.physicalFaceId(f)===p.id);return[p.id,p.vertices.map((a,i)=>{const b=p.vertices[(i+1)%p.vertices.length]!,A=g.vertices[a]!,B=g.vertices[b]!,D=B.map((x,k)=>x-A[k]!),face=charts.find(f=>g.vertexIds(f).includes(a)&&g.vertexIds(f).includes(b))!,ids=g.vertexIds(face),first=g.fromWeights(charts.find(f=>g.vertexIds(f).includes(a))!,new Map([[a,1]]))!,second=g.fromWeights(charts.find(f=>g.vertexIds(f).includes(b))!,new Map([[b,1]]))!;return{a,b,A,D,length:D.reduce((s,x)=>s+x*x,0),face,ids,first,second};})]as const;}));
 const atlasBoundaryPosition=(chart:string,point:PolyhedronVector)=>{const edges=polygonEdges.get(g.physicalFaceId(chart))!;let best=Infinity,selected:typeof edges[number]|undefined,fraction=0;for(const e of edges){const f=Math.max(0,Math.min(1,e.D.reduce((s,x,k)=>s+x*(point[k]!-e.A[k]!),0)/e.length)),distance=e.A.reduce((s,x,k)=>s+(x+f*e.D[k]!-point[k]!)**2,0);if(distance<best){best=distance;selected=e;fraction=f;}}if(!selected)throw Error('Spiral physical atlas boundary is missing.');if(fraction===0)return g.normalize(selected.first);if(fraction===1)return g.normalize(selected.second);const e=selected;return g.normalize({...g.identity,patchId:e.face,u:e.ids[1]===e.a?1-fraction:e.ids[1]===e.b?fraction:0,v:e.ids[2]===e.a?1-fraction:e.ids[2]===e.b?fraction:0});};
 return Object.freeze({...g,planarWitnessPruning:true,atlasBoundaryPosition,angles,centers:Object.freeze(centers.map(p=>Object.freeze(p))),minimumTurnGapMeters,stationLipschitz,
  centerlineLengthMeters:centers.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-centers[i]![0],p[1]-centers[i]![1]),0),
  longitudinalSector:(face:string)=>{const id=g.physicalFaceId(face),i=Number(id.slice(id.lastIndexOf('-')+1));return!id.startsWith('wall-')?i:i<N?i:i===N?N-1:i===M-1?0:2*N-i;},
  longitudinalLowerBound:(a:SurfacePosition,b:SurfacePosition)=>difference(positionStation(a),positionStation(b)),
  boundaryDistanceLowerBound:(p:PolyhedronPhysicalBounds,edge:number)=>difference(boundsStation(p),[Math.min(station(edge),station((edge+1)%M)),Math.max(station(edge),station((edge+1)%M))]),
 });
}
export type SpiralGeometry=ReturnType<typeof buildSpiralGeometry>;
let retained:{key:string;geometry:SpiralGeometry}|undefined;
export function createSpiralGeometry(input:SpiralConfiguration):SpiralGeometry{assertIdentity(input.identity);if(input.provider!=='physical-prismatic-spiral'||input.version!==1||input.role!=='exterior')throw RangeError('Unsupported Spiral geometry.');const key=JSON.stringify({provider:input.provider,version:input.version,identity:input.identity,role:input.role,...spiralDimensions(input)});if(retained?.key===key)return retained.geometry;const geometry=buildSpiralGeometry(input);retained={key,geometry};return geometry;}
