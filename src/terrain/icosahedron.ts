import {createIcosahedronGeometry,type IcosahedronConfiguration} from '../surfaces/icosahedron.ts';
import {createTriangularPolyhedronTerrain} from './triangular-polyhedron.ts';
export function createIcosahedronTerrain(options:{terrainId:string;geometry:IcosahedronConfiguration;subdivisions:number;initialElevation?:number;initialValues?:Float32Array;elevationLimitMeters?:number}){return createTriangularPolyhedronTerrain({...options,geometry:createIcosahedronGeometry(options.geometry)});}
export type IcosahedronTerrain=ReturnType<typeof createIcosahedronTerrain>;

export function icosahedronSampleCount(n:number){if(!Number.isInteger(n)||n<4||n>256)throw RangeError('Icosahedron detail requires N4 through N256.');return 10*n*n+2;}
