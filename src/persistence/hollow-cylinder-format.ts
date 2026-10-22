import {SAVE_FORMAT,record,textField,type SavedMapSummary} from './terrain-format.ts';
import {payloadChecksum} from './heightmap-payload.ts';
import {workStep,type PersistenceWork} from './cooperative-work.ts';
import {hollowCylinderConfiguration,hollowCylinderElevationValidator,HOLLOW_CYLINDER_ROLES,type HollowCylinderConfiguration,type HollowCylinderRole} from '../surfaces/hollow-cylinder.ts';
import {cylindricalSampleCount} from '../terrain/cylindrical.ts';
import {cylinderResolution} from '../editor/cylinder-configuration.ts';
import {createHollowCylinderWorld} from '../terrain/hollow-cylinder.ts';
import {prepareHollowCylinderDocument,type HollowCylinderDocument} from '../editor/hollow-cylinder-document.ts';
export interface SavedHollowCylinder extends SavedMapSummary {
 format:typeof SAVE_FORMAT;formatVersion:11;
 metadata:{configuration:HollowCylinderConfiguration;detail:64|128|256;representation:'cylinder-rings-shared-rims-v1';orientation:'outside-outward_inside-inward-u-reflection';referenceFrame:'coaxial-centered-z'};
 sampleCountPerSurface:number;selectedSurface:HollowCylinderRole;elevationEncoding:'float32-le-canonical-exterior-interior';elevations:ArrayBuffer;checksum:string;
}
const exact=(value:Record<string,unknown>,keys:string[])=>{if(Object.keys(value).sort().join(',')!==keys.toSorted().join(','))throw Error('Unsupported hollow cylinder fields.');};
export function hollowCylinderHeader(value:unknown){
 const root=record(value);exact(root,['format','formatVersion','id','name','savedAt','metadata','sampleCountPerSurface','selectedSurface','elevationEncoding','elevations','checksum']);
 if(root.format!==SAVE_FORMAT||root.formatVersion!==11||root.elevationEncoding!=='float32-le-canonical-exterior-interior'||!HOLLOW_CYLINDER_ROLES.includes(root.selectedSurface as HollowCylinderRole))throw Error('Unsupported hollow cylinder format or surface.');
 const meta=record(root.metadata);exact(meta,['configuration','detail','representation','orientation','referenceFrame']);const c=record(meta.configuration);exact(c,['provider','version','configuration','worldId','outerRadiusMeters','innerRadiusMeters','outerLengthMeters','innerLengthMeters','surfaces']);const surfaces=record(c.surfaces);exact(surfaces,['exterior','interior']);for(const r of HOLLOW_CYLINDER_ROLES)exact(record(surfaces[r]),['surfaceId','terrainId']);const configuration=hollowCylinderConfiguration(c as unknown as HollowCylinderConfiguration),resolution=cylinderResolution(meta.detail as number);
 if(meta.representation!=='cylinder-rings-shared-rims-v1'||meta.orientation!=='outside-outward_inside-inward-u-reflection'||meta.referenceFrame!=='coaxial-centered-z')throw Error('Unsupported hollow cylinder representation or reference frame.');
 const sampleCountPerSurface=cylindricalSampleCount(resolution),id=textField(root.id,128),name=textField(root.name,120),savedAt=textField(root.savedAt,32);
 if(id!==configuration.worldId||root.sampleCountPerSurface!==sampleCountPerSurface||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(savedAt)||!Number.isFinite(Date.parse(savedAt))||new Date(savedAt).toISOString()!==savedAt)throw Error('Invalid hollow cylinder identity, date or sample count.');
 return{format:SAVE_FORMAT,formatVersion:11,id,name,savedAt,metadata:{configuration,detail:resolution.angularSamples as 64|128|256,representation:'cylinder-rings-shared-rims-v1',orientation:'outside-outward_inside-inward-u-reflection',referenceFrame:'coaxial-centered-z'},sampleCountPerSurface,selectedSurface:root.selectedSurface as HollowCylinderRole,elevationEncoding:'float32-le-canonical-exterior-interior'}as const;
}
export async function validateHollowCylinder(value:unknown,work:PersistenceWork={}):Promise<SavedHollowCylinder>{
 const header=hollowCylinderHeader(value),root=record(value),input=root.elevations;
 if(!(input instanceof ArrayBuffer)||input.byteLength!==header.sampleCountPerSurface*8||input.byteLength>65282*8||typeof root.checksum!=='string'||!/^[a-f0-9]{64}$/.test(root.checksum))throw Error('Invalid hollow cylinder payload length or checksum.');
 const elevations=input.slice(0),checksum=root.checksum,view=new DataView(elevations),count=header.sampleCountPerSurface;
 for(const[r,role]of HOLLOW_CYLINDER_ROLES.entries()){const validate=hollowCylinderElevationValidator(header.metadata.configuration,role);for(let first=0;first<count;first+=8192){for(let i=first;i<Math.min(count,first+8192);i++)validate(view.getFloat32((r*count+i)*4,true));await workStep(work,'Validating hollow cylinder',Math.min(1,(r*count+first+8192)/(count*2)));}}
 if(await payloadChecksum(header,elevations)!==checksum)throw Error('Hollow cylinder integrity check failed; geography and metadata were not opened.');return{...header,elevations,checksum};
}
export async function encodeHollowCylinder(doc:HollowCylinderDocument,savedAt=new Date().toISOString(),work:PersistenceWork={}):Promise<SavedHollowCylinder>{
 if(doc.painting)throw Error('Finish cylindrical input before Save.');const count=doc.surfaces.exterior.terrain.sampleCount,header=hollowCylinderHeader({format:SAVE_FORMAT,formatVersion:11,id:doc.world.configuration.worldId,name:doc.name.trim(),savedAt,metadata:{configuration:doc.world.configuration,detail:doc.surfaces.exterior.terrain.metadata.representation.resolution.angularSamples,representation:'cylinder-rings-shared-rims-v1',orientation:'outside-outward_inside-inward-u-reflection',referenceFrame:'coaxial-centered-z'},sampleCountPerSurface:count,selectedSurface:doc.selectedSurface,elevationEncoding:'float32-le-canonical-exterior-interior',elevations:null,checksum:null}),sources=HOLLOW_CYLINDER_ROLES.map(r=>doc.surfaces[r].terrain.copyElevations()),elevations=new ArrayBuffer(count*8),view=new DataView(elevations);
 for(const[r,role]of HOLLOW_CYLINDER_ROLES.entries()){const source=sources[r]!,bits=new Uint32Array(source.buffer),validate=hollowCylinderElevationValidator(header.metadata.configuration,role);for(let first=0;first<count;first+=8192){for(let i=first;i<Math.min(count,first+8192);i++){validate(source[i]!);view.setUint32((r*count+i)*4,bits[i]!,true);}await workStep(work,'Encoding hollow cylinder',Math.min(1,(r*count+first+8192)/(count*2)));}}
 return{...header,elevations,checksum:await payloadChecksum(header,elevations)};
}
export async function decodeHollowCylinder(value:unknown,work:PersistenceWork={}){
 const saved=await validateHollowCylinder(value,work),world=createHollowCylinderWorld(saved.metadata.configuration,cylinderResolution(saved.metadata.detail)),view=new DataView(saved.elevations),count=saved.sampleCountPerSurface;
 for(const[r,role]of HOLLOW_CYLINDER_ROLES.entries()){const t=world.surfaces[role].terrain;for(let first=0;first<count;first+=8192){for(let i=first;i<Math.min(count,first+8192);i++)t.write(t.keyAt(i),view.getFloat32((r*count+i)*4,true));await workStep(work,'Restoring hollow cylinder',Math.min(1,(r*count+first+8192)/(count*2)));}}
 return prepareHollowCylinderDocument(world,saved.name,true,saved.selectedSurface,work);
}
