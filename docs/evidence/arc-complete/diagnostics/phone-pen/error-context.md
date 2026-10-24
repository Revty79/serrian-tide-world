# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: arc-touch.spec.ts >> arc auto: native emulated touch/pen drawing and two-finger navigation preserve exact history
- Location: tests\arc-touch.spec.ts:2:65

# Error details

```
Error: expect(received).not.toBe(expected) // Object.is equality

Expected: not "3db94d627ba3faf8352d4c7008aa6963b69f5a3eabb0f11ad93be5b9f1e46ba9"
```

# Page snapshot

```yaml
- main "Atlas workspace" [ref=e1]:
  - region "Arc surface view" [ref=e2]:
    - img "Interactive physical arc terrain" [active] [ref=e3]
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
        - button "Physical view" [ref=e17] [cursor=pointer]
        - button "Surface map" [pressed] [ref=e18] [cursor=pointer]
        - button "Zoom out" [ref=e19] [cursor=pointer]: −
        - generic [ref=e20]: 300%
        - button "Zoom in" [ref=e21] [cursor=pointer]: +
        - button "Fit arc" [ref=e22] [cursor=pointer]
        - group [ref=e23]:
          - generic "Center region" [ref=e24] [cursor=pointer]
        - button "World overview" [ref=e25] [cursor=pointer]
        - button "Pan World" [ref=e26] [cursor=pointer]
        - button "Upper map" [ref=e27] [cursor=pointer]
        - button "Underside map" [ref=e28] [cursor=pointer]
        - button "Wall map" [ref=e29] [cursor=pointer]
        - button "Complete map" [ref=e30] [cursor=pointer]
        - button "Enter Fullscreen" [ref=e31] [cursor=pointer]: ⛶
    - status "Map work status": Unsaved changes
    - generic:
      - status "Cylinder work status": Stroke reached a projection cut, empty area, or large pointer jump; lift and recenter before continuing. Pending input discarded (1); committed prefix remains one undoable operation.
      - paragraph: Point at terrain to inspect its exact numerical footprint.
      - status "Cylinder elevation readout": Outside cylinder geography · cuts and empty areas do not paint
```

# Test source

```ts
  1 | import {test,expect} from '@playwright/test';import {createArc,arcPoint} from './helpers/arc.ts';import {mkdirSync,writeFileSync} from 'node:fs';
  2 | for(const shape of['arc'])for(const backend of['auto','canvas'])test(`${shape} ${backend}: native emulated touch/pen drawing and two-finger navigation preserve exact history`,async({page,context})=>{
  3 |  await context.addInitScript(()=>{const native=window.matchMedia.bind(window);window.matchMedia=(query:string)=>query==='(pointer: coarse)'?{...native(query),matches:true,addEventListener(){},removeEventListener(){}}as MediaQueryList:native(query);});await createArc(page,128,backend==='canvas');const idle=()=>page.waitForFunction(()=>{const d=document.querySelector<HTMLCanvasElement>('.cylinder-canvas')?.dataset;return d?.ready==='true'&&d.painting==='false'&&d.processing==='false'&&d.revision===d.displayRevision;},null,{timeout:60000});await idle();await page.getByRole('button',{name:'Upper map',exact:true}).click();await idle();
  4 |  const hash=()=>page.evaluate(async()=>{const path='/src/components/ConnectedWorkspace.tsx',m=await import(path),s=m.connectedWorkspaceInspection().snapshot() as{words:number[]};return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',Uint32Array.from(s.words).buffer)),x=>x.toString(16).padStart(2,'0')).join('');}),before=await hash(),box=(await page.locator('.cylinder-canvas').boundingBox())!,p=await arcPoint(page,[1000000,0]),x=box.x+p.x,y=box.y+p.y,cdp=await context.newCDPSession(page);
  5 |  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-12,y,id:1}]});for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-12+i*4,y:y+i,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle();const touched=await hash();expect(touched).not.toBe(before);await page.getByRole('button',{name:'Undo',exact:true}).click();await idle();expect(await hash()).toBe(before);await page.getByRole('button',{name:'Redo',exact:true}).click();await idle();expect(await hash()).toBe(touched);
> 6 |  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-30,y,id:2},{x:x+30,y,id:3}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-40,y:y+10,id:2},{x:x+45,y:y+10,id:3}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle();expect(await hash()).toBe(touched);await page.getByRole('button',{name:'Upper map',exact:true}).click();await idle();await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,pointerType:'pen'});await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+25,y:y+10,buttons:1,pointerType:'pen'});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+25,y:y+10,button:'left',buttons:0,pointerType:'pen'});await idle();const penned=await hash();expect(penned).not.toBe(touched);await page.getByRole('button',{name:'Undo',exact:true}).click();await idle();expect(await hash()).toBe(touched);const state=await page.evaluate(async()=>{const path='/src/components/ConnectedWorkspace.tsx',m=await import(path);return m.connectedWorkspaceInspection().snapshot(false) as{statistics:{failures:number;lastStroke:{acceptedPositions:number;processedPositions:number;discardedPositions:number}};renderer:{kind:string;width:number;height:number}};});expect(state.statistics.failures).toBe(0);expect(state.statistics.lastStroke.discardedPositions).toBe(0);expect(state.statistics.lastStroke.acceptedPositions).toBe(state.statistics.lastStroke.processedPositions);expect(state.renderer.kind).toBe(backend==='auto'?'webgl2':'cpu');expect(state.renderer.width*state.renderer.height).toBeLessThanOrEqual(backend==='canvas'?650000:3000000);mkdirSync('.local/arc-touch',{recursive:true});writeFileSync(`.local/arc-touch/${shape}-${backend}.json`,JSON.stringify({qualification:`${page.viewportSize()?.width}x${page.viewportSize()?.height} viewport with coarse-pointer emulation and trusted CDP touch/pen input; no physical device`,before,touched,penned,state},null,2));await page.screenshot({path:`.local/arc-touch/${shape}-${backend}.png`});
    |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               ^ Error: expect(received).not.toBe(expected) // Object.is equality
  7 | });
  8 | 
```