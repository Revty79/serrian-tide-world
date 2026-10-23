import {createDodecahedronGeometry,type DodecahedronConfiguration} from '../surfaces/dodecahedron.ts';
import {createTriangularPolyhedronTerrain} from './triangular-polyhedron.ts';
export function createDodecahedronTerrain(options:{terrainId:string;geometry:DodecahedronConfiguration;subdivisions:number;initialElevation?:number;initialValues?:Float32Array;elevationLimitMeters?:number}){return createTriangularPolyhedronTerrain({...options,geometry:createDodecahedronGeometry(options.geometry)});}
export type DodecahedronTerrain=ReturnType<typeof createDodecahedronTerrain>;
export function dodecahedronSampleCount(n:number){if(!Number.isInteger(n)||n<4||n>256)throw RangeError('Dodecahedron detail requires N4 through N256.');return 18*n*n+2;}
