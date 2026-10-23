import {PolyhedronPresentation} from './polyhedron-presentation.ts';
import type {PyramidTerrain} from '../terrain/pyramid.ts';
import {PyramidDisplayCache} from './pyramid-field.ts';
import {pyramidProjection} from './pyramid-view.ts';
export class PyramidPresentation extends PolyhedronPresentation<PyramidTerrain>{constructor(canvas:HTMLCanvasElement,fallback:HTMLCanvasElement,cache:PyramidDisplayCache,invalidate:()=>void){super(canvas,fallback,cache,invalidate,pyramidProjection);}}
