import {assertIdentity,type SurfaceIdentity} from './contracts.ts';
import {freezePolyhedronArrays,type PolyhedronPhysicalBounds,type PolyhedronVector} from './polyhedron-contract.ts';
import {pyramidCross,pyramidDot,pyramidSub} from './pyramid.ts';
import {triangulatedPolygonGeometry} from './triangulated-polygon.ts';
import * as I from './pyramid-interval.ts';

export interface FragmentConfiguration {
 readonly provider:'physical-tetrahedral-fragment';readonly version:1;readonly identity:SurfaceIdentity;readonly role:'exterior';
 readonly parentWidthMeters:number;readonly fractureSeed:number;readonly piece:number;
}
/** Four cones from an interior point to the four boundary triangles partition
 * one regular tetrahedron exactly. Every break face has an oppositely wound
 * partner. Seed only permutes four bounded rational barycentric weights. */
export function fragmentReference(width:number,seed:number){
 if(!Number.isFinite(width)||width<10000||width>1e9||!Number.isInteger(seed)||seed<0||seed>2147483647)throw RangeError('Fragmented Worlds require a parent width from 10,000 through 1,000,000,000 m and a nonnegative integer seed.');
 const signs=[[-1,-1,-1],[1,1,-1],[1,-1,1],[-1,1,1]] as const;
 const bounds=signs.map(v=>v.map(x=>I.divide(I.multiply(I.exact(x),I.exact(width)),I.exact(2))) as unknown as PolyhedronPhysicalBounds);
 const weights=[22,24,26,28].map((_,i)=>[22,24,26,28][(i+seed%4)%4]!);if(Math.floor(seed/4)%2)weights.reverse();
 const inner=[0,1,2].map(k=>bounds.reduce((s,p,i)=>I.add(s,I.multiply(p[k]!,I.divide(I.exact(weights[i]!),I.exact(100)))),I.exact(0))) as unknown as PolyhedronPhysicalBounds;
 const midpoint=(p:PolyhedronPhysicalBounds)=>p.map(x=>x[0]+(x[1]-x[0])/2) as unknown as PolyhedronVector;
 return{bounds:freezePolyhedronArrays([...bounds,inner]),vertices:freezePolyhedronArrays([...bounds,inner].map(midpoint)),weights:Object.freeze(weights)};
}
export function createFragmentGeometry(input:FragmentConfiguration){
 assertIdentity(input.identity);if(input.provider!=='physical-tetrahedral-fragment'||input.version!==1||input.role!=='exterior'||!Number.isInteger(input.piece)||input.piece<0||input.piece>3)throw RangeError('Unsupported physical fragment.');
 const reference=fragmentReference(input.parentWidthMeters,input.fractureSeed),ids=[0,1,2,3].filter(i=>i!==input.piece);ids.push(4);
 const raw=ids.map(i=>reference.bounds[i]!),centerBounds=[0,1,2].map(k=>I.divide(raw.reduce((s,p)=>I.add(s,p[k]!),I.exact(0)),I.exact(4))) as unknown as PolyhedronPhysicalBounds;
 const parentCenter=Object.freeze(centerBounds.map(x=>x[0]+(x[1]-x[0])/2) as unknown as PolyhedronVector);
 const vertexBounds=freezePolyhedronArrays(raw.map(p=>p.map((x,k)=>I.subtract(x,centerBounds[k]!)) as unknown as PolyhedronPhysicalBounds));
 const vertices=freezePolyhedronArrays(vertexBounds.map(p=>p.map(x=>x[0]+(x[1]-x[0])/2) as unknown as PolyhedronVector));
 const polygons=Object.freeze([[0,1,2],[0,1,3],[1,2,3],[2,0,3]].map((v,i)=>{const [a,b,c]=v.map(j=>vertices[j]!),normal=pyramidCross(pyramidSub(b!,a!),pyramidSub(c!,a!));return Object.freeze({id:i===0?'outer':`fracture-${i}`,vertices:Object.freeze(pyramidDot(normal,a!)<0?v.toReversed():v)});}));
 const minimumDimensionMeters=Math.min(...polygons.map(p=>{const [a,b,c]=p.vertices.map(i=>vertices[i]!),n=pyramidCross(pyramidSub(b!,a!),pyramidSub(c!,a!)),opposite=vertices[[0,1,2,3].find(i=>!p.vertices.includes(i))!]!;return Math.abs(pyramidDot(n,pyramidSub(opposite,a!)))/Math.hypot(...n);}));
 const metadata=Object.freeze({provider:input.provider,version:1 as const,identity:Object.freeze({...input.identity}),role:input.role,parentWidthMeters:input.parentWidthMeters,fractureSeed:input.fractureSeed,piece:input.piece});
 const g=triangulatedPolygonGeometry({metadata,vertices,vertexBounds,polygons,scaleMeters:input.parentWidthMeters,minimumDimensionMeters});
 return Object.freeze({...g,simplePhysicalFaceRoutes:true as const,parentCenter,parentVertexIds:Object.freeze(ids),heightMeters:Math.max(...vertices.map(v=>v[1]))-Math.min(...vertices.map(v=>v[1])),diameterMeters:input.parentWidthMeters,circumradiusMeters:Math.max(...vertices.map(v=>Math.hypot(...v))),volumeMeters3:polygons.reduce((s,p)=>{const[a,b,c]=p.vertices.map(i=>vertices[i]!);return s+pyramidDot(a!,pyramidCross(b!,c!))/6;},0)});
}
export type FragmentGeometry=ReturnType<typeof createFragmentGeometry>;
