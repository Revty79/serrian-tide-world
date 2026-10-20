import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { toolsPanel, sphericalPresentation } from './workspace-helpers.ts';
type Host = typeof import('./fixtures/sphere-editor.tsx');
const canvas = (p: Page) => p.getByRole('img', { name: 'Spherical terrain preview', exact: true });
const button = (p: Page, name: string) => p.getByRole('button', { name, exact: true });
const stats = (p: Page) => p.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-editor.tsx', location.origin).href) as Host).statistics());
const digest = (p: Page) => p.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-editor.tsx', location.origin).href) as Host).digest());
const record = (p: Page) => p.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-editor.tsx', location.origin).href) as Host).startRecording());
const compare = (p: Page) => p.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-editor.tsx', location.origin).href) as Host).compareRecording());
const rect = (p: Page, f: Parameters<Host['rect']>[0]) => p.evaluate(async (f) => (await import(new URL('/tests/fixtures/sphere-editor.tsx', location.origin).href) as Host).rect(f), f);
async function frames(p: Page) { await p.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))); await sphericalPresentation(p); }
async function idle(p: Page) { await expect.poll(async () => { const s = await stats(p); return s.pendingBytes === 0 && !s.backlogged && s.revision === s.cacheRevision; }, { timeout: 30000 }).toBe(true); await frames(p); }
async function fixture(p: Page, n = 128) { await p.goto(`/tests/fixtures/sphere-editor.html?n=${n}`); await expect(canvas(p)).toHaveAttribute('data-mode', 'globe', { timeout: 30000 }); }
async function drag(p: Page, points: { x: number; y: number }[]) { await p.mouse.move(points[0]!.x, points[0]!.y); await p.mouse.down(); for (const point of points.slice(1)) await p.mouse.move(point.x, point.y, { steps: 5 }); await p.mouse.up(); }
async function controls(p: Page, values: Record<string, string>) { await button(p, 'View controls').click(); for (const [name, value] of Object.entries(values)) await p.getByLabel(name, { exact: true }).fill(value); await button(p, 'Close view controls').click(); }
test.use({ trace: 'on' });
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', (e) => list.push(e.message)); });
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

test('historical blank overlay: real continent, shared net/rotated screenshots, discard and reload guards, planar preservation', async ({ page }, info) => {
  test.setTimeout(90000); await page.goto('/tests/fixtures/legacy.html');
  const size = page.viewportSize()!, x = size.width / 2, y = size.height / 2, r = Math.min(size.width, size.height) * .42;
  await page.mouse.click(x, y); await page.mouse.click(x + 20, y); await button(page, 'Undo').click();
  const planar = page.getByRole('img', { name: 'Atlas terrain map', exact: true });
  const before = await planar.evaluate((e) => (e as HTMLCanvasElement).toDataURL());
  await toolsPanel(page, true); await page.getByLabel('Sphere reference radius (m)', { exact: true }).fill('1000000');
  await button(page, 'Create blank sphere').click(); await expect(canvas(page)).toHaveAttribute('data-mode', 'globe', { timeout: 30000 });
  await expect(page.getByLabel('Spherical work status')).toContainText('Unmodified blank ocean');
  await page.screenshot({ path: `docs/evidence/a6-d2-${info.project.name}-blank.png` });
  await controls(page, { 'Spherical brush radius (m)': '200000', 'Spherical strength (m/dab)': '1400' });
  await drag(page, [{ x: x - .48 * r, y: y - .16 * r }, { x: x - .18 * r, y: y - .27 * r }, { x: x + .12 * r, y }, { x: x + .4 * r, y: y + .12 * r }]);
  await expect(canvas(page)).toHaveAttribute('data-history-entries', '1'); await expect(canvas(page)).toHaveAttribute('data-processing', 'false');
  await expect(page.getByLabel('Spherical work status')).toContainText('Unsaved spherical changes');
  await page.mouse.move(x, y); await frames(page); await page.screenshot({ path: `docs/evidence/a6-d2-${info.project.name}-continent.png` });
  const revision = await canvas(page).getAttribute('data-revision');
  await button(page, 'Six-face net').click(); await frames(page); await expect(canvas(page)).toHaveAttribute('data-revision', revision!);
  await page.screenshot({ path: `docs/evidence/a6-d2-${info.project.name}-net.png` });
  await button(page, 'Globe').click(); await button(page, 'Rotate / Pan').click(); await drag(page, [{ x, y }, { x: x + .3 * r, y: y + .15 * r }]); await frames(page);
  await page.screenshot({ path: `docs/evidence/a6-d2-${info.project.name}-rotated.png` });
  await expect(canvas(page)).toHaveAttribute('data-revision', revision!);
  await button(page, 'Spherical Undo').click(); await expect(page.getByLabel('Spherical work status')).toContainText('Unmodified blank ocean');
  await button(page, 'Spherical Redo').click(); await expect(page.getByLabel('Spherical work status')).toContainText('Unsaved spherical changes');
  const dismissed = page.waitForEvent('dialog').then(async (d) => { expect(d.type()).toBe('confirm'); expect(d.message()).toContain('unsaved spherical'); await d.dismiss(); });
  await button(page, 'Return to map').click(); await dismissed; await expect(canvas(page)).toBeVisible();
  const unload = page.waitForEvent('dialog').then(async (d) => { expect(d.type()).toBe('beforeunload'); await d.dismiss(); });
  await page.evaluate(() => { location.reload(); }); await unload; await expect(canvas(page)).toBeVisible();
  const accepted = page.waitForEvent('dialog').then((d) => d.accept()); await button(page, 'Return to map').click(); await accepted;
  await expect(button(page, 'Create blank sphere')).toBeFocused(); await toolsPanel(page, false);
  expect(await planar.evaluate((e) => (e as HTMLCanvasElement).toDataURL())).toBe(before); await expect(button(page, 'Redo')).toBeEnabled();
  expect(await page.evaluate(() => indexedDB.databases().then((dbs) => dbs.map((d) => d.name)))).toEqual(expect.any(Array));
});

test('all four tools on globe and connected net match the numerical engine bit for bit with exact Undo/Redo and readouts', async ({ page }) => {
  test.setTimeout(120000); await fixture(page); const size = page.viewportSize()!, x = size.width / 2, y = size.height / 2;
  const initial = await digest(page); expect((await stats(page)).min).toBe(-100); expect((await stats(page)).max).toBe(-100);
  for (const mode of ['Globe', 'Six-face net']) {
    await button(page, mode).click(); await frames(page);
    const face = mode === 'Globe' ? { x: x - 45, y: y - 25, side: 100 } : await rect(page, 'px');
    const a = mode === 'Globe' ? { x: x - 30, y: y + 20 } : { x: face.x + face.side * .3, y: face.y + face.side * .56 };
    const b = mode === 'Globe' ? { x: x + 35, y: y + 35 } : { x: face.x + face.side * .75, y: face.y + face.side * .62 };
    for (const tool of ['Raise', 'Lower', 'Smooth', 'Flatten']) {
      await button(page, tool).click(); if (tool === 'Flatten') await controls(page, { 'Spherical target elevation (m)': '1800' });
      const before = await digest(page), entries = (await stats(page)).historyEntries; await record(page);
      await drag(page, [a, b]); await idle(page); const comparison = await compare(page);
      expect(comparison.operations).toBe(1); expect(comparison.points).toBeGreaterThan(0); expect(comparison.exact).toBe(true);
      expect((await stats(page)).historyEntries).toBe(entries + 1); const after = await digest(page); expect(after).not.toBe(before);
      await page.mouse.move(b.x, b.y); await frames(page);
      const expected = await page.evaluate(async (b) => (await import(new URL('/tests/fixtures/sphere-editor.tsx', location.origin).href) as Host).at(b.x, b.y), b);
      await expect(page.getByLabel('Spherical elevation', { exact: true })).toHaveAttribute('data-elevation', String(expected!.elevation));
      await button(page, 'Spherical Undo').click(); await idle(page); expect(await digest(page)).toBe(before);
      await button(page, 'Spherical Redo').click(); await idle(page); expect(await digest(page)).toBe(after);
    }
  }
  const edited = await digest(page); expect(edited).not.toBe(initial);
  for (const view of ['Globe', 'Six-face net', 'Globe']) { await button(page, view).click(); await frames(page); expect(await digest(page)).toBe(edited); }
  const s = await stats(page); expect(s.fullRebuilds).toBe(0); expect(s.cacheRevision).toBe(s.revision); expect(s.copies).toBe(16 + s.displayEpochCopies);
});

test('joined net stroke and screen-edge assistance retain physical spacing; gaps/cuts safely end the gesture', async ({ page, context }, info) => {
  test.setTimeout(90000); await fixture(page); await button(page, 'Six-face net').click(); await frames(page);
  const px = await rect(page, 'px'), py = await rect(page, 'py');
  await record(page); await drag(page, [{ x: px.x + px.side * .7, y: px.y + px.side * .6 }, { x: py.x + py.side * .3, y: py.y + py.side * .6 }]); await idle(page);
  expect((await compare(page)).exact).toBe(true); expect((await stats(page)).historyEntries).toBe(1);
  const pz = await rect(page, 'pz'); await record(page);
  // One sparse jump across the empty tile to the far-right face must not bridge geography.
  const nx = await rect(page, 'nx'); await page.mouse.move(pz.x + pz.side * .7, pz.y + pz.side * .7); await page.mouse.down();
  await page.mouse.move(nx.x + nx.side * .4, nx.y + nx.side * .3); await page.mouse.up(); await idle(page);
  const safe = await compare(page); expect(safe.operations).toBe(1); expect(safe.points).toBe(0); expect(safe.exact).toBe(true);
  for (let i = 0; i < 5; i++) await button(page, 'Spherical Zoom In').click(); await frames(page);
  // The equatorial strip fills this screen edge at zoom; ensure assistance operates on actual terrain.
  const size = page.viewportSize()!, edge = { x: size.width - 6, y: size.height / 2 + 30 };
  expect(await page.evaluate(async (p) => !!(await import(new URL('/tests/fixtures/sphere-editor.tsx', location.origin).href) as Host).at(p.x, p.y), edge)).toBe(true);
  const pan = await canvas(page).getAttribute('data-pan'), count = (await stats(page)).historyEntries;
  await record(page); const cdp = await context.newCDPSession(page);
  if (info.project.name === 'mobile') {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: edge.x - 8, y: edge.y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: edge.x, y: edge.y, id: 1 }] });
  } else { await page.mouse.move(edge.x, edge.y); await page.mouse.down(); }
  await expect.poll(() => canvas(page).getAttribute('data-pan'), { timeout: 8000 }).not.toBe(pan); await page.waitForTimeout(400);
  if (info.project.name === 'mobile') await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.mouse.up();
  await idle(page); expect((await compare(page)).exact).toBe(true); expect((await stats(page)).historyEntries).toBe(count + 1);
  expect(await canvas(page).getAttribute('data-edge-assisting')).toBe('false');
});

test('mouse/pen/touch arbitration, cancellation, shortcuts, recenter and view changes protect single operations', async ({ page, context }, info) => {
  test.setTimeout(90000); await fixture(page); const size = page.viewportSize()!, x = size.width / 2, y = size.height / 2;
  const initial = await digest(page);
  if (info.project.name === 'mobile') {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 30, y, id: 1 }, { x: x + 30, y, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 50, y: y + 10, id: 1 }, { x: x + 60, y: y + 10, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await idle(page);
    expect(await digest(page)).toBe(initial); expect((await stats(page)).historyEntries).toBe(0);
    await button(page, 'Reset View').click(); await frames(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 25, y: y + 20, id: 3 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 35, y: y + 25, id: 3 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await idle(page);
    expect((await stats(page)).historyEntries).toBe(1); await button(page, 'Spherical Undo').click(); await idle(page); expect(await digest(page)).toBe(initial);
  }
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, pointerType: 'pen' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 30, y: y + 20, buttons: 1, pointerType: 'pen' });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 30, y: y + 20, button: 'left', buttons: 0, pointerType: 'pen' }); await idle(page);
  expect((await stats(page)).changedSamples).toBeGreaterThan(0);
  for (const stop of ['escape', 'cancel', 'capture', 'blur', 'tool', 'view']) {
    const count = (await stats(page)).historyEntries; await page.mouse.move(x - 30, y + 30); await page.mouse.down(); await page.mouse.move(x - 15, y + 40); await frames(page);
    if (stop === 'escape') await page.keyboard.press('Escape');
    if (stop === 'cancel') await canvas(page).dispatchEvent('pointercancel', { pointerId: 1 });
    if (stop === 'capture') await canvas(page).evaluate((el) => { const c = el as HTMLCanvasElement; if (c.hasPointerCapture(1)) c.releasePointerCapture(1); });
    if (stop === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    if (stop === 'tool') await button(page, 'Lower').dispatchEvent('click');
    if (stop === 'view') await button(page, 'Six-face net').dispatchEvent('click');
    await page.mouse.up(); await idle(page); expect((await stats(page)).historyEntries).toBe(count + 1); await expect(canvas(page)).toHaveAttribute('data-editing', 'false');
  }
  await button(page, 'Globe').click(); await button(page, 'Rotate / Pan').click(); const edited = await digest(page), frame = await canvas(page).getAttribute('data-frame');
  await drag(page, [{ x, y }, { x: x + 45, y: y + 25 }]); await frames(page); expect(await canvas(page).getAttribute('data-frame')).not.toBe(frame); expect(await digest(page)).toBe(edited);
  await canvas(page).focus(); await page.keyboard.press('Enter'); await button(page, 'Center selection').click(); await button(page, 'Spherical Zoom In').click(); await frames(page);
  expect(await digest(page)).toBe(edited); await button(page, 'Raise').click(); await drag(page, [{ x, y: y + 10 }, { x: x + 20, y: y + 15 }]); await idle(page);
  const latest = await digest(page); await canvas(page).focus(); await page.keyboard.press('Control+z'); await idle(page); expect(await digest(page)).toBe(edited);
  await page.keyboard.press('Control+Shift+z'); await idle(page); expect(await digest(page)).toBe(latest);
});

test('real projected painting across all twelve face boundaries, eight corners, poles, and a clipped globe limb', async ({ page }) => {
  test.setTimeout(120000); await fixture(page); const size = page.viewportSize()!, x = size.width / 2, y = size.height / 2;
  const locations = await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-editor.tsx', location.origin).href) as Host).boundaryLocations());
  for (const direction of locations) {
    await button(page, 'Six-face net').click(); await button(page, 'Reset View').click(); await button(page, 'Rotate / Pan').click(); await frames(page);
    const point = await page.evaluate(async (direction) => {
      const host = await import(new URL('/tests/fixtures/sphere-editor.tsx', location.origin).href) as Host, p = host.project(direction)[0]!, r = host.rect(p.face);
      return { x: Math.round(Math.max(r.x + 1, Math.min(r.x + r.side - 1, p.x))), y: Math.round(Math.max(r.y + 1, Math.min(r.y + r.side - 1, p.y))) };
    }, direction);
    await page.mouse.click(point.x, point.y); await button(page, 'Center selection').click(); await frames(page); await button(page, 'Raise').click(); await record(page);
    await drag(page, [{ x: x - 8, y: y + 8 }, { x: x + 8, y: y - 8 }]); await idle(page);
    const replay = await compare(page); expect(replay.operations).toBe(1); expect(replay.exact).toBe(true);
  }
  // A fresh blank session makes any accidental far-side writes directly observable.
  await page.goto('/tests/fixtures/sphere-editor.html?n=128'); await expect(canvas(page)).toHaveAttribute('data-mode', 'globe');
  const r = Math.min(size.width, size.height) * .42, limb = { x: x + r * .995, y };
  await page.mouse.move(limb.x, limb.y); await frames(page);
  await expect(page.locator('svg path')).not.toHaveAttribute('d', '');
  await page.mouse.click(limb.x, limb.y); await idle(page);
  expect(await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-editor.tsx', location.origin).href) as Host).changesBehind([1, 0, 0]))).toBe(0);
  expect((await stats(page)).changedSamples).toBeGreaterThan(0);
});

test('actual N256 blank preparation, physical controls focus, responsive narrow/square/ultrawide layout and fullscreen', async ({ page }) => {
  test.setTimeout(60000); await page.goto('/tests/fixtures/legacy.html'); await toolsPanel(page, true); await page.getByLabel('Sphere reference radius (m)', { exact: true }).fill('735000');
  await button(page, 'Preview N=256').click(); await button(page, 'Create blank sphere').click(); await expect(canvas(page)).toHaveAttribute('data-mode', 'globe', { timeout: 30000 });
  await expect(canvas(page)).toHaveAttribute('data-samples', '393218'); await expect(canvas(page)).toHaveAttribute('data-radius', '735000');
  await button(page, 'View controls').click(); await expect(page.getByLabel('Spherical brush radius (m)', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(button(page, 'View controls')).toBeFocused();
  const revision = await canvas(page).getAttribute('data-revision');
  for (const viewport of [{ width: 1440, height: 900 }, { width: 3440, height: 1440 }, { width: 900, height: 900 }, { width: 320, height: 740 }, { width: 412, height: 839 }, { width: 839, height: 412 }]) {
    await page.setViewportSize(viewport); await frames(page);
    const tools = await page.getByRole('group', { name: 'Spherical tools', exact: true }).boundingBox(), status = await page.getByLabel('Spherical work status').boundingBox();
    expect(status!.y).toBeGreaterThanOrEqual(tools!.y + tools!.height); expect(tools!.x + tools!.width).toBeLessThanOrEqual(viewport.width);
    const bounds = await canvas(page).boundingBox(); expect(bounds!.width).toBe(viewport.width); expect(bounds!.height).toBe(viewport.height);
    await expect(canvas(page)).toHaveAttribute('data-revision', revision!);
  }
  const full = button(page, 'Spherical Fullscreen');
  if (await full.count()) { await full.click(); await button(page, 'Exit Spherical Fullscreen').click(); await expect(canvas(page)).toHaveAttribute('data-revision', revision!); }
  await button(page, 'Return to map').click(); await expect(button(page, 'Create blank sphere')).toBeFocused();
});

for (const n of [128, 256]) test(`brush-to-screen and rotation performance N=${n}`, async ({ page, context }, info) => {
  test.setTimeout(120000); await fixture(page, n);
  const cdp = await context.newCDPSession(page); if (info.project.name === 'mobile') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const size = page.viewportSize()!, x = size.width / 2, y = size.height / 2, r = Math.min(size.width, size.height) * .42, trials = [];
  for (const mode of ['Globe', 'Six-face net']) {
    await button(page, mode).click(); await frames(page); const rectPx = await rect(page, 'px');
    for (const tool of ['Raise', 'Lower', 'Smooth', 'Flatten']) {
      await button(page, tool).click();
      if (tool === 'Flatten') await controls(page, { 'Spherical target elevation (m)': '2400' });
      const points = mode === 'Globe' ? [{ x: x - .4 * r, y }, { x: x + .25 * r, y: y + .1 * r }, { x: x - .1 * r, y: y + .2 * r }]
        : [{ x: rectPx.x + .15 * rectPx.side, y: rectPx.y + .6 * rectPx.side }, { x: rectPx.x + .8 * rectPx.side, y: rectPx.y + .6 * rectPx.side }];
      const before = await stats(page), start = Date.now(); await drag(page, points); await idle(page);
      const after = await stats(page); expect(after.cacheRevision).toBe(after.revision); expect(after.historyEntries).toBe(before.historyEntries + 1);
      trials.push({ mode, tool, pointerDownThroughPaintAndCommitMs: Date.now() - start, dabs: after.dabs - before.dabs, texturePixels: after.updatedPixels - before.updatedPixels, stats: after, browser: await canvas(page).evaluate((el) => ({ renderTimes: JSON.parse((el as HTMLElement).dataset.renderTimes!), brushSegmentLatencies: JSON.parse((el as HTMLElement).dataset.brushLatencies ?? '[]'), navigationLatencies: JSON.parse((el as HTMLElement).dataset.inputLatencies ?? '[]') })) });
    }
  }
  await button(page, 'Globe').click(); await button(page, 'Rotate / Pan').click(); const edited = await digest(page), start = Date.now();
  await drag(page, [{ x, y }, { x: x + .3 * r, y: y + .1 * r }]); await frames(page); const navigationMs = Date.now() - start; expect(await digest(page)).toBe(edited);
  await writeFile(`docs/evidence/a6-d2-${info.project.name}-n${n}-performance.json`, JSON.stringify({ n, viewport: size, cpuThrottle: info.project.name === 'mobile' ? 4 : 1, method: 'Actual pointer strokes, canonical edits, revision patch, raster paint and history commit. End-to-end wall includes Playwright dispatch and frame/poll waits; brushSegmentLatencies measure each input segment through its final applied dab and displayed terrain, including queue time. Each bounded array retains the most recent 120 cumulative observations. Pixel 7 mobile emulation is not physical hardware.', trials, navigationMs, final: await stats(page), navigation: await canvas(page).evaluate((el) => ({ renderTimes: JSON.parse((el as HTMLElement).dataset.renderTimes!), inputLatencies: JSON.parse((el as HTMLElement).dataset.inputLatencies ?? '[]') })) }, null, 2));
});
