import {prepareSphereProtection,validateSphereConnections,validateSphereConnectionJournal,type SphereConnections} from '../editor/hollow-sphere-connections.ts';
import type {WordHistoryJournal} from '../editor/terrain-history.ts';
import {SAVE_FORMAT,record,textField,type SavedMapSummary} from './terrain-format.ts';
import {payloadChecksum} from './heightmap-payload.ts';
import {workStep,type PersistenceWork} from './cooperative-work.ts';
import {hollowSphereConfiguration,hollowSphereElevationValidator,HOLLOW_SPHERE_ROLES,type HollowSphereConfiguration,type HollowSphereRole} from '../surfaces/hollow-sphere.ts';
import {sphericalSampleCount} from '../terrain/spherical.ts';
import {createHollowSphereWorld} from '../terrain/hollow-sphere.ts';
import {prepareHollowSphereDocument,type HollowSphereDocument} from '../editor/hollow-sphere-document.ts';
export interface SavedHollowSphere extends SavedMapSummary {
 format:typeof SAVE_FORMAT;formatVersion:8|9|10;connections?:SphereConnections;connectionHistory?:WordHistoryJournal;
 metadata:{configuration:HollowSphereConfiguration;cellsPerEdge:128|256;representation:'equiangular-cube-sphere-vertices-v1';orientation:'outside-outward_inside-inward'};
 sampleCountPerSurface:number;selectedSurface:HollowSphereRole;
 elevationEncoding:'float32-le-canonical-exterior-interior';elevations:ArrayBuffer;checksum:string;
}
const exact=(v:Record<string,unknown>,keys:string[])=>{if(Object.keys(v).sort().join(',')!==keys.toSorted().join(','))throw Error('Unsupported hollow sphere fields.');};
export function hollowSphereHeader(value:unknown){
 const root=record(value),version=root.formatVersion;if(version!==8&&version!==9&&version!==10)throw Error('Unsupported hollow sphere format.');exact(root,[...(version>=9?['connections','connectionHistory']:[]),'format','formatVersion','id','name','savedAt','metadata','sampleCountPerSurface','selectedSurface','elevationEncoding','elevations','checksum']);
 if(root.format!==SAVE_FORMAT||(version!==8&&version!==9&&version!==10)||root.elevationEncoding!=='float32-le-canonical-exterior-interior'||!HOLLOW_SPHERE_ROLES.includes(root.selectedSurface as HollowSphereRole))throw Error('Unsupported hollow sphere format or surface.');
 const meta=record(root.metadata);exact(meta,['configuration','cellsPerEdge','representation','orientation']);
 const c=record(meta.configuration);exact(c,['provider','version','worldId','outerRadiusMeters','innerRadiusMeters','surfaces']);const surfaces=record(c.surfaces);exact(surfaces,['exterior','interior']);for(const r of HOLLOW_SPHERE_ROLES)exact(record(surfaces[r]),['surfaceId','terrainId']);
 const configuration=hollowSphereConfiguration(c as unknown as HollowSphereConfiguration);
 if(![128,256].includes(meta.cellsPerEdge as number)||meta.representation!=='equiangular-cube-sphere-vertices-v1'||meta.orientation!=='outside-outward_inside-inward')throw Error('Unsupported hollow spherical representation.');
 const cellsPerEdge=meta.cellsPerEdge as 128|256,sampleCountPerSurface=sphericalSampleCount(cellsPerEdge),id=textField(root.id,128),name=textField(root.name,120),savedAt=textField(root.savedAt,32);
 if(id!==configuration.worldId||root.sampleCountPerSurface!==sampleCountPerSurface||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(savedAt)||!Number.isFinite(Date.parse(savedAt))||new Date(savedAt).toISOString()!==savedAt)throw Error('Invalid hollow sphere identity, date or sample count.');
 const world=version>=9?createHollowSphereWorld(configuration,cellsPerEdge):undefined,connections=world?validateSphereConnections(world,root.connections as SphereConnections,version===9?'holes':'all'):undefined,connectionHistory=world?validateSphereConnectionJournal(world,connections!,root.connectionHistory as WordHistoryJournal,version===9?'holes':'all'):undefined;
 return{format:SAVE_FORMAT,formatVersion:version,...(version>=9?{connections:connections!,connectionHistory:connectionHistory!}:{}),id,name,savedAt,metadata:{configuration,cellsPerEdge,representation:'equiangular-cube-sphere-vertices-v1',orientation:'outside-outward_inside-inward'},sampleCountPerSurface,selectedSurface:root.selectedSurface as HollowSphereRole,elevationEncoding:'float32-le-canonical-exterior-interior'}as const;
}
export async function validateHollowSphere(value:unknown,work:PersistenceWork={}):Promise<SavedHollowSphere>{
 const header=hollowSphereHeader(value),root=record(value),input=root.elevations;
 if(!(input instanceof ArrayBuffer)||input.byteLength!==header.sampleCountPerSurface*8||input.byteLength>2*(6*256**2+2)*4||typeof root.checksum!=='string'||!/[a-f0-9]{64}/.test(root.checksum)||root.checksum.length!==64)throw Error('Invalid hollow sphere payload length or checksum.');
 const elevations=input.slice(0),checksum=root.checksum,view=new DataView(elevations),count=header.sampleCountPerSurface;
 for(const[r,role]of HOLLOW_SPHERE_ROLES.entries()){const validate=hollowSphereElevationValidator(header.metadata.configuration,role);for(let first=0;first<count;first+=16384){for(let i=first;i<Math.min(count,first+16384);i++)validate(view.getFloat32((r*count+i)*4,true));await workStep(work,'Validating hollow sphere',Math.min(1,(r*count+first+16384)/(2*count)));}}
 if(await payloadChecksum(header,elevations)!==checksum)throw Error('Hollow sphere integrity check failed; geography and metadata were not opened.');
 if(header.formatVersion>=9){const world=createHollowSphereWorld(header.metadata.configuration,header.metadata.cellsPerEdge);await prepareSphereProtection(world,header.connections!,(role,index)=>view.getFloat32(((role==='interior'?count:0)+index)*4,true),work);}
 return{...header,elevations,checksum};
}
export async function encodeHollowSphere(doc:HollowSphereDocument,savedAt=new Date().toISOString(),work:PersistenceWork={}):Promise<SavedHollowSphere>{
 if(doc.painting)throw Error('Finish spherical input before Save.');
 const cellsPerEdge=doc.world.surfaces.exterior.terrain.metadata.representation.cellsPerEdge,count=doc.world.surfaces.exterior.terrain.sampleCount;
 const version=doc.connectionFormat===10||doc.connections.passages.length||doc.connections.links.length?10:doc.connectionFormat===9||doc.connectionHistory.length||doc.connections.holes.length?9:8;
 const header=hollowSphereHeader({format:SAVE_FORMAT,formatVersion:version,...(version>=9?{connections:doc.connections,connectionHistory:doc.connectionHistory.exportJournal()}:{}),id:doc.world.configuration.worldId,name:doc.name.trim(),savedAt,metadata:{configuration:doc.world.configuration,cellsPerEdge,representation:'equiangular-cube-sphere-vertices-v1',orientation:'outside-outward_inside-inward'},sampleCountPerSurface:count,selectedSurface:doc.selectedSurface,elevationEncoding:'float32-le-canonical-exterior-interior',elevations:null,checksum:null});
 const sources=HOLLOW_SPHERE_ROLES.map(r=>doc.world.surfaces[r].terrain.copyElevations()),elevations=new ArrayBuffer(count*8),view=new DataView(elevations);
 for(const[r,role]of HOLLOW_SPHERE_ROLES.entries()){const source=sources[r]!,bits=new Uint32Array(source.buffer),validate=hollowSphereElevationValidator(header.metadata.configuration,role);for(let first=0;first<count;first+=16384){for(let i=first;i<Math.min(count,first+16384);i++){validate(source[i]!);view.setUint32((r*count+i)*4,bits[i]!,true);}await workStep(work,'Encoding hollow sphere',Math.min(1,(r*count+first+16384)/(2*count)));}}
 if(header.formatVersion>=9)await prepareSphereProtection(doc.world,header.connections!,(role,index)=>view.getFloat32(((role==='interior'?count:0)+index)*4,true),work,Object.fromEntries(HOLLOW_SPHERE_ROLES.map(r=>[r,doc.surfaces[r].cache.elevationField!.directions])));
 return{...header,elevations,checksum:await payloadChecksum(header,elevations)};
}
export async function decodeHollowSphere(value:unknown,work:PersistenceWork={}){
 const saved=await validateHollowSphere(value,work),world=createHollowSphereWorld(saved.metadata.configuration,saved.metadata.cellsPerEdge),view=new DataView(saved.elevations),count=saved.sampleCountPerSurface;
 for(const[r,role]of HOLLOW_SPHERE_ROLES.entries()){const t=world.surfaces[role].terrain;for(let first=0;first<count;first+=16384){for(let i=first;i<Math.min(count,first+16384);i++)t.write(t.keyAt(i),view.getFloat32((r*count+i)*4,true));await workStep(work,'Restoring hollow sphere',Math.min(1,(r*count+first+16384)/(2*count)));}}
 const ready=await prepareHollowSphereDocument(world,saved.name,true,saved.selectedSurface,work,saved.connections,saved.connectionHistory);ready.editor.connectionFormat=saved.formatVersion;return ready;
}
