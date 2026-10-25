import {assertIdentity,type SurfaceIdentity,type SurfacePosition,type SurfaceTangent} from './contracts.ts';
import {triangulatedPolygonGeometry,type PhysicalPolygon} from './triangulated-polygon.ts';
import {freezePolyhedronArrays,type PolyhedronVector,type PolyhedronPhysicalBounds} from './polyhedron-contract.ts';
import {pyramidCross,pyramidDot,pyramidSub} from './pyramid.ts';
import * as I from './pyramid-interval.ts';

/** These welded affine triangles, rather than an undisclosed smooth surface,
 * are the reference material. Stations sample an explicit transported frame. */
export const RIBBON_SEGMENTS=48;
export const RIBBON_WIDTH_SEGMENTS=8;
export const RIBBON_THICKNESS_SEGMENTS=2;
export interface RibbonDimensions {
 readonly worldSizeMeters:number;readonly lengthRatio:number;readonly widthRatio:number;
 readonly thicknessRatio:number;readonly twistTurns:number;readonly twistDirection:'right'|'left';
 readonly twistDistribution:'uniform';readonly bendDegrees:number;
}
export interface RibbonConfiguration extends RibbonDimensions {
 readonly provider:'physical-faceted-ribbon';readonly version:2;readonly role:'exterior';readonly identity:SurfaceIdentity;
}
export const RIBBON_DEFAULT_DIMENSIONS:RibbonDimensions=Object.freeze({worldSizeMeters:2000000,lengthRatio:1,widthRatio:.25,thicknessRatio:.4,twistTurns:.5,twistDirection:'right',twistDistribution:'uniform',bendDegrees:0});
export const RIBBON_PRESETS=Object.freeze({
 'Half turn':{},'Untwisted':{twistTurns:0},'Gentle twist':{twistTurns:.25},'Full turn':{twistTurns:1,thicknessRatio:.5},
 'Two turns':{twistTurns:2,thicknessRatio:.65},'Long narrow':{lengthRatio:1.5,widthRatio:.18},
 'Wide':{lengthRatio:.8,widthRatio:.3,thicknessRatio:.5},'Thin':{thicknessRatio:.3},
 'Thick':{thicknessRatio:.75},'Gentle bend':{bendDegrees:45},
} satisfies Record<string,Partial<RibbonDimensions>>);
export function ribbonDimensions(d:RibbonDimensions){
 const {worldSizeMeters:S,lengthRatio:l,widthRatio:w,thicknessRatio:h,twistTurns:t,bendDegrees:b}=d;
 if(![S,l,w,h,t,b].every(Number.isFinite)||S<100000||S>1e9||l<.5||l>2||w<.12||w>.35||h<.3||h>.8||t<0||t>2||b<0||b>90||!['right','left'].includes(d.twistDirection)||d.twistDistribution!=='uniform')throw RangeError('Unsupported Ribbon dimensions, twist or bend.');
 const lengthMeters=S*l,widthMeters=S*w,thicknessMeters=widthMeters*h,twistRadians=t*2*Math.PI*(d.twistDirection==='right'?1:-1),bendRadians=b*Math.PI/180,step=Math.abs(twistRadians)/RIBBON_SEGMENTS,
  crossRadius=Math.hypot(widthMeters,thicknessMeters)/2,curvature=bendRadians/lengthMeters;
 if(step>Math.atan(h/2)||curvature*crossRadius>.3)throw RangeError('Reduce twist or bend, increase thickness, or lengthen the Ribbon to retain valid material clearance.');
 const clearanceMeters=thicknessMeters*Math.cos(step)-widthMeters*Math.sin(step)-4*crossRadius*(1-Math.cos(bendRadians/RIBBON_SEGMENTS));
 if(clearanceMeters<thicknessMeters*.45)throw RangeError('Ribbon station clearance is too small.');
 return Object.freeze({worldSizeMeters:S,lengthRatio:l,widthRatio:w,thicknessRatio:h,twistTurns:t,twistDirection:d.twistDirection,twistDistribution:d.twistDistribution,bendDegrees:b,lengthMeters,widthMeters,thicknessMeters,twistRadians,bendRadians,clearanceMeters,segments:RIBBON_SEGMENTS,widthSegments:RIBBON_WIDTH_SEGMENTS,thicknessSegments:RIBBON_THICKNESS_SEGMENTS,sectionVertices:2*(RIBBON_WIDTH_SEGMENTS+RIBBON_THICKNESS_SEGMENTS),construction:'transported-rectangular-stations-triangular-boundary-v2' as const,crossSection:'rectangular-grid-stations' as const,ends:'flat-distinct' as const});
}
type V=PolyhedronVector;
const add=(a:V,b:V):V=>a.map((x,k)=>x+b[k]!) as unknown as V;
const multiply=(a:V,s:number):V=>a.map(x=>x*s) as unknown as V;
/** Planar parallel transport is explicit even at zero curvature. Deliberate
 * twist rotates only the transverse pair, never the tangent or material IDs. */
export function ribbonFrame(d:ReturnType<typeof ribbonDimensions>,fraction:number){
 if(!Number.isFinite(fraction)||fraction<0||fraction>1)throw RangeError('Ribbon station is bounded.');
 const theta=d.bendRadians*(fraction-.5),angle=d.twistRadians*fraction,T:V=[Math.cos(theta),0,Math.sin(theta)],N0:V=[-Math.sin(theta),0,Math.cos(theta)],B0:V=[0,-1,0],
  N=add(multiply(N0,Math.cos(angle)),multiply(B0,Math.sin(angle))),B=add(multiply(N0,-Math.sin(angle)),multiply(B0,Math.cos(angle))),
  C:V=d.bendRadians===0?[d.lengthMeters*(fraction-.5),0,0]:[d.lengthMeters/d.bendRadians*Math.sin(theta),0,d.lengthMeters/d.bendRadians*(Math.cos(d.bendRadians/2)-Math.cos(theta))];
 return Object.freeze({C:Object.freeze(C),T:Object.freeze(T),N:Object.freeze(N),B:Object.freeze(B)});
}
function triangleOverlap(a:readonly V[],b:readonly V[],epsilon:number){
 const ea=a.map((p,i)=>pyramidSub(a[(i+1)%3]!,p)),eb=b.map((p,i)=>pyramidSub(b[(i+1)%3]!,p)),na=pyramidCross(ea[0]!,ea[1]!),nb=pyramidCross(eb[0]!,eb[1]!),axes=[na,nb,...ea.flatMap(u=>eb.map(v=>pyramidCross(u,v))),...ea.map(e=>pyramidCross(na,e)),...eb.map(e=>pyramidCross(nb,e))];
 for(const axis of axes){const norm=Math.hypot(...axis);if(norm<1e-20)continue;const A=a.map(p=>pyramidDot(p,axis)/norm),B=b.map(p=>pyramidDot(p,axis)/norm);if(Math.max(...A)<Math.min(...B)-epsilon||Math.max(...B)<Math.min(...A)-epsilon)return false;}return true;
}
/** Shared topology permits only its actual common point/edge. It must not
 * conceal another intersection elsewhere in two adjacent triangles. */
export function ribbonUnexpectedContact(a:readonly V[],b:readonly V[],shared:readonly V[],epsilon:number){
 const normal=(t:readonly V[])=>{const n=pyramidCross(pyramidSub(t[1]!,t[0]!),pyramidSub(t[2]!,t[0]!)),size=Math.hypot(...n);return multiply(n,1/size);},na=normal(a),nb=normal(b);
 const inside=(p:V,t:readonly V[],n:V)=>Math.abs(pyramidDot(pyramidSub(p,t[0]!),n))<=epsilon*4&&t.every((v,i)=>{const e=pyramidSub(t[(i+1)%3]!,v);return pyramidDot(pyramidCross(e,pyramidSub(p,v)),n)>=-epsilon*Math.hypot(...e)*4;});
 const allowed=(p:V)=>{if(shared.some(v=>Math.hypot(...pyramidSub(p,v))<=epsilon*8))return true;if(shared.length===2){const d=pyramidSub(shared[1]!,shared[0]!),q=pyramidSub(p,shared[0]!),t=Math.max(0,Math.min(1,pyramidDot(q,d)/pyramidDot(d,d)));return Math.hypot(...pyramidSub(q,multiply(d,t)))<=epsilon*8;}return false;};
 const offer=(p:V)=>inside(p,a,na)&&inside(p,b,nb)&&!allowed(p);
 if(a.some(offer)||b.some(offer))return true;
 const coplanar=Math.hypot(...pyramidCross(na,nb))<1e-10&&Math.abs(pyramidDot(pyramidSub(a[0]!,b[0]!),nb))<epsilon*4;
 for(const[A,B,n]of[[a,b,nb],[b,a,na]] as const)for(let i=0;i<3;i++){
  const p=A[i]!,q=A[(i+1)%3]!,dp=pyramidDot(pyramidSub(p,B[0]!),n),dq=pyramidDot(pyramidSub(q,B[0]!),n);
  if(dp*dq<0){const hit=add(p,multiply(pyramidSub(q,p),dp/(dp-dq)));if(offer(hit))return true;}
  if(coplanar)for(let j=0;j<3;j++){const c=B[j]!,d=B[(j+1)%3]!,u=pyramidSub(q,p),v=pyramidSub(d,c),delta=pyramidSub(c,p),den=pyramidDot(pyramidCross(u,v),n);if(Math.abs(den)<1e-12*Math.hypot(...u)*Math.hypot(...v))continue;const t=pyramidDot(pyramidCross(delta,v),n)/den,s=pyramidDot(pyramidCross(delta,u),n)/den;if(t>=0&&t<=1&&s>=0&&s<=1&&offer(add(p,multiply(u,t))))return true;}
 }return false;
}
function buildRibbonGeometry(input:RibbonConfiguration){
 assertIdentity(input.identity);if(input.provider!=='physical-faceted-ribbon'||input.version!==2||input.role!=='exterior')throw RangeError('Unsupported Ribbon geometry.');
 const d=ribbonDimensions(input),identity=Object.freeze({...input.identity}),metadata=Object.freeze({provider:input.provider,version:2 as const,role:input.role,identity,...d}),frames=Array.from({length:RIBBON_SEGMENTS+1},(_,i)=>ribbonFrame(d,i/RIBBON_SEGMENTS)),W=RIBBON_WIDTH_SEGMENTS,H=RIBBON_THICKNESS_SEGMENTS,K=d.sectionVertices;
 const section=Object.freeze([...Array.from({length:W},(_,i)=>[1-2*i/W,1] as const),...Array.from({length:H},(_,i)=>[-1,1-2*i/H] as const),...Array.from({length:W},(_,i)=>[-1+2*i/W,-1] as const),...Array.from({length:H},(_,i)=>[1,-1+2*i/H] as const)]);
 const materials:(readonly[number,number,number])[]=frames.flatMap((_,station)=>section.map(([u,v])=>[station,u,v] as const));
 const points:V[]=frames.flatMap(f=>section.map(([u,v])=>add(f.C,add(multiply(f.N,u*d.widthMeters/2),multiply(f.B,v*d.thicknessMeters/2))))),polygons:PhysicalPolygon[]=[],regions=['first-face','left-side','second-face','right-side'] as const;
 const sectionRegion=(k:number)=>k<W?0:k<W+H?1:k<2*W+H?2:3,sectionPiece=(k:number)=>k<W?k:k<W+H?k-W:k<2*W+H?k-W-H:k-2*W-H;
 for(let i=0;i<RIBBON_SEGMENTS;i++)for(let k=0;k<K;k++){const q=[i*K+k,i*K+(k+1)%K,(i+1)*K+(k+1)%K,(i+1)*K+k];for(const[j,ids]of [[0,[q[0]!,q[1]!,q[2]!]],[1,[q[0]!,q[2]!,q[3]!]]] as const)polygons.push({id:`${regions[sectionRegion(k)]}-${i}-${2*sectionPiece(k)+j}`,vertices:ids});}
 for(const end of['first-end','second-end'] as const){const station=end==='first-end'?0:RIBBON_SEGMENTS,frame=frames[station]!,grid=Array.from({length:W+1},()=>Array<number>(H+1));
  for(let j=0;j<=W;j++)for(let k=0;k<=H;k++){let boundary:number|undefined;if(k===0)boundary=j;else if(j===W)boundary=W+k;else if(k===H)boundary=W+H+W-j;else if(j===0)boundary=(2*W+H+H-k)%K;
   if(boundary!==undefined)grid[j]![k]=station*K+boundary;else{const u=1-2*j/W,v=1-2*k/H;grid[j]![k]=points.length;points.push(add(frame.C,add(multiply(frame.N,u*d.widthMeters/2),multiply(frame.B,v*d.thicknessMeters/2))));materials.push([station,u,v]);}}
  for(let j=0;j<W;j++)for(let k=0;k<H;k++){const ids=[grid[j]![k]!,grid[j+1]![k]!,grid[j+1]![k+1]!,grid[j]![k+1]!];polygons.push({id:`${end}-${j}-${k}`,vertices:end==='first-end'?ids.toReversed():ids});}
 }
 const vertices=freezePolyhedronArrays(points);freezePolyhedronArrays(materials);
 const vertexBounds=freezePolyhedronArrays(vertices.map(p=>p.map(I.exact) as unknown as PolyhedronPhysicalBounds)),g=triangulatedPolygonGeometry({metadata,vertices,vertexBounds,polygons:Object.freeze(polygons.map(p=>Object.freeze({id:p.id,vertices:Object.freeze([...p.vertices])}))),scaleMeters:d.worldSizeMeters/2,minimumDimensionMeters:d.clearanceMeters});
 const incidence=new Map<string,{count:number;orientation:number}>();let volume=0;
 for(const face of g.faces){const ids=g.vertexIds(face),p=ids.map(i=>vertices[i]!);volume+=pyramidDot(p[0]!,pyramidCross(p[1]!,p[2]!))/6;
  if(Math.hypot(...pyramidCross(pyramidSub(p[1]!,p[0]!),pyramidSub(p[2]!,p[0]!)))<d.worldSizeMeters**2*1e-12)throw RangeError('Degenerate Ribbon material triangle.');
  for(let i=0;i<3;i++){const a=ids[i]!,b=ids[(i+1)%3]!,key=[Math.min(a,b),Math.max(a,b)].join(','),e=incidence.get(key)??{count:0,orientation:0};e.count++;e.orientation+=a<b?1:-1;incidence.set(key,e);}
 }
 if(volume<=0||[...incidence.values()].some(e=>e.count!==2||e.orientation!==0)||g.vertices.length-g.edges.length+g.faces.length!==2)throw RangeError('Ribbon must be one oriented closed material boundary.');
 const triangles=g.faces.map(f=>g.vertexIds(f)),bounds=triangles.map(ids=>[0,1,2].map(k=>[Math.min(...ids.map(i=>vertices[i]![k]!)),Math.max(...ids.map(i=>vertices[i]![k]!))]));
 const order=triangles.map((_,i)=>i).sort((a,b)=>bounds[a]![0]![0]!-bounds[b]![0]![0]!),epsilon=d.worldSizeMeters*1e-10;
 for(let i=0;i<order.length;i++)for(let j=i+1;j<order.length;j++){
  const a=order[i]!,b=order[j]!;if(bounds[b]![0]![0]!>bounds[a]![0]![1]!+epsilon)break;
  if([1,2].some(k=>bounds[a]![k]![1]!<bounds[b]![k]![0]!-epsilon||bounds[b]![k]![1]!<bounds[a]![k]![0]!-epsilon))continue;
  const A=triangles[a]!.map(i=>vertices[i]!),B=triangles[b]!.map(i=>vertices[i]!),shared=triangles[a]!.filter(i=>triangles[b]!.includes(i)).map(i=>vertices[i]!);
  if(triangleOverlap(A,B,epsilon)&&(!shared.length||ribbonUnexpectedContact(A,B,shared,epsilon)))throw RangeError('Ribbon material has touching or intersecting triangles outside their actual shared boundary.');
 }
 const localCoordinates=(face:string,p:V)=>{const f=g.frame(face),q=pyramidSub(p,f.origin),uu=pyramidDot(f.u,f.u),uv=pyramidDot(f.u,f.v),vv=pyramidDot(f.v,f.v),du=pyramidDot(q,f.u),dv=pyramidDot(q,f.v),det=uu*vv-uv*uv;return{u:(du*vv-dv*uv)/det,v:(dv*uu-du*uv)/det};};
 const chartGroups=new Map<string,string[]>();for(const face of g.faces){const id=g.physicalFaceId(face),list=chartGroups.get(id)??[];list.push(face);chartGroups.set(id,list);}
 const atlasEdges=new Map(g.physicalFaces.map(p=>[p.id,p.vertices.map((a,i)=>{const b=p.vertices[(i+1)%p.vertices.length]!,A=vertices[a]!,D=pyramidSub(vertices[b]!,A),face=chartGroups.get(p.id)!.find(f=>g.vertexIds(f).includes(a)&&g.vertexIds(f).includes(b))!;const ids=g.vertexIds(face);return{a,b,A,D,length:pyramidDot(D,D),face,au:ids.indexOf(a)===1?1:0,av:ids.indexOf(a)===2?1:0,bu:ids.indexOf(b)===1?1:0,bv:ids.indexOf(b)===2?1:0};})] as const));
 const atlasBoundaryPosition=(chart:string,point:V)=>{let best=Infinity,selected:SurfacePosition|undefined;for(const e of atlasEdges.get(g.physicalFaceId(chart))!){const x=point[0]-e.A[0],y=point[1]-e.A[1],z=point[2]-e.A[2],t=Math.max(0,Math.min(1,(x*e.D[0]+y*e.D[1]+z*e.D[2])/e.length)),dx=x-t*e.D[0],dy=y-t*e.D[1],dz=z-t*e.D[2],distance=dx*dx+dy*dy+dz*dz;if(distance<best){best=distance;const u=e.au+(e.bu-e.au)*t;let v=e.av+(e.bv-e.av)*t;if(u+v>1)v=1-u;selected={...identity,patchId:e.face,u,v};}}return selected!;};
 let stationLipschitz=0;const stationRanges=new Map<string,I.Interval>();
 const dotBounds=(a:readonly I.Interval[],b:readonly I.Interval[])=>a.reduce((sum,x,k)=>I.add(sum,I.multiply(x,b[k]!)),I.exact(0));
 for(const face of g.faces){const ids=g.vertexIds(face),m=ids.map(id=>materials[id]![0]);stationRanges.set(face,[Math.min(...m),Math.max(...m)]);const du=m[1]!-m[0]!,dv=m[2]!-m[0]!;if(!du&&!dv)continue;const A=g.physicalVertexBounds(ids[0]!),U=g.physicalVertexBounds(ids[1]!).map((x,k)=>I.subtract(x,A[k]!)),V=g.physicalVertexBounds(ids[2]!).map((x,k)=>I.subtract(x,A[k]!)),uu=dotBounds(U,U),uv=dotBounds(U,V),vv=dotBounds(V,V),det=I.subtract(I.multiply(uu,vv),I.square(uv)),num=I.subtract(I.add(I.multiply(vv,I.exact(du*du)),I.multiply(uu,I.exact(dv*dv))),I.multiply(uv,I.exact(2*du*dv))),ratio=I.divide(num,det);stationLipschitz=Math.max(stationLipschitz,I.root([Math.max(0,ratio[0]),Math.max(0,ratio[1])])[1]);}
 stationLipschitz=I.adjacentFloat(stationLipschitz,true);
 const stationBounds=(p:SurfacePosition)=>{const q=g.normalize(p),ids=g.vertexIds(q.patchId),m=ids.map(id=>materials[id]![0]);return I.add(I.exact(m[0]!),I.add(I.multiply(I.exact(m[1]!-m[0]!),I.exact(q.u)),I.multiply(I.exact(m[2]!-m[0]!),I.exact(q.v))));};
 const stationDifference=(a:I.Interval,b:I.Interval)=>Math.max(0,I.divide(I.subtract(a,b),I.exact(stationLipschitz))[0],I.divide(I.subtract(b,a),I.exact(stationLipschitz))[0]);
 return Object.freeze({...g,frames:freezePolyhedronArrays(frames),volumeMeters3:volume,localCoordinates,atlasBoundaryPosition,stationLipschitz,stationBounds,
  longitudinalLowerBound:(a:SurfacePosition,b:SurfacePosition)=>stationDifference(stationBounds(a),stationBounds(b)),
  faceLongitudinalLowerBound:(source:I.Interval,face:string)=>stationDifference(source,stationRanges.get(face)!),
  vertexLongitudinalLowerBound:(source:I.Interval,id:number)=>stationDifference(source,I.exact(materials[id]![0])),gradientRegionId:(face:string)=>g.physicalFaceId(face).startsWith('first-end')?'first-end':g.physicalFaceId(face).startsWith('second-end')?'second-end':g.physicalFaceId(face),
  materialVertex:(id:number)=>{const value=materials[id];if(!value)throw RangeError('Unknown Ribbon material vertex.');return value;},
  region:(face:string)=>{const id=g.physicalFaceId(face);return id.startsWith('first-end')?'first-end':id.startsWith('second-end')?'second-end':regions.find(r=>id.startsWith(r))!;},
  station:(p:SurfacePosition)=>g.vertexIds(p.patchId).reduce((s,id,k)=>s+materials[id]![0]*g.weights(p)[k]!,0),
  tangentVector:(p:SurfacePosition,t:SurfaceTangent)=>{const f=g.frame(p.patchId);return add(multiply(f.u,t.du),multiply(f.v,t.dv));},
 });
}
export type RibbonGeometry=ReturnType<typeof buildRibbonGeometry>;
let retained:{key:string;geometry:RibbonGeometry}|undefined;
export function createRibbonGeometry(input:RibbonConfiguration){const key=JSON.stringify(input);if(retained?.key===key)return retained.geometry;const geometry=buildRibbonGeometry(input);retained={key,geometry};return geometry;}
