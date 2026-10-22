import type {ThroughHole} from './through-hole.ts';
import type {HollowSphereWorld} from '../terrain/hollow-sphere.ts';
import type {SurfacePosition} from './contracts.ts';
import {unitDirection,QUARTER_PI,type Vec3} from './cube-sphere.ts';
import {passageId} from './passages.ts';

/** Same independent hole object/identity contract as the cube. Its cutter is
 * radial and intersects a spherical shell, never a cube face or tunnel graph. */
export type RadialThroughHole=Omit<ThroughHole,'geometry'>&{readonly geometry:'circular-radial'};
const exact=(v:unknown,keys:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==keys.toSorted().join(','))throw RangeError('Unsupported radial hole fields.');};
export function sphereHoleRadiusBounds(world:HollowSphereWorld){return{min:world.dimensions.outerRadiusMeters*1e-5,max:Math.min(world.dimensions.innerRadiusMeters*.1,world.dimensions.wallThicknessMeters*.25)};}
export function normalizeSphereAnchor(world:HollowSphereWorld,p:SurfacePosition){
 exact(p,['worldId','surfaceId','patchId','u','v']);const g=world.select(p).geometry;
 if(![p.u,p.v].every(v=>Number.isFinite(v)&&v>=-QUARTER_PI&&v<=QUARTER_PI))throw RangeError('Spherical anchor is outside its chart.');
 g.direction(p);return{...p}; // Preserve exact anchor angles; repeated atan/tan canonicalization can drift.
}
export function validateSphereHole(world:HollowSphereWorld,input:RadialThroughHole):RadialThroughHole{
 exact(input,['kind','version','id','worldId','geometry','radiusMeters','mouths']);
 if(input.kind!=='through-hole'||input.version!==1||input.geometry!=='circular-radial'||input.worldId!==world.definition.id)throw RangeError('Unsupported radial hole geometry or parent World.');
 passageId(input.id);const{min,max}=sphereHoleRadiusBounds(world),r=input.radiusMeters;
 if(world.dimensions.wallThicknessMeters<world.dimensions.outerRadiusMeters*1e-4||!Number.isFinite(r)||r<min||r>max)throw RangeError(`Radial hole radius must be ${min} to ${max} m; shell thickness must be at least 0.01% of the outer radius.`);
 if(!Array.isArray(input.mouths)||input.mouths.length!==2||Object.keys(input.mouths).join(',')!=='0,1')throw RangeError('A radial hole needs exactly two corresponding mouths.');
 const mouths=input.mouths.map(m=>{exact(m,['id','position']);passageId(m.id);return Object.freeze({id:m.id,position:Object.freeze(normalizeSphereAnchor(world,m.position))});});
 if(mouths[0]!.id===mouths[1]!.id)throw RangeError('Hole mouths need independent identities.');
 const a=world.select(mouths[0]!.position),b=world.select(mouths[1]!.position);
 const da=a.geometry.direction(mouths[0]!.position),db=b.geometry.direction(mouths[1]!.position);
 if(a.role===b.role||Math.hypot(...da.map((v,i)=>v-db[i]!))>128*Number.EPSILON)throw RangeError('Radial mouths must align on opposite spherical surfaces.');
 return Object.freeze({kind:'through-hole',version:1,id:input.id,worldId:input.worldId,geometry:'circular-radial',radiusMeters:r,mouths:Object.freeze(mouths)});
}
export function cutSphereHoleAt(world:HollowSphereWorld,position:SurfacePosition,radiusMeters:number,id:string=crypto.randomUUID()):RadialThroughHole{
 const p=normalizeSphereAnchor(world,position),direction=world.select(p).geometry.direction(p);
 return validateSphereHole(world,{kind:'through-hole',version:1,id,worldId:world.definition.id,geometry:'circular-radial',radiusMeters,mouths:(['exterior','interior']as const).map(role=>({id:crypto.randomUUID(),position:world.surfaces[role].geometry.positionsForDirection(direction)[0]!}))});
}
export const resizeSphereHole=(world:HollowSphereWorld,hole:RadialThroughHole,radiusMeters:number)=>validateSphereHole(world,{...hole,radiusMeters});
export function moveSphereHole(world:HollowSphereWorld,hole:RadialThroughHole,position:SurfacePosition){
 const next=cutSphereHoleAt(world,position,hole.radiusMeters,hole.id);
 return validateSphereHole(world,{...next,mouths:next.mouths.map(m=>({...m,id:hole.mouths.find(old=>world.select(old.position).role===world.select(m.position).role)!.id}))});
}
/** End balls lie entirely in the exterior/cavity. The cut through material is a
 * genuine straight circular bore, clipped by the actual two spherical surfaces. */
export function sphereHoleCut(world:HollowSphereWorld,hole:RadialThroughHole){
 const p=hole.mouths[0]!.position,d=unitDirection(world.select(p).geometry.referencePosition(p)),r=hole.radiusMeters;
 return{a:d.map(v=>v*(world.dimensions.outerRadiusMeters+2*r))as unknown as Vec3,b:d.map(v=>v*(world.dimensions.innerRadiusMeters-2*r))as unknown as Vec3,r};
}
