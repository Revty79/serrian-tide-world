import type {CubeEditorSession} from '../../src/editor/cube-editor-session.ts';
type Snapshot=ReturnType<CubeEditorSession['snapshot']>;
export function observe(){
 const audit={held:false,running:true,started:0,released:0,events:0,firstPixels:0,changedWhileHeld:0,maxGap:0,gaps:[] as number[],eventAges:[] as number[],longTasks:[] as number[],timings:new Map<number,Snapshot['timings'][number]>(),errors:[] as string[],samples:[] as {at:number;accepted:number;executed:number;pending:number;revision:number;display:number}[]};
 let lastFrame=0,lastSample=0,lastCapture=0,lastPixels:Uint8ClampedArray|undefined;
 const scratch=document.createElement('canvas');scratch.width=scratch.height=128;const context=scratch.getContext('2d',{willReadFrequently:true})!;
 const capture=(canvas:HTMLCanvasElement)=>{if(!audit.running||!canvas.isConnected||canvas.hidden||canvas.clientWidth<200||canvas.clientHeight<200||performance.now()-lastCapture<(audit.held&&audit.firstPixels?100:8))return;lastCapture=performance.now();context.drawImage(canvas,0,0,128,128);const pixels=context.getImageData(0,0,128,128).data;let changed=0;
  if(lastPixels)for(let i=0;i<pixels.length;i+=4)if(pixels[i]!==lastPixels[i]||pixels[i+1]!==lastPixels[i+1]||pixels[i+2]!==lastPixels[i+2])changed++;
  if(changed&&audit.held){audit.changedWhileHeld++;if(!audit.firstPixels)audit.firstPixels=performance.now()-audit.started;}lastPixels=pixels;
 };
 const gl=WebGL2RenderingContext.prototype.drawArrays,canvas=CanvasRenderingContext2D.prototype.drawImage;
 WebGL2RenderingContext.prototype.drawArrays=function(this:WebGL2RenderingContext,...args){Reflect.apply(gl,this,args);queueMicrotask(()=>capture(this.canvas as HTMLCanvasElement));};
 CanvasRenderingContext2D.prototype.drawImage=function(this:CanvasRenderingContext2D,...args:unknown[]){Reflect.apply(canvas,this,args);if(this.canvas!==scratch)queueMicrotask(()=>capture(this.canvas as HTMLCanvasElement));} as typeof canvas;
 const viewport=document.querySelector('.cube-editor:not([style*=hidden]) .cube-viewport')!;
 viewport.addEventListener('pointerdown',event=>{audit.held=true;audit.started=(event as PointerEvent).timeStamp;},{capture:true});
 viewport.addEventListener('pointermove',event=>{if(audit.held){audit.events++;audit.eventAges.push(performance.now()-(event as PointerEvent).timeStamp);}},{capture:true});
 viewport.addEventListener('pointerup',event=>{audit.held=false;audit.released=(event as PointerEvent).timeStamp;},{capture:true});
 new PerformanceObserver(list=>{for(const entry of list.getEntries())if(audit.held)audit.longTasks.push(entry.duration);}).observe({type:'longtask'});
 const frame=(now:number)=>{if(!audit.running)return;if(audit.held&&lastFrame){const gap=now-lastFrame;audit.gaps.push(gap);audit.maxGap=Math.max(audit.maxGap,gap);}lastFrame=now;
  if(now-lastSample>100){lastSample=now;const state=window.__cubeEditor!.snapshot() as {editor:Snapshot;display:{displayedRevision:number}};for(const t of state.editor.timings)audit.timings.set(t.revision,t);
   if(audit.held&&audit.samples.length<240)audit.samples.push({at:now-audit.started,accepted:state.editor.stroke?.acceptedInputs??0,executed:state.editor.stroke?.fullyExecutedInputs??0,pending:state.editor.pending,revision:state.editor.revision,display:state.display.displayedRevision});if(state.editor.error&&!audit.errors.includes(state.editor.error))audit.errors.push(state.editor.error);
  }requestAnimationFrame(frame);
 };requestAnimationFrame(frame);return audit;
}
