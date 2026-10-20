import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { toolsPanel, createWorld, startAtlas, sphericalPresentation } from './workspace-helpers.ts';
type Host = typeof import('./fixtures/sphere-storage.ts');
const button = (p: Page, name: string) => p.getByRole('button', { name, exact: true });
const globe = (p: Page) => p.getByRole('img', { name: 'Atlas spherical terrain map', exact: true });
const status = (p: Page) => p.getByLabel('Map work status', { exact: true });
const summary = (p: Page, id?: string) => p.evaluate(async (id) => (await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as Host).summary(id), id);
async function frame(p: Page) { await p.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))); await sphericalPresentation(p); }
async function enter(p: Page, n = 128) { await p.goto('/'); await createWorld(p, 'sphere', { n }); await expect(globe(p)).toHaveAttribute('data-mode', 'globe', { timeout: 30000 }); }
async function panel(p: Page, action: () => Promise<void>) { await toolsPanel(p, true); await action(); await toolsPanel(p, false); }
async function name(p: Page, value: string) { await panel(p, () => p.getByLabel('Map name', { exact: true }).fill(value)); }
async function save(p: Page) { await button(p, 'Save').click(); await expect(status(p)).toHaveText('Saved on this device', { timeout: 30000 }); }
async function paint(p: Page, tool = 'Raise') { const s = p.viewportSize()!, x = Math.round(s.width / 2), y = Math.round(s.height / 2); await button(p, tool).click(); await p.mouse.move(x - 30, y); await p.mouse.down(); await p.mouse.move(x + 35, y + 15, { steps: 5 }); await p.mouse.up(); await expect(globe(p)).toHaveAttribute('data-processing', 'false'); await frame(p); }
async function openLibrary(p: Page, id: string) { await toolsPanel(p, true); await p.getByLabel('Saved maps', { exact: true }).selectOption(id); await button(p, 'Open Map').click(); await expect(globe(p)).toHaveAttribute('data-mode', 'globe', { timeout: 30000 }); }
test.use({ trace: 'on' });
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', (e) => list.push(e.message)); });
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

test('actual UI: blank and sculpted sphere survives reload, reopens exact geography and continues all four tools', async ({ page }, info) => {
  test.setTimeout(120000); await enter(page); await name(page, 'Persistent continent'); await save(page);
  const blank = await summary(page); expect(blank.version).toBe(3); expect(blank.bytes).toBe(393224);
  await page.screenshot({ path: `docs/evidence/a6-e-${info.project.name}-blank-saved.png` });
  await panel(page, async () => { await page.getByLabel('Spherical brush radius (m)', { exact: true }).fill('200000'); await page.getByLabel('Spherical strength (m/dab)', { exact: true }).fill('1400'); });
  const s = page.viewportSize()!, x = s.width / 2, y = Math.round(s.height / 2), radius = Math.min(s.width, s.height) * .42;
  await page.mouse.move(x - .4 * radius, y - .1 * radius); await page.mouse.down(); await page.mouse.move(x + .3 * radius, y + .1 * radius, { steps: 12 }); await page.mouse.up(); await save(page);
  const sculpted = await summary(page); expect(sculpted.payloadSha256).not.toBe(blank.payloadSha256);
  await page.screenshot({ path: `docs/evidence/a6-e-${info.project.name}-continent-saved.png` });
  await page.reload(); await openLibrary(page, sculpted.id); await expect(status(page)).toHaveText('Saved on this device');
  await expect(button(page, 'Undo')).toBeDisabled(); await expect(button(page, 'Redo')).toBeDisabled();
  await save(page); const restored = await summary(page); expect(restored.payloadSha256).toBe(sculpted.payloadSha256); expect(restored.metadata).toEqual(sculpted.metadata);
  await button(page, 'Six-face net').click(); await frame(page); await page.screenshot({ path: `docs/evidence/a6-e-${info.project.name}-reopened-net.png` });
  await button(page, 'Globe').click(); await button(page, 'Rotate / Pan').click(); await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 25, y + 12, { steps: 4 }); await page.mouse.up(); await save(page);
  expect((await summary(page)).payloadSha256).toBe(sculpted.payloadSha256);
  for (const tool of ['Raise', 'Lower', 'Smooth', 'Flatten']) {
    if (tool === 'Flatten') { await button(page, tool).click(); await panel(page, () => page.getByLabel('Spherical target elevation (m)', { exact: true }).fill('1800')); }
    await paint(page, tool); await expect(button(page, 'Undo')).toBeEnabled(); await button(page, 'Undo').click(); await button(page, 'Redo').click(); await save(page);
  }
  const continued = await summary(page); expect(continued.payloadSha256).not.toBe(restored.payloadSha256); expect(continued.metadata).toEqual(restored.metadata);
  await page.screenshot({ path: `docs/evidence/a6-e-${info.project.name}-continued-editing.png` });
});

test('Ctrl-S while a real brush is held drains queued input exactly; saved/modified/name checkpoints and unload guards work', async ({ page }) => {
  test.setTimeout(60000); await enter(page); await name(page, 'Queued input'); const size = page.viewportSize()!, y = Math.round(size.height / 2), a = { x: Math.round(size.width / 2 - 55), y }, b = { x: Math.round(size.width / 2 + 55), y };
  const expected = await page.evaluate(async ({ a, b, size }) => (await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as Host).expectedStroke(a, b, size), { a, b, size });
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y); await page.keyboard.press('Control+s'); await page.mouse.up();
  await expect(status(page)).toHaveText('Saved on this device', { timeout: 30000 }); expect((await summary(page)).payloadSha256).toBe(expected);
  await button(page, 'Undo').click(); await expect(status(page)).toContainText('Unsaved changes'); await button(page, 'Redo').click(); await expect(status(page)).toHaveText('Saved on this device');
  await name(page, 'Renamed unsaved sphere'); await expect(status(page)).toContainText('Unsaved changes');
  await toolsPanel(page, true); await button(page, 'New World / Map').click(); const discard = page.waitForEvent('dialog').then((d) => d.dismiss()); await button(page, 'Create World / Map').click(); await discard; await button(page, 'Cancel').click(); await toolsPanel(page, false); await expect(globe(page)).toBeVisible();
  const unload = page.waitForEvent('dialog').then((d) => { expect(d.type()).toBe('beforeunload'); return d.dismiss(); }); await page.evaluate(() => location.reload()); await unload;
  await save(page); expect((await summary(page)).name).toBe('Renamed unsaved sphere');
});

test('existing DB v1 and mixed library preserve legacy records; spherical signed-zero/edge/corner restoration and overwrite guards', async ({ page }) => {
  test.setTimeout(90000); await page.goto('/');
  const seeded = await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as Host).seed()); await page.reload();
  await openLibrary(page, 'rich-sphere'); await expect(globe(page)).toHaveAttribute('data-radius', '735000'); await save(page);
  const after = await summary(page, 'rich-sphere'); expect(after.payloadSha256).toBe(seeded.sphere.payloadSha256); expect(after.metadata).toEqual(seeded.sphere.metadata); expect(after.firstWords).toEqual(seeded.sphere.firstWords);
  await toolsPanel(page, true);
  const options = await page.getByLabel('Saved maps', { exact: true }).locator('option').allTextContents(); expect(options.some((v) => v.includes('Rich signed sphere · Sphere'))).toBe(true); expect(options.some((v) => v.includes('Legacy bounded · Planar (legacy)'))).toBe(true);
  for (const id of ['legacy-bounded', 'legacy-wrapped']) { await toolsPanel(page, true); await page.getByLabel('Saved maps', { exact: true }).selectOption(id); await button(page, 'Open Map').click(); await expect(page.getByRole('img', { name: 'Atlas terrain map', exact: true })).toBeVisible(); }
  const retained = await summary(page, 'legacy-bounded'), wrapped = await summary(page, 'legacy-wrapped'); expect({ ...retained, catalog: [] }).toEqual({ ...seeded.bounded, catalog: [] }); expect({ ...wrapped, catalog: [] }).toEqual({ ...seeded.wrapped, catalog: [] });
  for (const id of ['legacy-bounded', 'legacy-wrapped']) expect(retained.catalog.find((row) => row.id === id)).toEqual(seeded.bounded.catalog.find((row) => row.id === id));
  const proof = await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as Host).overwriteProof()); expect(proof.failures).toHaveLength(3); expect(proof.unchanged).toBe(true);
});

test('quota, interrupted transaction and storage denial retain edits and old saves; bad opens and discard cancellation preserve active sphere', async ({ page }) => {
  test.setTimeout(120000); await enter(page); await name(page, 'Failure-safe sphere'); await paint(page); await save(page); const saved = await summary(page);
  for (const mode of ['quota', 'abort', 'denied'] as const) {
    await paint(page); await page.evaluate(async (mode) => (await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as Host).fault(mode), mode);
    await button(page, 'Save').click(); await expect(status(page)).toHaveText('Unsaved changes', { timeout: 30000 }); await expect(page.getByRole('alert')).toBeVisible();
    await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as Host).fault('none'));
    const retained = await summary(page); expect(retained.payloadSha256).toBe(saved.payloadSha256); expect(retained.checksum).toBe(saved.checksum); expect(retained.catalog.find((row) => row.id === saved.id)).toEqual(saved.catalog.find((row) => row.id === saved.id)); await expect(button(page, 'Undo')).toBeEnabled();
    await button(page, 'Undo').click(); await button(page, 'Redo').click();
  }
  await save(page); const edited = await summary(page); expect(edited.payloadSha256).not.toBe(saved.payloadSha256);
  await page.evaluate(async () => { const host = await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as Host; await host.seed(); for (const mode of ['checksum', 'future', 'shape'] as const) await host.corrupt(`bad-${mode}`, mode); });
  await toolsPanel(page, true); await button(page, 'Refresh maps').click();
  for (const id of ['bad-checksum', 'bad-future', 'bad-shape']) { await page.getByLabel('Saved maps', { exact: true }).selectOption(id); await button(page, 'Open Map').click(); await expect(button(page, 'Open Map')).toBeEnabled({ timeout: 30000 }); await expect(page.getByRole('alert')).toBeVisible(); await expect(globe(page)).toHaveAttribute('data-radius', '1000000'); }
  await toolsPanel(page, false); await save(page); expect((await summary(page, edited.id)).payloadSha256).toBe(edited.payloadSha256);
  await paint(page); await toolsPanel(page, true); await page.getByLabel('Saved maps', { exact: true }).selectOption('rich-sphere');
  const cancel = page.waitForEvent('dialog').then((d) => d.dismiss()); await button(page, 'Open Map').click(); await cancel; await expect(globe(page)).toHaveAttribute('data-radius', '1000000');
  await toolsPanel(page, false); await save(page); expect((await summary(page, edited.id)).metadata).toEqual(edited.metadata);
});

for (const n of [128, 256]) test(`real IndexedDB persistence timing, responsiveness and memory payloads N=${n}`, async ({ page, context }, info) => {
  test.setTimeout(120000); await startAtlas(page); const cdp = await context.newCDPSession(page); if (info.project.name === 'mobile') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const result = await page.evaluate(async (n) => (await import(new URL('/tests/fixtures/workspace-storage.ts', location.origin).href) as typeof import('./fixtures/workspace-storage.ts')).benchmarkWorkspace(n), n);
  expect(result.exact).toBe(true); expect(result.metadataExact).toBe(true); expect(result.databaseVersion).toBe(1); expect(result.ticks).toBeGreaterThan(1);
  await page.reload(); await openLibrary(page, `performance-${n}`); await expect(status(page)).toHaveText('Saved on this device');
  const preparationMs = Number(await globe(page).getAttribute('data-preparation-ms')), maxPreparationTaskMs = Number(await globe(page).getAttribute('data-preparation-max-task-ms'));
  await save(page); expect((await summary(page, `performance-${n}`)).bytes).toBe((6 * n * n + 2) * 4);
  await writeFile(`docs/evidence/a6-e-${info.project.name}-n${n}-persistence.json`, JSON.stringify({ ...result, actualAppTexturePreparationMs: preparationMs, actualAppMaxPreparationTaskMs: maxPreparationTaskMs, viewport: page.viewportSize(), cpuThrottle: info.project.name === 'mobile' ? 4 : 1, method: 'Real IndexedDB version-1 database, v3 checksummed payload, cooperative validation/restore/cache, then actual App Open/Save. Timings include cooperative waits. Typed payload accounting excludes JS/GC/Canvas/browser overhead and is not process RSS. Pixel 7 is emulation, not physical hardware.' }, null, 2));
});
