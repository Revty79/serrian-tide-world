import type {FlatRing} from '../terrain/flat-ring.ts';
import {flatRingBrushPolicy} from '../terrain/flat-ring.ts';
import {openCylinderWorkspaceAdapter} from './open-cylinder-workspace-adapter.ts';
import {defaultFlatRingEditing,initialFlatRingView,validateFlatRingEditing} from '../editor/flat-ring-session.ts';
import {physicalBrushFromControls} from '../editor/cylinder-controls.ts';
import {openCylinderViewAdapter,type OpenCylinderView} from '../rendering/open-cylinder-view.ts';
import {cylinderAngle} from '../surfaces/cylinder.ts';
import {cross3,unitDirection,type Vec3} from '../surfaces/cube-sphere.ts';
import {ringworldPhysicalDirtyRegions} from '../rendering/ringworld-dirty-region.ts';
import {ringworldRaySampler} from '../rendering/ringworld-hit-field.ts';
import {openCylinderRasterSteps} from '../rendering/open-cylinder-raster.ts';
import {OpenCylinderWebGLRenderer} from '../rendering/open-cylinder-webgl.ts';
import {cylinderDirtyRegions} from '../rendering/cylinder-dirty-region.ts';
export const FLAT_RING_REGIONS=Object.freeze([{id:'rim-end',label:'Upper annulus'},{id:'upper-inner',label:'Upper inner rim'},{id:'upper-outer',label:'Upper outer rim'},{id:'inner-wall',label:'Inner wall'},{id:'outer-wall',label:'Outer wall'},{id:'lower-inner',label:'Lower inner rim'},{id:'lower-outer',label:'Lower outer rim'},{id:'rim-start',label:'Lower annulus'},{id:'seam',label:'Circumferential seam'}]);
export function flatRingRegion(world:FlatRing,id:string,phase=0){const g=world.terrain.geometry,{outerRadiusMeters:R,innerRadiusMeters:r,thicknessMeters:H}=world.configuration,W=R-r,upper=id.startsWith('upper')||id==='rim-end',lower=id.startsWith('lower')||id==='rim-start',patchId=upper?'rim-end':lower?'rim-start':id==='inner-wall'?'inner-wall':'outer-wall';return{...g.identity,patchId,u:id==='seam'?Math.PI:phase,v:upper?id.endsWith('inner')?W:id.endsWith('outer')?0:W/2:lower?id.endsWith('inner')?0:id.endsWith('outer')?W:W/2:H/2};}
export function flatRingWorkspaceAdapter(world:FlatRing,physicalPan=()=>false){
 const t=world.terrain,g=t.geometry,{outerRadiusMeters:R,innerRadiusMeters:r,thicknessMeters:H}=world.configuration,base=openCylinderWorkspaceAdapter(t,'exterior'),policy=flatRingBrushPolicy(world.configuration);
 return{...base,label:'Flat Ring',regions:FLAT_RING_REGIONS,minBrushRadius:policy.minimum,maxBrushRadius:policy.maximum,defaultControls:()=>defaultFlatRingEditing(world).controls,brush:(c:Parameters<typeof base.brush>[0])=>physicalBrushFromControls(c,policy.minimum,policy.maximum),initial:initialFlatRingView,
  normalizeView:(v:OpenCylinderView)=>validateFlatRingEditing(world,{...defaultFlatRingEditing(world),view:{...v,scope:'exterior',interior:false,interiorView:'edit',phase:cylinderAngle(v.phase)}}).view,
  description:`Ring Diameter ${(2*R).toLocaleString()} m · Hole Diameter ${(2*r).toLocaleString()} m · Ring Width ${(R-r).toLocaleString()} m · Thickness ${H.toLocaleString()} m. Elevations ${t.minElevation.toLocaleString()} to ${t.maxElevation.toLocaleString()} m shade the physical reference body. Structural dimensions are fixed after creation.`,
  mapHelp:'Upper and Lower maps are real annuli with an empty center. Lower map looks up at the underside. Wall maps show their distinct physical circumferences. Complete boundary map joins all four regions. Dashed edges are map cuts; Center selection moves the angular cut. Large brushes can follow the connected surface around the hole or through both rims. Use maps when a physical brush would reach hidden geography.',
  pointerMessage:()=>undefined,
  readoutText:(p:Parameters<typeof g.normalize>[0],index:number,height:number)=>`${FLAT_RING_REGIONS.find(x=>x.id===p.patchId)?.label} · ${height.toLocaleString()} m · sample ${index.toLocaleString()}`,
  region:(v:OpenCylinderView,id:string)=>flatRingRegion(world,id,v.phase),
  recenter:(v:OpenCylinderView,input:Parameters<typeof g.normalize>[0])=>{
   const p=g.normalize(input),q=g.physical(p);if(v.mode==='map'){const mapProjection:OpenCylinderView['mapProjection']=p.patchId==='rim-end'?'upper-annulus':p.patchId==='rim-start'?'lower-annulus':p.patchId;return{...v,mapProjection,phase:p.u,pan:{x:0,y:0},zoom:1.25};}
   const inner=p.patchId==='inner-wall'||!p.patchId.endsWith('wall')&&q.radius<r+(R-r)*.1,sign=p.patchId==='rim-start'?-1:1,forward=unitDirection(inner?[-Math.cos(p.u),-Math.sin(p.u),sign*H/(2*r)]:p.patchId==='outer-wall'?[Math.cos(p.u),Math.sin(p.u),0]:q.radius>R-(R-r)*.1?[.7*Math.cos(p.u),.7*Math.sin(p.u),sign]:[0,0,sign]),right=unitDirection(cross3(Math.abs(forward[2])>.9?[0,1,0]:[0,0,1],forward));
   return{...v,target:[q.radius*Math.cos(p.u)/R,q.radius*Math.sin(p.u)/R,(q.z-H/2)/R]as Vec3,frame:{forward,right,up:unitDirection(cross3(forward,right))},zoom:1.5};
  },
  navigate:(v:OpenCylinderView,dx:number,dy:number,size:Parameters<typeof base.navigate>[3])=>{if(v.mode==='map'||!physicalPan())return base.navigate(v,dx,dy,size);const l=openCylinderViewAdapter(g,v,size).layout;return{...v,target:v.target.map((x,i)=>Math.max(-8,Math.min(8,x-v.frame.right[i]!*dx/l.scale+v.frame.up[i]!*dy/l.scale)))as unknown as Vec3};},
  dirtyRegion:(...args:Parameters<NonNullable<typeof base.dirtyRegion>>)=>{
   const[changes,v,size,columns,rows]=args;if(v.mode==='physical')return ringworldPhysicalDirtyRegions(world,...args);if(!v.mapProjection)return base.dirtyRegion?.(...args);
   const a=openCylinderViewAdapter(g,v,size),res=t.metadata.representation.resolution,pad=2*Math.hypot(2*Math.PI*R/res.angularSamples,Math.max(H/res.axialCells,(R-r)/(2*res.radialCells))),wall=v.mapProjection.endsWith('wall'),rho=v.mapProjection==='inner-wall'?r:R;
   return cylinderDirtyRegions(changes,size,columns,rows,a.layout.scale,R,pad,(p,support)=>{const points=a.project(p);if(!points.length)return;const q=g.normalize(p),theta=cylinderAngle(q.u-v.phase);return wall&&Math.PI-Math.abs(theta)<support/rho?[...points,...points.map(point=>({...point,x:point.x+(theta>0?-1:1)*2*Math.PI*rho/R*a.layout.scale}))]:points;});
  },
  raster:(...args:Parameters<typeof base.raster>)=>{const[cache,v,size,budget,reusable,appearance,,update]=args;return openCylinderRasterSteps(cache,v,size,budget,reusable,appearance,undefined,update,ringworldRaySampler(cache,v,size,budget,update));},
  gpu:(...args:Parameters<typeof base.gpu>)=>{const[canvas,cache,invalidate]=args,gpu=new OpenCylinderWebGLRenderer(canvas,cache,invalidate,true);return{get available(){return gpu.available;},statistics:gpu.statistics,setScene:()=>{},present:(v:OpenCylinderView,s:Parameters<typeof gpu.present>[1],a:Parameters<typeof gpu.present>[2])=>gpu.present(v,s,a),fail:(e:unknown)=>gpu.fail(e),dispose:()=>gpu.dispose()};},
  guides:(mark:CanvasRenderingContext2D,v:OpenCylinderView,size:Parameters<typeof base.guides>[2])=>{if(v.mode!=='map')return;if(!v.mapProjection)return base.guides(mark,v,size);const l=openCylinderViewAdapter(g,v,size).layout,x=l.x+v.pan.x*l.scale,y=l.y-v.pan.y*l.scale;mark.strokeStyle='#f0c875';mark.lineWidth=1.25;mark.setLineDash([5,4]);if(v.mapProjection.endsWith('annulus'))for(const radius of[1,r/R]){mark.beginPath();mark.arc(x,y,radius*l.scale,0,2*Math.PI);mark.stroke();}else{const w=Math.PI*(v.mapProjection==='inner-wall'?r/R:1)*l.scale;mark.strokeRect(x-w,y-H/(2*R)*l.scale,2*w,H/R*l.scale);}mark.setLineDash([]);},
 };
}
