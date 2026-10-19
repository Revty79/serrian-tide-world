// Read-only observer and independent replay of the REAL /dev/cylinder.html editor.
// No test terrain replacement, DOM root, pointer bypass or numerical write hook.
import { cylinderPreviewInspection } from '../../src/components/CylinderPreview.tsx';
import { cylinderBrushFromControls, CYLINDER_UI_SPACING_RATIO, type CylinderControls } from '../../src/editor/cylinder-controls.ts';
import { createCylindricalTerrain, type CylindricalTerrain } from '../../src/terrain/cylindrical.ts';
import { beginCylindricalStroke } from '../../src/terrain/cylindrical-stroke.ts';
import { createCylindricalHistory } from '../../src/editor/cylindrical-history.ts';
import type { CylinderPreviewSession } from '../../src/editor/cylinder-preview-session.ts';
import { unprojectCylinder, type CylinderView, type CylinderViewport } from '../../src/rendering/cylindrical-view.ts';
import type { CylinderPosition, CylinderRegion } from '../../src/surfaces/cylinder.ts';
import type { CylinderStencil } from '../../src/rendering/cylindrical-raster.ts';
import { createCylinderGeometry } from '../../src/surfaces/cylinder.ts';

export interface CylinderState {
 words: number[]; metadata: CylindricalTerrain['metadata']; identity: CylindricalTerrain['metadata']['identity']; view: CylinderView; requested: CylinderView; size: CylinderViewport; ready: boolean; painting: boolean; processing: boolean;
 history: ReturnType<typeof createCylindricalHistory>['statistics']; operations: ReturnType<typeof createCylindricalHistory>['operations']; statistics: CylinderPreviewSession['statistics']; cacheBytes: number; rasterBytes: number; displayRevision: number; revision: number; controls: CylinderControls; stencil?: Omit<CylinderStencil,'indices'> & {indices:number[]}; previewPending: boolean; previewMessage: string; message: string;
 metrics: { preparationMs:number;firstPresentationMs:number;renders:number;renderSliceMaxMs:number;overlayMaxMs:number;maxFrameGapMs:number;rasterSnapshotBytes:number;renderTimes:number[];inputLatencies:number[];brushLatencies:number[];frameGaps:number[] };
}
export function snapshot(words=true) { return cylinderPreviewInspection().snapshot(words) as CylinderState; }
export function project(p: {patchId:CylinderRegion;u:number;v:number}) { return cylinderPreviewInspection().project(p); }
export function sample(index:number) { return cylinderPreviewInspection().sample(index); }
type Segment={position:CylinderPosition;at:number;event:string;pointerType:string};
let dispose=()=>{},base:CylinderState,first:CylinderPosition|undefined,segments:Segment[]=[],gaps:number[]=[],started=0,running=false;
export function observe() {
 dispose();base=snapshot();first=undefined;segments=[];gaps=[];started=performance.now();running=true;let previous=started,down=false,beatId=0;
 const c=document.querySelector<HTMLCanvasElement>('.cylinder-canvas')!, geometry=createCylinderGeometry(base.metadata.geometry);
 const position=(e:PointerEvent)=>{const s=snapshot(false),r=c.getBoundingClientRect();return unprojectCylinder(geometry,{x:e.clientX-r.left,y:e.clientY-r.top},s.view,s.size);};
 const start=(e:PointerEvent)=>{if(down)return;down=true;first=position(e);};
 const move=(e:PointerEvent)=>{if(!down||!snapshot(false).painting)return;const p=position(e);if(p){if(segments.length>=4096)throw new Error('Cylinder observer event budget');segments.push({position:p,at:performance.now(),event:e.type,pointerType:e.pointerType});}};
 const up=(e:PointerEvent)=>{move(e);down=false;};
 c.addEventListener('pointerdown',start);c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);
 const beat=(now:number)=>{if(!running)return;if(gaps.length<10000)gaps.push(now-previous);previous=now;beatId=requestAnimationFrame(beat);};beatId=requestAnimationFrame(beat);
 dispose=()=>{running=false;cancelAnimationFrame(beatId);c.removeEventListener('pointerdown',start);c.removeEventListener('pointermove',move);c.removeEventListener('pointerup',up);};
}
const hash=async(a:Uint32Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',a.buffer as ArrayBuffer))].map(v=>v.toString(16).padStart(2,'0')).join('');
export async function compare() {
 dispose();const actual=snapshot(),terrain=createCylindricalTerrain({terrainId:base.metadata.terrainId,geometry:base.metadata.geometry,resolution:base.metadata.representation.resolution}),values=new Float32Array(Uint32Array.from(base.words).buffer);
 for(const k of terrain.samples())terrain.write(k,values[k.index]!);if(!first)throw new Error('No actual pointer start observed');
 const settings=cylinderBrushFromControls(base.controls,base.metadata.geometry.radiusMeters)!;
 const s=beginCylindricalStroke(terrain,createCylindricalHistory(terrain),first,settings,{spacingMeters:settings.radiusMeters*CYLINDER_UI_SPACING_RATIO});
 for(const segment of segments)s.move(segment.position);s.release();let calls=0;while(s.status==='draining'){if(++calls>1000000)throw new Error('Reference work guard');s.pump(64);}
 const expected=new Uint32Array(terrain.copyElevations().buffer),a=Uint32Array.from(actual.words),changes=[];let mismatches=0,hidden=0,rims=0;
 for(let i=0;i<a.length;i++){
  if(a[i]!==expected[i])mismatches++;
  if(a[i]!==base.words[i]){
   const key=terrain.keyAt(i),owner=terrain.owner(key),point=terrain.positionAt(owner),xyz=terrain.geometry.referencePosition(point),f=base.view.frame.forward;
   const radialFacing=xyz[0]/base.metadata.geometry.radiusMeters*f[0]+xyz[1]/base.metadata.geometry.radiusMeters*f[1],capFacing=(owner.patchId==='cap-end'?1:-1)*f[2],rim=owner.patchId==='side'&&(owner.row===0||owner.row===base.metadata.representation.resolution.axialCells);
   if(base.view.mode==='physical'&&(rim?Math.max(radialFacing,(owner.row===0?-1:1)*f[2]):owner.patchId==='side'?radialFacing:capFacing)<-1e-10)hidden++;
   if(rim)rims++;changes.push({index:i,beforeWord:base.words[i],afterWord:a[i]});
  }
 }
 return{mismatches,hidden,changed:changes.length,rims,changes,beforeSha256:await hash(Uint32Array.from(base.words)),actualSha256:await hash(a),expectedSha256:await hash(expected),referenceDabs:s.statistics.committedDabs,actualLastStroke:actual.statistics.lastStroke,first,segments,frameGapsMs:gaps,wallMs:performance.now()-started,settings,initialView:base.view};
}
export function stopObservation(){dispose();return{frameGapsMs:gaps,wallMs:performance.now()-started};}
