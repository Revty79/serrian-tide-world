# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation-stabilization.spec.ts >> Escape, cancel, lost capture, blur, tool changes and toolbar obstruction leave no continuing camera or stray dabs
- Location: tests\navigation-stabilization.spec.ts:201:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByRole('img', { name: 'Atlas terrain map' })
Expected: "false"
Received: "true"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" getByRole('img', { name: 'Atlas terrain map' }) with timeout 5000ms
  - waiting for getByRole('img', { name: 'Atlas terrain map' })
    14 × locator resolved to <canvas role="img" tabindex="0" width="1440" height="900" data-pan="false" data-editable="true" data-view-mode="focus" data-map-width="1180.8" class="_canvas_1afb9_14" aria-describedby="_r_4_" data-map-height="1180.8" data-edge-scrolling="true" aria-label="Atlas terrain map" data-map-left="710.1503125000004" data-map-top="-140.39999999999998" data-topology="horizontal-periodic">An elevation map showing water and land. A visual…</canvas>
       - unexpected value "true"

```

```yaml
- img "Atlas terrain map": An elevation map showing water and land. A visual browser canvas is required.
```

# Test source

```ts
  116 |     const store = new LocalMapStore(), { terrain } = await store.open((await store.list())[0]!.id);
  117 |     return inspectElevation(terrain, { x: (b.x - r.left) / r.width, y: (b.y - r.top) / r.height }).elevation.toLocaleString(undefined, { maximumFractionDigits: 1 });
  118 |   }, { b, r: centered });
  119 |   await expect(page.getByLabel('Terrain elevation', { exact: true })).toContainText(`${sample} m`);
  120 |   await page.screenshot({ path: `docs/evidence/a5-1-${info.project.name}-seam.png` });
  121 |   await roundTrip(page, single, edited);
  122 |   expect(original.words).not.toEqual(edited.words);
  123 | });
  124 | 
  125 | for (const tool of ['raise', 'lower', 'smooth', 'flatten'] as const) {
  126 |   test(`actual ${tool}: screen-edge scrolling crosses a phase rebase in one exact undoable stroke`, async ({ page }, info) => {
  127 |     test.setTimeout(60_000); await app(page);
  128 |     const initial = await view(page); await pan(page, -.48 * initial.width);
  129 |     const r = await view(page), y = r.stageHeight / 2, start = r.stageWidth - 65, edge = r.stageWidth - 2;
  130 |     if (tool === 'smooth') await page.mouse.click(start, y); // A nonuniform baseline for smoothing.
  131 |     await choose(page, tool); await save(page); const before = await stored(page);
  132 |     // Track every applied transform, including the equivalent phase jump.
  133 |     const recording = await page.evaluateHandle(() => {
  134 |       const e = document.querySelector<HTMLCanvasElement>('canvas')!, values = [Number(e.dataset.mapLeft)];
  135 |       const observer = new MutationObserver(() => { const x = Number(e.dataset.mapLeft); if (x !== values.at(-1)) values.push(x); });
  136 |       observer.observe(e, { attributes: true, attributeFilter: ['data-map-left'] });
  137 |       return { observer, values };
  138 |     });
  139 |     await page.mouse.move(start, y); await page.mouse.down(); await page.mouse.move(edge, y, { steps: 4 });
  140 |     await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'true');
  141 |     await page.waitForTimeout(3000);
  142 |     const motion = await recording.evaluate(({ observer, values }) => { observer.disconnect(); return values; }); await recording.dispose();
  143 |     const deltas = motion.slice(1).map((x, i) => x - motion[i]!);
  144 |     expect(deltas.some((dx) => dx > r.width / 2)).toBe(true);
  145 |     expect(deltas.every((dx) => dx < 0 || dx > r.width / 2)).toBe(true);
  146 |     if (tool === 'raise') await page.screenshot({ path: `docs/evidence/a5-1-${info.project.name}-edge-stroke.png` });
  147 |     // Captured movement beyond the visible edge still continues; release ends it.
  148 |     await page.mouse.move(r.stageWidth + 12, y); await page.waitForTimeout(150); await page.mouse.up();
  149 |     await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'false');
  150 |     const stopped = await view(page); await page.waitForTimeout(250); expect(await view(page)).toEqual(stopped);
  151 |     await save(page); const after = await stored(page);
  152 |     // No rebase line into unrelated latitudes, and exactly one Undo restores all bits.
  153 |     expect(after.words.slice(0, 512 * 100)).toEqual(before.words.slice(0, 512 * 100));
  154 |     expect(after.words.slice(512 * 412)).toEqual(before.words.slice(512 * 412));
  155 |     await roundTrip(page, before, after);
  156 |     if (tool === 'raise') await writeFile(`docs/evidence/a5-1-${info.project.name}-motion.json`, JSON.stringify({ viewport: page.viewportSize(), period: r.width, appliedLeft: motion, oneUndoExact: true, oneRedoExact: true, unchangedRemoteRows: true }, null, 2));
  157 |   });
  158 | }
  159 | 
  160 | test('left-edge assistance crosses the opposite phase cut and an unrelated host resize safely ends it', async ({ page }) => {
  161 |   test.setTimeout(40_000); await app(page); const initial = await view(page); await pan(page, .48 * initial.width);
  162 |   await save(page); const before = await stored(page), r = await view(page), y = r.stageHeight / 2;
  163 |   await page.mouse.move(65, y); await page.mouse.down(); await page.mouse.move(2, y);
  164 |   await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'true');
  165 |   await expect.poll(async () => (await view(page)).left).toBeLessThan(r.left - r.width / 2);
  166 |   // Embedded hosts may resize without a window resize event. Assistance may
  167 |   // preserve translations only, never adopt an unrelated layout as its own.
  168 |   await page.getByLabel('Map display area', { exact: true }).evaluate((e) => { e.style.width = 'calc(100% - 20px)'; });
  169 |   await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'false');
  170 |   await painted(page); const ended = await view(page);
  171 |   await page.mouse.move(100, y + 100); await page.mouse.up(); await page.waitForTimeout(250); expect(await view(page)).toEqual(ended);
  172 |   await save(page); await roundTrip(page, before, await stored(page));
  173 | });
  174 | 
  175 | test('bounded edge scroll moves both axes, stops at real boundaries without time-strength, can be disabled, and never starts on hover', async ({ page }) => {
  176 |   test.setTimeout(60_000); await app(page, false);
  177 |   await page.getByRole('button', { name: 'Zoom In', exact: true }).click(); await painted(page);
  178 |   const r = await view(page), x = r.stageWidth - 2, y = r.stageHeight - 8;
  179 |   await page.mouse.move(x, r.stageHeight / 2); await page.waitForTimeout(400); expect(await view(page)).toEqual(r);
  180 |   // Lower-right corner is clear of the navigation controls at bottom 54px.
  181 |   await page.mouse.move(x - 25, y - 25); await page.mouse.down(); await page.mouse.move(x, y);
  182 |   await expect.poll(async () => { const p = await view(page); return Math.abs(p.left + p.width - p.stageWidth) < .01 && Math.abs(p.top + p.height - p.stageHeight) < .01; }, { timeout: 15000 }).toBe(true);
  183 |   const boundary = await view(page); await page.waitForTimeout(400); expect(await view(page)).toEqual(boundary);
  184 |   await page.keyboard.press('Escape'); await page.mouse.up(); await save(page); const once = await stored(page);
  185 |   // A stationary held dab at the real corner must equal a click at that corner.
  186 |   const expected = await page.evaluate(async ({ x, y, r }) => {
  187 |     const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
  188 |     const { startBrushStroke } = await import(new URL('/src/terrain/brush.ts', location.origin).href) as typeof import('../src/terrain/brush.ts');
  189 |     const store = new LocalMapStore(), { terrain } = await store.open((await store.list())[0]!.id);
  190 |     startBrushStroke(terrain, { x: (x - r.left) / r.width, y: (y - r.top) / r.height }, { tool: 'raise', radius: .06, strength: 200 }).end();
  191 |     return Array.from(new Uint32Array(terrain.elevations.buffer));
  192 |   }, { x, y, r: boundary });
  193 |   await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(1000); await page.mouse.up(); await save(page);
  194 |   expect((await stored(page)).words).toEqual(expected);
  195 |   await page.getByRole('button', { name: 'Undo', exact: true }).click(); await save(page); expect(await stored(page)).toEqual(once);
  196 |   await toolsPanel(page, true); await page.getByRole('checkbox', { name: 'Scroll while drawing at screen edges' }).uncheck(); await toolsPanel(page, false);
  197 |   await pan(page, 120, 120); const fixed = await view(page);
  198 |   await page.mouse.move(x, r.stageHeight / 2); await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up(); expect(await view(page)).toEqual(fixed);
  199 | });
  200 | 
  201 | test('Escape, cancel, lost capture, blur, tool changes and toolbar obstruction leave no continuing camera or stray dabs', async ({ page }) => {
  202 |   test.setTimeout(60_000); await app(page);
  203 |   const r = await view(page), x = r.stageWidth - 2, y = r.stageHeight / 2;
  204 |   for (const reason of ['escape', 'cancel', 'capture', 'blur', 'tool', 'toolbar']) {
  205 |     await page.mouse.move(x - 30, y); await page.mouse.down(); await page.mouse.move(x, y);
  206 |     await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'true');
  207 |     if (reason === 'escape') await page.keyboard.press('Escape');
  208 |     else if (reason === 'cancel') await map(page).dispatchEvent('pointercancel', { pointerId: 1 });
  209 |     else if (reason === 'capture') await map(page).evaluate((e: HTMLCanvasElement) => e.releasePointerCapture(1));
  210 |     else if (reason === 'blur') await page.evaluate(() => dispatchEvent(new Event('blur')));
  211 |     else {
  212 |       await page.getByRole('button', { name: 'Open tools', exact: true }).focus(); await page.keyboard.press('Enter');
  213 |       if (reason === 'tool') { await page.getByRole('button', { name: 'Lower', exact: true }).focus(); await page.keyboard.press('Enter'); }
  214 |       else await page.mouse.move(100, y);
  215 |     }
> 216 |     await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'false');
      |                             ^ Error: expect(locator).toHaveAttribute(expected) failed
  217 |     const ended = await view(page);
  218 |     await page.keyboard.press('Control+s'); await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible(); const cancelled = await stored(page);
  219 |     await page.mouse.move(x - 150, y + 120); await page.mouse.up();
  220 |     await page.waitForTimeout(250); expect(await view(page)).toEqual(ended);
  221 |     await toolsPanel(page, false); await save(page); const before = await stored(page); expect(before).toEqual(cancelled);
  222 |     await page.mouse.move(x, y); await page.waitForTimeout(250); await save(page); expect(await stored(page)).toEqual(before);
  223 |     await choose(page, 'raise');
  224 |   }
  225 | });
  226 | 
  227 | test('native touch and pen navigate horizontally, touch edge strokes stay one operation, two fingers cancel assistance safely', async ({ page, context }, info) => {
  228 |   test.setTimeout(60_000); await app(page); const cdp = await context.newCDPSession(page), r = await view(page), y = r.stageHeight / 2;
  229 |   await toolsPanel(page, true); await page.getByRole('button', { name: 'Pan', exact: true }).click(); await toolsPanel(page, false);
  230 |   for (const dx of [70, -90]) {
  231 |     const before = await view(page), touch = { x: r.stageWidth / 2, y, id: 1 };
  232 |     await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
  233 |     await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touch, x: touch.x + dx }] });
  234 |     await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await painted(page);
  235 |     expect((await view(page)).left - before.left).toBeCloseTo(dx, 3);
  236 |   }
  237 |   const beforePen = await view(page), px = r.stageWidth / 2;
  238 |   await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: px, y, button: 'left', buttons: 1, pointerType: 'pen' });
  239 |   await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: px + 60, y, button: 'left', buttons: 1, pointerType: 'pen' });
  240 |   await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: px + 60, y, button: 'left', buttons: 0, pointerType: 'pen' }); await painted(page);
  241 |   expect((await view(page)).left - beforePen.left).toBeCloseTo(60, 3);
  242 |   await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  243 |   await choose(page, 'raise'); await save(page); const before = await stored(page);
  244 |   const touch = { x: r.stageWidth - 25, y, id: 1 };
  245 |   await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
  246 |   await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touch, x: r.stageWidth - 2 }] });
  247 |   await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'true'); await page.waitForTimeout(700);
  248 |   await page.screenshot({ path: `docs/evidence/a5-1-${info.project.name}-touch-edge.png` });
  249 |   await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await save(page); const after = await stored(page); await roundTrip(page, before, after);
  250 |   await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
  251 |   await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touch, x: r.stageWidth - 2 }] });
  252 |   await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'true');
  253 |   const first = { ...touch, x: r.stageWidth - 2 }, second = { x: r.stageWidth / 2, y: y + 80, id: 2 };
  254 |   await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] });
  255 |   await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'false');
  256 |   await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  257 |   const ended = await view(page); await page.waitForTimeout(250); expect(await view(page)).toEqual(ended);
  258 | });
  259 | 
```