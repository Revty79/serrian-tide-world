import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { toolsPanel, startAtlas, createWorld } from './workspace-helpers.ts';

test.use({ trace: 'on' });
const map = (page: Page) => page.getByRole('img', { name: 'Atlas terrain map' });
async function view(page: Page) {
  return map(page).evaluate((e) => ({ left: Number(e.dataset.mapLeft), top: Number(e.dataset.mapTop), width: Number(e.dataset.mapWidth), height: Number(e.dataset.mapHeight), stageWidth: innerWidth, stageHeight: innerHeight }));
}
async function painted(page: Page) { await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function app(page: Page, wrapped = true) {
  await startAtlas(page);
  if (wrapped) { await toolsPanel(page, true); await createWorld(page, 'wrapped'); await toolsPanel(page, false); }
  await expect.poll(async () => (await view(page)).width).toBeGreaterThan(0);
}
async function drag(page: Page, dx: number, dy = 0) {
  const r = await view(page), x = r.stageWidth / 2, y = r.stageHeight / 2;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y + dy, { steps: 6 }); await page.mouse.up(); await painted(page);
}
async function pan(page: Page, dx: number, dy = 0) {
  await page.keyboard.down('Space'); await drag(page, dx, dy); await page.keyboard.up('Space');
}
async function choose(page: Page, tool: 'raise' | 'lower' | 'smooth' | 'flatten') {
  await toolsPanel(page, true); await page.getByRole('button', { name: tool.charAt(0).toUpperCase() + tool.slice(1), exact: true }).click();
  if (tool === 'flatten') await page.getByRole('spinbutton', { name: 'Target elevation (m)', exact: true }).fill('600');
  await toolsPanel(page, false);
}
async function save(page: Page) {
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
}
async function stored(page: Page) {
  return page.evaluate(async () => {
    const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
    const store = new LocalMapStore(), list = await store.list(), { terrain } = await store.open(list[0]!.id);
    return { words: Array.from(new Uint32Array(terrain.elevations.buffer)), metadata: JSON.stringify(terrain.metadata), count: terrain.elevations.length };
  });
}
async function roundTrip(page: Page, before: Awaited<ReturnType<typeof stored>>, after: Awaited<ReturnType<typeof stored>>) {
  expect(after.words).not.toEqual(before.words); expect(after.metadata).toBe(before.metadata); expect(after.count).toBe(512 * 512);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await save(page); expect(await stored(page)).toEqual(before);
  await page.getByRole('button', { name: 'Redo', exact: true }).click(); await save(page); expect(await stored(page)).toEqual(after);
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', (e) => list.push(e.message)); page.on('console', (e) => { if (e.type() === 'error') list.push(e.text()); }); });
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

test('actual editor: Space from a focused button and multiple drags with one held key pan both ways without sculpting', async ({ page }) => {
  await app(page); await save(page); const before = await stored(page);
  await page.getByRole('button', { name: 'Fill View', exact: true }).click(); const initial = await view(page);
  await page.keyboard.down('Space'); await drag(page, 100); const right = await view(page);
  expect(right.left - initial.left).toBeCloseTo(100, 5);
  await drag(page, -160); const left = await view(page);
  expect(left.left - right.left).toBeCloseTo(-160, 5);
  await page.keyboard.up('Space');
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  // Native Space activation of a focused button still works when there is no map drag.
  await page.getByRole('button', { name: 'Zoom In', exact: true }).focus(); await page.keyboard.press('Space');
  await expect(page.getByLabel('Map zoom', { exact: true })).toHaveText('150%');
  await save(page); expect(await stored(page)).toEqual(before);
});

test('bounded wide editor: no horizontal room at Fill, zoom creates room, Pan traverses both bounds, Fit remains separate', async ({ page }, info) => {
  await app(page, false); await page.setViewportSize({ width: 1920, height: 1080 }); await painted(page);
  const initial = await view(page); expect(initial.left).toBe(0); expect(initial.width).toBe(1920);
  await pan(page, 250); expect((await view(page)).left).toBe(0);
  await page.getByRole('button', { name: 'Zoom In', exact: true }).click(); await painted(page);
  const zoomed = await view(page); await pan(page, 180); expect((await view(page)).left).toBeCloseTo(zoomed.left + 180, 5);
  await toolsPanel(page, true); await page.getByRole('button', { name: 'Pan', exact: true }).click(); await toolsPanel(page, false);
  await drag(page, -3000); const far = await view(page); expect(far.left + far.width).toBe(1920);
  await drag(page, 3000); expect((await view(page)).left).toBe(0);
  if (info.project.name === 'desktop') await page.screenshot({ path: 'docs/evidence/a5-1-desktop-bounded-pan.png' });
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click(); await painted(page);
  const fit = await view(page); expect(fit.width).toBe(1080); expect(fit.left).toBe(420);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
});

test('repeated views share exactly one dab; long pans, seam strokes and aligned readouts match direct numerical editing', async ({ page }, info) => {
  test.setTimeout(60_000); await app(page); await save(page);
  const original = await stored(page), r = await view(page), point = { x: r.stageWidth / 2, y: r.stageHeight / 2 };
  const expected = await page.evaluate(async ({ r, point }) => {
    const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
    const { startBrushStroke } = await import(new URL('/src/terrain/brush.ts', location.origin).href) as typeof import('../src/terrain/brush.ts');
    const store = new LocalMapStore(), { terrain } = await store.open((await store.list())[0]!.id);
    startBrushStroke(terrain, { x: (point.x - r.left) / r.width, y: (point.y - r.top) / r.height }, { tool: 'raise', radius: .06, strength: 200 }).end();
    return Array.from(new Uint32Array(terrain.elevations.buffer));
  }, { r, point });
  await page.mouse.click(point.x, point.y); await save(page); const single = await stored(page); expect(single.words).toEqual(expected);
  const rasterMonitor = await page.evaluateHandle(() => {
    const original = CanvasRenderingContext2D.prototype.putImageData; let writes = 0;
    CanvasRenderingContext2D.prototype.putImageData = function (...args: unknown[]) { writes++; return Reflect.apply(original, this, args); };
    return { count: () => writes, restore: () => { CanvasRenderingContext2D.prototype.putImageData = original; } };
  });
  for (let i = 0; i < 16; i++) await pan(page, i % 2 ? -270 : 230);
  expect(await rasterMonitor.evaluate((monitor) => monitor.count())).toBe(0);
  await rasterMonitor.evaluate((monitor) => monitor.restore()); await rasterMonitor.dispose();
  await save(page); expect(await stored(page)).toEqual(single);
  // Put a geographical cut at the center, then draw across it in one physical path.
  const p = await view(page); const seam = p.left + Math.round((p.stageWidth / 2 - p.left) / p.width) * p.width;
  await pan(page, p.stageWidth / 2 - seam); const centered = await view(page), y = centered.stageHeight / 2;
  const a = { x: centered.stageWidth / 2 - 35, y }, b = { x: centered.stageWidth / 2 + 35, y };
  const seamExpected = await page.evaluate(async ({ a, b, r }) => {
    const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
    const { startBrushStroke } = await import(new URL('/src/terrain/brush.ts', location.origin).href) as typeof import('../src/terrain/brush.ts');
    const store = new LocalMapStore(), { terrain } = await store.open((await store.list())[0]!.id);
    const world = (p: { x: number; y: number }) => ({ x: (p.x - r.left) / r.width, y: (p.y - r.top) / r.height });
    const stroke = startBrushStroke(terrain, world(a), { tool: 'raise', radius: .06, strength: 200 }); stroke.moveTo(world(b)); stroke.end();
    return Array.from(new Uint32Array(terrain.elevations.buffer));
  }, { a, b, r: centered });
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y); await page.mouse.up(); await save(page);
  const edited = await stored(page); expect(edited.words).toEqual(seamExpected);
  await page.mouse.move(b.x, b.y);
  const sample = await page.evaluate(async ({ b, r }) => {
    const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
    const { inspectElevation } = await import(new URL('/src/terrain/sampling.ts', location.origin).href) as typeof import('../src/terrain/sampling.ts');
    const store = new LocalMapStore(), { terrain } = await store.open((await store.list())[0]!.id);
    return inspectElevation(terrain, { x: (b.x - r.left) / r.width, y: (b.y - r.top) / r.height }).elevation.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }, { b, r: centered });
  await expect(page.getByLabel('Terrain elevation', { exact: true })).toContainText(`${sample} m`);
  await page.screenshot({ path: `docs/evidence/a5-1-${info.project.name}-seam.png` });
  await roundTrip(page, single, edited);
  expect(original.words).not.toEqual(edited.words);
});

for (const tool of ['raise', 'lower', 'smooth', 'flatten'] as const) {
  test(`actual ${tool}: screen-edge scrolling crosses a phase rebase in one exact undoable stroke`, async ({ page }, info) => {
    test.setTimeout(60_000); await app(page);
    const initial = await view(page); await pan(page, -.48 * initial.width);
    const r = await view(page), y = r.stageHeight / 2, start = r.stageWidth - 65, edge = r.stageWidth - 2;
    if (tool === 'smooth') await page.mouse.click(start, y); // A nonuniform baseline for smoothing.
    await choose(page, tool); await save(page); const before = await stored(page);
    // Track every applied transform, including the equivalent phase jump.
    const recording = await page.evaluateHandle(() => {
      const e = document.querySelector<HTMLCanvasElement>('canvas')!, values = [Number(e.dataset.mapLeft)];
      const observer = new MutationObserver(() => { const x = Number(e.dataset.mapLeft); if (x !== values.at(-1)) values.push(x); });
      observer.observe(e, { attributes: true, attributeFilter: ['data-map-left'] });
      return { observer, values };
    });
    await page.mouse.move(start, y); await page.mouse.down(); await page.mouse.move(edge, y, { steps: 4 });
    await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'true');
    await page.waitForTimeout(3000);
    const motion = await recording.evaluate(({ observer, values }) => { observer.disconnect(); return values; }); await recording.dispose();
    const deltas = motion.slice(1).map((x, i) => x - motion[i]!);
    expect(deltas.some((dx) => dx > r.width / 2)).toBe(true);
    expect(deltas.every((dx) => dx < 0 || dx > r.width / 2)).toBe(true);
    if (tool === 'raise') await page.screenshot({ path: `docs/evidence/a5-1-${info.project.name}-edge-stroke.png` });
    // Captured movement beyond the visible edge still continues; release ends it.
    await page.mouse.move(r.stageWidth + 12, y); await page.waitForTimeout(150); await page.mouse.up();
    await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'false');
    const stopped = await view(page); await page.waitForTimeout(250); expect(await view(page)).toEqual(stopped);
    await save(page); const after = await stored(page);
    // No rebase line into unrelated latitudes, and exactly one Undo restores all bits.
    expect(after.words.slice(0, 512 * 100)).toEqual(before.words.slice(0, 512 * 100));
    expect(after.words.slice(512 * 412)).toEqual(before.words.slice(512 * 412));
    await roundTrip(page, before, after);
    if (tool === 'raise') await writeFile(`docs/evidence/a5-1-${info.project.name}-motion.json`, JSON.stringify({ viewport: page.viewportSize(), period: r.width, appliedLeft: motion, oneUndoExact: true, oneRedoExact: true, unchangedRemoteRows: true }, null, 2));
  });
}

test('left-edge assistance crosses the opposite phase cut and an unrelated host resize safely ends it', async ({ page }) => {
  test.setTimeout(40_000); await app(page); const initial = await view(page); await pan(page, .48 * initial.width);
  await save(page); const before = await stored(page), r = await view(page), y = r.stageHeight / 2;
  await page.mouse.move(65, y); await page.mouse.down(); await page.mouse.move(2, y);
  await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'true');
  await expect.poll(async () => (await view(page)).left).toBeLessThan(r.left - r.width / 2);
  // Embedded hosts may resize without a window resize event. Assistance may
  // preserve translations only, never adopt an unrelated layout as its own.
  await page.getByLabel('Map display area', { exact: true }).evaluate((e) => { e.style.width = 'calc(100% - 20px)'; });
  await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'false');
  await painted(page); const ended = await view(page);
  await page.mouse.move(100, y + 100); await page.mouse.up(); await page.waitForTimeout(250); expect(await view(page)).toEqual(ended);
  await save(page); await roundTrip(page, before, await stored(page));
});

test('bounded edge scroll moves both axes, stops at real boundaries without time-strength, can be disabled, and never starts on hover', async ({ page }) => {
  test.setTimeout(60_000); await app(page, false);
  await page.getByRole('button', { name: 'Zoom In', exact: true }).click(); await painted(page);
  const r = await view(page), x = r.stageWidth - 2, y = r.stageHeight - 8;
  await page.mouse.move(x, r.stageHeight / 2); await page.waitForTimeout(400); expect(await view(page)).toEqual(r);
  // Lower-right corner is clear of the navigation controls at bottom 54px.
  await page.mouse.move(x - 25, y - 25); await page.mouse.down(); await page.mouse.move(x, y);
  await expect.poll(async () => { const p = await view(page); return Math.abs(p.left + p.width - p.stageWidth) < .01 && Math.abs(p.top + p.height - p.stageHeight) < .01; }, { timeout: 15000 }).toBe(true);
  const boundary = await view(page); await page.waitForTimeout(400); expect(await view(page)).toEqual(boundary);
  await page.keyboard.press('Escape'); await page.mouse.up(); await save(page); const once = await stored(page);
  // A stationary held dab at the real corner must equal a click at that corner.
  const expected = await page.evaluate(async ({ x, y, r }) => {
    const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
    const { startBrushStroke } = await import(new URL('/src/terrain/brush.ts', location.origin).href) as typeof import('../src/terrain/brush.ts');
    const store = new LocalMapStore(), { terrain } = await store.open((await store.list())[0]!.id);
    startBrushStroke(terrain, { x: (x - r.left) / r.width, y: (y - r.top) / r.height }, { tool: 'raise', radius: .06, strength: 200 }).end();
    return Array.from(new Uint32Array(terrain.elevations.buffer));
  }, { x, y, r: boundary });
  await page.mouse.move(x, y); await page.mouse.down(); await page.waitForTimeout(1000); await page.mouse.up(); await save(page);
  expect((await stored(page)).words).toEqual(expected);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await save(page); expect(await stored(page)).toEqual(once);
  await toolsPanel(page, true); await page.getByRole('checkbox', { name: 'Scroll while drawing at screen edges' }).uncheck(); await toolsPanel(page, false);
  await pan(page, 120, 120); const fixed = await view(page);
  await page.mouse.move(x, r.stageHeight / 2); await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up(); expect(await view(page)).toEqual(fixed);
});

test('Escape, cancel, lost capture, blur, tool changes and toolbar obstruction leave no continuing camera or stray dabs', async ({ page }) => {
  test.setTimeout(60_000); await app(page);
  const r = await view(page), x = r.stageWidth - 2, y = r.stageHeight / 2;
  for (const reason of ['escape', 'cancel', 'capture', 'blur', 'tool', 'toolbar']) {
    await page.mouse.move(x - 30, y); await page.mouse.down(); await page.mouse.move(x, y);
    await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'true');
    if (reason === 'escape') await page.keyboard.press('Escape');
    else if (reason === 'cancel') await map(page).dispatchEvent('pointercancel', { pointerId: 1 });
    else if (reason === 'capture') await map(page).evaluate((e: HTMLCanvasElement) => e.releasePointerCapture(1));
    else if (reason === 'blur') await page.evaluate(() => dispatchEvent(new Event('blur')));
    else {
      await page.getByRole('button', { name: 'Open tools', exact: true }).focus(); await page.keyboard.press('Enter');
      if (reason === 'tool') { await page.getByRole('button', { name: 'Lower', exact: true }).focus(); await page.keyboard.press('Enter'); }
      else await page.mouse.move(100, y);
    }
    await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'false');
    const ended = await view(page);
    await page.keyboard.press('Control+s'); await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible(); const cancelled = await stored(page);
    await page.mouse.move(x - 150, y + 120); await page.mouse.up();
    await page.waitForTimeout(250); expect(await view(page)).toEqual(ended);
    await toolsPanel(page, false); await save(page); const before = await stored(page); expect(before).toEqual(cancelled);
    await page.mouse.move(x, y); await page.waitForTimeout(250); await save(page); expect(await stored(page)).toEqual(before);
    await choose(page, 'raise');
  }
});

test('native touch and pen navigate horizontally, touch edge strokes stay one operation, two fingers cancel assistance safely', async ({ page, context }, info) => {
  test.setTimeout(60_000); await app(page); const cdp = await context.newCDPSession(page), r = await view(page), y = r.stageHeight / 2;
  await toolsPanel(page, true); await page.getByRole('button', { name: 'Pan', exact: true }).click(); await toolsPanel(page, false);
  for (const dx of [70, -90]) {
    const before = await view(page), touch = { x: r.stageWidth / 2, y, id: 1 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touch, x: touch.x + dx }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await painted(page);
    expect((await view(page)).left - before.left).toBeCloseTo(dx, 3);
  }
  const beforePen = await view(page), px = r.stageWidth / 2;
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: px, y, button: 'left', buttons: 1, pointerType: 'pen' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: px + 60, y, button: 'left', buttons: 1, pointerType: 'pen' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: px + 60, y, button: 'left', buttons: 0, pointerType: 'pen' }); await painted(page);
  expect((await view(page)).left - beforePen.left).toBeCloseTo(60, 3);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await choose(page, 'raise'); await save(page); const before = await stored(page);
  const touch = { x: r.stageWidth - 25, y, id: 1 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touch, x: r.stageWidth - 2 }] });
  await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'true'); await page.waitForTimeout(700);
  await page.screenshot({ path: `docs/evidence/a5-1-${info.project.name}-touch-edge.png` });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await save(page); const after = await stored(page); await roundTrip(page, before, after);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touch, x: r.stageWidth - 2 }] });
  await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'true');
  const first = { ...touch, x: r.stageWidth - 2 }, second = { x: r.stageWidth / 2, y: y + 80, id: 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first, second] });
  await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'false');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const ended = await view(page); await page.waitForTimeout(250); expect(await view(page)).toEqual(ended);
});
