import { createSphericalTerrain,type SphericalTerrain,type SphericalSampleKey } from '../terrain/spherical.ts';
import { assertFloat32Elevation } from '../terrain/model.ts';
/** Private preparation storage: same topology and exact words, no UI, history or
 * persistence authority. Values may advance only after canonical acknowledgement. */
export function sphereWorkEpoch(metadata:SphericalTerrain['metadata'],values:Float32Array,sourceRevision:number):SphericalTerrain {
 const topology=createSphericalTerrain({terrainId:metadata.terrainId,identity:metadata.identity,radiusMeters:metadata.geometry.radiusMeters,cellsPerEdge:metadata.representation.cellsPerEdge});
 if(values.length!==topology.sampleCount||!values.every(Number.isFinite)||!Number.isSafeInteger(sourceRevision)||sourceRevision<0)throw Error('Invalid spherical preparation epoch.');
 let revision=sourceRevision;
 const index=(k:SphericalSampleKey)=>{if(k.worldId!==metadata.identity.worldId||k.surfaceId!==metadata.identity.surfaceId||k.terrainId!==metadata.terrainId||k.representationVersion!==1||k.cellsPerEdge!==metadata.representation.cellsPerEdge||!Number.isInteger(k.index)||k.index<0||k.index>=values.length)throw Error('Foreign spherical preparation key.');return k.index;};
 return Object.freeze({...topology,get revision(){return revision;},read:(key:SphericalSampleKey)=>values[index(key)]!,write:(key:SphericalSampleKey,value:number)=>{const at=index(key);assertFloat32Elevation(value);const next=Math.fround(value);if(!Object.is(values[at],next)){values[at]=next;revision++;}},copyElevations:()=>values.slice()});
}
