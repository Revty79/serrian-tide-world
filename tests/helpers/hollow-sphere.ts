import {expect,type Page} from '@playwright/test';
import {toolsPanel,sphericalPresentation} from '../workspace-helpers.ts';
export const sphereCanvas=(p:Page)=>p.getByRole('img',{name:'Atlas spherical terrain map',exact:true});
export const sphereHash=(p:Page,role:'exterior'|'interior')=>p.evaluate(role=>window.__hollowSphereEditor!.hash(role),role);
export async function createHollowSphere(p:Page,n=128,canvas=false){
 if(canvas)await p.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:unknown[]){return type==='webgl2'?null:Reflect.apply(get,this,[type,...args]);}as typeof get;});
 await p.goto('/');await p.getByLabel('World shape',{exact:true}).selectOption('hollow-sphere');await p.getByLabel('World/map name',{exact:true}).fill('Independent hollow planet');await p.getByLabel('Outer sphere radius (m)',{exact:true}).fill('1000000');await p.getByLabel('Inner sphere radius (m)',{exact:true}).fill('800000');await p.getByLabel('Spherical resolution',{exact:true}).selectOption(String(n));await p.getByRole('button',{name:'Create World / Map',exact:true}).click();await expect(p.locator('.hollow-sphere-editor')).toHaveAttribute('data-selected-surface','exterior',{timeout:60000});await sphericalPresentation(p);
}
export async function sphereSide(p:Page,role:'exterior'|'interior'){
 await toolsPanel(p,true);await p.getByRole('button',{name:role==='interior'?'Paint Inside':'Paint Outside',exact:true}).click();await expect(p.locator('.hollow-sphere-editor')).toHaveAttribute('data-selected-surface',role);await sphericalPresentation(p);await toolsPanel(p,false);
}
export async function sphereDraw(p:Page,tool='Raise'){
 await p.getByRole('button',{name:tool,exact:true}).click();const r=(await sphereCanvas(p).boundingBox())!;await p.mouse.move(r.x+r.width*.45,r.y+r.height*.48);await p.mouse.down();await p.mouse.move(r.x+r.width*.55,r.y+r.height*.52,{steps:12});await p.mouse.up();await expect(sphereCanvas(p)).toHaveAttribute('data-processing','false');await sphericalPresentation(p);
}

export async function createNorthSphereHole(p:Page){
 await toolsPanel(p,true);await p.getByRole('button',{name:'View pz',exact:true}).click();await p.getByLabel('Opening width (m)',{exact:true}).fill('30000');await p.getByRole('button',{name:'Cut Hole',exact:true}).click();await toolsPanel(p,false);await sphericalPresentation(p);const r=(await sphereCanvas(p).boundingBox())!;await p.mouse.click(r.x+r.width*.5,r.y+r.height*.5);await toolsPanel(p,true);await expect(p.getByRole('button',{name:'Create Hole',exact:true})).toBeVisible({timeout:30000});await p.getByRole('button',{name:'Create Hole',exact:true}).click();await expect.poll(()=>p.evaluate(()=>window.__hollowSphereEditor!.snapshot().connections.holes.length)).toBe(1);await toolsPanel(p,false);await p.getByRole('button',{name:'Reset View',exact:true}).click();await sphericalPresentation(p);
}

export async function createNorthSphereNetwork(p:Page){
 await toolsPanel(p,true);await p.getByRole('button',{name:'View pz',exact:true}).click();await p.getByLabel('Connection tools',{exact:true}).selectOption('tunnels');await p.getByLabel('Tunnel width (m)',{exact:true}).fill('20000');await p.getByRole('button',{name:'Choose tunnel entrance',exact:true}).click();await toolsPanel(p,false);await sphericalPresentation(p);const r=(await sphereCanvas(p).boundingBox())!;await p.mouse.click(r.x+r.width*.5,r.y+r.height*.5);await sphereSide(p,'interior');await toolsPanel(p,true);await p.getByRole('button',{name:'View pz',exact:true}).click();await p.getByRole('button',{name:'Choose tunnel exit',exact:true}).click();await toolsPanel(p,false);await sphericalPresentation(p);await p.mouse.click(r.x+r.width*.5+35,r.y+r.height*.5);await toolsPanel(p,true);await p.getByRole('button',{name:'Confirm tunnel change',exact:true}).click();await expect.poll(()=>p.evaluate(()=>window.__hollowSphereEditor!.snapshot().connections.passages.length)).toBe(1);await p.getByLabel('Connection tools',{exact:true}).selectOption('holes');await p.getByRole('button',{name:'View px',exact:true}).click();await sphereSide(p,'exterior');await toolsPanel(p,true);await p.getByRole('button',{name:'View px',exact:true}).click();await toolsPanel(p,false);await sphericalPresentation(p);
}
