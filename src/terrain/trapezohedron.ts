import {createTrapezohedronGeometry,type TrapezohedronConfiguration} from '../surfaces/trapezohedron.ts';
import {createTriangularPolyhedronTerrain} from './triangular-polyhedron.ts';
export function createTrapezohedronTerrain(options:{terrainId:string;geometry:TrapezohedronConfiguration;subdivisions:number;initialElevation?:number;initialValues?:Float32Array;elevationLimitMeters?:number}){return createTriangularPolyhedronTerrain({...options,geometry:createTrapezohedronGeometry(options.geometry)});}
export type TrapezohedronTerrain=ReturnType<typeof createTrapezohedronTerrain>;
export function trapezohedronSampleCount(n:number){if(!Number.isInteger(n)||n<4||n>256)throw RangeError('Trapezohedron detail requires N4 through N256.');return 10*n*n+2;}
