import {SAVE_FORMAT,record} from './terrain-format.ts';
import {sphericalHeader} from './spherical-format.ts';
import {payloadChecksum} from './heightmap-payload.ts';
import {workStep,type PersistenceWork} from './cooperative-work.ts';
import {crescentCutGlobeGeometry,type CrescentCutGlobeDimensions} from '../surfaces/crescent-cut-globe.ts';
import {createCrescentCutGlobeWorld} from '../terrain/crescent-cut-globe.ts';
import {prepareCrescentCutGlobeSession,validateCutGlobeEditing,type CrescentCutGlobeSession,type CutGlobeEditing} from '../editor/crescent-cut-globe-session.ts';
export const CRESCENT_CUT_GLOBE_SAVE_VERSION=45;
const exact=(v:Record<string,unknown>,keys:readonly string[])=>{if(JSON.stringify(Object.keys(v).sort())!==JSON.stringify([...keys].sort()))throw Error('Unsupported Crescent-Cut Globe record fields.');};
export function cutGlobeHeader(input:unknown){
 const root=record(input);exact(root,['format','formatVersion','id','name','savedAt','metadata','editing','sampleCount','elevationEncoding','elevations','checksum']);
 const metadata=record(root.metadata),geometry=record(metadata.geometry);exact(metadata,['provider','version','geometry','intrinsic']);exact(geometry,['provider','version','construction','radiusMeters','separationRatio','longitudeDegrees','latitudeDegrees','cutterRadiusMeters','axis']);
 if(root.format!==SAVE_FORMAT||root.formatVersion!==45||root.elevationEncoding!=='float32-le-canonical'||metadata.provider!=='crescent-cut-globe-world'||metadata.version!==1)throw Error('Unsupported Crescent-Cut Globe format or construction.');
 const g=crescentCutGlobeGeometry(geometry as unknown as CrescentCutGlobeDimensions);for(const [key,value] of Object.entries(g))if(JSON.stringify(geometry[key])!==JSON.stringify(value))throw Error('Inconsistent Crescent-Cut Globe physical geometry.');
 if(!Array.isArray(geometry.axis)||Object.keys(geometry.axis).length!==3)throw Error('Invalid cut axis.');
 const native=sphericalHeader({format:root.format,formatVersion:3,id:root.id,name:root.name,savedAt:root.savedAt,metadata:metadata.intrinsic,sampleCount:root.sampleCount,elevationEncoding:root.elevationEncoding,elevations:root.elevations,checksum:root.checksum});
 // sphericalHeader has exact-key checks; construct the numerical header explicitly.
 return finishHeader(root,g,native);
}
function finishHeader(root:Record<string,unknown>,g:ReturnType<typeof crescentCutGlobeGeometry>,native:ReturnType<typeof sphericalHeader>){
 const n=native.metadata;if(n.geometry.radiusMeters!==g.radiusMeters||![128,256].includes(n.representation.cellsPerEdge)||new Set([n.terrainId,n.identity.worldId,n.identity.surfaceId]).size!==3)throw Error('Invalid Crescent-Cut Globe intrinsic identity, radius or detail.');
 const metadata={provider:'crescent-cut-globe-world' as const,version:1 as const,geometry:g,intrinsic:n};
 const editing=validateCutGlobeEditing({geometry:g},root.editing as CutGlobeEditing);
 return{format:SAVE_FORMAT,formatVersion:45 as const,id:native.id,name:native.name,savedAt:native.savedAt,metadata,editing,sampleCount:native.sampleCount,elevationEncoding:'float32-le-canonical' as const};
}
export type SavedCrescentCutGlobe=ReturnType<typeof cutGlobeHeader>&{elevations:ArrayBuffer;checksum:string};
export async function validateCutGlobe(input:unknown,work:PersistenceWork={}):Promise<SavedCrescentCutGlobe>{
 const header=cutGlobeHeader(input),root=record(input),source=root.elevations;
 if(!(source instanceof ArrayBuffer)||source.byteLength!==header.sampleCount*4||source.byteLength>1572872||typeof root.checksum!=='string'||!/^[a-f0-9]{64}$/.test(root.checksum))throw Error('Invalid Crescent-Cut Globe payload or checksum.');
 const elevations=source.slice(0),checksum=root.checksum,data=new DataView(elevations);for(let first=0;first<header.sampleCount;first+=16384){for(let i=first;i<Math.min(first+16384,header.sampleCount);i++)if(!Number.isFinite(data.getFloat32(i*4,true)))throw Error('Invalid Crescent-Cut Globe terrain word.');await workStep(work,'Validating Crescent-Cut Globe terrain',Math.min(1,(first+16384)/header.sampleCount));}
 if(await payloadChecksum(header,elevations)!==checksum)throw Error('Crescent-Cut Globe checksum failed; current World is retained.');return{...header,elevations,checksum};
}
export async function encodeCutGlobe(editor:CrescentCutGlobeSession,savedAt=new Date().toISOString(),work:PersistenceWork={}):Promise<SavedCrescentCutGlobe>{
 if(editor.painting)throw Error('Finish accepted Crescent-Cut Globe input before Save.');editor.captureEditing();const t=editor.terrain,revision=t.revision;
 const header=cutGlobeHeader({format:SAVE_FORMAT,formatVersion:45,id:t.metadata.terrainId,name:editor.name.trim(),savedAt,metadata:editor.world.metadata,editing:editor.editing,sampleCount:t.sampleCount,elevationEncoding:'float32-le-canonical',elevations:null,checksum:null}),source=t.copyElevations(),words=new Uint32Array(source.buffer),elevations=new ArrayBuffer(source.byteLength),data=new DataView(elevations);
 for(let first=0;first<t.sampleCount;first+=16384){for(let i=first;i<Math.min(first+16384,t.sampleCount);i++){if(!Number.isFinite(source[i]))throw Error('Invalid Crescent-Cut Globe terrain word.');data.setUint32(i*4,words[i]!,true);}await workStep(work,'Encoding Crescent-Cut Globe terrain',Math.min(1,(first+16384)/t.sampleCount));}
 const checksum=await payloadChecksum(header,elevations);if(t.revision!==revision)throw Error('Crescent-Cut Globe changed during Save; retry.');return{...header,elevations,checksum};
}
export async function decodeCutGlobe(input:unknown,work:PersistenceWork={}){
 const saved=await validateCutGlobe(input,work),meta=saved.metadata.intrinsic,world=createCrescentCutGlobeWorld({terrainId:meta.terrainId,identity:meta.identity,dimensions:saved.metadata.geometry,detail:meta.representation.cellsPerEdge as 128|256}),data=new DataView(saved.elevations);
 for(let first=0;first<saved.sampleCount;first+=16384){for(let i=first;i<Math.min(first+16384,saved.sampleCount);i++)world.terrain.write(world.terrain.keyAt(i),data.getFloat32(i*4,true));await workStep(work,'Restoring Crescent-Cut Globe terrain',Math.min(1,(first+16384)/saved.sampleCount));}
 return prepareCrescentCutGlobeSession(world,saved.name,true,work,saved.editing);
}
