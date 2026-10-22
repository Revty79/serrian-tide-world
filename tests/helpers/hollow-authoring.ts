import {expect,type Page} from '@playwright/test';
const button=(p:Page,name:string)=>p.getByRole('button',{name,exact:true});
/** Exercise the ordinary creator controls, including review before publication. */
export async function createStraightTunnel(page:Page,width=30000){
 await button(page,'Open tools').click();await page.getByLabel('Opening width (m)',{exact:true}).fill(String(width));await button(page,'Create Tunnel').click();await button(page,'Close tools').click();
 await button(page,'View +Z face').click();let point=await page.evaluate(()=>window.__cubeEditor!.project('pz',0,0));await page.mouse.click(point.x,point.y);
 await button(page,'Open tools').click();await button(page,'Paint Inside').click();await button(page,'Close tools').click();await button(page,'View +Z face').click();point=await page.evaluate(()=>window.__cubeEditor!.project('pz',0,0));await page.mouse.click(point.x,point.y);
 await button(page,'Open tools').click();await expect(button(page,'Create proposed tunnel')).toBeVisible({timeout:30000});expect(await page.evaluate(()=>window.__hollowEditor!.snapshot().connections.passages.length)).toBe(0);
 await button(page,'Create proposed tunnel').click();await expect.poll(()=>page.evaluate(()=>window.__hollowEditor!.snapshot().connections.passages.length)).toBe(1);await button(page,'View Outside opening 1').click();await button(page,'Close tools').click();
}
