import type {CylinderDisplayCache,CylinderRaster} from './cylindrical-raster.ts';
import {cylinderLayout,cylinderCenterInspection,type CylinderView,type CylinderViewport,type CylinderRayHit} from './cylindrical-view.ts';
import {traceCylinderExcavation,type CylinderExcavation,type CylinderExcavationHit} from '../surfaces/hollow-cylinder-excavation.ts';
import {dot3,unitDirection,type Vec3} from '../surfaces/cube-sphere.ts';
import {cylinderElevationSampler,cylinderElevationColor,cylinderRelief,type CylinderAppearance} from './cylindrical-elevation.ts';
export interface CylinderExcavationDisplay {readonly model:CylinderExcavation;readonly opposite:CylinderDisplayCache;readonly role:'exterior'|'interior';readonly revision:number}
export const cylinderCutView=(view:CylinderView,cut?:CylinderExcavationDisplay)=>!!cut&&cut.model.primitives.length>0&&view.mode==='physical'&&(!view.interior||cylinderCenterInspection(view));
export function cylinderCutHit(cut:CylinderExcavationDisplay,view:CylinderView,size:CylinderViewport,point:{x:number;y:number},cache:CylinderDisplayCache){
 const l=cylinderLayout(cache.terrain.geometry,view,size),ratio=cache.terrain.metadata.geometry.radiusMeters/cut.model.radiusMeters,x=(point.x-l.x)/l.scale,y=(l.y-point.y)/l.scale,inside=cylinderCenterInspection(view),f=view.frame;
 const o=inside?(view.eyeMeters??[0,0,0]).map(v=>v/cut.model.radiusMeters)as unknown as Vec3:f.right.map((v,i)=>v*(x+dot3(view.target,f.right))*ratio+f.up[i]!*(y+dot3(view.target,f.up))*ratio+f.forward[i]!*(Math.hypot(f.forward[0],f.forward[1])+cut.model.outerHalfLength*Math.abs(f.forward[2])+2))as unknown as Vec3;
 const d=inside?unitDirection(f.right.map((v,i)=>-v*x+f.up[i]!*y+f.forward[i]!)as unknown as Vec3):f.forward.map(v=>-v)as unknown as Vec3;
 return traceCylinderExcavation(cut.model,o,d);
}
export function cylinderCutSurfaceHit(hit:CylinderExcavationHit,cut:CylinderExcavationDisplay,cache:CylinderDisplayCache):CylinderRayHit{const r=cache.terrain.metadata.geometry.radiusMeters/cut.model.radiusMeters;return{region:hit.region,theta:Math.atan2(hit.point[1],hit.point[0]),radial:Math.min(1,Math.hypot(hit.point[0],hit.point[1])/r),z:hit.point[2]/r,depth:hit.distance};}
/** Adapter in the accepted coherent cylinder raster. Both fields are private
 * display snapshots; rock comes from the real interval subtraction, not paint. */
export function* cylinderCutRaster(cache:CylinderDisplayCache,view:CylinderView,size:CylinderViewport,budget:number,reusable:Uint8ClampedArray|undefined,appearance:CylinderAppearance,cut:CylinderExcavationDisplay):Generator<void,CylinderRaster>{
 const factor=Math.min(1.5,Math.sqrt(budget/(size.width*size.height))),columns=Math.max(1,Math.floor(size.width*factor)),rows=Math.max(1,Math.floor(size.height*factor)),pixels=reusable?.length===columns*rows*4?reusable:new Uint8ClampedArray(columns*rows*4),own=cache.elevationSnapshot(),opposite=cut.opposite.elevationSnapshot(),fields=[cylinderElevationSampler(own,cache.terrain,appearance==='relief'?'land':'none'),cylinderElevationSampler(opposite,cut.opposite.terrain,appearance==='relief'?'land':'none')],revision=cache.sourceRevision;
 for(let i=0;i<columns*rows;i++){const hit=cylinderCutHit(cut,view,size,{x:(i%columns+.5)*size.width/columns,y:(Math.floor(i/columns)+.5)*size.height/rows},cache),offset=i*4;if(!hit){pixels.fill(0,offset,offset+4);}else{let rgb:readonly number[],shade:number;
  if(hit.kind==='rock'){rgb=[164,145,114];shade=Math.max(.28,Math.min(1.1,.64+.36*dot3(hit.normal,[-.38,-.48,.78])));}
  else{const ownSide=hit.kind===cut.role,source=ownSide?cache:cut.opposite,field=fields[ownSide?0:1]!(cylinderCutSurfaceHit(hit,cut,source));rgb=cylinderElevationColor(field.height,source.terrain.metadata.seaLevel);shade=(cylinderCenterInspection(view)?1:.74+.26*Math.max(0,dot3(hit.normal,view.frame.forward)))*(appearance==='relief'&&field.height>source.terrain.metadata.seaLevel?cylinderRelief(field.dx,field.dy):1);}
  pixels[offset]=rgb[0]!*shade;pixels[offset+1]=rgb[1]!*shade;pixels[offset+2]=rgb[2]!*shade;pixels[offset+3]=255;
 }if(i%1024===1023)yield;}return{pixels,columns,rows,revision,snapshotBytes:own.byteLength+opposite.byteLength};
}
