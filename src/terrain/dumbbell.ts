import {createDumbbellGeometry,type DumbbellConfiguration} from '../surfaces/dumbbell.ts';
import {createTriangularPolyhedronTerrain} from './triangular-polyhedron.ts';
export function createDumbbellTerrain(options:{terrainId:string;geometry:DumbbellConfiguration;detail:128|256;initialElevation?:number;initialValues?:Float32Array}){
 if(![128,256].includes(options.detail))throw RangeError('Dumbbell requires N128/N256 equivalent detail.');
 const geometry=createDumbbellGeometry(options.geometry);
 if(new Set([options.terrainId,geometry.identity.worldId,geometry.identity.surfaceId]).size!==3)throw RangeError('Dumbbell identities must be distinct.');
 const terrain=createTriangularPolyhedronTerrain({...options,geometry,subdivisions:options.detail/4,initialElevation:options.initialElevation??-100});
 return Object.freeze({...terrain,detail:options.detail,get revision(){return terrain.revision;}});
}
export type DumbbellTerrain=ReturnType<typeof createDumbbellTerrain>;
