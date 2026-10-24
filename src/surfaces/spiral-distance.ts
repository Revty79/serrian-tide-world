export{prismAngle as spiralAngle,prismPlanarVisible as spiralPlanarVisible,prismPlanarRoute as spiralPlanarRoute,prismDistance as spiralDistance,prismPath as spiralPath,prismPointerInputs as spiralPointerInputs,prismCapPosition as spiralCapPosition,prismWallPosition as spiralWallPosition}from'./prismatic-distance.ts';
import type{SpiralGeometry}from'./spiral.ts';import type{SurfacePosition}from'./contracts.ts';
import{prismProjectionLowerBound}from'./prismatic-distance.ts';
/** Continuous station scalar: a global nonexpansive lower bound, including
 * walls and closures. Only the genuine surface solver supplies influence. */
export function spiralProjectionLowerBound(g:SpiralGeometry,a:SurfacePosition,b:SurfacePosition,reach=Infinity){const lower=g.longitudinalLowerBound(a,b);return lower>=reach?lower:Math.max(lower,prismProjectionLowerBound(g,a,b));}
