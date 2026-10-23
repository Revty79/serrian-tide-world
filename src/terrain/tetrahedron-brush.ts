import type {TetrahedronTerrain} from './tetrahedron.ts';
import {createPolyhedronBrush} from './polyhedron-brush.ts';
const brush=createPolyhedronBrush<TetrahedronTerrain>();
export const TETRAHEDRON_DAB_ADAPTER=brush.adapter,prepareTetrahedronDab=brush.prepare,beginTetrahedronStroke=brush.begin;
export {polyhedronBrushPolicy as tetrahedronBrushPolicy} from './polyhedron-brush.ts';
