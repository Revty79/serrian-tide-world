/** Read-only browser instrumentation, following the accepted cube pixel probe.
 * Captures terrain canvases immediately after draws; no terrain/input mutation. */
export function observeRoundSurface(){
 const audit={running:true,held:false,started:0,released:0,events:0,firstPixels:0,changedWhileHeld:0,gaps:[]as number[],longTasks:[]as number[],displayEpochs:[]as number[]};
 const scratch=document.createElement('canvas');scratch.width=scratch.height=128;const ctx=scratch.getContext('2d',{willReadFrequently:true})!;let lastCapture=0,lastPixels:Uint8ClampedArray|undefined,lastFrame=0,lastRevision=-1;
 const capture=(source:HTMLCanvasElement)=>{if(!audit.running||source===scratch||source.hidden||!source.isConnected||source.clientWidth<200||source.clientHeight<200||performance.now()-lastCapture<(audit.firstPixels?100:8))return;lastCapture=performance.now();ctx.drawImage(source,0,0,128,128);const pixels=ctx.getImageData(0,0,128,128).data;let changed=false;if(lastPixels)for(let i=0;i<pixels.length;i+=4)if(pixels[i]!==lastPixels[i]||pixels[i+1]!==lastPixels[i+1]||pixels[i+2]!==lastPixels[i+2]){changed=true;break;}if(changed&&audit.held){audit.changedWhileHeld++;if(!audit.firstPixels)audit.firstPixels=performance.now()-audit.started;}lastPixels=pixels;};
 const draw=WebGL2RenderingContext.prototype.drawArrays,image=CanvasRenderingContext2D.prototype.drawImage;
 WebGL2RenderingContext.prototype.drawArrays=function(this:WebGL2RenderingContext,...args){Reflect.apply(draw,this,args);queueMicrotask(()=>capture(this.canvas as HTMLCanvasElement));};
 CanvasRenderingContext2D.prototype.drawImage=function(this:CanvasRenderingContext2D,...args:unknown[]){Reflect.apply(image,this,args);if(this.canvas!==scratch)queueMicrotask(()=>capture(this.canvas as HTMLCanvasElement));}as typeof image;
 const canvas=document.querySelector<HTMLCanvasElement>('canvas[data-resolution]')!;
 canvas.addEventListener('pointerdown',event=>{audit.held=true;audit.started=event.timeStamp;},{capture:true});canvas.addEventListener('pointermove',()=>{if(audit.held)audit.events++;},{capture:true});canvas.addEventListener('pointerup',event=>{audit.held=false;audit.released=event.timeStamp;},{capture:true});
 new PerformanceObserver(list=>{if(audit.held)for(const e of list.getEntries())audit.longTasks.push(e.duration);}).observe({type:'longtask'});
 const frame=(now:number)=>{if(!audit.running)return;if(audit.held&&lastFrame)audit.gaps.push(now-lastFrame);lastFrame=now;const revision=Number(canvas.dataset.displayRevision);if(audit.held&&revision!==lastRevision){audit.displayEpochs.push(revision);lastRevision=revision;}requestAnimationFrame(frame);};requestAnimationFrame(frame);return audit;
}
