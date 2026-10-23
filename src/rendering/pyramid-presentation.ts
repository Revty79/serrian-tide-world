import {PolyhedronPresentation} from './polyhedron-presentation.ts';
import type {PyramidTerrain} from '../terrain/pyramid.ts';
import {PyramidDisplayCache} from './pyramid-field.ts';
import {pyramidLayout,pyramidNetPoint,projectPyramid,unprojectPyramid} from './pyramid-view.ts';
export class PyramidPresentation extends PolyhedronPresentation<PyramidTerrain>{constructor(canvas:HTMLCanvasElement,fallback:HTMLCanvasElement,cache:PyramidDisplayCache,invalidate:()=>void){super(canvas,fallback,cache,invalidate,{layout:pyramidLayout,netPoint:pyramidNetPoint,project:projectPyramid,unproject:unprojectPyramid});}}
