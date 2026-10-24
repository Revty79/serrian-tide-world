import type {SurfacePosition} from './contracts.ts';
import type {HourglassGeometry} from './hourglass.ts';
import {polyhedronPhysicalLength,polyhedronPositionBounds} from './polyhedron-physical-bounds.ts';
/** Each terminal is a convex planar polygon. Its straight segment is feasible
 * on the real cap and attains the ambient lower bound, hence is globally
 * shortest on the complete closed body. The two caps are never neighbors. */
export function hourglassCapDistance(g:HourglassGeometry,a:SurfacePosition,b:SurfacePosition,_tolerance?:number){
 const caps=(p:SurfacePosition)=>g.aliases(p).flatMap(q=>q.patchId.startsWith('first-terminal')?['first']:q.patchId.startsWith('second-terminal')?['second']:[]);
 const A=caps(a),B=caps(b);if(!A.some(id=>B.includes(id)))return;
 const d=polyhedronPhysicalLength(polyhedronPositionBounds(g,a),polyhedronPositionBounds(g,b));
 return {scope:'global-reference-surface' as const,lowerBoundMeters:Math.max(0,d[0]),upperBoundMeters:d[1],evaluatedBoxes:0};
}
