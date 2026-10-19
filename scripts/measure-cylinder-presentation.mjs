// Separate compositor observation experiment; capture overhead is not mixed
// into the navigation throughput benchmark. Timestamps are frame swaps, not photons.
import {chromium,devices} from '@playwright/test';
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import assert from 'node:assert/strict';
const port=5217,origin=`http://127.0.0.1:${port}`,delay=ms=>new Promise(r=>setTimeout(r,ms)),sha=v=>createHash('sha256').update(v).digest('hex');
// Hash decoded terrain pixels only: status text can change before a CPU raster.
// PNG's standard row filters are reversed without image modification/resampling.
function terrainPixels(base64){
 const png=Buffer.from(base64,'base64'),parts=[];let width,height,channels;
 for(let i=8;i<png.length;){const n=png.readUInt32BE(i),type=png.toString('ascii',i+4,i+8),data=png.subarray(i+8,i+8+n);if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);channels=data[9]===6?4:data[9]===2?3:0;assert.ok(channels);assert.equal(data[12],0);}if(type==='IDAT')parts.push(data);i+=n+12;}
 const raw=inflateSync(Buffer.concat(parts)),stride=width*channels,pixels=Buffer.alloc(stride*height);let at=0;
 const paeth=(a,b,c)=>{const p=a+b-c,aa=Math.abs(p-a),bb=Math.abs(p-b),cc=Math.abs(p-c);return aa<=bb&&aa<=cc?a:bb<=cc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[at++];assert.ok(filter<=4);for(let x=0;x<stride;x++){const left=x>=channels?pixels[y*stride+x-channels]:0,up=y?pixels[(y-1)*stride+x]:0,corner=y&&x>=channels?pixels[(y-1)*stride+x-channels]:0;pixels[y*stride+x]=(raw[at++]+(filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):filter===4?paeth(left,up,corner):0))&255;}}
 const crop=[];for(let y=Math.floor(height*.35);y<Math.floor(height*.6);y++)crop.push(pixels.subarray(y*stride+Math.floor(width*.3)*channels,y*stride+Math.floor(width*.7)*channels));
 return{sha256:sha(Buffer.concat(crop)),imageSha256:sha(png),width,height};
}
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{windowsHide:true,stdio:'ignore'}),records=[];
let browser;
try{
 const started=Date.now();while(true){if(server.exitCode!==null)throw Error('Strict presentation server failed');try{if((await fetch(origin)).ok)break;}catch{}if(Date.now()-started>30000)throw Error('Server timeout');await delay(100);}
 for(const backend of ['hardware','fallback']){
  browser=await chromium.launch(backend==='hardware'?{channel:'chrome',headless:false}:{headless:true});
  for(const profile of ['desktop','mobile']){
   const context=await browser.newContext(profile==='mobile'?devices['Pixel 7']:{viewport:{width:1440,height:900}}),page=await context.newPage(),cdp=await context.newCDPSession(page);
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:profile==='mobile'?4:1});await context.tracing.start({screenshots:false,snapshots:true,sources:true});
   await page.addInitScript(()=>{window.atlasKeys=[];document.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow'))window.atlasKeys.push({key:e.key,utcMs:performance.timeOrigin+performance.now()});});});
   const b=name=>page.getByRole('button',{name,exact:true}),snap=(words=false)=>page.evaluate(async words=>(await import('/tests/fixtures/cylinder-observer.ts')).snapshot(words),words),idle=async()=>{const at=Date.now();while(Date.now()-at<60000){try{const s=await snap();if(s.ready&&!s.painting&&!s.previewPending&&s.revision===s.displayRevision)return;}catch{}await delay(40);}throw Error('Idle timeout');};
   await page.goto(origin);const id=await page.evaluate(async()=>(await import('/tests/fixtures/cylinder-render-benchmark.ts')).seed(256));await page.keyboard.press('Escape');if(await b('Browse saved maps').isVisible())await b('Browse saved maps').click();if(await b('Open tools').isVisible())await b('Open tools').click();await b('Refresh maps').click();await page.getByLabel('Saved maps',{exact:true}).selectOption(id);await b('Open Map').click();await idle();if(await b('Close tools').isVisible())await b('Close tools').click();await b('Rotate / Pan').click();await page.locator('.cylinder-canvas').focus();await page.mouse.move(3,3);await delay(800);await idle();const before=await snap(true);assert.equal(before.renderer.kind,backend==='hardware'?'webgl2':'cpu');
   const frames=[];let totalFrames=0,firstImage,lastImage;cdp.on('Page.screencastFrame',e=>{void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});if(totalFrames>=2048)return;const receivedUtcMs=Date.now(),pixels=terrainPixels(e.data);frames.push({sequence:++totalFrames,swapUtcMs:e.metadata.timestamp*1000,receivedUtcMs,...pixels,metadata:e.metadata});if(frames.length>64)frames.shift();firstImage??=e.data;lastImage=e.data;});
   await cdp.send('Page.enable');await cdp.send('Page.startScreencast',{format:'png',maxWidth:480,maxHeight:320,everyNthFrame:1});
   const waitFor=async f=>{const at=Date.now();while(!f()){if(Date.now()-at>10000)throw Error('No changed compositor frame');await delay(15);}};await waitFor(()=>frames.length>0);const samples=[];
   for(let i=0;i<8;i++){
    await delay(250);const previous=frames.at(-1).sha256,from=totalFrames;
    await page.keyboard.press('ArrowRight');const event=(await page.evaluate(()=>window.atlasKeys)).at(-1);
    try{await waitFor(()=>frames.some(f=>f.sequence>from&&f.sha256!==previous&&f.swapUtcMs>=event.utcMs));}catch(e){writeFileSync('.local/a7-p1ar-compositor-failure.json',JSON.stringify({backend,profile,i,previous,from,event,frames,state:await snap(false)},null,2));throw e;}
    const frame=frames.find(f=>f.sequence>from&&f.sha256!==previous&&f.swapUtcMs>=event.utcMs);
    samples.push({event,frame,inputToObservedFrameSwapMs:frame.swapUtcMs-event.utcMs,inputToFrameReceiptMs:frame.receivedUtcMs-event.utcMs});await idle();
   }
   await cdp.send('Page.stopScreencast');const after=await snap(true);assert.deepEqual(after.words,before.words);assert.deepEqual(after.history,before.history);assert.deepEqual(after.metadata,before.metadata);
   const prefix=`docs/evidence/a7-p1ar-${backend}-${profile}-presentation`;writeFileSync(prefix+'-before.png',Buffer.from(firstImage,'base64'));writeFileSync(prefix+'-after.png',Buffer.from(lastImage,'base64'));
   records.push({backend,profile,n:256,cpuThrottle:profile==='mobile'?4:1,renderer:after.renderer,sourceAndHistoryUnchanged:true,samples,frames,totalFrames,metrics:after.metrics});await context.tracing.stop({path:prefix+'-trace.zip'});await context.close();console.log(backend,profile,samples.map(s=>s.inputToObservedFrameSwapMs.toFixed(1)).join(', '));
  }await browser.close();browser=undefined;
 }
 writeFileSync('docs/evidence/a7-p1ar-compositor-presentation.json',JSON.stringify({method:'Eight real keyboard camera steps per normal-workspace profile. First different decoded terrain-pixel crop in a compositor PNG after the DOM key event; CDP frame-swap timestamps and host receipt times. Crop excludes controls/status text. 480×320 bounded capture, last 64 frame receipts plus 8 sample receipts, two retained images; hard 2048-event guard. Separate capture experiment with overhead; not a display-photon or uninstrumented-throughput measurement.',records},null,2));
}finally{await browser?.close();server.kill();server.unref();}
