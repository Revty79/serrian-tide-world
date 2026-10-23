import {assertIdentity,type SurfaceIdentity} from './contracts.ts';
import {freezePolyhedronArrays,type PolyhedronPhysicalBounds,type PolyhedronVector} from './polyhedron-contract.ts';
import {triangulatedPolygonGeometry,type PhysicalPolygon} from './triangulated-polygon.ts';
import * as I from './pyramid-interval.ts';

export interface TrapezohedronConfiguration {readonly provider:'physical-pentagonal-trapezohedron';readonly version:1;readonly identity:SurfaceIdentity;readonly role:'exterior'|'interior';readonly radiusMeters:number}
/** Similar conventional pentagonal trapezohedra. R is the ring radius and the
 * pole height; ring z = +/-R(1-cos36)/(1+cos36). The plane through a pole and
 * two adjacent upper-ring vertices contains the lower-ring vertex between them:
 * (R+h)/(2(R-h)) = 1/(2cos36). This gives ten genuine planar convex kites. */
export function createTrapezohedronGeometry(input:TrapezohedronConfiguration){
 assertIdentity(input.identity);const radius=input.radiusMeters;
 if(input.provider!=='physical-pentagonal-trapezohedron'||input.version!==1||!['exterior','interior'].includes(input.role)||!Number.isFinite(radius)||radius<1||radius>1e9)throw RangeError('Trapezohedron requires a radius from 1 through 1,000,000,000 m.');
 const identity=Object.freeze({...input.identity}),metadata=Object.freeze({provider:input.provider,version:1 as const,identity,role:input.role,radiusMeters:radius});
 const zero=I.exact(0),one=I.exact(1),two=I.exact(2),r=I.exact(radius),c=I.divide(I.add(one,I.root(I.exact(5))),I.exact(4)),s=I.root(I.subtract(one,I.square(c))),h=I.multiply(r,I.divide(I.subtract(one,c),I.add(one,c)));
 const c2=I.subtract(I.multiply(two,I.square(c)),one),s2=I.multiply(two,I.multiply(s,c));
 const xy=[[one,zero],[c,s],[c2,s2],[I.neg(c2),s2],[I.neg(c),s],[I.neg(one),zero],[I.neg(c),I.neg(s)],[I.neg(c2),I.neg(s2)],[c2,I.neg(s2)],[c,I.neg(s)]];
 const vertexBounds:PolyhedronPhysicalBounds[]=[[zero,zero,r],[zero,zero,I.neg(r)],...xy.map(([x,y],i)=>[I.multiply(r,x!),I.multiply(r,y!),i%2?I.neg(h):h] as PolyhedronPhysicalBounds)];
 const cv=(a:I.Interval)=>a[0]+(a[1]-a[0])/2,vertices=vertexBounds.map(p=>p.map(cv) as unknown as PolyhedronVector),polygons:PhysicalPolygon[]=[];
 // Winding is outward, including the bottom pole.
 for(let i=0;i<5;i++){const e=2+2*i,o=2+(2*i+1)%10,next=2+(2*i+2)%10,prev=2+(2*i+9)%10;polygons.push({id:`north-${i+1}`,vertices:[0,e,o,next]},{id:`south-${i+1}`,vertices:[1,o,e,prev]});}
 const ratio=I.divide(I.subtract(one,c),I.add(one,c));
 // Direct plane formula: x + ((1-c)/(2*h/R))*z = (1+c)/2.
 const zCoefficient=I.divide(I.subtract(one,c),I.multiply(two,ratio)),planeRadius=I.divide(I.multiply(r,I.divide(I.add(one,c),two)),I.root(I.add(one,I.square(zCoefficient))));
 const g=triangulatedPolygonGeometry({metadata,vertices:freezePolyhedronArrays(vertices),vertexBounds:freezePolyhedronArrays(vertexBounds),polygons:Object.freeze(polygons.map(p=>Object.freeze({id:p.id,vertices:Object.freeze([...p.vertices])}))),scaleMeters:radius,minimumDimensionMeters:2*planeRadius[0]});
 const circumradiusMeters=Math.hypot(radius,cv(h)),inradiusMeters=cv(planeRadius);
 return Object.freeze({...g,heightMeters:2*radius,equatorialDiameterMeters:2*radius,diameterMeters:2*circumradiusMeters,circumradiusMeters,inradiusMeters,volumeMeters3:g.surfaceAreaMeters2*inradiusMeters/3,inradiusInterval:freezePolyhedronArrays(planeRadius)});
}
export type TrapezohedronGeometry=ReturnType<typeof createTrapezohedronGeometry>;
