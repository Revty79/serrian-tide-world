import { expect, test, type Page } from '@playwright/test';
import { toolsPanel, startAtlas, createWorld } from './workspace-helpers.ts';

const map = (page: Page) => page.getByRole('img', { name: 'Atlas terrain map' });
async function view(page: Page) {
  return map(page).evaluate((canvas) => {
    const e = canvas as HTMLCanvasElement, stage = e.closest('[aria-label="Map display area"]')!.getBoundingClientRect();
    return { x: stage.x, y: stage.y, stageWidth: stage.width, stageHeight: stage.height, left: Number(e.dataset.mapLeft), top: Number(e.dataset.mapTop), width: Number(e.dataset.mapWidth), height: Number(e.dataset.mapHeight), mode: e.dataset.viewMode };
  });
}
async function ready(page: Page) { await expect.poll(async () => (await view(page)).width).toBeGreaterThan(0); }
async function painted(page: Page) { await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function fixture(page: Page) { await page.goto('/tests/fixtures/terrain.html?wrapped=1'); await ready(page); }
async function words(page: Page) { return page.evaluate(async () => Array.from(new Uint32Array((await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src)).terrain.elevations.buffer))); }
async function setBrush(page: Page, tool: 'raise' | 'lower' | 'smooth' | 'flatten', radius = .1) {
  await page.evaluate(async ({ tool, radius }) => {
    const f = await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src);
    f.setBrush(tool === 'raise' || tool === 'lower' ? { tool, radius, strength: 300 } : tool === 'smooth' ? { tool, radius, intensity: .7 } : { tool, radius, intensity: .7, targetElevation: 600 });
  }, { tool, radius });
}
async function pan(page: Page, dx: number, dy = 0) {
  const r = await view(page), x = r.x + r.stageWidth / 2, y = r.y + r.stageHeight / 2;
  await map(page).focus(); await page.keyboard.down('Space'); await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 4 }); await page.mouse.up(); await page.keyboard.up('Space');
  await painted(page);
}
async function save(page: Page) { await page.getByRole('button', { name: 'Save', exact: true }).click(); await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible(); }
async function saved(page: Page, id?: string) {
  return page.evaluate(async (selectedId) => {
    const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
    const { encodeMap } = await import(new URL('/src/persistence/map-format.ts', location.origin).href) as typeof import('../src/persistence/map-format.ts');
    const store = new LocalMapStore(), catalog = await store.list(), loaded = await store.open(selectedId ?? catalog[0]!.id), record = await encodeMap(loaded.terrain, loaded.name);
    return { id: record.id, name: record.name, metadata: JSON.stringify(record.metadata), version: record.formatVersion, count: loaded.terrain.elevations.length,
      digest: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', record.elevations)), (v) => v.toString(16).padStart(2, '0')).join(''),
      first: loaded.terrain.elevations[0], last: loaded.terrain.elevations.at(-1) };
  }, id);
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => { const messages: string[] = []; errors.set(page, messages); page.on('pageerror', (e) => messages.push(e.message)); page.on('console', (e) => { if (e.type() === 'error') messages.push(e.text()); }); });
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

test('bounded default Fill covers wide, ultrawide, square and tall views; pan reaches cropped portions and Fit preserves margins', async ({ page }, info) => {
  await startAtlas(page); await ready(page);
  for (const size of [{ width: 1440, height: 900 }, { width: 3440, height: 1440 }, { width: 900, height: 900 }, { width: 412, height: 839 }]) {
    await page.setViewportSize(size);
    await expect.poll(async () => { const r = await view(page); return r.mode === 'fill' && Math.abs(r.width - Math.max(size.width, size.height)) < .01 && r.left <= .01 && r.top <= .01; }).toBe(true);
    const r = await view(page); expect(r.width / r.height).toBeCloseTo(1, 6); expect(r.left).toBeLessThanOrEqual(.01); expect(r.top).toBeLessThanOrEqual(.01);
    await pan(page, 0, size.height * .7);
    await pan(page, size.width * .7, -size.height * .7);
    const moved = await view(page); expect(moved.left + moved.width).toBeGreaterThanOrEqual(size.width - .01); expect(moved.top + moved.height).toBeGreaterThanOrEqual(size.height - .01);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click();
    await expect.poll(async () => { const f = await view(page); return f.width <= size.width + .1 && f.height <= size.height + .1; }).toBe(true);
    const f = await view(page);
    if (f.width < size.width - 2) await page.mouse.click(5, size.height / 2);
    else if (f.height < size.height - 2) await page.mouse.click(size.width / 2, 120);
    await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Fill View', exact: true }).click();
  }
  await page.setViewportSize(info.project.name === 'mobile' ? { width: 412, height: 839 } : { width: 1440, height: 900 });
  await painted(page);
  await ready(page); const r = await view(page); await page.mouse.click(r.stageWidth / 2, r.stageHeight / 2);
  await page.screenshot({ path: `docs/evidence/a5-${info.project.name}-bounded-fill.png` });
});

test('actual wrapped editor crosses a seam, recenters the same land, uses all tools, saves and reopens v2 alongside v1', async ({ page, context }, info) => {
  test.setTimeout(60_000);
  await startAtlas(page); await save(page); const legacy = await saved(page);
  await toolsPanel(page, true); await createWorld(page, 'wrapped');
  await expect(map(page)).toHaveAttribute('data-topology', 'horizontal-periodic');
  await toolsPanel(page, true);
  await page.getByRole('textbox', { name: 'Map name', exact: true }).fill('Serrian wrapped coast');
  await page.getByRole('slider', { name: /Radius/ }).press('End');
  await page.getByRole('slider', { name: /Strength/ }).press('End'); await toolsPanel(page, false);
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click();
  await expect(map(page)).toHaveAttribute('data-view-mode', 'fit');
  const initial = await view(page), seamX = initial.x + initial.left, centerY = initial.y + initial.top + initial.height * .5;
  await page.mouse.click(Math.max(2, seamX + initial.width * .01), centerY); await save(page);
  const original = await saved(page); expect(original.version).toBe(2); expect(original.count).toBe(512 * 512);
  expect(await saved(page, legacy.id)).toEqual(legacy);
  await page.mouse.move(Math.max(2, seamX + initial.width * .01), centerY);
  const previews = page.locator('[aria-hidden="true"] > div'); expect(await previews.count()).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: `docs/evidence/a5-${info.project.name}-seam.png` });
  await pan(page, initial.stageWidth / 2 - initial.left);
  await save(page); expect(await saved(page)).toEqual(original);
  const centered = await view(page), cx = centered.stageWidth / 2, cy = centered.stageHeight / 2;
  await page.mouse.move(cx, cy); await expect(page.getByLabel('Terrain elevation', { exact: true })).toContainText('m');
  await page.screenshot({ path: `docs/evidence/a5-${info.project.name}-recentered.png` });
  // One captured drag crosses the physical seam, now in the viewport center.
  await page.mouse.move(cx - centered.width * .08, cy); await page.mouse.down(); await page.mouse.move(cx + centered.width * .08, cy, { steps: 12 }); await page.mouse.up();
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await save(page); expect(await saved(page)).toEqual(original);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  for (const tool of ['Lower', 'Smooth', 'Flatten']) {
    await toolsPanel(page, true); await page.getByRole('button', { name: tool, exact: true }).click();
    if (tool === 'Flatten') await page.getByRole('spinbutton', { name: 'Target elevation (m)' }).fill('650');
    await toolsPanel(page, false); await page.mouse.click(cx, cy);
  }
  await page.getByRole('button', { name: 'Fill View', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom In', exact: true }).click();
  await save(page); const edited = await saved(page); expect(edited.digest).not.toBe(original.digest); expect(edited.metadata).toBe(original.metadata);
  await page.screenshot({ path: `docs/evidence/a5-${info.project.name}-zoomed-rendering.png` });
  const reopened = await context.newPage(); const reopenedErrors: string[] = []; reopened.on('pageerror', (e) => reopenedErrors.push(e.message));
  await page.close(); await startAtlas(reopened); await toolsPanel(reopened, true);
  await reopened.getByRole('combobox', { name: 'Saved maps', exact: true }).selectOption(edited.id); await reopened.getByRole('button', { name: 'Open Map', exact: true }).click();
  await expect(map(reopened)).toHaveAttribute('data-topology', 'horizontal-periodic'); await save(reopened); expect(await saved(reopened)).toEqual(edited);
  await expect(reopened.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await toolsPanel(reopened, false); const next = await view(reopened); await reopened.mouse.click(next.stageWidth / 2, next.stageHeight / 2); await save(reopened);
  expect((await saved(reopened)).digest).not.toBe(edited.digest); expect(await saved(reopened, legacy.id)).toEqual(legacy);
  expect(reopenedErrors).toEqual([]); await reopened.close();
});

for (const tool of ['raise', 'lower', 'smooth', 'flatten'] as const) {
  test(`real ${tool} pointer strokes cross the seam and remain one exact undoable operation`, async ({ page }) => {
    await fixture(page); await setBrush(page, tool);
    await page.evaluate(async () => { const f = await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src); f.terrain.elevations.forEach((_: number, i: number, a: Float32Array) => { a[i] = i % 2 ? 500 : -100; }); f.refresh(); });
    // Recenter the seam in the stage. A large horizontal displacement is legal.
    const r = await view(page); await pan(page, r.width / 2); await ready(page);
    const before = await words(page), current = await view(page), x = current.x + current.stageWidth / 2, y = current.y + current.stageHeight / 2;
    await page.mouse.move(x - 40, y); await page.mouse.down(); await page.mouse.move(x + 40, y, { steps: 10 }); await page.mouse.up();
    const after = await words(page); expect(after).not.toEqual(before);
    const history = await page.evaluate(async () => { const f = await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src); const count = f.history.length; f.history.undo(); f.refresh(); return count; });
    expect(history).toBe(1); expect(await words(page)).toEqual(before);
    await page.evaluate(async () => { const f = await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src); f.history.redo(); f.refresh(); });
    expect(await words(page)).toEqual(after);
  });
}

test('multiple visible copies share one dab and preview, unlimited pans/zoom change no elevations, native pen and touch cross seams', async ({ page, context }) => {
  test.setTimeout(60_000); await fixture(page); await page.setViewportSize({ width: 2560, height: 900 });
  await expect.poll(async () => { const r = await view(page); return r.stageWidth === 2520 && Math.abs(r.left - (r.stageWidth - r.width) / 2) < .1; }).toBe(true);
  await setBrush(page, 'raise', .8); const r = await view(page), y = r.y + r.top + r.height / 2, x = r.x + r.left;
  await page.mouse.click(x, y);
  const peak = await page.evaluate(async () => { const f = await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src); return f.terrain.elevations[256 * 512]; });
  expect(peak).toBeLessThanOrEqual(200); expect(peak).toBeGreaterThan(199); // -100 + one 300 m dab, not one per visible copy.
  const before = await words(page);
  for (let i = 0; i < 8; i++) await pan(page, i % 2 ? -1700 : 2100);
  await page.evaluate(async () => (await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src)).camera.zoom(2));
  expect(await words(page)).toEqual(before);
  await setBrush(page, 'raise', .06);
  await page.evaluate(async () => { const f = await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src); f.camera.fit(); });
  await page.evaluate(async () => (await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src)).camera.zoom(2));
  await painted(page);
  await pan(page, (await view(page)).width / 2);
  const rect = await view(page), cx = rect.stageWidth / 2, cy = rect.y + rect.stageHeight / 2;
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx - 30, y: cy, button: 'left', buttons: 1, pointerType: 'pen', force: .5 });
  await session.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx + 30, y: cy, button: 'left', buttons: 1, pointerType: 'pen', force: .5 });
  await session.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx + 30, y: cy, button: 'left', buttons: 0, pointerType: 'pen' });
  const pen = await words(page); expect(pen).not.toEqual(before);
  const touch = { x: cx - 30, y: cy + 50, id: 1 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touch, x: cx + 30 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await words(page)).not.toEqual(pen);
});

test('same IndexedDB schema preserves v1 records, rejects replacement across formats and rejects corrupt v2 safely', async ({ page }) => {
  await startAtlas(page);
  const result = await page.evaluate(async () => {
    const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
    const { createBlankTerrain } = await import(new URL('/src/terrain/model.ts', location.origin).href) as typeof import('../src/terrain/model.ts');
    const { createWrappedTerrain } = await import(new URL('/src/terrain/topology.ts', location.origin).href) as typeof import('../src/terrain/topology.ts');
    const { encodeMap } = await import(new URL('/src/persistence/map-format.ts', location.origin).href) as typeof import('../src/persistence/map-format.ts');
    const store = new LocalMapStore(); const bounded = await encodeMap(createBlankTerrain({ id: 'retained-v1' }), 'Retained bounded map'); await store.save(bounded);
    const wrapped = await encodeMap(createWrappedTerrain({ id: 'retained-v1', identity: { worldId: 'w', surfaceId: 's', patchId: 'p' } }), 'Invalid replacement');
    let rejected = false; try { await store.save(wrapped); } catch { rejected = true; }
    const retained = await store.open('retained-v1');
    const valid = await encodeMap(createWrappedTerrain({ id: 'corrupt-v2', identity: { worldId: 'w2', surfaceId: 's2', patchId: 'p2' } }), 'Corrupt wrapped test'); await store.save(valid);
    await new Promise<void>((resolve, reject) => { const open = indexedDB.open('serrian-tide-atlas', 1); open.onsuccess = () => { const db = open.result, tx = db.transaction('heightmaps', 'readwrite'); new DataView(valid.elevations).setFloat32(0, 777, true); tx.objectStore('heightmaps').put(valid); tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error); }; });
    return { rejected, version: retained.terrain.metadata.dataVersion };
  });
  expect(result).toEqual({ rejected: true, version: 1 });
  await page.reload(); await toolsPanel(page, true); await createWorld(page, 'wrapped'); await toolsPanel(page, false);
  const r = await view(page); await page.mouse.click(r.stageWidth / 2, r.stageHeight / 2);
  await toolsPanel(page, true); await page.getByRole('combobox', { name: 'Saved maps', exact: true }).selectOption('corrupt-v2'); await page.getByRole('button', { name: 'Open Map', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('checksum'); await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible(); await expect(map(page)).toHaveAttribute('data-topology', 'horizontal-periodic');
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click(); await page.getByRole('button', { name: 'Undo', exact: true }).click(); await expect(page.getByText('Not saved yet', { exact: true })).toBeVisible();
});

test('optional native fullscreen enters/exits on user actions without changing history; failures are safe', async ({ page }) => {
  await startAtlas(page); await ready(page); const r = await view(page); await page.mouse.click(r.stageWidth / 2, r.stageHeight / 2);
  const enter = page.getByRole('button', { name: 'Enter Fullscreen', exact: true });
  await expect(enter).toBeVisible(); await enter.click(); await expect(page.getByRole('button', { name: 'Exit Fullscreen', exact: true })).toBeVisible();
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.getByRole('button', { name: 'Exit Fullscreen', exact: true }).click(); await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await page.evaluate(() => { HTMLElement.prototype.requestFullscreen = () => Promise.reject(new Error('Denied in test')); });
  await page.getByRole('button', { name: 'Enter Fullscreen', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('terrain is preserved');
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click(); await page.getByRole('button', { name: 'Undo', exact: true }).click(); await expect(page.getByText('Not saved yet', { exact: true })).toBeVisible();
});

test('wrapped zoomed readouts/previews stay aligned; cancellation and tool changes end partial strokes', async ({ page }) => {
  await fixture(page);
  await page.evaluate(async () => { const f = await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src); f.terrain.elevations[320 * 512 + 256] = 731.25; f.refresh(); f.camera.zoom(2); });
  await expect.poll(async () => (await view(page)).width).toBeGreaterThan((await view(page)).stageWidth);
  const r = await view(page), x = r.x + r.left + .5 * r.width, y = r.y + r.top + 320 / 511 * r.height;
  await page.mouse.move(x, y); await expect(page.getByLabel('Terrain elevation', { exact: true })).toContainText('731.3 m');
  const ring = page.locator('[aria-hidden="true"] > div').filter({ visible: true }).first();
  const box = (await ring.boundingBox())!; expect(box.width).toBeCloseTo(.12 * r.width, 0); expect(box.height).toBeCloseTo(box.width, 1);
  const before = await words(page);
  await page.mouse.down(); await page.mouse.move(x + 25, y); await map(page).dispatchEvent('pointercancel', { pointerId: 1, isPrimary: true });
  const cancelled = await words(page); await page.mouse.move(x + 80, y); await page.mouse.up(); expect(await words(page)).toEqual(cancelled);
  await page.evaluate(async () => { const f = await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src); f.history.undo(); f.refresh(); }); expect(await words(page)).toEqual(before);
  await page.mouse.move(x, y); await page.mouse.down(); await setBrush(page, 'lower');
  const switched = await words(page); await page.mouse.move(x + 80, y); await page.mouse.up(); expect(await words(page)).toEqual(switched);
});

test('wrapped navigation covers ultrawide and mobile displays without sidebars, duplicate storage or redraws of the cached height field', async ({ page, context }, info) => {
  test.setTimeout(60_000); await fixture(page);
  await page.evaluate(async () => (await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src)).camera.fill());
  for (const size of [{ width: 2560, height: 900 }, { width: 900, height: 900 }, { width: 412, height: 839 }]) {
    await page.setViewportSize(size);
    await expect.poll(async () => { const r = await view(page); return Math.abs(r.height - (r.stageHeight)) < .1; }).toBe(true);
    const alpha = await map(page).evaluate((element) => {
      const c = element as HTMLCanvasElement, ctx = c.getContext('2d')!;
      return [0, Math.floor(c.width / 2), c.width - 1].map((x) => ctx.getImageData(x, Math.floor(c.height / 2), 1, 1).data[3]);
    }); expect(alpha).toEqual([255, 255, 255]);
  }
  await page.evaluate(() => {
    const metrics = { builds: 0, pixels: 0, paints: 0 };
    Object.assign(window, { a5TestMetrics: metrics });
    const original = CanvasRenderingContext2D.prototype.putImageData, fill = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.putImageData = function (...args: unknown[]) { const data = args[0] as ImageData; metrics.builds++; metrics.pixels = data.width * data.height; return Reflect.apply(original, this, args); };
    CanvasRenderingContext2D.prototype.fillRect = function (...args: Parameters<CanvasRenderingContext2D['fillRect']>) { if (this.canvas.getAttribute('aria-label') === 'Atlas terrain map') metrics.paints++; return Reflect.apply(fill, this, args); };
  });
  const original = await words(page), session = await context.newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  for (let i = 0; i < 4; i++) await pan(page, i % 2 ? 350 : -450);
  expect(await words(page)).toEqual(original);
  const cached = await page.evaluate(() => (window as unknown as { a5TestMetrics: { builds: number; pixels: number; paints: number } }).a5TestMetrics);
  expect(cached.builds).toBe(0); expect(cached.paints).toBeGreaterThan(0);
  const r = await view(page), start = await page.evaluate(() => performance.now());
  await page.mouse.click(r.x + r.stageWidth / 2, r.y + r.stageHeight / 2);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  const measured = await page.evaluate((start) => ({ ...(window as unknown as { a5TestMetrics: { builds: number; pixels: number; paints: number } }).a5TestMetrics, editMs: performance.now() - start }), start);
  expect(measured.builds).toBe(1); expect(measured.pixels).toBeLessThanOrEqual(info.project.name === 'mobile' ? 589_824 : 1_048_576); expect(measured.editMs).toBeLessThan(3000);
  await session.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await info.attach('render-cost.json', { body: JSON.stringify(measured), contentType: 'application/json' });
  expect(await map(page).evaluate((element) => getComputedStyle(element).imageRendering)).toBe('auto');
});

test('subpixel periodic extents do not allocate unbounded preview nodes or stall the workspace', async ({ page }) => {
  await page.goto('/tests/fixtures/terrain.html?wrapped=1&narrow=1'); await ready(page);
  const r = await view(page); await page.mouse.move(r.x + r.stageWidth / 2, r.y + r.stageHeight / 2);
  expect(await page.locator('[aria-hidden="true"] > div').count()).toBe(0);
  expect(await page.getByLabel('Terrain elevation', { exact: true }).textContent()).toContain('-100 m');
  expect(await page.evaluate(async () => (await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src)).terrain.elevations.length)).toBe(512 * 512);
});
