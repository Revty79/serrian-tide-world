import {freezePolyhedronArrays} from './polyhedron-contract.ts';
import {assertIdentity,type SurfaceIdentity,type SurfacePosition} from './contracts.ts';
import {pyramidCross,pyramidDot,pyramidSub,pyramidUnit} from './pyramid.ts';
import type {PolyhedronFrame,PolyhedronGeometry,PolyhedronPhysicalBounds,PolyhedronPoint,PolyhedronVector} from './polyhedron-contract.ts';
import * as I from './pyramid-interval.ts';
export const TETRAHEDRON_FACES=Object.freeze(['base','south','east','west'] as const);
export const TETRAHEDRON_VERTICES=Object.freeze({base:Object.freeze([0,2,1]),south:Object.freeze([0,1,3]),east:Object.freeze([1,2,3]),west:Object.freeze([2,0,3])});
export const TETRAHEDRON_EDGES=Object.freeze([[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]].map(e=>Object.freeze(e as [number,number])));
export interface TetrahedronConfiguration {readonly provider:'physical-regular-tetrahedron';readonly version:1;readonly identity:SurfaceIdentity;readonly role:'exterior'|'interior';readonly edgeLengthMeters:number}
export type TetrahedronFace=typeof TETRAHEDRON_FACES[number];
export function createTetrahedronGeometry(input:TetrahedronConfiguration){
 assertIdentity(input.identity);const edge=input.edgeLengthMeters;
 if(input.provider!=='physical-regular-tetrahedron'||input.version!==1||!['exterior','interior'].includes(input.role)||!Number.isFinite(edge)||edge<1||edge>1e9)throw RangeError('A regular tetrahedron requires an edge length from 1 through 1,000,000,000 m.');
 const identity=Object.freeze({...input.identity}),metadata=Object.freeze({provider:'physical-regular-tetrahedron' as const,version:1 as const,identity,role:input.role,edgeLengthMeters:edge}),height=edge*Math.sqrt(2/3),zero=I.exact(0),ie=I.exact(edge),root3=I.root(I.exact(3)),ih=I.multiply(ie,I.root(I.divide(I.exact(2),I.exact(3)))),q=I.divide(ih,I.exact(4)),third=I.divide(ie,root3),half=I.divide(ie,I.exact(2)),altitude=I.divide(I.multiply(ie,root3),I.exact(2));
 const intervalVertices:readonly PolyhedronPhysicalBounds[]=[ [I.neg(half),I.neg(I.divide(third,I.exact(2))),I.neg(q)], [half,I.neg(I.divide(third,I.exact(2))),I.neg(q)], [zero,third,I.neg(q)], [zero,zero,I.multiply(q,I.exact(3))] ];
 freezePolyhedronArrays(intervalVertices);
 const vertices:readonly PolyhedronVector[]=Object.freeze([[-edge/2,-edge/(2*Math.sqrt(3)),-height/4],[edge/2,-edge/(2*Math.sqrt(3)),-height/4],[0,edge/Math.sqrt(3),-height/4],[0,0,3*height/4]].map(p=>Object.freeze(p as unknown as PolyhedronVector)));
 const checkedFace=(face:string)=>{if(!TETRAHEDRON_FACES.includes(face as TetrahedronFace))throw RangeError('Unknown tetrahedron face.');return face as TetrahedronFace;};
 const frames=Object.fromEntries(TETRAHEDRON_FACES.map(face=>{const ids=TETRAHEDRON_VERTICES[face],origin=vertices[ids[0]!]!,u=pyramidSub(vertices[ids[1]!]!,origin),v=pyramidSub(vertices[ids[2]!]!,origin),normal=pyramidUnit(pyramidCross(u,v)),e1=pyramidUnit(u),e2=pyramidCross(normal,e1),chartVertices=ids.map(id=>{const d=pyramidSub(vertices[id]!,origin);return Object.freeze([pyramidDot(d,e1),pyramidDot(d,e2)] as PolyhedronPoint);});for(const a of[u,v,normal,e1,e2])Object.freeze(a);return[face,Object.freeze({origin,u,v,normal,e1,e2,chartVertices:Object.freeze(chartVertices)})];})) as Record<TetrahedronFace,PolyhedronFrame>;Object.freeze(frames);
 const normalize=(p:SurfacePosition)=>{const face=checkedFace(p.patchId);if(p.worldId!==identity.worldId||p.surfaceId!==identity.surfaceId||![p.u,p.v].every(Number.isFinite)||p.u<0||p.v<0||p.u+p.v>1)throw RangeError('Invalid or foreign tetrahedron triangle position.');return{...identity,patchId:face,u:p.u===0?0:p.u,v:p.v===0?0:p.v};};
 const weights=(p:SurfacePosition)=>{const q=normalize(p);return[1-(q.u+q.v),q.u,q.v] as const;};
 const referencePosition=(p:SurfacePosition):PolyhedronVector=>{const q=normalize(p),w=weights(q),ids=TETRAHEDRON_VERTICES[q.patchId];return[0,1,2].map(k=>w.reduce((s,t,i)=>s+t*vertices[ids[i]!]![k]!,0)) as unknown as PolyhedronVector;};
 const fromWeights=(face:string,global:ReadonlyMap<number,number>)=>{const id=checkedFace(face),ids=TETRAHEDRON_VERTICES[id];if([...global].some(([i,w])=>w!==0&&!ids.includes(i)))return;return normalize({...identity,patchId:id,u:global.get(ids[1]!)??0,v:global.get(ids[2]!)??0});};
 const aliases=(p:SurfacePosition)=>{const q=normalize(p),w=weights(q);if(w.every(x=>x!==0))return[q];const global=new Map(TETRAHEDRON_VERTICES[q.patchId].map((id,i)=>[id,w[i]!]));return TETRAHEDRON_FACES.flatMap(face=>{const a=fromWeights(face,global);return a?[a]:[];});};
 const geometry={metadata,identity,faces:TETRAHEDRON_FACES,edges:TETRAHEDRON_EDGES,vertices,faceFrames:frames,scaleMeters:edge,minimumDimensionMeters:height,maximumLatticeEdgeMeters:edge,surfaceAreaMeters2:Math.sqrt(3)*edge*edge,heightMeters:height,inradiusMeters:height/4,
  centerMeters:Object.freeze([0,0,0] as PolyhedronVector),inspectionEyeMeters:Object.freeze([0,0,0] as PolyhedronVector),
  frame:(face:string)=>frames[checkedFace(face)],vertexIds:(face:string)=>TETRAHEDRON_VERTICES[checkedFace(face)],isTriangle:(face:string)=>{checkedFace(face);return true;},
  chartVertexBounds:(face:string):readonly I.IntervalPoint[]=>{checkedFace(face);return freezePolyhedronArrays([[zero,zero],[ie,zero],[half,altitude]]);},physicalVertexBounds:(index:number)=>{if(!Number.isInteger(index)||index<0||index>=4)throw RangeError('Unknown tetrahedron vertex.');return intervalVertices[index]!;},
  normalize,weights,referencePosition,fromWeights,aliases,canonicalPosition:(p:SurfacePosition)=>aliases(p)[0]!,
  chartPoint:(p:SurfacePosition):PolyhedronPoint=>{const q=normalize(p),f=frames[q.patchId];return[q.u*pyramidDot(f.u,f.e1)+q.v*pyramidDot(f.v,f.e1),q.v*pyramidDot(f.v,f.e2)];},
  normal:(p:SurfacePosition):PolyhedronVector=>frames[normalize(p).patchId].normal.map(x=>x*(metadata.role==='interior'?-1:1)) as unknown as PolyhedronVector,
 };
 return Object.freeze(geometry satisfies PolyhedronGeometry);
}
export type TetrahedronGeometry=ReturnType<typeof createTetrahedronGeometry>;
