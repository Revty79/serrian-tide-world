import type {HollowCylinderWorld} from '../terrain/hollow-cylinder.ts';
import {cylinderHoleCut,type CylinderThroughHole} from './hollow-cylinder-holes.ts';
import {rayCapsuleInterval,type ExcavationPrimitive} from './hollow-cube-csg.ts';
import {dot3,unitDirection,type Vec3} from './cube-sphere.ts';
import {segmentPointDistance,type PhysicalPassage} from './passages.ts';
export interface CylinderExcavation {readonly radiusMeters:number;readonly outerHalfLength:number;readonly innerRatio:number;readonly innerHalfLength:number;readonly primitives:readonly ExcavationPrimitive[]}
export function cylinderCutPrimitives(w:HollowCylinderWorld,holes:readonly CylinderThroughHole[],passages:readonly PhysicalPassage[]=[]){return[...holes.map(h=>cylinderHoleCut(w,h)),...passages.flatMap(p=>{const nodes=new Map(p.nodes.map(n=>[n.id,n]));return[...p.nodes.map(n=>({a:n.position,b:n.position,r:n.radiusMeters})),...p.segments.map(s=>({a:nodes.get(s.from)!.position,b:nodes.get(s.to)!.position,r:s.radiusMeters}))];})];}
export function cylinderExcavation(w:HollowCylinderWorld,holes:readonly CylinderThroughHole[],passages:readonly PhysicalPassage[]=[]):CylinderExcavation{const d=w.dimensions,r=d.outerRadiusMeters;return Object.freeze({radiusMeters:r,outerHalfLength:d.outerLengthMeters/(2*r),innerRatio:d.innerRadiusMeters/r,innerHalfLength:d.innerLengthMeters/(2*r),primitives:Object.freeze(cylinderCutPrimitives(w,holes,passages).map(c=>({a:c.a.map(v=>v/r)as unknown as Vec3,b:c.b.map(v=>v/r)as unknown as Vec3,radius:c.r/r})))});}
/** Exact finite cylinder: radial disk interval intersected with axial slab.
 * d is unit length. Parallel/tangent rays never invent cap or wall crossings. */
export function finiteCylinderInterval(o:Vec3,d:Vec3,r:number,h:number):readonly[number,number]|undefined{
 const a=d[0]**2+d[1]**2,b=o[0]*d[0]+o[1]*d[1],c=o[0]**2+o[1]**2-r*r;let low=-Infinity,high=Infinity;
 if(a>1e-30){const delta=b*b-a*c;if(delta<0)return;const root=Math.sqrt(delta),q=-b-(b<0?-root:root),x=q===0?-b/a:q/a,y=q===0?x:c/q;low=Math.min(x,y);high=Math.max(x,y);}else if(c>0)return;
 if(Math.abs(d[2])>1e-15){const x=(-h-o[2])/d[2],y=(h-o[2])/d[2];low=Math.max(low,Math.min(x,y));high=Math.min(high,Math.max(x,y));}else if(Math.abs(o[2])>h)return;
 return low<=high?[low,high]:undefined;
}
export interface CylinderExcavationHit {readonly distance:number;readonly point:Vec3;readonly normal:Vec3;readonly kind:'exterior'|'interior'|'rock';readonly region:'side'|'cap-start'|'cap-end'}
export function traceCylinderExcavation(m:CylinderExcavation,o:Vec3,direction:Vec3):CylinderExcavationHit|undefined{
 const d=unitDirection(direction),outer=finiteCylinderInterval(o,d,1,m.outerHalfLength);if(!outer||outer[1]<=0)return;const inner=finiteCylinderInterval(o,d,m.innerRatio,m.innerHalfLength),free:{interval:readonly[number,number];primitive:number}[]=[];
 if(inner)free.push({interval:inner,primitive:-1});m.primitives.forEach((p,i)=>{const interval=rayCapsuleInterval(o,d,p);if(interval)free.push({interval,primitive:i});});
 let cursor=Math.max(0,outer[0]),which=-2;free.sort((a,b)=>a.interval[0]-b.interval[0]);for(const item of free){if(item.interval[0]>cursor+1e-10)break;if(item.interval[1]>cursor){cursor=item.interval[1];which=item.primitive;}}if(cursor>=outer[1]-1e-10)return;
 const point=o.map((v,i)=>v+d[i]!*cursor)as unknown as Vec3;
 if(which>=0){const p=m.primitives[which]!,axis=p.b.map((v,i)=>v-p.a[i]!)as unknown as Vec3,v=point.map((x,i)=>x-p.a[i]!)as unknown as Vec3,len=dot3(axis,axis),t=len?Math.max(0,Math.min(1,dot3(v,axis)/len)):0;return{distance:cursor,point,normal:unitDirection(p.a.map((v,i)=>v+axis[i]!*t-point[i]!)as unknown as Vec3),kind:'rock',region:'side'};}
 const kind=which===-1?'interior':'exterior',r=kind==='interior'?m.innerRatio:1,h=kind==='interior'?m.innerHalfLength:m.outerHalfLength,radial=Math.hypot(point[0],point[1]),region=Math.abs(Math.abs(point[2])-h)<Math.abs(radial-r)?point[2]<0?'cap-start':'cap-end':'side',n:Vec3=region==='side'?[point[0]/radial,point[1]/radial,0]:[0,0,region==='cap-start'?-1:1];return{distance:cursor,point,normal:n.map(v=>v*(kind==='interior'?-1:1))as unknown as Vec3,kind,region};
}
export function cylinderFreeVolume(m:CylinderExcavation,pMeters:Vec3,marginMeters=0){if(pMeters.length!==3||!pMeters.every(Number.isFinite)||!Number.isFinite(marginMeters)||marginMeters<0)throw RangeError('Finite physical cylinder eye and clearance required.');const p=pMeters.map(v=>v/m.radiusMeters)as unknown as Vec3,b=marginMeters/m.radiusMeters,r=Math.hypot(p[0],p[1]);return r>1+b||Math.abs(p[2])>m.outerHalfLength+b||(r<m.innerRatio-b&&Math.abs(p[2])<m.innerHalfLength-b)||m.primitives.some(c=>c.radius>b&&segmentPointDistance(p,c.a,c.b)<c.radius-b);}
