import type {PyramidTerrain} from './pyramid.ts';
import {createPolyhedronBrush} from './polyhedron-brush.ts';
import type {ConnectedStrokeOptions} from './connected-stroke.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
export {polyhedronBrushPolicy as pyramidBrushPolicy} from './polyhedron-brush.ts';
const brush=createPolyhedronBrush<PyramidTerrain>();
export const PYRAMID_DAB_ADAPTER=brush.adapter,pyramidSmoothEstimate=brush.smooth,preparePyramidDab=brush.prepare,beginPyramidStroke=brush.begin;
export interface PyramidStrokeOptions extends ConnectedStrokeOptions<PyramidTerrain>{readonly view?:CylinderView}
