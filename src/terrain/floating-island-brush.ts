import type {FloatingIslandTerrain} from './floating-island.ts';
import {createPolyhedronBrush,polyhedronBrushPolicy} from './polyhedron-brush.ts';
const brush=createPolyhedronBrush<FloatingIslandTerrain>();
export const FLOATING_ISLAND_DAB_ADAPTER=brush.adapter,prepareFloatingIslandDab=brush.prepare,beginFloatingIslandStroke=brush.begin;
export function floatingIslandBrushPolicy(t:FloatingIslandTerrain){const p=polyhedronBrushPolicy(t),preferred=Math.max(.025*Math.min(t.geometry.scaleMeters,t.geometry.metadata.lengthMeters,t.geometry.metadata.thicknessMeters/.4),3*p.maxSpacing);return{...p,defaultRadius:Math.min(p.maximum*.9,preferred),wellSampled:preferred<=p.maximum*.9};}
export type FloatingIslandStrokeOptions=import('./connected-stroke.ts').ConnectedStrokeOptions<FloatingIslandTerrain>&{readonly view?:import('../rendering/cylindrical-view.ts').CylinderView};
