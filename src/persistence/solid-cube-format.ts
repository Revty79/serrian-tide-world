import {createSolidCubeGeometry,SOLID_CUBE_FACES} from '../surfaces/solid-cube.ts';
import {createSolidCubeTerrain,solidCubeSampleCount,type SolidCubeTerrain} from '../terrain/solid-cube.ts';
import {assertInteractiveCube} from '../editor/cube-configuration.ts';
import {SAVE_FORMAT,record,textField,numberField,type SavedMapSummary} from './terrain-format.ts';
import {payloadChecksum} from './heightmap-payload.ts';
import {workStep,type PersistenceWork} from './cooperative-work.ts';

export const SOLID_CUBE_SAVE_VERSION=5;
export const MAX_SAVED_SOLID_CUBE_BYTES=(6*256**2+2)*4;
const BLOCK=8192;
export interface SavedSolidCubeHeightmap extends SavedMapSummary {
 format:typeof SAVE_FORMAT;formatVersion:5;metadata:SolidCubeTerrain['metadata'];sampleCount:number;
 elevationEncoding:'float32-le-canonical';elevations:ArrayBuffer;checksum:string;
}
function exact(value:Record<string,unknown>,keys:string[]){const actual=Object.keys(value).sort(),expected=[...keys].sort();if(actual.length!==expected.length||actual.some((key,i)=>key!==expected[i]))throw Error('Unsupported solid cube record fields.');}
/** Strict, bounded header validation precedes any sample allocation. Every field is checksum-covered. */
export function solidCubeHeader(value:unknown){
 const root=record(value);exact(root,['format','formatVersion','id','name','savedAt','metadata','sampleCount','elevationEncoding','elevations','checksum']);
 const meta=record(root.metadata),identity=record(meta.identity),geometry=record(meta.geometry),geometryIdentity=record(geometry.identity),rep=record(meta.representation);
 exact(meta,['terrainId','identity','geometry','representation','elevationUnits','seaLevel']);exact(identity,['worldId','surfaceId']);exact(geometryIdentity,['worldId','surfaceId']);
 exact(geometry,['identity','provider','version','configuration','role','sideLengthMeters']);exact(rep,['provider','version','cellsPerEdge','ownership','faces']);
 if(root.format!==SAVE_FORMAT||root.formatVersion!==5||root.elevationEncoding!=='float32-le-canonical'||meta.elevationUnits!=='meters'||!Object.is(meta.seaLevel,0)
  ||geometry.provider!=='physical-solid-cube'||geometry.version!==1||geometry.configuration!=='solid'||geometry.role!=='exterior'
  ||rep.provider!=='physical-cube-shared-boundary-vertices'||rep.version!==1||rep.ownership!=='first-incident-face'
  ||!Array.isArray(rep.faces)||rep.faces.length!==6||Object.keys(rep.faces).length!==6||Object.keys(rep.faces).some((key,i)=>key!==String(i))||rep.faces.some((face,i)=>face!==SOLID_CUBE_FACES[i]))throw Error('Unsupported cube geometry, representation, units, face order or ownership.');
 const id=textField(root.id,128),name=textField(root.name,120),savedAt=textField(root.savedAt,32),worldId=textField(identity.worldId,128),surfaceId=textField(identity.surfaceId,128);
 if(id!==textField(meta.terrainId,128)||worldId!==geometryIdentity.worldId||surfaceId!==geometryIdentity.surfaceId
  ||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(savedAt)||!Number.isFinite(Date.parse(savedAt))||new Date(savedAt).toISOString()!==savedAt)throw Error('Invalid cube identity or save date.');
 const sideLengthMeters=numberField(geometry.sideLengthMeters),cellsPerEdge=numberField(rep.cellsPerEdge);assertInteractiveCube(sideLengthMeters,cellsPerEdge);
 const sampleCount=solidCubeSampleCount(cellsPerEdge);if(root.sampleCount!==sampleCount)throw Error('Incorrect canonical cube sample count.');
 const physical=createSolidCubeGeometry({identity:{worldId,surfaceId},provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters});
 const metadata:SolidCubeTerrain['metadata']={terrainId:id,identity:physical.identity,geometry:physical.metadata,representation:{provider:'physical-cube-shared-boundary-vertices',version:1,cellsPerEdge,ownership:'first-incident-face',faces:SOLID_CUBE_FACES},elevationUnits:'meters',seaLevel:0};
 return{format:SAVE_FORMAT,formatVersion:5,id,name,savedAt,metadata,sampleCount,elevationEncoding:'float32-le-canonical'} as const;
}
export async function validateSolidCubeHeightmap(value:unknown,work:PersistenceWork={}):Promise<SavedSolidCubeHeightmap>{
 const header=solidCubeHeader(value),root=record(value),input=root.elevations;
 if(!(input instanceof ArrayBuffer)||input.byteLength!==header.sampleCount*4||input.byteLength>MAX_SAVED_SOLID_CUBE_BYTES)throw Error('Incorrect cube elevation byte length.');
 if(typeof root.checksum!=='string'||!/^[a-f0-9]{64}$/.test(root.checksum))throw Error('Invalid cube checksum.');
 const elevations=input.slice(0),checksum=root.checksum,view=new DataView(elevations);
 for(let first=0;first<header.sampleCount;first+=BLOCK){for(let i=first;i<Math.min(header.sampleCount,first+BLOCK);i++)if(!Number.isFinite(view.getFloat32(i*4,true)))throw Error('Saved cube elevations must be finite.');await workStep(work,'Validating cube samples',Math.min(1,(first+BLOCK)/header.sampleCount));}
 work.progress?.('Checking cube integrity',0);if(await payloadChecksum(header,elevations)!==checksum)throw Error('Cube checksum failed; metadata or terrain may be corrupt.');
 return{...header,elevations,checksum};
}
export async function encodeSolidCubeHeightmap(terrain:SolidCubeTerrain,name:string,savedAt=new Date().toISOString(),work:PersistenceWork={}):Promise<SavedSolidCubeHeightmap>{
 const header=solidCubeHeader({format:SAVE_FORMAT,formatVersion:5,id:terrain.metadata.terrainId,name:name.trim(),savedAt,metadata:terrain.metadata,sampleCount:terrain.sampleCount,elevationEncoding:'float32-le-canonical',elevations:null,checksum:null});
 const revision=terrain.revision,source=terrain.copyElevations(),words=new Uint32Array(source.buffer),elevations=new ArrayBuffer(source.byteLength),view=new DataView(elevations);
 for(let first=0;first<source.length;first+=BLOCK){for(let i=first;i<Math.min(source.length,first+BLOCK);i++){if(!Number.isFinite(source[i]))throw Error('Saved cube elevations must be finite.');view.setUint32(i*4,words[i]!,true);}await workStep(work,'Encoding cube samples',Math.min(1,(first+BLOCK)/source.length));}
 work.progress?.('Computing cube integrity',0);const checksum=await payloadChecksum(header,elevations);if(terrain.revision!==revision)throw Error('Cube changed while saving. Edits are retained; finish drawing and retry.');
 return{...header,elevations,checksum};
}
export async function decodeSolidCubeHeightmap(value:unknown,work:PersistenceWork={}){
 const saved=await validateSolidCubeHeightmap(value,work),meta=saved.metadata,terrain=createSolidCubeTerrain({terrainId:meta.terrainId,geometry:meta.geometry,cellsPerEdge:meta.representation.cellsPerEdge}),view=new DataView(saved.elevations);
 for(let first=0;first<saved.sampleCount;first+=BLOCK){for(let i=first;i<Math.min(saved.sampleCount,first+BLOCK);i++)terrain.write(terrain.keyAt(i),view.getFloat32(i*4,true));await workStep(work,'Restoring cube terrain',Math.min(1,(first+BLOCK)/saved.sampleCount));}
 return{terrain,name:saved.name};
}
