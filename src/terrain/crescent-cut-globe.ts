import {createSphericalTerrain} from './spherical.ts';
import {crescentCutGlobeGeometry,type CrescentCutGlobeDimensions} from '../surfaces/crescent-cut-globe.ts';
import type {SurfaceIdentity} from '../surfaces/contracts.ts';

/** Native spherical terrain is explicitly an intrinsic coordinate provider.
 * Its complete domain maps bijectively onto the physical subtracted boundary. */
export function createCrescentCutGlobeWorld(options:{terrainId:string;identity:SurfaceIdentity;dimensions:CrescentCutGlobeDimensions;detail:128|256;initialElevation?:number}) {
 if(![128,256].includes(options.detail))throw RangeError('Crescent-Cut Globe supports N128 or N256.');
 const geometry=crescentCutGlobeGeometry(options.dimensions),terrain=createSphericalTerrain({...options,radiusMeters:geometry.radiusMeters,cellsPerEdge:options.detail});
 return Object.freeze({geometry,terrain,metadata:Object.freeze({provider:'crescent-cut-globe-world' as const,version:1 as const,geometry,intrinsic:terrain.metadata})});
}
export type CrescentCutGlobeWorld=ReturnType<typeof createCrescentCutGlobeWorld>;
