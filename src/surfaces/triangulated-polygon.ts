import {assertIdentity,type SurfaceIdentity,type SurfacePosition} from './contracts.ts';
import {pyramidCross,pyramidDot,pyramidSub,pyramidUnit} from './pyramid.ts';
import {freezePolyhedronArrays,type PolyhedronFrame,type PolyhedronGeometry,type PolyhedronPhysicalBounds,type PolyhedronPoint,type PolyhedronVector} from './polyhedron-contract.ts';
import * as I from './pyramid-interval.ts';

export interface PhysicalPolygon {readonly id:string;readonly vertices:readonly number[]}
/** A numerical atlas of a convex physical polygon surface. Physical faces and
 * edges stay separate from chart triangles and their welded internal diagonals.
 * There is one terrain identity; a diagonal owns one word, just like a join.
 * All maps are affine triangles, never a bilinear approximation to a polygon. */
export function triangulatedPolygonGeometry<M extends Readonly<{identity:SurfaceIdentity;role:'exterior'|'interior'}>>(input:{
 metadata:M;vertices:readonly PolyhedronVector[];vertexBounds:readonly PolyhedronPhysicalBounds[];
 polygons:readonly PhysicalPolygon[];scaleMeters:number;minimumDimensionMeters:number;
}){
 const {metadata,vertices,vertexBounds,polygons,scaleMeters,minimumDimensionMeters}=input;
 assertIdentity(metadata.identity);const identity=metadata.identity;
 const charts=polygons.flatMap(p=>p.vertices.slice(1,-1).map((_,i)=>({id:`${p.id}:${i}`,physicalFaceId:p.id,vertices:[p.vertices[0]!,p.vertices[i+1]!,p.vertices[i+2]!] as const})));
 const faces=Object.freeze(charts.map(c=>c.id)),lookup=new Map(charts.map(c=>[c.id,c]));
 const edgeMap=new Map<string,readonly[number,number]>(),physicalEdgeMap=new Map<string,readonly[number,number]>();
 const edge=(a:number,b:number)=>Object.freeze([Math.min(a,b),Math.max(a,b)] as const);
 for(const c of charts)for(let i=0;i<3;i++){const e=edge(c.vertices[i]!,c.vertices[(i+1)%3]!);edgeMap.set(e.join(','),e);}
 for(const p of polygons)for(let i=0;i<p.vertices.length;i++){const e=edge(p.vertices[i]!,p.vertices[(i+1)%p.vertices.length]!);physicalEdgeMap.set(e.join(','),e);}
 const edges=Object.freeze([...edgeMap.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]));
 const physicalEdges=Object.freeze([...physicalEdgeMap.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]));
 const checked=(face:string)=>{const c=lookup.get(face);if(!c)throw RangeError('Unknown polygon chart.');return c;};
 const frames=new Map<string,PolyhedronFrame>(),bounds=new Map<string,readonly I.IntervalPoint[]>();let area=0,maximumEdge=0;
 const vectorSub=(a:PolyhedronPhysicalBounds,b:PolyhedronPhysicalBounds)=>a.map((x,k)=>I.subtract(x,b[k]!));
 const dot=(a:readonly I.Interval[],b:readonly I.Interval[])=>a.reduce((s,x,k)=>I.add(s,I.multiply(x,b[k]!)),I.exact(0));
 for(const c of charts){
  const [a,b,d]=c.vertices,origin=vertices[a]!,u=pyramidSub(vertices[b]!,origin),v=pyramidSub(vertices[d]!,origin),cross=pyramidCross(u,v),normal=pyramidUnit(cross),e1=pyramidUnit(u),e2=pyramidCross(normal,e1);
  area+=Math.hypot(...cross)/2;maximumEdge=Math.max(maximumEdge,Math.hypot(...u),Math.hypot(...v),Math.hypot(...pyramidSub(u,v)));
  const chartVertices:PolyhedronPoint[]=[[0,0],[Math.hypot(...u),0],[pyramidDot(v,e1),pyramidDot(v,e2)]];
  const ui=vectorSub(vertexBounds[b]!,vertexBounds[a]!),vi=vectorSub(vertexBounds[d]!,vertexBounds[a]!),length=I.root(dot(ui,ui)),x=I.divide(dot(ui,vi),length),y=I.root(I.subtract(dot(vi,vi),I.square(x)));
  bounds.set(c.id,freezePolyhedronArrays([[I.exact(0),I.exact(0)],[length,I.exact(0)],[x,y]]));
  frames.set(c.id,Object.freeze({origin,u:Object.freeze(u),v:Object.freeze(v),normal:Object.freeze(normal),e1:Object.freeze(e1),e2:Object.freeze(e2),chartVertices:freezePolyhedronArrays(chartVertices)}));
 }
 const normalize=(p:SurfacePosition)=>{checked(p.patchId);if(p.worldId!==identity.worldId||p.surfaceId!==identity.surfaceId||![p.u,p.v].every(Number.isFinite)||p.u<0||p.v<0||p.u+p.v>1)throw RangeError('Invalid polygon triangle position.');return{...identity,patchId:p.patchId,u:p.u===0?0:p.u,v:p.v===0?0:p.v};};
 const weights=(p:SurfacePosition)=>{const q=normalize(p);return[1-(q.u+q.v),q.u,q.v] as const;};
 const fromWeights=(face:string,global:ReadonlyMap<number,number>)=>{const c=checked(face);if([...global].some(([id,w])=>w!==0&&!c.vertices.includes(id)))return;return normalize({...identity,patchId:face,u:global.get(c.vertices[1])??0,v:global.get(c.vertices[2])??0});};
 const aliases=(p:SurfacePosition)=>{const q=normalize(p),w=weights(q);if(w.every(x=>x!==0))return[q];const global=new Map(checked(q.patchId).vertices.map((id,i)=>[id,w[i]!]));return faces.flatMap(face=>{const a=fromWeights(face,global);return a?[a]:[];});};
 const referencePosition=(p:SurfacePosition):PolyhedronVector=>{const q=normalize(p),f=frames.get(q.patchId)!;return f.origin.map((x,k)=>x+q.u*f.u[k]!+q.v*f.v[k]!) as unknown as PolyhedronVector;};
 return Object.freeze({metadata,identity,faces,edges,vertices,physicalFaces:polygons,physicalEdges,
  physicalFaceId:(face:string)=>checked(face).physicalFaceId,
  scaleMeters,minimumDimensionMeters,maximumLatticeEdgeMeters:maximumEdge,surfaceAreaMeters2:area,
  centerMeters:Object.freeze([0,0,0] as PolyhedronVector),inspectionEyeMeters:Object.freeze([0,0,0] as PolyhedronVector),
  frame:(face:string)=>frames.get(checked(face).id)!,vertexIds:(face:string)=>checked(face).vertices,isTriangle:(face:string)=>{checked(face);return true;},
  chartVertexBounds:(face:string)=>bounds.get(checked(face).id)!,physicalVertexBounds:(i:number)=>{if(!Number.isInteger(i)||!vertexBounds[i])throw RangeError('Unknown physical vertex.');return vertexBounds[i]!;},
  normalize,weights,aliases,fromWeights,referencePosition,canonicalPosition:(p:SurfacePosition)=>aliases(p)[0]!,
  chartPoint:(p:SurfacePosition):PolyhedronPoint=>{const q=normalize(p),f=frames.get(q.patchId)!;return[q.u*Math.hypot(...f.u)+q.v*pyramidDot(f.v,f.e1),q.v*pyramidDot(f.v,f.e2)];},
  normal:(p:SurfacePosition):PolyhedronVector=>frames.get(normalize(p).patchId)!.normal.map(x=>x*(metadata.role==='interior'?-1:1)) as unknown as PolyhedronVector,
 } satisfies PolyhedronGeometry);
}
