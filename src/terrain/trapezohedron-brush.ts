import type {TrapezohedronTerrain} from './trapezohedron.ts';
import {createPolyhedronBrush,polyhedronBrushPolicy} from './polyhedron-brush.ts';
const brush=createPolyhedronBrush<TrapezohedronTerrain>();
export const TRAPEZOHEDRON_DAB_ADAPTER=brush.adapter,prepareTrapezohedronDab=brush.prepare,beginTrapezohedronStroke=brush.begin;
/** R is this family's physical reference radius. Use Atlas's accepted .0837 R
 * initial brush, retaining the shared lattice minimum and full physical domain.
 * Radius is uniform across real joins and internal diagonals. */
export function trapezohedronBrushPolicy(t:TrapezohedronTerrain){const p=polyhedronBrushPolicy(t),preferred=Math.max(.0837*t.geometry.scaleMeters,3*p.maxSpacing);return{...p,defaultRadius:Math.min(p.maximum*.9,preferred),wellSampled:preferred<=p.maximum*.9};}

export type TrapezohedronStrokeOptions=import('./connected-stroke.ts').ConnectedStrokeOptions<TrapezohedronTerrain>&{readonly view?:import('../rendering/cylindrical-view.ts').CylinderView}
