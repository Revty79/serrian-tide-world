import { expect, test, type Page, type JSHandle } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { toolsPanel } from './workspace-helpers.ts';

test.use({ trace: 'on' });
const map = (page: Page) => page.getByRole('img', { name: 'Atlas terrain map' });
async function painted(page: Page) { await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function view(page: Page) {
  return map(page).evaluate((e) => ({ left: Number(e.dataset.mapLeft), top: Number(e.dataset.mapTop), width: Number(e.dataset.mapWidth), height: Number(e.dataset.mapHeight), stageWidth: innerWidth, stageHeight: innerHeight, mode: e.dataset.viewMode }));
}
async function mode(page: Page, name: 'Focus Editing' | 'Fill View' | 'Fit Entire Map') {
  await page.getByRole('button', { name, exact: true }).click(); await painted(page);
}
async function app(page: Page) {
  await page.goto('/'); await toolsPanel(page, true); await page.getByRole('button', { name: 'New Wrapped Map', exact: true }).click(); await toolsPanel(page, false);
  await expect(map(page)).toHaveAttribute('data-view-mode', 'focus');
}
async function save(page: Page) {
  await page.getByRole('button', { name: 'Save', exact: true }).click(); await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
}
async function snapshot(page: Page) {
  return page.evaluateHandle(async () => {
    const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
    const store = new LocalMapStore(), { terrain } = await store.open((await store.list())[0]!.id);
    return new Uint32Array(terrain.elevations.buffer).slice();
  });
}
async function expectSavedWords(expected: JSHandle<Uint32Array>) {
  expect(await expected.evaluate(async (words) => {
    const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
    const store = new LocalMapStore(), { terrain } = await store.open((await store.list())[0]!.id), actual = new Uint32Array(terrain.elevations.buffer);
    return words.length === actual.length && words.every((word, index) => word === actual[index]);
  })).toBe(true);
}
async function digest(page: Page) {
  return page.evaluate(async () => {
    const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
    const store = new LocalMapStore(), { terrain } = await store.open((await store.list())[0]!.id);
    return { metadata: JSON.stringify(terrain.metadata), count: terrain.elevations.length, digest: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', terrain.elevations.buffer as ArrayBuffer)), (v) => v.toString(16).padStart(2, '0')).join('') };
  });
}
async function pan(page: Page, x: number, y = 0) {
  const r = await view(page); await page.keyboard.down('Space'); await page.mouse.move(r.stageWidth / 2, r.stageHeight / 2); await page.mouse.down();
  await page.mouse.move(r.stageWidth / 2 + x, r.stageHeight / 2 + y, { steps: 4 }); await page.mouse.up(); await page.keyboard.up('Space'); await painted(page);
}
async function seed(page: Page) {
  await mode(page, 'Fit Entire Map'); const r = await view(page);
  for (const p of [{ x: .015, y: .5 }, { x: .38, y: .4 }, { x: .72, y: .6 }]) await page.mouse.click(r.left + p.x * r.width, r.top + p.y * r.height);
  await save(page);
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', (e) => list.push(e.message)); page.on('console', (e) => { if (e.type() === 'error') list.push(e.text()); }); });
test.afterEach(({ page }) => { expect(errors.get(page)).toEqual([]); });

test('same saved world in full-height, focused and Fit views: real widths, previews, proportions and responsive screenshots', async ({ page }, info) => {
  test.setTimeout(60_000); await app(page); await seed(page); const original = await digest(page), measurements = [];
  for (const size of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'ultrawide', width: 3440, height: 1440 }, { name: 'square', width: 900, height: 900 }, { name: 'mobile', width: 412, height: 839 }]) {
    await page.setViewportSize({ width: size.width, height: size.height });
    for (const presentation of [{ name: 'Fill View', slug: 'full-height' }, { name: 'Focus Editing', slug: 'focused' }, { name: 'Fit Entire Map', slug: 'fit' }] as const) {
      await mode(page, presentation.name); const r = await view(page);
      expect(r.width / r.height).toBeCloseTo(1, 8);
      const expectedWidth = presentation.slug === 'focused' ? Math.max(size.height, Math.min(size.width * .82, size.height * 2)) : presentation.slug === 'full-height' ? size.height : Math.min(size.width, size.height);
      expect(r.width).toBeCloseTo(expectedWidth, 6);
      if (presentation.slug === 'focused' && expectedWidth < size.width) {
        const left = await page.locator('[data-context-preview="left"]').boundingBox(), right = await page.locator('[data-context-preview="right"]').boundingBox();
        expect(left!.width).toBeCloseTo(size.width * .09, 1); expect(right!.width).toBeCloseTo(left!.width, 6);
        expect(size.width - left!.width - right!.width).toBeCloseTo(r.width, 1);
        expect(r.left).toBeCloseTo((size.width - r.width) / 2, 6);
      } else await expect(page.locator('[data-context-preview="left"]')).toBeHidden();
      if (presentation.slug === 'fit') { expect(r.top).toBeGreaterThanOrEqual(0); expect(r.top + r.height).toBeLessThanOrEqual(size.height); }
      await save(page); expect(await digest(page)).toEqual(original);
      measurements.push({ viewport: size.name, presentation: presentation.slug, ...r, previewWidth: presentation.slug === 'focused' ? Math.max(0, (size.width - r.width) / 2) : null });
      await page.screenshot({ path: `docs/evidence/a5-2-${info.project.name}-${size.name}-${presentation.slug}.png` });
    }
  }
  await writeFile(`docs/evidence/a5-2-${info.project.name}-layout.json`, JSON.stringify({ measurements, sameMetadataAndPayload: true, samples: original.count }, null, 2));
});

test('view choices, movable cuts, vertical exploration, toolbar, fullscreen and zoom preserve data and pending Redo', async ({ page }) => {
  test.setTimeout(45_000); await app(page); await seed(page); const original = await snapshot(page);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await save(page); const undone = await snapshot(page);
  for (const name of ['Focus Editing', 'Fill View', 'Fit Entire Map', 'Focus Editing'] as const) await mode(page, name);
  await page.getByRole('button', { name: 'Zoom In', exact: true }).click(); await painted(page); await mode(page, 'Focus Editing');
  const initial = await view(page), frameLeft = (initial.stageWidth - initial.width) / 2;
  await pan(page, 100); const shifted = await view(page);
  expect((frameLeft - shifted.left) / shifted.width).not.toBe((frameLeft - initial.left) / initial.width);
  const preview = await page.locator('[data-context-preview="left"]').boundingBox();
  if (initial.width < initial.stageWidth) expect(preview!.width).toBeCloseTo(frameLeft, 1);
  await pan(page, 0, 10000); expect((await view(page)).top).toBeCloseTo(0, 6);
  await pan(page, 0, -10000); const south = await view(page); expect(south.top + south.height).toBeCloseTo(south.stageHeight, 6);
  await toolsPanel(page, true); const panelView = await view(page); await toolsPanel(page, false); expect(await view(page)).toEqual(panelView);
  const fullscreen = page.getByRole('button', { name: 'Enter Fullscreen', exact: true });
  if (await fullscreen.count()) { await fullscreen.click(); await page.getByRole('button', { name: 'Exit Fullscreen', exact: true }).click(); await painted(page); }
  await expect(page.getByRole('button', { name: 'Redo', exact: true })).toBeEnabled(); await save(page); await expectSavedWords(undone);
  await page.getByRole('button', { name: 'Redo', exact: true }).click(); await save(page); await expectSavedWords(original);
  await original.dispose(); await undone.dispose();
});

for (const tool of ['raise', 'lower', 'smooth', 'flatten'] as const) {
  test(`focused ${tool} preview coordinates match one numerical dab after repeated pans, with exact Undo/Redo`, async ({ page }) => {
    test.setTimeout(45_000); await page.setViewportSize({ width: 1920, height: 1080 }); await app(page);
    for (let i = 0; i < 8; i++) await pan(page, i % 2 ? -250 : 310);
    const r = await view(page), point = { x: Math.round(r.stageWidth * .045), y: Math.round(r.stageHeight / 2) };
    if (tool === 'smooth') await page.mouse.click(point.x, point.y);
    await toolsPanel(page, true); await page.getByRole('button', { name: tool.charAt(0).toUpperCase() + tool.slice(1), exact: true }).click();
    if (tool === 'flatten') await page.getByRole('spinbutton', { name: 'Target elevation (m)', exact: true }).fill('600');
    await toolsPanel(page, false); await save(page); const before = await snapshot(page);
    const expected = await page.evaluateHandle(async ({ tool, point, r }) => {
      const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
      const { startBrushStroke } = await import(new URL('/src/terrain/brush.ts', location.origin).href) as typeof import('../src/terrain/brush.ts');
      const store = new LocalMapStore(), { terrain } = await store.open((await store.list())[0]!.id);
      const settings = tool === 'raise' || tool === 'lower' ? { tool, radius: .06, strength: 200 } : tool === 'smooth' ? { tool, radius: .06, intensity: .5 } : { tool, radius: .06, intensity: .5, targetElevation: 600 };
      startBrushStroke(terrain, { x: (point.x - r.left) / r.width, y: (point.y - r.top) / r.height }, settings).end();
      return new Uint32Array(terrain.elevations.buffer).slice();
    }, { tool, point, r });
    await page.mouse.click(point.x, point.y); await save(page); await expectSavedWords(expected);
    await page.mouse.move(point.x, point.y);
    const rings = await page.locator('[aria-hidden="true"] > div').evaluateAll((elements) => elements.map((e) => { const r = e.getBoundingClientRect(); return r.x + r.width / 2; }));
    expect(rings.some((x) => Math.abs(x - point.x) < 1)).toBe(true); expect(rings.some((x) => Math.abs(x - point.x - r.width) < 1)).toBe(true);
    const readout = await page.evaluate(async ({ point, r }) => {
      const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
      const { inspectElevation } = await import(new URL('/src/terrain/sampling.ts', location.origin).href) as typeof import('../src/terrain/sampling.ts');
      const store = new LocalMapStore(), { terrain } = await store.open((await store.list())[0]!.id);
      const sample = inspectElevation(terrain, { x: (point.x - r.left) / r.width, y: (point.y - r.top) / r.height });
      return `X ${sample.position.x.toFixed(3)} · Y ${sample.position.y.toFixed(3)} map units · ${sample.elevation.toLocaleString(undefined, { maximumFractionDigits: 1 })} m`;
    }, { point, r });
    await expect(page.getByLabel('Terrain elevation', { exact: true })).toContainText(readout);
    await page.getByRole('button', { name: 'Undo', exact: true }).click(); await save(page); await expectSavedWords(before);
    await page.getByRole('button', { name: 'Redo', exact: true }).click(); await save(page); await expectSavedWords(expected);
    await before.dispose(); await expected.dispose();
  });
}

test('edge-assisted drawing crosses the focused boundary and periodic phase cut as one mouse/touch stroke', async ({ page, context }, info) => {
  test.setTimeout(40_000); await page.setViewportSize(info.project.name === 'mobile' ? { width: 839, height: 412 } : { width: 1440, height: 900 }); await app(page); await save(page); const before = await snapshot(page);
  const initial = await view(page); await pan(page, -.48 * initial.width); const r = await view(page), y = r.stageHeight / 2;
  const cdp = await context.newCDPSession(page), touch = { x: r.stageWidth * .88, y, id: 1 };
  if (info.project.name === 'mobile') {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [touch] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...touch, x: r.stageWidth - 2 }] });
  } else { await page.mouse.move(touch.x, y); await page.mouse.down(); await page.mouse.move(r.stageWidth - 2, y, { steps: 6 }); }
  await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'true');
  await expect.poll(async () => (await view(page)).left).toBeGreaterThan(r.left + r.width / 2);
  await page.waitForTimeout(500); await page.screenshot({ path: `docs/evidence/a5-2-${info.project.name}-edge-connected.png` });
  if (info.project.name === 'mobile') await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.mouse.up();
  await expect(map(page)).toHaveAttribute('data-edge-scrolling', 'false'); const ended = await view(page); await page.waitForTimeout(200); expect(await view(page)).toEqual(ended);
  await save(page); const after = await snapshot(page);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await save(page); await expectSavedWords(before);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Redo', exact: true }).click(); await save(page); await expectSavedWords(after);
  await before.dispose(); await after.dispose();
});
