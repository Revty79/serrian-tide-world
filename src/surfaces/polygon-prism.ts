import type{SurfaceIdentity,SurfacePosition,SurfaceTangent}from'./contracts.ts';
import{triangulatedPolygonGeometry}from'./triangulated-polygon.ts';
import{freezePolyhedronArrays,type PolyhedronPhysicalBounds,type PolyhedronVector}from'./polyhedron-contract.ts';
import{pyramidCross,pyramidDot,pyramidSub}from'./pyramid.ts';import*as I from'./pyramid-interval.ts';
export type PrismWallRegion='outer'|'inner'|'first-end'|'second-end';
export interface PrismMetadata{readonly provider:string;readonly version:number;readonly identity:SurfaceIdentity;readonly role:'exterior';readonly worldSizeMeters:number;readonly thicknessMeters:number}
/** The accepted Crescent prism's welded cap-strip/real-wall construction.
 * This internal adapter accepts the geometry family's already validated outline;
 * it does not expose arbitrary creator meshes or change any terrain authority. */
export function polygonPrismGeometry<M extends PrismMetadata,R extends PrismWallRegion>(input:{metadata:M;outline:readonly(readonly[number,number])[];outer:readonly number[];inner:readonly number[];wallRegions:readonly R[];scaleMeters:number}){
 const outline=Object.freeze(input.outline.map(p=>Object.freeze([...p] as [number,number]))),M=outline.length,S=input.outer.length-1,R=input.scaleMeters,d=input.metadata,metadata=input.metadata,outer=input.outer,inner=input.inner;
 const vertices=freezePolyhedronArrays([d.thicknessMeters/2,-d.thicknessMeters/2].flatMap(y=>outline.map(([x,z])=>[x,y,z] as PolyhedronVector)));
 const vertexBounds=freezePolyhedronArrays(vertices.map(v=>v.map(I.exact) as unknown as PolyhedronPhysicalBounds));
 const distinct=(ids:readonly number[])=>ids.filter((v,i)=>i===0||v!==ids[i-1]).filter((v,i,all)=>i!==all.length-1||v!==all[0]);
 const polygons=[];
 for(let i=0;i<S;i++){
  const upper=distinct([outer[i]!,inner[i]!,inner[i+1]!,outer[i+1]!]);
  polygons.push(Object.freeze({id:`upper-${i}`,vertices:Object.freeze(upper)}));
  polygons.push(Object.freeze({id:`lower-${i}`,vertices:Object.freeze(upper.toReversed().map(v=>v+M))}));
 }
 for(let i=0;i<M;i++){const j=(i+1)%M;polygons.push(Object.freeze({id:`wall-${i}`,vertices:Object.freeze([i,j,j+M,i+M])}));}
 const g=triangulatedPolygonGeometry({metadata,vertices,vertexBounds,polygons:Object.freeze(polygons),scaleMeters:R,minimumDimensionMeters:d.thicknessMeters});
 const signedArea=outline.reduce((s,p,i)=>{const b=outline[(i+1)%M]!;return s+p[0]*b[1]-p[1]*b[0];},0)/2;
 if(!(signedArea>0)||g.faces.some(f=>{const frame=g.frame(f);return ![...frame.normal,...frame.u,...frame.v].every(Number.isFinite)||Math.hypot(...pyramidCross(frame.u,frame.v))<=R*R*1e-10;}))throw RangeError('Prismatic geometry has a degenerate physical chart.');
 const perimeterOffsets=[0];for(let i=0;i<M;i++){const b=outline[(i+1)%M]!,p=outline[i]!;perimeterOffsets.push(perimeterOffsets[i]!+Math.hypot(b[0]-p[0],b[1]-p[1]));}
 const region=(face:string)=>{const id=g.physicalFaceId(face);return id.startsWith('upper-')?'upper':id.startsWith('lower-')?'lower':input.wallRegions[Number(id.slice(5))]!;};
 const tangent=(p:SurfacePosition,t:SurfaceTangent)=>{const f=g.frame(g.normalize(p).patchId);return f.u.map((v,k)=>v*t.du+f.v[k]!*t.dv) as unknown as PolyhedronVector;};
 return Object.freeze({...g,outline,outer:Object.freeze(outer),inner:Object.freeze(inner),segments:S,region,
  gradientRegionId:(face:string)=>face.startsWith('upper-')?'upper':face.startsWith('lower-')?'lower':g.physicalFaceId(face),
  planarAreaMeters2:signedArea,volumeMeters3:signedArea*d.thicknessMeters,perimeterMeters:perimeterOffsets[M]!,perimeterOffsets:Object.freeze(perimeterOffsets),
  heightMeters:d.thicknessMeters,diameterMeters:d.worldSizeMeters,circumradiusMeters:Math.max(...vertices.map(p=>Math.hypot(...p))),
  tangentVector:tangent,metricSquared:(p:SurfacePosition,t:SurfaceTangent)=>{const v=tangent(p,t);return pyramidDot(v,v);},
  localCoordinates:(face:string,p:PolyhedronVector)=>{const f=g.frame(face),v=pyramidSub(p,f.origin),uu=pyramidDot(f.u,f.u),uv=pyramidDot(f.u,f.v),vv=pyramidDot(f.v,f.v),du=pyramidDot(v,f.u),dv=pyramidDot(v,f.v),det=uu*vv-uv*uv;return{u:(du*vv-dv*uv)/det,v:(dv*uu-du*uv)/det};},
 });
}
export type PolygonPrismGeometry=ReturnType<typeof polygonPrismGeometry>&{
 /** Optional certified global lower bound to any point on a real perimeter
  * edge. Geometry adapters may separate nearby but intrinsically distant ends
  * without weakening the shared local hinge/cone escape certificate. */
 /** Opt in to certified feasible-witness pruning of the same visibility graph. */
 readonly planarWitnessPruning?:boolean;
 boundaryDistanceLowerBound?(source:PolyhedronPhysicalBounds,edge:number):number;
};
