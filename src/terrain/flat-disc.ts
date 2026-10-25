import {createFlatDiscGeometry,flatDiscDimensions,type FlatDiscConfiguration,type FlatDiscDimensions} from '../surfaces/flat-disc.ts';
import {createCylindricalTerrain,cylindricalSampleCount} from './cylindrical.ts';
import {MAX_CYLINDER_PREVIEW_SAMPLES} from '../rendering/cylindrical-raster.ts';

/** Reallocate axial samples to the broad caps, inside the accepted cylinder cap.
 * The actual wall has at least 3/5 cells at the thinnest N128/N256 profiles. */
export function flatDiscResolution(dimensions:FlatDiscDimensions,detail:number){
  const d=flatDiscDimensions(dimensions);
  if(detail!==128&&detail!==256)throw RangeError('Flat Disc Terrain Detail must be N128 or N256.');
  const radialCells=detail*3/8,angularSamples=detail,axialCells=Math.max(2,Math.ceil(d.thicknessMeters/d.radiusMeters*radialCells));
  const resolution=Object.freeze({angularSamples,axialCells,radialCells});
  if(cylindricalSampleCount(resolution)>MAX_CYLINDER_PREVIEW_SAMPLES)throw RangeError('Disc exceeds the existing cylinder terrain budget.');
  const coveringRadius=d.radiusMeters*Math.hypot(1/(2*radialCells),Math.PI/angularSamples);
  const defaultRadius=Math.min(.0837*d.radiusMeters,.49*d.thicknessMeters);
  if(defaultRadius<coveringRadius*1.05)throw RangeError('This thin disc requires Higher Terrain Detail for a useful physical brush.');
  return resolution;
}
export function flatDiscBrushPolicy(dimensions:FlatDiscDimensions){
  const d=flatDiscDimensions(dimensions);
  return Object.freeze({minimum:d.radiusMeters*.005,maximum:d.radiusMeters*.12,defaultRadius:Math.min(.0837*d.radiusMeters,.49*d.thicknessMeters)});
}
export function createFlatDisc(options:{readonly geometry:FlatDiscConfiguration;readonly terrainId:string;readonly detail:128|256;readonly initialElevation?:number}){
  const geometry=createFlatDiscGeometry(options.geometry),resolution=flatDiscResolution(geometry.metadata,options.detail),
    terrain=createCylindricalTerrain({terrainId:options.terrainId,geometry:geometry.boundary.metadata,resolution,initialElevation:options.initialElevation??-100});
  if(new Set([geometry.identity.worldId,geometry.identity.surfaceId,terrain.metadata.terrainId]).size!==3)
    throw RangeError('Flat Disc requires distinct World, connected surface and terrain identities.');
  return Object.freeze({configuration:geometry.metadata,geometry,terrain,detail:options.detail,
    regions:Object.freeze({upper:'cap-end',lower:'cap-start',sidewall:'side'} as const),elevationByteLength:terrain.elevationByteLength});
}
export type FlatDisc=ReturnType<typeof createFlatDisc>;
