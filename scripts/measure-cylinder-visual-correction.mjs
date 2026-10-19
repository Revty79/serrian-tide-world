import { chromium, devices } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const baseline = '9a639bfa802c349fc8ee3033c5b7669599b4974e', root = '.local/a7-p1ar-baseline', port = 5213, origin = `http://127.0.0.1:${port}`;
const prefix = 'docs/evidence/a7-p1ar', quick = process.argv.includes('quick'), correctedOnly = process.argv.includes('corrected-only');
function verify(records) {
  assert.equal(records.length, 16);
  for (const a of records.filter(r => r.label === 'baseline')) {
    const b = records.find(r => r.label === 'corrected' && r.backend === a.backend && r.profile === a.profile && r.n === a.n);
    assert.equal(a.payloadSha256, b.payloadSha256);
    for (const pose of b.poses) {
      // Camera basis +0/-0 are geometrically identical. Elevation words are
      // compared separately as Uint32 words and are NEVER normalized here.
      assert.deepEqual(JSON.parse(JSON.stringify(pose.view)), JSON.parse(JSON.stringify(a.poses.find(p => p.name === pose.name.replace('elevation-', '')).view)));
    }
  }
  for (const r of records) for (const pose of r.poses) assert.equal(createHash('sha256').update(readFileSync(pose.path)).digest('hex'), pose.sha256, pose.path);
}
if (process.argv.includes('verify-only')) { verify(JSON.parse(readFileSync(`${prefix}-visual-pairs.json`, 'utf8')).records); console.log('All 16 paired contexts, geometrically equal cameras and 152 captured PNG hashes verified.'); process.exit(0); }
// An isolated source export, never a branch, working-tree replacement or deployment.
const paths = execFileSync('git', ['ls-tree', '-r', '--name-only', baseline], { encoding: 'utf8' }).trim().split('\n').filter(p => /^(src\/|tests\/|dev\/|index.html$|package.*json$|vite.config.ts$|tsconfig.json$)/.test(p));
for (const p of paths) { const dest = join(root, p); mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, execFileSync('git', ['show', `${baseline}:${p}`], { maxBuffer: 20e6 })); }
const fixturePath = 'tests/fixtures/cylinder-visual-proof.ts'; writeFileSync(join(root, fixturePath), readFileSync(fixturePath));
const delay = ms => new Promise(r => setTimeout(r, ms));
const records = correctedOnly ? JSON.parse(readFileSync(`${prefix}-visual-pairs.json`, 'utf8')).records.filter(r => r.label === 'baseline') : [], fixtures = new Map();
async function serve(cwd, action) {
  const server = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd: resolve(cwd), windowsHide: true, stdio: 'ignore' });
  try { const at = Date.now(); while (true) { if (server.exitCode !== null) throw Error('Strict visual server failed'); try { if ((await fetch(origin)).ok) break; } catch {} if (Date.now() - at > 30000) throw Error('Visual server timeout'); await delay(100); } return await action(); }
  finally { server.kill(); server.unref(); await delay(300); }
}
async function snapshot(page, words = false) { return page.evaluate(async words => (await import('/tests/fixtures/cylinder-observer.ts')).snapshot(words), words); }
async function idle(page) { const at = Date.now(); while (Date.now() - at < 90000) { try { const s = await snapshot(page); if (s.ready && !s.painting && !s.previewPending && s.displayRevision === s.revision) { await delay(350); return; } } catch {} await delay(50); } throw Error('Visual idle timeout'); }
const button = (page, name) => page.getByRole('button', { name, exact: true });
async function panel(page, open) { const b = button(page, open ? 'Open tools' : 'Close tools'); if (await b.isVisible()) await b.click(); }
async function center(page, region) { const d = page.locator('.cylinder-regions'); await d.locator('summary').click(); await button(page, region).click(); await d.evaluate(e => e.removeAttribute('open')); await idle(page); }
async function select(page, patchId, u, v) {
  await button(page, 'Surface map').click(); await button(page, 'Fit cylinder').click(); await idle(page);
  const p = await page.evaluate(async p => (await import('/tests/fixtures/cylinder-observer.ts')).project(p), { patchId, u, v }); assert.ok(p);
  await page.mouse.click(p.x, p.y); await button(page, 'Physical view').click(); await idle(page); await center(page, 'Center selection');
}

// First create immutable saved files once, using actual numerical brush operations.
await serve('.', async () => {
  const browser = await chromium.launch();
  try { const page = await browser.newPage(); await page.goto(origin);
    for (const n of quick ? [128] : [128, 256]) { const path = `${prefix}-sculpted-n${n}.json`; const f = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : await page.evaluate(async n => (await import('/tests/fixtures/cylinder-visual-proof.ts')).sculpted(n), n); if (!existsSync(path)) writeFileSync(path, JSON.stringify(f)); fixtures.set(n, f); }
  } finally { await browser.close(); }
});

for (const label of quick || correctedOnly ? ['corrected'] : ['baseline', 'corrected']) await serve(label === 'baseline' ? root : '.', async () => {
  for (const backend of quick ? ['hardware'] : ['hardware', 'fallback']) {
    // Ordinary installed Chrome, headed, no graphics flags. Fallback is default
    // headless Chromium's actual software renderer, not a mocked shader result.
    const browser = await chromium.launch(backend === 'hardware' ? { channel: 'chrome', headless: false } : { headless: true });
    try { for (const profile of quick ? ['desktop'] : ['desktop', 'mobile']) for (const [n, fixture] of fixtures) {
      const context = await browser.newContext(profile === 'mobile' ? devices['Pixel 7'] : { viewport: { width: 1440, height: 900 } });
      const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
      if (n === 128) await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      await page.goto(origin); const id = await page.evaluate(async f => (await import('/tests/fixtures/cylinder-visual-proof.ts')).install(f), fixture);
      await page.keyboard.press('Escape'); if (await button(page, 'Browse saved maps').isVisible()) await button(page, 'Browse saved maps').click(); await panel(page, true);
      await button(page, 'Refresh maps').click(); await page.getByLabel('Saved maps', { exact: true }).selectOption(id); await button(page, 'Open Map').click(); await idle(page); await panel(page, false); await button(page, 'Rotate / Pan').click(); await idle(page);
      const first = await snapshot(page, true), poses = [];
      assert.deepEqual(first.metadata, fixture.record.metadata); assert.deepEqual(first.words, [...new Uint32Array(Uint8Array.from(fixture.record.elevations).buffer)]);
      assert.equal(first.renderer.kind, backend === 'hardware' ? 'webgl2' : 'cpu');
      const capture = async name => { await page.mouse.move(4, 4); await idle(page); await delay(500); const s = await snapshot(page, true); assert.deepEqual(s.words, first.words); assert.equal(s.history.entries, 0); const path = `${prefix}-${label}-${backend}-${profile}-n${n}-${name}.png`; const bytes = await page.screenshot({ path }); poses.push({ name, path, sha256: createHash('sha256').update(bytes).digest('hex'), view: s.view, size: s.size, renderer: s.renderer, appearance: s.appearance }); };
      await capture('physical'); await button(page, 'Surface map').click(); await idle(page); await capture('map');
      await select(page, 'side', .12, 835000); for (let i = 0; i < 2; i++) await button(page, 'Zoom in').click(); await capture('coast');
      await button(page, 'Fit cylinder').click(); await center(page, 'Start cap'); await button(page, 'Zoom in').click(); await capture('start-center');
      await button(page, 'Fit cylinder').click(); await center(page, 'End cap'); await button(page, 'Zoom in').click(); await capture('end-center');
      if (!quick) {
        await select(page, 'side', 0, 0); await button(page, 'Zoom in').click(); await page.locator('.cylinder-canvas').focus(); for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowUp'); await capture('start-rim');
        await select(page, 'side', 0, 1600000); await button(page, 'Zoom in').click(); await page.locator('.cylinder-canvas').focus(); for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowDown'); await capture('end-rim');
        await button(page, 'Surface map').click(); await button(page, 'Fit cylinder').click(); await button(page, 'Zoom in').click(); await capture('cut');
      }
      let diagnostics;
      if (label === 'corrected') {
        await panel(page, true); await page.getByLabel('Cylinder terrain appearance', { exact: true }).selectOption('elevation'); await panel(page, false); await capture('elevation-cut');
        await select(page, 'side', .12, 835000); for (let i = 0; i < 2; i++) await button(page, 'Zoom in').click(); await capture('elevation-coast');
        await button(page, 'Surface map').click(); await button(page, 'Fit cylinder').click(); await capture('elevation-map');
        await panel(page, true); await page.locator('.cylinder-diagnostics summary').click(); await idle(page); diagnostics = await page.getByLabel('Cylinder display diagnostics', { exact: true }).textContent(); await page.screenshot({ path: `${prefix}-${backend}-${profile}-n${n}-diagnostics.png` });
      }
      assert.deepEqual(errors, []); records.push({ label, backend, profile, n, payloadSha256: fixture.payloadSha256, sameWords: true, historyEntries: 0, diagnostics, poses, errors });
      if (n === 128) await context.tracing.stop({ path: `${prefix}-${label}-${backend}-${profile}-visual-trace.zip` }); await context.close(); console.log(label, backend, profile, n, first.renderer.renderer);
      writeFileSync(`${prefix}-${quick ? 'quick' : 'visual-pairs'}.json`, JSON.stringify({ baseline, ordinaryHardwareLaunch: { channel: 'chrome', headless: false, args: [] }, records }, null, 2));
    } } finally { await browser.close(); }
  }
});
if (!quick) verify(records);
console.log('Saved payloads, complete word arrays, history and matched camera positions verified.');
