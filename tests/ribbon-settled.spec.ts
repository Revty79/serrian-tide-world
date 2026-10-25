import {test,expect} from '@playwright/test';import {mkdirSync,writeFileSync} from 'node:fs';
import {createRibbon,ribbonSettled,ribbonSnapshot} from './helpers/ribbon.ts';
test('Ribbon N128 Canvas: overview, broad map and complete atlas finish bounded sharp refinement',async({page})=>{
 test.setTimeout(240000);await createRibbon(page,128,true);mkdirSync('.local/ribbon-settled',{recursive:true});
 for(const name of['World overview','First face map','Complete map']){await page.getByRole('button',{name,exact:true}).click();try{await ribbonSettled(page);}finally{writeFileSync(`.local/ribbon-settled/${name}.json`,JSON.stringify(await ribbonSnapshot(page),null,2));await page.screenshot({path:`.local/ribbon-settled/${name}.png`});}const state=await ribbonSnapshot(page);expect(state.renderer.boundaryPixels).toBeLessThanOrEqual(131072);expect(state.renderer.boundaryReady).toBe(true);}
});
