import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { createWorld, toolsPanel } from './workspace-helpers.ts';
type Measure = typeof import('./fixtures/spherical-performance.ts');
const button = (p: Page, name: string) => p.getByRole('button', { name, exact: true });
const canvas = (p: Page) => p.getByRole('img', { name: 'Atlas spherical terrain map', exact: true });
async function settings(p: Page, values: Record<string, string>) { await toolsPanel(p, true); for (const [name, v] of Object.entries(values)) await p.getByLabel(name, { exact: true }).fill(v); await toolsPanel(p, false); }
async function save(p: Page) { await button(p, 'Save').click(); await expect(p.getByLabel('Map work status', { exact: true })).toHaveText('Saved on this device', { timeout: 30000 }); }
test.use({ trace: 'on' });
for (const n of [128, 256]) test(`controlled spherical editing N${n}`, async ({ page, context }, info) => {
  test.setTimeout(240000); const label = process.env.ATLAS_PERF_LABEL ?? 'regression', repeat = Number(process.env.ATLAS_PERF_REPEATS ?? 3), trials = [];
  const cdp = await context.newCDPSession(page); if (info.project.name === 'mobile') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('/'); await page.evaluate(async () => { await import(new URL('/tests/fixtures/spherical-performance.ts', location.origin).href); });
  const prepStart = Date.now(); await createWorld(page, 'sphere', { n, name: 'Controlled sphere' }); await toolsPanel(page, false);
  const preparation = await canvas(page).evaluate((e) => ({ preparationMs: Number((e as HTMLElement).dataset.preparationMs), maxTaskMs: Number((e as HTMLElement).dataset.preparationMaxTaskMs), authorityBytes: Number((e as HTMLElement).dataset.authorityBytes), cacheBytes: Number((e as HTMLElement).dataset.cacheBytes) }));
  const preparationWallMs = Date.now() - prepStart;
  const size = page.viewportSize()!, r = Math.min(size.width, size.height) * .42, x = size.width / 2, y = size.height / 2;
  await settings(page, { 'Spherical brush radius (m)': '120000', 'Spherical strength (m/dab)': '1700' }); await page.mouse.move(x - .22 * r, y); await page.mouse.down(); await page.mouse.move(x + .22 * r, y, { steps: 12 }); await page.mouse.up(); await expect(canvas(page)).toHaveAttribute('data-processing', 'false'); await save(page);
  const seedSha = await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as typeof import('./fixtures/sphere-storage.ts')).summary().then((s) => s.payloadSha256));
  const reopenedPreparation = [];
  const get = () => canvas(page).evaluate((el) => { const d = (el as HTMLElement).dataset; return { revision: Number(d.revision), statistics: JSON.parse(d.editStatistics!), renderTimes: JSON.parse(d.renderTimes!), brushLatencies: JSON.parse(d.brushLatencies ?? '[]'), renders: Number(d.renders), requests: Number(d.requests), limbSteps: Number(d.limbSteps), limbRadians: Number(d.limbRadians), rayCacheBytes: Number(d.rayCacheBytes ?? 0) }; });
  const heapBefore = await cdp.send('Runtime.getHeapUsage');
  for (let round = 0; round < repeat; round++) {
    for (const kind of ['sparse', 'dense', 'smooth', 'flatten', 'limb', 'rotation'] as const) {
      await button(page, 'Reset View').click(); await button(page, kind === 'smooth' ? 'Smooth' : kind === 'flatten' ? 'Flatten' : kind === 'rotation' ? 'Rotate / Pan' : 'Raise').click();
      await settings(page, kind === 'smooth' ? { 'Spherical brush radius (m)': '120000', 'Spherical intensity (%)': '70' } : kind === 'flatten' ? { 'Spherical brush radius (m)': '120000', 'Spherical intensity (%)': '70', 'Spherical target elevation (m)': '1800' } : kind === 'rotation' ? {} : { 'Spherical brush radius (m)': '120000', 'Spherical strength (m/dab)': '700' });
      const before = await get(); await page.evaluate(async () => (await import(new URL('/tests/fixtures/spherical-performance.ts', location.origin).href) as Measure).beginMeasurement());
      if (kind === 'limb') { await page.mouse.move(x + .98 * r, y); await page.mouse.down(); await page.waitForTimeout(1800); await page.mouse.up(); }
      else { await page.mouse.move(x - .28 * r, y); await page.mouse.down(); await page.mouse.move(x + .28 * r, y + .06 * r, { steps: kind === 'dense' ? 48 : kind === 'rotation' ? 12 : 1 }); await page.mouse.up(); }
      await expect(canvas(page)).toHaveAttribute('data-processing', 'false', { timeout: 30000 });
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const timing = await page.evaluate(async () => (await import(new URL('/tests/fixtures/spherical-performance.ts', location.origin).href) as Measure).endMeasurement()), after = await get();
      expect(timing.pump.length).toBeGreaterThan(0); expect(after.statistics.fullRebuilds).toBe(0);
      if (kind === 'rotation') expect(after.revision).toBe(before.revision); else if (kind === 'limb') expect(after.limbSteps).toBeGreaterThan(before.limbSteps);
      const shaBefore = await page.evaluate(async () => { const t = await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as typeof import('./fixtures/sphere-storage.ts'); return (await t.summary()).payloadSha256; });
      await save(page); const digest = await page.evaluate(async () => { const t = await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as typeof import('./fixtures/sphere-storage.ts'); return t.summary(); });
      const displayedFrames = after.renders - before.renders, inputSegments = kind === 'rotation' ? 0 : kind === 'limb' ? after.limbSteps - before.limbSteps + 2 : kind === 'dense' ? 50 : 3;
      trials.push({ round, kind, timing, before, after, phaseRenderTimes: after.renderTimes.slice(-Math.min(displayedFrames, 120)), phaseBrushLatencies: inputSegments ? after.brushLatencies.slice(-Math.min(inputSegments, 120)) : [], payloadSha256: digest.payloadSha256, previousSavedSha256: shaBefore });
      if (kind !== 'rotation') await button(page, 'Undo').click(); await save(page);
      const restoredSha = await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-storage.ts', location.origin).href) as typeof import('./fixtures/sphere-storage.ts')).summary().then((s) => s.payloadSha256)); expect(restoredSha).toBe(seedSha);
    }
    await toolsPanel(page, true); await button(page, 'Open Map').click(); await expect(page.getByLabel('Map work status', { exact: true })).toHaveText('Saved on this device', { timeout: 30000 }); await toolsPanel(page, false);
    reopenedPreparation.push(await canvas(page).getAttribute('data-preparation-ms'));
  }
  await page.screenshot({ path: `docs/evidence/a6-p1-${label}-${info.project.name}-n${n}.png` });
  await writeFile(`docs/evidence/a6-p1-${label}-${info.project.name}-n${n}.json`, JSON.stringify({ label, n, viewport: size, cpuThrottle: info.project.name === 'mobile' ? 4 : 1, workers: info.config.workers, repeat, preparation, preparationWallMs, reopenedPreparation, seedSha, trials, heapBefore, heapAfter: await cdp.send('Runtime.getHeapUsage'), conditions: 'Same Windows host and Chromium; trace on. Worker count, viewport and CPU throttling recorded explicitly. Every scenario begins with the same exact seeded terrain; Undo and Save verify restoration. Reopen after every round. Fixed input for ordinary strokes; held limb is time-bound and its exact step/dab counts are reported separately. CDP heap readings include test/development overhead and are not process RSS.' }, null, 2));
});

test('CPU profile actual N256 repeated editing', async ({ page, context }, info) => {
  test.skip(!process.env.ATLAS_CPU_PROFILE || info.project.name !== 'mobile', 'Explicit profiling run only'); test.setTimeout(120000);
  const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await page.goto('/'); await createWorld(page, 'sphere', { n: 256 }); await toolsPanel(page, false);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); await cdp.send('Profiler.start');
  const s = page.viewportSize()!, x = s.width / 2, y = s.height / 2, r = Math.min(s.width, s.height) * .42;
  for (const tool of ['Raise', 'Smooth', 'Flatten']) { await button(page, tool).click(); await settings(page, tool === 'Raise' ? { 'Spherical brush radius (m)': '120000' } : tool === 'Flatten' ? { 'Spherical target elevation (m)': '2500' } : {}); await page.mouse.move(x - .3 * r, y); await page.mouse.down(); await page.mouse.move(x + .3 * r, y, { steps: 20 }); await page.mouse.up(); await expect(canvas(page)).toHaveAttribute('data-processing', 'false'); }
  await button(page, 'Raise').click(); await page.mouse.move(x + .98 * r, y); await page.mouse.down(); await page.waitForTimeout(1800); await page.mouse.up(); await expect(canvas(page)).toHaveAttribute('data-processing', 'false');
  const { profile } = await cdp.send('Profiler.stop'); await writeFile(`.local/a6-p1-${process.env.ATLAS_PERF_LABEL ?? 'profile'}.cpuprofile`, JSON.stringify(profile));
});
