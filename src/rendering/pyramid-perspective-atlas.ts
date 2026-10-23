import type {PyramidGeometry} from '../surfaces/pyramid.ts';
import {polyhedronAtlasProjection,drawPolyhedronPerspectiveAtlas} from './polyhedron-perspective-atlas.ts';
import {pyramidLayout,pyramidNetPoint,projectPyramid,unprojectPyramid} from './pyramid-view.ts';
import type {CylinderView,CylinderViewport} from './cylindrical-view.ts';
const projection={layout:pyramidLayout,netPoint:pyramidNetPoint,project:projectPyramid,unproject:unprojectPyramid};
export const pyramidAtlasProjection=(g:PyramidGeometry,v:CylinderView,s:CylinderViewport,w:number,h:number)=>polyhedronAtlasProjection(g,v,s,w,h,projection);
export const drawPyramidPerspectiveAtlas=(ctx:CanvasRenderingContext2D,a:ReadonlyMap<string,Uint8ClampedArray>,n:number,g:PyramidGeometry,v:CylinderView,s:CylinderViewport)=>drawPolyhedronPerspectiveAtlas(ctx,a,n,g,v,s,projection);
