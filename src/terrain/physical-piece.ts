import {createPhysicalPieceGeometry,type PhysicalPieceConfiguration} from '../surfaces/physical-piece.ts';
import {createTriangularPolyhedronTerrain} from './triangular-polyhedron.ts';
/** Shared authority and worker contract for closed convex physical components. */
export function createPhysicalPieceTerrain(options:{terrainId:string;geometry:PhysicalPieceConfiguration;subdivisions:number;initialElevation?:number;initialValues?:Float32Array;elevationLimitMeters?:number}){return createTriangularPolyhedronTerrain({...options,initialElevation:options.initialElevation??200,geometry:createPhysicalPieceGeometry(options.geometry)});}
export type PhysicalPieceTerrain=ReturnType<typeof createPhysicalPieceTerrain>;
