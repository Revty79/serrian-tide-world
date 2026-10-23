import {createOctahedronGeometry,type OctahedronConfiguration} from '../surfaces/octahedron.ts';
import {createTriangularPolyhedronTerrain} from './triangular-polyhedron.ts';
export function createOctahedronTerrain(options:{terrainId:string;geometry:OctahedronConfiguration;subdivisions:number;initialElevation?:number;initialValues?:Float32Array;elevationLimitMeters?:number}){return createTriangularPolyhedronTerrain({...options,geometry:createOctahedronGeometry(options.geometry)});}
export type OctahedronTerrain=ReturnType<typeof createOctahedronTerrain>;

export function octahedronSampleCount(n:number){if(!Number.isInteger(n)||n<4||n>256)throw RangeError('Octahedron detail requires N4 through N256.');return 4*n*n+2;}
