import {AxialPresentation} from './axial-presentation.ts';
import type {HourglassTerrain} from '../terrain/hourglass.ts';
import type {PolyhedronDisplayCache} from './polyhedron-field.ts';
/** Hourglass uses exact projected convex-region masks and narrow vertex
 * coverage in its maps. The common 131,072-pixel limit is unchanged. */
export class HourglassPresentation extends AxialPresentation<HourglassTerrain>{
 constructor(canvas:HTMLCanvasElement,fallback:HTMLCanvasElement,cache:PolyhedronDisplayCache<HourglassTerrain>,invalidate:()=>void){super(canvas,fallback,cache,invalidate,{convexBoundaryMasks:true});}
}
