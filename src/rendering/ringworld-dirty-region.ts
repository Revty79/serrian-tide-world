import type {Ringworld} from '../terrain/ringworld.ts';
import type {OpenCylinderView} from './open-cylinder-view.ts';
import {openCylinderViewAdapter} from './open-cylinder-view.ts';
import type {CylinderViewport} from './cylindrical-view.ts';
import {appendCylinderDirtyRegion,type TerrainDisplayDab} from './cylinder-dirty-region.ts';
import type {RasterRegion} from './coherent-terrain-raster.ts';
/** Project the actual two-cell Hermite/gradient stencil on every potentially
 * affected physical chart. The intrinsic dab projects inside its radius ball.
 * Wall rows travel along Z; annular rows travel radially. Angular basis extrema
 * use a conservative sin/cos Lipschitz enclosure over the complete footprint.
 * Fitted radial inversion is 1-Lipschitz on this annulus. No terrain is sampled,
 * blurred or changed here; unknown/nonphysical views use the accepted fallback. */
export function ringworldPhysicalDirtyRegions(world:Ringworld,changes:readonly TerrainDisplayDab[],view:OpenCylinderView,size:CylinderViewport,columns:number,rows:number){
 if(view.mode!=='physical'||view.interiorView==='center')return;
 const g=world.terrain.geometry,{outerRadiusMeters:ro,innerRadiusMeters:ri,lengthMeters:L}=g.metadata,T=g.thicknessMeters,S=g.meridianLengthMeters,{angularSamples:A,axialCells:Z,radialCells:P}=world.terrain.metadata.representation.resolution,stepZ=L/Z,stepR=T/(2*P),angleStep=2*Math.PI/A,adapter=openCylinderViewAdapter(g,view,size),regions:RasterRegion[]=[];
 for(const dab of changes){const p=g.normalize(dab.center);if(!adapter.visible(p))return;const screen=adapter.project(p)[0];if(!screen)return;const m=g.meridianAt(p),support=dab.radiusMeters+2*Math.max(stepZ,stepR),window=dab.radiusMeters/ri+2*angleStep;
  const intersects=(low:number,high:number)=>[-S,0,S].some(offset=>m-support<=high+offset&&m+support>=low+offset),patches=[{low:0,high:L,wall:true,radius:ro},{low:L,high:L+T,wall:false,radius:ro},{low:L+T,high:2*L+T,wall:true,radius:ri},{low:2*L+T,high:S,wall:false,radius:ro}].filter(patch=>intersects(patch.low,patch.high));
  const padding=(axis:readonly number[])=>{const radialNorm=Math.hypot(axis[0]!,axis[1]!),c=Math.cos(p.u),s=Math.sin(p.u),angular=Math.min(radialNorm,Math.abs(-s*axis[0]!+c*axis[1]!)+radialNorm*window),radial=Math.min(radialNorm,Math.abs(c*axis[0]!+s*axis[1]!)+radialNorm*window);return Math.max(...patches.map(patch=>2*angleStep*patch.radius*angular+2*(patch.wall?stepZ*Math.abs(axis[2]!):stepR*radial)));};
  const scale=adapter.layout.scale/adapter.radiusMeters,dx=(dab.radiusMeters+padding(view.frame.right))*scale,dy=(dab.radiusMeters+padding(view.frame.up))*scale,region={left:Math.max(0,Math.floor((screen.x-dx)/size.width*columns)-3),right:Math.min(columns,Math.ceil((screen.x+dx)/size.width*columns)+3),top:Math.max(0,Math.floor((screen.y-dy)/size.height*rows)-3),bottom:Math.min(rows,Math.ceil((screen.y+dy)/size.height*rows)+3)};
  if(!appendCylinderDirtyRegion(regions,region))return;
 }
 return regions;
}
