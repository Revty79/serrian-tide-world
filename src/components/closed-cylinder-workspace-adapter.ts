import type {CylindricalTerrain} from '../terrain/cylindrical.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylinderPosition,CylinderRegion} from '../surfaces/cylinder.ts';
import {cylinderFreeVolume} from '../surfaces/hollow-cylinder-excavation.ts';
import {cylinderLayout,initialCylinderView,continuousCylinderScreenSegment,navigateCylinder,recenterCylinder,projectCylinder,unprojectCylinder,hitToCylinderPosition,type CylinderView,type CylinderViewport} from '../rendering/cylindrical-view.ts';
import {cylinderCutView,cylinderCutHit,cylinderCutSurfaceHit,type CylinderExcavationDisplay} from '../rendering/hollow-cylinder-display.ts';
import {cylinderRasterSteps} from '../rendering/cylindrical-raster.ts';
import {CylinderWebGLRenderer} from '../rendering/cylindrical-webgl.ts';
import {cylinderBrushFromControls,defaultCylinderControls} from '../editor/cylinder-controls.ts';
import type {ConnectedWorkspaceAdapter} from './connected-workspace-contracts.ts';
import {cylinderDirtyRegion} from '../rendering/cylinder-dirty-region.ts';
import {cylinderAngle} from '../surfaces/cylinder.ts';
export function closedCylinderWorkspaceAdapter(t:CylindricalTerrain):ConnectedWorkspaceAdapter<CylindricalTerrain,CylinderView,CylinderExcavationDisplay>{
 const g=t.geometry,R=g.metadata.radiusMeters,L=g.metadata.lengthMeters;
 return{radiusMeters:R,lengthMeters:L,minBrushRadius:.005*R,maxBrushRadius:2*R,regions:[{id:'side',label:'Side'},{id:'cap-start',label:'Start cap'},{id:'cap-end',label:'End cap'}],defaultControls:()=>defaultCylinderControls(R),brush:c=>cylinderBrushFromControls(c,R),initial:initialCylinderView,normalizeView:v=>v,
  pointAt:(cache,view,size,p,cut)=>{if(cylinderCutView(view,cut)){const hit=cylinderCutHit(cut!,view,size,p,cache);if(!hit||hit.kind!==cut!.role)return;return hitToCylinderPosition(g,cylinderCutSurfaceHit(hit,cut!,cache));}return unprojectCylinder(g,p,view,size);},
  pointerMessage:(cache,view,size,p,cut)=>{if(!cylinderCutView(view,cut))return;const hit=cylinderCutHit(cut!,view,size,p,cache);if(!hit||hit.kind!==cut!.role)return!hit?'Open space through reference shell':hit.kind==='rock'?'Rock bore wall - physical reference-shell cut':`${hit.kind==='interior'?'Inside':'Outside'} through opening - switch sides to edit`;},
  project:(p,v,s)=>projectCylinder(g,p,v,s),
  dirtyRegion:(changes,v,size,columns,rows)=>{const res=t.metadata.representation.resolution,pad=3*Math.max(2*Math.PI*R/res.angularSamples,L/res.axialCells,R/res.radialCells);return cylinderDirtyRegion(changes,size,columns,rows,cylinderLayout(g,v,size).scale,R,pad,(p,support)=>{const q=g.normalize(p);if(v.mode==='map'&&(q.patchId==='side'?(Math.min(q.v,L-q.v)<support||Math.PI-Math.abs(cylinderAngle(q.u-v.phase))<support/R):R-q.v<support))return;return projectCylinder(g,q,v,size);});},
  samplePositions:(index,view)=>{const key=t.keyAt(index),d=t.owner(key);return(view.mode==='map'&&d.patchId==='side'?t.aliases(key):[d]).map(a=>t.positionAt(a));},
  sample:index=>{const key=t.keyAt(index),address=t.owner(key);return{key,address,aliases:t.aliases(key),position:t.positionAt(address)};},
  readout:point=>{const{angularSamples:a,axialCells:z,radialCells:p}=t.metadata.representation.resolution,key=t.resolve({...point,patchId:point.patchId as CylinderRegion,column:Math.round(point.u/(2*Math.PI)*a),row:Math.round(point.v/(point.patchId==='side'?L:R)*(point.patchId==='side'?z:p))});return{index:key.index,height:t.read(key)};},
  guides:(mark,v,s)=>guides(g,mark,v,s),aperture:(mark,p,r,v,s)=>aperture(t,mark,p,r,v,s),continuous:(a,b,v,s)=>continuousCylinderScreenSegment(g,a,b,v,s),navigate:(v,dx,dy,s)=>navigateCylinder(g,v,dx,dy,s),recenter:(v,p)=>recenterCylinder(g,v,p),region:(v,id)=>({...g.identity,patchId:id,u:v.phase,v:id==='side'?L/2:0}),validateEye:(eye,cut)=>!!cut&&cylinderFreeVolume(cut.model,eye,cut.model.radiusMeters*1e-8),cutView:cylinderCutView,sceneStamp:cut=>`${cut?.revision??0}:${cut?.opposite.sourceRevision??0}`,raster:cylinderRasterSteps,
  gpu:(canvas,cache,invalidate)=>{const gpu=new CylinderWebGLRenderer(canvas,cache,invalidate);return{get available(){return gpu.available;},statistics:gpu.statistics,setScene:scene=>gpu.setExcavation(scene),present:(v,s,a)=>gpu.present(v,s,a),fail:e=>gpu.fail(e),dispose:()=>gpu.dispose()};},
 };
}
    function guides(g:CylindricalTerrain['geometry'],mark:CanvasRenderingContext2D,view: CylinderView, viewport: CylinderViewport) {
      if (view.mode !== 'map') return;
      const l = cylinderLayout(g, view, viewport), x = l.x + view.pan.x * l.scale, y = l.y - view.pan.y * l.scale;
      mark.strokeStyle = '#f0c875'; mark.lineWidth = 1.25; mark.setLineDash([5, 4]); mark.strokeRect(x - Math.PI * l.scale, y - l.h * l.scale, 2 * Math.PI * l.scale, 2 * l.h * l.scale);
      for (const sign of [-1, 1]) { mark.beginPath(); mark.arc(x, y - sign * (l.h + 1) * l.scale, l.scale, 0, 2 * Math.PI); mark.stroke(); }
      mark.setLineDash([]); mark.font = '12px system-ui'; mark.textAlign = 'center'; mark.lineWidth = 4; mark.strokeStyle = '#071924'; mark.fillStyle = '#f4f4e9';
      for (const [label, yy] of [['Side · periodic cut at left/right', y], ['End cap', y - (l.h + 1) * l.scale], ['Start cap', y + (l.h + 1) * l.scale]] as const) { mark.strokeText(label, x, yy); mark.fillText(label, x, yy); }
      for (const sign of [-1, 1]) { mark.strokeStyle = '#f6f7ef'; mark.lineWidth = 2; mark.beginPath(); mark.arc(x, y - sign * l.h * l.scale, 4, 0, 2 * Math.PI); mark.stroke(); }
      const colors = ['#ffdc75', '#92e9d2', '#bbacff', '#ffabb5'];
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2, degrees = ((view.phase + angle) * 180 / Math.PI % 360 + 360) % 360; mark.fillStyle = colors[i]!;
        const xx = x + (i < 2 ? angle : angle - 2 * Math.PI) * l.scale;
        for (const sign of [-1, 1]) { const yy = y - sign * l.h * l.scale; mark.fillRect(xx - 2, yy - 3, 4, 6); mark.fillText(`${Math.round(degrees)}°`, xx, yy - sign * 12); const capX = x + Math.sin(angle) * l.scale, capY = y - sign * (l.h + 1) * l.scale + sign * Math.cos(angle) * l.scale; mark.fillRect(capX - 2, capY - 2, 4, 4); }
      }
    }
function aperture(terrain:CylindricalTerrain,mark:CanvasRenderingContext2D,anchor:SurfacePosition,radius:number,view:CylinderView,size:CylinderViewport){
      const g=terrain.geometry;{const r=g.metadata.radiusMeters,q=g.referencePosition(anchor),theta=anchor.patchId==='cap-end'?-anchor.u:anchor.u;mark.strokeStyle='#ffe69d';mark.lineWidth=1.5;mark.beginPath();let pen=false;for(let i=0;i<=64;i++){const t=i/64*2*Math.PI,dx=radius*Math.cos(t),dy=radius*Math.sin(t);let p:CylinderPosition|undefined;if(anchor.patchId==='side'){const v=anchor.v+dy;if(Math.abs(dx)<r&&v>=0&&v<=g.metadata.lengthMeters)p=g.normalize({...anchor,u:theta+Math.asin(dx/r),v});}else{const x=q[0]+dx,y=q[1]+dy,v=Math.hypot(x,y);if(v<=r)p=g.normalize({...anchor,u:Math.atan2(y,x)*(anchor.patchId==='cap-end'?-1:1),v});}const screen=p&&projectCylinder(g,p,view,size);if(screen){if(pen)mark.lineTo(screen.x,screen.y);else mark.moveTo(screen.x,screen.y);pen=true;}else pen=false;}mark.stroke();}
}
