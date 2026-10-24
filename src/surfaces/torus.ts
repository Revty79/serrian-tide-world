import {assertIdentity,type SurfaceIdentity,type SurfacePosition} from './contracts.ts';
import type {Vec3} from './cube-sphere.ts';
export const TORUS_TAU=2*Math.PI;
export const torusAngle=(a:number)=>{if(!Number.isFinite(a))throw RangeError('Finite torus angle required.');const t=a%TORUS_TAU;return t<0?t+TORUS_TAU:t===0?0:t;};
export const torusDelta=(a:number)=>{const t=torusAngle(a);return t>Math.PI?t-TORUS_TAU:t;};
export interface TorusConfiguration{readonly provider:'physical-circular-torus';readonly version:1;readonly identity:SurfaceIdentity;readonly role:'exterior';readonly majorRadiusMeters:number;readonly minorRadiusMeters:number}
export function createTorusGeometry(input:TorusConfiguration){
 assertIdentity(input.identity);const R=input.majorRadiusMeters,r=input.minorRadiusMeters;
 if(input.provider!=='physical-circular-torus'||input.version!==1||input.role!=='exterior'||![R,r].every(Number.isFinite)||r<10000||R>1e9||R/r<3||R/r>4)throw RangeError('Torus tube radius must be at least 10,000 m; major radius at most 1,000,000,000 m and 3–4 times the tube radius.');
 const identity=Object.freeze({...input.identity}),metadata=Object.freeze({provider:input.provider,version:1 as const,identity,role:input.role,majorRadiusMeters:R,minorRadiusMeters:r});
 const normalize=(p:SurfacePosition)=>{if(p.worldId!==identity.worldId||p.surfaceId!==identity.surfaceId||p.patchId!=='tube')throw RangeError('Foreign torus surface.');return{...identity,patchId:'tube',u:torusAngle(p.u),v:torusAngle(p.v)};};
 const referencePosition=(p:SurfacePosition):Vec3=>{const q=normalize(p),a=R+r*Math.cos(q.v);return[a*Math.cos(q.u),a*Math.sin(q.u),r*Math.sin(q.v)];};
 const frame=(p:SurfacePosition)=>{const q=normalize(p),cu=Math.cos(q.u),su=Math.sin(q.u),cv=Math.cos(q.v),sv=Math.sin(q.v);return{normal:[cv*cu,cv*su,sv] as Vec3,major:[-su,cu,0] as Vec3,minor:[-sv*cu,-sv*su,cv] as Vec3,majorMetersPerRadian:R+r*cv,minorMetersPerRadian:r};};
 return Object.freeze({metadata,identity,normalize,referencePosition,frame,normal:(p:SurfacePosition)=>frame(p).normal,surfaceAreaMeters2:4*Math.PI**2*R*r,volumeMeters3:2*Math.PI**2*R*r*r,scaleMeters:R+r,elevationLimitMeters:r/8,
  signedDistance:(p:Vec3)=>Math.hypot(Math.hypot(p[0],p[1])-R,p[2])-r,
  positionAtReference:(p:Vec3)=>normalize({...identity,patchId:'tube',u:Math.atan2(p[1],p[0]),v:Math.atan2(p[2],Math.hypot(p[0],p[1])-R)}),
 });
}
export type TorusGeometry=ReturnType<typeof createTorusGeometry>;
