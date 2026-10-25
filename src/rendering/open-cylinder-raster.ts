import type {OpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import type {CylinderExcavation} from '../surfaces/hollow-cylinder-excavation.ts';
import {dot3} from '../surfaces/cube-sphere.ts';
import {IndexedDisplayCache} from './indexed-display-cache.ts';
import {coherentTerrainRasterSteps,type CoherentTerrainRaster,type TerrainRasterUpdate} from './coherent-terrain-raster.ts';
import {openCylinderElevationSampler,cylinderElevationColor,cylinderRelief,type CylinderAppearance} from './open-cylinder-elevation.ts';
import {openCylinderViewAdapter,type OpenCylinderView,type OpenCylinderViewHit} from './open-cylinder-view.ts';
import type {CylinderViewport} from './cylindrical-view.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
export const MAX_OPEN_CYLINDER_PREVIEW_SAMPLES=2*256*256;
export class OpenCylinderDisplayCache extends IndexedDisplayCache<OpenCylinderTerrain>{constructor(t:OpenCylinderTerrain){const r=t.metadata.representation.resolution;if(![64,128,256].includes(r.angularSamples)||r.axialCells!==r.angularSamples/2||r.radialCells!==r.angularSamples/4)throw RangeError('Open-cylinder preview requires the supported 64/128/256 profile.');super(t,MAX_OPEN_CYLINDER_PREVIEW_SAMPLES,'Open-cylinder preview sample budget exceeded.');}}
export function openCylinderVisibilityGuard(t:OpenCylinderTerrain,view:OpenCylinderView,size:CylinderViewport,model?:CylinderExcavation){const adapter=openCylinderViewAdapter(t.geometry,view,size,model),check=(p:SurfacePosition)=>{if(adapter.inspection)throw Error('Return from inspection before painting.');if(view.mode==='physical'&&!adapter.visible(p))throw Error('Brush reaches hidden open-cylinder samples. Reduce radius, rotate or use Surface map; the pending dab was not applied.');};return(center:SurfacePosition,indices:Iterable<number>)=>{check(center);for(const index of indices)check(t.positionAt(t.owner(t.keyAt(index))));};}
/** One accepted cylindrical presentation pipeline; only actual annular
 * intersections and display row ownership come from the Open geometry. */
export function* openCylinderRasterSteps(cache:OpenCylinderDisplayCache,view:OpenCylinderView,size:CylinderViewport,pixelBudget:number,reusable?:Uint8ClampedArray,appearance:CylinderAppearance='elevation',model?:CylinderExcavation,update?:TerrainRasterUpdate,rayAt?:(x:number,y:number)=>(OpenCylinderViewHit&{readonly displayFacing?:number})|undefined,completeCreaseCoverage=false):Generator<void,CoherentTerrainRaster>{
 if(!Number.isInteger(pixelBudget)||pixelBudget<1||pixelBudget>1500000)throw RangeError('Cylinder raster budget exceeded.');
 const geometry=openCylinderViewAdapter(cache.terrain.geometry,view,size,model),l=geometry.layout,factor=Math.min(1.5,Math.sqrt(pixelBudget/(size.width*size.height))),columns=update?.base.columns??Math.max(1,Math.floor(size.width*factor)),rows=update?.base.rows??Math.max(1,Math.floor(size.height*factor)),pixels=reusable?.length===columns*rows*4?reusable:new Uint8ClampedArray(columns*rows*4),labels=new Uint8Array(columns*rows),revision=cache.sourceRevision;
 if(update)pixels.set(update.base.pixels);
 let elevations=cache.elevationSnapshot();const sampleField=openCylinderElevationSampler(elevations,cache.terrain,appearance==='relief'?'land':'none'),sea=cache.terrain.metadata.seaLevel,snapshotBytes=elevations.byteLength+labels.byteLength;
 // The accepted closed-cylinder projected-cap bound, specialized to BOTH
 // real annular circles. Flat Ring's qualified profile enables this guard;
 // legacy Open/Ringworld calls retain their existing presentation selection.
 const f=view.frame.forward,rx=view.frame.right,uy=view.frame.up,R=geometry.radiusMeters,L=cache.terrain.geometry.metadata.lengthMeters,rayDx=size.width/columns/l.scale,rayDy=size.height/rows/l.scale,
  capRay=Math.abs(f[2])>=1e-8?[rx[0]-rx[2]/f[2]*f[0],rx[1]-rx[2]/f[2]*f[1],uy[0]-uy[2]/f[2]*f[0],uy[1]-uy[2]/f[2]*f[1]]:undefined,
  quadraticPad=capRay?(Math.hypot(capRay[0]!,capRay[1]!)*rayDx/2+Math.hypot(capRay[2]!,capRay[3]!)*rayDy/2)**2:0;
 const nearAnnularCrease=(hit:Extract<OpenCylinderViewHit,{kind:'terrain'}>)=>{
  const z=(hit.zMeters-L/2)/R,h=L/(2*R);
  if(!capRay)return h-Math.abs(z)<=Math.abs(rx[2])*rayDx/2+Math.abs(uy[2])*rayDy/2+4*Math.abs(f[2]);
  const c=hit.displayRadial*Math.cos(hit.theta),s=hit.displayRadial*Math.sin(hit.theta);
  for(const sign of[-1,1]){const d=(sign*h-z)/f[2],x=c+d*f[0],y=s+d*f[1],squared=x*x+y*y,span=Math.abs(x*capRay[0]!+y*capRay[1]!)*rayDx+Math.abs(x*capRay[2]!+y*capRay[3]!)*rayDy+quadraticPad;
   for(const r of[1,geometry.model.innerRatio])if(Math.abs(squared-r*r)<=span+64*Number.EPSILON*Math.max(1,squared))return true;
  }return false;
 };
 const sampleAt=(x:number,y:number)=>{
  const hit=rayAt?rayAt(x,y):geometry.rayAt(x,y);if(!hit)return;
  if(hit.kind==='rock')return{c:[164,145,114]as const,shade:Math.max(.28,Math.min(1.1,.64+.36*dot3(hit.normal,[-.38,-.48,.78]))),field:{crossesSea:false},hit,label:6};
  const field=sampleField(hit),c=cylinderElevationColor(field.height,sea),facing=(hit as OpenCylinderViewHit&{displayFacing?:number}).displayFacing??dot3(hit.normal,view.frame.forward),shade=(view.mode==='map'||geometry.inspection?1:.74+.26*Math.max(0,facing))*(appearance==='relief'&&field.height>sea?cylinderRelief(field.dx,field.dy):1),group=hit.patchId==='outer-wall'?2:hit.patchId==='inner-wall'?4:hit.patchId==='rim-start'?8:10;
  return{c,shade,field,hit,facing,label:group+(field.height>sea?1:0)};
 };
 try{return yield* coherentTerrainRasterSteps<OpenCylinderViewHit>({pixels,columns,rows,revision,snapshotBytes,size,grid:l,labels,region:update?.region,sampleAt,quantum:geometry.model.primitives.length?256:2048,
  nearBoundary:(center,x,y,dx,dy)=>{
   if(geometry.inspection||center?.hit?.kind==='rock')return false;if(!center?.hit)return geometry.insideBounds(x,y,dx,dy);if(view.mode==='map'&&view.mapProjection){const px=x-view.pan.x,py=y-view.pan.y,ro=cache.terrain.geometry.metadata.outerRadiusMeters,ri=cache.terrain.geometry.metadata.innerRadiusMeters;if(view.mapProjection.endsWith('annulus')){const rho=Math.hypot(px,py),pad=Math.hypot(dx,dy);return Math.min(Math.abs(rho-1),Math.abs(rho-ri/ro))<pad;}return Math.PI*(view.mapProjection==='inner-wall'?ri/ro:1)-Math.abs(px)<dx||cache.terrain.geometry.metadata.lengthMeters/(2*ro)-Math.abs(py)<dy;}if(view.mode==='map')return Math.PI-Math.abs(x-view.pan.x)<dx||cache.terrain.geometry.meridianLengthMeters/(2*geometry.radiusMeters)-Math.abs(y-view.pan.y)<dy;
   const hit=center.hit;if(hit.patchId.endsWith('wall')){const facing=Math.abs((hit as OpenCylinderViewHit&{displayFacing?:number}).displayFacing??dot3(hit.normal,view.frame.forward));return facing<.15||completeCreaseCoverage&&Math.min(hit.zMeters,L-hit.zMeters)/R<2*(dx+dy)/Math.max(.15,facing)&&nearAnnularCrease(hit);}return Math.min(hit.displayRadial-geometry.model.innerRatio,1-hit.displayRadial)<2*Math.max(dx,dy);
  },
 });}finally{elevations=new Float32Array(0);}
}
