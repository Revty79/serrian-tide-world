export{prismAngle as arcAngle,prismPlanarVisible as arcPlanarVisible,prismPlanarRoute as arcPlanarRoute,prismDistance as arcDistance,prismPath as arcPath,prismPointerInputs as arcPointerInputs,prismCapPosition as arcCapPosition,prismWallPosition as arcWallPosition}from'./prismatic-distance.ts';
import{ARC_SEGMENTS,arcEndCutLowerBound,type ArcGeometry}from'./arc.ts';import type{SurfacePosition}from'./contracts.ts';import{polyhedronPositionBounds}from'./polyhedron-physical-bounds.ts';import{prismProjectionLowerBound}from'./prismatic-distance.ts';
/** A projected material path crossing z=0 must pass x >= the real inner
 * central vertex. Opposite terminal neighborhoods cannot cut the open wedge.
 * Outward position intervals certify this cheap total-x-variation LOWER bound;
 * the shared actual surface distance remains authoritative for accepted dabs. */
export function arcProjectionLowerBound(g:ArcGeometry,a:SurfacePosition,b:SurfacePosition,reach=Infinity){const A=polyhedronPositionBounds(g,a),B=polyhedronPositionBounds(g,b),barrier=g.outline[g.inner[ARC_SEGMENTS/2]!]![0];const lower=arcEndCutLowerBound(barrier,A,B);if(lower>=reach)return lower;return prismProjectionLowerBound(g,a,b);}
