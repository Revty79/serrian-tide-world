// Repeatable normal-workspace display benchmark. See docs/CYLINDER-RENDERING.md.
import {chromium,devices} from '@playwright/test';
import {spawn} from 'node:child_process';
import {writeFileSync,createWriteStream,readFileSync,mkdirSync} from 'node:fs';import{resolve,dirname,join}from'node:path';import{execFileSync}from'node:child_process';
import{gzipSync}from'node:zlib';
const label=process.argv[2]||'improved-hardware',port=5205,origin=`http://127.0.0.1:${port}`;
if(label.startsWith('baseline')){const root='.local/a7-p1a-baseline';const paths=execFileSync('git',['ls-files'],{encoding:'utf8'}).trim().split('\n').filter(p=>/^(src\/|tests\/|dev\/|index.html$|package.*json$|vite.config.ts$|tsconfig.json$)/.test(p));for(const p of paths){let data;try{data=execFileSync('git',['show','daa5aed2046cf65e96e2507a38291edd55df1594:'+p],{maxBuffer:20e6,stdio:['ignore','pipe','pipe']});}catch{continue;}const dest=join(root,p);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,data);}const fixture='tests/fixtures/cylinder-render-benchmark.ts';writeFileSync(join(root,fixture),readFileSync(fixture));}
const log=createWriteStream(`.local/a7-p1a-${label}-server.log`),server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:label.startsWith('baseline')?resolve('.local/a7-p1a-baseline'):process.cwd(),windowsHide:true,stdio:['ignore','pipe','pipe']});server.stdout.pipe(log);server.stderr.pipe(log);
const delay=ms=>new Promise(r=>setTimeout(r,ms));let browser;
const quant=a=>{const s=[...a].sort((a,b)=>a-b);return{count:s.length,p50:s[Math.floor(s.length*.5)]??0,p95:s[Math.floor(s.length*.95)]??0,max:s.at(-1)??0};};
try{
 for(let i=0;i<100;i++){try{if((await fetch(origin)).ok)break;}catch{}await delay(100);}
 browser=await chromium.launch({headless:true,args:label.includes('hardware')?['--use-angle=d3d11']:[]});const results=[];
 for(const mobile of [false,true])for(const n of [64,128,256]){
  const profile=mobile?'mobile':'desktop',context=await browser.newContext(mobile?{...devices['Pixel 7']}:{viewport:{width:1440,height:900}}),page=await context.newPage(),cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:mobile?4:1});await context.tracing.start({screenshots:true,snapshots:true,sources:true});
  await page.goto(origin);const id=await page.evaluate(async n=>(await import('/tests/fixtures/cylinder-render-benchmark.ts')).seed(n),n);
  await page.keyboard.press('Escape');
  // Open through the ordinary Atlas library, without allocating an active test replacement.
  const browse=page.getByRole('button',{name:'Browse saved maps',exact:true});if(await browse.isVisible())await browse.click();const toggle=page.getByRole('button',{name:'Open tools',exact:true});if(await toggle.count())await toggle.click();
  await page.getByRole('button',{name:'Refresh maps',exact:true}).click();await page.getByLabel('Saved maps',{exact:true}).selectOption(id);await page.getByRole('button',{name:'Open Map',exact:true}).click();
  const snap=()=>page.evaluate(async()=>(await import('/tests/fixtures/cylinder-observer.ts')).snapshot(false));
  const idle=async()=>{for(let i=0;i<600;i++){try{const s=await snap();if(s.ready&&!s.previewPending&&!s.painting&&s.revision===s.displayRevision)return;}catch{}await delay(50);}throw Error('idle timeout');};await idle();const close=page.getByRole('button',{name:'Close tools',exact:true});if(await close.isVisible())await close.click();
  await page.getByRole('button',{name:'Rotate / Pan',exact:true}).click();await idle();
  const physicalSettings=await snap();await page.screenshot({path:`docs/evidence/a7-p1a-${label}-${profile}-n${n}-physical.png`});
  if(n===128)await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline,cc,gpu,toplevel',transferMode:'ReturnAsStream',traceBufferSizeInKb:16384,options:'record-continuously'});
  await page.evaluate(async()=>(await import('/tests/fixtures/cylinder-render-benchmark.ts')).monitor());
  const box=await page.locator('.cylinder-canvas').boundingBox(),x=box.width*.5,y=box.height*.45;await page.mouse.move(x,y);await page.mouse.down();
  const started=Date.now();for(let i=1;i<=100;i++){await page.mouse.move(x+Math.sin(i/22)*100,y+Math.sin(i/29)*65);await delay(16);}await page.mouse.up();await idle();
  const navigation=await page.evaluate(async()=>(await import('/tests/fixtures/cylinder-render-benchmark.ts')).finishMonitor()),duration=Date.now()-started;
  await page.evaluate(async()=>(await import('/tests/fixtures/cylinder-render-benchmark.ts')).monitor());await page.mouse.move(x,y);await page.mouse.down();
  const cadence=await page.evaluate(async({x,y})=>{const c=document.querySelector('.cylinder-canvas'),at=performance.now();await new Promise(resolve=>{let i=0;const tick=()=>{i++;c.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,pointerType:'mouse',buttons:1,clientX:x+Math.sin(i/17)*90,clientY:y+Math.sin(i/27)*50,bubbles:true}));if(i<120)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});return performance.now()-at;},{x,y});await page.mouse.up();await idle();const continuous=await page.evaluate(async()=>(await import('/tests/fixtures/cylinder-render-benchmark.ts')).finishMonitor());
  let chromiumTrace;
  if(n===128){const completion=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');const done=await completion,chunks=[];let eof=false;while(!eof){const part=await cdp.send('IO.read',{handle:done.stream});chunks.push(Buffer.from(part.data,part.base64Encoded?'base64':'utf8'));eof=part.eof;}await cdp.send('IO.close',{handle:done.stream});const bytes=Buffer.concat(chunks),events=JSON.parse(bytes.toString()).traceEvents,counts={};for(const e of events)counts[e.name]=(counts[e.name]??0)+1;writeFileSync(`docs/evidence/a7-p1a-${label}-${profile}-n${n}-chromium-trace.json.gz`,gzipSync(bytes));chromiumTrace={bytes:bytes.length,dataLossOccurred:!!done.dataLossOccurred,counts};}
  const micro=await page.evaluate(async n=>(await import('/tests/fixtures/cylinder-render-benchmark.ts')).micro(n),n);
  await page.locator('.cylinder-canvas').focus();await page.keyboard.press('Home');await idle();await page.getByRole('button',{name:'Surface map',exact:true}).click();await idle();const mapSettings=await snap();await page.screenshot({path:`docs/evidence/a7-p1a-${label}-${profile}-n${n}-map.png`});
  await cdp.send('HeapProfiler.collectGarbage');const memory=await cdp.send('Runtime.getHeapUsage');
  const gl=await page.evaluate(()=>{const c=document.createElement('canvas'),g=c.getContext('webgl2');if(!g)return null;const ext=g.getExtension('WEBGL_debug_renderer_info'),result={vendor:g.getParameter(ext?.UNMASKED_VENDOR_WEBGL??g.VENDOR),renderer:g.getParameter(ext?.UNMASKED_RENDERER_WEBGL??g.RENDERER),maxTexture:g.getParameter(g.MAX_TEXTURE_SIZE)};g.getExtension('WEBGL_lose_context')?.loseContext();return result;});
  const summarize=m=>({frames:quant(m.gaps),cameraInput:quant(m.state.metrics.inputLatencies),pointerEventToRAF:quant(m.pointer),rasterOrDraw:quant(m.state.metrics.renderTimes),unreadyFrames:m.ready.filter(x=>!x).length,lagFrames:m.lags.filter(Boolean).length,droppedFrames:m.gaps.reduce((a,v)=>a+Math.max(0,Math.round(v/(1000/60))-1),0),presentationIntervals:quant(m.presentations.slice(1).map((v,i)=>v-m.presentations[i])),stages:Object.fromEntries(Object.entries(m.stages).map(([k,a])=>[k,quant(a)]))});
  const result={label,profile,n,cpuThrottle:mobile?4:1,duration,navigation,continuous,continuousCadenceMs:cadence,continuousSummary:summarize(continuous),summary:summarize(navigation),physicalSettings,mapSettings,micro,memory,gl,chromiumTrace};results.push(result);console.log(label,profile,n,JSON.stringify({native:result.summary,cadence:result.continuousSummary}));
  await context.tracing.stop({path:`docs/evidence/a7-p1a-${label}-${profile}-n${n}-trace.zip`});await context.close();writeFileSync(`docs/evidence/a7-p1a-${label}-benchmarks.json`,JSON.stringify(results,null,2));
 }
}finally{await browser?.close();server.kill();server.stdout.destroy();server.stderr.destroy();server.unref();log.end();}
