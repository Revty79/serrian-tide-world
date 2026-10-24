import {createCrescentGeometry,type CrescentConfiguration} from '../surfaces/crescent.ts';
import {createTriangularPolyhedronTerrain} from './triangular-polyhedron.ts';

export const CRESCENT_DEFAULT_DIMENSIONS=Object.freeze({worldSizeMeters:2000000,curvature:1,openingDegrees:90,bodyWidthMeters:500000,thicknessMeters:200000,tipShape:'fine' as const});
/** N128/N256 equivalent profiles use N32/N64 per triangle over 32 physical
 * longitudinal strips. 129,026 / 516,098 canonical words, without duplicate
 * cap, wall, internal diagonal, crease or terminal-edge geography. */
export function createCrescentTerrain(options:{terrainId:string;geometry:CrescentConfiguration;detail:128|256;initialElevation?:number;initialValues?:Float32Array}){
 if(![128,256].includes(options.detail))throw RangeError('Crescent requires N128 or N256 equivalent detail.');
 const geometry=createCrescentGeometry(options.geometry),terrain=createTriangularPolyhedronTerrain({...options,geometry,subdivisions:options.detail/4,initialElevation:options.initialElevation??-100});
 if(options.terrainId===geometry.identity.worldId||options.terrainId===geometry.identity.surfaceId||geometry.identity.worldId===geometry.identity.surfaceId)throw RangeError('Crescent World, surface and terrain identities must be distinct.');
 return Object.freeze({...terrain,detail:options.detail,get revision(){return terrain.revision;}});
}
export type CrescentTerrain=ReturnType<typeof createCrescentTerrain>;
