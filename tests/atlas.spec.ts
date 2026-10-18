import { startAtlas } from './workspace-helpers.ts';
import { expect, test, type Page } from '@playwright/test';

async function canvasState(page: Page) {
  return page.getByRole('img', { name: 'Atlas terrain map' }).evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext('2d')!;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const first = Array.from(pixels.slice(0, 4));
    let uniform = first[3] === 255;
    for (let index = 0; index < pixels.length; index += 1) {
      if (pixels[index] !== first[index % 4]) { uniform = false; break; }
    }
    const bounds = canvas.getBoundingClientRect();
    return {
      width: canvas.width,
      height: canvas.height,
      cssWidth: bounds.width,
      cssHeight: bounds.height,
      pixelRatio: devicePixelRatio,
      first,
      uniform,
    };
  });
}

test('Atlas opens with an uninterrupted, responsive ocean and no browser errors', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await startAtlas(page);
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click();
  await expect(page.getByRole('main', { name: 'Atlas workspace' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open tools', exact: true })).toBeVisible();
  await expect.poll(async () => (await canvasState(page)).uniform).toBe(true);
  const state = await canvasState(page);
  expect(state.first).toEqual([35, 104, 136, 255]);
  expect(state.cssWidth).toBeGreaterThan(280);
  expect(state.cssHeight).toBeGreaterThanOrEqual(330);
  expect(state.width).toBe(Math.round(state.cssWidth * state.pixelRatio));
  expect(state.height).toBe(Math.round(state.cssHeight * state.pixelRatio));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('initial-ocean.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('viewport resizing repaints the actual application canvas as the same ocean', async ({ page }) => {
  await startAtlas(page);
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click();
  await expect.poll(async () => (await canvasState(page)).uniform).toBe(true);
  const before = await canvasState(page);
  await page.setViewportSize({ width: 800, height: 600 });
  await expect.poll(async () => (await canvasState(page)).cssWidth).not.toBe(before.cssWidth);
  await expect.poll(async () => {
    const state = await canvasState(page);
    return state.width === Math.round(state.cssWidth * state.pixelRatio);
  }).toBe(true);
  const after = await canvasState(page);
  expect(after.uniform).toBe(true);
  expect(after.first).toEqual(before.first);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('real canvas rendering honors sea level and synthetic land while preserving all terrain on resize', async ({ page }) => {
  await startAtlas(page);
  await page.getByRole('button', { name: 'Fit Entire Map', exact: true }).click();
  const result = await page.evaluate(async () => {
    const model = await import(new URL('/src/terrain/model.ts', location.origin).href) as typeof import('../src/terrain/model.ts');
    const modifications = await import(new URL('/src/terrain/modifications.ts', location.origin).href) as typeof import('../src/terrain/modifications.ts');
    const renderer = await import(new URL('/src/rendering/canvas-renderer.ts', location.origin).href) as typeof import('../src/rendering/canvas-renderer.ts');
    const terrain = model.createBlankTerrain({ id: 'browser-proof' });
    modifications.setElevation(terrain, { column: 511, row: 0 }, 100);
    modifications.setElevation(terrain, { column: 0, row: 511 }, 0);
    const elevations = terrain.elevations;
    const before = elevations.slice();
    const metadata = JSON.stringify(terrain.metadata);
    const canvas = document.createElement('canvas');
    renderer.renderTerrain(canvas, terrain, { width: 512, height: 512 });
    const context = canvas.getContext('2d')!;
    const read = (x: number, y: number) => Array.from(context.getImageData(x, y, 1, 1).data);
    const water = read(0, 0);
    const land = read(511, 0);
    const atSeaLevel = read(0, 511);
    renderer.renderTerrain(canvas, terrain, { width: 1200, height: 400 }, 2);
    renderer.renderTerrain(canvas, terrain, { width: 320, height: 600 }, 3);
    return {
      water, land, atSeaLevel,
      sameBuffer: terrain.elevations === elevations,
      sameSamples: before.every((value, index) => value === elevations[index]),
      sameMetadata: metadata === JSON.stringify(terrain.metadata),
      sampleCount: elevations.length,
      resolution: terrain.metadata.resolution,
      displayWidth: canvas.width,
      displayHeight: canvas.height,
    };
  });
  expect(result.water).toEqual([35, 104, 136, 255]);
  expect(result.land).toEqual([113, 150, 90, 255]);
  expect(result.atSeaLevel).toEqual([37, 111, 143, 255]);
  expect(result.sameBuffer && result.sameSamples && result.sameMetadata).toBe(true);
  expect(result.sampleCount).toBe(512 * 512);
  expect(result.resolution).toEqual({ columns: 512, rows: 512 });
  expect([result.displayWidth, result.displayHeight]).toEqual([960, 1800]);
});
