import type{FlatDisc}from'../terrain/flat-disc.ts';import{flatDiscBrushPolicy}from'../terrain/flat-disc.ts';
import{FLAT_DISC_REGIONS}from'../surfaces/flat-disc.ts';import{cylinderAngle}from'../surfaces/cylinder.ts';
import{closedCylinderWorkspaceAdapter}from'./closed-cylinder-workspace-adapter.ts';
import{defaultFlatDiscEditing,initialFlatDiscView,validateFlatDiscEditing}from'../editor/flat-disc-session.ts';
import{physicalBrushFromControls}from'../editor/cylinder-controls.ts';
import{cylinderLayout,recenterCylinder,type CylinderView}from'../rendering/cylindrical-view.ts';
import{cross3,unitDirection,type Vec3}from'../surfaces/cube-sphere.ts';

export function flatDiscRegion(world:FlatDisc,id:string,phase=0){
 const R=world.configuration.radiusMeters,H=world.configuration.thicknessMeters,upper=id.startsWith('upper')||id==='cap-end',lower=id.startsWith('lower')||id==='cap-start',patchId=upper?'cap-end':lower?'cap-start':'side',u=id==='seam'?Math.PI:patchId==='cap-end'?-phase:phase;
 return{...world.terrain.metadata.identity,patchId,u,v:patchId==='side'?H/2:id.endsWith('rim')?R:id.endsWith('edge')?R*.96:id.endsWith('middle')?R*.5:0};
}
/** Specialize the accepted closed renderer and actual circular map domains.
 * No new field, shader, terrain authority or distance engine is introduced. */
export function flatDiscWorkspaceAdapter(world:FlatDisc,physicalPan=()=>false){
 const t=world.terrain,g=t.geometry,R=world.configuration.radiusMeters,H=world.configuration.thicknessMeters,base=closedCylinderWorkspaceAdapter(t),p=flatDiscBrushPolicy(world.configuration);
 return{...base,label:'Flat Disc',regions:FLAT_DISC_REGIONS,minBrushRadius:p.minimum,maxBrushRadius:p.maximum,
  defaultControls:()=>defaultFlatDiscEditing(world).controls,brush:(c:Parameters<typeof base.brush>[0])=>physicalBrushFromControls(c,p.minimum,p.maximum),initial:initialFlatDiscView,
  normalizeView:(v:CylinderView)=>validateFlatDiscEditing(world,{...defaultFlatDiscEditing(world),view:{...v,phase:cylinderAngle(v.phase)}}).view,
  description:`Disc Diameter ${(2*R).toLocaleString()} m · Disc Thickness ${H.toLocaleString()} m. Upper, lower and sidewall geography share real rims. Structural dimensions are fixed after creation. Elevations color and shade the physical reference body.`,
  mapHelp:'Upper and Lower maps are complete circular domains. Sidewall map unwraps the real circumference; its left/right cut is periodic geography. At a map cut, lift and restart or change the working meridian with Center selection. Physical view crosses either real rim continuously.',
  readoutText:(q:Parameters<typeof g.normalize>[0],index:number,height:number)=>`${q.patchId==='cap-end'?'Upper geography':q.patchId==='cap-start'?'Lower geography':'Sidewall'} · ${height.toLocaleString()} m · sample ${index.toLocaleString()}`,
  region:(v:CylinderView,id:string)=>flatDiscRegion(world,id,v.phase),
  recenter:(v:CylinderView,q:Parameters<typeof g.normalize>[0])=>{
   let result=recenterCylinder(g,v,q);if(v.mode==='map')return{...result,zoom:4};
   if(q.patchId!=='side'&&q.v>R*.85){const theta=q.patchId==='cap-end'?-q.u:q.u,forward=unitDirection([.7*Math.cos(theta),.7*Math.sin(theta),q.patchId==='cap-end'?1:-1]),right=unitDirection(cross3([0,0,1],forward));result={...result,frame:{forward,right,up:unitDirection(cross3(forward,right))}};}
   return{...result,zoom:q.patchId==='side'?6:3};
  },
  navigate:(v:CylinderView,dx:number,dy:number,size:Parameters<typeof base.navigate>[3])=>{
   if(v.mode==='map'||!physicalPan())return base.navigate(v,dx,dy,size);const l=cylinderLayout(g,v,size);
   return{...v,target:v.target.map((x,k)=>Math.max(-8,Math.min(8,x-v.frame.right[k]!*dx/l.scale+v.frame.up[k]!*dy/l.scale)))as unknown as Vec3};
  },
  guides:(mark:CanvasRenderingContext2D,v:CylinderView,size:Parameters<typeof base.guides>[2])=>{
   if(v.mode!=='map')return;const l=cylinderLayout(g,v,size),x=l.x+v.pan.x*l.scale,y=l.y-v.pan.y*l.scale;
   mark.strokeStyle='#f0c875';mark.lineWidth=1.25;mark.setLineDash([5,4]);mark.strokeRect(x-Math.PI*l.scale,y-l.h*l.scale,2*Math.PI*l.scale,2*l.h*l.scale);
   for(const sign of[-1,1]){mark.beginPath();mark.arc(x,y-sign*(l.h+1)*l.scale,l.scale,0,2*Math.PI);mark.stroke();}mark.setLineDash([]);
   mark.font='12px system-ui';mark.textAlign='center';mark.lineWidth=4;mark.strokeStyle='#071924';mark.fillStyle='#f4f4e9';
   for(const[label,yy]of[['Upper geography',y-(l.h+1)*l.scale],['Sidewall · periodic circumference',y],['Lower geography',y+(l.h+1)*l.scale]]as const){mark.strokeText(label,x,yy);mark.fillText(label,x,yy);}
   for(const sign of[-1,1]){mark.strokeStyle='#f6f7ef';mark.lineWidth=2;mark.beginPath();mark.arc(x,y-sign*l.h*l.scale,4,0,2*Math.PI);mark.stroke();}
  },
 };
}
