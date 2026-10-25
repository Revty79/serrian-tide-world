import {createRibbonGeometry,type RibbonConfiguration} from '../surfaces/ribbon.ts';
import {createTriangularPolyhedronTerrain} from './triangular-polyhedron.ts';
export function ribbonSubdivisions(detail:128|256){if(detail!==128&&detail!==256)throw RangeError('Ribbon requires Standard or Higher numerical detail.');return detail===128?48:64;}
export function createRibbonTerrain(options:{terrainId:string;geometry:RibbonConfiguration;detail:128|256;initialElevation?:number;initialValues?:Float32Array}){
 const geometry=createRibbonGeometry(options.geometry),terrain=createTriangularPolyhedronTerrain({...options,geometry,subdivisions:ribbonSubdivisions(options.detail),initialElevation:options.initialElevation??-100});
 if(new Set([options.terrainId,geometry.identity.worldId,geometry.identity.surfaceId]).size!==3)throw RangeError('Ribbon World, boundary and terrain require distinct identities.');
 return Object.freeze({...terrain,detail:options.detail,get revision(){return terrain.revision;}});
}
export type RibbonTerrain=ReturnType<typeof createRibbonTerrain>;
