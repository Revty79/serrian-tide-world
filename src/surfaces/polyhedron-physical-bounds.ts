import type {SurfacePosition} from './contracts.ts';
import type {PolyhedronGeometry} from './polyhedron-contract.ts';
import * as I from './pyramid-interval.ts';
export type PhysicalBounds=readonly[I.Interval,I.Interval,I.Interval];
const zero=I.exact(0),one=I.exact(1);
/** Accepted reference-solver arithmetic, shared with the local-domain proof. */
export function polyhedronPositionBounds(g:PolyhedronGeometry,p:SurfacePosition):PhysicalBounds{const u=I.exact(p.u),v=I.exact(p.v),weights=!g.isTriangle(p.patchId)?[I.multiply(I.subtract(one,u),I.subtract(one,v)),I.multiply(u,I.subtract(one,v)),I.multiply(u,v),I.multiply(I.subtract(one,u),v)]:[I.subtract(I.subtract(one,u),v),u,v],ids=g.vertexIds(p.patchId);return[0,1,2].map(k=>weights.reduce((sum,w,i)=>I.add(sum,I.multiply(w,g.physicalVertexBounds(ids[i]!)[k]!)),zero)) as unknown as PhysicalBounds;}
export function polyhedronEdgeBounds(g:PolyhedronGeometry,i:number,j:number,t:number):PhysicalBounds{const a=g.physicalVertexBounds(i),b=g.physicalVertexBounds(j),v=I.exact(t),u=I.subtract(one,v);return a.map((x,k)=>I.add(I.multiply(u,x),I.multiply(v,b[k]!))) as unknown as PhysicalBounds;}
export function polyhedronPhysicalLength(a:PhysicalBounds,b:PhysicalBounds){return I.root(a.reduce((sum,x,k)=>I.add(sum,I.square(I.subtract(x,b[k]!))),zero));}
