import {createFlatRingGeometry,flatRingDimensions,type FlatRingConfiguration,type FlatRingDimensions} from '../surfaces/flat-ring.ts';
import {createOpenCylinderTerrain} from './open-cylinder.ts';
export const FLAT_RING_MAX_SAMPLES=131072;
export function flatRingResolution(input:FlatRingDimensions,detail:number){
 const d=flatRingDimensions(input);if(detail!==128&&detail!==256)throw RangeError('Flat Ring Terrain Detail must be N128 or N256.');
 const angularSamples=(d.innerRadiusMeters/d.outerRadiusMeters<.2?1:2)*detail,spacing=2*Math.PI*d.outerRadiusMeters/angularSamples,
  axialCells=Math.max(2,Math.ceil(d.thicknessMeters/spacing)),radialCells=Math.max(2,Math.ceil(d.widthMeters/(2*spacing))),resolution=Object.freeze({angularSamples,axialCells,radialCells});
 if(angularSamples*(2*axialCells+4*radialCells)>FLAT_RING_MAX_SAMPLES)throw RangeError('Flat Ring exceeds the accepted annular terrain budget.');
 const coveringRadius=Math.hypot(Math.max(d.widthMeters/(4*radialCells),d.thicknessMeters/(2*axialCells)),Math.PI*d.outerRadiusMeters/angularSamples);
 if(flatRingBrushPolicy(d).defaultRadius<coveringRadius*1.05)throw RangeError('This opening requires Higher Terrain Detail for a useful physical brush.');
 return resolution;
}
export function flatRingBrushPolicy(input:FlatRingDimensions){const d=flatRingDimensions(input),R=d.outerRadiusMeters,r=d.innerRadiusMeters;return Object.freeze({minimum:R*.005,maximum:R*(r/R<.2?.2:.18),defaultRadius:Math.min(.036*R,.3*r,.4*d.thicknessMeters,.18*d.widthMeters)});}
export function createFlatRing(options:{geometry:FlatRingConfiguration;terrainId:string;detail:128|256;initialElevation?:number}){
 const geometry=createFlatRingGeometry(options.geometry),resolution=flatRingResolution(geometry.metadata,options.detail),terrain=createOpenCylinderTerrain({terrainId:options.terrainId,geometry:geometry.boundary.metadata,resolution,initialElevation:options.initialElevation??-100});
 if(new Set([geometry.identity.worldId,geometry.identity.surfaceId,terrain.metadata.terrainId]).size!==3)throw RangeError('Flat Ring requires distinct World, surface and terrain identities.');
 return Object.freeze({configuration:geometry.metadata,geometry,terrain,detail:options.detail,elevationByteLength:terrain.elevationByteLength});
}
export type FlatRing=ReturnType<typeof createFlatRing>;
