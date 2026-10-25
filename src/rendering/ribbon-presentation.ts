import{paintingStage}from'../editor/painting-metrics.ts';
import type {RibbonTerrain} from '../terrain/ribbon.ts';
import type {PolyhedronDisplayCache} from './polyhedron-field.ts';
import {TrianglePolyhedronPresentation} from './triangle-polyhedron-presentation.ts';
import {createPolyhedronBoundaryCoverage} from './polyhedron-boundary-coverage.ts';
import {RIBBON_PROJECTION,projectRibbon,ribbonPixelPicker} from './ribbon-view.ts';
import {RibbonCanvas} from './ribbon-canvas.ts';
import type {CylinderView,CylinderViewport} from './cylindrical-view.ts';
import type {CylinderAppearance} from './cylindrical-elevation.ts';
const Coverage=createPolyhedronBoundaryCoverage<RibbonTerrain>(projectRibbon,ribbonPixelPicker,{creaseRadius:1,mixedOnly:true});
type Coverage=InstanceType<typeof Coverage>;
/** Accepted static triangle GPU, physical color atlases and four-ray boundary
 * pass. Only Ribbon's orthographic nearest-material Canvas geometry differs. */
export class RibbonPresentation extends TrianglePolyhedronPresentation<RibbonTerrain>{
 protected override get refreshCanvasAtlasesOnGpu(){return false;}
 private readonly cpu=new RibbonCanvas();private managed=false;private interacting=false;
 private coverage?:{stamp:string;cache:Coverage};private painted?:Coverage;
 private work?:{stamp:string;revision:number;appearance:CylinderAppearance;cache:Coverage;steps:Generator<void>;timer:number};
 private requestFrame:()=>void;private sliceMax=0;private slices=0;
 constructor(canvas:HTMLCanvasElement,fallback:HTMLCanvasElement,cache:PolyhedronDisplayCache<RibbonTerrain>,invalidate:()=>void,requestRepaint=invalidate){super(canvas,fallback,cache,invalidate,RIBBON_PROJECTION,{polygonColorsOnly:true,polygonPixelsOnly:true});this.requestFrame=requestRepaint;}
 private cancel(){const w=this.work;if(w){clearTimeout(w.timer);w.steps.return(undefined);w.cache.dispose();this.work=undefined;}Object.assign(this.statistics,{boundaryRefining:false});}
 setInteraction(active:boolean){this.managed=true;this.interacting=active;if(active||this.backend==='webgl2')this.cancel();if(this.backend==='webgl2'){this.coverage?.cache.dispose();this.coverage=undefined;this.painted=undefined;}}
 invalidateCanvas(){this.cpu.invalidate();this.painted=undefined;}
 private pump(w:NonNullable<RibbonPresentation['work']>){if(this.work!==w)return;if(this.interacting||this.cache.sourceRevision!==w.revision){this.cancel();return;}try{const at=performance.now();let done=false;do{done=!!w.steps.next().done;}while(!done&&performance.now()-at<4);this.sliceMax=Math.max(this.sliceMax,performance.now()-at);this.slices++;Object.assign(this.statistics,{boundarySliceMaxMs:this.sliceMax,boundarySlices:this.slices});if(done){this.coverage?.cache.dispose();this.coverage={stamp:w.stamp,cache:w.cache};this.work=undefined;Object.assign(this.statistics,{boundaryRefining:false});this.requestFrame();}else w.timer=window.setTimeout(()=>this.pump(w),0);}catch(error){this.cancel();Object.assign(this.statistics,{boundaryReason:String(error)});}}
 protected override presentCanvas(view:CylinderView,size:CylinderViewport,appearance:CylinderAppearance){
  const area=paintingStage('ribbonCanvasColors',()=>this.cpu.present(this.fallback.getContext('2d')!,this.cache,view,size,appearance)),stamp=JSON.stringify([view,size,this.fallback.width,this.fallback.height]);
  if(this.work&&(this.work.stamp!==stamp||this.work.revision!==this.cache.sourceRevision||this.work.appearance!==appearance))this.cancel();
  if(this.coverage?.stamp!==stamp){this.coverage?.cache.dispose();this.coverage=undefined;this.painted=undefined;if(!this.managed)this.coverage={stamp,cache:new Coverage(this.cache.terrain,view,size,this.fallback.width,this.fallback.height)};else if(!this.interacting&&!this.work){const cache=new Coverage(this.cache.terrain,view,size,this.fallback.width,this.fallback.height,true),field=this.cache,steps=(function*(){yield*cache.preparation;yield*cache.prepareColors(field,appearance);})(),w={stamp,revision:field.sourceRevision,appearance,cache,steps,timer:0};this.work=w;Object.assign(this.statistics,{boundaryRefining:true,boundaryReason:''});w.timer=window.setTimeout(()=>this.pump(w),0);}}
  if(this.coverage){paintingStage('ribbonBoundaryColors',()=>this.coverage!.cache.present(this.fallback.getContext('2d')!,this.cache,appearance,this.painted===this.coverage!.cache?area:undefined));this.painted=this.coverage.cache;}
  Object.assign(this.statistics,{boundaryReady:!!this.coverage,boundaryPixels:this.coverage?.cache.pixels??0,boundaryBytes:this.coverage?.cache.byteLength??0,boundaryCanvasBytes:this.coverage?.cache.canvasBytes??0,cpuGeometryBytes:this.cpu.byteLength});this.canvas.hidden=true;
 }
 override dispose(){this.cancel();this.coverage?.cache.dispose();this.coverage=undefined;this.painted=undefined;this.cpu.dispose();super.dispose();}
}
