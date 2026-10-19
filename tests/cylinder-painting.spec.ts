import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { toolsPanel, createWorld } from './workspace-helpers.ts';
type Observer = typeof import('./fixtures/cylinder-observer.ts');
type State = ReturnType<Observer['snapshot']> & { pendingPositions: number; pendingWork: boolean; workDiagnostics: { backend: string; proposals: number; mainCommitMaxMs: number }; renderer: { kind: string } };
const b = (p: Page, name: string) => p.getByRole('button', { name, exact: true });
const snap = (p: Page, words = true) => p.evaluate(async words => (await import(new URL('/tests/fixtures/cylinder-observer.ts', location.origin).href) as Observer).snapshot(words), words) as Promise<State>;
const idle = async (p: Page) => expect.poll(async () => { try { const s = await snap(p, false); return s.ready && !s.painting && !s.previewPending && s.revision === s.displayRevision; } catch { return false; } }, { timeout: 120000 }).toBe(true);
async function setup(p: Page, n: number) {
  await p.goto('/'); const id = await p.evaluate(async n => (await import(new URL('/tests/fixtures/cylinder-render-benchmark.ts', location.origin).href) as typeof import('./fixtures/cylinder-render-benchmark.ts')).seed(n), n);
  await p.keyboard.press('Escape'); await toolsPanel(p, true); await b(p, 'Refresh maps').click(); await p.getByLabel('Saved maps', { exact: true }).selectOption(id); await b(p, 'Open Map').click(); await idle(p); await toolsPanel(p, false); await b(p, 'Surface map').click(); await idle(p); return id;
}
const point = (p: Page, patchId = 'side', u = .013, v = 800000) => p.evaluate(async q => (await import(new URL('/tests/fixtures/cylinder-observer.ts', location.origin).href) as Observer).project(q as Parameters<Observer['project']>[0]), { patchId, u, v });
async function observe(p: Page) { await p.evaluate(async () => (await import(new URL('/tests/fixtures/cylinder-observer.ts', location.origin).href) as Observer).observe()); }
async function stroke(p: Page, fast = true) {
  const a = (await point(p))!, z = (await point(p, 'side', .16, 810000))!;
  await p.mouse.move(a.x, a.y); await p.mouse.down();
  for (let i = 1; i <= 24; i++) { await p.mouse.move(a.x + (z.x - a.x) * i / 24, a.y + (z.y - a.y) * i / 24); if (!fast) await p.waitForTimeout(18); }
  await p.mouse.up();
}
test.use({ trace: 'on', launchOptions: { args: process.platform === 'win32' ? ['--use-angle=default'] : [] } });
for (const backend of ['hardware', 'fallback'] as const) for (const n of [64, 128, 256]) test(`ordered worker ${backend} N${n} all four brushes, fast/slow input, exact full history and v4`, async ({ page }, info) => {
  test.setTimeout(240000);
  if (backend === 'fallback') await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...args: unknown[]) { return id === 'webgl2' ? null : Reflect.apply(original, this, [id, ...args]); } as typeof original; });
  const id = await setup(page, n), proofs = [];
  expect((await snap(page, false)).renderer.kind).toBe(backend === 'hardware' ? 'webgl2' : 'cpu');
  for (const [i, tool] of ['Raise', 'Lower', 'Smooth', 'Flatten'].entries()) {
    await b(page, tool).click(); await page.mouse.move(2, 2); await idle(page); const before = await snap(page);
    await observe(page); await stroke(page, i % 2 === 0); const released = await snap(page, false); await idle(page);
    const after = await snap(page), proof = await page.evaluate(async () => (await import(new URL('/tests/fixtures/cylinder-observer.ts', location.origin).href) as Observer).compare());
    expect(proof.mismatches).toBe(0); expect(proof.hidden).toBe(0); expect(proof.changed).toBeGreaterThan(0); expect(after.workDiagnostics.backend).toBe('worker'); expect(after.history.entries).toBe(before.history.entries + 1); expect((proof.actualLastStroke as { discardedPositions: number }).discardedPositions).toBe(0);
    await b(page, 'Undo').click(); await idle(page); expect((await snap(page)).words).toEqual(before.words); await b(page, 'Redo').click(); await idle(page); expect((await snap(page)).words).toEqual(after.words);
    proofs.push({ tool, releasedWithWork: released.painting, proof, diagnostics: after.workDiagnostics });
  }
  const final = await snap(page); await b(page, 'Save').click(); await expect(page.getByLabel('Map work status', { exact: true })).toHaveText('Saved on this device'); await createWorld(page, 'wrapped'); await toolsPanel(page, true); await page.getByLabel('Saved maps', { exact: true }).selectOption(id); await b(page, 'Open Map').click(); await idle(page); expect((await snap(page)).words).toEqual(final.words); await toolsPanel(page, false);
  await page.screenshot({ path: `docs/evidence/a7-p1b-${info.project.name}-${backend}-n${n}-editing.png` }); await writeFile(`docs/evidence/a7-p1b-${info.project.name}-${backend}-n${n}-editing.json`, JSON.stringify({ proofs, exactSaveOpen: true, final: await snap(page, false) }, null, 2));
});

test('worker startup failure safely uses existing engine and reports exact history', async ({ page }, info) => {
  test.setTimeout(120000); await page.addInitScript(() => { window.Worker = class { constructor() { throw Error('deliberate worker startup failure'); } } as unknown as typeof Worker; });
  await setup(page, 64); const before = await snap(page); await stroke(page); await idle(page); const after = await snap(page); expect(after.words).not.toEqual(before.words); expect(after.workDiagnostics.backend).toBe('cooperative fallback'); await b(page, 'Undo').click(); await idle(page); expect((await snap(page)).words).toEqual(before.words); await b(page, 'Redo').click(); await idle(page); expect((await snap(page)).words).toEqual(after.words); await writeFile(`docs/evidence/a7-p1b-${info.project.name}-startup-fallback.json`, JSON.stringify({ exactHistory: true, state: after }, null, 2));
});

test('backlog cancellation, stale result, recovery, Save drain, context loss and disposal', async ({ page }, info) => {
  test.setTimeout(240000);
  await page.addInitScript(() => { const Real = Worker; let corrupt = true; window.Worker = class extends Real { constructor(url: string | URL, options?: WorkerOptions) { super(url, options); this.addEventListener('message', e => { const m = e.data; if (corrupt && m.type === 'prepared' && m.stats) { m.sourceRevision++; corrupt = false; } }); } }; });
  const id = await setup(page, 256), p = (await point(page))!, before = await snap(page); await page.mouse.click(p.x, p.y); await idle(page); const stale = await snap(page); expect(stale.words).toEqual(before.words); expect(stale.statistics.failures).toBe(1); expect(stale.message).toContain('safely');
  await toolsPanel(page, true); await page.getByLabel('Cylinder brush radius (m)', { exact: true }).fill('377100'); await toolsPanel(page, false); await idle(page);
  const rim = (await point(page, 'side', .013, 43700))!; await page.mouse.move(rim.x, rim.y); await page.mouse.down(); for (let i = 1; i < 24; i++) await page.mouse.move(rim.x + i * .4, rim.y);
  expect((await snap(page, false)).painting).toBe(true); await page.keyboard.press('Escape'); await page.mouse.up(); await idle(page); const cancelled = await snap(page); await page.waitForTimeout(120); expect((await snap(page)).words).toEqual(cancelled.words);
  await b(page, 'Raise').click(); await page.mouse.move(rim.x, rim.y); await page.mouse.down(); for (let i = 1; i < 24; i++) await page.mouse.move(rim.x + i * .4, rim.y);
  await page.evaluate(() => { const c = document.querySelector<HTMLCanvasElement>('.cylinder-gpu')!, gl = c.getContext('webgl2'); gl?.getExtension('WEBGL_lose_context')?.loseContext(); });
  // Save keyboard command drains the accepted physical points, even while held.
  await page.keyboard.press('Control+s'); await page.mouse.up(); await expect(page.getByLabel('Map work status', { exact: true })).toHaveText('Saved on this device', { timeout: 120000 }); await idle(page); const saved = await snap(page); expect(saved.renderer.kind).toBe('cpu'); expect(saved.workDiagnostics.backend).toBe('worker'); expect(saved.painting).toBe(false);
  await createWorld(page, 'wrapped'); await page.waitForTimeout(100); await toolsPanel(page, true); await page.getByLabel('Saved maps', { exact: true }).selectOption(id); await b(page, 'Open Map').click(); await idle(page); expect((await snap(page)).words).toEqual(saved.words); await toolsPanel(page, false); await writeFile(`docs/evidence/a7-p1b-${info.project.name}-interruptions.json`, JSON.stringify({ staleRejected: true, cancelledStable: true, contextLossSaveExact: true, saved, final: await snap(page, false) }, null, 2));
});

test.describe('native worker input', () => {
  test.use({ hasTouch: true });
  test('unified N256 pen, touch, two-finger takeover and Undo during backlog', async ({ page, context }, info) => {
    test.setTimeout(180000); await setup(page, 256); const cdp = await context.newCDPSession(page), a = (await point(page))!, z = (await point(page, 'side', .18, 800000))!, proofs = [];
    await observe(page);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...a, button: 'left', buttons: 1, pointerType: 'pen' });
    for (let i = 1; i <= 16; i++) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + (z.x - a.x) * i / 16, y: a.y, buttons: 1, pointerType: 'pen' });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...z, button: 'left', buttons: 0, pointerType: 'pen' }); await idle(page);
    proofs.push(await page.evaluate(async () => (await import(new URL('/tests/fixtures/cylinder-observer.ts', location.origin).href) as Observer).compare())); expect(proofs[0]!.mismatches).toBe(0);
    const pen = await snap(page); await observe(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: { x: number; y: number; id: number }[]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(p => ({ ...p, radiusX: 4, radiusY: 4, force: 1 })) });
    await touch('touchStart', [{ ...a, id: 1 }]); for (let i = 1; i <= 12; i++) await touch('touchMove', [{ x: a.x + (z.x - a.x) * i / 12, y: a.y, id: 1 }]); await touch('touchEnd', []); await idle(page);
    proofs.push(await page.evaluate(async () => (await import(new URL('/tests/fixtures/cylinder-observer.ts', location.origin).href) as Observer).compare())); expect(proofs[1]!.mismatches).toBe(0); const finger = await snap(page);
    await touch('touchStart', [{ ...a, id: 2 }]); await touch('touchStart', [{ ...a, id: 2 }, { x: a.x + 60, y: a.y + 20, id: 3 }]); await touch('touchMove', [{ x: a.x - 10, y: a.y, id: 2 }, { x: a.x + 70, y: a.y + 20, id: 3 }]); await touch('touchEnd', []); await idle(page); expect((await snap(page)).words).toEqual(finger.words);
    await b(page, 'Fit cylinder').click(); await idle(page); await page.mouse.move(a.x, a.y); await page.mouse.down(); for (let i = 0; i < 20; i++) await page.mouse.move(a.x + i * .2, a.y); await page.keyboard.press('Control+z'); await page.mouse.up(); await idle(page); const undone = await snap(page); await page.keyboard.press('Control+Shift+z'); await idle(page); const redone = await snap(page); expect(redone.words).not.toEqual(undone.words);
    await writeFile(`docs/evidence/a7-p1b-${info.project.name}-native-input.json`, JSON.stringify({ proofs, penHistory: pen.history, touchHistory: finger.history, twoFingerPreserved: true, backlogUndoRedo: true, final: await snap(page, false) }, null, 2));
  });
});
