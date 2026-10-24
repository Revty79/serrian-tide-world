# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: crescent-joins.spec.ts >> Crescent N256 canvas: native continuous cap/wall joins and physical void picking
- Location: tests\crescent-joins.spec.ts:3:39

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 125
Received:   129.20000004768372
```

# Page snapshot

```yaml
- main "Atlas workspace" [ref=e1]:
  - region "Crescent surface view" [ref=e2]:
    - img "Interactive physical crescent terrain" [active] [ref=e3]
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
        - button "Physical view" [pressed] [ref=e17] [cursor=pointer]
        - button "Surface map" [ref=e18] [cursor=pointer]
        - button "Zoom out" [ref=e19] [cursor=pointer]: −
        - generic [ref=e20]: 300%
        - button "Zoom in" [ref=e21] [cursor=pointer]: +
        - button "Fit crescent" [ref=e22] [cursor=pointer]
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
      - status "Cylinder work status": Stroke complete. Undo restores the entire gesture.
      - paragraph: 343 canonical samples would change (343 within the intrinsic footprint).
      - status "Cylinder elevation readout": Concave interior · 224.45 m
```

# Test source

```ts
  1 | ﻿import{test,expect}from'@playwright/test';import{mkdirSync,writeFileSync}from'node:fs';
  2 | import{createCrescent,crescentIdle,crescentHash,crescentSnapshot,crescentRegionHash}from'./helpers/crescent.ts';import{startPaintingPixels,finishPaintingPixels}from'./helpers/painting-pixels.ts';
  3 | for(const backend of['auto','canvas'])test(`Crescent N256 ${backend}: native continuous cap/wall joins and physical void picking`,async({page})=>{test.setTimeout(180000);await createCrescent(page,256,backend==='canvas');const results=[];
  4 |  for(const edge of[16,48]){
  5 |   const points=await page.evaluate(async edge=>{const paths=['/src/components/ConnectedWorkspace.tsx','/src/surfaces/crescent.ts','/src/surfaces/crescent-distance.ts','/src/surfaces/pyramid.ts'],[i,s,d,m]=await Promise.all(paths.map(p=>import(p))),g=s.createCrescentGeometry((window.__crescentEditor!.snapshot()as any).configuration),wall=d.crescentWallPosition(g,edge,.5,g.metadata.thicknessMeters/2),normal=g.normal(wall),position=g.referencePosition(wall),forward=m.pyramidUnit([normal[0],1,normal[2]]),right=m.pyramidUnit(m.pyramidCross([0,1,0],forward)),view={...window.__crescentEditor!.view()!,mode:'physical' as const,zoom:3,target:position.map((x:number)=>x/g.scaleMeters)as[number,number,number],frame:{forward,right,up:m.pyramidCross(forward,right)}};window.__crescentEditor!.setView(view);void i;return Array.from({length:81},(_,k)=>{const q=k<=40?d.crescentCapPosition(g,[position[0]-normal[0]*40000*(1-k/40),position[2]-normal[2]*40000*(1-k/40)],1):d.crescentWallPosition(g,edge,.5,g.metadata.thicknessMeters/2-40000*(k-40)/40);return q;});},edge);
> 6 |   await crescentIdle(page);const projected=await page.evaluate(async points=>{const path='/src/components/ConnectedWorkspace.tsx',inspector=(await import(path)).connectedWorkspaceInspection();return points.map((p:any)=>inspector.project(p));},points);await page.getByRole('button',{name:'Raise',exact:true}).click();const before=await crescentHash(page),upper=await crescentRegionHash(page,'upper'),wall=await crescentRegionHash(page,edge===16?'outer':'inner'),lower=await crescentRegionHash(page,'lower'),box=(await page.locator('.cylinder-canvas').boundingBox())!;await page.mouse.move(box.x+projected[0]!.x,box.y+projected[0]!.y);await startPaintingPixels(page);await page.mouse.down();for(const p of projected.slice(1)){await page.mouse.move(box.x+p!.x,box.y+p!.y);await page.waitForTimeout(16);}await page.mouse.up();await crescentIdle(page);const timing=await finishPaintingPixels(page),after=await crescentHash(page),state=await crescentSnapshot(page);expect(after).not.toBe(before);expect(await crescentRegionHash(page,'upper')).not.toBe(upper);expect(await crescentRegionHash(page,edge===16?'outer':'inner')).not.toBe(wall);expect(await crescentRegionHash(page,'lower')).toBe(lower);expect(state.statistics.failures,state.message).toBe(0);expect(state.statistics.lastStroke.discardedPositions).toBe(0);expect(state.statistics.lastStroke.acceptedPositions).toBe(state.statistics.lastStroke.processedPositions);expect(timing.summary.p95InputToPixels).toBeLessThan(125);await page.getByRole('button',{name:'Undo',exact:true}).click();await crescentIdle(page);expect(await crescentHash(page)).toBe(before);await page.getByRole('button',{name:'Redo',exact:true}).click();await crescentIdle(page);expect(await crescentHash(page)).toBe(after);results.push({edge,timing,state,before,after});
    |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   ^ Error: expect(received).toBeLessThan(expected)
  7 |  }
  8 |  await page.getByRole('button',{name:'World overview',exact:true}).click();await page.evaluate(async()=>{const p='/src/rendering/crescent-view.ts',m=await import(p);window.__crescentEditor!.setView({...m.initialCrescentView(),frame:{right:[1,0,0],up:[0,0,-1],forward:[0,1,0]}});});await crescentIdle(page);await page.getByRole('button',{name:'Raise',exact:true}).click();const before=await crescentHash(page),box=(await page.locator('.cylinder-canvas').boundingBox())!;await page.mouse.click(box.x+box.width/2,box.y+box.height/2);await crescentIdle(page);expect(await crescentHash(page)).toBe(before);mkdirSync('.local/crescent-joins',{recursive:true});writeFileSync(`.local/crescent-joins/${backend}.json`,JSON.stringify({results,voidUnchanged:true},null,2));await page.screenshot({path:`.local/crescent-joins/${backend}.png`});});
  9 | 
```