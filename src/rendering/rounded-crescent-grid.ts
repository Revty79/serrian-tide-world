import type {CutGlobeRayGrid} from './crescent-cut-globe-ray-cache.ts';
export interface RoundedRayGrid extends CutGlobeRayGrid {readonly density?:{readonly sx:number;readonly sy:number;readonly x0:number;readonly y0:number;readonly ox?:number;readonly oy?:number}}
/** Full and partial images use precisely the same absolute sample positions. */
export const roundedGridX=(grid:RoundedRayGrid,x:number)=>grid.density?(grid.density.ox??0)+(grid.density.x0+x)/grid.density.sx:grid.left+x*grid.width/grid.columns;
export const roundedGridY=(grid:RoundedRayGrid,y:number)=>grid.density?(grid.density.oy??0)+(grid.density.y0+y)/grid.density.sy:grid.top+y*grid.height/grid.rows;
