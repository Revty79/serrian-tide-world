import {expect,test,type Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import type {CylinderRegion} from '../src/surfaces/cylinder.ts';
type Observer=typeof import('./fixtures/cylinder-observer.ts');
test.use({trace:'on'});
const snapshot=(p:Page,words=true)=>p.evaluate(async words=>(await import(new URL('/tests/fixtures/cylinder-observer.ts',location.origin).href) as Observer).snapshot(words),words);
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
const point=(p:Page,q:{patchId:CylinderRegion;u:number;v:number})=>p.evaluate(async q=>(await import(new URL('/tests/fixtures/cylinder-observer.ts',location.origin).href) as Observer).project(q),q);
async function idle(p:Page){await expect.poll(async()=>{try{const s=await snapshot(p,false);return s.ready&&!s.painting&&s.revision===s.displayRevision;}catch{return false;}},{timeout:60000}).toBe(true);}
for(const end of [false,true])test(`cylinder ${end?'end':'start'} rim: all four tools continue in both directions with exact words`,async({page},info)=>{
 test.setTimeout(180000);await page.goto('/dev/cylinder.html');await idle(page);await button(page,'☰ Cylinder tools').click();await page.getByLabel('Cylinder strength (m/dab)',{exact:true}).fill('1200');await button(page,'× Close tools').click();await button(page,'Surface map').click();await idle(page);
 const z=end?1600000:0,cap=end?'cap-end' as const:'cap-start' as const,sideZ=end?1540000:60000,proofs=[];
 const forward=[...Array.from({length:6},(_,i)=>({patchId:'side' as const,u:0,v:sideZ+(z-sideZ)*i/5})),...Array.from({length:5},(_,i)=>({patchId:cap,u:0,v:1000000-12000*(i+1)}))];
 const seed=(await point(page,{patchId:cap,u:0,v:970000}))!;await page.mouse.click(seed.x,seed.y);await idle(page);
 for(const tool of ['Raise','Lower','Smooth','Flatten']){
  await button(page,tool).click();if(tool==='Smooth'||tool==='Flatten'){await button(page,'☰ Cylinder tools').click();await page.getByLabel('Cylinder intensity (%)',{exact:true}).fill('65');if(tool==='Flatten')await page.getByLabel('Cylinder target elevation (m)',{exact:true}).fill('-250');await button(page,'× Close tools').click();}
  for(const reverse of [false,true]){
   const before=await snapshot(page);await page.evaluate(async()=>(await import(new URL('/tests/fixtures/cylinder-observer.ts',location.origin).href) as Observer).observe());
   const positions=reverse?[...forward].reverse():forward,screens=[];for(const p of positions){const q=await point(page,p);expect(q).toBeDefined();screens.push(q!);}
   await page.mouse.move(screens[0]!.x,screens[0]!.y);await page.mouse.down();for(const q of screens.slice(1))await page.mouse.move(q.x,q.y);
   if(tool==='Raise'&&!reverse){await expect.poll(async()=>{const s=await snapshot(page,false) as Awaited<ReturnType<Observer['snapshot']>>&{lastDab?:{center:{patchId:string;v:number}}};return s.lastDab?.center.patchId===cap&&(s.lastDab?.center.v??Infinity)<970000;},{timeout:30000}).toBe(true);await page.screenshot({path:`docs/evidence/a7-c-${info.project.name}-${end?'end':'start'}-rim-held.png`});}
   await page.mouse.up();await idle(page);const proof=await page.evaluate(async()=>(await import(new URL('/tests/fixtures/cylinder-observer.ts',location.origin).href) as Observer).compare()),after=await snapshot(page),r=after.metadata.representation.resolution,sideCount=r.angularSamples*(r.axialCells+1),capCount=1+r.angularSamples*(r.radialCells-1);
   expect(proof.mismatches).toBe(0);expect(proof.changed).toBeGreaterThan(0);expect(proof.rims).toBeGreaterThan(0);expect(proof.referenceDabs).toBeGreaterThan(1);expect(after.history.entries).toBe(before.history.entries+1);
   expect(proof.changes.some(c=>c.index<sideCount)).toBe(true);expect(proof.changes.some(c=>end?c.index>=sideCount+capCount:c.index>=sideCount&&c.index<sideCount+capCount)).toBe(true);
   await button(page,'Undo').click();await idle(page);expect((await snapshot(page)).words).toEqual(before.words);await button(page,'Redo').click();await idle(page);expect((await snapshot(page)).words).toEqual(after.words);
   proofs.push({tool,direction:reverse?'cap-to-side':'side-to-cap',exactUndo:true,exactRedo:true,...proof});
  }
 }
 await writeFile(`docs/evidence/a7-c-${info.project.name}-${end?'end':'start'}-rim-proof.json`,JSON.stringify({end,proofs,final:await snapshot(page,false)},null,2));
});
