import {assertIdentity,IDENTITY_TRANSPORT,type SurfaceIdentity,type SurfacePosition,type SurfaceTangent} from './contracts.ts';
import {cylinderAngle,type CylinderVector} from './cylinder.ts';

export const OPEN_CYLINDER_PATCHES=Object.freeze(['outer-wall','rim-end','inner-wall','rim-start']as const);
export type OpenCylinderPatch=typeof OPEN_CYLINDER_PATCHES[number];
export type OpenCylinderScope='exterior'|'interior';
export function assertOpenCylinderPatch(patch:string):asserts patch is OpenCylinderPatch{if(!(OPEN_CYLINDER_PATCHES as readonly string[]).includes(patch))throw RangeError('An actual open-cylinder wall or annular rim is required.');}
export interface OpenCylinderConfiguration {
 readonly identity:SurfaceIdentity;readonly provider:'physical-open-cylinder';readonly version:1;readonly configuration:'both-open';
 readonly outerRadiusMeters:number;readonly innerRadiusMeters:number;readonly lengthMeters:number;
}
export interface OpenCylinderPosition extends SurfacePosition {readonly patchId:OpenCylinderPatch}
export function openCylinderDimensions(input:Pick<OpenCylinderConfiguration,'outerRadiusMeters'|'innerRadiusMeters'|'lengthMeters'>){const ro=input.outerRadiusMeters,ri=input.innerRadiusMeters,L=input.lengthMeters,T=ro-ri;if(![ro,ri,L].every(v=>Number.isFinite(v)&&v>=1&&v<=1e9)||![L/ro,L/ri].every(v=>v>=.1&&v<=20)||T<Math.max(.001,ro*1e-9))throw RangeError('Open Cylinder requires resolved nested radii and supported physical dimensions.');return Object.freeze({outerRadiusMeters:ro,innerRadiusMeters:ri,lengthMeters:L,thicknessMeters:T});}

/** One connected material boundary. Scope is a logical editing selection, not a
 * second surface identity. u is physical angle; v follows the oriented meridian:
 * outer wall +Z, end rim inward, inner wall -Z, start rim outward. All charts
 * are right handed, including the two annuli; no disk centers exist. */
export function createOpenCylinderGeometry(input:OpenCylinderConfiguration){
 assertIdentity(input.identity);
 const {outerRadiusMeters:ro,innerRadiusMeters:ri,lengthMeters:L,thicknessMeters:T}=openCylinderDimensions(input);
 if(input.provider!=='physical-open-cylinder'||input.version!==1||input.configuration!=='both-open'||[input.identity.worldId,input.identity.surfaceId].some(id=>id.length>128)
 )throw RangeError('Open Cylinder requires both open ends and supported versioned identities.');
 const identity=Object.freeze({worldId:input.identity.worldId,surfaceId:input.identity.surfaceId}),metadata:OpenCylinderConfiguration=Object.freeze({identity,provider:'physical-open-cylinder',version:1,configuration:'both-open',outerRadiusMeters:ro,innerRadiusMeters:ri,lengthMeters:L}),perimeter=2*(L+T),limits=[L,T,L,T],offsets=[0,L,L+T,2*L+T];
 const patchIndex=(patch:string)=>{const i=(OPEN_CYLINDER_PATCHES as readonly string[]).indexOf(patch);if(i<0)throw RangeError('An actual open-cylinder wall or annular rim is required.');return i;};
 const normalize=(p:SurfacePosition):OpenCylinderPosition=>{
  if(p.worldId!==identity.worldId||p.surfaceId!==identity.surfaceId)throw RangeError('Foreign open-cylinder surface.');const i=patchIndex(p.patchId);
  if(!Number.isFinite(p.v)||p.v<0||p.v>limits[i]!)throw RangeError('Position is outside its open-cylinder chart.');
  return Object.freeze({...identity,patchId:OPEN_CYLINDER_PATCHES[i]!,u:cylinderAngle(p.u),v:p.v===0?0:p.v});
 };
 const physical=(input:SurfacePosition)=>{const p=normalize(input);switch(p.patchId){
  case'outer-wall':return{theta:p.u,radius:ro,z:p.v};
  case'inner-wall':return{theta:p.u,radius:ri,z:L-p.v};
  case'rim-end':return{theta:p.u,radius:p.v===T?ri:ro-p.v,z:L};
  case'rim-start':return{theta:p.u,radius:p.v===T?ro:ri+p.v,z:0};
 }};
 const referencePosition=(p:SurfacePosition):CylinderVector=>{const q=physical(p);return[q.radius*Math.cos(q.theta),q.radius*Math.sin(q.theta),q.z];};
 const normal=(input:SurfacePosition):CylinderVector=>{const p=normalize(input);return p.patchId==='outer-wall'?[Math.cos(p.u),Math.sin(p.u),0]:p.patchId==='inner-wall'?[-Math.cos(p.u),-Math.sin(p.u),0]:[0,0,p.patchId==='rim-end'?1:-1];};
 const tangentVector=(input:SurfacePosition,t:SurfaceTangent):CylinderVector=>{
  const p=normalize(input),q=physical(p);if(![t.du,t.dv].every(Number.isFinite))throw RangeError('Finite open-cylinder tangent required.');
  const s=Math.sin(p.u),c=Math.cos(p.u),angular=t.du*q.radius,radial=p.patchId==='rim-start'?t.dv:p.patchId==='rim-end'?-t.dv:0,axial=p.patchId==='outer-wall'?t.dv:p.patchId==='inner-wall'?-t.dv:0;
  const result:CylinderVector=[-s*angular+c*radial,c*angular+s*radial,axial];if(!result.every(Number.isFinite))throw RangeError('Open-cylinder tangent overflow.');return result;
 };
 const meridianAt=(input:SurfacePosition)=>{const p=normalize(input);return offsets[patchIndex(p.patchId)]!+p.v;};
 const fromMeridian=(angle:number,meters:number):OpenCylinderPosition=>{
  if(!Number.isFinite(meters))throw RangeError('Finite cyclic meridian coordinate required.');const remainder=meters%perimeter,m=remainder<0?remainder+perimeter:remainder;
  let i=3;for(let j=0;j<3;j++)if(m<offsets[j+1]!){i=j;break;}return normalize({...identity,patchId:OPEN_CYLINDER_PATCHES[i]!,u:angle,v:m-offsets[i]!});
 };
 const crossRim=(input:SurfacePosition)=>{const p=normalize(input),i=patchIndex(p.patchId);if(p.v!==0&&p.v!==limits[i])throw RangeError('A physical wall/rim crease is required.');
  const next=p.v===0?(i+3)%4:(i+1)%4;return Object.freeze({position:normalize({...p,patchId:OPEN_CYLINDER_PATCHES[next]!,v:p.v===0?limits[next]!:0}),transport:IDENTITY_TRANSPORT});
 };
 const canonicalScope=(input:SurfacePosition):OpenCylinderScope=>{const p=normalize(input);return p.patchId==='outer-wall'?'exterior':p.patchId==='inner-wall'?'interior':physical(p).radius>=(ro+ri)/2?'exterior':'interior';};
 return Object.freeze({identity,metadata,thicknessMeters:T,meridianLengthMeters:perimeter,normalize,physical,referencePosition,normal,tangentVector,meridianAt,fromMeridian,crossRim,canonicalScope,
  aliases:(input:SurfacePosition)=>{const p=normalize(input),i=patchIndex(p.patchId);return p.v===0||p.v===limits[i]?Object.freeze([p,crossRim(p).position]):Object.freeze([p]);},
  advance:(input:SurfacePosition,d:SurfaceTangent)=>{const p=normalize(input);if(![d.du,d.dv].every(Number.isFinite))throw RangeError('Finite chart displacement required.');return Object.freeze({position:fromMeridian(p.u+d.du,meridianAt(p)+d.dv),transport:IDENTITY_TRANSPORT});},
 });
}
export type OpenCylinderGeometry=ReturnType<typeof createOpenCylinderGeometry>;
