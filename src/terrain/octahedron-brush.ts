import type {OctahedronTerrain} from './octahedron.ts';
import {createPolyhedronBrush} from './polyhedron-brush.ts';
const brush=createPolyhedronBrush<OctahedronTerrain>();
export const OCTAHEDRON_DAB_ADAPTER=brush.adapter,prepareOctahedronDab=brush.prepare,beginOctahedronStroke=brush.begin;
export {polyhedronBrushPolicy as octahedronBrushPolicy} from './polyhedron-brush.ts';

export type OctahedronStrokeOptions=import('./connected-stroke.ts').ConnectedStrokeOptions<OctahedronTerrain>&{readonly view?:import('../rendering/cylindrical-view.ts').CylinderView}
