import type{PolyhedronTerrain}from'./polyhedron-contract.ts';
import type{PolygonPrismGeometry}from'../surfaces/polygon-prism.ts';import type{createTriangularPolyhedronTerrain}from'./triangular-polyhedron.ts';
/** Accepted indexed triangular authority, specialized only by a validated prism. */
export type PrismaticTerrain=ReturnType<typeof createTriangularPolyhedronTerrain<PolygonPrismGeometry>>&PolyhedronTerrain&{readonly detail:128|256};
