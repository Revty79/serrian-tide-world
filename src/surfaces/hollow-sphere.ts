import {assertIdentity,type SurfacePosition,type PatchEdge,type SurfaceTangent} from './contracts.ts';
import {createCubeSphereGeometry,scale3,type Vec3} from './cube-sphere.ts';

export const HOLLOW_SPHERE_ROLES=['exterior','interior'] as const;
export type HollowSphereRole=typeof HOLLOW_SPHERE_ROLES[number];
export interface HollowSphereConfiguration {
 readonly provider:'physical-hollow-sphere';readonly version:1;readonly worldId:string;
 readonly outerRadiusMeters:number;readonly innerRadiusMeters:number;
 readonly surfaces:Readonly<Record<HollowSphereRole,{readonly surfaceId:string;readonly terrainId:string}>>;
}
export function hollowSphereDimensions(input:{outerRadiusMeters:number;innerRadiusMeters:number}){
 const {outerRadiusMeters:outer,innerRadiusMeters:inner}=input??{},thickness=outer-inner;
 if(!Number.isFinite(inner)||!Number.isFinite(outer)||inner<1||outer>1e12||!(inner<outer)||thickness<Math.max(.001,outer*1e-9))throw RangeError('Hollow sphere requires 1 m ≤ inner radius < outer radius ≤ 1 trillion m, with shell thickness at least 0.001 m and one billionth of the outer radius.');
 return Object.freeze({outerRadiusMeters:outer,innerRadiusMeters:inner,wallThicknessMeters:thickness,cavityVolumeMeters3:4*Math.PI/3*inner**3,shellVolumeMeters3:4*Math.PI/3*thickness*(outer*outer+outer*inner+inner*inner)});
}
export function hollowSphereConfiguration(input:HollowSphereConfiguration):HollowSphereConfiguration{
 const d=hollowSphereDimensions(input);
 if(input.provider!=='physical-hollow-sphere'||input.version!==1||!input.surfaces)throw RangeError('Version 1 hollow sphere configuration required.');
 const surfaces={} as Record<HollowSphereRole,{surfaceId:string;terrainId:string}>;
 for(const role of HOLLOW_SPHERE_ROLES){const s=input.surfaces[role];if(!s)throw RangeError('Both spherical surfaces are required.');assertIdentity({worldId:input.worldId,surfaceId:s.surfaceId});for(const id of[input.worldId,s.surfaceId,s.terrainId])if(typeof id!=='string'||!id.trim()||id.length>128)throw RangeError('Hollow sphere identities require 1–128 characters.');surfaces[role]=Object.freeze({surfaceId:s.surfaceId,terrainId:s.terrainId});}
 if(surfaces.exterior.surfaceId===surfaces.interior.surfaceId||surfaces.exterior.terrainId===surfaces.interior.terrainId)throw RangeError('Spherical surfaces require independent identities.');
 return Object.freeze({provider:'physical-hollow-sphere',version:1,worldId:input.worldId,outerRadiusMeters:d.outerRadiusMeters,innerRadiusMeters:d.innerRadiusMeters,surfaces:Object.freeze(surfaces)});
}
/** Intrinsic round-sphere kernel, with an inward right-handed chart adapter.
 * Heights always increase toward the selected surface's physical normal. */
export function createHollowSphereSurfaceGeometry(input:HollowSphereConfiguration,role:HollowSphereRole){
 const parent=hollowSphereConfiguration(input);if(!HOLLOW_SPHERE_ROLES.includes(role))throw RangeError('Unknown spherical surface role.');
 const orientation=role==='interior'?-1:1,radiusMeters=role==='interior'?parent.innerRadiusMeters:parent.outerRadiusMeters;
 const kernel=createCubeSphereGeometry({worldId:parent.worldId,surfaceId:parent.surfaces[role].surfaceId},radiusMeters);
 const reflect=<T extends SurfacePosition>(p:T):T=>({...p,v:p.v===0?0:orientation*p.v});
 const toReferenceChart=(p:SurfacePosition)=>kernel.canonicalPosition(reflect(p));
 const fromReferenceChart=(p:SurfacePosition)=>reflect(kernel.canonicalPosition(p));
 const edge=(e:PatchEdge):PatchEdge=>orientation===-1&&e.startsWith('v')?(e==='v-min'?'v-max':'v-min'):e;
 const direction=(p:SurfacePosition)=>kernel.direction(reflect(p));
 const normal=(p:SurfacePosition):Vec3=>scale3(direction(p),orientation);
 return Object.freeze({identity:kernel.identity,role,orientation,radiusMeters,kernel,toReferenceChart,fromReferenceChart,direction,normal,
  positionsForDirection:(d:Vec3)=>kernel.positionsForDirection(d).map(reflect),
  referencePosition:(p:SurfacePosition)=>kernel.referencePosition(reflect(p)),
  elevatedPosition:(p:SurfacePosition,h:number):Vec3=>{assertHollowSphereElevation(parent,role,h);return scale3(direction(p),radiusMeters+orientation*h);},
  tangentVector:(p:SurfacePosition,t:SurfaceTangent)=>kernel.tangentVector(reflect(p),{du:t.du,dv:orientation*t.dv}),
  crossEdge:(p:SurfacePosition,e:PatchEdge)=>{const r=kernel.crossEdge(reflect(p),edge(e)),t=r.transport;return{position:reflect(r.position),transport:{uu:t.uu,uv:t.uv*orientation,vu:t.vu*orientation,vv:t.vv}};},
  metric:{distance:(a:SurfacePosition,b:SurfacePosition)=>kernel.metric.distance(reflect(a),reflect(b))},
 });
}
export function hollowSphereElevationBounds(input:HollowSphereConfiguration,role:HollowSphereRole){
 if(!HOLLOW_SPHERE_ROLES.includes(role))throw RangeError('Unknown spherical surface role.');
 const d=hollowSphereDimensions(input);return{min:-d.wallThicknessMeters/4,max:role==='interior'?d.innerRadiusMeters/2:d.outerRadiusMeters};
}
export function assertHollowSphereElevation(input:HollowSphereConfiguration,role:HollowSphereRole,h:number){
 hollowSphereElevationValidator(input,role)(h);
}
export function hollowSphereElevationValidator(input:HollowSphereConfiguration,role:HollowSphereRole){
 const {min,max}=hollowSphereElevationBounds(input,role);
 return(h:number)=>{const v=Math.fround(h);if(!Number.isFinite(v)||v<min||v>max)throw RangeError(`${role==='interior'?'Inside':'Outside'} elevation must remain between ${min} and ${max} m to preserve shell and cavity clearance. Reduce strength or Undo; heights are not clamped.`);};
}
