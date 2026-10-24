import type {Ringworld} from '../terrain/ringworld.ts';
import {RINGWORLD_REGIONS} from '../surfaces/ringworld.ts';
import type {OpenCylinderScope} from '../surfaces/open-cylinder.ts';
import {openCylinderWorkspaceAdapter} from './open-cylinder-workspace-adapter.ts';
import {defaultRingworldEditing} from '../editor/ringworld-document.ts';
import {openCylinderViewAdapter} from '../rendering/open-cylinder-view.ts';
import {cylinderAngle} from '../surfaces/cylinder.ts';
import {ringworldPhysicalDirtyRegions} from '../rendering/ringworld-dirty-region.ts';
import {ringworldRaySampler} from '../rendering/ringworld-hit-field.ts';
import {openCylinderRasterSteps} from '../rendering/open-cylinder-raster.ts';
/** Identity, cartographic labels and cyclic ring navigation over the accepted
 * four-region physical field, renderer, picker and dirty-region implementation. */
export function ringworldWorkspaceAdapter(world:Ringworld,scope:OpenCylinderScope,physicalPan=()=>false){
 const base=openCylinderWorkspaceAdapter(world.terrain,scope),g=world.terrain.geometry,Ro=world.configuration.outerRadiusMeters,L=world.configuration.widthMeters,T=world.geometry.structuralThicknessMeters,S=g.meridianLengthMeters;
 return{...base,label:'Ringworld',regions:RINGWORLD_REGIONS.filter(region=>!region.id.endsWith('wall')||region.id===(scope==='interior'?'inner-wall':'outer-wall')),defaultControls:()=>defaultRingworldEditing(world).controls,
  description:`Ring radius ${world.configuration.innerRadiusMeters.toLocaleString()} m · width ${L.toLocaleString()} m · structural thickness ${T.toLocaleString()} m. ${world.terrain.sampleCount.toLocaleString()} canonical samples. Supported elevations ${world.terrain.minElevation.toLocaleString()} to ${world.terrain.maxElevation.toLocaleString()} m. Elevations color the physical reference boundary without displacing it.`,
  mapHelp:'The complete boundary map follows Outer Band → Upper Rim → Inner Band → Lower Rim. Solid joins are real shared creases. Dashed edges are cartographic cuts. Drag horizontally to move the angular cut; focused band maps retain the connected rims.',
  readoutText:(p:Parameters<typeof g.normalize>[0],index:number,height:number)=>`${RINGWORLD_REGIONS.find(r=>r.id===p.patchId)?.label} · ${height.toLocaleString()} m · sample ${index.toLocaleString()}`,
  pointerMessage:(...args:Parameters<NonNullable<typeof base.pointerMessage>>)=>base.pointerMessage?.(...args)?'The Ringworld opening is empty space.':undefined,
  dirtyRegion:(...args:Parameters<NonNullable<typeof base.dirtyRegion>>)=>args[1].mode==='physical'?ringworldPhysicalDirtyRegions(world,...args):base.dirtyRegion?.(...args),
  raster:(...args:Parameters<typeof base.raster>)=>{const[cache,view,size,budget,reusable,appearance,,update]=args;return openCylinderRasterSteps(cache,view,size,budget,reusable,appearance,undefined,update,ringworldRaySampler(cache,view,size,budget,update));},
  recenter:(...args:Parameters<typeof base.recenter>)=>{const v=base.recenter(...args);return v.mode==='physical'?{...v,zoom:2}:v;},
  navigate:(...args:Parameters<typeof base.navigate>)=>{const[v,dx,dy,size]=args;if(v.mode==='physical'){if(!physicalPan())return base.navigate(...args);const l=openCylinderViewAdapter(g,v,size).layout;return{...v,target:v.target.map((value,i)=>Math.max(-8,Math.min(8,value-v.frame.right[i]!*dx/l.scale+v.frame.up[i]!*dy/l.scale)))as unknown as typeof v.target};}const l=openCylinderViewAdapter(g,v,size).layout;return{...v,phase:cylinderAngle(v.phase-dx/l.scale),pan:{x:0,y:Math.max(-S/Ro,Math.min(S/Ro,v.pan.y-dy/l.scale))}};},
  guides:(...args:Parameters<typeof base.guides>)=>{const[mark,v,size]=args;if(v.mode!=='map')return;const l=openCylinderViewAdapter(g,v,size).layout,x=l.x+v.pan.x*l.scale,y=l.y-v.pan.y*l.scale;mark.strokeStyle='#f0c875';mark.lineWidth=1.25;mark.setLineDash([5,4]);mark.strokeRect(x-Math.PI*l.scale,y-S/(2*Ro)*l.scale,2*Math.PI*l.scale,S/Ro*l.scale);mark.setLineDash([]);mark.font='12px system-ui';mark.textAlign='left';for(const[m,label]of[[L/2,'Outer Band'],[L+T/2,'Upper Rim'],[1.5*L+T,'Inner Band'],[2*L+1.5*T,'Lower Rim']]as const){const yy=y-(m-S/2)/Ro*l.scale;mark.strokeStyle='#071924';mark.lineWidth=4;mark.strokeText(label,Math.max(8,x-Math.PI*l.scale+8),yy);mark.fillStyle='#f4f4e9';mark.fillText(label,Math.max(8,x-Math.PI*l.scale+8),yy);}mark.strokeStyle='#92e9d2';mark.lineWidth=1;for(const m of[L,L+T,2*L+T]){const yy=y-(m-S/2)/Ro*l.scale;mark.beginPath();mark.moveTo(x-Math.PI*l.scale,yy);mark.lineTo(x+Math.PI*l.scale,yy);mark.stroke();}},
 };
}
