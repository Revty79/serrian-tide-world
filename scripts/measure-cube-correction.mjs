// Run from repository root with Atlas already serving. See CUBE-EF-CORRECTIVE-COMPLETION.md.
// node scripts/measure-cube-correction.mjs LABEL all|cube|pilot|cross|corner
// CUBE_CORRECTION_URL selects the current or isolated baseline preview.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
const phase=process.argv[2]??'baseline',filter=process.argv[3]??'all',dir=`.local/cube-correct-${phase}`;
if(!/^[a-z0-9-]+$/i.test(phase)||!['all','cube','pilot','cross','corner'].includes(filter))throw Error('Expected a simple result label and all, cube, pilot, cross or corner.');
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({args:['--use-angle=default']});
const cross=filter==='cross'||filter==='corner';
const cases=filter==='pilot'?[['cube',256,'auto']]:filter==='cube'?[['cube',128,'auto'],['cube',256,'auto'],['cube',128,'canvas'],['cube',256,'canvas']]:cross?[['cube',128,'auto'],['cube',256,'auto'],['cube',256,'canvas']]:[['cube',128,'auto'],['cube',256,'auto'],['sphere',128,'auto'],['sphere',256,'auto'],['cylinder',128,'auto'],['cylinder',256,'auto'],['cube',128,'canvas'],['cube',256,'canvas']];
const results=[];
for(const[shape,n,backend]of cases){
 const name=`${shape}-n${n}-${backend}`;console.log('BEGIN',name);const context=await browser.newContext({viewport:{width:1440,height:950}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 if(backend==='canvas')await page.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:Reflect.apply(old,this,[type,...args]);};});
 await page.goto(process.env.CUBE_CORRECTION_URL??'http://127.0.0.1:5260/');await page.getByLabel('World shape',{exact:true}).selectOption(shape);await page.getByLabel('World/map name').fill('Matched sustained '+name);
 if(shape==='cube'){await page.getByLabel('Cube resolution',{exact:true}).selectOption(String(n));await page.getByLabel('Cube edge length (m)').fill('1000000');}
 if(shape==='sphere'){await page.getByLabel('Sphere reference radius (m)',{exact:true}).fill('1000000');await page.getByLabel('Spherical resolution',{exact:true}).selectOption(String(n));}
 if(shape==='cylinder'){await page.getByLabel('Cylinder reference radius (m)',{exact:true}).fill('1000000');await page.getByLabel('Cylinder axial length (m)',{exact:true}).fill('1600000');await page.getByLabel('Cylinder numerical detail',{exact:true}).selectOption('256');}
 await page.getByRole('button',{name:'Create World / Map',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 const selector=shape==='cube'?'.cube-viewport':shape==='sphere'?'canvas[role=img]':'.cylinder-canvas';
 if(shape==='cube'){await page.locator('.cube-editor[data-ready=true]').waitFor({timeout:60000});await page.getByRole('button',{name:cross?'Corner':'View +Z face',exact:true}).click();}
 else await page.waitForFunction(selector=>document.querySelector(selector)?.dataset.ready==='true',selector,{timeout:60000});
 await page.getByRole('button',{name:'Open tools',exact:true}).click();
 if(shape==='sphere'){await page.getByLabel('Spherical brush radius (m)',{exact:true}).fill('70000');await page.getByLabel('Spherical strength (m/dab)',{exact:true}).fill('650');}
 if(shape==='cylinder'){await page.getByLabel('Cylinder brush radius (m)',{exact:true}).fill(n===128?'100000':'200000');await page.getByLabel('Cylinder strength (m/dab)',{exact:true}).fill('650');}
 await page.getByRole('button',{name:'Close tools',exact:true}).click();await page.waitForTimeout(700);
 await page.evaluate(async shape=>{if(shape==='cylinder')window.__cylinderObserve=(await import(new URL('/tests/fixtures/cylinder-observer.ts',location.origin).href)).snapshot;},shape);
 const box=await page.locator(selector).boundingBox();let points;
 if(shape==='cube')points=await page.evaluate(mode=>mode==='corner'?[window.__cubeEditor.project('pz',.3,.97),window.__cubeEditor.project('pz',1,1),window.__cubeEditor.project('px',.97,.3)]:mode==='cross'?[window.__cubeEditor.project('pz',.3,.2),window.__cubeEditor.project('pz',1,.2),window.__cubeEditor.project('px',.2,.3)]:[-.67,.67].map(u=>window.__cubeEditor.project('pz',u,0)),filter);
 else if(shape==='sphere')points=[{x:box.x+box.width*.32,y:box.y+box.height*.52},{x:box.x+box.width*.68,y:box.y+box.height*.52}];
 else points=[{x:box.x+box.width*.41,y:box.y+box.height*.4},{x:box.x+box.width*.59,y:box.y+box.height*.58}];
 await page.mouse.move(points[0].x,points[0].y);await page.waitForTimeout(300);
 await page.evaluate(({shape,selector})=>{
  const audit=window.__audit={events:[],frames:[],longTasks:[],pixels:[],progress:[],footprints:[],running:true,lastMove:0,held:false};let last=performance.now(),sampled=0,lastPixels,lastCanvas,lastCapture=0;
  const originalDraw=WebGL2RenderingContext.prototype.drawArrays,originalCanvas=CanvasRenderingContext2D.prototype.drawImage,scratch=document.createElement('canvas');scratch.width=scratch.height=128;const cpu=scratch.getContext('2d',{willReadFrequently:true});
  const capture=canvas=>{if(!audit.running||!canvas.isConnected||canvas.clientWidth<200||canvas.clientHeight<200||canvas.hidden||performance.now()-lastCapture<10)return;lastCapture=performance.now();cpu.clearRect(0,0,128,128);cpu.drawImage(canvas,0,0,128,128);const pixels=cpu.getImageData(0,0,128,128).data;let changed=0;for(let i=0;i<pixels.length;i+=4)if(lastPixels&&canvas===lastCanvas&&(pixels[i]!==lastPixels[i]||pixels[i+1]!==lastPixels[i+1]||pixels[i+2]!==lastPixels[i+2]))changed++;if(audit.pixels.length<3000)audit.pixels.push({at:performance.now(),changed,held:audit.held});lastPixels=pixels;lastCanvas=canvas;};
  WebGL2RenderingContext.prototype.drawArrays=function(...args){Reflect.apply(originalDraw,this,args);queueMicrotask(()=>capture(this.canvas));};
  CanvasRenderingContext2D.prototype.drawImage=function(...args){Reflect.apply(originalCanvas,this,args);if(this.canvas!==scratch)queueMicrotask(()=>capture(this.canvas));};
  const node=document.querySelector(selector),event=e=>{audit.lastMove=performance.now();if(e.type==='pointerdown')audit.held=true;if(e.type==='pointerup')audit.held=false;if(audit.events.length<2048)audit.events.push({type:e.type,at:performance.now(),eventTime:e.timeStamp,x:e.clientX,y:e.clientY});};for(const name of['pointerdown','pointermove','pointerup'])node.addEventListener(name,event,{capture:true});
  new PerformanceObserver(list=>{for(const e of list.getEntries())if(audit.longTasks.length<1024)audit.longTasks.push({at:e.startTime,ms:e.duration});}).observe({type:'longtask'});
  const paths=[...document.querySelectorAll('svg path')];if(paths.length)new MutationObserver(()=>{if(audit.running&&audit.footprints.length<2000)audit.footprints.push({at:performance.now(),inputAgeMs:performance.now()-audit.lastMove,held:audit.held});}).observe(paths[0],{attributes:true,attributeFilter:['d']});
  const frame=now=>{if(!audit.running)return;audit.frames.push({at:now,gap:now-last,held:audit.held});last=now;
   if(now-sampled>=100){sampled=now;let value;if(shape==='cube'){const s=window.__cubeEditor.snapshot();value={revision:s.editor.revision,displayRevision:s.display.displayedRevision,inputs:s.editor.stroke?.acceptedInputs,executed:s.editor.stroke?.fullyExecutedInputs,dabs:s.editor.stroke?.committedDabs,queue:s.editor.pending,processing:s.editor.processing};}else if(shape==='cylinder'){const s=window.__cylinderObserve(false);value={revision:s.revision,displayRevision:s.displayRevision,dabs:s.statistics.lastStroke?.committedDabs,queue:s.pendingPositions,processing:s.processing,painting:s.painting};}else{const c=document.querySelector(selector);value={revision:c.dataset.revision,displayRevision:c.dataset.displayRevision,processing:c.dataset.processing,stats:c.dataset.editStatistics};}audit.progress.push({at:now,...value});}requestAnimationFrame(frame);};requestAnimationFrame(frame);
 },{shape,selector});
 if(shape==='cube')await page.getByRole('button',{name:cross?'Corner':'View +Z face',exact:true}).click();else if(shape==='cylinder')await page.getByRole('button',{name:'Fit cylinder',exact:true}).click();else {await page.locator(selector).focus();await page.keyboard.press('Home');}await page.waitForTimeout(150);await page.mouse.move(points[0].x,points[0].y);
 const cdp=await context.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');
 const start=performance.now(),duration=3000,steps=180;await page.mouse.down();
 for(let i=1;i<=steps;i++){const target=start+duration*i/steps,wait=target-performance.now();if(wait>0)await new Promise(r=>setTimeout(r,wait));const t=i/steps,part=t*(points.length-1),segment=Math.min(points.length-2,Math.floor(part)),fraction=part-segment;await page.mouse.move(points[segment].x+(points[segment+1].x-points[segment].x)*fraction,points[segment].y+(points[segment+1].y-points[segment].y)*fraction+(cross?0:Math.sin(t*Math.PI*2)*18));}
 const up=await page.evaluate(()=>performance.now());await page.mouse.up();const pointerWallMs=performance.now()-start;
 if(shape==='cube')await page.locator('.cube-editor[data-processing=false]').waitFor({timeout:120000});else if(shape==='cylinder')await page.waitForFunction(()=>{const s=window.__cylinderObserve(false);return!s.painting&&s.revision===s.displayRevision;},null,{timeout:120000});else await page.waitForFunction(()=>{const c=document.querySelector('canvas[role=img]');return c.dataset.processing!=='true'&&c.dataset.displayPending!=='true'&&c.dataset.revision===c.dataset.displayRevision;},null,{timeout:120000});
 const finishedAt=await page.evaluate(()=>performance.now());await page.waitForTimeout(100);const{profile}=await cdp.send('Profiler.stop');await cdp.detach();
 const data=await page.evaluate(async shape=>{window.__audit.running=false;const summary=shape==='cube'?window.__cubeEditor.snapshot():shape==='cylinder'?window.__cylinderObserve(false):{canvas:[...document.querySelectorAll('canvas')].map(c=>({...c.dataset})),diagnostics:document.querySelector('[aria-label="Spherical display diagnostics"]')?.textContent};return{...window.__audit,summary,wordHash:shape==='cube'?await window.__cubeEditor.hash():undefined};},shape);
 const counts=new Map();profile.samples?.forEach((id,i)=>counts.set(id,(counts.get(id)??0)+(profile.timeDeltas?.[i]??1000)));const top=profile.nodes.map(node=>({function:node.callFrame.functionName,url:node.callFrame.url,line:node.callFrame.lineNumber+1,selfMs:(counts.get(node.id)??0)/1000})).sort((a,b)=>b.selfMs-a.selfMs).slice(0,35);
 const down=data.events.find(e=>e.type==='pointerdown'),changed=data.pixels.filter(p=>p.changed>0&&p.at>=down.at),first=changed[0],during=changed.filter(p=>p.at<=up),gaps=data.frames.filter(f=>f.at>=down.at&&f.at<=finishedAt).map(f=>f.gap).sort((a,b)=>a-b),s=data.summary;
 const row={name,shape,n,backend,pointerWallMs,firstChangedPixelsMs:first?.at-down.at,changedPresentationsWhileHeld:during.length,completionBacklogMs:finishedAt-up,maxFrameGapMs:gaps.at(-1),p95FrameGapMs:gaps[Math.floor(gaps.length*.95)],longTasks:data.longTasks,errors,topProfile:top,data};
 await writeFile(`${dir}/${name}.json`,JSON.stringify(row,null,2));await writeFile(`${dir}/${name}.cpuprofile`,JSON.stringify(profile));await page.screenshot({path:`${dir}/${name}.png`});console.log('RESULT',JSON.stringify({name,pointerWallMs,firstChangedPixelsMs:row.firstChangedPixelsMs,updates:during.length,backlog:row.completionBacklogMs,maxGap:row.maxFrameGapMs,errors,termination:s.editor?.termination}));results.push({...row,data:undefined});await writeFile(`${dir}/summary.json`,JSON.stringify(results,null,2));await context.close();
}
await browser.close();
