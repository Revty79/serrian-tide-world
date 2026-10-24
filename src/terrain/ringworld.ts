import {createRingworldGeometry,ringworldDimensions,type RingworldConfiguration,type RingworldDimensions} from '../surfaces/ringworld.ts';
import {createOpenCylinderTerrain,OPEN_CYLINDER_REPRESENTATION} from './open-cylinder.ts';
import {defineWorld} from '../surfaces/world.ts';
export const RINGWORLD_MAX_SAMPLES=262144;
/** Four-N angular samples; axial and radial spacing follow the actual outer
 * circumference, rather than assigning N cells to every narrow physical strip.
 * Ceil preserves at least that density; inner angular spacing is 75–92% of it. */
export function ringworldResolution(dimensions:RingworldDimensions,detail:number){
 const d=ringworldDimensions(dimensions);if(detail!==128&&detail!==256)throw RangeError('Ringworld detail must be N128 or N256.');
 const angularSamples=4*detail,spacing=2*Math.PI*d.outerRadiusMeters/angularSamples,axialCells=Math.max(2,Math.ceil(d.widthMeters/spacing)),radialCells=Math.max(2,Math.ceil(d.structuralThicknessMeters/(2*spacing))),sampleCount=angularSamples*(2*axialCells+4*radialCells);
 if(sampleCount>RINGWORLD_MAX_SAMPLES)throw RangeError('Ringworld dimensions and detail exceed the qualified terrain budget.');
 return Object.freeze({angularSamples,axialCells,radialCells});
}
export function createRingworld(options:{geometry:RingworldConfiguration;terrainId:string;detail:128|256;initialElevation?:number}){
 const geometry=createRingworldGeometry(options.geometry),resolution=ringworldResolution(geometry.metadata,options.detail),terrain=createOpenCylinderTerrain({terrainId:options.terrainId,geometry:geometry.boundary.metadata,resolution,initialElevation:options.initialElevation??-100});
 if(new Set([geometry.identity.worldId,geometry.identity.surfaceId,terrain.metadata.terrainId]).size!==3)throw RangeError('Ringworld requires distinct World, surface and terrain identities.');
 const definition=defineWorld({id:geometry.identity.worldId,shape:{kind:'custom',geometry:{id:'physical-rectangular-ringworld',version:1}},surfaces:[{identity:geometry.identity,role:'custom',terrainId:terrain.metadata.terrainId,topology:{id:'ringworld-connected-four-regions',version:1},representation:{id:OPEN_CYLINDER_REPRESENTATION,version:1}}]});
 return Object.freeze({configuration:geometry.metadata,definition,geometry,terrain,detail:options.detail,elevationByteLength:terrain.elevationByteLength});
}
export type Ringworld=ReturnType<typeof createRingworld>;
