import {assertIdentity,type SurfaceIdentity,type SurfacePosition} from './contracts.ts';
export type PyramidVector=readonly[number,number,number];
export type PyramidPoint=readonly[number,number];
export const PYRAMID_FACES=['south','east','north','west','base'] as const;
export type PyramidFace=typeof PYRAMID_FACES[number];
/** Counterclockwise as seen from outside. Four actual triangles and one square. */
export const PYRAMID_VERTICES:Readonly<Record<PyramidFace,readonly number[]>>=Object.freeze({south:[0,1,4],east:[1,2,4],north:[2,3,4],west:[3,0,4],base:[0,3,2,1]});
export const PYRAMID_EDGES=Object.freeze([[0,1],[1,2],[2,3],[0,3],[0,4],[1,4],[2,4],[3,4]] as const);
export interface PyramidConfiguration{readonly provider:'physical-square-pyramid';readonly version:1;readonly identity:SurfaceIdentity;readonly role:'exterior'|'interior';readonly baseWidthMeters:number;readonly heightMeters:number;readonly baseZMeters:number}
export interface PyramidPosition extends SurfacePosition{readonly patchId:PyramidFace}
export const pyramidDot=(a:PyramidVector,b:PyramidVector)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const pyramidSub=(a:PyramidVector,b:PyramidVector):PyramidVector=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export const pyramidCross=(a:PyramidVector,b:PyramidVector):PyramidVector=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const pyramidUnit=(a:PyramidVector):PyramidVector=>{const n=Math.hypot(...a);if(!(n>0))throw RangeError('Nonzero pyramid vector required.');return a.map(x=>x/n) as unknown as PyramidVector;};
export function createPyramidGeometry(input:PyramidConfiguration){
 assertIdentity(input.identity);const w=input.baseWidthMeters,h=input.heightMeters,z=input.baseZMeters,s=Math.hypot(h,w/2),scale=Math.max(w,h,Math.abs(z));
 if(input.provider!=='physical-square-pyramid'||input.version!==1||!['exterior','interior'].includes(input.role)||![w,h,s,scale*scale].every(v=>Number.isFinite(v)&&v>0)||!Number.isFinite(z)||h/w<.05||h/w>20||Math.abs(z)>100*Math.max(w,h))throw RangeError('A right square pyramid requires finite dimensions and height/width between 0.05 and 20.');
 const identity=Object.freeze({...input.identity}),metadata=Object.freeze({...input,identity}),vertices:readonly PyramidVector[]=Object.freeze([[-w/2,-w/2,z],[w/2,-w/2,z],[w/2,w/2,z],[-w/2,w/2,z],[0,0,z+h]].map(p=>Object.freeze(p as unknown as PyramidVector)));
 const normalize=(p:SurfacePosition):PyramidPosition=>{if(p.worldId!==identity.worldId||p.surfaceId!==identity.surfaceId||!PYRAMID_FACES.includes(p.patchId as PyramidFace)||![p.u,p.v].every(Number.isFinite)||p.u<0||p.v<0||p.u>1||p.v>1||(p.patchId!=='base'&&p.u+p.v>1))throw RangeError('Invalid or foreign pyramid position.');return{...identity,patchId:p.patchId as PyramidFace,u:p.u===0?0:p.u,v:p.v===0?0:p.v};};
 const weights=(p:SurfacePosition):readonly number[]=>{const q=normalize(p);return q.patchId==='base'?[(1-q.u)*(1-q.v),q.u*(1-q.v),q.u*q.v,(1-q.u)*q.v]:[1-(q.u+q.v),q.u,q.v];};
 const referencePosition=(p:SurfacePosition):PyramidVector=>{const q=normalize(p),a=weights(q),ids=PYRAMID_VERTICES[q.patchId];return[0,1,2].map(k=>a.reduce((sum,t,i)=>sum+t*vertices[ids[i]!]![k]!,0)) as unknown as PyramidVector;};
 const faceFrames=Object.fromEntries(PYRAMID_FACES.map(face=>{const ids=PYRAMID_VERTICES[face],origin=vertices[ids[0]!]!,u=pyramidSub(vertices[ids[1]!]!,origin),v=pyramidSub(vertices[ids[face==='base'?3:2]!]!,origin),normal=pyramidUnit(pyramidCross(u,v)),e1=pyramidUnit(u),e2=pyramidCross(normal,e1);return[face,Object.freeze({origin,u,v,normal,e1,e2,chartVertices:ids.map(id=>{const d=pyramidSub(vertices[id]!,origin);return[pyramidDot(d,e1),pyramidDot(d,e2)] as PyramidPoint;})})];})) as unknown as Readonly<Record<PyramidFace,{readonly origin:PyramidVector;readonly u:PyramidVector;readonly v:PyramidVector;readonly normal:PyramidVector;readonly e1:PyramidVector;readonly e2:PyramidVector;readonly chartVertices:readonly PyramidPoint[]}>>;
 const fromWeights=(face:PyramidFace,global:ReadonlyMap<number,number>):PyramidPosition|undefined=>{const ids=PYRAMID_VERTICES[face];if([...global].some(([id,v])=>v!==0&&!ids.includes(id)))return;const a=ids.map(id=>global.get(id)??0);return normalize({...identity,patchId:face,u:face==='base'?a[1]!+a[2]!:a[1]!,v:face==='base'?a[2]!+a[3]!:a[2]!});};
 const aliases=(input:SurfacePosition)=>{const p=normalize(input),a=weights(p);if(a.filter(x=>x!==0).length>2)return[p];const global=new Map(PYRAMID_VERTICES[p.patchId].map((id,i)=>[id,a[i]!]));return PYRAMID_FACES.flatMap(face=>{const q=fromWeights(face,global);return q?[q]:[];});};
 const chartPoint=(p:SurfacePosition):PyramidPoint=>{const q=normalize(p),f=faceFrames[q.patchId];return[q.u*pyramidDot(f.u,f.e1)+q.v*pyramidDot(f.v,f.e1),q.v*pyramidDot(f.v,f.e2)];};
 const positionFromChart=(face:PyramidFace,p:PyramidPoint):PyramidPosition=>{const f=faceFrames[face],v=p[1]/pyramidDot(f.v,f.e2),u=(p[0]-v*pyramidDot(f.v,f.e1))/pyramidDot(f.u,f.e1);return normalize({...identity,patchId:face,u,v});};
 return Object.freeze({metadata,identity,vertices,faceFrames,slantHeightMeters:s,scaleMeters:Math.max(w,h),surfaceAreaMeters2:w*w+2*w*s,normalize,weights,aliases,referencePosition,chartPoint,positionFromChart,fromWeights,
  canonicalPosition:(p:SurfacePosition)=>aliases(p)[0]!,normal:(p:SurfacePosition):PyramidVector=>faceFrames[normalize(p).patchId].normal.map(x=>x*(input.role==='interior'?-1:1)) as unknown as PyramidVector,
  faceMetric:(p:SurfacePosition)=>{const f=faceFrames[normalize(p).patchId];return{uu:pyramidDot(f.u,f.u),uv:pyramidDot(f.u,f.v),vv:pyramidDot(f.v,f.v),coordinateUnits:'unit-barycentric' as const};},
 });
}
export type PyramidGeometry=ReturnType<typeof createPyramidGeometry>;
