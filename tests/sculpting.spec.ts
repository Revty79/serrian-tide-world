import { toolsPanel } from './workspace-helpers.ts';
import { expect, test, type Page } from '@playwright/test';

const map = (page: Page) => page.getByRole('img', { name: 'Atlas terrain map' });
const water = [35, 104, 136, 255];
const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
});
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
});

async function bounds(page: Page) {
  await toolsPanel(page, false);
  const rect = await map(page).boundingBox();
  if (!rect) throw new Error('Map is not visible.');
  return rect;
}
async function pixel(page: Page, x: number, y: number) {
  return map(page).evaluate((element, point) => {
    const canvas = element as HTMLCanvasElement;
    return Array.from(canvas.getContext('2d')!.getImageData(
      Math.min(canvas.width - 1, Math.floor(canvas.width * point.x)),
      Math.min(canvas.height - 1, Math.floor(canvas.height * point.y)), 1, 1,
    ).data);
  }, { x, y });
}
async function drag(page: Page, points: { x: number; y: number }[], steps = 1) {
  const rect = await bounds(page);
  await page.mouse.move(rect.x + points[0]!.x * rect.width, rect.y + points[0]!.y * rect.height);
  await page.mouse.down();
  for (const point of points.slice(1)) await page.mouse.move(rect.x + point.x * rect.width, rect.y + point.y * rect.height, { steps });
  await page.mouse.up();
}
async function clickAt(page: Page, x: number, y: number) {
  const rect = await bounds(page);
  await page.mouse.click(rect.x + x * rect.width, rect.y + y * rect.height);
}
async function setSlider(page: Page, name: 'Radius' | 'Strength', value: number) {
  await toolsPanel(page, true);
  const slider = page.getByRole('slider', { name: new RegExp(name) });
  const min = Number(await slider.getAttribute('min'));
  const max = Number(await slider.getAttribute('max'));
  const step = Number(await slider.getAttribute('step'));
  const fromEnd = value > (min + max) / 2;
  await slider.press(fromEnd ? 'End' : 'Home');
  const count = Math.round(Math.abs(value - (fromEnd ? max : min)) / step);
  for (let index = 0; index < count; index += 1) await slider.press(fromEnd ? 'ArrowLeft' : 'ArrowRight');
  await expect(slider).toHaveValue(String(value));
}
async function fixture(page: Page) {
  await page.goto('/tests/fixtures/terrain.html');
  await expect.poll(async () => (await stats(page)).repaints).toBeGreaterThan(0);
}
async function stats(page: Page) {
  return page.evaluate(async () => {
    const fixture = await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src) as typeof import('./fixtures/terrain.tsx');
    return fixture.statistics();
  });
}
async function snapshot(page: Page) {
  await page.evaluate(async () => (await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src)).snapshot());
}
async function unchanged(page: Page) {
  return page.evaluate(async () => (await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src)).matchesSnapshot() as boolean);
}

test('actual toolbar and canvas raise an island, increase its height, and lower it back under water', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click();
  await toolsPanel(page, true);
  await expect(page.getByRole('button', { name: 'Raise', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => pixel(page, 0.5, 0.5)).toEqual(water);
  await clickAt(page, 0.5, 0.5);
  await expect.poll(async () => { const color = await pixel(page, 0.5, 0.5); return color[1]! > color[2]!; }).toBe(true);
  const firstLand = await pixel(page, 0.5, 0.5);
  await clickAt(page, 0.5, 0.5);
  await expect.poll(() => pixel(page, 0.5, 0.5)).not.toEqual(firstLand);
  await toolsPanel(page, true);
  await page.getByRole('button', { name: 'Lower', exact: true }).click();
  await toolsPanel(page, true);
  await expect(page.getByRole('button', { name: 'Lower', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await clickAt(page, 0.5, 0.5);
  await clickAt(page, 0.5, 0.5);
  await expect.poll(() => pixel(page, 0.5, 0.5)).toEqual(water);
  await clickAt(page, 0.5, 0.5);
  await expect.poll(() => pixel(page, 0.5, 0.5)).not.toEqual(water);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('one fast browser pointer jump leaves a continuous land stroke', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click();
  await drag(page, [{ x: 0.15, y: 0.5 }, { x: 0.85, y: 0.5 }]);
  await expect.poll(async () => (await pixel(page, 0.5, 0.5))[1]! > (await pixel(page, 0.5, 0.5))[2]!).toBe(true);
  for (let x = 0.15; x <= 0.85; x += 0.025) {
    const color = await pixel(page, x, 0.5);
    expect(color[1]).toBeGreaterThan(color[2]!);
  }
});

test('radius and strength controls visibly affect the brush footprint', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click();
  await clickAt(page, 0.25, 0.3);
  await expect.poll(() => pixel(page, 0.25, 0.3)).not.toEqual(water);
  expect(await pixel(page, 0.34, 0.3)).toEqual(water);
  await setSlider(page, 'Radius', 20);
  await setSlider(page, 'Strength', 1000);
  await clickAt(page, 0.65, 0.65);
  await expect.poll(async () => (await pixel(page, 0.74, 0.65))[1]! > (await pixel(page, 0.74, 0.65))[2]!).toBe(true);
  await toolsPanel(page, true);
  await expect(page.getByRole('slider', { name: /Radius/ })).toHaveAttribute('aria-valuetext', "20% of the map's shorter side");
  await toolsPanel(page, true);
  await expect(page.getByRole('slider', { name: /Strength/ })).toHaveAttribute('aria-valuetext', '1000 meters per dab at the brush center');
});

test('hovering, stationary contact, and movement after release leave the numerical data unchanged', async ({ page }) => {
  await fixture(page);
  await snapshot(page);
  const rect = await bounds(page);
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2, { steps: 20 });
  expect(await unchanged(page)).toBe(true);
  await page.mouse.down();
  expect((await stats(page)).max).toBeGreaterThan(0);
  await snapshot(page);
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2, { steps: 20 });
  expect(await unchanged(page)).toBe(true);
  await page.mouse.up();
  await page.mouse.move(rect.x + rect.width * 0.8, rect.y + rect.height * 0.8, { steps: 20 });
  expect(await unchanged(page)).toBe(true);
});

for (const termination of ['pointercancel', 'lostpointercapture', 'blur', 'resize', 'read-only'] as const) {
  test(`${termination} stops an active stroke even while the button remains down`, async ({ page }) => {
    await fixture(page);
    const rect = await bounds(page);
    await page.mouse.move(rect.x + rect.width * 0.3, rect.y + rect.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width * 0.45, rect.y + rect.height * 0.5);
    await snapshot(page);
    if (termination === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    else if (termination === 'resize') await page.setViewportSize({ width: 750, height: 650 });
    else if (termination === 'read-only') {
      await page.evaluate(async () => (await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src)).setBrush(undefined));
      await expect(map(page)).toHaveAttribute('data-editable', 'false');
    }
    else await map(page).evaluate((canvas, type) => canvas.dispatchEvent(new PointerEvent(type, { pointerId: 1, isPrimary: true, bubbles: true })), termination);
    await page.mouse.move(rect.x + rect.width * 0.8, rect.y + rect.height * 0.5, { steps: 20 });
    await page.mouse.up();
    expect(await unchanged(page)).toBe(true);
  });
}

test('captured strokes handle corners and an outside release without continuing to paint', async ({ page }) => {
  await fixture(page);
  const rect = await bounds(page);
  await page.mouse.move(rect.x + 1, rect.y + 1);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width - 1, rect.y + 1);
  await page.mouse.move(rect.x + rect.width + 15, rect.y + rect.height + 15);
  await page.mouse.up();
  await snapshot(page);
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  expect(await unchanged(page)).toBe(true);
  expect(Number.isFinite((await stats(page)).max)).toBe(true);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('resizing an already sculpted component preserves every elevation and the buffer identity', async ({ page }) => {
  await fixture(page);
  await drag(page, [{ x: 0.2, y: 0.4 }, { x: 0.8, y: 0.6 }]);
  expect((await stats(page)).changed).toBeGreaterThan(0);
  await snapshot(page);
  const priorFrames = (await stats(page)).repaints;
  await page.setViewportSize({ width: 750, height: 650 });
  await expect.poll(async () => (await stats(page)).repaints).toBeGreaterThan(priorFrames);
  expect(await unchanged(page)).toBe(true);
  expect((await stats(page)).count).toBe(512 * 512);
});

for (const boundary of [false, true]) {
test(`equivalent browser strokes are consistent across sparse and dense events${boundary ? ' when exiting the map' : ''}`, async ({ page }) => {
  const arrays: number[][] = [];
  for (const steps of [1, 80]) {
    await fixture(page);
    await drag(page, boundary ? [{ x: 0.8, y: 0.8 }, { x: 1.01, y: 0.2 }] : [{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }], steps);
    arrays.push(await page.evaluate(async () => Array.from((await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src)).terrain.elevations as Float32Array)));
  }
  let maxDifference = 0;
  for (let index = 0; index < arrays[0]!.length; index += 1) {
    maxDifference = Math.max(maxDifference, Math.abs(arrays[0]![index]! - arrays[1]![index]!));
  }
  expect(maxDifference).toBeLessThan(0.01);
});
}

test('many pointer events in one task queue one repaint and no React commits', async ({ page }) => {
  await fixture(page);
  const rect = await bounds(page);
  await page.mouse.move(rect.x + rect.width * 0.2, rect.y + rect.height * 0.5);
  await page.mouse.down();
  await expect.poll(async () => (await stats(page)).repaints).toBeGreaterThan(1);
  const result = await map(page).evaluate(async (canvas) => {
    const fixture = await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src) as typeof import('./fixtures/terrain.tsx');
    const before = fixture.statistics();
    const rect = canvas.getBoundingClientRect();
    for (let index = 1; index <= 60; index += 1) {
      canvas.dispatchEvent(new PointerEvent('pointermove', {
        pointerId: 1, isPrimary: true, pointerType: 'mouse', buttons: 1,
        clientX: rect.x + (0.2 + index / 100) * rect.width,
        clientY: rect.y + rect.height * 0.5, bubbles: true,
      }));
    }
    const synchronous = fixture.statistics();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return { before, synchronous, after: fixture.statistics() };
  });
  expect(result.synchronous.repaints).toBe(result.before.repaints);
  expect(result.after.repaints - result.before.repaints).toBe(1);
  expect(result.after.commits).toBe(result.before.commits);
  expect(result.after.changed).toBeGreaterThan(result.before.changed);
  await page.mouse.up();
});

test('a read-only host and invalid brush settings cannot mutate terrain', async ({ page }) => {
  await fixture(page);
  await page.evaluate(async () => (await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src)).setBrush(undefined));
  await expect(map(page)).toHaveAttribute('data-editable', 'false');
  await snapshot(page);
  await drag(page, [{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }]);
  expect(await unchanged(page)).toBe(true);
  await page.evaluate(async () => (await import((document.querySelector<HTMLScriptElement>('script[src*="terrain.tsx"]')!).src)).setBrush({ tool: 'raise', radius: 0, strength: 200 }));
  await expect(map(page)).toHaveAttribute('data-editable', 'true');
  await clickAt(page, 0.5, 0.5);
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await unchanged(page)).toBe(true);
});

test('native pen contact sculpts and pen hover after release does not paint', async ({ page, context }) => {
  await fixture(page);
  const rect = await bounds(page);
  const session = await context.newCDPSession(page);
  const position = { x: rect.x + rect.width * 0.3, y: rect.y + rect.height * 0.5 };
  await session.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...position, button: 'left', buttons: 1, pointerType: 'pen', force: 0.5 });
  await session.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x + rect.width * 0.7, y: position.y, button: 'left', buttons: 1, pointerType: 'pen', force: 0.5 });
  await session.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x + rect.width * 0.7, y: position.y, button: 'left', buttons: 0, pointerType: 'pen' });
  expect((await stats(page)).max).toBeGreaterThan(0);
  await snapshot(page);
  await session.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x + rect.width * 0.9, y: position.y, buttons: 0, pointerType: 'pen' });
  expect(await unchanged(page)).toBe(true);
  await session.detach();
});

test('native single-touch dragging sculpts without scrolling and ends cleanly', async ({ page, context, isMobile }) => {
  test.skip(!isMobile, 'Touch-emulation coverage belongs to the mobile project.');
  await fixture(page);
  const rect = await bounds(page);
  const session = await context.newCDPSession(page);
  const point = (x: number) => [{ x: rect.x + rect.width * x, y: rect.y + rect.height * 0.5, id: 1 }];
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(0.2) });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(0.8) });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect((await stats(page)).max).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await snapshot(page);
  await page.mouse.move(rect.x + rect.width * 0.9, rect.y + rect.height * 0.9);
  expect(await unchanged(page)).toBe(true);
  await session.detach();
});

test('visual evidence: islands, higher terrain, and a lowered channel sculpted through the interface', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click();
  await setSlider(page, 'Radius', 14);
  await setSlider(page, 'Strength', 300);
  await drag(page, [{ x: 0.25, y: 0.52 }, { x: 0.35, y: 0.4 }, { x: 0.49, y: 0.38 }, { x: 0.62, y: 0.48 }, { x: 0.7, y: 0.65 }], 12);
  await drag(page, [{ x: 0.28, y: 0.56 }, { x: 0.41, y: 0.52 }, { x: 0.57, y: 0.59 }], 12);
  await setSlider(page, 'Radius', 5);
  await setSlider(page, 'Strength', 1000);
  for (let index = 0; index < 3; index += 1) {
    await drag(page, [{ x: 0.32, y: 0.46 }, { x: 0.42, y: 0.4 }, { x: 0.51, y: 0.43 }], 12);
  }
  await toolsPanel(page, true);
  await page.getByRole('button', { name: 'Lower', exact: true }).click();
  await setSlider(page, 'Radius', 3);
  await drag(page, [{ x: 0.58, y: 0.28 }, { x: 0.55, y: 0.46 }, { x: 0.59, y: 0.7 }], 12);
  await toolsPanel(page, true);
  await page.getByRole('button', { name: 'Raise', exact: true }).click();
  await setSlider(page, 'Radius', 7);
  await setSlider(page, 'Strength', 200);
  await drag(page, [{ x: 0.79, y: 0.29 }, { x: 0.83, y: 0.36 }], 8);
  await page.mouse.move(5, 5);
  await expect.poll(async () => (await pixel(page, 0.42, 0.4))[0]!).toBeGreaterThan(150);
  expect(await pixel(page, 0.05, 0.05)).toEqual(water);
  expect((await pixel(page, 0.58, 0.6))[2]).toBeGreaterThan((await pixel(page, 0.58, 0.6))[1]!);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('a1-sculpting-regression.png'), fullPage: true });
});
