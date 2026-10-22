import type {OpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import type {CylinderExcavation} from '../surfaces/hollow-cylinder-excavation.ts';
import {dot3} from '../surfaces/cube-sphere.ts';
import {IndexedDisplayCache} from './indexed-display-cache.ts';
import {coherentTerrainRasterSteps,type CoherentTerrainRaster} from './coherent-terrain-raster.ts';
import {openCylinderElevationSampler,cylinderElevationColor,cylinderRelief,type CylinderAppearance} from './open-cylinder-elevation.ts';
import {openCylinderViewAdapter,type OpenCylinderView,type OpenCylinderViewHit} from './open-cylinder-view.ts';
import type {CylinderViewport} from './cylindrical-view.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
export const MAX_OPEN_CYLINDER_PREVIEW_SAMPLES=2*256*256;
export class OpenCylinderDisplayCache extends IndexedDisplayCache<OpenCylinderTerrain>{constructor(t:OpenCylinderTerrain){const r=t.metadata.representation.resolution;if(![64,128,256].includes(r.angularSamples)||r.axialCells!==r.angularSamples/2||r.radialCells!==r.angularSamples/4)throw RangeError('Open-cylinder preview requires the supported 64/128/256 profile.');super(t,MAX_OPEN_CYLINDER_PREVIEW_SAMPLES,'Open-cylinder preview sample budget exceeded.');}}
export function openCylinderVisibilityGuard(t:OpenCylinderTerrain,view:OpenCylinderView,size:CylinderViewport,model?:CylinderExcavation){const adapter=openCylinderViewAdapter(t.geometry,view,size,model),check=(p:SurfacePosition)=>{if(adapter.inspection)throw Error('Return from inspection before painting.');if(view.mode==='physical'&&(!t.geometry.scopeContains(p,view.scope)||!adapter.visible(p)))throw Error('Brush reaches hidden or unselected open-cylinder samples. Reduce radius, rotate, change painting scope or use Surface map; the pending dab was not applied.');};return(center:SurfacePosition,indices:Iterable<number>)=>{check(center);for(const index of indices)check(t.positionAt(t.owner(t.keyAt(index))));};}
/** One accepted cylindrical presentation pipeline; only actual annular
 * intersections and display row ownership come from the Open geometry. */
export function* openCylinderRasterSteps(cache:OpenCylinderDisplayCache,view:OpenCylinderView,size:CylinderViewport,pixelBudget:number,reusable?:Uint8ClampedArray,appearance:CylinderAppearance='elevation',model?:CylinderExcavation):Generator<void,CoherentTerrainRaster>{
 if(!Number.isInteger(pixelBudget)||pixelBudget<1||pixelBudget>1500000)throw RangeError('Cylinder raster budget exceeded.');
 const geometry=openCylinderViewAdapter(cache.terrain.geometry,view,size,model),l=geometry.layout,factor=Math.min(1.5,Math.sqrt(pixelBudget/(size.width*size.height))),columns=Math.max(1,Math.floor(size.width*factor)),rows=Math.max(1,Math.floor(size.height*factor)),pixels=reusable?.length===columns*rows*4?reusable:new Uint8ClampedArray(columns*rows*4),labels=new Uint8Array(columns*rows),revision=cache.sourceRevision;
 let elevations=cache.elevationSnapshot();const sampleField=openCylinderElevationSampler(elevations,cache.terrain,appearance==='relief'?'land':'none'),sea=cache.terrain.metadata.seaLevel,snapshotBytes=elevations.byteLength+labels.byteLength;
 const sampleAt=(x:number,y:number)=>{
  const hit=geometry.rayAt(x,y);if(!hit)return;
  if(hit.kind==='rock')return{c:[164,145,114]as const,shade:Math.max(.28,Math.min(1.1,.64+.36*dot3(hit.normal,[-.38,-.48,.78]))),field:{crossesSea:false},hit,label:6};
  const field=sampleField(hit),c=cylinderElevationColor(field.height,sea),facing=dot3(hit.normal,view.frame.forward),shade=(view.mode==='map'||geometry.inspection?1:.74+.26*Math.max(0,facing))*(appearance==='relief'&&field.height>sea?cylinderRelief(field.dx,field.dy):1),group=hit.patchId==='outer-wall'?2:hit.patchId==='inner-wall'?4:hit.patchId==='rim-start'?8:10;
  return{c,shade,field,hit,label:group+(field.height>sea?1:0)};
 };
 try{return yield* coherentTerrainRasterSteps<OpenCylinderViewHit>({pixels,columns,rows,revision,snapshotBytes,size,grid:l,labels,sampleAt,quantum:geometry.model.primitives.length?256:2048,
  nearBoundary:(center,x,y,dx,dy)=>{
   if(geometry.inspection||center?.hit?.kind==='rock')return false;if(!center?.hit)return geometry.insideBounds(x,y,dx,dy);if(view.mode==='map')return Math.PI-Math.abs(x-view.pan.x)<dx||cache.terrain.geometry.meridianLengthMeters/(2*geometry.radiusMeters)-Math.abs(y-view.pan.y)<dy;
   const hit=center.hit;if(hit.patchId.endsWith('wall'))return Math.abs(dot3(hit.normal,view.frame.forward))<.15;return Math.min(hit.displayRadial-geometry.model.innerRatio,1-hit.displayRadial)<2*Math.max(dx,dy);
  },
 });}finally{elevations=new Float32Array(0);}
}
