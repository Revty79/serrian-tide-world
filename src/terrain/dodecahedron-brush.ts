import type {DodecahedronTerrain} from './dodecahedron.ts';
import {createPolyhedronBrush,polyhedronBrushPolicy} from './polyhedron-brush.ts';
const brush=createPolyhedronBrush<DodecahedronTerrain>();
export const DODECAHEDRON_DAB_ADAPTER=brush.adapter,prepareDodecahedronDab=brush.prepare,beginDodecahedronStroke=brush.begin;
export function dodecahedronBrushPolicy(t:DodecahedronTerrain){const p=polyhedronBrushPolicy(t),preferred=Math.max(.0837*t.geometry.scaleMeters,3*p.maxSpacing);return{...p,defaultRadius:Math.min(p.maximum*.9,preferred),wellSampled:preferred<=p.maximum*.9};}
export type DodecahedronStrokeOptions=import('./connected-stroke.ts').ConnectedStrokeOptions<DodecahedronTerrain>&{readonly view?:import('../rendering/cylindrical-view.ts').CylinderView};
