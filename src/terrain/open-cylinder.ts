import {createOpenCylinderGeometry,type OpenCylinderConfiguration,type OpenCylinderPatch,type OpenCylinderPosition} from '../surfaces/open-cylinder.ts';
import {createIndexedFloat32Authority,type IndexedPatchBlock} from './indexed-float32.ts';
import type {SurfaceIdentity} from '../surfaces/contracts.ts';
import type {CylinderResolution} from './cylindrical.ts';
import {defineWorld} from '../surfaces/world.ts';
export const OPEN_CYLINDER_REPRESENTATION='annular-cylinder-periodic-rings' as const;
export interface OpenCylinderSampleAddress extends SurfaceIdentity {readonly patchId:OpenCylinderPatch;readonly column:number;readonly row:number}
export interface OpenCylinderSampleKey extends SurfaceIdentity,CylinderResolution {readonly terrainId:string;readonly representation:typeof OPEN_CYLINDER_REPRESENTATION;readonly representationVersion:1;readonly outerRadiusMeters:number;readonly innerRadiusMeters:number;readonly lengthMeters:number;readonly index:number}
export function openCylinderSampleCount(r:CylinderResolution){
 if(!Number.isInteger(r.angularSamples)||r.angularSamples<4||r.angularSamples>1024||!Number.isInteger(r.axialCells)||r.axialCells<2||r.axialCells>512||!Number.isInteger(r.radialCells)||r.radialCells<2||r.radialCells>256)throw RangeError('Open-cylinder resolution requires angular 4-1024, axial 2-512 and half-rim radial 2-256 integers.');
 return r.angularSamples*(2*r.axialCells+4*r.radialCells);
}
/** A single connected parent authority. Both walls have independent words;
 * their common annuli and every physical crease have exactly one canonical word.
 * No terrain-sized alias or neighbor table is retained. */
export function createOpenCylinderTerrain(options:{terrainId:string;geometry:OpenCylinderConfiguration;resolution:CylinderResolution;initialElevation?:number;validateSample?:(index:number,height:number,before:number)=>void}){
 if(typeof options.terrainId!=='string'||!options.terrainId.trim()||options.terrainId.length>128)throw RangeError('Open-cylinder terrain identity must contain 1-128 characters.');
 const count=openCylinderSampleCount(options.resolution),geometry=createOpenCylinderGeometry(options.geometry),{angularSamples:A,axialCells:Z,radialCells:P}=options.resolution,T=geometry.thicknessMeters,L=geometry.metadata.lengthMeters,ro=geometry.metadata.outerRadiusMeters,ri=geometry.metadata.innerRadiusMeters;
 const Q=2*Z+4*P,resolution=Object.freeze({angularSamples:A,axialCells:Z,radialCells:P}),identity=geometry.identity;
 const metadata=Object.freeze({terrainId:options.terrainId,identity,geometry:geometry.metadata,representation:Object.freeze({provider:OPEN_CYLINDER_REPRESENTATION,version:1 as const,resolution,ownership:'one-cyclic-meridian-wall-owned-creases-midpoint-tie-exterior' as const}),elevationUnits:'meters' as const,seaLevel:0});
 const minElevation=-Math.min(T,L)/4,maxElevation=Math.min(T/2,ri/4,L/4),validateElevation=(v:number)=>{if(v<minElevation||v>maxElevation)throw RangeError('Elevation exceeds open-cylinder shell clearance.');};
 const authority=createIndexedFloat32Authority({count,initialElevation:options.initialElevation??0,validateElevation,validateSample:options.validateSample});
 const wrap=(column:number)=>((column%A)+A)%A;
 const keyAt=(index:number):OpenCylinderSampleKey=>{if(!Number.isSafeInteger(index)||index<0||index>=count)throw RangeError('Invalid open-cylinder canonical index.');return{...identity,...resolution,terrainId:metadata.terrainId,representation:OPEN_CYLINDER_REPRESENTATION,representationVersion:1,outerRadiusMeters:ro,innerRadiusMeters:ri,lengthMeters:L,index};};
 const checkedKey=(key:OpenCylinderSampleKey)=>{if(key.worldId!==identity.worldId||key.surfaceId!==identity.surfaceId||key.terrainId!==metadata.terrainId||key.representation!==OPEN_CYLINDER_REPRESENTATION||key.representationVersion!==1||key.outerRadiusMeters!==ro||key.innerRadiusMeters!==ri||key.lengthMeters!==L||key.angularSamples!==A||key.axialCells!==Z||key.radialCells!==P)throw RangeError('Foreign open-cylinder authority or geometry key.');keyAt(key.index);return key.index;};
 const checkedAddress=(p:OpenCylinderSampleAddress)=>{if(p.worldId!==identity.worldId||p.surfaceId!==identity.surfaceId||!['outer-wall','inner-wall','rim-start','rim-end'].includes(p.patchId)||!Number.isSafeInteger(p.column)||!Number.isInteger(p.row)||p.row<0||p.row>(p.patchId.endsWith('wall')?Z:2*P))throw RangeError('Invalid or foreign annular sample address.');return{...p,column:wrap(p.column)};};
 const rowAt=(p:OpenCylinderSampleAddress)=>p.patchId==='outer-wall'?p.row:p.patchId==='rim-end'?Z+p.row:p.patchId==='inner-wall'?Z+2*P+p.row:2*Z+2*P+p.row;
 const resolve=(p:OpenCylinderSampleAddress)=>{const q=checkedAddress(p);return keyAt((rowAt(q)%Q)*A+q.column);};
 const owner=(key:OpenCylinderSampleKey):OpenCylinderSampleAddress=>{const index=checkedKey(key),row=Math.floor(index/A),column=index%A;
  if(row<=Z)return{...identity,patchId:'outer-wall',row,column};
  if(row<Z+2*P)return{...identity,patchId:'rim-end',row:row-Z,column};
  if(row<=2*Z+2*P)return{...identity,patchId:'inner-wall',row:row-Z-2*P,column};
  return{...identity,patchId:'rim-start',row:row-2*Z-2*P,column};
 };
 const aliases=(key:OpenCylinderSampleKey)=>{const p=owner(key);if(p.patchId==='outer-wall'&&(p.row===0||p.row===Z))return[p,{...p,patchId:p.row===0?'rim-start':'rim-end',row:p.row===0?2*P:0}as OpenCylinderSampleAddress];
  if(p.patchId==='inner-wall'&&(p.row===0||p.row===Z))return[p,{...p,patchId:p.row===0?'rim-end':'rim-start',row:p.row===0?2*P:0}as OpenCylinderSampleAddress];return[p];};
 const positionAt=(input:OpenCylinderSampleAddress):OpenCylinderPosition=>{const p=checkedAddress(input);return geometry.normalize({...identity,patchId:p.patchId,u:2*Math.PI*p.column/A,v:p.patchId.endsWith('wall')?L*(p.row/Z):T*(p.row/(2*P))});};
 const meridianRow=(key:OpenCylinderSampleKey)=>Math.floor(checkedKey(key)/A);
 const rowGeometry=(row:number)=>{row=((row%Q)+Q)%Q;const p=owner(keyAt(row*A)),q=geometry.physical(positionAt(p));return{radius:q.radius,z:q.z,patchId:p.patchId,meridian:geometry.meridianAt(positionAt(p))};};
 const meridianSpacing=(first:number,second:number)=>{const a=rowGeometry(first).meridian,b=rowGeometry(second).meridian,d=Math.abs(a-b);return Math.min(d,geometry.meridianLengthMeters-d);};
 const neighbors=(key:OpenCylinderSampleKey)=>{const index=checkedKey(key),row=Math.floor(index/A),column=index%A;return[keyAt(row*A+wrap(column-1)),keyAt(row*A+wrap(column+1)),keyAt(((row+Q-1)%Q)*A+column),keyAt(((row+1)%Q)*A+column)].sort((a,b)=>a.index-b.index);};
 return Object.freeze({metadata,geometry,sampleCount:count,elevationByteLength:authority.byteLength,keyAt,resolve,owner,aliases,positionAt,neighbors,meridianRow,rowGeometry,meridianSpacing,minElevation,maxElevation,
  referencePositionAt:(key:OpenCylinderSampleKey)=>geometry.referencePosition(positionAt(owner(key))),get revision(){return authority.revision;},read:(key:OpenCylinderSampleKey)=>authority.read(checkedKey(key)),write:(key:OpenCylinderSampleKey,value:number)=>authority.write(checkedKey(key),value),
  commitPreparedPatch:(key:OpenCylinderSampleKey,revision:number,blocks:readonly IndexedPatchBlock[])=>{checkedKey(key);return authority.commitPreparedPatch(revision,blocks);},copyElevations:authority.copyElevations,snapshot:()=>Object.freeze({metadata,revision:authority.revision,elevations:authority.copyElevations()}),
  *samples(){for(let i=0;i<count;i++)yield keyAt(i);},
 });
}
export type OpenCylinderTerrain=ReturnType<typeof createOpenCylinderTerrain>;
export interface OpenCylinderWorldConfiguration extends OpenCylinderConfiguration {readonly terrainId:string}
export function createOpenCylinderWorld(input:OpenCylinderWorldConfiguration,resolution:CylinderResolution,initialElevation=0){
 let protection=(_index:number,_height:number,_before:number)=>{};
 const terrain=createOpenCylinderTerrain({terrainId:input.terrainId,geometry:input,resolution,initialElevation,validateSample:(i,h,b)=>protection(i,h,b)}),geometry=terrain.geometry;
 const configuration=Object.freeze({...geometry.metadata,terrainId:terrain.metadata.terrainId}),definition=defineWorld({id:geometry.identity.worldId,shape:{kind:'open-cylinder',configuration:'both-open',outerRadiusMeters:geometry.metadata.outerRadiusMeters,innerRadiusMeters:geometry.metadata.innerRadiusMeters,lengthMeters:geometry.metadata.lengthMeters},surfaces:[{identity:geometry.identity,role:'custom',terrainId:terrain.metadata.terrainId,topology:{id:'physical-open-cylinder-boundary',version:1},representation:{id:OPEN_CYLINDER_REPRESENTATION,version:1}}]});
 return Object.freeze({configuration,definition,geometry,terrain,elevationByteLength:terrain.elevationByteLength,setExcavationProtection:(validate:(index:number,height:number,before:number)=>void)=>{protection=validate;}});
}
export type OpenCylinderWorld=ReturnType<typeof createOpenCylinderWorld>;
