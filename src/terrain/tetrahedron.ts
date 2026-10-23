import {createTetrahedronGeometry,type TetrahedronConfiguration} from '../surfaces/tetrahedron.ts';
import {createTriangularPolyhedronTerrain} from './triangular-polyhedron.ts';
export function createTetrahedronTerrain(options:{terrainId:string;geometry:TetrahedronConfiguration;subdivisions:number;initialElevation?:number;initialValues?:Float32Array;elevationLimitMeters?:number}){return createTriangularPolyhedronTerrain({...options,geometry:createTetrahedronGeometry(options.geometry)});}
export type TetrahedronTerrain=ReturnType<typeof createTetrahedronTerrain>;
