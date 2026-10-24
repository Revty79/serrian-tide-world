import {createFloatingIslandGeometry,type FloatingIslandConfiguration} from '../surfaces/floating-island.ts';
import {createTriangularPolyhedronTerrain} from './triangular-polyhedron.ts';
export function createFloatingIslandTerrain(options:{terrainId:string;geometry:FloatingIslandConfiguration;subdivisions:number;initialElevation?:number;initialValues?:Float32Array;elevationLimitMeters?:number}){return createTriangularPolyhedronTerrain({...options,initialElevation:options.initialElevation??200,geometry:createFloatingIslandGeometry(options.geometry)});}
export type FloatingIslandTerrain=ReturnType<typeof createFloatingIslandTerrain>;
