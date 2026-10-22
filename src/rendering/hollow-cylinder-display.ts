import type {CylinderDisplayCache} from './cylindrical-raster.ts';
import {cylinderLayout,cylinderCenterInspection,type CylinderView,type CylinderViewport,type CylinderRayHit} from './cylindrical-view.ts';
import {traceCylinderExcavation,type CylinderExcavation,type CylinderExcavationHit} from '../surfaces/hollow-cylinder-excavation.ts';
import {dot3,unitDirection,type Vec3} from '../surfaces/cube-sphere.ts';
export interface CylinderExcavationDisplay {readonly model:CylinderExcavation;readonly opposite:CylinderDisplayCache;readonly role:'exterior'|'interior';readonly revision:number}
export const cylinderCutView=(view:CylinderView,cut?:CylinderExcavationDisplay)=>!!cut&&cut.model.primitives.length>0&&view.mode==='physical'&&(!view.interior||cylinderCenterInspection(view));
export function cylinderCutHit(cut:CylinderExcavationDisplay,view:CylinderView,size:CylinderViewport,point:{x:number;y:number},cache:CylinderDisplayCache){
 const l=cylinderLayout(cache.terrain.geometry,view,size),ratio=cache.terrain.metadata.geometry.radiusMeters/cut.model.radiusMeters,x=(point.x-l.x)/l.scale,y=(l.y-point.y)/l.scale,inside=cylinderCenterInspection(view),f=view.frame;
 const o=inside?(view.eyeMeters??[0,0,0]).map(v=>v/cut.model.radiusMeters)as unknown as Vec3:f.right.map((v,i)=>v*(x+dot3(view.target,f.right))*ratio+f.up[i]!*(y+dot3(view.target,f.up))*ratio+f.forward[i]!*(Math.hypot(f.forward[0],f.forward[1])+cut.model.outerHalfLength*Math.abs(f.forward[2])+2))as unknown as Vec3;
 const d=inside?unitDirection(f.right.map((v,i)=>-v*x+f.up[i]!*y+f.forward[i]!)as unknown as Vec3):f.forward.map(v=>-v)as unknown as Vec3;
 return traceCylinderExcavation(cut.model,o,d);
}
export function cylinderCutSurfaceHit(hit:CylinderExcavationHit,cut:CylinderExcavationDisplay,cache:CylinderDisplayCache):CylinderRayHit{const r=cache.terrain.metadata.geometry.radiusMeters/cut.model.radiusMeters;return{region:hit.region,theta:Math.atan2(hit.point[1],hit.point[0]),radial:Math.min(1,Math.hypot(hit.point[0],hit.point[1])/r),z:hit.point[2]/r,depth:hit.distance};}
