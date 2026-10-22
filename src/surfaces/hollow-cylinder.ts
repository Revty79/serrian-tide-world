import {assertIdentity,type SurfacePosition,type SurfaceTangent} from './contracts.ts';
import {createCylinderGeometry,type CylinderVector} from './cylinder.ts';
export const HOLLOW_CYLINDER_ROLES=['exterior','interior']as const;
export type HollowCylinderRole=typeof HOLLOW_CYLINDER_ROLES[number];
export interface HollowCylinderConfiguration {
 readonly provider:'physical-hollow-cylinder';readonly version:1;readonly configuration:'capped';readonly worldId:string;
 readonly outerRadiusMeters:number;readonly innerRadiusMeters:number;readonly outerLengthMeters:number;readonly innerLengthMeters:number;
 readonly surfaces:Readonly<Record<HollowCylinderRole,{readonly surfaceId:string;readonly terrainId:string}>>;
}
export function hollowCylinderDimensions(input:{outerRadiusMeters:number;innerRadiusMeters:number;outerLengthMeters:number;innerLengthMeters:number}){
 const{outerRadiusMeters:outer,innerRadiusMeters:inner,outerLengthMeters:length,innerLengthMeters:inside}=input??{},radial=outer-inner,end=(length-inside)/2;
 if(![outer,inner,length,inside].every(v=>Number.isFinite(v)&&v>=1&&v<=1e9)||![length/outer,inside/inner].every(v=>v>=.1&&v<=20)||radial<Math.max(.001,outer*1e-9)||end<Math.max(.001,length*1e-9))throw RangeError('A capped hollow cylinder requires nested radii and lengths from 1 to 1 billion m, each length/radius ratio from 0.1 to 20, with radial and each end thickness at least 0.001 m and one billionth of its outer dimension.');
 return Object.freeze({outerRadiusMeters:outer,innerRadiusMeters:inner,outerLengthMeters:length,innerLengthMeters:inside,radialThicknessMeters:radial,endThicknessMeters:end,minimumThicknessMeters:Math.min(radial,end),cavityVolumeMeters3:Math.PI*inner*inner*inside,shellVolumeMeters3:Math.PI*(radial*(outer+inner)*length+inner*inner*2*end)});
}
export function hollowCylinderConfiguration(input:HollowCylinderConfiguration):HollowCylinderConfiguration{
 const d=hollowCylinderDimensions(input);
 if(input.provider!=='physical-hollow-cylinder'||input.version!==1||input.configuration!=='capped'||!input.surfaces)throw RangeError('Version 1 capped hollow cylinder configuration required.');
 const surfaces={}as Record<HollowCylinderRole,{surfaceId:string;terrainId:string}>;
 for(const role of HOLLOW_CYLINDER_ROLES){const s=input.surfaces[role];if(!s)throw RangeError('Both cylindrical surfaces are required.');assertIdentity({worldId:input.worldId,surfaceId:s.surfaceId});for(const id of[input.worldId,s.surfaceId,s.terrainId])if(typeof id!=='string'||!id.trim()||id.length>128)throw RangeError('Hollow cylindrical identities require 1-128 characters.');surfaces[role]=Object.freeze({surfaceId:s.surfaceId,terrainId:s.terrainId});}
 if(surfaces.exterior.surfaceId===surfaces.interior.surfaceId||surfaces.exterior.terrainId===surfaces.interior.terrainId)throw RangeError('Cylindrical surfaces require independent identities.');
 return Object.freeze({provider:'physical-hollow-cylinder',version:1,configuration:'capped',worldId:input.worldId,outerRadiusMeters:d.outerRadiusMeters,innerRadiusMeters:d.innerRadiusMeters,outerLengthMeters:d.outerLengthMeters,innerLengthMeters:d.innerLengthMeters,surfaces:Object.freeze(surfaces)});
}
/** The accepted kernel keeps z in [0,L]. Only this parent adapter translates to
 * shared centered XYZ. Inner u reflection reverses normals with right-handed
 * side/cap charts, without changing kernel topology, rim ownership or metrics. */
export function createHollowCylinderSurfaceGeometry(input:HollowCylinderConfiguration,role:HollowCylinderRole){
 const parent=hollowCylinderConfiguration(input);if(!HOLLOW_CYLINDER_ROLES.includes(role))throw RangeError('Unknown cylindrical surface role.');
 const orientation=role==='interior'?-1:1,radiusMeters=role==='interior'?parent.innerRadiusMeters:parent.outerRadiusMeters,lengthMeters=role==='interior'?parent.innerLengthMeters:parent.outerLengthMeters;
 const kernel=createCylinderGeometry({identity:{worldId:parent.worldId,surfaceId:parent.surfaces[role].surfaceId},provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters,lengthMeters});
 const reflect=<T extends SurfacePosition>(p:T):T=>({...p,u:p.u===0?0:orientation*p.u}),toReferenceChart=(p:SurfacePosition)=>kernel.normalize(reflect(p)),fromReferenceChart=(p:SurfacePosition)=>reflect(kernel.normalize(p));
 const normal=(p:SurfacePosition)=>kernel.normal(toReferenceChart(p)).map(v=>v*orientation)as unknown as CylinderVector;
 const referencePosition=(p:SurfacePosition):CylinderVector=>{const q=kernel.referencePosition(toReferenceChart(p));return[q[0],q[1],q[2]-lengthMeters/2];};
 return Object.freeze({identity:kernel.identity,role,orientation,radiusMeters,lengthMeters,kernel,toReferenceChart,fromReferenceChart,normalize:(p:SurfacePosition)=>fromReferenceChart(toReferenceChart(p)),normal,referencePosition,
  elevatedPosition:(p:SurfacePosition,height:number):CylinderVector=>{hollowCylinderElevationValidator(parent,role)(height);const q=referencePosition(p),n=normal(p);return q.map((v,i)=>v+n[i]!*height)as unknown as CylinderVector;},
  tangentVector:(p:SurfacePosition,t:SurfaceTangent)=>kernel.tangentVector(toReferenceChart(p),{du:orientation*t.du,dv:t.dv}),
  crossRim:(p:SurfacePosition)=>{const r=kernel.crossRim(toReferenceChart(p)),t=r.transport;return{position:fromReferenceChart(r.position),transport:{uu:t.uu,uv:t.uv*orientation,vu:t.vu*orientation,vv:t.vv}};},
  sameRegionDistance:(a:SurfacePosition,b:SurfacePosition)=>kernel.sameRegionDistance(toReferenceChart(a),toReferenceChart(b)),
  globalDistance:(a:SurfacePosition,b:SurfacePosition,options?:Parameters<typeof kernel.globalDistance>[2])=>kernel.globalDistance(toReferenceChart(a),toReferenceChart(b),options),
 });
}
export function hollowCylinderElevationBounds(input:HollowCylinderConfiguration,role:HollowCylinderRole){
 if(!HOLLOW_CYLINDER_ROLES.includes(role))throw RangeError('Unknown cylindrical surface role.');const d=hollowCylinderDimensions(input);return{min:-d.minimumThicknessMeters/4,max:role==='interior'?Math.min(d.innerRadiusMeters/2,d.innerLengthMeters/4):Math.min(d.outerRadiusMeters,d.outerLengthMeters)};
}
export function hollowCylinderElevationValidator(input:HollowCylinderConfiguration,role:HollowCylinderRole){
 const{min,max}=hollowCylinderElevationBounds(input,role);return(height:number)=>{const h=Math.fround(height);if(!Number.isFinite(h)||h<min||h>max)throw RangeError(`${role==='interior'?'Inside':'Outside'} cylinder elevation must stay between ${min} and ${max} m to preserve shell/cavity clearance. Reduce strength or Undo; heights are not clamped.`);};
}
