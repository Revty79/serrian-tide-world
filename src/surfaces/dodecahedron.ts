import {assertIdentity,type SurfaceIdentity} from './contracts.ts';
import {freezePolyhedronArrays,type PolyhedronPhysicalBounds,type PolyhedronVector} from './polyhedron-contract.ts';
import {triangulatedPolygonGeometry} from './triangulated-polygon.ts';
import * as I from './pyramid-interval.ts';

export interface DodecahedronConfiguration {readonly provider:'physical-regular-dodecahedron';readonly version:1;readonly identity:SurfaceIdentity;readonly role:'exterior'|'interior';readonly edgeLengthMeters:number}
/** Outward regular pentagons of the golden-ratio vertex construction below.
 * The three affine charts per pentagon are numerical coordinates only. */
export const DODECAHEDRON_POLYGONS=freezePolyhedronArrays([[0,9,1,13,10],[0,10,2,14,8],[0,8,4,15,9],[1,11,17,3,13],[1,9,15,5,11],[2,10,13,3,12],[2,12,18,6,14],[3,17,7,18,12],[4,16,19,5,15],[4,8,14,6,16],[5,19,7,17,11],[6,18,7,19,16]]);
export function createDodecahedronGeometry(input:DodecahedronConfiguration){
 assertIdentity(input.identity);const edge=input.edgeLengthMeters;
 if(input.provider!=='physical-regular-dodecahedron'||input.version!==1||!['exterior','interior'].includes(input.role)||!Number.isFinite(edge)||edge<1||edge>1e9)throw RangeError('A regular dodecahedron requires an edge length from 1 through 1,000,000,000 m.');
 const identity=Object.freeze({...input.identity}),metadata=Object.freeze({provider:input.provider,version:1 as const,identity,role:input.role,edgeLengthMeters:edge}),zero=I.exact(0),one=I.exact(1),phi=I.divide(I.add(one,I.root(I.exact(5))),I.exact(2)),inverse=I.divide(one,phi),scale=I.divide(I.multiply(I.exact(edge),phi),I.exact(2));
 const raw:PolyhedronPhysicalBounds[]=[];
 for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])raw.push([I.exact(x),I.exact(y),I.exact(z)]);
 for(const a of[-1,1])for(const b of[-1,1]){const signed=(p:I.Interval,s:number)=>s===1?p:I.neg(p);raw.push([zero,signed(inverse,a),signed(phi,b)],[signed(inverse,a),signed(phi,b),zero],[signed(phi,a),zero,signed(inverse,b)]);}
 const vertexBounds=freezePolyhedronArrays(raw.map(p=>p.map(v=>I.multiply(v,scale)) as unknown as PolyhedronPhysicalBounds)),mid=(a:I.Interval)=>a[0]+(a[1]-a[0])/2,vertices=freezePolyhedronArrays(vertexBounds.map(p=>p.map(mid) as unknown as PolyhedronVector));
 // r = e sqrt(250+110 sqrt(5))/20; R = e sqrt(3)(1+sqrt(5))/4.
 const inradius=I.divide(I.multiply(I.exact(edge),I.root(I.add(I.exact(250),I.multiply(I.exact(110),I.root(I.exact(5)))))),I.exact(20)),circumradius=I.multiply(scale,I.root(I.exact(3)));
 const polygons=Object.freeze(DODECAHEDRON_POLYGONS.map((vertices,i)=>Object.freeze({id:`pentagon-${i+1}`,vertices}))),g=triangulatedPolygonGeometry({metadata,vertices,vertexBounds,polygons,scaleMeters:edge,minimumDimensionMeters:2*inradius[0]});
 return Object.freeze({...g,simplePhysicalFaceRoutes:true as const,inradiusMeters:mid(inradius),inradiusInterval:freezePolyhedronArrays(inradius),circumradiusMeters:mid(circumradius),diameterMeters:2*mid(circumradius),heightMeters:2*mid(I.multiply(phi,scale)),volumeMeters3:g.surfaceAreaMeters2*mid(inradius)/3});
}
export type DodecahedronGeometry=ReturnType<typeof createDodecahedronGeometry>;
