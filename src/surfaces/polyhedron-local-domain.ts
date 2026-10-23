import type {SurfacePosition} from './contracts.ts';
import type {PolyhedronGeometry} from './polyhedron-contract.ts';
import {polyhedronPositionBounds,type PhysicalBounds} from './polyhedron-physical-bounds.ts';
import * as I from './pyramid-interval.ts';
const zero=I.exact(0);
type Domain={faces:readonly string[];boundary:readonly(readonly[number,number])[]};
const domains=new WeakMap<PolyhedronGeometry,Map<number,Domain|undefined>>();
function star(g:PolyhedronGeometry,vertex:number){
 let cache=domains.get(g);if(!cache){cache=new Map();domains.set(g,cache);}if(cache.has(vertex))return cache.get(vertex);
 const incident=g.faces.filter(f=>g.vertexIds(f).includes(vertex)),physical=g.physicalFaceId&&new Set(incident.map(f=>g.physicalFaceId!(f))),faces=physical?g.faces.filter(f=>physical.has(g.physicalFaceId!(f))):incident,selected=new Set(faces),boundary:(readonly[number,number])[]=[];
 for(const edge of g.edges){const incident=g.faces.filter(f=>edge.every(v=>g.vertexIds(f).includes(v)));if(incident.length!==2){cache.set(vertex,undefined);return;}
  if(incident.filter(f=>selected.has(f)).length===1)boundary.push(edge);
 }
 const domain={faces:Object.freeze(faces),boundary:Object.freeze(boundary)};cache.set(vertex,domain);return domain;
}
/** Lower bound only: the source-to-segment ambient distance can exclude a
 * surface route, but is never returned as a physical surface distance. The
 * closest segment parameter is enclosed before clamping to its complete range. */
function segmentLower(g:PolyhedronGeometry,p:PhysicalBounds,edge:readonly[number,number]){
 const a=g.physicalVertexBounds(edge[0]),b=g.physicalVertexBounds(edge[1]),d=a.map((x,k)=>I.subtract(b[k]!,x)),offset=a.map((x,k)=>I.subtract(p[k]!,x)),den=d.reduce((s,x)=>I.add(s,I.square(x)),zero);
 if(den[0]<=0)return 0;
 const projection=I.divide(offset.reduce((s,x,k)=>I.add(s,I.multiply(x,d[k]!)),zero),den),clamp=(x:number)=>Math.max(0,Math.min(1,x)),t:I.Interval=[clamp(projection[0]),clamp(projection[1])];
 const distance=I.root(a.reduce((sum,x,k)=>I.add(sum,I.square(I.subtract(p[k]!,I.add(x,I.multiply(t,d[k]!))))),zero));return Math.max(0,distance[0]);
}
/** A vertex star is a real connected subset of physical faces. Any surface
 * path leaving it must first touch one of its boundary segments (including
 * endpoints). Its length is at least the certified ambient source-to-boundary
 * lower bound. A feasible in-domain route shorter than that bound therefore
 * proves that no excluded route can be shortest. Failed/ambiguous proofs retain
 * the complete accepted global solver; this is not radius-based truncation. */
export function polyhedronLocalDomain(g:PolyhedronGeometry,start:SurfacePosition){
 const weights=g.weights(start),ids=g.vertexIds(start.patchId);let largest=0;for(let i=1;i<weights.length;i++)if(weights[i]!>weights[largest]!)largest=i;
 const domain=star(g,ids[largest]!);if(!domain||!domain.faces.includes(start.patchId))return;
 const p=polyhedronPositionBounds(g,start),escapeLowerBoundMeters=Math.min(...domain.boundary.map(e=>segmentLower(g,p,e)));
 return{faces:domain.faces,escapeLowerBoundMeters};
}
