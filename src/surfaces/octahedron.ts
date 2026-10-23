import {freezePolyhedronArrays} from './polyhedron-contract.ts';
import {assertIdentity,type SurfaceIdentity,type SurfacePosition} from './contracts.ts';
import {pyramidCross,pyramidDot,pyramidSub,pyramidUnit} from './pyramid.ts';
import type {PolyhedronFrame,PolyhedronGeometry,PolyhedronPhysicalBounds,PolyhedronPoint,PolyhedronVector} from './polyhedron-contract.ts';
import * as I from './pyramid-interval.ts';
export const OCTAHEDRON_FACES=Object.freeze(['ppp','ppn','pnp','pnn','npp','npn','nnp','nnn'] as const);
/** Each face selects one vertex from each axis. Reverse the negative
 * determinant triples so every physical triangle winds outward. */
export const OCTAHEDRON_VERTICES=Object.freeze(Object.fromEntries(OCTAHEDRON_FACES.map(face=>{const ids=[face[0]==='p'?0:1,face[1]==='p'?2:3,face[2]==='p'?4:5];if([...face].filter(s=>s==='n').length%2)[ids[1],ids[2]]=[ids[2]!,ids[1]!];return[face,Object.freeze(ids)];})) as Record<typeof OCTAHEDRON_FACES[number],readonly number[]>);
export const OCTAHEDRON_EDGES=Object.freeze(Array.from({length:6},(_,i)=>Array.from({length:5-i},(_,k)=>[i,i+k+1] as [number,number])).flat().filter(([i,j])=>Math.floor(i/2)!==Math.floor(j/2)).map(e=>Object.freeze(e)));
export interface OctahedronConfiguration {readonly provider:'physical-regular-octahedron';readonly version:1;readonly identity:SurfaceIdentity;readonly role:'exterior'|'interior';readonly edgeLengthMeters:number}
export type OctahedronFace=typeof OCTAHEDRON_FACES[number];
export function createOctahedronGeometry(input:OctahedronConfiguration){
 assertIdentity(input.identity);const edge=input.edgeLengthMeters;
 if(input.provider!=='physical-regular-octahedron'||input.version!==1||!['exterior','interior'].includes(input.role)||!Number.isFinite(edge)||edge<1||edge>1e9)throw RangeError('A regular octahedron requires an edge length from 1 through 1,000,000,000 m.');
 const identity=Object.freeze({...input.identity}),metadata=Object.freeze({provider:'physical-regular-octahedron' as const,version:1 as const,identity,role:input.role,edgeLengthMeters:edge}),height=edge*Math.SQRT2,inradius=edge/Math.sqrt(6),zero=I.exact(0),ie=I.exact(edge),root3=I.root(I.exact(3)),half=I.divide(ie,I.exact(2)),altitude=I.divide(I.multiply(ie,root3),I.exact(2)),axis=I.divide(ie,I.root(I.exact(2)));
 const intervalVertices:readonly PolyhedronPhysicalBounds[]=[[axis,zero,zero],[I.neg(axis),zero,zero],[zero,axis,zero],[zero,I.neg(axis),zero],[zero,zero,axis],[zero,zero,I.neg(axis)]];
 freezePolyhedronArrays(intervalVertices);
 const a=edge/Math.sqrt(2),vertices:readonly PolyhedronVector[]=Object.freeze([[a,0,0],[-a,0,0],[0,a,0],[0,-a,0],[0,0,a],[0,0,-a]].map(p=>Object.freeze(p as unknown as PolyhedronVector)));
 const checkedFace=(face:string)=>{if(!OCTAHEDRON_FACES.includes(face as OctahedronFace))throw RangeError('Unknown octahedron face.');return face as OctahedronFace;};
 const frames=Object.fromEntries(OCTAHEDRON_FACES.map(face=>{const ids=OCTAHEDRON_VERTICES[face],origin=vertices[ids[0]!]!,u=pyramidSub(vertices[ids[1]!]!,origin),v=pyramidSub(vertices[ids[2]!]!,origin),normal=pyramidUnit(pyramidCross(u,v)),e1=pyramidUnit(u),e2=pyramidCross(normal,e1),chartVertices=ids.map(id=>{const d=pyramidSub(vertices[id]!,origin);return Object.freeze([pyramidDot(d,e1),pyramidDot(d,e2)] as PolyhedronPoint);});for(const a of[u,v,normal,e1,e2])Object.freeze(a);return[face,Object.freeze({origin,u,v,normal,e1,e2,chartVertices:Object.freeze(chartVertices)})];})) as Record<OctahedronFace,PolyhedronFrame>;Object.freeze(frames);
 const normalize=(p:SurfacePosition)=>{const face=checkedFace(p.patchId);if(p.worldId!==identity.worldId||p.surfaceId!==identity.surfaceId||![p.u,p.v].every(Number.isFinite)||p.u<0||p.v<0||p.u+p.v>1)throw RangeError('Invalid or foreign octahedron triangle position.');return{...identity,patchId:face,u:p.u===0?0:p.u,v:p.v===0?0:p.v};};
 const weights=(p:SurfacePosition)=>{const q=normalize(p);return[1-(q.u+q.v),q.u,q.v] as const;};
 const referencePosition=(p:SurfacePosition):PolyhedronVector=>{const q=normalize(p),w=weights(q),ids=OCTAHEDRON_VERTICES[q.patchId];return[0,1,2].map(k=>w.reduce((s,t,i)=>s+t*vertices[ids[i]!]![k]!,0)) as unknown as PolyhedronVector;};
 const fromWeights=(face:string,global:ReadonlyMap<number,number>)=>{const id=checkedFace(face),ids=OCTAHEDRON_VERTICES[id];if([...global].some(([i,w])=>w!==0&&!ids.includes(i)))return;return normalize({...identity,patchId:id,u:global.get(ids[1]!)??0,v:global.get(ids[2]!)??0});};
 const aliases=(p:SurfacePosition)=>{const q=normalize(p),w=weights(q);if(w.every(x=>x!==0))return[q];const global=new Map(OCTAHEDRON_VERTICES[q.patchId].map((id,i)=>[id,w[i]!]));return OCTAHEDRON_FACES.flatMap(face=>{const a=fromWeights(face,global);return a?[a]:[];});};
 const geometry={metadata,identity,faces:OCTAHEDRON_FACES,edges:OCTAHEDRON_EDGES,vertices,faceFrames:frames,scaleMeters:edge,minimumDimensionMeters:2*inradius,maximumLatticeEdgeMeters:edge,surfaceAreaMeters2:2*Math.sqrt(3)*edge*edge,heightMeters:height,inradiusMeters:inradius,circumradiusMeters:edge/Math.sqrt(2),volumeMeters3:Math.SQRT2*edge**3/3,
  centerMeters:Object.freeze([0,0,0] as PolyhedronVector),inspectionEyeMeters:Object.freeze([0,0,0] as PolyhedronVector),
  frame:(face:string)=>frames[checkedFace(face)],vertexIds:(face:string)=>OCTAHEDRON_VERTICES[checkedFace(face)],isTriangle:(face:string)=>{checkedFace(face);return true;},
  chartVertexBounds:(face:string):readonly I.IntervalPoint[]=>{checkedFace(face);return freezePolyhedronArrays([[zero,zero],[ie,zero],[half,altitude]]);},physicalVertexBounds:(index:number)=>{if(!Number.isInteger(index)||index<0||index>=6)throw RangeError('Unknown octahedron vertex.');return intervalVertices[index]!;},
  normalize,weights,referencePosition,fromWeights,aliases,canonicalPosition:(p:SurfacePosition)=>aliases(p)[0]!,
  chartPoint:(p:SurfacePosition):PolyhedronPoint=>{const q=normalize(p),f=frames[q.patchId];return[q.u*pyramidDot(f.u,f.e1)+q.v*pyramidDot(f.v,f.e1),q.v*pyramidDot(f.v,f.e2)];},
  normal:(p:SurfacePosition):PolyhedronVector=>frames[normalize(p).patchId].normal.map(x=>x*(metadata.role==='interior'?-1:1)) as unknown as PolyhedronVector,
 };
 return Object.freeze(geometry satisfies PolyhedronGeometry);
}
export type OctahedronGeometry=ReturnType<typeof createOctahedronGeometry>;
