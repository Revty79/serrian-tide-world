// Normal / workspace, saved geography, native held gestures. Independent CDP
// compositor capture excludes overlays. Swap timestamps are not display photons.
import {chromium,devices} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
import {inflateSync,gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const label=process.argv[2]??'after',quick=process.argv.includes('quick'),stress=label.includes('stress'),port=5220,origin=`http://127.0.0.1:${port}`,delay=ms=>new Promise(r=>setTimeout(r,ms));
const base='267903f69e5cdff3f2151944b971002ca7d2be7e',root=label.startsWith('before')?'.local/a7-p1b-baseline':'.';
if(label.startsWith('before')){
 const paths=execFileSync('git',['ls-tree','-r','--name-only',base],{encoding:'utf8'}).trim().split('\n').filter(p=>/^(src\/|tests\/|dev\/|index.html$|package.*json$|vite.config.ts$|tsconfig.json$)/.test(p));
 for(const p of paths){const dest=join(root,p);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,execFileSync('git',['show',`${base}:${p}`],{maxBuffer:20e6}));}
 // Timing-only probes; the pre-worker numerical and session behavior is intact.
 for(const p of ['src/editor/painting-metrics.ts','src/surfaces/cylinder-distance.ts','src/surfaces/cylinder-path.ts','src/terrain/cylindrical-smoothing.ts','src/terrain/cylindrical-brush.ts','tests/fixtures/cylinder-painting-monitor.ts'])writeFileSync(join(root,p),readFileSync(p));
 for(const[p,a,b]of [['src/terrain/cylindrical-stroke.ts','const next = sampler.next();',"const next = paintingStage('spacing', () => sampler!.next());"],['src/editor/cylindrical-history.ts','const writes = job.commit();',"const writes = paintingStage('canonicalCommit', () => job.commit());"]]){const f=join(root,p),header=`import { paintingStage } from '${p.includes('/terrain/')?'../editor/':'./'}painting-metrics.ts';\n`;writeFileSync(f,header+readFileSync(f,'utf8').replace(a,b));}
 const strokeFile=join(root,'src/terrain/cylindrical-stroke.ts');writeFileSync(strokeFile,readFileSync(strokeFile,'utf8').replace("job.pump(candidateSteps);","paintingStage('dabPreparation', () => job!.pump(candidateSteps));"));
 const host=join(root,'src/components/CylinderPreview.tsx');let h=readFileSync(host,'utf8');h="import { recordPaintingStage } from '../editor/painting-metrics.ts';\n"+h.replace('import { useEffect,','import { Profiler, useEffect,').replace('return <Container ref={root}',`return <Profiler id="cylinder-workspace" onRender={(_id, _phase, actualDuration) => recordPaintingStage('reactRender', actualDuration)}><Container ref={root}`).replace('</Container>;','</Container></Profiler>;');writeFileSync(host,h);
 const replace=(s,a,b)=>{assert.ok(s.includes(a),`Missing timing probe: ${a}`);return s.replace(a,b);};
 h=replace(h,'metrics.overlayMaxMs = Math.max(metrics.overlayMaxMs, performance.now() - t);',"const overlayMs=performance.now()-t; metrics.overlayMaxMs=Math.max(metrics.overlayMaxMs,overlayMs); recordPaintingStage('overlay',overlayMs);");
 h=replace(h,'bounded(metrics.resizeTimes, [receipt.resizeMs]); presented();',"bounded(metrics.resizeTimes, [receipt.resizeMs]); recordPaintingStage('gpuElevationUpload',receipt.uploadMs); recordPaintingStage('gpuSubmit',receipt.submitMs); presented();");
 h=replace(h,'metrics.rasterTotalMs += elapsed;',"metrics.rasterTotalMs += elapsed; recordPaintingStage('cpuRasterSlice',elapsed);");writeFileSync(host,h);
 const sessionFile=join(root,'src/editor/cylinder-preview-session.ts');let session="import { paintingStage } from './painting-metrics.ts';\n"+readFileSync(sessionFile,'utf8');
 session=replace(session,'commitDab: (job: Parameters<typeof operation.commitDab>[0]) => {',"commitDab: (job: Parameters<typeof operation.commitDab>[0]) => paintingStage('historyCheckpointDisplayHandoff', () => {");
 session=replace(session,'this.lastDab = stencil; return count;\n      } });','this.lastDab = stencil; return count;\n      }) });');
 session=replace(session,'this.preview.job.pump(32);',"paintingStage('footprintPreparation', () => this.preview!.job.pump(32));");writeFileSync(sessionFile,session);
}
let focus={x:.5,y:.5};
function crop(base64){
 const png=Buffer.from(base64,'base64'),parts=[];let w,h,c;
 for(let i=8;i<png.length;){const n=png.readUInt32BE(i),t=png.toString('ascii',i+4,i+8),d=png.subarray(i+8,i+8+n);if(t==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);c=d[9]===6?4:3;assert.equal(d[8],8);}if(t==='IDAT')parts.push(d);i+=n+12;}
 const raw=inflateSync(Buffer.concat(parts)),s=w*c,p=Buffer.alloc(s*h);let a=0;
 const paeth=(x,y,z)=>{const q=x+y-z,dx=Math.abs(q-x),dy=Math.abs(q-y),dz=Math.abs(q-z);return dx<=dy&&dx<=dz?x:dy<=dz?y:z;};
 for(let y=0;y<h;y++){const f=raw[a++];for(let x=0;x<s;x++){const l=x>=c?p[y*s+x-c]:0,u=y?p[(y-1)*s+x]:0,z=y&&x>=c?p[(y-1)*s+x-c]:0;p[y*s+x]=(raw[a++]+(f===1?l:f===2?u:f===3?Math.floor((l+u)/2):f===4?paeth(l,u,z):0))&255;}}
 const bits=[];for(let y=Math.max(0,Math.floor(h*(focus.y-.08)));y<Math.min(h,Math.floor(h*(focus.y+.08)));y++)bits.push(p.subarray(y*s+Math.max(0,Math.floor(w*(focus.x-.08)))*c,y*s+Math.min(w,Math.floor(w*(focus.x+.08)))*c));
 return createHash('sha256').update(Buffer.concat(bits)).digest('hex');
}
const server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:resolve(root),windowsHide:true,stdio:'ignore'});let browser;const records=[];
try{
 for(let i=0;;i++){if(server.exitCode!==null||i>300)throw Error('Strict server unavailable');try{if((await fetch(origin)).ok)break;}catch{}await delay(100);}
 for(const backend of quick?['hardware']:['hardware','fallback']){
 browser=await chromium.launch(backend==='hardware'?{channel:'chrome',headless:false}:{headless:true});
 for(const profile of quick?['desktop']:['desktop','mobile'])for(const n of quick?[256]:[64,128,256]){
 const context=await browser.newContext(profile==='mobile'?devices['Pixel 7']:{viewport:{width:1440,height:900}}),page=await context.newPage(),cdp=await context.newCDPSession(page);
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:profile==='mobile'?4:1});
 const b=name=>page.getByRole('button',{name,exact:true}),snap=()=>page.evaluate(async()=>(await import('/tests/fixtures/cylinder-observer.ts')).snapshot(false));
 const idle=async()=>{const at=Date.now();while(Date.now()-at<180000){try{const s=await snap();if(s.ready&&!s.painting&&!s.previewPending&&s.revision===s.displayRevision)return s;}catch{}await delay(40);}throw Error('Idle timed out');};
 await page.goto(origin);
 const fixturePath=n===64?'docs/evidence/a7-p1b-sculpted-n64.json':`docs/evidence/a7-p1ar-sculpted-n${n}.json`;
 let fixture;if(existsSync(fixturePath))fixture=JSON.parse(readFileSync(fixturePath,'utf8'));else{fixture=await page.evaluate(async n=>(await import('/tests/fixtures/cylinder-visual-proof.ts')).sculpted(n),n);writeFileSync(fixturePath,JSON.stringify(fixture,null,2));}
 const id=await page.evaluate(async fixture=>(await import('/tests/fixtures/cylinder-visual-proof.ts')).install(fixture),fixture);await page.keyboard.press('Escape');
 if(await b('Browse saved maps').isVisible())await b('Browse saved maps').click();if(await b('Open tools').isVisible())await b('Open tools').click();await b('Refresh maps').click();await page.getByLabel('Saved maps',{exact:true}).selectOption(id);await b('Open Map').click();await idle();
 if(stress){if(await b('Open tools').isVisible())await b('Open tools').click();await page.getByLabel('Cylinder brush radius (m)',{exact:true}).fill('377100');await page.getByLabel('Cylinder strength (m/dab)',{exact:true}).fill('2000');}
 if(await b('Close tools').isVisible())await b('Close tools').click();if(stress)await b('Surface map').click();
 // Keep reference camera fixed, with the initial physical side centered.
 await page.addStyleTag({content:'.cylinder-overlay,.cylinder-pointer{visibility:hidden!important}'});
 const state=await idle();assert.equal(state.renderer.kind,backend==='hardware'?'webgl2':'cpu');
 await context.tracing.start({screenshots:true,snapshots:true,sources:true});
 for(let repeat=0;repeat<(quick?1:3);repeat++)for(const tool of ['Raise','Lower','Smooth','Flatten']){
 await b(tool).click();await page.mouse.move(4,4);await idle();
 const p=await page.evaluate(async v=>(await import('/tests/fixtures/cylinder-observer.ts')).project({patchId:'side',u:.013,v}),stress?43700:800000);
 const viewport=page.viewportSize();focus={x:p.x/viewport.width,y:p.y/viewport.height};
 assert.ok(p);
 await cdp.send('Tracing.start',{categories:'devtools.timeline,toplevel,disabled-by-default-devtools.timeline',transferMode:'ReturnAsStream',traceBufferSizeInKb:16384});
 await page.evaluate(async()=>(await import('/tests/fixtures/cylinder-painting-monitor.ts')).monitorPainting());
 const previewStarted=await page.evaluate(()=>performance.now());await page.mouse.move(p.x,p.y);await idle();
 const previewBeforeStroke=await page.evaluate(async started=>{const s=(await import('/tests/fixtures/cylinder-observer.ts')).snapshot(false);return{wallAwaitMs:performance.now()-started,diagnostics:s.previewDiagnostics??null,mainSliceMaxMs:s.statistics.previewMaxMs};},previewStarted);
 const frames=[];let total=0;cdp.removeAllListeners('Page.screencastFrame');
 cdp.on('Page.screencastFrame',e=>{void cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});if(++total>2048)return;frames.push({utcMs:e.metadata.timestamp*1000,receipt:Date.now(),hash:crop(e.data)});if(frames.length>512)frames.shift();});
 await cdp.send('Page.startScreencast',{format:'png',maxWidth:480,maxHeight:320,everyNthFrame:1});for(let i=0;!frames.length&&i<100;i++)await delay(20);assert.ok(frames.length);
 const original=frames.at(-1).hash,at=Date.now();await page.mouse.down();
 for(let i=1;i<=(stress?80:32);i++){await page.mouse.move(p.x+i*(stress?.3:.45),p.y+Math.sin(i/5)*2);await delay(16);}
 await page.mouse.up();await idle();await delay(150);await cdp.send('Page.stopScreencast');
 const result=await page.evaluate(async()=>(await import('/tests/fixtures/cylinder-painting-monitor.ts')).finishPaintingMonitor());
 const complete=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');const done=await complete,chunks=[];for(;;){const x=await cdp.send('IO.read',{handle:done.stream});chunks.push(Buffer.from(x.data,x.base64Encoded?'base64':'utf8'));if(x.eof)break;}await cdp.send('IO.close',{handle:done.stream});
 const trace=Buffer.concat(chunks),events=JSON.parse(trace.toString()).traceEvents,thread=events.find(e=>e.name==='thread_name'&&e.args?.name==='CrRendererMain');
 const downMark=events.find(e=>e.name==='TimeStamp'&&e.args?.data?.message==='atlas-paint-down');assert.ok(downMark,'Native down trace marker');
 const rendererTasks=events.filter(e=>e.name==='RunTask'&&e.dur&&e.pid===thread?.pid&&e.tid===thread?.tid);
 const tasks=rendererTasks.filter(e=>e.ts+e.dur>=downMark.ts).map(e=>e.dur/1000);assert.ok(tasks.length);assert.ok(!done.dataLossOccurred);
 if(n===256&&repeat===0)writeFileSync(`docs/evidence/a7-p1b-${label}-${backend}-${profile}-n${n}-${tool.toLowerCase()}${quick?'-quick':''}-chromium.json.gz`,gzipSync(trace));
 result.mainThreadTasksMs=tasks;
 result.preludeMainThreadTasksMs=rendererTasks.filter(e=>e.ts+e.dur<downMark.ts).map(e=>e.dur/1000);result.previewBeforeStroke=previewBeforeStroke;
 result.finalWordsSha256=await page.evaluate(async()=>{const s=(await import('/tests/fixtures/cylinder-observer.ts')).snapshot();return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',Uint32Array.from(s.words).buffer)),v=>v.toString(16).padStart(2,'0')).join('');});
 const first=result.inputs.find(e=>e.type==='pointerdown'),changed=frames.find(f=>f.hash!==original&&f.utcMs>=first.utcMs);
 const drawingFrames=result.frames.filter(f=>f.utcMs>=first.utcMs);result.drawingRafGapsMs=drawingFrames.slice(1).map((f,i)=>f.rafTime-drawingFrames[i].rafTime);
 const out={label,backend,profile,n,tool,repeat,fixture:{path:fixturePath,payloadSha256:fixture.payloadSha256,id},cpuThrottle:profile==='mobile'?4:1,wallMs:Date.now()-at,renderer:state.renderer,firstInputToVisibleTerrainMs:changed?changed.utcMs-first.utcMs:null,firstChangedFrame:changed,frames,result};records.push(out);
 console.log(label,backend,profile,n,tool,JSON.stringify({visible:out.firstInputToVisibleTerrainMs,maxGap:result.maxGap,maxTask:Math.max(0,...result.longTasks),queue:result.maxQueue,wall:out.wallMs}));
 writeFileSync(`docs/evidence/a7-p1b-${label}-painting${quick?'-quick':''}.json`,JSON.stringify({base,method:'Three repeated native continuous held strokes per brush/detail/profile/backend; 32 ordinary or 80 large-rim moves at host 16ms intervals. First changed decoded local terrain pixels in CDP compositor PNG after actual DOM down. Overlay and pointer hidden only during capture. Includes capture/trace overhead. Not photons, not every no-dab pointer position. Full stage samples are last-512 windows with lifetime counts/totals/max. Extracted main-renderer RunTask durations retained for every stroke; full Chromium traces retained for N256 first repetitions.',records},null,2));
 }
 await cdp.send('HeapProfiler.collectGarbage');const memory=await cdp.send('Runtime.getHeapUsage');
 for(const r of records.filter(r=>r.backend===backend&&r.profile===profile&&r.n===n))r.mainRealmHeapAfterContext=memory;
 await page.screenshot({path:`docs/evidence/a7-p1b-${label}-${backend}-${profile}-n${n}${quick?'-quick':''}.png`});await context.tracing.stop({path:`docs/evidence/a7-p1b-${label}-${backend}-${profile}-n${n}${quick?'-quick':''}-trace.zip`});await context.close();
 }await browser.close();browser=undefined;
 }
 writeFileSync(`docs/evidence/a7-p1b-${label}-painting${quick?'-quick':''}.json`,JSON.stringify({base,method:'Native normal-workspace held strokes, three repetitions per brush/detail/profile/backend (one in quick mode). 32 ordinary or 80 large-rim native moves, 16ms host cadence. First changed decoded local terrain crop in compositor PNG; pointer/footprint overlays hidden during capture. Includes capture/tracing overhead, not photons. No pixel change is null. Last-512 stage windows plus lifetime counts/totals/max. Main-renderer RunTask raw durations per gesture; N256 first-repetition Chromium traces. GC heap is main JS realm only, not worker VMs, process or GPU memory.',records},null,2));
}finally{await browser?.close();server.kill();server.unref();}
