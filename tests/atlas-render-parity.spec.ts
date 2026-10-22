import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
for(const shape of['cylinder','sphere','cube']as const)for(const n of[128,256])for(const backend of['canvas','webgl']as const)test(`shared rendering ${shape} N${n} ${backend}: equal heights, pose, zoom and backing`,async({page},info)=>{
 test.setTimeout(240000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');const results=[],out=process.env.ATLAS_PARITY_OUTPUT??'.local/atlas-render-parity';mkdirSync(out,{recursive:true});const prefix=`${out}/${info.project.name}-${shape}-${n}-${backend}`;
 for(const initial of[-100,0]){const proof=await page.evaluate(async({shape,n,initial,backend})=>{const path='/tests/fixtures/atlas-render-parity.ts',m=await import(path)as typeof import('./fixtures/atlas-render-parity.ts');return m.renderParity(shape,n,initial,backend);},{shape,n,initial,backend});results.push(proof);writeFileSync(`${prefix}.json`,JSON.stringify(results,null,2));expect(proof.sourceHash).toBe(proof.finalHash);expect.soft(proof.stableChecked).toBeGreaterThan(1000);expect.soft(proof.stableMax).toBeLessThanOrEqual(3);expect.soft(proof.envelopeViolations).toBe(0);}
 expect(errors).toEqual([]);await page.screenshot({path:`${prefix}.png`,fullPage:true});
});
