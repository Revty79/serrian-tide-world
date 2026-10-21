import {SAVE_FORMAT,record,textField,type SavedMapSummary} from './terrain-format.ts';
import {payloadChecksum} from './heightmap-payload.ts';
import {workStep,type PersistenceWork} from './cooperative-work.ts';
import {hollowCubeConfiguration,type HollowCubeConfiguration} from '../surfaces/hollow-cube.ts';
import {SOLID_CUBE_FACES} from '../surfaces/solid-cube.ts';
import {solidCubeSampleCount} from '../terrain/solid-cube.ts';
import {createHollowCubeWorld} from '../terrain/hollow-cube.ts';
import {assertInteractiveCube} from '../editor/cube-configuration.ts';
import {assertHollowElevation,HOLLOW_CONNECTION_BYTES,HOLLOW_ROLES,prepareHollowCubeDocument,validateHollowConnections,type HollowConnections,type HollowCubeDocument} from '../editor/hollow-cube-document.ts';

export interface SavedHollowCube extends SavedMapSummary {
 format:typeof SAVE_FORMAT;formatVersion:6;
 metadata:{configuration:HollowCubeConfiguration;cellsPerEdge:128|256;representation:'physical-cube-shared-boundary-vertices-v1';ownership:'first-incident-face';faces:typeof SOLID_CUBE_FACES;orientation:'outside-outward_inside-inward-v-reversed'};
 sampleCountPerSurface:number;selectedSurface:'exterior'|'interior';connections:HollowConnections;
 elevationEncoding:'float32-le-canonical-exterior-interior';elevations:ArrayBuffer;checksum:string;
}
const exact=(value:Record<string,unknown>,keys:string[])=>{if(Object.keys(value).sort().join(',')!==keys.sort().join(','))throw Error('Unsupported hollow World record fields.');};
export function hollowCubeHeader(value:unknown){
 const root=record(value);exact(root,['format','formatVersion','id','name','savedAt','metadata','sampleCountPerSurface','selectedSurface','connections','elevationEncoding','elevations','checksum']);
 if(root.format!==SAVE_FORMAT||root.formatVersion!==6||root.elevationEncoding!=='float32-le-canonical-exterior-interior'||!HOLLOW_ROLES.includes(root.selectedSurface as 'exterior'))throw Error('Unsupported hollow World format or surface.');
 const meta=record(root.metadata);exact(meta,['configuration','cellsPerEdge','representation','ownership','faces','orientation']);
 const config=record(meta.configuration);exact(config,['provider','version','worldId','outerSideLengthMeters','innerSideLengthMeters','surfaces']);const surfaces=record(config.surfaces);exact(surfaces,['exterior','interior']);for(const r of HOLLOW_ROLES)exact(record(surfaces[r]),['surfaceId','terrainId']);
 const configuration=hollowCubeConfiguration(config as unknown as HollowCubeConfiguration),n=meta.cellsPerEdge;assertInteractiveCube(configuration.outerSideLengthMeters,n as number);assertInteractiveCube(configuration.innerSideLengthMeters,n as number);
 if(meta.representation!=='physical-cube-shared-boundary-vertices-v1'||meta.ownership!=='first-incident-face'||meta.orientation!=='outside-outward_inside-inward-v-reversed'||JSON.stringify(meta.faces)!==JSON.stringify(SOLID_CUBE_FACES))throw Error('Unsupported hollow World representation or orientation.');
 const id=textField(root.id,128),name=textField(root.name,120),savedAt=textField(root.savedAt,32);if(id!==configuration.worldId||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(savedAt)||!Number.isFinite(Date.parse(savedAt))||new Date(savedAt).toISOString()!==savedAt)throw Error('Invalid hollow World identity or date.');
 const count=solidCubeSampleCount(n as number);if(root.sampleCountPerSurface!==count)throw Error('Incorrect hollow World sample count.');
 // Bound structured input before any terrain allocation, cloning, or hashing.
 const connections=record(root.connections);exact(connections,['links','passages']);if(!Array.isArray(connections.links)||!Array.isArray(connections.passages)||connections.links.length>128||connections.passages.length>8)throw Error('Oversized hollow World connections.');
 for(const p of connections.passages){const passage=record(p);if(!Array.isArray(passage.nodes)||passage.nodes.length>48||!Array.isArray(passage.segments)||passage.segments.length>48||!Array.isArray(passage.portals)||passage.portals.length>48)throw Error('Oversized excavation.');}
 if(JSON.stringify(connections).length>HOLLOW_CONNECTION_BYTES/2||new TextEncoder().encode(JSON.stringify(connections)).length>HOLLOW_CONNECTION_BYTES-4)throw Error('Oversized World connection data.');
 return{format:SAVE_FORMAT,formatVersion:6,id,name,savedAt,metadata:{configuration,cellsPerEdge:n as 128|256,representation:'physical-cube-shared-boundary-vertices-v1',ownership:'first-incident-face',faces:SOLID_CUBE_FACES,orientation:'outside-outward_inside-inward-v-reversed'},sampleCountPerSurface:count,selectedSurface:root.selectedSurface as 'exterior'|'interior',connections:structuredClone(connections) as unknown as HollowConnections,elevationEncoding:'float32-le-canonical-exterior-interior'} as const;
}
export async function validateHollowCube(value:unknown,work:PersistenceWork={}):Promise<SavedHollowCube>{
 const header=hollowCubeHeader(value),root=record(value),input=root.elevations;if(!(input instanceof ArrayBuffer)||input.byteLength!==header.sampleCountPerSurface*8||input.byteLength>(6*256**2+2)*8)throw Error('Incorrect hollow World elevation size.');
 if(typeof root.checksum!=='string'||!/^[a-f0-9]{64}$/.test(root.checksum))throw Error('Invalid hollow World checksum.');
 const elevations=input.slice(0),checksum=root.checksum;
 if(await payloadChecksum(header,elevations)!==checksum)throw Error('Hollow World checksum failed; the current World is retained.');
 const world=createHollowCubeWorld(header.metadata.configuration,header.metadata.cellsPerEdge);validateHollowConnections(world,header.connections);
 const view=new DataView(elevations),count=header.sampleCountPerSurface;
 for(let i=0;i<count*2;i++){assertHollowElevation(world,i<count?'exterior':'interior',view.getFloat32(i*4,true));if(i%8192===8191)await workStep(work,'Validating both hollow surfaces',i/(count*2));}
 return{...header,elevations,checksum};
}
export async function encodeHollowCube(editor:HollowCubeDocument,savedAt=new Date().toISOString(),work:PersistenceWork={}):Promise<SavedHollowCube>{
 const world=editor.world,n=world.surfaces.exterior.referenceTerrain.metadata.representation.cellsPerEdge,revision=editor.revision,revisions=HOLLOW_ROLES.map(r=>editor.sessions[r].terrain.revision);
 const header=hollowCubeHeader({format:SAVE_FORMAT,formatVersion:6,id:world.definition.id,name:editor.name.trim(),savedAt,metadata:{configuration:world.configuration,cellsPerEdge:n,representation:'physical-cube-shared-boundary-vertices-v1',ownership:'first-incident-face',faces:SOLID_CUBE_FACES,orientation:'outside-outward_inside-inward-v-reversed'},sampleCountPerSurface:world.surfaces.exterior.referenceTerrain.sampleCount,selectedSurface:editor.selectedSurface,connections:editor.connections,elevationEncoding:'float32-le-canonical-exterior-interior',elevations:null,checksum:null});
 const elevations=new ArrayBuffer(header.sampleCountPerSurface*8),view=new DataView(elevations);
 for(const [r,role] of HOLLOW_ROLES.entries()){const terrain=editor.sessions[role].terrain,source=terrain.copyElevations(),words=new Uint32Array(source.buffer);for(let i=0;i<source.length;i++){assertHollowElevation(world,role,source[i]!);view.setUint32((r*source.length+i)*4,words[i]!,true);if(i%8192===8191)await workStep(work,'Encoding both hollow surfaces',(r+i/source.length)/2);}}
 const checksum=await payloadChecksum(header,elevations);if(editor.revision!==revision||HOLLOW_ROLES.some((r,i)=>editor.sessions[r].terrain.revision!==revisions[i]))throw Error('World changed during Save. Finish the edit and retry.');return{...header,elevations,checksum};
}
export async function decodeHollowCube(value:unknown,work:PersistenceWork={}){
 const saved=await validateHollowCube(value,work),world=createHollowCubeWorld(saved.metadata.configuration,saved.metadata.cellsPerEdge),view=new DataView(saved.elevations),count=saved.sampleCountPerSurface;
 for(const [r,role] of HOLLOW_ROLES.entries()){const terrain=world.surfaces[role].referenceTerrain;for(let i=0;i<count;i++){terrain.write(terrain.keyAt(i),view.getFloat32((r*count+i)*4,true));if(i%8192===8191)await workStep(work,'Restoring both hollow surfaces',(r+i/count)/2);}}
 const prepared=await prepareHollowCubeDocument(world,saved.name,true,saved.connections,work);prepared.editor.selectedSurface=saved.selectedSurface;return prepared;
}
