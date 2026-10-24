export{prismAngle as horseshoeAngle,prismPlanarVisible as horseshoePlanarVisible,prismPlanarRoute as horseshoePlanarRoute,prismDistance as horseshoeDistance,prismPath as horseshoePath,prismPointerInputs as horseshoePointerInputs,prismCapPosition as horseshoeCapPosition,prismWallPosition as horseshoeWallPosition}from'./prismatic-distance.ts';

import{HORSESHOE_ARM_SEGMENTS,HORSESHOE_BEND_SEGMENTS,type HorseshoeGeometry}from'./horseshoe.ts';import type{SurfacePosition}from'./contracts.ts';import{polyhedronPositionBounds}from'./polyhedron-physical-bounds.ts';import{prismProjectionLowerBound}from'./prismatic-distance.ts';import*as I from'./pyramid-interval.ts';
/** A path between opposite arms must cross z=0. The real U footprint meets
 * that line only at x <= the inner bend's actual central vertex. Projection
 * is nonexpansive, so total longitudinal variation bounds surface distance.
 * Outward input intervals certify the cut; retain general routing elsewhere. */
export function horseshoeProjectionLowerBound(g:HorseshoeGeometry,a:SurfacePosition,b:SurfacePosition,reach=Infinity){const A=polyhedronPositionBounds(g,a),B=polyhedronPositionBounds(g,b),barrier=g.outline[g.inner[HORSESHOE_ARM_SEGMENTS+HORSESHOE_BEND_SEGMENTS/2]!]![0];if(A[0][0]>=barrier&&B[0][0]>=barrier&&(A[2][0]>0&&B[2][1]<0||A[2][1]<0&&B[2][0]>0)){const lower=Math.max(0,I.add(I.add(A[0],B[0]),I.multiply(I.exact(barrier),I.exact(-2)))[0]);if(lower>=reach)return lower;}return prismProjectionLowerBound(g,a,b);}
