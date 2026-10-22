import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { createWorld, toolsPanel, sphericalPresentation } from './workspace-helpers.ts';
type Storage = typeof import('./fixtures/sphere-storage.ts');
const button = (p: Page, name: string) => p.getByRole('button', { name, exact: true });
const work = (p: Page) => p.getByLabel('Map work status', { exact: true });
const main = (p: Page) => p.getByRole('main', { name: 'Atlas workspace' });
async function frames(p: Page) { await p.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))); await sphericalPresentation(p); }
async function saved(p: Page, name: string) {
  await button(p, 'Save').click(); await expect(work(p)).toHaveText('Saved on this device', { timeout: 30000 });
  return p.evaluate(async (name) => { const store = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts'); const id = (await new store.LocalMapStore().list()).find((m) => m.name === name)!.id; return (await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as Storage).summary(id); }, name);
}
async function open(p: Page, id: string) { await toolsPanel(p, true); await p.getByLabel('Saved maps', { exact: true }).selectOption(id); await button(p, 'Open Map').click(); }
async function paint(p: Page, sphere = false, net = false) {
  await toolsPanel(p, false); if (sphere) await sphericalPresentation(p); let x = p.viewportSize()!.width / 2, y = p.viewportSize()!.height / 2;
  if (net) { const r = await p.evaluate(async () => { const { netFaceRect, INITIAL_SPHERICAL_VIEW } = await import(new URL('/src/rendering/spherical-view.ts', location.origin).href) as typeof import('../src/rendering/spherical-view.ts'); return netFaceRect('px', { ...INITIAL_SPHERICAL_VIEW, mode: 'net' }, { width: innerWidth, height: innerHeight }); }); x = r.x + r.side * .5; y = r.y + r.side * .5; }
  await p.mouse.move(x - 14, y); await p.mouse.down(); await p.mouse.move(x + 16, y + 8, { steps: 3 }); await p.mouse.up();
  if (sphere) await expect(p.getByRole('img', { name: 'Atlas spherical terrain map', exact: true })).toHaveAttribute('data-processing', 'false');
  await frames(p);
}
test.use({ trace: 'on' });
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', (error) => list.push(error.message)); });
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

test('start directly on any supported shape; setup is explicit, accessible and cancellable without creating a hidden flat document', async ({ page }, info) => {
  await page.goto('/'); const dialog = page.getByRole('dialog', { name: 'New World / Map' }); await expect(dialog).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0); await expect(page.getByLabel('World/map name')).toBeFocused();
  expect(await page.getByLabel('World shape', { exact: true }).locator('option').allTextContents()).toEqual(['Bounded flat map', 'Horizontally wrapped flat map', 'Spherical world', 'Hollow sphere world', 'Physical capped cylinder', 'Solid cube world', 'Hollow cube world']);
  await page.getByLabel('World shape', { exact: true }).selectOption('sphere');
  for (const value of ['', '0', '-1']) { await page.getByLabel('Sphere reference radius (m)', { exact: true }).fill(value); await expect(button(page, 'Create World / Map')).toBeDisabled(); }
  await page.getByLabel('Sphere reference radius (m)', { exact: true }).fill('735000'); await page.getByLabel('Spherical resolution', { exact: true }).selectOption('256');
  await page.screenshot({ path: `docs/evidence/a6-f1-${info.project.name}-world-setup.png` });
  // Hold a real cooperative boundary so cancellation is exercised deterministically,
  // including on machines where N=256 finishes before the next automation round trip.
  await page.evaluate(() => { const scope = globalThis as typeof globalThis & { scheduler: { yield(): Promise<void> }; restoreYield?: () => void }; const original = scope.scheduler.yield; scope.scheduler.yield = () => new Promise((resolve) => setTimeout(resolve, 200)); scope.restoreYield = () => { scope.scheduler.yield = original; }; });
  await button(page, 'Create World / Map').click(); await button(page, 'Cancel preparation').click(); await expect(main(page)).toHaveAttribute('data-world-shape', 'none');
  await page.evaluate(() => (globalThis as typeof globalThis & { restoreYield(): void }).restoreYield());
  await expect(page.locator('canvas')).toHaveCount(0); await expect(button(page, 'New World / Map')).toBeFocused();
  await createWorld(page, 'sphere', { radius: '735000', n: 256 }); await expect(page.locator('canvas[role="img"]')).toHaveCount(1); await expect(page.locator('canvas')).toHaveCount(2);
  await expect(main(page)).toHaveAttribute('data-world-shape', 'sphere'); await expect(button(page, 'Return to map')).toHaveCount(0);
  await expect(page.getByRole('img')).toHaveAttribute('data-resolution', '256');
});

test('one workflow creates, edits with all four tools, saves and reopens v1/v2/v3 with exact history and shared globe/net authority', async ({ page }, info) => {
  test.setTimeout(180000); await page.goto('/'); const records = [];
  for (const shape of ['bounded', 'wrapped', 'sphere'] as const) {
    const name = `Unified ${shape}`; await createWorld(page, shape, { name });
    const blank = await saved(page, name); expect(blank.version).toBe(shape === 'sphere' ? 3 : shape === 'wrapped' ? 2 : 1);
    const modes = shape === 'sphere' ? ['Globe', 'Six-face net'] : ['planar'];
    for (const mode of modes) {
      if (mode !== 'planar') await button(page, mode).click();
      for (const tool of ['Raise', 'Lower', 'Smooth', 'Flatten']) {
        const before = await saved(page, name); await button(page, tool).click();
        if (tool === 'Flatten') { await toolsPanel(page, true); await page.getByLabel(shape === 'sphere' ? 'Spherical target elevation (m)' : 'Target elevation (m)', { exact: true }).fill('1800'); await toolsPanel(page, false); }
        await paint(page, shape === 'sphere', mode === 'Six-face net'); await expect(work(page)).toHaveText('Unsaved changes'); const after = await saved(page, name);
        expect(after.payloadSha256).not.toBe(before.payloadSha256); await button(page, 'Undo').click(); expect((await saved(page, name)).payloadSha256).toBe(before.payloadSha256);
        await button(page, 'Redo').click(); expect((await saved(page, name)).payloadSha256).toBe(after.payloadSha256);
      }
    }
    const sculpted = await saved(page, name); expect(sculpted.metadata).toEqual(blank.metadata);
    if (await button(page, 'Enter Fullscreen').count()) {
      await button(page, 'Enter Fullscreen').click(); await expect.poll(() => page.evaluate(() => document.fullscreenElement?.getAttribute('aria-label'))).toBe('Atlas workspace');
      await button(page, 'Exit Fullscreen').click(); await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
      expect((await saved(page, name)).payloadSha256).toBe(sculpted.payloadSha256);
    }
    if (shape === 'sphere') { for (const mode of ['Globe', 'Six-face net', 'Globe']) { await button(page, mode).click(); expect((await saved(page, name)).payloadSha256).toBe(sculpted.payloadSha256); if (mode === 'Six-face net') await page.screenshot({ path: `docs/evidence/a6-f1-${info.project.name}-sphere-net.png` }); } }
    await page.screenshot({ path: `docs/evidence/a6-f1-${info.project.name}-${shape}-workspace.png` }); records.push(sculpted);
  }
  for (const record of records) {
    await open(page, record.id); await expect(work(page)).toHaveText('Saved on this device', { timeout: 30000 }); await expect(button(page, 'Undo')).toBeDisabled(); await expect(button(page, 'Redo')).toBeDisabled();
    await expect(page.locator('canvas[role="img"]')).toHaveCount(1); const restored = await saved(page, record.name); expect(restored.payloadSha256).toBe(record.payloadSha256); expect(restored.metadata).toEqual(record.metadata); expect(restored.id).toBe(record.id);
  }
  await toolsPanel(page, true); const options = await page.getByLabel('Saved maps', { exact: true }).locator('option').allTextContents(); expect(options).toHaveLength(4);
  expect(options.some((s) => s.includes('Bounded plane'))).toBe(true); expect(options.some((s) => s.includes('Wrapped plane'))).toBe(true); expect(options.some((s) => s.includes('Sphere'))).toBe(true);
  await page.screenshot({ path: `docs/evidence/a6-f1-${info.project.name}-mixed-library.png` });
  await writeFile(`docs/evidence/a6-f1-${info.project.name}-workflow.json`, JSON.stringify({ viewport: page.viewportSize(), records: records.map(({ id, name, version, payloadSha256, bytes }) => ({ id, name, version, payloadSha256, bytes })), exactHistory: true, oneActiveCanvas: true, viewConversion: false, allFourToolsPerSupportedView: true }, null, 2));
});

test('cross-shape New/Open cancellation, corrupt data and storage failures retain the current document and history', async ({ page }) => {
  test.setTimeout(120000); await page.goto('/'); await createWorld(page, 'bounded', { name: 'Source plane' }); const source = await saved(page, 'Source plane');
  await page.evaluate(async () => { const storage = await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as Storage; await storage.seed(); await storage.corrupt('bad-shape', 'shape'); });
  await toolsPanel(page, true); await button(page, 'Refresh maps').click(); await toolsPanel(page, false); await paint(page);
  for (const id of ['bad-shape', 'rich-sphere']) {
    const cancel = id === 'rich-sphere' ? page.waitForEvent('dialog').then((d) => d.dismiss()) : null; await open(page, id); if (cancel) await cancel;
    await expect(button(page, 'Open Map')).toBeEnabled({ timeout: 30000 }); await expect(main(page)).toHaveAttribute('data-world-shape', 'bounded'); await expect(button(page, 'Undo')).toBeEnabled(); await expect(work(page)).toHaveText('Unsaved changes');
    if (id === 'bad-shape') { await expect(page.getByRole('alert')).toBeVisible(); await button(page, 'Dismiss').click(); }
  }
  await button(page, 'New World / Map').click(); await page.getByLabel('World shape', { exact: true }).selectOption('sphere'); await page.getByLabel('Sphere reference radius (m)', { exact: true }).fill('1000000');
  const cancel = page.waitForEvent('dialog').then((d) => d.dismiss()); await button(page, 'Create World / Map').click(); await cancel; await button(page, 'Cancel').click();
  await button(page, 'Undo').click(); expect((await saved(page, 'Source plane')).payloadSha256).toBe(source.payloadSha256);
  await open(page, 'rich-sphere'); await expect(main(page)).toHaveAttribute('data-world-shape', 'sphere'); await paint(page, true);
  const stay = page.waitForEvent('dialog').then((d) => d.dismiss()); await open(page, source.id); await stay; await expect(main(page)).toHaveAttribute('data-world-shape', 'sphere'); await expect(button(page, 'Undo')).toBeEnabled();
  await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as Storage).fault('denied'));
  await button(page, 'Save').click(); await expect(work(page)).toHaveText('Unsaved changes'); await expect(page.getByRole('alert')).toContainText('Storage denied'); await expect(button(page, 'Undo')).toBeEnabled();
  await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as Storage).fault('none')); await saved(page, 'Rich signed sphere');
  await expect(page.locator('canvas[role="img"]')).toHaveCount(1);
});

test('desktop, ultrawide, square and tall views preserve proportions, context, fullscreen and geography', async ({ page }, info) => {
  test.setTimeout(120000); await page.goto('/'); await createWorld(page, 'wrapped', { name: 'Connected workspace' }); await paint(page); const record = await saved(page, 'Connected workspace');
  const results = [];
  for (const size of [{ width: 1440, height: 900 }, { width: 3440, height: 1440 }, { width: 900, height: 900 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(size); await button(page, 'Focus Editing').click(); await frames(page);
    const geometry = await page.getByRole('img', { name: 'Atlas terrain map' }).evaluate((e) => { const c = e as HTMLCanvasElement; return { mapWidth: Number(c.dataset.mapWidth), mapHeight: Number(c.dataset.mapHeight), stageWidth: innerWidth, stageHeight: innerHeight }; });
    expect(geometry.mapWidth / geometry.mapHeight).toBeCloseTo(1, 4); if (size.width / size.height > 1.3 && size.width / size.height < 3) expect(geometry.mapWidth / size.width).toBeCloseTo(.82, 2);
    for (const mode of ['Fill View', 'Fit Entire Map', 'Focus Editing']) { await button(page, mode).click(); await frames(page); expect((await saved(page, 'Connected workspace')).payloadSha256).toBe(record.payloadSha256); }
    await toolsPanel(page, true); await expect(page.getByRole('heading', { name: 'Atlas', exact: true })).toBeFocused(); await page.keyboard.press('Escape'); await expect(button(page, 'Open tools')).toBeFocused();
    await page.screenshot({ path: `docs/evidence/a6-f1-${info.project.name}-${size.width}x${size.height}.png` }); results.push({ size, geometry });
  }
  if (await button(page, 'Enter Fullscreen').count()) { await button(page, 'Enter Fullscreen').click(); await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true); await button(page, 'Exit Fullscreen').click(); await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false); }
  expect((await saved(page, 'Connected workspace')).payloadSha256).toBe(record.payloadSha256);
  await writeFile(`docs/evidence/a6-f1-${info.project.name}-viewports.json`, JSON.stringify(results, null, 2));
});
