import type {SurfacePosition} from '../surfaces/contracts.ts';
import {cylinderAngle} from '../surfaces/cylinder.ts';
import type {OpenCylinderGeometry,OpenCylinderPosition,OpenCylinderScope} from '../surfaces/open-cylinder.ts';
import {traceCylinderExcavation,type CylinderExcavation} from '../surfaces/hollow-cylinder-excavation.ts';
import {openCylinderFreeVolume} from '../surfaces/open-cylinder-prototype.ts';
import {dot3,unitDirection,type Vec3} from '../surfaces/cube-sphere.ts';
import {cylinderFrameLayout,cylinderCenterInspection,cylinderRayHit,initialCylinderView,type CylinderView,type CylinderViewport,type CylinderScreenPoint} from './cylindrical-view.ts';
import type {OpenCylinderFieldHit} from './open-cylinder-elevation.ts';

export interface OpenCylinderView extends CylinderView {readonly scope:OpenCylinderScope}
export function initialOpenCylinderView(scope:OpenCylinderScope='exterior',mode:CylinderView['mode']='physical'):OpenCylinderView{return{...initialCylinderView(mode),scope,interior:scope==='interior',interiorView:'edit'};}
export function openCylinderReferenceModel(g:OpenCylinderGeometry):CylinderExcavation{const {outerRadiusMeters:R,innerRadiusMeters:ri,lengthMeters:L}=g.metadata;return Object.freeze({radiusMeters:R,outerHalfLength:L/R/2,innerRatio:ri/R,innerHalfLength:L/R/2,primitives:Object.freeze([])});}
export type OpenCylinderViewHit=(OpenCylinderFieldHit&{readonly kind:'terrain';readonly normal:Vec3;readonly displayRadial:number;readonly depth:number})|{readonly kind:'rock';readonly normal:Vec3;readonly depth:number};

/** Geometry-only projection/ray adapter. Camera layout and interaction use the
 * accepted cylinder view contract. Fitted Inside is explicitly a projection;
 * immersive inspection traces the actual annular material and free volume. */
export function openCylinderViewAdapter(g:OpenCylinderGeometry,view:OpenCylinderView,size:CylinderViewport,physicalModel:CylinderExcavation=openCylinderReferenceModel(g)){
 if(!['exterior','interior'].includes(view.scope)||view.interior!==undefined&&view.interior!==(view.scope==='interior'))throw RangeError('Inconsistent open-cylinder editing scope.');
 const {outerRadiusMeters:ro,innerRadiusMeters:ri,lengthMeters:L}=g.metadata,H=L/2,S=g.meridianLengthMeters,inspection=cylinderCenterInspection(view),fittedInside=view.mode==='physical'&&view.scope==='interior'&&!inspection,R=view.mode==='map'?ro:view.scope==='interior'?ri:ro;
 if(physicalModel.radiusMeters!==ro||physicalModel.innerRatio!==ri/ro||physicalModel.outerHalfLength!==L/ro/2||physicalModel.innerHalfLength!==L/ro/2||!Array.isArray(physicalModel.primitives)||physicalModel.primitives.length>48)throw RangeError('Foreign or unsupported open-cylinder display geometry.');
 const model=fittedInside?Object.freeze({radiusMeters:ri,outerHalfLength:L/ri/2,innerRatio:ri/ro,innerHalfLength:L/ri/2,primitives:Object.freeze([])}):physicalModel;
 if(model.outerHalfLength!==model.innerHalfLength)throw RangeError('Open-cylinder display requires actual equal-length annular ends.');
 const layout=cylinderFrameLayout({radiusMeters:R,lengthMeters:L},view,size,{halfWidth:Math.PI,halfHeight:S/(2*ro)}),f=view.frame,tx=dot3(view.target,f.right),ty=dot3(view.target,f.up),ratio=R/model.radiusMeters;
 const eye=view.eyeMeters??[0,0,0];if(inspection&&!openCylinderFreeVolume(model,eye))throw RangeError('Open-cylinder inspection eye must remain in actual free volume.');
 const originExtent=Math.hypot(f.forward[0],f.forward[1])+model.outerHalfLength*Math.abs(f.forward[2])+2,halfWidth=Math.hypot(f.right[0],f.right[1])+model.outerHalfLength*Math.abs(f.right[2]),halfHeight=Math.hypot(f.up[0],f.up[1])+model.outerHalfLength*Math.abs(f.up[2]);
 const rayAt=(x:number,y:number):OpenCylinderViewHit|undefined=>{
  if(view.mode==='map'){
   const px=x-view.pan.x,py=y-view.pan.y,raw=S/2+py*ro,pad=1e-12*Math.max(ro,L,S);if(Math.abs(px)>Math.PI+pad/ro||raw< -pad||raw>S+pad)return;const m=Math.max(0,Math.min(S,raw));
   const theta=cylinderAngle(view.phase+Math.max(-Math.PI,Math.min(Math.PI,px))),T=g.thicknessMeters;
   if(m<=L)return{kind:'terrain',patchId:'outer-wall',theta,radiusMeters:ro,zMeters:m,normal:[0,0,1],displayRadial:1,depth:0};
   if(m<=L+T)return{kind:'terrain',patchId:'rim-end',theta,radiusMeters:ro-(m-L),zMeters:L,normal:[0,0,1],displayRadial:(ro-(m-L))/ro,depth:0};
   if(m<=2*L+T)return{kind:'terrain',patchId:'inner-wall',theta,radiusMeters:ri,zMeters:L-(m-L-T),normal:[0,0,1],displayRadial:ri/ro,depth:0};
   return{kind:'terrain',patchId:'rim-start',theta,radiusMeters:Math.min(ro,ri+(m-2*L-T)),zMeters:0,normal:[0,0,1],displayRadial:(ri+(m-2*L-T))/ro,depth:0};
  }
  // Use the accepted convex-cylinder intersection for every unchanged nearest
  // wall or real annular rim. Only rays through a natural opening (or authored
  // excavation/inspection) need the interval subtraction adapter.
  if(!inspection&&!model.primitives.length){
   const hit=cylinderRayHit(x+tx,y+ty,f,model.outerHalfLength);
   if(!hit)return;
   if(hit.region==='side'||hit.radial>=model.innerRatio){
    const radius=hit.region==='side'?fittedInside?ri:ro:fittedInside?ri/Math.max(hit.radial,Number.MIN_VALUE):ro*hit.radial,patchId=hit.region==='side'?fittedInside?'inner-wall':'outer-wall':hit.region==='cap-start'?'rim-start':'rim-end';
    return{kind:'terrain',patchId,theta:hit.theta,radiusMeters:radius,zMeters:Math.max(0,Math.min(L,hit.z*model.radiusMeters+H)),normal:hit.region==='side'?[Math.cos(hit.theta),Math.sin(hit.theta),0]:[0,0,hit.region==='cap-start'?-1:1],displayRadial:hit.radial,depth:originExtent-hit.depth};
   }
  }
  const origin=inspection?eye.map(v=>v/model.radiusMeters)as unknown as Vec3:f.right.map((v,i)=>v*(x+tx)*ratio+f.up[i]!*(y+ty)*ratio+f.forward[i]!*originExtent)as unknown as Vec3,direction=inspection?unitDirection(f.right.map((v,i)=>-v*x+f.up[i]!*y+f.forward[i]!)as unknown as Vec3):f.forward.map(v=>-v)as unknown as Vec3,hit=traceCylinderExcavation(model,origin,direction);
  if(!hit)return;if(hit.kind==='rock')return{kind:'rock',normal:hit.normal,depth:hit.distance};
  const radial=Math.hypot(hit.point[0],hit.point[1]),rho=fittedInside?ri/Math.max(radial,Number.MIN_VALUE):radial*ro,z=Math.max(0,Math.min(L,hit.point[2]*model.radiusMeters+H)),theta=Math.atan2(hit.point[1],hit.point[0]),patchId=hit.region==='side'?(hit.kind==='exterior'?fittedInside?'inner-wall':'outer-wall':fittedInside?'outer-wall':'inner-wall'):hit.region==='cap-start'?'rim-start':'rim-end';
  return{kind:'terrain',patchId,theta,radiusMeters:Math.max(ri,Math.min(ro,rho)),zMeters:z,normal:hit.normal,displayRadial:radial,depth:hit.distance};
 };
 const positionAtHit=(hit:OpenCylinderViewHit):OpenCylinderPosition|undefined=>{if(hit.kind==='rock')return;const v=hit.patchId==='outer-wall'?hit.zMeters:hit.patchId==='inner-wall'?L-hit.zMeters:hit.patchId==='rim-end'?ro-hit.radiusMeters:hit.radiusMeters-ri;return g.normalize({...g.identity,patchId:hit.patchId,u:hit.theta,v:Math.max(0,Math.min(hit.patchId.endsWith('wall')?L:g.thicknessMeters,v))});};
 const hitAt=(point:CylinderScreenPoint)=>rayAt((point.x-layout.x)/layout.scale,(layout.y-point.y)/layout.scale);
 const project=(input:SurfacePosition):readonly CylinderScreenPoint[]=>{
  const p=g.normalize(input),q=g.physical(p);
  if(view.mode==='map'){
   const angles=[cylinderAngle(p.u-view.phase)],base=angles[0]!;if(Math.abs(Math.abs(base)-Math.PI)<1e-12)angles.push(-base);const points:CylinderScreenPoint[]=[];
   for(const alias of g.aliases(p)){const m=g.meridianAt(alias);for(const angle of angles){const point={x:layout.x+(angle+view.pan.x)*layout.scale,y:layout.y-((m-S/2)/ro+view.pan.y)*layout.scale};if(!points.some(p=>Math.abs(p.x-point.x)<1e-9&&Math.abs(p.y-point.y)<1e-9))points.push(point);}}return points;
  }
  const radius=fittedInside?ri*ri/q.radius:q.radius,point:Vec3=[radius*Math.cos(p.u)/R,radius*Math.sin(p.u)/R,(q.z-H)/R];
  if(inspection){const relative=point.map((v,i)=>v-eye[i]!/R)as unknown as Vec3,depth=dot3(relative,f.forward);if(depth<=1e-5)return[];return[{x:layout.x-dot3(relative,f.right)/depth*layout.scale,y:layout.y-dot3(relative,f.up)/depth*layout.scale}];}
  return[{x:layout.x+(dot3(point,f.right)-tx)*layout.scale,y:layout.y-(dot3(point,f.up)-ty)*layout.scale}];
 };
 const visible=(input:SurfacePosition)=>{if(view.mode==='map')return true;if(inspection)return false;const points=project(input);if(!points.length)return false;const hit=hitAt(points[0]!);if(hit?.kind!=='terrain')return false;const at=positionAtHit(hit)!,a=g.referencePosition(input),b=g.referencePosition(at);return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])<=1e-8*Math.max(ro,L);};
 return Object.freeze({layout,model,inspection,fittedInside,radiusMeters:R,halfWidth,halfHeight,tx,ty,rayAt,hitAt,positionAtHit,project,visible,
  editablePositionAtHit:(hit:OpenCylinderViewHit)=>{const p=positionAtHit(hit);return p&&!inspection?p:undefined;},
  insideBounds:(x:number,y:number,dx:number,dy:number)=>view.mode==='map'?Math.abs(x-view.pan.x)<=Math.PI+dx&&Math.abs(y-view.pan.y)<=S/(2*ro)+dy:Math.abs(x+tx)<=halfWidth/ratio+dx&&Math.abs(y+ty)<=halfHeight/ratio+dy,
 });
}
