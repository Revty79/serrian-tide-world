import { expect, test, type Page, type CDPSession } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { CylinderRegion } from '../src/surfaces/cylinder.ts';
type Observer=typeof import('./fixtures/cylinder-observer.ts');
test.use({trace:'on'});
const canvas=(p:Page)=>p.getByRole('img',{name:'Interactive physical cylinder terrain',exact:true});
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const snapshot=(p:Page,words=true)=>p.evaluate(async words=>(await import(new URL('/tests/fixtures/cylinder-observer.ts',location.origin).href) as Observer).snapshot(words),words);
const projected=(p:Page,patchId:CylinderRegion,u:number,v:number)=>p.evaluate(async point=>(await import(new URL('/tests/fixtures/cylinder-observer.ts',location.origin).href) as Observer).project(point),{patchId,u,v});
async function ready(p:Page){await expect.poll(async()=>{try{return(await snapshot(p,false)).ready;}catch{return false;}},{timeout:30000}).toBe(true);}
async function idle(p:Page){await expect.poll(async()=>{const s=await snapshot(p,false);return s.ready&&!s.painting&&s.displayRevision===s.revision;},{timeout:60000}).toBe(true);}
async function setup(p:Page,n=128){await p.goto('/dev/cylinder.html');await ready(p);if(n!==128){await panel(p,true);await p.getByLabel('Preview detail',{exact:true}).selectOption(String(n));await button(p,'New blank cylinder').click();await expect.poll(async()=>{try{return(await snapshot(p,false)).metadata.representation.resolution.angularSamples;}catch{return 0;}},{timeout:30000}).toBe(n);await ready(p);}await settings(p,{'Cylinder strength (m/dab)':'1200'});}
async function panel(p:Page,open:boolean){const b=p.getByRole('button',{name:open?'☰ Cylinder tools':'× Close tools',exact:true});if(await b.count())await b.click();}
async function settings(p:Page,values:Record<string,string>){await panel(p,true);for(const[name,value]of Object.entries(values))await p.getByLabel(name,{exact:true}).fill(value);await panel(p,false);}
async function mode(p:Page,name:'Surface map'|'Physical view'){await button(p,name).click();await ready(p);await expect(canvas(p)).toHaveAttribute('data-mode',name==='Surface map'?'map':'physical');}
async function center(p:Page,name:'Side'|'Start cap'|'End cap'|'Center selection'){const d=p.locator('.cylinder-regions');if(await d.getAttribute('open')===null)await d.locator('summary').click();await button(p,name).click();await d.evaluate(e=>e.removeAttribute('open'));await ready(p);}
const observe=(p:Page)=>p.evaluate(async()=>(await import(new URL('/tests/fixtures/cylinder-observer.ts',location.origin).href) as Observer).observe());
const compare=(p:Page)=>p.evaluate(async()=>(await import(new URL('/tests/fixtures/cylinder-observer.ts',location.origin).href) as Observer).compare());
const digest=(a:number[])=>createHash('sha256').update(Buffer.from(Uint32Array.from(a).buffer)).digest('hex');
async function stroke(p:Page,points:{patchId:CylinderRegion;u:number;v:number}[]){const screens=[];for(const q of points){const s=await projected(p,q.patchId,q.u,q.v);expect(s).toBeDefined();screens.push(s!);}await p.mouse.move(screens[0]!.x,screens[0]!.y);await p.mouse.down();for(const s of screens.slice(1))await p.mouse.move(s.x,s.y);await p.mouse.up();await idle(p);}
async function exact(p:Page,points:Parameters<typeof stroke>[1]){const before=await snapshot(p);await observe(p);await stroke(p,points);const proof=await compare(p),after=await snapshot(p);expect(proof.mismatches).toBe(0);expect(proof.hidden).toBe(0);expect(proof.changed).toBeGreaterThan(0);expect(after.history.entries).toBe(before.history.entries+1);await button(p,'Undo').click();await idle(p);expect((await snapshot(p)).words).toEqual(before.words);await button(p,'Redo').click();await idle(p);expect((await snapshot(p)).words).toEqual(after.words);return proof;}
const side=(u:number,v=800000)=>({patchId:'side' as const,u,v}),cap=(end:boolean,v:number,u=0)=>({patchId:end?'cap-end' as const:'cap-start' as const,u,v});
const line=(a:number,b:number,n=8)=>Array.from({length:n+1},(_,i)=>a+(b-a)*i/n);
const rim=(end=false)=>[...line(end?1540000:60000,end?1600000:0,5).map(v=>side(0,v)),...line(1000000,940000,5).slice(1).map(v=>cap(end,v))];

test('cylinder real complete workflow: visible physical side, both caps, four tools, exact history and canonical previews',async({page},info)=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
 expect(await button(page,'Save').count()).toBe(0);await expect(page.getByText('Development preview · session only · cannot save',{exact:true})).toBeVisible();
 const before=await snapshot(page),angle=Math.atan2(before.view.frame.forward[1],before.view.frame.forward[0]);
 const physical=await exact(page,line(angle-.12,angle+.12).map(u=>side(u)));expect(physical.referenceDabs).toBeGreaterThan(1);
 await page.screenshot({path:`docs/evidence/a7-c-${info.project.name}-physical-edited.png`});
 const physicalWords=(await snapshot(page)).words;await mode(page,'Surface map');expect((await snapshot(page)).words).toEqual(physicalWords);
 const seedRim=await exact(page,rim());expect(seedRim.rims).toBeGreaterThan(0);await exact(page,[cap(false,0)]);await exact(page,[cap(true,0)]);
 const proofs=[];
 for(const tool of ['Raise','Lower','Smooth','Flatten']){
  await button(page,tool).click();if(tool==='Smooth'||tool==='Flatten')await settings(page,{'Cylinder intensity (%)':'65',...(tool==='Flatten'?{'Cylinder target elevation (m)':'-250'}:{})});
  for(const [name,points]of [['start-rim',rim()],['start-center',[cap(false,0)]],['end-center',[cap(true,0)]]]as const){const proof=await exact(page,[...points]);proofs.push({tool,name,...proof});}
  const preserved=(await snapshot(page)).words;await mode(page,'Physical view');expect((await snapshot(page)).words).toEqual(preserved);proofs.push({tool,name:'physical-side',...await exact(page,line(angle-.12,angle+.12).map(u=>side(u)))});await mode(page,'Surface map');
 }
 await button(page,'Raise').click();const q=(await projected(page,'side',0,800000))!;await page.mouse.move(q.x,q.y);await expect.poll(async()=>{const s=await snapshot(page,false);return !s.previewPending&&!!s.stencil;},{timeout:30000}).toBe(true);
 const stencil=(await snapshot(page,false)).stencil!,base=(await snapshot(page)).words;await page.mouse.click(q.x,q.y);await idle(page);const final=(await snapshot(page)).words;expect(final.map((v,i)=>v!==base[i]?i:-1).filter(i=>i>=0)).toEqual(stencil.indices);
 await page.mouse.move(8,200);await page.screenshot({path:`docs/evidence/a7-c-${info.project.name}-surface-map-edited.png`});
 const preserved=(await snapshot(page)).words;
 await mode(page,'Physical view');await center(page,'Start cap');await page.screenshot({path:`docs/evidence/a7-c-${info.project.name}-start-cap.png`});expect((await snapshot(page)).words).toEqual(preserved);
 await center(page,'End cap');await page.screenshot({path:`docs/evidence/a7-c-${info.project.name}-end-cap.png`});expect((await snapshot(page)).words).toEqual(preserved);
 await writeFile(`docs/evidence/a7-c-${info.project.name}-workflow.json`,JSON.stringify({physical,seedRim,proofs,preview:{indices:stencil.indices,exact:true,beforeSha256:digest(base),afterSha256:digest(final)},viewSwitchPreserved:true,pageErrors:errors,final:await snapshot(page,false)},null,2));expect(errors).toEqual([]);
});

test('cylinder navigation, recentering, resize, overlay focus and fullscreen preserve every word',async({page},info)=>{
 await setup(page);const before=await snapshot(page),angle=Math.atan2(before.view.frame.forward[1],before.view.frame.forward[0]);await settings(page,{'Cylinder brush radius (m)':'300000'});const limb=(await projected(page,'side',angle+Math.PI/2-.12,800000))!;await page.mouse.click(limb.x,limb.y);await idle(page);const hiddenGuard=await snapshot(page,false);expect(hiddenGuard.statistics.failures).toBe(1);expect(hiddenGuard.message).toContain('hidden');expect((await snapshot(page)).words).toEqual(before.words);await settings(page,{'Cylinder brush radius (m)':'83700'});
 await button(page,'Rotate / Pan').click();const p={x:page.viewportSize()!.width/2,y:page.viewportSize()!.height/2};await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+60,p.y+30,{steps:12});await page.mouse.up();await ready(page);expect((await snapshot(page)).view.frame).not.toEqual(before.view.frame);
 await button(page,'Zoom in').click();await ready(page);expect((await snapshot(page)).view.zoom).toBeGreaterThan(1);await center(page,'Start cap');await canvas(page).focus();await page.keyboard.press('Enter');await expect(button(page,'Center selection')).toBeHidden();await center(page,'End cap');await button(page,'Fit cylinder').click();await ready(page);
 const captures=[];for(const size of [{width:1440,height:900},{width:3440,height:1440},{width:800,height:800},{width:390,height:844}]){await page.setViewportSize(size);await ready(page);await mode(page,'Surface map');const s=await snapshot(page);expect(s.words).toEqual(before.words);const a=(await projected(page,'cap-start',0,0))!,b=(await projected(page,'cap-start',Math.PI/2,1000000))!,c=(await projected(page,'cap-start',0,1000000))!;expect(Math.abs(Math.abs(b.x-a.x)-Math.abs(c.y-a.y))).toBeLessThan(.001);captures.push({size,view:s.view,cacheBytes:s.cacheBytes});}
 await panel(page,true);await expect(page.getByRole('heading',{name:'Cylinder tools',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'☰ Cylinder tools',exact:true})).toBeFocused();
 const full=button(page,'Enter fullscreen');if(await full.count()){await full.click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);await button(page,'Exit fullscreen').click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(false);await ready(page);}
 expect((await snapshot(page)).words).toEqual(before.words);await writeFile(`docs/evidence/a7-c-${info.project.name}-navigation.json`,JSON.stringify({hiddenGuard:{message:hiddenGuard.message,zeroWrites:true},captures,preserved:true,final:await snapshot(page,false)},null,2));
});

test('cylinder interrupts pending drawing through capture, navigation, gestures and workspace changes without corruption',async({page},info)=>{
 test.setTimeout(180000);await setup(page);const records=[];
 for(const interruption of ['pointercancel','lostcapture','Escape','Space','view','tool','blur','resize','wheel']){
  await mode(page,'Surface map');await button(page,'Fit cylinder').click();await ready(page);await button(page,'Raise').click();const before=await snapshot(page),a=(await projected(page,'side',0,800000))!,b=(await projected(page,'side',.12,800000))!;
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await expect.poll(async()=>(await snapshot(page,false)).revision).toBeGreaterThan(before.revision);
  if(interruption==='pointercancel')await canvas(page).dispatchEvent('pointercancel',{pointerId:1});
  if(interruption==='lostcapture')await canvas(page).evaluate(c=>{if(c.hasPointerCapture(1))c.releasePointerCapture(1);});
  if(interruption==='Escape'||interruption==='Space')await page.keyboard.down(interruption);
  if(interruption==='view')await button(page,'Physical view').evaluate((b:HTMLButtonElement)=>b.click());
  if(interruption==='tool')await button(page,'Rotate / Pan').evaluate((b:HTMLButtonElement)=>b.click());
  if(interruption==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  if(interruption==='resize')await page.setViewportSize({width:page.viewportSize()!.width-1,height:page.viewportSize()!.height});
  if(interruption==='wheel')await page.mouse.wheel(0,-40);
  await page.mouse.up();if(interruption==='Escape'||interruption==='Space')await page.keyboard.up(interruption);await idle(page);const prefix=await snapshot(page);await page.waitForTimeout(80);expect((await snapshot(page)).words).toEqual(prefix.words);await button(page,'Undo').click();await idle(page);expect((await snapshot(page)).words).toEqual(before.words);await button(page,'Redo').click();await idle(page);expect((await snapshot(page)).words).toEqual(prefix.words);records.push({interruption,prefixSha256:digest(prefix.words),exactUndo:true,exactRedo:true,lastStroke:prefix.statistics.lastStroke});
 }
 await writeFile(`docs/evidence/a7-c-${info.project.name}-interruptions.json`,JSON.stringify(records,null,2));
});

test.describe('cylinder native touch capable context',()=>{
 test.use({hasTouch:true});
 test('cylinder native pen, touch, two-finger takeover and keyboard have exclusive numerical ownership',async({page,context},info)=>{
  test.setTimeout(120000);await setup(page);await mode(page,'Surface map');const cdp=await context.newCDPSession(page),a=(await projected(page,'side',0,800000))!,b=(await projected(page,'side',.18,800000))!;const before=await snapshot(page);await observe(page);
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...a,button:'left',buttons:1,pointerType:'pen'});for(const x of line(a.x,b.x,8))await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y:a.y,button:'none',buttons:1,pointerType:'pen'});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...b,button:'left',buttons:0,pointerType:'pen'});await idle(page);const pen=await compare(page);expect(pen.mismatches).toBe(0);const penWords=(await snapshot(page)).words;
  for(const x of line(a.x,b.x,4))await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y:a.y,button:'none',buttons:0,pointerType:'pen'});await page.waitForTimeout(120);expect((await snapshot(page)).words).toEqual(penWords);
  await observe(page);await touch(cdp,'touchStart',[{...a,id:1}]);for(const x of line(a.x,b.x,10))await touch(cdp,'touchMove',[{x,y:a.y,id:1}]);await touch(cdp,'touchEnd',[]);await idle(page);const finger=await compare(page);expect(finger.mismatches).toBe(0);const painted=(await snapshot(page)).words;
  await touch(cdp,'touchStart',[{...a,id:2}]);await touch(cdp,'touchStart',[{...a,id:2},{x:a.x+60,y:a.y+20,id:3}]);await touch(cdp,'touchMove',[{x:a.x-15,y:a.y,id:2},{x:a.x+80,y:a.y+40,id:3}]);await touch(cdp,'touchEnd',[{x:a.x-15,y:a.y,id:2}]);await touch(cdp,'touchMove',[{x:a.x-25,y:a.y,id:2}]);await touch(cdp,'touchEnd',[]);await ready(page);expect((await snapshot(page)).words).toEqual(painted);
  await canvas(page).focus();await page.keyboard.press('Home');await ready(page);await page.keyboard.press('ArrowRight');await ready(page);await page.keyboard.press('+');await ready(page);await page.keyboard.press('Home');await ready(page);expect((await snapshot(page)).words).toEqual(painted);
  await page.keyboard.press('Control+z');await idle(page);expect((await snapshot(page)).words).toEqual(penWords);await page.keyboard.press('Control+Shift+z');await idle(page);expect((await snapshot(page)).words).toEqual(painted);
  await page.keyboard.press('Control+s');await expect(page.getByLabel('Cylinder work status',{exact:true})).toContainText('Saving is unavailable');await writeFile(`docs/evidence/a7-c-${info.project.name}-native-input.json`,JSON.stringify({pen,finger,twoFingerPreserved:true,keyboardExact:true,initialSha256:digest(before.words),finalSha256:digest(painted)},null,2));
 });
});
async function touch(cdp:CDPSession,type:'touchStart'|'touchMove'|'touchEnd',points:{x:number;y:number;id:number}[]){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({...p,radiusX:4,radiusY:4,force:1}))});}

test('cylinder projected cuts stop safely and moving the working meridian preserves angular wrapping',async({page},info)=>{
 await setup(page);await mode(page,'Surface map');const records=[];
 for(const angle of [0,Math.PI]){
  await button(page,'Rotate / Pan').click();const q=(await projected(page,'side',angle-.01,800000))!;await page.mouse.click(q.x,q.y);const before=(await snapshot(page)).words;await center(page,'Center selection');expect((await snapshot(page)).words).toEqual(before);await button(page,'Raise').click();records.push(await exact(page,line(angle-.12,angle+.12).map(u=>side(u))));
 }
 await button(page,'Fit cylinder').click();await ready(page);const before=await snapshot(page),a=(await projected(page,'side',.2,1590000))!,b=(await projected(page,'cap-end',-.2,990000))!;await page.mouse.move(a.x,a.y);await page.mouse.down();await expect.poll(async()=>(await snapshot(page,false)).revision).toBeGreaterThan(before.revision);await page.mouse.move(b.x,b.y);await page.mouse.up();await idle(page);const prefix=await snapshot(page);expect((prefix.statistics.lastStroke as {committedDabs:number}).committedDabs).toBe(1);expect(prefix.message).toContain('cut');await button(page,'Undo').click();await idle(page);expect((await snapshot(page)).words).toEqual(before.words);
 await writeFile(`docs/evidence/a7-c-${info.project.name}-cuts-and-wrap.json`,JSON.stringify({records,gapStopped:true,exactPrefixUndo:true},null,2));
});

test('cylinder large physical footprints use real cap shortcuts; unsupported previews remain atomic',async({page},info)=>{
 test.setTimeout(120000);await setup(page,64);await mode(page,'Surface map');await settings(page,{'Cylinder brush radius (m)':'777000','Cylinder strength (m/dab)':'1200'});const q=(await projected(page,'side',0,5000))!;await page.mouse.move(q.x,q.y);await expect.poll(async()=>{const s=await snapshot(page,false);return !s.previewPending&&(!!s.stencil||s.previewMessage.startsWith('Preview unavailable'));},{timeout:60000}).toBe(true);const preview=await snapshot(page,false);expect(preview.stencil,preview.previewMessage).toBeDefined();
 const proof=await exact(page,[side(0,5000)]);expect(proof.rims).toBeGreaterThan(0);expect(proof.changes.some(c=>c.index===8)).toBe(true);const sideOnlyDistance=Math.hypot(1000000*Math.PI/4,5000),feasibleCapRoute=5000+2000000*Math.sin(Math.PI/8);expect(sideOnlyDistance).toBeGreaterThan(777000);expect(feasibleCapRoute).toBeLessThan(777000);await page.mouse.move(q.x,q.y);await expect.poll(async()=>!!(await snapshot(page,false)).stencil,{timeout:30000}).toBe(true);await page.screenshot({path:`docs/evidence/a7-c-${info.project.name}-large-footprint.png`});
 await panel(page,true);await page.getByLabel('Preview detail',{exact:true}).selectOption('256');page.once('dialog',d=>d.accept());await button(page,'New blank cylinder').click();await expect.poll(async()=>{try{return(await snapshot(page,false)).metadata.representation.resolution.angularSamples;}catch{return 0;}},{timeout:30000}).toBe(256);await ready(page);await mode(page,'Surface map');await settings(page,{'Cylinder brush radius (m)':'2000000'});
 const before=(await snapshot(page)).words,center=(await projected(page,'cap-start',0,0))!;await page.mouse.move(center.x,center.y);await expect.poll(async()=>(await snapshot(page,false)).previewMessage.startsWith('Preview unavailable'),{timeout:60000}).toBe(true);const limit=await snapshot(page,false);expect((await snapshot(page)).words).toEqual(before);expect(limit.stencil).toBeUndefined();expect(limit.previewMessage).toMatch(/budget|precision|limit/i);
 await writeFile(`docs/evidence/a7-c-${info.project.name}-large-footprint.json`,JSON.stringify({proof,capShortcut:{canonicalIndex:8,sideOnlyDistance,feasibleCapRoute,radiusMeters:777000,changed:true},preview:preview.stencil,limit:{message:limit.previewMessage,stencilCount:limit.stencil?.indices.length??0},noPreviewWrites:true},null,2));
});

test('cylinder replacement guards unsaved terrain, clears the old session and keeps the overlay geometry fixed',async({page},info)=>{
 await setup(page);await mode(page,'Surface map');await stroke(page,[side(0)]);const before=await snapshot(page),point=await projected(page,'side',0,800000);await panel(page,true);expect(await projected(page,'side',0,800000)).toEqual(point);await page.screenshot({path:`docs/evidence/a7-c-${info.project.name}-tools.png`});await page.getByLabel('Preview detail',{exact:true}).selectOption('64');
 page.once('dialog',d=>d.dismiss());await button(page,'New blank cylinder').click();expect((await snapshot(page)).words).toEqual(before.words);expect((await snapshot(page,false)).metadata.terrainId).toBe(before.metadata.terrainId);
 page.once('dialog',d=>d.accept());await button(page,'New blank cylinder').click();await expect.poll(async()=>{try{return(await snapshot(page,false)).metadata.representation.resolution.angularSamples;}catch{return 0;}},{timeout:30000}).toBe(64);await ready(page);const after=await snapshot(page);expect(after.metadata.terrainId).not.toBe(before.metadata.terrainId);expect(after.words.every(w=>w===0xc2c80000)).toBe(true);expect(after.history.entries).toBe(0);expect(after.painting).toBe(false);
 await writeFile(`docs/evidence/a7-c-${info.project.name}-replacement.json`,JSON.stringify({cancelPreserved:true,overlayCoordinatesFixed:true,acceptedBlank:true,oldIdentity:before.metadata.identity,newIdentity:after.metadata.identity,final:await snapshot(page,false)},null,2));
});

for(const n of [128,256])test(`cylinder measured navigation, cap tools, repeated and long/cancelled strokes N${n}`,async({page,context},info)=>{
 test.setTimeout(180000);const cdp=await context.newCDPSession(page);if(info.project.name==='mobile')await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await setup(page,n);const initial=await snapshot(page,false);await button(page,'Rotate / Pan').click();const v=page.viewportSize()!;await page.mouse.move(v.width/2,v.height/2);await page.mouse.down();await page.mouse.move(v.width/2+60,v.height/2+30,{steps:12});await page.mouse.up();await ready(page);
 await mode(page,'Surface map');await button(page,'Raise').click();await observe(page);for(let i=0;i<3;i++)await stroke(page,[cap(false,0)]);const beat=await page.evaluate(async()=>(await import(new URL('/tests/fixtures/cylinder-observer.ts',location.origin).href) as Observer).stopObservation());
 const costs=[];for(const tool of ['Smooth','Flatten']){await button(page,tool).click();await settings(page,{'Cylinder intensity (%)':'65',...(tool==='Flatten'?{'Cylinder target elevation (m)':'-250'}:{})});const t=Date.now();await stroke(page,[cap(false,0)]);costs.push({tool,wallMs:Date.now()-t});}
 await button(page,'Raise').click();await stroke(page,rim());const longBefore=(await snapshot(page)).words,at=Date.now();await stroke(page,line(400000,700000,160).map(z=>side(0,z)));const longAfter=await snapshot(page),longMs=Date.now()-at;expect((longAfter.statistics.lastStroke as {acceptedPositions:number}).acceptedPositions).toBe(162);await button(page,'Undo').click();await idle(page);expect((await snapshot(page)).words).toEqual(longBefore);await button(page,'Redo').click();await idle(page);expect((await snapshot(page)).words).toEqual(longAfter.words);
 const a=(await projected(page,'side',0,800000))!;await page.mouse.move(a.x,a.y);await page.mouse.down();for(const z of line(800000,1000000,80)){const q=(await projected(page,'side',0,z))!;await page.mouse.move(q.x,q.y);}await page.keyboard.press('Escape');await page.mouse.up();await idle(page);const final=await snapshot(page,false);expect(final.cacheBytes).toBe((n*(n-1)+2)*4);expect(final.statistics.stagedDisplayPeakBytes).toBeLessThanOrEqual(65536);expect(final.rasterBytes).toBeLessThanOrEqual(1440000);
 await page.screenshot({path:`docs/evidence/a7-c-${info.project.name}-n${n}-measured.png`});await writeFile(`docs/evidence/a7-c-${info.project.name}-n${n}-measurements.json`,JSON.stringify({n,cpuThrottle:info.project.name==='mobile'?4:1,initial,costs,longMs,longStroke:longAfter.statistics.lastStroke,cancelled:final.statistics.lastStroke,beat,final,heap:await cdp.send('Runtime.getHeapUsage')},null,2));
});
