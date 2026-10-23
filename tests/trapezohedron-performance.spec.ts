import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {toolsPanel} from './workspace-helpers.ts';
import {startPaintingPixels,finishPaintingPixels} from './helpers/painting-pixels.ts';
const out=process.env.TRAPEZOHEDRON_PERF_OUTPUT??'.local/trapezohedron-performance';
const wait=async(page:Page)=>page.waitForFunction(()=>{const d=document.querySelector<HTMLCanvasElement>('.cylinder-canvas')?.dataset;return d?.ready==='true'&&d.painting==='false'&&d.processing==='false'&&d.revision===d.displayRevision;},null,{timeout:60000});
const snapshot=async(page:Page)=>page.evaluate(async()=>{const p='/src/components/ConnectedWorkspace.tsx',m=await import(p);return m.connectedWorkspaceInspection().snapshot(false) as any;});
const digest=async(page:Page)=>page.evaluate(async()=>{const p='/src/components/ConnectedWorkspace.tsx',m=await import(p),s=m.connectedWorkspaceInspection().snapshot() as any;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',Uint32Array.from(s.words).buffer))].map(x=>x.toString(16).padStart(2,'0')).join('');});
for(const n of[128,256])for(const backend of['auto','canvas'])for(const hollow of[false])test(`Trapezohedron stage profile N${n} ${backend} ${hollow?'hollow':'solid'}`,async({page})=>{
 test.setTimeout(240000);mkdirSync(out,{recursive:true});
 if(backend==='canvas')await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type,...args){return type==='webgl2'?null:Reflect.apply(get,this,[type,...args]);} as typeof get;});
 await page.goto('/');await page.getByLabel('World shape',{exact:true}).selectOption(hollow?'hollow-trapezohedron':'trapezohedron');await page.getByLabel('Decahedron numerical detail',{exact:true}).selectOption(String(n));await page.getByRole('button',{name:'Create World / Map',exact:true}).click();await wait(page);
 await toolsPanel(page,true);await page.getByLabel('Decahedron brush radius (m)',{exact:true}).fill('60000');await page.getByLabel('Decahedron strength (m/dab)',{exact:true}).fill('200');await toolsPanel(page,false);
 const results=[];
 for(const role of(hollow?['exterior','interior']:['exterior'])){
  if(role==='interior'){await toolsPanel(page,true);await page.getByRole('button',{name:'Paint Inside',exact:true}).click();await wait(page);await toolsPanel(page,false);}
  for(const mode of['face','edge','vertex']){
   await page.evaluate(async({mode})=>{
    const p='/src/components/ConnectedWorkspace.tsx',m=await import(p),s=m.connectedWorkspaceInspection().snapshot(false) as any,gp='/src/surfaces/trapezohedron.ts',gm=await import(gp),vp='/src/surfaces/pyramid.ts',v=await import(vp),g=gm.createTrapezohedronGeometry(s.metadata.geometry),faces=mode==='face'?['north-1:0']:mode==='edge'?['north-1:0','north-5:1']:Array.from({length:5},(_,i)=>[`north-${i+1}:0`,`north-${i+1}:1`]).flat(),forward=v.pyramidUnit(faces.reduce((sum,face)=>sum.map((x,k)=>x+g.normal({...g.identity,patchId:face,u:.2,v:.3})[k]),[0,0,0])),right=v.pyramidUnit(v.pyramidCross(Math.abs(forward[2])>.9?[0,1,0]:[0,0,1],forward)),up=v.pyramidCross(forward,right),view={...s.view,mode:'physical',frame:{forward,right,up},target:[0,0,0],pan:{x:0,y:0},zoom:1};
    window.__trapezohedronEditor!.setView(view);
    return{edge:g.metadata.radiusMeters,faces};
   },{mode});await wait(page);
   const positions=await page.evaluate(async({mode})=>{
    const p='/src/surfaces/trapezohedron.ts',gm=await import(p),sp='/src/components/ConnectedWorkspace.tsx',sm=await import(sp),s=sm.connectedWorkspaceInspection().snapshot(false) as any,g=gm.createTrapezohedronGeometry(s.metadata.geometry),path='/src/surfaces/polyhedron-path.ts',pm=await import(path),points=[];
    const toUV=(face:string,x:number,y:number)=>{const f=g.frame(face),a=Math.hypot(...f.u),b=f.v.reduce((v:number,t:number,k:number)=>v+t*f.e1[k],0),c=f.v.reduce((v:number,t:number,k:number)=>v+t*f.e2[k],0),v=y/c,u=(x-b*v)/a;return{...g.identity,patchId:face,u:Math.max(0,u),v:Math.max(0,v)};};
    const first='north-1:0',other='north-5:1',route=pm.polyhedronUnfoldings(g,first,other,[first,other])[0],f=g.frame(first),ids=g.vertexIds(first),a=f.chartVertices[ids.indexOf(0)],b=f.chartVertices[ids.indexOf(2)],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],alpha=Math.acos(f.u.reduce((s:number,x:number,k:number)=>s+x*f.v[k],0)/(Math.hypot(...f.u)*Math.hypot(...f.v))),cone=10*alpha;
    for(let i=0;i<=72;i++){
     let point;const angle=i/72*2*Math.PI,radius=240000/(2*Math.PI);
     if(mode==='face'){const center=g.chartPoint({...g.identity,patchId:first,u:.28,v:.32});point=toUV(first,center[0]+radius*Math.cos(angle),center[1]+radius*Math.sin(angle));}
     else if(mode==='edge'){const x=mid[0]!+radius*Math.cos(angle),y=mid[1]!+radius*Math.sin(angle),candidate=toUV(first,x,y);if(candidate.u+candidate.v<=1&&candidate.u>=0&&candidate.v>=0&&y>=0)point=candidate;else{const t=route.placements[1],dx=x-t.x,dy=y-t.y,den=t.a*t.a+t.b*t.b;point=toUV(other,(t.a*dx+t.b*dy)/den,(-t.b*dx+t.a*dy)/den);}}
     else{const sector=Math.min(9,Math.floor((i%72)/72*10)),theta=(i%72)/72*cone-sector*alpha,face=`north-${Math.floor(sector/2)+1}:${sector%2}`,r=240000/cone;point=toUV(face,r*Math.cos(theta),r*Math.sin(theta));}
     points.push({position:point,screen:sm.connectedWorkspaceInspection().project(point),physical:g.referencePosition(point)});
    }
    return points;
   },{mode});
   const box=(await page.locator('.cylinder-canvas').boundingBox())!,points=positions.map(p=>{expect(p.screen).toBeTruthy();return{x:box.x+p.screen!.x,y:box.y+p.screen!.y};});
   for(const sustained of[false,true]){
    const before=await digest(page);await startPaintingPixels(page);await page.mouse.move(points[0]!.x,points[0]!.y);await page.mouse.down();
    const started=performance.now();let events=0;
    do{const p=points[events%72]!;await page.mouse.move(p.x,p.y);await page.waitForTimeout(16);events++;}while(sustained?performance.now()-started<4000:events<=72);
    await page.mouse.up();await wait(page);const timing=await finishPaintingPixels(page),after=await digest(page),s=await snapshot(page),hostStages=await page.evaluate(async()=>{const p='/src/editor/painting-metrics.ts';return(await import(p)).paintingMetrics();});
    const record={role,mode,sustained,events,timing,hostStages,state:s,before,after,positions};results.push(record);writeFileSync(`${out}/n${n}-${backend}-${hollow?'hollow':'solid'}.json`,JSON.stringify({n,backend,hollow,results},null,2));
    expect(s.renderer.kind).toBe(backend==='auto'?'webgl2':'cpu');expect(s.statistics.failures).toBe(0);expect(s.statistics.lastTermination).toBe('complete');expect(s.statistics.lastStroke.discardedPositions).toBe(0);expect(s.workDiagnostics.backend).toBe('worker');expect(s.renderer.width*s.renderer.height).toBeGreaterThanOrEqual(1300000);if(backend==='auto')expect(s.renderer.software).toBe(false);expect(timing.summary.p95InputToPixels).toBeLessThan(sustained?100:125);
    expect(after).not.toBe(before);await page.getByRole('button',{name:'Undo',exact:true}).click();await wait(page);expect(await digest(page)).toBe(before);await page.getByRole('button',{name:'Redo',exact:true}).click();await wait(page);expect(await digest(page)).toBe(after);
    await page.screenshot({path:`${out}/n${n}-${backend}-${role}-${mode}-${sustained?'held':'ordinary'}.png`});
    await page.getByRole('button',{name:'Undo',exact:true}).click();await wait(page);expect(await digest(page)).toBe(before);
   }
  }
 }
});
