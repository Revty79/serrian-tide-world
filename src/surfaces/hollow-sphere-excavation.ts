import type {HollowSphereWorld} from '../terrain/hollow-sphere.ts';
import {sphereHoleCut,type RadialThroughHole} from './hollow-sphere-holes.ts';
import {rayCapsuleInterval,type ExcavationPrimitive} from './hollow-cube-csg.ts';
import {dot3,unitDirection,type Vec3} from './cube-sphere.ts';
import {segmentPointDistance,type PhysicalPassage} from './passages.ts';

export interface SphereExcavation {readonly radiusMeters:number;readonly innerRatio:number;readonly primitives:readonly ExcavationPrimitive[]}
export function sphereCutPrimitives(world:HollowSphereWorld,holes:readonly RadialThroughHole[],passages:readonly PhysicalPassage[]=[]){
 return [...holes.map(h=>sphereHoleCut(world,h)),...passages.flatMap(p=>{const nodes=new Map(p.nodes.map(n=>[n.id,n]));return[...p.nodes.map(n=>({a:n.position,b:n.position,r:n.radiusMeters})),...p.segments.map(s=>({a:nodes.get(s.from)!.position,b:nodes.get(s.to)!.position,r:s.radiusMeters}))];})];
}
export function sphereExcavation(world:HollowSphereWorld,holes:readonly RadialThroughHole[],passages:readonly PhysicalPassage[]=[]):SphereExcavation{
 const radiusMeters=world.dimensions.outerRadiusMeters;
 return Object.freeze({radiusMeters,innerRatio:world.dimensions.innerRadiusMeters/radiusMeters,primitives:Object.freeze(sphereCutPrimitives(world,holes,passages).map(c=>({a:c.a.map(v=>v/radiusMeters)as unknown as Vec3,b:c.b.map(v=>v/radiusMeters)as unknown as Vec3,radius:c.r/radiusMeters})))});
}
/** Stable perpendicular-distance sphere interval, in normalized World units. */
export function sphereShellInterval(o:Vec3,d:Vec3,r:number):readonly[number,number]|undefined{
 const b=dot3(o,d),closest=o.map((v,i)=>v-b*d[i]!)as unknown as Vec3,q=r*r-dot3(closest,closest);if(q<0)return;const delta=Math.sqrt(q);return[-b-delta,-b+delta];
}
export interface SphereExcavationHit {readonly distance:number;readonly point:Vec3;readonly normal:Vec3;readonly kind:'exterior'|'interior'|'rock'}
/** Actual spherical shell DIFFERENCE (cavity UNION authored cuts). Shared
 * capsule interval arithmetic is geometry-neutral; box containment is not used. */
export function traceSphereExcavation(model:SphereExcavation,origin:Vec3,direction:Vec3):SphereExcavationHit|undefined{
 const d=unitDirection(direction),outer=sphereShellInterval(origin,d,1);if(!outer||outer[1]<=0)return;
 const inner=sphereShellInterval(origin,d,model.innerRatio),free:{interval:readonly[number,number];primitive:number}[]=[];
 if(inner)free.push({interval:inner,primitive:-1});model.primitives.forEach((p,i)=>{const interval=rayCapsuleInterval(origin,d,p);if(interval)free.push({interval,primitive:i});});
 let cursor=Math.max(0,outer[0]),which=-2;
 free.sort((a,b)=>a.interval[0]-b.interval[0]);for(const item of free){if(item.interval[0]>cursor+1e-10)break;if(item.interval[1]>cursor){cursor=item.interval[1];which=item.primitive;}}
 if(cursor>=outer[1]-1e-10)return;const point=origin.map((v,i)=>v+d[i]!*cursor)as unknown as Vec3;
 if(which>=0){const p=model.primitives[which]!,axis=p.b.map((v,i)=>v-p.a[i]!)as unknown as Vec3,v=point.map((x,i)=>x-p.a[i]!)as unknown as Vec3,len=dot3(axis,axis),t=len?Math.max(0,Math.min(1,dot3(v,axis)/len)):0;return{distance:cursor,point,normal:unitDirection(p.a.map((v,i)=>v+axis[i]!*t-point[i]!)as unknown as Vec3),kind:'rock'};}
 const kind=which===-1?'interior':'exterior',n=unitDirection(point);return{distance:cursor,point,normal:n.map(v=>v*(kind==='interior'?-1:1))as unknown as Vec3,kind};
}
export function sphereFreeVolume(model:SphereExcavation,pointMeters:Vec3,marginMeters=0){
 if(!Array.isArray(pointMeters)||pointMeters.length!==3||!pointMeters.every(Number.isFinite)||!Number.isFinite(marginMeters)||marginMeters<0)throw RangeError('A finite physical point and nonnegative clearance are required.');
 const p=pointMeters.map(v=>v/model.radiusMeters)as unknown as Vec3,m=marginMeters/model.radiusMeters,r=Math.hypot(...p);
 return r>1+m||r<model.innerRatio-m||model.primitives.some(c=>c.radius>m&&segmentPointDistance(p,c.a,c.b)<c.radius-m);
}
