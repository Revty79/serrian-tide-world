import type {AxialGeometry} from '../surfaces/axial.ts';
import type {createTriangularPolyhedronTerrain} from './triangular-polyhedron.ts';
export type AxialTerrain=ReturnType<typeof createTriangularPolyhedronTerrain<AxialGeometry>>&{readonly detail:128|256};
