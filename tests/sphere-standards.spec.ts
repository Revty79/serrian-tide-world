import { expect, test, type Page } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { toolsPanel, sphericalPresentation } from './workspace-helpers.ts';
type Observer = typeof import('./fixtures/sphere-standard-observer.ts');
type Recorder = typeof import('./fixtures/sphere-standards.ts');
const button = (p: Page, name: string) => p.getByRole('button', { name, exact: true });
const canvas = (p: Page) => p.getByRole('img', { name: 'Atlas spherical terrain map', exact: true });
const observe = <K extends keyof Observer>(p: Page, method: K, arg?: unknown): Promise<any> => p.evaluate(async ({ method, arg }) => { const o = await import(new URL('/tests/fixtures/sphere-standard-observer.ts', location.origin).href); return (o[method] as Function)(arg); }, { method, arg });
async function idle(p: Page) { await expect(canvas(p)).toHaveAttribute('data-processing', 'false', { timeout: 60000 }); await sphericalPresentation(p); }
async function setup(p: Page, n = 256) {
  await p.goto('/'); await observe(p, 'wordsHash').catch(() => {});
  const data = JSON.parse(await readFile(`docs/evidence/a7-p1c-saved-geography-n${n}.json`, 'utf8')), id = await observe(p, 'install', data);
  await p.keyboard.press('Escape'); await toolsPanel(p, true); await button(p, 'Refresh maps').click(); await p.getByLabel('Saved maps', { exact: true }).selectOption(id); await button(p, 'Open Map').click(); await expect(canvas(p)).toHaveAttribute('data-ready', 'true', { timeout: 60000 }); await toolsPanel(p, false); await idle(p);
  await p.evaluate(async () => { await import(new URL('/tests/fixtures/sphere-standards.ts', location.origin).href); }); return data;
}
async function config(p: Page, tool: string, radius: number) {
  await button(p, tool).click(); await toolsPanel(p, true); await p.getByLabel('Spherical brush radius (m)', { exact: true }).fill(String(radius));
  if (tool === 'Raise' || tool === 'Lower') await p.getByLabel('Spherical strength (m/dab)', { exact: true }).fill('1200');
  else { await p.getByLabel('Spherical intensity (%)', { exact: true }).fill('70'); if (tool === 'Flatten') await p.getByLabel('Spherical target elevation (m)', { exact: true }).fill('-1600'); }
  await toolsPanel(p, false); await idle(p);
}
async function stroke(p: Page, point: { x: number; y: number }) { await p.mouse.move(point.x, point.y); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(point.x + i, point.y + Math.sin(i) * 2); await p.mouse.up(); await idle(p); }
test.use({ trace: 'on' });
for (const n of [128, 256]) test(`spherical standards N${n}: actual Globe/Net ordinary and large brushes, accepted input, exact history and v3 reopening`, async ({ page }, info) => {
  test.setTimeout(240000); const fixture = await setup(page, n), records = [], initialRenderer = await canvas(page).getAttribute('data-renderer');
  if (process.env.ATLAS_REQUIRE_SPHERE_GPU) expect(initialRenderer).toBe('webgl2');
  for (const mode of ['Globe', 'Six-face net']) {
    await button(page, mode).click(); await idle(page);
    for (const radius of [80000, 200000]) for (const tool of ['Raise', 'Lower', 'Smooth', 'Flatten']) {
      await config(page, tool, radius); const before = await observe(page, 'wordsHash'), point = await observe(page, 'point', [1, .75, .12]); expect(point).toBeTruthy();
      await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-standards.ts', location.origin).href) as Recorder).record()); await stroke(page, point);
      const proof = await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-standards.ts', location.origin).href) as Recorder).compare()); expect(proof.mismatches).toBe(0); expect(proof.statistics.writes).toBeGreaterThan(0); await expect(canvas(page)).toHaveAttribute('data-renderer', initialRenderer!);
      const after = await observe(page, 'wordsHash'); expect(after).not.toBe(before); await expect(button(page, 'Undo')).toBeEnabled();
      await button(page, 'Undo').click(); await idle(page); expect(await observe(page, 'wordsHash')).toBe(before); await button(page, 'Redo').click(); await idle(page); expect(await observe(page, 'wordsHash')).toBe(after); await expect(canvas(page)).toHaveAttribute('data-renderer', initialRenderer!);
      records.push({ mode, radius, tool, proof, before, after, display: await observe(page, 'snapshot') }); await button(page, 'Undo').click(); await idle(page);
    }
  }
  expect(await observe(page, 'wordsHash')).toBe(fixture.payloadSha256);
  await config(page, 'Smooth', 200000); await stroke(page, await observe(page, 'point', [1, .75, .12])); const final = await observe(page, 'wordsHash');
  await button(page, 'Save').click(); await expect(page.getByLabel('Map work status', { exact: true })).toHaveText('Saved on this device', { timeout: 60000 });
  await toolsPanel(page, true); await pSelect(page, fixture.id); await button(page, 'Open Map').click(); await idle(page); expect(await observe(page, 'wordsHash')).toBe(final); await expect(button(page, 'Undo')).toBeDisabled();
  await writeFile(`docs/evidence/a7-p1c-${info.project.name}-n${n}-functional.json`, JSON.stringify({ records, final, source: fixture.payloadSha256 }, null, 2));
});
async function pSelect(p: Page, id: string) { await p.getByLabel('Saved maps', { exact: true }).selectOption(id); }

test('sphere appearance, navigation and source synchronization never rewrite geography; hardware context loss/restoration and CPU fallback are safe', async ({ page }, info) => {
  test.setTimeout(120000); await setup(page); const initial = await observe(page, 'snapshot'), hash = await observe(page, 'wordsHash');
  if (process.env.ATLAS_REQUIRE_SPHERE_GPU) expect(initial.renderer).toBe('webgl2');
  for (const mode of ['Globe', 'Six-face net']) {
    await button(page, mode).click(); await idle(page); await toolsPanel(page, true); await page.getByLabel('Spherical terrain appearance').selectOption('elevation'); await toolsPanel(page, false); await idle(page); await page.screenshot({ path: `docs/evidence/a7-p1c-${info.project.name}-${mode === 'Globe' ? 'globe' : 'net'}-plain.png` });
    await button(page, 'Zoom In').click(); await idle(page); await button(page, 'Reset View').click(); await idle(page);
    expect(await observe(page, 'wordsHash')).toBe(hash); const state = await observe(page, 'snapshot'); expect(state.history).toEqual(initial.history);
    if (initial.renderer === 'webgl2') { expect(state.diagnostics.gpu.uploads).toBe(initial.diagnostics.gpu.uploads); expect(state.diagnostics.gpu.resources).toBe(3); }
  }
  let contextLost = false;
  if (initial.renderer === 'webgl2') {
    contextLost = await page.evaluate(() => { const gl = document.querySelectorAll('canvas')[1]!.getContext('webgl2')!, extension = gl.getExtension('WEBGL_lose_context')!; (window as any).restoreSphereGraphics = () => extension.restoreContext(); extension.loseContext(); return true; });
    await expect(canvas(page)).toHaveAttribute('data-renderer', 'cpu'); await idle(page); expect(await observe(page, 'wordsHash')).toBe(hash);
    await page.evaluate(() => (window as any).restoreSphereGraphics()); await expect(canvas(page)).toHaveAttribute('data-renderer', 'webgl2'); await idle(page); expect(await observe(page, 'wordsHash')).toBe(hash);
  } else expect(initial.diagnostics.gpu.reason).toMatch(/software|unavailable/i);
  await writeFile(`docs/evidence/a7-p1c-${info.project.name}-display-lifecycle.json`, JSON.stringify({ initial, final: await observe(page, 'snapshot'), contextLost, exactSource: hash }, null, 2));
});

test('N256 background limb strokes preserve native mouse/pen/touch continuity and stop on two-finger or failed-worker interruption', async ({ page, context }, info) => {
  test.setTimeout(180000);
  await page.addInitScript(() => { const Native = window.Worker; const workers: Worker[] = []; (window as any).sphereWorkers = workers; window.Worker = class extends Native { constructor(url: string | URL, options?: WorkerOptions) { super(url, options); workers.push(this); } }; });
  await setup(page); await config(page, 'Smooth', 200000); const source = await observe(page, 'wordsHash'), cdp = await context.newCDPSession(page), size = page.viewportSize()!, p = { x: size.width / 2 + .98 * Math.min(size.width, size.height) * .42, y: size.height / 2 }, proofs = [];
  for (const input of info.project.name === 'mobile' ? ['touch', 'pen'] : ['mouse', 'pen']) {
    await button(page, 'Reset View').click(); await idle(page); await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-standards.ts', location.origin).href) as Recorder).record());
    const previous = Number(await canvas(page).getAttribute('data-limb-radians'));
    if (input === 'touch') { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x - 8, y: p.y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, id: 1 }] }); }
    else await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', buttons: 1, pointerType: input === 'pen' ? 'pen' : 'mouse' });
    await expect.poll(async () => Number(await canvas(page).getAttribute('data-limb-radians')), { timeout: 60000 }).toBeGreaterThan(previous + .32);
    if (input === 'touch') await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', buttons: 0, pointerType: input === 'pen' ? 'pen' : 'mouse' });
    await idle(page); const proof = await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-standards.ts', location.origin).href) as Recorder).compare()); expect(proof.mismatches).toBe(0); expect(proof.statistics.dabs).toBeGreaterThanOrEqual(6); expect(proof.newlyExposedChanged).toBeGreaterThan(0); expect((proof.work as { backend: string }).backend).toBe('worker'); proofs.push({ input, proof });
    const after = await observe(page, 'wordsHash'); await button(page, 'Undo').click(); await idle(page); expect(await observe(page, 'wordsHash')).toBe(source); await button(page, 'Redo').click(); await idle(page); expect(await observe(page, 'wordsHash')).toBe(after); await button(page, 'Undo').click(); await idle(page);
  }
  await button(page, 'Reset View').click(); await idle(page); const center = await observe(page, 'point', [1, .75, .12]); await page.mouse.move(center.x, center.y); await page.mouse.down(); await page.mouse.move(center.x + 20, center.y + 2);
  await expect.poll(async () => (await observe(page, 'snapshot')).work?.proposals ?? 0).toBeGreaterThan(0);
  await page.evaluate(() => { const worker = (window as any).sphereWorkers.find((w: Worker) => w.onmessage && w.onerror); if (!worker) throw Error('No active real worker'); worker.dispatchEvent(new ErrorEvent('error', { message: 'Deliberate active-worker failure', cancelable: true })); });
  await page.mouse.up(); await idle(page); const prefix = await observe(page, 'wordsHash'); await page.waitForTimeout(150); expect(await observe(page, 'wordsHash')).toBe(prefix); await button(page, 'Undo').click(); await idle(page); expect(await observe(page, 'wordsHash')).toBe(source); await button(page, 'Redo').click(); await idle(page); expect(await observe(page, 'wordsHash')).toBe(prefix);
  if (info.project.name === 'mobile') {
    await button(page, 'Undo').click(); await idle(page); await button(page, 'Reset View').click(); await idle(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x - 8, y: p.y, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, id: 1 }] });
    await expect.poll(async () => (await observe(page, 'snapshot')).work?.proposals ?? 0).toBeGreaterThan(0);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }, { x: p.x - 50, y: p.y, id: 2 }] }); await idle(page); const hash = await observe(page, 'wordsHash'); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x - 20, y: p.y + 10, id: 1 }, { x: p.x - 70, y: p.y + 10, id: 2 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await idle(page); expect(await observe(page, 'wordsHash')).toBe(hash);
  }
  await writeFile(`docs/evidence/a7-p1c-${info.project.name}-native-worker-limb.json`, JSON.stringify({ proofs, failurePrefix: prefix, final: await observe(page, 'snapshot') }, null, 2));
  await page.screenshot({ path: `docs/evidence/a7-p1c-${info.project.name}-native-worker-limb.png` });
});

test('WebGL unavailable and worker construction failure retain ordered exact painting and recoverable single-operation history', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => { const get = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: any, ...args: any[]) { return type === 'webgl2' ? null : get.call(this, type, ...args); } as typeof get; window.Worker = class { constructor() { throw Error('Deliberate worker startup failure'); } } as unknown as typeof Worker; });
  await setup(page); await config(page, 'Smooth', 200000); const before = await observe(page, 'wordsHash'); await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-standards.ts', location.origin).href) as Recorder).record()); await stroke(page, await observe(page, 'point', [1, .75, .12]));
  const proof = await page.evaluate(async () => (await import(new URL('/tests/fixtures/sphere-standards.ts', location.origin).href) as Recorder).compare()); expect(proof.mismatches).toBe(0); expect((proof.work as { backend: string }).backend).toBe('cooperative fallback'); await expect(canvas(page)).toHaveAttribute('data-renderer', 'cpu');
  const after = await observe(page, 'wordsHash'); await button(page, 'Undo').click(); await idle(page); expect(await observe(page, 'wordsHash')).toBe(before); await button(page, 'Redo').click(); await idle(page); expect(await observe(page, 'wordsHash')).toBe(after);
});

test('pending CPU background work cannot masquerade as painted terrain through a quality-only redraw', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: any, ...args: any[]) { return type === 'webgl2' ? null : get.call(this, type, ...args); } as typeof get;
    const Native = window.Worker;
    window.Worker = class extends Native {
      get onmessage() { return super.onmessage; }
      set onmessage(handler: ((this: Worker, ev: MessageEvent) => any) | null) {
        if (!handler) { super.onmessage = null; return; }
        let delayed = false;
        super.onmessage = event => { if (!delayed && event.data?.type === 'prepared') { delayed = true; setTimeout(() => handler.call(this, event), 750); } else handler.call(this, event); };
      }
    };
  });
  await setup(page); await config(page, 'Smooth', 200000); const initial = await observe(page, 'snapshot'), image = await canvas(page).evaluate(c => (c as HTMLCanvasElement).toDataURL());
  const point = await observe(page, 'point', [1, .75, .12]); await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.waitForTimeout(200);
  const pending = await observe(page, 'snapshot'); expect(pending.painting).toBe(true); expect(pending.revision).toBe(initial.revision); expect(pending.displayRevision).toBe(initial.displayRevision);
  expect(JSON.parse(await canvas(page).getAttribute('data-brush-latencies') ?? '[]')).toEqual([]);
  expect(await canvas(page).evaluate(c => (c as HTMLCanvasElement).toDataURL())).toBe(image);
  await page.mouse.up(); await idle(page); expect((await observe(page, 'snapshot')).revision).toBeGreaterThan(initial.revision); expect(await canvas(page).evaluate(c => (c as HTMLCanvasElement).toDataURL())).not.toBe(image);
  const latencies = JSON.parse(await canvas(page).getAttribute('data-brush-latencies') ?? '[]') as number[];
  expect(latencies.length).toBeGreaterThan(0); expect(Math.max(...latencies)).toBeGreaterThanOrEqual(700);
  const completedWords = await observe(page, 'wordsHash'), completedTimings = await canvas(page).getAttribute('data-brush-latencies');
  await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.waitForTimeout(150); await page.keyboard.press('Escape'); await page.mouse.up(); await idle(page); await page.waitForTimeout(800);
  expect(await observe(page, 'wordsHash')).toBe(completedWords); expect(await canvas(page).getAttribute('data-brush-latencies')).toBe(completedTimings);
});
