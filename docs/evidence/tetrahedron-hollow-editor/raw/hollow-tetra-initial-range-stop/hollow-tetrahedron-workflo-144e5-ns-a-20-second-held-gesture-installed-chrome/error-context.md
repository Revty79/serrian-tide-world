# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hollow-tetrahedron-workflow.spec.ts >> Hollow Tetrahedron N256 canvas map: each bank retains a 20-second held gesture
- Location: tests\hollow-tetrahedron-workflow.spec.ts:22:73

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 1
```

# Page snapshot

```yaml
- main "Atlas workspace" [ref=e1]:
  - region "Cylindrical surface view" [ref=e2]:
    - img "Interactive physical cylinder terrain" [active] [ref=e3]
    - generic [aria-hidden]: Pointer
    - button "Open tools" [ref=e4] [cursor=pointer]: ☰ Atlas
    - group "Editing history and saving" [ref=e5]:
      - button "Undo" [ref=e6] [cursor=pointer]
      - button "Redo" [disabled] [ref=e7]
      - button "Save" [ref=e8] [cursor=pointer]
    - group "Terrain tool" [ref=e9]:
      - button "Rotate / Pan" [ref=e10] [cursor=pointer]
      - button "Raise" [pressed] [ref=e11] [cursor=pointer]
      - button "Lower" [ref=e12] [cursor=pointer]
      - button "Smooth" [ref=e13] [cursor=pointer]
      - button "Flatten" [ref=e14] [cursor=pointer]
    - navigation "Map navigation" [ref=e15]:
      - group [ref=e16]:
        - generic [ref=e17]: Outside
        - button "Physical view" [ref=e18] [cursor=pointer]
        - button "Surface map" [pressed] [ref=e19] [cursor=pointer]
        - button "Zoom out" [ref=e20] [cursor=pointer]: −
        - generic [ref=e21]: 100%
        - button "Zoom in" [ref=e22] [cursor=pointer]: +
        - button "Fit tetrahedron" [ref=e23] [cursor=pointer]
        - group [ref=e24]:
          - generic "Center region" [ref=e25] [cursor=pointer]
        - button "Enter Fullscreen" [ref=e26] [cursor=pointer]: ⛶
    - status "Map work status": Unsaved changes
    - generic:
      - status "Cylinder work status": "Stroke stopped safely: RangeError: Elevation exceeds polyhedron clearance. Committed prefix remains undoable."
      - paragraph: 1108 canonical samples would change (1109 within the intrinsic footprint).
      - status "Cylinder elevation readout": 9,198.28 m · east face
```

# Test source

```ts
  1  | import {test,expect,type Page} from '@playwright/test';import {mkdirSync,writeFileSync} from 'node:fs';
  2  | import {toolsPanel} from './workspace-helpers.ts';import {startPaintingPixels,finishPaintingPixels} from './helpers/painting-pixels.ts';
  3  | const output='.local/hollow-tetrahedron-browser';
  4  | async function ready(page:Page){await page.waitForFunction(()=>{const d=document.querySelector<HTMLCanvasElement>('.cylinder-canvas')?.dataset;return d?.ready==='true'&&d.painting==='false'&&d.processing==='false'&&d.revision===d.displayRevision;},null,{timeout:60000});}
  5  | async function state(page:Page){return page.evaluate(async()=>{const path='/src/components/ConnectedWorkspace.tsx',m=await import(path);return m.connectedWorkspaceInspection().snapshot(false) as{view:object;controls:object;metadata:{geometry:unknown};renderer:{kind:string;width:number;height:number};statistics:{failures:number;cancellations:number};history:{entries:number}};});}
  6  | async function hash(page:Page,role:'exterior'|'interior'){return page.evaluate(r=>window.__hollowTetrahedronEditor!.hash(r),role);}
  7  | async function baseHash(page:Page){return page.evaluate(async()=>{const path='/src/components/ConnectedWorkspace.tsx',m=await import(path),s=m.connectedWorkspaceInspection().snapshot() as{words:number[];metadata:{geometry:unknown;representation:{subdivisions:number}}},gp='/src/surfaces/tetrahedron.ts',gm=await import(gp),g=gm.createTetrahedronGeometry(s.metadata.geometry),n=s.metadata.representation.subdivisions,ids=g.vertexIds('base'),start=g.vertices.length+g.edges.length*(n-1),triangle=(n-1)*(n-2)/2,baseFace=g.faces.indexOf('base'),words=s.words.filter((_v,i)=>i<g.vertices.length?ids.includes(i):i<start?g.edges[Math.floor((i-g.vertices.length)/(n-1))].every((id:number)=>ids.includes(id)):Math.floor((i-start)/triangle)===baseFace);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',Uint32Array.from(words).buffer)),x=>x.toString(16).padStart(2,'0')).join('');});}
  8  | async function point(page:Page,patchId:string,u:number,v:number){const p=await page.evaluate(async p=>{const path='/src/components/ConnectedWorkspace.tsx',m=await import(path);return m.connectedWorkspaceInspection().project(p);},{patchId,u,v});if(!p)throw Error('Missing real tetrahedron projection.');const b=(await page.locator('.cylinder-canvas').boundingBox())!;return{x:p.x+b.x,y:p.y+b.y};}
  9  | async function stroke(page:Page,points:{x:number;y:number}[],delay=12){await page.mouse.move(points[0]!.x,points[0]!.y);await page.mouse.down();for(const p of points){await page.mouse.move(p.x,p.y);await page.waitForTimeout(delay);}await page.mouse.up();await ready(page);}
  10 | async function select(page:Page,role:'exterior'|'interior'){await toolsPanel(page,true);await page.getByRole('button',{name:role==='exterior'?'Paint Outside':'Paint Inside',exact:true}).click();await expect(page.locator('.hollow-tetrahedron-editor')).toHaveAttribute('data-selected-surface',role);await ready(page);await toolsPanel(page,false);}
  11 | async function toward(page:Page,faces:string[]){await page.evaluate(async faces=>{const path='/src/components/ConnectedWorkspace.tsx',m=await import(path),s=m.connectedWorkspaceInspection().snapshot(false) as{view:object;metadata:{geometry:unknown}},gp='/src/surfaces/tetrahedron.ts',gm=await import(gp),vp='/src/surfaces/pyramid.ts',vm=await import(vp),g=gm.createTetrahedronGeometry(s.metadata.geometry),forward=vm.pyramidUnit(faces.reduce((sum:number[],face)=>{const n=g.normal({...g.identity,patchId:face,u:.25,v:.25});return sum.map((v,k)=>v+n[k]);},[0,0,0])),right=vm.pyramidUnit(vm.pyramidCross(Math.abs(forward[2])>.9?[0,1,0]:[0,0,1],forward)),up=vm.pyramidCross(forward,right);window.__hollowTetrahedronEditor!.setView({...s.view,frame:{forward,right,up},mode:'physical',zoom:1,target:[0,0,0],pan:{x:0,y:0},interiorView:'edit'} as never);},faces);await ready(page);}
  12 | for(const n of[128,256])for(const backend of['auto','canvas'])test(`Hollow Tetrahedron N${n} ${backend}: independent banks, all tools and six joins, sharp inspection, exact replay and v18 reopen`,async({page})=>{
  13 |  test.setTimeout(240000);mkdirSync(output,{recursive:true});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));if(backend==='canvas')await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type,...args){return type==='webgl2'?null:Reflect.apply(get,this,[type,...args]);} as typeof get;});await page.goto('/');await page.getByLabel('World shape',{exact:true}).selectOption('hollow-tetrahedron');await page.getByLabel('World/map name',{exact:true}).fill(`Hollow tetrahedron N${n} ${backend}`);await page.getByLabel('Tetrahedron numerical detail',{exact:true}).selectOption(String(n));await page.getByRole('button',{name:'Create World / Map',exact:true}).click();await ready(page);expect((await state(page)).renderer.kind).toBe(backend==='auto'?'webgl2':'cpu');
  14 |  const cases=[];for(const role of['exterior','interior'] as const){if(role==='interior')await select(page,role);await toward(page,['east']);await page.getByRole('button',{name:'Rotate / Pan',exact:true}).click();const dragBefore=await point(page,'east',.25,.35);await stroke(page,[dragBefore,{x:dragBefore.x,y:dragBefore.y-35}],16);const dragAfter=await point(page,'east',.25,.35);expect(dragAfter.y).toBeLessThan(dragBefore.y);await page.getByRole('button',{name:'Raise',exact:true}).click();await toward(page,['east']);const other=role==='exterior'?'interior':'exterior',unrelated=await hash(page,other),before=await hash(page,role);await startPaintingPixels(page);const points=[];for(let i=0;i<100;i++)points.push(await point(page,'east',.18+i*.0015,.35));await stroke(page,points,16);const timing=await finishPaintingPixels(page);expect(timing.summary.p95InputToCommit).toBeLessThan(250);expect(timing.summary.p95CommitToPixels).toBeLessThan(150);expect(timing.summary.p95InputToPixels).toBeLessThan(300);expect(timing.samples.every(s=>s.width*s.height>=1300000)).toBe(true);const after=await hash(page,role);expect(after).not.toBe(before);expect(await hash(page,other)).toBe(unrelated);await page.getByRole('button',{name:'Undo',exact:true}).click();await ready(page);expect(await hash(page,role)).toBe(before);await page.getByRole('button',{name:'Redo',exact:true}).click();await ready(page);expect(await hash(page,role)).toBe(after);await page.screenshot({path:`${output}/n${n}-${backend}-${role}-wall.png`});
  15 |  const joinTimings=[];const edges=await page.evaluate(async()=>{const p='/src/surfaces/tetrahedron.ts',m=await import(p);return m.TETRAHEDRON_EDGES.map((edge:readonly[number,number])=>({edge,faces:m.TETRAHEDRON_FACES.filter((f:string)=>edge.every((id:number)=>m.TETRAHEDRON_VERTICES[f].includes(id)))}));});
  16 |  for(const {edge,faces}of edges){await toward(page,faces);const points=[];for(const[side,face]of faces.entries())for(let i=0;i<=20;i++){const weight=side===0?.06*(1-i/20):.06*i/20,coordinate=await page.evaluate(async({face,edge,weight})=>{const p='/src/surfaces/tetrahedron.ts',m=await import(p),ids=m.TETRAHEDRON_VERTICES[face],w=ids.map((id:number)=>edge.includes(id)?(1-weight)/2:weight);return{u:w[1],v:w[2]};},{face,edge,weight});points.push(await point(page,face,coordinate.u,coordinate.v));}const old=(await state(page)).history.entries;await startPaintingPixels(page);await stroke(page,points,8);const joined=await finishPaintingPixels(page);expect(joined.summary.p95InputToPixels).toBeLessThan(300);expect(joined.summary.p95InputToCommit).toBeLessThan(250);expect(joined.summary.p95CommitToPixels).toBeLessThan(150);joinTimings.push({edge,faces,timing:joined});expect((await state(page)).history.entries).toBe(old+1);}
  17 |  await page.getByRole('button',{name:'Surface map',exact:true}).click();await ready(page);for(const tool of['Lower','Smooth','Flatten']){await page.getByRole('button',{name:tool,exact:true}).click();const points=[];for(let i=0;i<25;i++)points.push(await point(page,'base',.3+i*.003,.3));await stroke(page,points,8);}await page.getByRole('button',{name:'Raise',exact:true}).click();expect(await hash(page,other)).toBe(unrelated);cases.push({role,timing,joinTimings,before,after,final:await hash(page,role),state:await state(page)});await page.screenshot({path:`${output}/n${n}-${backend}-${role}-net.png`});}
  18 |  const editing=await state(page),outside=await hash(page,'exterior'),inside=await hash(page,'interior');await page.getByRole('button',{name:'View from inside',exact:true}).click();await ready(page);await expect(page.locator('.cylinder-canvas')).toHaveAttribute('data-inspecting','true');await page.getByRole('button',{name:'Undo',exact:true}).isDisabled().then(x=>expect(x).toBe(true));await page.keyboard.press('Control+z');const box=(await page.locator('.cylinder-canvas').boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+90,box.y+box.height/2+30,{steps:12});await page.mouse.up();await page.getByRole('button',{name:'Zoom in',exact:true}).click();await ready(page);expect(await hash(page,'interior')).toBe(inside);expect(await hash(page,'exterior')).toBe(outside);await page.screenshot({path:`${output}/n${n}-${backend}-cavity.png`});await page.getByRole('button',{name:'Return to editing',exact:true}).click();await ready(page);expect((await state(page)).view).toEqual(editing.view);expect((await state(page)).controls).toEqual(editing.controls);
  19 |  await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByText('Saved on this device',{exact:true})).toBeVisible({timeout:60000});await toolsPanel(page,true);await page.getByRole('button',{name:'Open Map',exact:true}).click();await ready(page);await toolsPanel(page,false);expect(await hash(page,'exterior')).toBe(outside);expect(await hash(page,'interior')).toBe(inside);const cp=await point(page,'east',.25,.35);await stroke(page,Array.from({length:30},(_,i)=>({x:cp.x+i,y:cp.y})),8);const continued=await hash(page,'interior');expect(continued).not.toBe(inside);await page.getByRole('button',{name:'Undo',exact:true}).click();await ready(page);expect(await hash(page,'interior')).toBe(inside);await page.getByRole('button',{name:'Redo',exact:true}).click();await ready(page);expect(await hash(page,'interior')).toBe(continued);expect(await hash(page,'exterior')).toBe(outside);expect(errors).toEqual([]);expect((await state(page)).statistics.failures).toBe(0);writeFileSync(`${output}/n${n}-${backend}.json`,JSON.stringify({n,backend,cases,outside,inside,editing,final:await state(page),errors},null,2));
  20 | });
  21 |
  22 | for(const backend of['auto','canvas'])for(const mode of['map','vertex'])test(`Hollow Tetrahedron N256 ${backend} ${mode}: each bank retains a 20-second held gesture`,async({page})=>{
  23 |  test.setTimeout(180000);mkdirSync(output,{recursive:true});if(backend==='canvas')await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type,...args){return type==='webgl2'?null:Reflect.apply(get,this,[type,...args]);} as typeof get;});await page.goto('/');await page.getByLabel('World shape',{exact:true}).selectOption('hollow-tetrahedron');await page.getByLabel('Tetrahedron numerical detail',{exact:true}).selectOption('256');await page.getByRole('button',{name:'Create World / Map',exact:true}).click();await ready(page);const banks=[];
> 24 |  for(const role of['exterior','interior'] as const){if(role==='interior')await select(page,role);if(mode==='map'){await page.getByRole('button',{name:'Surface map',exact:true}).click();await ready(page);}else await toward(page,['south','east','west']);const before=await hash(page,role),other=role==='exterior'?'interior':'exterior',unrelated=await hash(page,other),baseBefore=mode==='vertex'?await baseHash(page):undefined,points=[];if(mode==='map'){for(let i=0;i<48;i++){const angle=i/48*2*Math.PI;points.push(await point(page,'east',.25+.1*Math.cos(angle),.3+.1*Math.sin(angle)));}}else{for(const face of['south','east','west'])for(let i=0;i<=20;i++)points.push(await point(page,face,.06*(i/20),.94));}await startPaintingPixels(page);await page.mouse.move(points[0]!.x,points[0]!.y);await page.mouse.down();const started=Date.now();let events=0;while(Date.now()-started<20000){const p=points[events%points.length]!;await page.mouse.move(p.x,p.y);await page.waitForTimeout(16);events++;if(events%100===0)await expect(page.locator('.cylinder-canvas')).toHaveAttribute('data-painting','true');}await page.mouse.up();await ready(page);const timing=await finishPaintingPixels(page),after=await hash(page,role),s=await state(page),statistics=s.statistics as typeof s.statistics&{lastStroke:{workEpochs:number;distanceQueries:number};lastTermination:string};expect(statistics.failures).toBe(0);expect(statistics.lastTermination).toBe('complete');if(mode==='map'){expect(statistics.lastStroke.workEpochs).toBeGreaterThan(1);expect(statistics.lastStroke.distanceQueries).toBeGreaterThan(262144);}const baseAfter=mode==='vertex'?await baseHash(page):undefined;expect(baseAfter).toBe(baseBefore);expect(s.history.entries).toBe(1);expect(await hash(page,other)).toBe(unrelated);await page.getByRole('button',{name:'Undo',exact:true}).click();await ready(page);expect(await hash(page,role)).toBe(before);await page.getByRole('button',{name:'Redo',exact:true}).click();await ready(page);expect(await hash(page,role)).toBe(after);expect(timing.summary.p95InputToPixels).toBeLessThan(300);expect(timing.summary.p95InputToCommit).toBeLessThan(250);expect(timing.summary.p95CommitToPixels).toBeLessThan(150);banks.push({role,events,baseBefore,baseAfter,before,after,unrelated,timing,state:s});await page.screenshot({path:`${output}/held-${backend}-${mode}-${role}.png`});}
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       ^ Error: expect(received).toBe(expected) // Object.is equality
  25 |  writeFileSync(`${output}/held-${backend}-${mode}.json`,JSON.stringify({backend,mode,banks},null,2));
  26 | });
  27 |
```
