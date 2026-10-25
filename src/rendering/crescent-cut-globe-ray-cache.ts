import type {SphericalView,Viewport} from './spherical-view.ts';
export interface CutGlobeRayGrid {readonly columns:number;readonly rows:number;readonly left:number;readonly top:number;readonly width:number;readonly height:number}
interface RayGrid {key:string;codes:Uint8Array;coordinates:Float64Array;bytes:number}
const MAX_BYTES=8*1024*1024,MAX_ENTRIES=2,grids:RayGrid[]=[];
export const cutGlobeRayCacheBytes=()=>grids.reduce((sum,g)=>sum+g.bytes,0);
/** Geometry only. Float64 preserves the uncached inversion's exact JS values.
 * Large settled grids remain temporary and are never retained in this cache. */
export function cutGlobeRayGrid(view:SphericalView,size:Viewport,grid?:CutGlobeRayGrid){
 if(!grid||!view.cutGlobe||grid.columns*grid.rows>200000)return undefined;
 const key=JSON.stringify([view,size,grid]),found=grids.findIndex(g=>g.key===key);
 if(found>=0){const g=grids.splice(found,1)[0]!;grids.push(g);return g;}
 const count=grid.columns*grid.rows,bytes=count*25;if(bytes>MAX_BYTES)return undefined;
 while(grids.length>=MAX_ENTRIES||cutGlobeRayCacheBytes()+bytes>MAX_BYTES)grids.shift();
 const next={key,codes:new Uint8Array(count),coordinates:new Float64Array(count*3),bytes};grids.push(next);return next;
}
