import { toolsPanel } from './workspace-helpers.ts';
import { expect, test, type Page } from '@playwright/test';

const map = (page: Page) => page.getByRole('img', { name: 'Atlas terrain map' });
const readout = (page: Page) => page.getByLabel('Terrain elevation', { exact: true });
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', (error) => messages.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') messages.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

async function bounds(page: Page) {
  await toolsPanel(page, false);
  const rect = await map(page).boundingBox();
  if (!rect) throw new Error('Map is not visible.');
  return rect;
}
async function hover(page: Page, x: number, y: number) {
  const rect = await bounds(page);
  await page.mouse.move(rect.x + rect.width * x, rect.y + rect.height * y);
}
async function click(page: Page, x: number, y: number) {
  const rect = await bounds(page);
  await page.mouse.click(rect.x + rect.width * x, rect.y + rect.height * y);
}
async function drag(page: Page, points: { x: number; y: number }[], steps = 1) {
  await hover(page, points[0]!.x, points[0]!.y);
  await page.mouse.down();
  const rect = await bounds(page);
  for (const point of points.slice(1)) await page.mouse.move(rect.x + point.x * rect.width, rect.y + point.y * rect.height, { steps });
  await page.mouse.up();
}
async function slider(page: Page, name: 'Radius' | 'Strength' | 'Intensity', value: number) {
  await toolsPanel(page, true);
  const input = page.getByRole('slider', { name: new RegExp(name) });
  const min = Number(await input.getAttribute('min'));
  const max = Number(await input.getAttribute('max'));
  const step = Number(await input.getAttribute('step'));
  const end = value > (min + max) / 2;
  await input.press(end ? 'End' : 'Home');
  for (let index = 0; index < Math.round(Math.abs(value - (end ? max : min)) / step); index += 1) await input.press(end ? 'ArrowLeft' : 'ArrowRight');
  await expect(input).toHaveValue(String(value));
}
async function elevation(page: Page) {
  const text = await readout(page).innerText();
  const match = text.match(/map units · ([\d,.-]+) m ·/);
  if (!match) throw new Error(`No elevation in: ${text}`);
  return Number(match[1]!.replaceAll(',', ''));
}
async function fixture(page: Page) {
  await page.goto('/tests/fixtures/terrain.html');
  await expect.poll(async () => {
    const rect = await bounds(page);
    return rect.width > 0 && Math.abs(rect.width - rect.height) < 0.1;
  }).toBe(true);
}
async function snapshot(page: Page) {
  await page.evaluate(async () => (await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src)).snapshot());
}
async function unchanged(page: Page) {
  return page.evaluate(async () => (await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src)).matchesSnapshot() as boolean);
}

test('Smooth is selectable, uses percentage intensity, and reduces a sculpted peak', async ({ page }) => {
  await page.goto('/');
  await slider(page, 'Strength', 1000);
  for (let index = 0; index < 4; index += 1) await click(page, 0.5, 0.5);
  const before = await elevation(page);
  await toolsPanel(page, true);
  await page.getByRole('button', { name: 'Smooth', exact: true }).click();
  await toolsPanel(page, true);
  await expect(page.getByRole('button', { name: 'Smooth', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(map(page)).toHaveAccessibleDescription(/Smooth selected/);
  await toolsPanel(page, true);
  await expect(page.getByRole('slider', { name: /Strength/ })).toHaveCount(0);
  await slider(page, 'Intensity', 100);
  await toolsPanel(page, true);
  await expect(page.getByRole('slider', { name: /Intensity/ })).toHaveAttribute('aria-valuetext', '100% toward the local average per dab at the brush center');
  for (let index = 0; index < 4; index += 1) await click(page, 0.5, 0.5);
  expect(await elevation(page)).toBeLessThan(before);
  expect(await elevation(page)).toBeGreaterThan(0);
});

for (const target of [500, 0, -300]) {
  test(`Flatten accepts a ${target} m target and updates real terrain colors and readout`, async ({ page }) => {
    await page.goto('/');
    await toolsPanel(page, true);
    await page.getByRole('button', { name: 'Flatten', exact: true }).click();
    await expect(map(page)).toHaveAccessibleDescription(/Flatten selected/);
    await toolsPanel(page, true);
    await page.getByRole('spinbutton', { name: 'Target elevation (m)' }).fill(String(target));
    await slider(page, 'Intensity', 100);
    await click(page, 256 / 511, 256 / 511);
    expect(await elevation(page)).toBeCloseTo(target, 1);
    const color = await map(page).evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      return Array.from(canvas.getContext('2d')!.getImageData(Math.floor(canvas.width * 256 / 511), Math.floor(canvas.height * 256 / 511), 1, 1).data);
    });
    if (target > 0) expect(color[1]).toBeGreaterThan(color[2]!);
    else expect(color[2]).toBeGreaterThan(color[1]!);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

test('an empty Flatten target blocks editing and tool switching preserves terrain and stored controls', async ({ page }) => {
  await page.goto('/');
  await slider(page, 'Strength', 500);
  await click(page, 0.5, 0.5);
  const before = await elevation(page);
  await toolsPanel(page, true);
  await page.getByRole('button', { name: 'Flatten', exact: true }).click();
  await toolsPanel(page, true);
  await page.getByRole('spinbutton', { name: 'Target elevation (m)' }).fill('');
  await expect(map(page)).toHaveAttribute('data-editable', 'false');
  await click(page, 0.5, 0.5);
  expect(await elevation(page)).toBe(before);
  await toolsPanel(page, true);
  await page.getByRole('spinbutton', { name: 'Target elevation (m)' }).fill('-250');
  await expect(map(page)).toHaveAttribute('data-editable', 'true');
  await toolsPanel(page, true);
  await page.getByRole('button', { name: 'Smooth', exact: true }).click();
  await slider(page, 'Intensity', 25);
  await toolsPanel(page, true);
  await page.getByRole('button', { name: 'Raise', exact: true }).click();
  await toolsPanel(page, true);
  await expect(page.getByRole('slider', { name: /Strength/ })).toHaveValue('500');
  await hover(page, 0.5, 0.5);
  expect(await elevation(page)).toBe(before);
  await toolsPanel(page, true);
  await page.getByRole('button', { name: 'Flatten', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'Target elevation (m)' })).toHaveValue('-250');
  await toolsPanel(page, true);
  await expect(page.getByRole('slider', { name: /Intensity/ })).toHaveValue('25');
});

test('the cursor readout samples exact grid values and all three sea-level relationships', async ({ page }) => {
  await fixture(page);
  const originalBounds = await bounds(page);
  for (const sample of [{ value: 123.5, relation: 'Above' }, { value: 0, relation: 'At' }, { value: -42.5, relation: 'Below' }]) {
    await page.evaluate(async (value) => {
      const fixture = await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src);
      fixture.terrain.elevations[384 * 512 + 128] = value;
      fixture.refresh();
    }, sample.value);
    await hover(page, 128 / 511, 384 / 511);
    await expect(readout(page)).toContainText('X 0.250 · Y 0.751 map units');
    await expect(readout(page)).toContainText(`${sample.value} m · ${sample.relation} sea level`);
    expect(await bounds(page)).toEqual(originalBounds);
  }
  await page.mouse.move(5, 5);
  await expect(readout(page)).toHaveText('Move over the map to inspect elevation');
});

test('fitted maps and brush cursors stay circular on wide, tall, and square viewports; margins never paint', async ({ page }) => {
  await fixture(page);
  await click(page, 0.5, 0.5);
  await snapshot(page);
  for (const viewport of [{ width: 1400, height: 650 }, { width: 420, height: 1000 }, { width: 900, height: 900 }]) {
    await page.setViewportSize(viewport);
    const area = page.locator('[aria-label="Map display area"]');
    await expect.poll(async () => {
      const display = (await area.boundingBox())!;
      const rect = await bounds(page);
      return Math.abs(rect.width - Math.min(display.width, display.height)) < 0.1 && Math.abs(rect.width - rect.height) < 0.1;
    }).toBe(true);
    const rect = await bounds(page);
    const display = (await area.boundingBox())!;
    await hover(page, 0.5, 0.5);
    const cursor = await page.locator('div[aria-hidden="true"]').boundingBox();
    expect(cursor).not.toBeNull();
    expect(Math.abs(cursor!.width - cursor!.height)).toBeLessThan(0.1);
    expect(Math.abs(cursor!.x + cursor!.width / 2 - (rect.x + rect.width / 2))).toBeLessThan(0.1);
    expect(Math.abs(cursor!.y + cursor!.height / 2 - (rect.y + rect.height / 2))).toBeLessThan(0.1);
    const margin = display.width > rect.width + 2
      ? { x: display.x + (rect.x - display.x) / 2, y: display.y + display.height / 2 }
      : { x: display.x + display.width / 2, y: display.y + (rect.y - display.y) / 2 };
    await page.mouse.click(margin.x, margin.y);
    await page.mouse.move(margin.x + 1, margin.y + 1);
    await expect(readout(page)).toHaveText('Move over the map to inspect elevation');
    expect(await unchanged(page)).toBe(true);
  }
});

test('displayed round terrain agrees with the round preview footprint', async ({ page }) => {
  await fixture(page);
  await click(page, 0.5, 0.5);
  await expect.poll(async () => map(page).evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext('2d')!;
    const center = context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
    return center[1]! > center[2]!;
  })).toBe(true);
  const spans = await map(page).evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext('2d')!;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const land = (x: number, y: number) => pixels[(y * canvas.width + x) * 4 + 1]! > pixels[(y * canvas.width + x) * 4 + 2]!;
    let horizontal = 0;
    let vertical = 0;
    for (let x = 0; x < canvas.width; x += 1) if (land(x, Math.floor(canvas.height / 2))) horizontal += 1;
    for (let y = 0; y < canvas.height; y += 1) if (land(Math.floor(canvas.width / 2), y)) vertical += 1;
    return { horizontal, vertical };
  });
  expect(Math.abs(spans.horizontal - spans.vertical)).toBeLessThanOrEqual(2);
});

test('Reset requires confirmation, cancellation preserves edits, and acceptance restores the whole visible ocean', async ({ page }) => {
  await page.goto('/');
  await click(page, 0.5, 0.5);
  const before = await elevation(page);
  page.once('dialog', async (dialog) => { expect(dialog.type()).toBe('confirm'); await dialog.dismiss(); });
  await toolsPanel(page, true);
  await page.getByRole('button', { name: 'Reset Terrain', exact: true }).click();
  await hover(page, 0.5, 0.5);
  expect(await elevation(page)).toBe(before);
  page.once('dialog', async (dialog) => { expect(dialog.message()).toContain('−100 meters'); await dialog.accept(); });
  await toolsPanel(page, true);
  await page.getByRole('button', { name: 'Reset Terrain', exact: true }).click();
  await expect.poll(async () => map(page).evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    const expected = [35, 104, 136, 255];
    return data.every((value, index) => value === expected[index % 4]);
  })).toBe(true);
  await hover(page, 0.5, 0.5);
  await expect(readout(page)).toContainText('-100 m · Below sea level');
  await toolsPanel(page, true);
  await expect(page.getByRole('button', { name: 'Raise', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

for (const tool of ['smooth', 'flatten'] as const) {
  test(`${tool} produces equivalent real-browser results with sparse and dense strokes`, async ({ page }) => {
    const values: number[][] = [];
    for (const steps of [1, 80]) {
      await fixture(page);
      await page.evaluate(async (tool) => {
        const fixture = await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src);
        fixture.terrain.elevations.forEach((_: number, index: number, data: Float32Array) => { data[index] = (index * 17) % 1000 - 500; });
        fixture.setBrush(tool === 'smooth' ? { tool, radius: 0.08, intensity: 0.6 } : { tool, radius: 0.08, intensity: 0.6, targetElevation: 200 });
        fixture.refresh();
      }, tool);
      await drag(page, [{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }], steps);
      values.push(await page.evaluate(async () => Array.from((await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src)).terrain.elevations as Float32Array)));
    }
    let maxDifference = 0;
    values[0]!.forEach((value, index) => { maxDifference = Math.max(maxDifference, Math.abs(value - values[1]![index]!)); });
    expect(maxDifference).toBeLessThan(0.01);
  });

  test(`${tool} stops after cancellation and retains valid boundary edits`, async ({ page }) => {
    await fixture(page);
    await page.evaluate(async (tool) => {
      const fixture = await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src);
      fixture.terrain.elevations.forEach((_: number, index: number, data: Float32Array) => { data[index] = index % 2 ? 1000 : -100; });
      fixture.setBrush(tool === 'smooth' ? { tool, radius: 0.08, intensity: 0.8 } : { tool, radius: 0.08, intensity: 0.8, targetElevation: -300 });
      fixture.refresh();
    }, tool);
    await hover(page, 0.01, 0.01);
    await page.mouse.down();
    await hover(page, 0.1, 0.05);
    await snapshot(page);
    await map(page).dispatchEvent('pointercancel', { pointerId: 1, isPrimary: true });
    await hover(page, 0.8, 0.8);
    await page.mouse.up();
    expect(await unchanged(page)).toBe(true);
    expect(await page.evaluate(async () => (await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src)).terrain.elevations.every(Number.isFinite))).toBe(true);
  });
}

test('the visible legend uses the same water and land colors as the numerical palette', async ({ page }) => {
  await page.goto('/');
  await toolsPanel(page, true);
  const gradients = await page.getByLabel('Elevation color legend').locator('i').evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundImage));
  expect(gradients[0]).toContain('rgb(12, 45, 72)');
  expect(gradients[0]).toContain('rgb(37, 111, 143)');
  expect(gradients[1]).toContain('rgb(109, 149, 88)');
  expect(gradients[1]).toContain('rgb(183, 160, 121)');
  expect(gradients[1]).toContain('rgb(235, 234, 224)');
});

test('visual evidence: Raise/Lower, Smooth, and Flatten on the aspect-preserving map', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await slider(page, 'Radius', 14);
  await slider(page, 'Strength', 300);
  await drag(page, [{ x: 0.24, y: 0.55 }, { x: 0.34, y: 0.4 }, { x: 0.5, y: 0.36 }, { x: 0.65, y: 0.5 }, { x: 0.7, y: 0.65 }], 8);
  await drag(page, [{ x: 0.3, y: 0.57 }, { x: 0.48, y: 0.55 }, { x: 0.62, y: 0.6 }], 8);
  await slider(page, 'Radius', 4);
  await slider(page, 'Strength', 1000);
  for (let index = 0; index < 2; index += 1) await drag(page, [{ x: 0.32, y: 0.48 }, { x: 0.44, y: 0.41 }, { x: 0.51, y: 0.45 }], 8);
  await toolsPanel(page, true);
  await page.getByRole('button', { name: 'Lower', exact: true }).click();
  await slider(page, 'Radius', 3);
  await drag(page, [{ x: 0.58, y: 0.28 }, { x: 0.55, y: 0.47 }, { x: 0.59, y: 0.72 }], 8);
  await page.mouse.move(5, 5);
  await page.screenshot({ path: testInfo.outputPath('a2-raise-lower-regression.png'), fullPage: true });
  await toolsPanel(page, true);
  await page.getByRole('button', { name: 'Raise', exact: true }).click();
  await slider(page, 'Radius', 0.5);
  for (const point of [{ x: 0.37, y: 0.5 }, { x: 0.39, y: 0.5 }, { x: 0.41, y: 0.5 }]) await click(page, point.x, point.y);
  await toolsPanel(page, true);
  await page.getByRole('button', { name: 'Smooth', exact: true }).click();
  await slider(page, 'Radius', 8);
  await slider(page, 'Intensity', 100);
  for (let index = 0; index < 8; index += 1) await drag(page, [{ x: 0.32, y: 0.5 }, { x: 0.48, y: 0.5 }], 4);
  await hover(page, 0.4, 0.5);
  await page.screenshot({ path: testInfo.outputPath('a2-smooth-regression.png'), fullPage: true });
  await toolsPanel(page, true);
  await page.getByRole('button', { name: 'Flatten', exact: true }).click();
  await slider(page, 'Radius', 10);
  await toolsPanel(page, true);
  await page.getByRole('spinbutton', { name: 'Target elevation (m)' }).fill('1200');
  await drag(page, [{ x: 0.34, y: 0.62 }, { x: 0.46, y: 0.62 }], 8);
  await hover(page, 0.4, 0.62);
  await expect(readout(page)).toContainText('Above sea level');
  await expect(page.getByRole('alert')).toHaveCount(0);
  const rect = await bounds(page);
  expect(Math.abs(rect.width - rect.height)).toBeLessThan(0.1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('a2-flatten-regression.png'), fullPage: true });
});
