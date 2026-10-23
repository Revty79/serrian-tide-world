import {SAVE_FORMAT,record,textField,type SavedMapSummary} from './terrain-format.ts';
import {payloadChecksum} from './heightmap-payload.ts';
import {workStep,type PersistenceWork} from './cooperative-work.ts';
import type {PolyhedronMaterial,PolyhedronRole} from '../surfaces/polyhedron-material.ts';
import type {PolyhedronTerrain} from '../terrain/polyhedron-contract.ts';
import {validatePolyhedronConnections,validatePolyhedronConnectionJournal,preparePolyhedronProtection,type PolyhedronConnections} from '../editor/polyhedron-connections.ts';
import type {WordHistoryJournal} from '../editor/terrain-history.ts';
export interface ConnectedTerrainChild extends SavedMapSummary{readonly format:typeof SAVE_FORMAT;readonly formatVersion:number;readonly elevations:ArrayBuffer;readonly checksum:string}
export type ConnectedTerrainHeader<C extends ConnectedTerrainChild>=C extends ConnectedTerrainChild?Omit<C,'elevations'|'checksum'>:never;
export interface ConnectedPolyhedronEnvelope<C extends ConnectedTerrainChild,V extends number> extends SavedMapSummary{readonly format:typeof SAVE_FORMAT;readonly formatVersion:V;readonly terrain:C;readonly connections:PolyhedronConnections;readonly connectionHistory:WordHistoryJournal;readonly checksum:string}
export interface PolyhedronEnvelopeSpec<C extends ConnectedTerrainChild,V extends number,R extends{banks:Partial<Record<PolyhedronRole,PolyhedronTerrain>>}>{
 readonly versions:readonly V[];
 terrainHeader(value:unknown,version:V):ConnectedTerrainHeader<C>;
 material(header:ConnectedTerrainHeader<C>):PolyhedronMaterial;
 validateTerrain(value:unknown,version:V,work:PersistenceWork):Promise<C>;
 restoreTerrain(terrain:C,work:PersistenceWork):Promise<R>;
}
/** Bind an unchanged strict legacy terrain child to a newly explicit envelope.
 * Geometry adapters construct actual boundaries and banks; this layer owns
 * common integrity, journal and reference-ground validation only. */
export function connectedPolyhedronHeader<C extends ConnectedTerrainChild,V extends number,R extends{banks:Partial<Record<PolyhedronRole,PolyhedronTerrain>>}>(value:unknown,spec:PolyhedronEnvelopeSpec<C,V,R>){
 const root=record(value);if(Object.keys(root).sort().join(',')!==['format','formatVersion','id','name','savedAt','terrain','connections','connectionHistory','checksum'].sort().join(',')||root.format!==SAVE_FORMAT||!spec.versions.includes(root.formatVersion as V))throw RangeError('Unsupported connected polyhedron fields or version.');
 const terrain=spec.terrainHeader(root.terrain,root.formatVersion as V),checksum=textField(record(root.terrain).checksum,64);if(!/^[a-f0-9]{64}$/.test(checksum)||root.id!==terrain.id||root.name!==terrain.name||root.savedAt!==terrain.savedAt)throw RangeError('Connected summary must match its exact terrain identity, name and date.');
 const body=spec.material(terrain),connections=validatePolyhedronConnections(body,root.connections as PolyhedronConnections),connectionHistory=validatePolyhedronConnectionJournal(body,connections,root.connectionHistory as WordHistoryJournal);
 return{body,header:{format:SAVE_FORMAT,formatVersion:root.formatVersion as V,id:terrain.id,name:terrain.name,savedAt:terrain.savedAt,terrain:{...terrain,checksum},connections,connectionHistory}};
}
export async function validateConnectedPolyhedronEnvelope<C extends ConnectedTerrainChild,V extends number,R extends{banks:Partial<Record<PolyhedronRole,PolyhedronTerrain>>}>(value:unknown,spec:PolyhedronEnvelopeSpec<C,V,R>,work:PersistenceWork={}){
 const root=record(value),ready=connectedPolyhedronHeader(value,spec),terrain=await spec.validateTerrain(root.terrain,ready.header.formatVersion,work);if(typeof root.checksum!=='string'||!/^[a-f0-9]{64}$/.test(root.checksum)||await payloadChecksum(ready.header,terrain.elevations)!==root.checksum)throw RangeError('Connected polyhedron integrity check failed; current edits remain.');
 const restored=await spec.restoreTerrain(terrain,work);await preparePolyhedronProtection(ready.body,ready.header.connections,restored.banks,work);return{saved:{...ready.header,terrain,checksum:root.checksum} as ConnectedPolyhedronEnvelope<C,V>,...restored};
}
export async function encodePolyhedronEnvelope<C extends ConnectedTerrainChild,V extends number,R extends{banks:Partial<Record<PolyhedronRole,PolyhedronTerrain>>}>(terrain:C,version:V,connections:PolyhedronConnections,connectionHistory:WordHistoryJournal,spec:PolyhedronEnvelopeSpec<C,V,R>){
 const ready=connectedPolyhedronHeader({format:SAVE_FORMAT,formatVersion:version,id:terrain.id,name:terrain.name,savedAt:terrain.savedAt,terrain,connections,connectionHistory,checksum:null},spec),checksum=await payloadChecksum(ready.header,terrain.elevations);return{...ready.header,terrain,checksum} as ConnectedPolyhedronEnvelope<C,V>;
}
export interface WritablePolyhedronTerrain extends PolyhedronTerrain{write(key:ReturnType<this['keyAt']>,height:number):void}
export async function restorePolyhedronElevationWords(elevations:ArrayBuffer,banks:Partial<Record<PolyhedronRole,WritablePolyhedronTerrain>>,work:PersistenceWork){
 const roles=['exterior','interior'] as const,count=roles.reduce((n,r)=>n+(banks[r]?.sampleCount??0),0);if(elevations.byteLength!==count*4)throw RangeError('Physical terrain payload must match its actual banks.');let offset=0;const view=new DataView(elevations);
 for(const role of roles){const terrain=banks[role];if(!terrain)continue;for(let first=0;first<terrain.sampleCount;first+=8192){for(let i=first;i<Math.min(terrain.sampleCount,first+8192);i++)terrain.write(terrain.keyAt(i),view.getFloat32((offset+i)*4,true));await workStep(work,'Restoring connected polyhedral terrain',(offset+Math.min(terrain.sampleCount,first+8192))*4/elevations.byteLength);}offset+=terrain.sampleCount;}
}
