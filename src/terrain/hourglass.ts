import {createHourglassGeometry,type HourglassConfiguration} from '../surfaces/hourglass.ts';
import {createTriangularPolyhedronTerrain} from './triangular-polyhedron.ts';
export function createHourglassTerrain(options:{terrainId:string;geometry:HourglassConfiguration;detail:128|256;initialElevation?:number;initialValues?:Float32Array}){
 if(![128,256].includes(options.detail))throw RangeError('Hourglass requires N128/N256 equivalent detail.');
 const geometry=createHourglassGeometry(options.geometry);
 if(new Set([options.terrainId,geometry.identity.worldId,geometry.identity.surfaceId]).size!==3)throw RangeError('Hourglass identities must be distinct.');
 const terrain=createTriangularPolyhedronTerrain({...options,geometry,subdivisions:options.detail/4,initialElevation:options.initialElevation??-100});
 return Object.freeze({...terrain,detail:options.detail,get revision(){return terrain.revision;}});
}
export type HourglassTerrain=ReturnType<typeof createHourglassTerrain>;
