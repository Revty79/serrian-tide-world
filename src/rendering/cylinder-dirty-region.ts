import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylinderViewport,CylinderScreenPoint} from './cylindrical-view.ts';
import type {RasterRegion} from './coherent-terrain-raster.ts';
export interface TerrainDisplayDab{readonly fromRevision:number;readonly toRevision:number;readonly center:SurfacePosition;readonly radiusMeters:number}
/** Orthographic projection is 1-Lipschitz; fitted radial inversion also is on
 * this annulus. A complete intrinsic dab plus the field's stencil support fits
 * inside the projected physical ball. Map adapters additionally exclude chart
 * discontinuities. The existing coherent sampler renders every updated pixel. */
export function cylinderDirtyRegion(changes:readonly TerrainDisplayDab[],size:CylinderViewport,columns:number,rows:number,scale:number,radiusMeters:number,paddingMeters:number,project:(p:SurfacePosition,support:number)=>CylinderScreenPoint|undefined):RasterRegion|undefined{
 let left=columns,top=rows,right=0,bottom=0;
 for(const dab of changes){const support=dab.radiusMeters+paddingMeters,point=project(dab.center,support);if(!point)return;const extent=support/radiusMeters*scale;
  left=Math.min(left,Math.floor((point.x-extent)/size.width*columns)-3);right=Math.max(right,Math.ceil((point.x+extent)/size.width*columns)+3);top=Math.min(top,Math.floor((point.y-extent)/size.height*rows)-3);bottom=Math.max(bottom,Math.ceil((point.y+extent)/size.height*rows)+3);
 }
 return{left:Math.max(0,Math.min(columns,left)),top:Math.max(0,Math.min(rows,top)),right:Math.max(0,Math.min(columns,right)),bottom:Math.max(0,Math.min(rows,bottom))};
}
/** Keep seam copies as separate rectangles so a small periodic footprint does
 * not force a blurry whole-viewport interactive raster. Overlaps merge, with a
 * fixed bound; no terrain sampling or color arithmetic is changed. */
export function cylinderDirtyRegions(changes:readonly TerrainDisplayDab[],size:CylinderViewport,columns:number,rows:number,scale:number,radiusMeters:number,paddingMeters:number,project:(p:SurfacePosition,support:number)=>readonly CylinderScreenPoint[]|undefined):readonly RasterRegion[]|undefined{
 const regions:RasterRegion[]=[];
 for(const dab of changes){const points=project(dab.center,dab.radiusMeters+paddingMeters);if(!points)return;for(const point of points){let next=cylinderDirtyRegion([dab],size,columns,rows,scale,radiusMeters,paddingMeters,()=>point)!;if(next.left>=next.right||next.top>=next.bottom)continue;
  for(let i=0;i<regions.length;){const p=regions[i]!;if(next.left<=p.right&&next.right>=p.left&&next.top<=p.bottom&&next.bottom>=p.top){next={left:Math.min(next.left,p.left),right:Math.max(next.right,p.right),top:Math.min(next.top,p.top),bottom:Math.max(next.bottom,p.bottom)};regions.splice(i,1);i=0;}else i++;}regions.push(next);if(regions.length>16)return;
 }}return regions;
}
