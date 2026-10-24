import {createOpenCylinderGeometry,type OpenCylinderPatch} from './open-cylinder.ts';
import type {SurfaceIdentity,SurfacePosition,SurfaceTangent} from './contracts.ts';

export const RINGWORLD_REGIONS=Object.freeze([
 {id:'inner-wall',label:'Inner Band'}, {id:'outer-wall',label:'Outer Band'},
 {id:'rim-end',label:'Upper Rim'}, {id:'rim-start',label:'Lower Rim'},
] as const);
export interface RingworldDimensions {readonly innerRadiusMeters:number;readonly outerRadiusMeters:number;readonly widthMeters:number}
export interface RingworldConfiguration extends RingworldDimensions {readonly identity:SurfaceIdentity;readonly provider:'physical-rectangular-ringworld';readonly version:1}
/** Qualified band proportions keep physical cell spacing and local brush work
 * resolved. Larger circumferences are supported by scaling all dimensions;
 * arbitrarily thin or narrow rings require a later sampling qualification. */
export function ringworldDimensions(input:RingworldDimensions){
 const {innerRadiusMeters:ri,outerRadiusMeters:ro,widthMeters:W}=input,T=ro-ri;
 if(![ri,ro,W].every(Number.isFinite)||ri<10000||ro>1e9||T<400||W<400||T/ro<.08||T/ro>.25||W/ro<.15||W/ro>.5)throw RangeError('Ringworld requires radius ≥10,000 m, outer radius ≤1 billion m, width 15–50% and structural thickness 8–25% of outer radius (both ≥400 m).');
 return Object.freeze({innerRadiusMeters:ri,outerRadiusMeters:ro,widthMeters:W,structuralThicknessMeters:T});
}
export function createRingworldGeometry(input:RingworldConfiguration){
 const d=ringworldDimensions(input);
 if(input.provider!=='physical-rectangular-ringworld'||input.version!==1)throw RangeError('Unsupported Ringworld geometry provider.');
 const boundary=createOpenCylinderGeometry({identity:input.identity,provider:'physical-open-cylinder',version:1,configuration:'both-open',innerRadiusMeters:d.innerRadiusMeters,outerRadiusMeters:d.outerRadiusMeters,lengthMeters:d.widthMeters});
 const metadata:RingworldConfiguration=Object.freeze({identity:boundary.identity,provider:input.provider,version:1,innerRadiusMeters:d.innerRadiusMeters,outerRadiusMeters:d.outerRadiusMeters,widthMeters:d.widthMeters});
 const ri=d.innerRadiusMeters,ro=d.outerRadiusMeters,W=d.widthMeters;
 const regionArea=(patch:OpenCylinderPatch)=>patch==='inner-wall'?2*Math.PI*ri*W:patch==='outer-wall'?2*Math.PI*ro*W:Math.PI*(ro-ri)*(ro+ri);
 return Object.freeze({identity:boundary.identity,metadata,boundary,regions:RINGWORLD_REGIONS,structuralThicknessMeters:d.structuralThicknessMeters,
  areaSquareMeters:2*Math.PI*((ri+ro)*W+(ro-ri)*(ro+ri)),volumeCubicMeters:Math.PI*(ro-ri)*(ro+ri)*W,regionArea,
  normalize:boundary.normalize,referencePosition:boundary.referencePosition,normal:boundary.normal,aliases:boundary.aliases,crossRim:boundary.crossRim,
  metricSquared:(p:SurfacePosition,t:SurfaceTangent)=>{const vector=boundary.tangentVector(p,t);return vector.reduce((sum,v)=>sum+v*v,0);},
 });
}
export type RingworldGeometry=ReturnType<typeof createRingworldGeometry>;
