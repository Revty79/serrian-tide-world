import type {IcosahedronTerrain} from './icosahedron.ts';
import {createPolyhedronBrush,polyhedronBrushPolicy} from './polyhedron-brush.ts';
const brush=createPolyhedronBrush<IcosahedronTerrain>();
export const ICOSAHEDRON_DAB_ADAPTER=brush.adapter,prepareIcosahedronDab=brush.prepare,beginIcosahedronStroke=brush.begin;
export function icosahedronBrushPolicy(t:IcosahedronTerrain){const p=polyhedronBrushPolicy(t),preferred=Math.max(.0837*t.geometry.scaleMeters,3*p.maxSpacing);return{...p,defaultRadius:Math.min(p.maximum*.9,preferred),wellSampled:preferred<=p.maximum*.9};}
export type IcosahedronStrokeOptions=import('./connected-stroke.ts').ConnectedStrokeOptions<IcosahedronTerrain>&{readonly view?:import('../rendering/cylindrical-view.ts').CylinderView};
