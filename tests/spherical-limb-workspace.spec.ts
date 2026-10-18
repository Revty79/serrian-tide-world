import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { createWorld, toolsPanel } from './workspace-helpers.ts';
import type { SphericalBrushSettings } from '../src/terrain/spherical-brush.ts';
import type { Vec3 } from '../src/surfaces/cube-sphere.ts';
type Observer = typeof import('./fixtures/limb-workspace.ts');
type Storage = typeof import('./fixtures/sphere-storage.ts');
const button = (p: Page, name: string) => p.getByRole('button', { name, exact: true });
const canvas = (p: Page) => p.getByRole('img', { name: 'Atlas spherical terrain map', exact: true });
const status = (p: Page) => p.getByLabel('Map work status', { exact: true });
const brush: SphericalBrushSettings = { tool: 'raise', radiusMeters: 80000, strengthMeters: 1200 };
async function settings(p: Page, values: Record<string, string> = {}) { await toolsPanel(p, true); for (const [name, value] of Object.entries(values)) await p.getByLabel(name, { exact: true }).fill(value); await toolsPanel(p, false); }
async function saved(p: Page) { await button(p, 'Save').click(); await expect(status(p)).toHaveText('Saved on this device', { timeout: 30000 }); return p.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as Storage).summary()); }
async function setup(p: Page, n = 128) { await p.goto('/'); await createWorld(p, 'sphere', { name: `Limb N${n}`, n }); await settings(p, { 'Spherical strength (m/dab)': '1200' }); await expect(canvas(p)).toHaveAttribute('data-mode', 'globe'); }
function limb(p: Page) { const s = p.viewportSize()!; return { x: s.width / 2 + .98 * Math.min(s.width, s.height) * .42, y: s.height / 2 }; }
async function idle(p: Page) { await expect(canvas(p)).toHaveAttribute('data-processing', 'false', { timeout: 30000 }); }
async function waitRotation(p: Page, radians = .32) { await expect.poll(async () => Number(await canvas(p).getAttribute('data-limb-radians')), { timeout: 30000 }).toBeGreaterThan(radians); }
async function stopped(p: Page) { await idle(p); const count = await canvas(p).getAttribute('data-limb-steps'); await p.waitForTimeout(450); expect(await canvas(p).getAttribute('data-limb-steps')).toBe(count); await expect(canvas(p)).toHaveAttribute('data-limb-assisting', 'false'); }
test.use({ trace: 'on' });
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => { const list: string[] = []; errors.set(page, list); page.on('pageerror', (e) => list.push(e.message)); });
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

for (const n of [128, 256]) test(`unified held limb stroke N${n}: native input, dynamic visibility, exact samples/history and Save/Open`, async ({ page, context }, info) => {
  test.setTimeout(120000); await setup(page, n); const blank = await saved(page), point = limb(page);
  const cdp = await context.newCDPSession(page), mobile = info.project.name === 'mobile';
  if (mobile) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.mouse.move(point.x, point.y);
  await page.evaluate(async () => (await import(new URL('/tests/fixtures/limb-workspace.ts', location.origin).href) as Observer).observe());
  if (mobile) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x - 8, y: point.y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 1 }] });
  } else await page.mouse.down();
  await waitRotation(page);
  const heldPerformance = await page.evaluate(async () => (await import(new URL('/tests/fixtures/limb-workspace.ts', location.origin).href) as Observer).measurements());
  await page.screenshot({ path: `docs/evidence/a6-d2-r-${info.project.name}-n${n}-held.png` });
  if (mobile) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.mouse.up();
  await stopped(page);
  const trace = await page.evaluate(async () => (await import(new URL('/tests/fixtures/limb-workspace.ts', location.origin).href) as Observer).finish());
  await expect(canvas(page)).toHaveAttribute('data-history-entries', '1');
  const render = await canvas(page).evaluate((c) => ({ renderTimes: JSON.parse((c as HTMLElement).dataset.renderTimes!), statistics: JSON.parse((c as HTMLElement).dataset.editStatistics!), brushLatencies: JSON.parse((c as HTMLElement).dataset.brushLatencies!), radians: Number((c as HTMLElement).dataset.limbRadians) }));
  const record = await saved(page), proof = await page.evaluate(async ({ id, brush }) => (await import(new URL('/tests/fixtures/limb-workspace.ts', location.origin).href) as Observer).compare(id, brush), { id: record.id, brush });
  expect(proof.mismatches).toBe(0); expect(proof.hidden).toBe(0); expect(proof.newlyExposed).toBeGreaterThan(0); expect(proof.changed).toBeGreaterThan(0);
  expect(proof.sampleCount).toBe(6 * n * n + 2); expect(proof.dabs).toBeGreaterThan(10); expect(proof.serials).toEqual(Array.from({ length: proof.stepCount }, (_, i) => i + 1));
  await button(page, 'Undo').click(); expect((await saved(page)).payloadSha256).toBe(blank.payloadSha256); await expect(button(page, 'Undo')).toBeDisabled();
  await button(page, 'Redo').click(); expect((await saved(page)).payloadSha256).toBe(record.payloadSha256);
  await toolsPanel(page, true); await page.getByLabel('Saved maps', { exact: true }).selectOption(record.id); await button(page, 'Open Map').click(); await expect(status(page)).toHaveText('Saved on this device', { timeout: 30000 });
  expect((await saved(page)).payloadSha256).toBe(record.payloadSha256); await expect(button(page, 'Undo')).toBeDisabled();
  await page.screenshot({ path: `docs/evidence/a6-d2-r-${info.project.name}-n${n}-reopened.png` });
  await writeFile(`docs/evidence/a6-d2-r-${info.project.name}-n${n}-stroke.json`, JSON.stringify({ n, input: mobile ? 'native Chromium touch' : 'mouse', viewport: page.viewportSize(), cpuThrottle: mobile ? 4 : 1, proof, trace, heldPerformance, render, payloadSha256: record.payloadSha256, blankSha256: blank.payloadSha256, method: 'Real unified App. All canonical Float32 words compared with synchronous numerical replay; independent geometry/dab-visibility tests are separate. heldPerformance is observer start through rotation threshold before screenshot; full trace additionally includes screenshot and stopping checks. Pixel 7 emulation at 4x CPU throttle is not physical hardware.' }, null, 2));
});

for (const feature of ['seam', 'corner', 'pole'] as const) test(`assisted geographical continuity at a ${feature} under a manually rotated camera`, async ({ page }, info) => {
  await setup(page); await canvas(page).focus(); for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  const point = await page.evaluate(async (feature) => {
    const { createSphericalTerrain } = await import(new URL('/src/terrain/spherical.ts', location.origin).href) as typeof import('../src/terrain/spherical.ts');
    const { projectSphere } = await import(new URL('/src/rendering/spherical-view.ts', location.origin).href) as typeof import('../src/rendering/spherical-view.ts');
    const c = document.querySelector('canvas')!, f = JSON.parse(c.dataset.frame!), t = createSphericalTerrain({ terrainId: 'locate', identity: { worldId: 'locate', surfaceId: 'sphere' }, radiusMeters: 1000000, cellsPerEdge: 8 });
    return projectSphere(t, (feature === 'seam' ? [1, 1, .2] : feature === 'corner' ? [1, 1, 1] : [.05, .04, 1]) as Vec3, { mode: 'globe', frame: f, zoom: 1, pan: { x: 0, y: 0 } }, { width: innerWidth, height: innerHeight })[0]!;
  }, feature);
  await page.mouse.move(point.x, point.y); await page.evaluate(async () => (await import(new URL('/tests/fixtures/limb-workspace.ts', location.origin).href) as Observer).observe());
  await page.mouse.down(); await waitRotation(page, .04); await page.mouse.up(); await stopped(page);
  const trace = await page.evaluate(async () => (await import(new URL('/tests/fixtures/limb-workspace.ts', location.origin).href) as Observer).finish()), record = await saved(page);
  const proof = await page.evaluate(async ({ id, brush }) => (await import(new URL('/tests/fixtures/limb-workspace.ts', location.origin).href) as Observer).compare(id, brush), { id: record.id, brush });
  expect(proof.mismatches).toBe(0); expect(proof.hidden).toBe(0); if (feature !== 'pole') expect(proof.changedFaces.length).toBeGreaterThanOrEqual(feature === 'corner' ? 3 : 2);
  await writeFile(`docs/evidence/a6-d2-r-${info.project.name}-${feature}.json`, JSON.stringify({ feature, point, trace, proof }, null, 2));
});

test('native pen assistance stops on release and remains one exact operation', async ({ page, context }) => {
  await setup(page); const blank = await saved(page), p = limb(page), cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', buttons: 1, pointerType: 'pen' }); await waitRotation(page, .06);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', buttons: 0, pointerType: 'pen' }); await stopped(page);
  await expect(canvas(page)).toHaveAttribute('data-history-entries', '1'); const painted = await saved(page); expect(painted.payloadSha256).not.toBe(blank.payloadSha256);
  await button(page, 'Undo').click(); expect((await saved(page)).payloadSha256).toBe(blank.payloadSha256); await button(page, 'Redo').click(); expect((await saved(page)).payloadSha256).toBe(painted.payloadSha256);
});

for (const interruption of ['pointercancel', 'lostcapture', 'Space', 'navigation', 'blur', 'resize', 'wheel'] as const) test(`assistance stops on ${interruption} without damaging applied history`, async ({ page }) => {
  await setup(page); const blank = await saved(page), p = limb(page); await page.mouse.move(p.x, p.y); await page.mouse.down(); await waitRotation(page, .04);
  if (interruption === 'pointercancel') await canvas(page).dispatchEvent('pointercancel', { pointerId: 1 });
  if (interruption === 'lostcapture') await canvas(page).evaluate((c) => { if (c.hasPointerCapture(1)) c.releasePointerCapture(1); });
  if (interruption === 'Space') await page.keyboard.down('Space');
  if (interruption === 'navigation') await button(page, 'Rotate / Pan').evaluate((b: HTMLButtonElement) => b.click());
  if (interruption === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  if (interruption === 'resize') await page.setViewportSize({ width: page.viewportSize()!.width - 1, height: page.viewportSize()!.height });
  if (interruption === 'wheel') await page.mouse.wheel(0, -70);
  await stopped(page); await page.mouse.up(); if (interruption === 'Space') await page.keyboard.up('Space');
  await expect(canvas(page)).toHaveAttribute('data-history-entries', '1'); const painted = await saved(page);
  await button(page, 'Undo').click(); expect((await saved(page)).payloadSha256).toBe(blank.payloadSha256); await button(page, 'Redo').click(); expect((await saved(page)).payloadSha256).toBe(painted.payloadSha256);
});

test('native two-finger takeover stops assisted painting and continues globe navigation', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'mobile', 'Native touch requires the touch-enabled project');
  await setup(page); const cdp = await context.newCDPSession(page), p = limb(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x - 8, y: p.y, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, id: 1 }] }); await waitRotation(page, .04);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }, { x: p.x - 60, y: p.y, id: 2 }] }); await stopped(page);
  const revision = await canvas(page).getAttribute('data-revision'), frame = await canvas(page).getAttribute('data-frame');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x - 20, y: p.y + 10, id: 1 }, { x: p.x - 90, y: p.y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await stopped(page);
  expect(await canvas(page).getAttribute('data-frame')).not.toBe(frame); await expect(canvas(page)).toHaveAttribute('data-revision', revision!);
});

test('opt-out, actual limb at zoom, pole-facing orientation and preview follow physical geography', async ({ page }) => {
  await setup(page); await toolsPanel(page, true); await page.getByLabel('Assist drawing near the globe limb').uncheck(); await toolsPanel(page, false);
  let p = limb(page); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up(); expect(Number(await canvas(page).getAttribute('data-limb-steps'))).toBe(0);
  await toolsPanel(page, true); await page.getByLabel('Assist drawing near the globe limb').check(); await button(page, 'View pz').click(); await toolsPanel(page, false);
  await button(page, 'Zoom In').click();
  const s = page.viewportSize()!, r = Math.min(s.width, s.height) * .42 * 1.25;
  // A visible top limb on desktop; a visible side limb on narrow mobile.
  const phi = s.width > s.height ? Math.PI / 6 : 0;
  p = { x: s.width / 2 + r * .9 * Math.cos(phi), y: s.height / 2 - r * .9 * Math.sin(phi) };
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await waitRotation(page, .025); await page.mouse.up(); await stopped(page);
  const center = JSON.parse((await canvas(page).getAttribute('data-preview-center'))!) as Vec3, readout = page.getByLabel('Spherical elevation');
  await page.mouse.move(p.x, p.y); await expect(readout).toHaveAttribute('data-direction', /\[/);
  const inspected = JSON.parse((await readout.getAttribute('data-direction'))!) as Vec3; expect(Math.hypot(...center.map((v, i) => v - inspected[i]!))).toBeLessThan(1e-6);
});

for (const mode of ['Globe', 'Six-face net'] as const) test(`${mode}: contextual radius, strength, intensity and signed target update numerical response and preview`, async ({ page }, info) => {
  test.setTimeout(120000); await setup(page); await button(page, mode).click(); const record = await saved(page);
  const point = await page.evaluate(async (mode) => { if (mode === 'Globe') return { x: innerWidth / 2, y: innerHeight / 2 }; const { netFaceRect, INITIAL_SPHERICAL_VIEW } = await import(new URL('/src/rendering/spherical-view.ts', location.origin).href) as typeof import('../src/rendering/spherical-view.ts'); const r = netFaceRect('px', { ...INITIAL_SPHERICAL_VIEW, mode: 'net' }, { width: innerWidth, height: innerHeight }); return { x: r.x + r.side / 2, y: r.y + r.side / 2 }; }, mode);
  const results = [];
  for (const config of [
    { tool: 'raise', radiusMeters: 40000, strengthMeters: 100 }, { tool: 'raise', radiusMeters: 120000, strengthMeters: 700 }, { tool: 'lower', radiusMeters: 120000, strengthMeters: 700 },
    { tool: 'flatten', radiusMeters: 80000, intensity: 0, targetElevation: -3200 }, { tool: 'flatten', radiusMeters: 80000, intensity: 1, targetElevation: -3200 },
    { tool: 'smooth', radiusMeters: 80000, intensity: 0 }, { tool: 'smooth', radiusMeters: 80000, intensity: 1 },
  ] as SphericalBrushSettings[]) {
    // Smooth acts on an actual raised seed rather than a constant blank.
    if (config.tool === 'smooth') { await button(page, 'Raise').click(); await settings(page, { 'Spherical brush radius (m)': '40000', 'Spherical strength (m/dab)': '700' }); await page.mouse.click(point.x, point.y); await idle(page); await saved(page); }
    await page.evaluate(async (id) => (await import(new URL('/tests/fixtures/limb-workspace.ts', location.origin).href) as Observer).baseline(id), record.id);
    await button(page, config.tool.charAt(0).toUpperCase() + config.tool.slice(1)).click();
    const fields: Record<string, string> = { 'Spherical brush radius (m)': String(config.radiusMeters) };
    if ('strengthMeters' in config) fields['Spherical strength (m/dab)'] = String(config.strengthMeters);
    if ('intensity' in config) fields['Spherical intensity (%)'] = String(config.intensity * 100);
    if ('targetElevation' in config) fields['Spherical target elevation (m)'] = String(config.targetElevation);
    await settings(page, fields); await page.mouse.move(point.x, point.y); await expect(canvas(page)).toHaveAttribute('data-preview-radius', String(config.radiusMeters));
    const preview = await page.locator('svg path').getAttribute('d'); expect(preview?.length).toBeGreaterThan(20);
    const direction = JSON.parse((await canvas(page).getAttribute('data-preview-center'))!) as Vec3;
    await page.mouse.click(point.x, point.y); await idle(page); await saved(page);
    const response = await page.evaluate(async ({ id, config, direction }) => (await import(new URL('/tests/fixtures/limb-workspace.ts', location.origin).href) as Observer).sampleResponse(id, config, direction), { id: record.id, config, direction });
    expect(response.exact).toBe(true); if ('intensity' in config && config.intensity === 0) expect(response.changed).toBe(0); else expect(response.changed).toBeGreaterThan(0);
    results.push({ config, response, preview });
    if (response.changed) await button(page, 'Undo').click();
    if (config.tool === 'smooth') await button(page, 'Undo').click();
    await saved(page);
  }
  expect(results[1]!.response.changed).toBeGreaterThan(results[0]!.response.changed); expect(results[1]!.preview).not.toBe(results[0]!.preview);
  await settings(page, { 'Spherical brush radius (m)': '' }); await page.mouse.click(point.x, point.y); await idle(page); expect((await saved(page)).payloadSha256).toBe(record.payloadSha256);
  await writeFile(`docs/evidence/a6-d2-r-${info.project.name}-${mode === 'Globe' ? 'globe' : 'net'}-settings.json`, JSON.stringify(results, null, 2));
});
