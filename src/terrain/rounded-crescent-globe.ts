import {createSphericalTerrain} from './spherical.ts';
import {roundedCrescentGeometry,type RoundedCrescentDimensions} from '../surfaces/rounded-crescent-globe.ts';
import type {SurfaceIdentity} from '../surfaces/contracts.ts';

/** Native canonical cube-sphere words are coordinates only. The physical metric
 * and complete boundary are the smooth curved body's, not an ordinary sphere. */
export function createRoundedCrescentWorld(options:{terrainId:string;identity:SurfaceIdentity;dimensions:RoundedCrescentDimensions;detail:128|256;initialElevation?:number}){
 if(![128,256].includes(options.detail))throw RangeError('Rounded Crescent supports N128 or N256.');
 const geometry=roundedCrescentGeometry(options.dimensions),terrain=createSphericalTerrain({...options,radiusMeters:geometry.scaleMeters,cellsPerEdge:options.detail,validateElevation:v=>{if(Math.abs(v)>geometry.elevationLimitMeters)throw RangeError('Rounded Crescent elevation exceeds its supported reference-surface range.');}});
 return Object.freeze({geometry,terrain,metadata:Object.freeze({provider:'rounded-crescent-globe-world' as const,version:1 as const,geometry,coordinates:terrain.metadata})});
}
export type RoundedCrescentWorld=ReturnType<typeof createRoundedCrescentWorld>;
