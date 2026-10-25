import {SAVE_FORMAT,record} from './terrain-format.ts';
import {sphericalHeader} from './spherical-format.ts';
import {payloadChecksum} from './heightmap-payload.ts';
import {workStep,type PersistenceWork} from './cooperative-work.ts';
import {ROUNDED_CRESCENT_DEFAULTS,roundedCrescentGeometry,type RoundedCrescentDimensions} from '../surfaces/rounded-crescent-globe.ts';
import {createRoundedCrescentWorld} from '../terrain/rounded-crescent-globe.ts';
import {prepareRoundedCrescentSession,validateRoundedEditing,type RoundedCrescentSession,type RoundedCrescentEditing} from '../editor/rounded-crescent-session.ts';
export const ROUNDED_CRESCENT_SAVE_VERSION=46;
const exact=(v:Record<string,unknown>,keys:readonly string[])=>{if(JSON.stringify(Object.keys(v).sort())!==JSON.stringify([...keys].sort()))throw Error('Unsupported Rounded Crescent Globe record fields.');};
export function roundedCrescentHeader(input:unknown){
 const root=record(input);exact(root,['format','formatVersion','id','name','savedAt','metadata','editing','sampleCount','elevationEncoding','elevations','checksum']);
 const metadata=record(root.metadata),geometry=record(metadata.geometry);exact(metadata,['provider','version','geometry','coordinates']);exact(geometry,Object.keys(roundedCrescentGeometry(ROUNDED_CRESCENT_DEFAULTS)));
 if(root.format!==SAVE_FORMAT||root.formatVersion!==46||root.elevationEncoding!=='float32-le-canonical'||metadata.provider!=='rounded-crescent-globe-world'||metadata.version!==1)throw Error('Unsupported Rounded Crescent Globe format or construction.');
 const g=roundedCrescentGeometry(geometry as unknown as RoundedCrescentDimensions);for(const [key,value] of Object.entries(g))if(JSON.stringify(geometry[key])!==JSON.stringify(value))throw Error('Inconsistent Rounded Crescent Globe physical geometry.');
 const native=sphericalHeader({format:root.format,formatVersion:3,id:root.id,name:root.name,savedAt:root.savedAt,metadata:metadata.coordinates,sampleCount:root.sampleCount,elevationEncoding:root.elevationEncoding,elevations:root.elevations,checksum:root.checksum});
 // sphericalHeader has exact-key checks; construct the numerical header explicitly.
 return finishHeader(root,g,native);
}
function finishHeader(root:Record<string,unknown>,g:ReturnType<typeof roundedCrescentGeometry>,native:ReturnType<typeof sphericalHeader>){
 const n=native.metadata;if(n.geometry.radiusMeters!==g.scaleMeters||![128,256].includes(n.representation.cellsPerEdge)||new Set([n.terrainId,n.identity.worldId,n.identity.surfaceId]).size!==3)throw Error('Invalid Rounded Crescent Globe coordinates identity, radius or detail.');
 const metadata={provider:'rounded-crescent-globe-world' as const,version:1 as const,geometry:g,coordinates:n};
 const editing=validateRoundedEditing({geometry:g},root.editing as RoundedCrescentEditing);
 return{format:SAVE_FORMAT,formatVersion:46 as const,id:native.id,name:native.name,savedAt:native.savedAt,metadata,editing,sampleCount:native.sampleCount,elevationEncoding:'float32-le-canonical' as const};
}
export type SavedRoundedCrescent=ReturnType<typeof roundedCrescentHeader>&{elevations:ArrayBuffer;checksum:string};
export async function validateRoundedCrescent(input:unknown,work:PersistenceWork={}):Promise<SavedRoundedCrescent>{
 const header=roundedCrescentHeader(input),root=record(input),source=root.elevations;
 if(!(source instanceof ArrayBuffer)||source.byteLength!==header.sampleCount*4||source.byteLength>1572872||typeof root.checksum!=='string'||!/^[a-f0-9]{64}$/.test(root.checksum))throw Error('Invalid Rounded Crescent Globe payload or checksum.');
 const elevations=source.slice(0),checksum=root.checksum,data=new DataView(elevations);for(let first=0;first<header.sampleCount;first+=16384){for(let i=first;i<Math.min(first+16384,header.sampleCount);i++)if(!Number.isFinite(data.getFloat32(i*4,true))||Math.abs(data.getFloat32(i*4,true))>header.metadata.geometry.elevationLimitMeters)throw Error('Invalid Rounded Crescent Globe terrain word.');await workStep(work,'Validating Rounded Crescent Globe terrain',Math.min(1,(first+16384)/header.sampleCount));}
 if(await payloadChecksum(header,elevations)!==checksum)throw Error('Rounded Crescent Globe checksum failed; current World is retained.');return{...header,elevations,checksum};
}
export async function encodeRoundedCrescent(editor:RoundedCrescentSession,savedAt=new Date().toISOString(),work:PersistenceWork={}):Promise<SavedRoundedCrescent>{
 if(editor.painting)throw Error('Finish accepted Rounded Crescent Globe input before Save.');editor.captureEditing();const t=editor.terrain,revision=t.revision;
 const header=roundedCrescentHeader({format:SAVE_FORMAT,formatVersion:46,id:t.metadata.terrainId,name:editor.name.trim(),savedAt,metadata:editor.world.metadata,editing:editor.editing,sampleCount:t.sampleCount,elevationEncoding:'float32-le-canonical',elevations:null,checksum:null}),source=t.copyElevations(),words=new Uint32Array(source.buffer),elevations=new ArrayBuffer(source.byteLength),data=new DataView(elevations);
 for(let first=0;first<t.sampleCount;first+=16384){for(let i=first;i<Math.min(first+16384,t.sampleCount);i++){if(!Number.isFinite(source[i])||Math.abs(source[i]!)>editor.world.geometry.elevationLimitMeters)throw Error('Invalid Rounded Crescent Globe terrain word.');data.setUint32(i*4,words[i]!,true);}await workStep(work,'Encoding Rounded Crescent Globe terrain',Math.min(1,(first+16384)/t.sampleCount));}
 const checksum=await payloadChecksum(header,elevations);if(t.revision!==revision)throw Error('Rounded Crescent Globe changed during Save; retry.');return{...header,elevations,checksum};
}
export async function decodeRoundedCrescent(input:unknown,work:PersistenceWork={}){
 const saved=await validateRoundedCrescent(input,work),meta=saved.metadata.coordinates,world=createRoundedCrescentWorld({terrainId:meta.terrainId,identity:meta.identity,dimensions:saved.metadata.geometry,detail:meta.representation.cellsPerEdge as 128|256}),data=new DataView(saved.elevations);
 for(let first=0;first<saved.sampleCount;first+=16384){for(let i=first;i<Math.min(first+16384,saved.sampleCount);i++)world.terrain.write(world.terrain.keyAt(i),data.getFloat32(i*4,true));await workStep(work,'Restoring Rounded Crescent Globe terrain',Math.min(1,(first+16384)/saved.sampleCount));}
 return prepareRoundedCrescentSession(world,saved.name,true,work,saved.editing);
}
