import { expect, test, type Page } from '@playwright/test';
import { toolsPanel, startAtlas, createWorld } from './workspace-helpers.ts';

const map = (page: Page) => page.getByRole('img', { name: 'Atlas terrain map' });
async function bounds(page: Page) { const rect = await map(page).boundingBox(); if (!rect) throw new Error('No map'); return rect; }
async function point(page: Page, x = .5, y = .5) { const r = await bounds(page); return { x: r.x + x * r.width, y: r.y + y * r.height }; }
async function sculpt(page: Page, x = .5, y = .5) { await toolsPanel(page, false); const p = await point(page, x, y); await page.mouse.click(p.x, p.y); }
async function savedState(page: Page) {
  return page.evaluate(async () => {
    const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
    const { encodeHeightmap } = await import(new URL('/src/persistence/terrain-format.ts', location.origin).href) as typeof import('../src/persistence/terrain-format.ts');
    const store = new LocalMapStore(), list = await store.list();
    const loaded = await store.open(list[0]!.id), encoded = await encodeHeightmap(loaded.terrain, loaded.name);
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoded.elevations)), (b) => b.toString(16).padStart(2, '0')).join('');
    return { id: encoded.id, name: encoded.name, metadata: JSON.stringify(encoded.metadata), digest,
      changed: loaded.terrain.elevations.filter((v) => v !== -100).length };
  });
}
async function save(page: Page) { await page.getByRole('button', { name: 'Save', exact: true }).click(); await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible(); }
async function fixture(page: Page) { await page.goto('/tests/fixtures/terrain.html'); await expect.poll(async () => (await bounds(page)).width).toBeGreaterThan(0); }
async function fixtureValues(page: Page) {
  return page.evaluate(async () => {
    const f = await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src);
    return Array.from(new Uint32Array(f.terrain.elevations.buffer));
  });
}
const messages = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = []; messages.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
});
test.afterEach(({ page }) => { expect(messages.get(page)).toEqual([]); });

test('full viewport, overlay tools, keyboard focus and uninterrupted stroke geometry', async ({ page }) => {
  await startAtlas(page);
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click();
  const area = page.getByLabel('Map display area');
  expect(await area.boundingBox()).toEqual({ x: 0, y: 0, ...page.viewportSize()! });
  const original = await bounds(page);
  await page.getByRole('button', { name: 'Open tools' }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Atlas', exact: true })).toBeFocused();
  expect(await bounds(page)).toEqual(original);
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'New World / Map', exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Open tools' })).toBeFocused();
  await page.mouse.move((await point(page)).x, (await point(page)).y); await page.mouse.down();
  // Keyboard activation of the overlay leaves the existing pointer capture and map geometry intact.
  await page.getByRole('button', { name: 'Open tools' }).focus(); await page.keyboard.press('Enter');
  expect(await bounds(page)).toEqual(original);
  await page.keyboard.press('Escape');
  const end = await point(page, .65, .55); await page.mouse.move(end.x, end.y); await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Not saved yet', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
});

test('wheel anchor, pan, Space drag and Fit preserve exact data and zoomed brush footprint', async ({ page }) => {
  await fixture(page); const before = await fixtureValues(page), fitted = await bounds(page);
  await page.evaluate(async () => (await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src)).camera.zoom(2));
  await expect.poll(async () => (await bounds(page)).width).toBeGreaterThan(fitted.width * 1.9);
  const r = await bounds(page);
  const anchor = { x: Math.round(r.x + r.width * .6), y: Math.round(r.y + r.height * .55) };
  await page.mouse.move(anchor.x, anchor.y); await page.mouse.wheel(0, -500);
  await expect.poll(async () => (await bounds(page)).width).toBeGreaterThan(r.width * 1.1);
  let zoomed = await bounds(page);
  expect((anchor.x - zoomed.x) / zoomed.width).toBeCloseTo((anchor.x - r.x) / r.width, 4);
  expect((anchor.y - zoomed.y) / zoomed.height).toBeCloseTo((anchor.y - r.y) / r.height, 4);
  await map(page).focus(); await page.keyboard.down('Space');
  await page.mouse.move(anchor.x, anchor.y); await page.mouse.down(); await page.mouse.move(anchor.x - 45, anchor.y - 30); await page.mouse.up(); await page.keyboard.up('Space');
  expect((await bounds(page)).width).toBe(zoomed.width); expect(await fixtureValues(page)).toEqual(before);
  await page.evaluate(async () => (await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src)).setPan(true));
  await page.mouse.down(); await page.mouse.move(anchor.x + 35, anchor.y + 20); await page.mouse.up();
  expect(await fixtureValues(page)).toEqual(before);
  await page.evaluate(async () => (await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src)).setPan(false));
  await page.mouse.move(anchor.x, anchor.y);
  zoomed = await bounds(page);
  const cursor = await page.locator('div[aria-hidden="true"]').boundingBox();
  expect(cursor!.width).toBeCloseTo(.12 * zoomed.width, 0); expect(cursor!.height).toBeCloseTo(cursor!.width, 1);
  await page.mouse.click(anchor.x, anchor.y);
  const result = await page.evaluate(async ({ x, y }) => {
    const f = await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src);
    const canvas = document.querySelector('canvas')!, rect = canvas.getBoundingClientRect();
    const column = Math.round((x - rect.left) / rect.width * 511), row = Math.round((y - rect.top) / rect.height * 511);
    return { value: f.terrain.elevations[row * 512 + column], untouched: f.terrain.elevations[0], history: f.history.length };
  }, anchor);
  expect(result.value).toBeGreaterThan(90); expect(result.untouched).toBe(-100); expect(result.history).toBe(1);
  const edited = await fixtureValues(page);
  await page.evaluate(async () => (await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src)).camera.fit());
  await expect.poll(async () => (await bounds(page)).width).toBe(fitted.width);
  expect(await fixtureValues(page)).toEqual(edited);
});

test('complete strokes, cancellation, Reset and shortcuts have correct history and dirty states', async ({ page }) => {
  await startAtlas(page);
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click(); await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  const p = await point(page); await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 15, p.y + 10);
  await map(page).dispatchEvent('pointercancel', { pointerId: 1, isPrimary: true }); await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeEnabled();
  await map(page).focus(); await page.keyboard.press('Control+z'); await expect(page.getByText('Not saved yet', { exact: true })).toBeVisible();
  await page.keyboard.press('Control+Shift+z'); await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();
  await toolsPanel(page, true); page.once('dialog', (dialog) => dialog.accept()); await page.getByRole('button', { name: 'Reset Terrain', exact: true }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await save(page);
  const original = await savedState(page); expect(original.changed).toBeGreaterThan(0);
  await sculpt(page, .7, .5); await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
  await sculpt(page, .35, .5); await expect(page.getByRole('button', { name: 'Redo', exact: true })).toBeDisabled();
});

test('actual Save, close, reopen, Open and continued editing preserve the full numerical map and identity', async ({ page, context }) => {
  await startAtlas(page);
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click(); await toolsPanel(page, true); await page.getByRole('textbox', { name: 'Map name', exact: true }).fill('Serrian coast');
  for (const tool of ['Raise', 'Lower', 'Smooth', 'Flatten']) {
    await toolsPanel(page, true); await page.getByRole('button', { name: tool, exact: true }).click();
    if (tool === 'Flatten') await page.getByRole('spinbutton', { name: 'Target elevation (m)' }).fill('640.25');
    await sculpt(page, tool === 'Lower' ? .65 : .5, .5);
  }
  await page.getByRole('button', { name: 'Zoom In', exact: true }).click(); await save(page);
  const before = await savedState(page); expect(before.changed).toBeGreaterThan(0);
  const reopened = await context.newPage(); await page.close(); await startAtlas(reopened);
  await toolsPanel(reopened, true); await reopened.getByRole('combobox', { name: 'Saved maps', exact: true }).selectOption(before.id);
  await reopened.getByRole('button', { name: 'Open Map', exact: true }).click();
  await toolsPanel(reopened, true);
  await expect(reopened.getByRole('textbox', { name: 'Map name', exact: true })).toHaveValue('Serrian coast');
  await expect(reopened.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await save(reopened); expect(await savedState(reopened)).toEqual(before);
  await sculpt(reopened, .7, .6); await save(reopened);
  const after = await savedState(reopened); expect(after.id).toBe(before.id); expect(after.metadata).toBe(before.metadata); expect(after.digest).not.toBe(before.digest);
  await expect(reopened.getByRole('alert')).toHaveCount(0);
  await reopened.close();
});

test('corrupt save rejection leaves unsaved terrain, camera and history intact', async ({ page }) => {
  await startAtlas(page);
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click(); await sculpt(page); await save(page); const saved = await savedState(page);
  await sculpt(page, .7, .5); await page.getByRole('button', { name: 'Zoom In', exact: true }).click();
  const rect = await bounds(page);
  await page.evaluate(async (id) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('serrian-tide-atlas', 1);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('heightmaps', 'readwrite'), store = tx.objectStore('heightmaps'), get = store.get(id);
        get.onsuccess = () => { const value = get.result; new DataView(value.elevations).setFloat32(0, 77, true); store.put(value); };
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error);
      };
    });
  }, saved.id);
  await toolsPanel(page, true); await page.getByRole('button', { name: 'Open Map', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('checksum'); expect(await bounds(page)).toEqual(rect);
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click(); await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
  await save(page); expect(await savedState(page)).toEqual(saved);
});

test('unsaved New/Open and browser navigation warn, cancellation preserves work, new map has fresh identity', async ({ page }) => {
  await startAtlas(page);
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click(); await sculpt(page); await save(page); const saved = await savedState(page);
  await sculpt(page, .65, .5); await toolsPanel(page, true);
  for (const action of ['New World / Map', 'Open Map']) {
    page.once('dialog', async (dialog) => { expect(dialog.type()).toBe('confirm'); await dialog.dismiss(); });
    await page.getByRole('button', { name: action, exact: true }).click();
    if (action === 'New World / Map') { await page.getByRole('button', { name: 'Create World / Map', exact: true }).click(); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); }
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
    await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();
  }
  const dialogPromise = page.waitForEvent('dialog'); const navigation = page.reload({ timeout: 1500 }).catch(() => null);
  const dialog = await dialogPromise; expect(dialog.type()).toBe('beforeunload'); await dialog.dismiss(); await navigation;
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept()); await createWorld(page, 'bounded');
  await expect(page.getByText('Not saved yet', { exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await save(page); const blank = await savedState(page); expect(blank.id).not.toBe(saved.id); expect(blank.changed).toBe(0);
  expect(JSON.parse(blank.metadata).resolution).toEqual({ columns: 512, rows: 512 });
  await toolsPanel(page, false); await sculpt(page); await save(page);
  await toolsPanel(page, true); await expect(page.getByRole('combobox', { name: 'Saved maps', exact: true }).locator('option')).toHaveCount(3);
});

test('storage denial reports failure and keeps the map unsaved', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { get() { throw new Error('Storage denied for test'); } }); });
  await startAtlas(page);
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Storage denied');
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click(); await sculpt(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Storage denied'); await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();
});

test('native two-finger pinch/pan never sculpts, remaining finger stays in navigation, single finger still edits', async ({ page, context }) => {
  await fixture(page); const before = await fixtureValues(page), r = await bounds(page), session = await context.newCDPSession(page);
  const a = { x: r.x + r.width * .4, y: r.y + r.height * .5, id: 1 }, b = { x: r.x + r.width * .6, y: a.y, id: 2 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a, b] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...a, x: a.x - 50 }, { ...b, x: b.x + 50 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [b] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...b, x: b.x + 20 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => (await bounds(page)).width).toBeGreaterThan(r.width * 1.2); expect(await fixtureValues(page)).toEqual(before);
  const p = { x: r.x + r.width * .5, y: r.y + r.height * .5, id: 3 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...p, x: p.x + 30 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await fixtureValues(page)).not.toEqual(before);
  await page.evaluate(async () => {
    const f = await import(document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!.src);
    f.history.undo(); f.refresh();
  });
  expect(await fixtureValues(page)).toEqual(before);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await fixtureValues(page)).not.toEqual(before);
});

test('A3 visual evidence: sculpted full-screen map, overlay tools, zoomed navigation and saved state', async ({ page }, info) => {
  await startAtlas(page);
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click(); await toolsPanel(page, true);
  const radius = page.getByRole('slider', { name: /Radius/ }); await radius.press('End');
  const strength = page.getByRole('slider', { name: /Strength/ }); await strength.press('End');
  await toolsPanel(page, false);
  const start = await point(page, .3, .55), end = await point(page, .7, .5);
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y, { steps: 12 }); await page.mouse.up();
  await toolsPanel(page, true); await page.getByRole('textbox', { name: 'Map name', exact: true }).fill('The Serrian coast');
  await save(page); await toolsPanel(page, false); await page.mouse.move(2, 2);
  await page.screenshot({ path: info.outputPath('a3-sculpted-regression.png') });
  await page.getByRole('button', { name: 'Zoom In', exact: true }).click(); await page.getByRole('button', { name: 'Zoom In', exact: true }).click();
  await toolsPanel(page, true);
  await page.screenshot({ path: info.outputPath('a3-zoomed-tools-regression.png') });
});
