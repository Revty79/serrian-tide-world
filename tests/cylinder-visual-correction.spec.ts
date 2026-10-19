import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { toolsPanel, createWorld } from './workspace-helpers.ts';
type Observer = typeof import('./fixtures/cylinder-observer.ts');
type State = ReturnType<Observer['snapshot']> & { modified: boolean; appearance: string; renderer: { kind: string; width: number; height: number; uploads: number; reason: string; renderer: string } };
const b = (p: Page, name: string) => p.getByRole('button', { name, exact: true });
const snap = (p: Page, words = true) => p.evaluate(async words => (await import(new URL('/tests/fixtures/cylinder-observer.ts', location.origin).href) as Observer).snapshot(words), words) as Promise<State>;
async function idle(p: Page) { await expect.poll(async () => { try { const s = await snap(p, false); return s.ready && !s.painting && !s.previewPending && s.revision === s.displayRevision; } catch { return false; } }, { timeout: 90000 }).toBe(true); }
test.use({ trace: 'on', launchOptions: { args: process.platform === 'win32' ? ['--use-angle=default'] : [] } });

for (const backend of ['hardware', 'fallback'] as const) test.describe(`elevation-first ${backend}`, () => {
  if (backend === 'hardware') test('relief pixels agree with independent physical finite-difference gradients on both caps and side', async ({ page }, info) => {
    test.setTimeout(120000); await page.goto('/'); const proofs = [];
    for (const n of [128, 256]) { const proof = await page.evaluate(async n => (await import(new URL('/tests/fixtures/cylinder-gpu-proof.ts', location.origin).href) as typeof import('./fixtures/cylinder-gpu-proof.ts')).parity(n, 'relief'), n); for (const v of proof.results) { expect(v.maxEnvelopeError).toBeLessThanOrEqual(2); expect(v.wrongCoverage).toBe(0); } expect(proof.unchanged && proof.cameraReused && proof.commitUploaded).toBe(true); proofs.push(proof); }
    await writeFile(`docs/evidence/a7-p1ar-${info.project.name}-relief-parity.json`, JSON.stringify(proofs, null, 2));
  });
  for (const n of [128, 256]) test(`N${n} unified display diagnostics, terrain appearance, exact stencil, history and v4`, async ({ page }, info) => {
    test.setTimeout(180000);
    if (backend === 'fallback') await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...args: unknown[]) { return id === 'webgl2' ? null : Reflect.apply(original, this, [id, ...args]); } as typeof original; });
    await page.goto('/');
    const fixture = await page.evaluate(async n => { const module = await import(new URL('/tests/fixtures/cylinder-visual-proof.ts', location.origin).href) as typeof import('./fixtures/cylinder-visual-proof.ts'); const f = await module.sculpted(n); return { id: await module.install(f), payloadSha256: f.payloadSha256, sculpture: f.sculpture }; }, n);
    await page.keyboard.press('Escape'); await toolsPanel(page, true); await b(page, 'Refresh maps').click(); await page.getByLabel('Saved maps', { exact: true }).selectOption(fixture.id); await b(page, 'Open Map').click(); await idle(page);
    await toolsPanel(page, true); await page.locator('.cylinder-diagnostics summary').click();
    const diagnostics = page.getByLabel('Cylinder display diagnostics', { exact: true }); await expect(diagnostics).toContainText(backend === 'hardware' ? 'Hardware WebGL2' : 'CPU fallback'); await expect(diagnostics).toContainText(`Numerical: ${n} angular / ${n / 2} axial / ${n / 4} radial`); await expect(diagnostics).toContainText('Terrain backing:'); await expect(diagnostics).toContainText('Presentation backing:');
    if (backend === 'fallback') await expect(diagnostics).toContainText('WebGL2 unavailable');
    const initial = await snap(page), text = await diagnostics.textContent(); expect(initial.renderer.kind).toBe(backend === 'hardware' ? 'webgl2' : 'cpu');
    const modes = [];
    for (const mode of ['elevation', 'relief', 'elevation']) { await page.getByLabel('Cylinder terrain appearance', { exact: true }).selectOption(mode); await idle(page); const s = await snap(page); expect(s.words).toEqual(initial.words); expect(s.history).toEqual(initial.history); expect(s.modified).toBe(false); expect(s.appearance).toBe(mode); if (backend === 'hardware') expect(s.renderer.uploads).toBe(initial.renderer.uploads); modes.push({ mode, renderer: s.renderer }); }
    await page.getByLabel('Cylinder brush radius (m)', { exact: true }).fill('83700'); await page.getByLabel('Cylinder strength (m/dab)', { exact: true }).fill('237'); await toolsPanel(page, false); await b(page, 'Surface map').click(); await b(page, 'Raise').click(); await idle(page);
    const point = (await page.evaluate(async () => (await import(new URL('/tests/fixtures/cylinder-observer.ts', location.origin).href) as Observer).project({ patchId: 'side', u: .31, v: 800000 })))!;
    await page.mouse.move(point.x, point.y); await idle(page); const stencil = (await snap(page)).stencil!; expect(stencil.indices.length).toBeGreaterThan(0); const before = await snap(page);
    await page.evaluate(async () => (await import(new URL('/tests/fixtures/cylinder-observer.ts', location.origin).href) as Observer).observe());
    await page.mouse.down(); await page.mouse.up(); await idle(page); const after = await snap(page), proof = await page.evaluate(async () => (await import(new URL('/tests/fixtures/cylinder-observer.ts', location.origin).href) as Observer).compare());
    expect(proof.mismatches).toBe(0); expect(proof.hidden).toBe(0); expect(after.history.entries).toBe(1); expect(after.words.map((v, i) => v !== before.words[i] ? i : -1).filter(i => i >= 0)).toEqual(stencil.indices);
    await b(page, 'Undo').click(); await idle(page); expect((await snap(page)).words).toEqual(initial.words); await b(page, 'Redo').click(); await idle(page); expect((await snap(page)).words).toEqual(after.words);
    await b(page, 'Save').click(); await expect(page.getByLabel('Map work status', { exact: true })).toHaveText('Saved on this device'); await createWorld(page, 'wrapped'); await toolsPanel(page, true); await page.getByLabel('Saved maps', { exact: true }).selectOption(fixture.id); await b(page, 'Open Map').click(); await idle(page); expect((await snap(page)).words).toEqual(after.words); await toolsPanel(page, false); await page.screenshot({ path: `docs/evidence/a7-p1ar-${info.project.name}-${backend}-n${n}-reopened.png` });
    await writeFile(`docs/evidence/a7-p1ar-${info.project.name}-${backend}-n${n}-editing.json`, JSON.stringify({ fixture, diagnostics: text, modes, previewChangedIndices: stencil.indices, proof, exactUndoRedo: true, exactSaveOpen: true, final: await snap(page, false) }, null, 2));
  });
});
