import type {SolidCubeTerrain} from '../terrain/solid-cube.ts';
import {prepareCubeDisplayField,cubeDisplaySample,type CubeDisplayField} from './solid-cube-field.ts';
import {prepareCubeCanvasAtlas,updateCubeCanvasAtlas,presentCubeCanvas,type CubeCanvasAtlas} from './solid-cube-canvas.ts';
import {SolidCubeWebGL} from './solid-cube-webgl.ts';
import {cubeCamera,type CubeCamera,type CubeDisplayMode,type CubeViewport} from './solid-cube-view.ts';
import type {SolidCubeFace} from '../surfaces/solid-cube.ts';
import {CubeEditorField} from './solid-cube-editor-field.ts';
import type {CubePublication} from '../editor/solid-cube-history.ts';

export type CubeBackend='auto'|'canvas';
/** Read-only presentation owner. Source changes invalidate preparation; camera state never writes. */
export class CubePresentation {
 readonly cpuCanvas:HTMLCanvasElement;readonly gpuCanvas:HTMLCanvasElement;
 camera:CubeCamera=cubeCamera();mode:CubeDisplayMode='physical';backend:CubeBackend;
 private field?:CubeDisplayField;private atlas?:CubeCanvasAtlas;private generation=0;private disposed=false;private raf=0;
 private work:Promise<void>=Promise.resolve();private atlasWork?:Promise<void>;private size:CubeViewport={width:1,height:1};private gpu?:SolidCubeWebGL;private failShader:boolean;
 private source:SolidCubeTerrain|undefined;private onChange:()=>void;private lastFrame=0;
 private editorField?:CubeEditorField;
 private verifyPixels=false;
 private pixelCanvas?:HTMLCanvasElement;private previousPixels?:Uint8ClampedArray;private pixelRevision=-1;private pixelView='';
 readonly editPresentations:{revision:number;submittedAt:number;changedPixels:number;pixelFingerprint:number;paintOpportunityAt?:number}[]=[];
 readonly metrics={started:0,firstVisibleMs:undefined as number|undefined,completeMs:undefined as number|undefined,seedMs:0,identityVerificationMs:0,gpuInitializationMs:0,gpuInitializationStartedMs:-1,firstVisibleBackend:'',firstVisibleFieldN:0,preparationMs:0,coarsePreparationMs:0,fullPreparationMs:0,cpuPreparationMs:0,firstPixelVerified:false,displayedRevision:-1,displayedN:0,draws:0,refreshes:0,updateMs:0,error:'',backend:'preparing',frameGaps:[] as number[],presentMs:[] as number[]};
 constructor(source:SolidCubeTerrain,cpuCanvas:HTMLCanvasElement,gpuCanvas:HTMLCanvasElement,onChange:()=>void,options:{backend?:CubeBackend;failShader?:boolean;started?:number;seedMs?:number;identityVerificationMs?:number;editor?:boolean;verifyPixels?:boolean}={}){
  this.cpuCanvas=cpuCanvas;this.gpuCanvas=gpuCanvas;
  this.source=source;this.onChange=onChange;this.backend=options.backend??'auto';this.metrics.started=options.started??performance.now();
  if(options.editor)this.editorField=new CubeEditorField();
  this.verifyPixels=options.verifyPixels??false;
  this.metrics.seedMs=options.seedMs??0;this.metrics.identityVerificationMs=options.identityVerificationMs??0;this.failShader=options.failShader??false;gpuCanvas.hidden=true;cpuCanvas.hidden=true;
 }
 private createGpu(){const at=performance.now();this.metrics.gpuInitializationStartedMs=at-this.metrics.started;this.gpu=new SolidCubeWebGL(this.gpuCanvas,()=>{this.schedule();if(!this.gpu?.available)void this.ensureAtlas();},this.failShader);if(this.gpu.available&&this.gpu.statistics.software)this.gpu.fail('Software WebGL adapter detected; Canvas2D provides responsive cube navigation.');this.metrics.gpuInitializationMs+=performance.now()-at;return this.gpu.available;}
 queuePublication(publication:CubePublication){if(!this.disposed&&this.source)this.editorField?.queue(this.source,publication);}
 async refresh(detail:'complete'|'interactive'='complete'){
  const generation=++this.generation,previous=this.work,started=performance.now();this.metrics.refreshes++;this.metrics.error='';
  this.work=(async()=>{await previous.catch(()=>{});if(this.disposed||generation!==this.generation)return;
   const source=this.source!,alive=()=>!this.disposed&&generation===this.generation;
   try{
    if(this.editorField){this.field=await this.editorField.refresh(source,alive);if(!alive())return;
     if(this.backend==='canvas'||!this.gpu?.available)await this.ensureAtlas();this.metrics.preparationMs=this.metrics.updateMs=performance.now()-started;this.schedule();this.onChange();return;}
    let at=performance.now();const coarse=await prepareCubeDisplayField(source,Math.min(detail==='interactive'?32:16,source.metadata.representation.cellsPerEdge),undefined,alive);if(!alive())return;this.metrics.coarsePreparationMs=performance.now()-at;this.field=coarse;this.metrics.error='';this.schedule();
    await this.ensureAtlas();if(!alive())return;
    if(detail==='interactive'){this.metrics.preparationMs=this.metrics.updateMs=performance.now()-started;this.onChange();return;}
    at=performance.now();const full=await prepareCubeDisplayField(source,undefined,undefined,alive);if(!alive())return;this.metrics.fullPreparationMs=performance.now()-at;this.field=full;this.metrics.preparationMs=performance.now()-started;this.schedule();
    if(this.backend==='canvas'||this.gpu&&!this.gpu.available)await this.ensureAtlas();this.metrics.updateMs=performance.now()-started;this.onChange();
   }catch(e){if(alive()){this.metrics.error=String(e);this.onChange();}}
  })();await this.work;
 }
 private async ensureAtlas():Promise<void>{
  if(this.disposed||!this.field)return;if(this.atlas?.field===this.field)return;
  if(this.atlasWork){await this.atlasWork;if(!this.disposed&&this.atlas?.field!==this.field)return this.ensureAtlas();return;}
  const field=this.field,generation=this.generation,at=performance.now();
  this.atlasWork=(async()=>{try{
   const alive=()=>!this.disposed&&generation===this.generation&&field===this.field;
   const atlas=this.editorField?await updateCubeCanvasAtlas(field,this.atlas,alive):await prepareCubeCanvasAtlas(field,true,undefined,alive);
   if(!alive()){if(atlas.faces!==this.atlas?.faces)atlas.dispose();return;}if(atlas.faces!==this.atlas?.faces)this.atlas?.dispose();this.atlas=atlas;this.metrics.cpuPreparationMs+=performance.now()-at;this.schedule();
  }catch(e){if(!this.disposed&&generation===this.generation&&field===this.field)this.metrics.error=String(e);}finally{this.atlasWork=undefined;}})();await this.atlasWork;
 }
 setBackend(backend:CubeBackend){this.backend=backend;if(backend==='canvas'){this.gpu?.dispose();this.gpu=undefined;}else if(!this.gpu&&this.metrics.firstVisibleMs!==undefined)this.createGpu();if(backend==='canvas'||this.gpu&&!this.gpu.available)void this.ensureAtlas();this.schedule();}
 setView(camera:CubeCamera,mode=this.mode){this.camera=camera;this.mode=mode;this.schedule();}
 resize(size:CubeViewport){if(![size.width,size.height].every(v=>Number.isFinite(v)&&v>0)||this.disposed)return;this.size={width:size.width,height:size.height};this.schedule();}
 schedule(){if(!this.disposed&&!this.raf)this.raf=requestAnimationFrame(()=>{this.raf=0;this.present();});}
 present(){
  if(this.disposed||!this.field||!this.source)return;
  if(!this.editorField&&this.field.sourceRevision!==this.source.revision){this.metrics.error='Terrain changed; refresh the read-only display.';this.onChange();return;}
  let field=this.field,ms:number;
  if(this.backend==='auto'&&this.gpu?.available){try{ms=this.gpu.present(field,this.camera,this.mode,this.size);this.cpuCanvas.hidden=true;this.metrics.backend=this.gpu.statistics.software?'WebGL2 (software)':'WebGL2';}catch(e){this.gpu.fail(e);void this.ensureAtlas();this.schedule();return;}}
  else {if(!this.atlas)return;field=this.atlas.field;if(!this.editorField&&field.sourceRevision!==this.source.revision)return;ms=presentCubeCanvas(this.cpuCanvas,this.atlas,this.camera,this.mode,this.size);this.gpuCanvas.hidden=true;this.metrics.backend='Canvas2D fallback';}
  const now=performance.now();if(this.lastFrame&&now-this.lastFrame<250)this.retain(this.metrics.frameGaps,now-this.lastFrame);this.lastFrame=now;this.retain(this.metrics.presentMs,ms);this.metrics.draws++;this.metrics.displayedRevision=field.sourceRevision;this.metrics.displayedN=field.n;
  if(this.editorField&&this.verifyPixels&&(this.pixelRevision!==field.sourceRevision||this.pixelView!==JSON.stringify([this.camera,this.mode,this.size]))){
   const canvas=this.cpuCanvas.hidden?this.gpuCanvas:this.cpuCanvas;this.pixelCanvas??=document.createElement('canvas');this.pixelCanvas.width=this.pixelCanvas.height=128;
   const context=this.pixelCanvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(canvas,0,0,128,128);const pixels=context.getImageData(0,0,128,128).data,view=JSON.stringify([this.camera,this.mode,this.size]);let changedPixels=0,hash=2166136261;
   for(let i=0;i<pixels.length;i+=4){hash=Math.imul(hash^pixels[i]!,16777619);hash=Math.imul(hash^pixels[i+1]!,16777619);hash=Math.imul(hash^pixels[i+2]!,16777619);if(this.previousPixels&&this.pixelView===view&&[0,1,2,3].some(k=>pixels[i+k]!==this.previousPixels![i+k]))changedPixels++;}
   const record={revision:field.sourceRevision,submittedAt:performance.now(),changedPixels,pixelFingerprint:hash>>>0,paintOpportunityAt:undefined as number|undefined};if(this.editPresentations.length===240)this.editPresentations.shift();this.editPresentations.push(record);
   this.previousPixels=pixels;this.pixelRevision=field.sourceRevision;this.pixelView=view;
   requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!this.disposed)record.paintOpportunityAt=performance.now();}));
  }
  const full=field.n===this.source.metadata.representation.cellsPerEdge,first=this.metrics.firstVisibleMs===undefined;
  if(first){this.metrics.firstVisibleBackend=this.metrics.backend;const canvas=this.cpuCanvas.hidden?this.gpuCanvas:this.cpuCanvas,pixel=this.cpuCanvas.hidden?this.gpu!.readPixel(Math.floor(canvas.width/2),Math.floor(canvas.height/2)):Array.from(canvas.getContext('2d')!.getImageData(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1).data);this.metrics.firstPixelVerified=!!pixel[3];this.metrics.firstVisibleFieldN=field.n;if(!pixel[3]){this.metrics.error='Terrain pixels could not be verified.';this.onChange();return;}}
  if(first||full&&this.metrics.completeMs===undefined){const generation=this.generation;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(this.disposed||generation!==this.generation)return;if(first&&this.metrics.firstVisibleMs===undefined){this.metrics.firstVisibleMs=performance.now()-this.metrics.started;
     // Real coarse Canvas pixels get paint opportunities before synchronous GL startup.
     requestAnimationFrame(()=>{if(!this.disposed&&this.backend==='auto'&&!this.gpu){if(!this.createGpu())void this.ensureAtlas();this.schedule();}});
    }if(full&&this.metrics.completeMs===undefined)this.metrics.completeMs=performance.now()-this.metrics.started;this.onChange();}));}
  this.onChange();
 }
 private retain(array:number[],value:number){if(array.length===240)array.shift();array.push(value);}
 sample(face:SolidCubeFace,u:number,v:number){return this.field&&cubeDisplaySample(this.field,face,u,v);}
 snapshot(){return structuredClone({disposed:this.disposed,...this.metrics,fieldWork:this.editorField?.statistics,editPresentations:this.editPresentations,camera:this.camera,mode:this.mode,viewport:this.size,sourceRevision:this.source?.revision,sourceCells:this.source?.metadata.representation.cellsPerEdge,authorityBytes:this.source?.elevationByteLength??0,fieldBytes:this.field?.bytes??0,cpuAtlasBytes:this.atlas?.bytes??0,gpu:this.gpu?.statistics??{reason:this.backend==='canvas'?'Canvas explicitly selected':'WebGL initialization follows first terrain pixels',renderer:'',software:false,losses:0,recoveries:0,uploads:0,uploadBytes:0,textureBytes:0,resources:0,presentations:0},canvasBytes:4*(this.cpuCanvas.width*this.cpuCanvas.height+this.gpuCanvas.width*this.gpuCanvas.height),pendingPreparation:!!this.atlasWork});}
 dispose(){this.disposed=true;this.generation++;cancelAnimationFrame(this.raf);this.raf=0;this.atlas?.dispose();this.atlas=undefined;this.field=undefined;this.source=undefined;this.gpu?.dispose();this.gpu=undefined;this.cpuCanvas.width=this.cpuCanvas.height=this.gpuCanvas.width=this.gpuCanvas.height=0;this.onChange=()=>{};}
}
