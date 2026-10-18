import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { toolsPanel } from './workspace-helpers.ts';

const globe = (page: Page) => page.getByRole('img', { name: 'Spherical terrain preview', exact: true });
const readout = (page: Page) => page.getByLabel('Spherical elevation', { exact: true });
async function painted(page: Page) { await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function fixture(page: Page, n = 128) { await page.goto(`/tests/fixtures/sphere.html?n=${n}`); await expect(globe(page)).toHaveAttribute('data-mode', 'globe', { timeout: 30000 }); }
async function stats(page: Page) { return page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere.tsx', location.origin).href) as typeof import('./fixtures/sphere.tsx')).statistics()); }
async function snapshotCanvas(page: Page) {
  return page.getByRole('img', { name: 'Atlas terrain map', exact: true }).evaluate(async (element) => {
    const canvas = element as HTMLCanvasElement, data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    return { digest: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer))).join(','), left: canvas.dataset.mapLeft, top: canvas.dataset.mapTop, width: canvas.dataset.mapWidth, mode: canvas.dataset.viewMode };
  });
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', (e) => list.push(e.message)); });
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

for (const wrapped of [false, true]) test(`historical overlay host: explicit session-only preview preserves ${wrapped ? 'wrapped Focus' : 'bounded'} unsaved map, camera and pending Redo`, async ({ page }, info) => {
  test.setTimeout(60000); await page.goto('/tests/fixtures/legacy.html');
  if (wrapped) { await toolsPanel(page, true); await page.getByRole('button', { name: 'New Wrapped Map', exact: true }).click(); await toolsPanel(page, false); }
  const size = page.viewportSize()!;
  await page.mouse.click(size.width * .45, size.height * .45); await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
  await page.mouse.click(size.width * .55, size.height * .5); await page.mouse.click(size.width * .65, size.height * .55);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Redo', exact: true })).toBeEnabled();
  const before = await snapshotCanvas(page);
  await toolsPanel(page, true);
  const open = page.getByRole('button', { name: 'Open spherical preview', exact: true }); await expect(open).toBeDisabled();
  await page.getByRole('spinbutton', { name: 'Sphere reference radius (m)', exact: true }).fill('1234567'); await open.click();
  await expect(globe(page)).toHaveAttribute('data-mode', 'globe', { timeout: 30000 });
  await expect(globe(page)).toHaveAttribute('data-samples', '98306'); await expect(globe(page)).toHaveAttribute('data-radius', '1234567');
  await expect(page.getByText('Session-only · viewing and inspection', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
  await page.keyboard.press('Control+s'); await expect(page.getByRole('alert')).toContainText('session-only'); await page.getByRole('button', { name: 'Dismiss preview message' }).click();
  if (wrapped) {
    await page.screenshot({ path: `docs/evidence/a6-d1-${info.project.name}-globe-px.png` });
    await page.getByRole('button', { name: 'View controls', exact: true }).click();
    for (const face of ['nx', 'pz']) {
      await page.getByRole('button', { name: `View ${face}`, exact: true }).click(); await page.getByRole('button', { name: 'Close view controls', exact: true }).click(); await painted(page);
      await page.screenshot({ path: `docs/evidence/a6-d1-${info.project.name}-globe-${face}.png` });
      await page.getByRole('button', { name: 'View controls', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Close view controls', exact: true }).click();
    await page.getByRole('button', { name: 'Six-face net', exact: true }).click(); await painted(page);
    await page.screenshot({ path: `docs/evidence/a6-d1-${info.project.name}-net.png` });
  }
  await page.getByRole('button', { name: 'Return to map', exact: true }).click();
  await expect(open).toBeFocused(); await toolsPanel(page, false); expect(await snapshotCanvas(page)).toEqual(before);
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Redo', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Redo', exact: true }).click(); expect(await snapshotCanvas(page)).not.toEqual(before);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); expect(await snapshotCanvas(page)).toEqual(before);
});

test('real viewport: every face, edge and corner is inspectable in both views with canonical readouts and invalid gaps', async ({ page }) => {
  test.setTimeout(60000); await fixture(page);
  const directions = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [1, 2, 3], [1e-9, 0, 1]];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) directions.push([x, y, z]);
  for (const zero of [0, 1, 2]) for (const a of [-1, 1]) for (const b of [-1, 1]) { const d = [a, b]; d.splice(zero, 0, 0); directions.push(d); }
  await page.getByRole('button', { name: 'Six-face net', exact: true }).click(); await painted(page);
  for (const direction of directions) {
    const data = await page.evaluate(async (input) => {
      const host = await import(new URL('/tests/fixtures/sphere.tsx', location.origin).href) as typeof import('./fixtures/sphere.tsx'), d = input as [number, number, number];
      return host.project(d).map((p) => host.clickTarget(d, p.face));
    }, direction);
    for (const point of data) {
      await page.mouse.click(point.x, point.y); await painted(page);
      await expect(readout(page)).toHaveAttribute('data-sample', String(point.sample.key.index)); await expect(readout(page)).toHaveAttribute('data-elevation', String(point.sample.elevation));
    }
    await page.getByRole('button', { name: 'Center selection', exact: true }).click(); await painted(page);
    await globe(page).focus(); await page.keyboard.press('Enter'); await painted(page);
    await expect(readout(page)).toHaveAttribute('data-sample', String(data.at(-1)!.sample.key.index));
    await page.getByRole('button', { name: 'Six-face net', exact: true }).click(); await painted(page);
  }
  await page.mouse.click(5, Math.round(page.viewportSize()!.height / 2)); await painted(page); await expect(readout(page)).toContainText('Outside spherical surface');
  await expect(page.getByRole('button', { name: 'Center selection', exact: true })).toBeDisabled();
  expect((await stats(page)).exactBitsUnchanged).toBe(true); expect((await stats(page)).copies).toBe(0);
});

test('historical N=256 preview validates scale, cancels preparation safely and initializes in scheduled batches', async ({ page }, info) => {
  test.setTimeout(60000); await page.goto('/tests/fixtures/legacy.html'); await toolsPanel(page, true);
  const radius = page.getByRole('spinbutton', { name: 'Sphere reference radius (m)', exact: true }), open = page.getByRole('button', { name: 'Open spherical preview', exact: true });
  for (const value of ['0', '-1', '']) { await radius.fill(value); await expect(open).toBeDisabled(); }
  await radius.fill('735000'); await page.getByRole('button', { name: 'Preview N=256', exact: true }).click();
  await open.click(); await page.getByRole('button', { name: 'Return to map', exact: true }).click(); await expect(open).toBeFocused();
  await open.click(); await expect(globe(page)).toHaveAttribute('data-resolution', '256', { timeout: 30000 });
  await expect(globe(page)).toHaveAttribute('data-samples', '393218'); await expect(globe(page)).toHaveAttribute('data-authority-bytes', '1572872');
  const preparationMs = Number(await globe(page).getAttribute('data-preparation-ms'));
  await writeFile(`docs/evidence/a6-d1-${info.project.name}-product-preparation.json`, JSON.stringify({ n: 256, radiusMeters: 735000, preparationMs, method: 'Actual app; 4096-sample batches then one display face per animation frame; wall time includes yields. Cancel/reopen verified.' }, null, 2));
  await page.getByRole('button', { name: 'Return to map', exact: true }).click(); await expect(open).toBeFocused();
});

test('mouse, keyboard, native touch/pinch, cancellation, net pan, fullscreen and selection preserve geography', async ({ page, context }, info) => {
  await fixture(page); const canvas = globe(page), size = page.viewportSize()!, before = await stats(page), frame = await canvas.getAttribute('data-frame');
  await page.mouse.move(size.width / 2, size.height / 2); await page.mouse.down(); await page.mouse.move(size.width / 2 + 80, size.height / 2 + 60, { steps: 8 }); await page.mouse.up(); await painted(page);
  expect(await canvas.getAttribute('data-frame')).not.toBe(frame);
  await canvas.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('+'); await painted(page); await expect(canvas).toHaveAttribute('data-zoom', '1.25');
  await page.keyboard.press('Home'); await painted(page); await expect(canvas).toHaveAttribute('data-zoom', '1');
  if (info.project.name === 'mobile') {
    const cdp = await context.newCDPSession(page), y = size.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: y + 30, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await painted(page);
    expect(await canvas.getAttribute('data-frame')).not.toBe(frame);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y, id: 1 }, { x: 230, y, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 120, y, id: 1 }, { x: 260, y, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await painted(page);
    expect(Number(await canvas.getAttribute('data-zoom'))).toBeGreaterThan(1);
  }
  await page.mouse.move(size.width / 2, size.height / 2); await page.mouse.down(); await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(canvas).toHaveAttribute('data-dragging', 'false');
  await page.getByRole('button', { name: 'Six-face net', exact: true }).click(); await page.getByRole('button', { name: 'Spherical Zoom In', exact: true }).click();
  const pan = await canvas.getAttribute('data-pan'); await canvas.focus(); await page.keyboard.press('ArrowRight'); await painted(page); expect(await canvas.getAttribute('data-pan')).not.toBe(pan);
  const full = page.getByRole('button', { name: 'Spherical Fullscreen', exact: true });
  if (await full.count()) { await full.click(); await page.getByRole('button', { name: 'Exit Spherical Fullscreen', exact: true }).click(); }
  const after = await stats(page); expect(after.exactBitsUnchanged).toBe(true); expect(after.currentRevision).toBe(before.revision); expect(after.metadataSame).toBe(true);
  await page.getByRole('button', { name: 'Globe', exact: true }).click();
  for (const viewport of [{ width: 3440, height: 1440 }, { width: 900, height: 900 }, { width: 412, height: 839 }]) {
    await page.setViewportSize(viewport); await painted(page); await canvas.focus(); await page.keyboard.press('Enter'); await painted(page);
    const data = await canvas.evaluate((element) => ({ pixels: (element as HTMLCanvasElement).width * (element as HTMLCanvasElement).height, frame: JSON.parse((element as HTMLElement).dataset.frame!) }));
    expect(data.pixels).toBeLessThanOrEqual(3_000_000);
    const direction = JSON.parse((await readout(page).getAttribute('data-direction'))!) as number[];
    expect(Math.hypot(...direction.map((v, i) => v - data.frame.forward[i]))).toBeLessThan(1e-10);
  }
});

for (const n of [128, 256]) test(`real browser performance: N=${n} rotation, zoom and view switching use caches and bounded frame work`, async ({ page, context }, info) => {
  test.setTimeout(90000); await fixture(page, n); const canvas = globe(page), size = page.viewportSize()!;
  const cdp = await context.newCDPSession(page); const cpuRate = info.project.name === 'mobile' ? 4 : 1;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
  const startRenders = Number(await canvas.getAttribute('data-renders')), measures: { action: string; renderMs: number }[] = [];
  const measure = async (action: string, run: () => Promise<unknown>) => { await run(); await painted(page); const times = JSON.parse((await canvas.getAttribute('data-render-times'))!); measures.push({ action, renderMs: times.at(-1) as number }); };
  await page.mouse.move(size.width / 2, size.height / 2); await page.mouse.down();
  for (let i = 0; i < 16; i++) await measure('rotate', () => page.mouse.move(size.width / 2 + Math.sin(i / 3) * 100, size.height / 2 + Math.cos(i / 3) * 70));
  await page.mouse.up();
  for (let i = 0; i < 4; i++) await measure('zoom', () => page.getByRole('button', { name: i % 2 ? 'Spherical Zoom Out' : 'Spherical Zoom In', exact: true }).click());
  for (let i = 0; i < 6; i++) await measure('switch', () => page.getByRole('button', { name: i % 2 ? 'Globe' : 'Six-face net', exact: true }).click());
  const rendersBeforeBurst = Number(await canvas.getAttribute('data-renders'));
  await page.mouse.move(size.width / 2, size.height / 2); await page.mouse.down();
  await canvas.evaluate((element) => {
    const c = element as HTMLCanvasElement, r = c.getBoundingClientRect();
    for (let i = 0; i < 100; i++) c.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, button: 0, clientX: r.width / 2 + i, clientY: r.height / 2, bubbles: true }));
  }); await page.mouse.up(); await painted(page);
  const renderedDuringBurst = Number(await canvas.getAttribute('data-renders')) - rendersBeforeBurst;
  const result = await stats(page), sorted = measures.map((m) => m.renderMs).sort((a, b) => a - b), p95 = sorted[Math.floor(sorted.length * .95)]!;
  expect(result.exactBitsUnchanged).toBe(true); expect(result.copies).toBe(0); expect(result.reads).toBeLessThan(200); expect(renderedDuringBurst).toBeLessThanOrEqual(2);
  expect(result.cacheBytes).toBeLessThanOrEqual(6 * 513 * 513 * 4); expect(p95).toBeLessThan(cpuRate === 1 ? 200 : 500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await writeFile(`docs/evidence/a6-d1-${info.project.name}-n${n}-performance.json`, JSON.stringify({ measuredAt: new Date().toISOString(), browserVersion: context.browser()?.version(), browserProject: info.project.name, viewport: size, cpuRate, n, ...result, startRenders, finalRenders: Number(await canvas.getAttribute('data-renders')), renderedDuring100EventBurst: renderedDuringBurst, rasterBytes: Number(await canvas.getAttribute('data-raster-bytes')), p95RenderMs: p95, measures }, null, 2));
});
