import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { toolsPanel, startAtlas } from './workspace-helpers.ts';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/saves/a3-v1-heightmap.json', import.meta.url), 'utf8')) as {
  sourceCommit: string;
  record: { id: string; name: string; metadata: unknown; elevationsBase64: string; [key: string]: unknown };
};
const originalDigest = createHash('sha256').update(Buffer.from(fixture.record.elevationsBase64, 'base64')).digest('hex');

test('A4 opens an A3 v1 save in the actual planar editor, preserves it through view/history operations and continues editing', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await startAtlas(page);
  await page.evaluate(async (data) => {
    const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
    const { elevationsBase64, ...record } = data;
    const bytes = Uint8Array.from(atob(elevationsBase64), (character) => character.charCodeAt(0));
    await new LocalMapStore().save({ ...record, elevations: bytes.buffer } as unknown as import('../src/persistence/terrain-format.ts').SavedHeightmap);
  }, fixture.record);
  await page.reload();
  await toolsPanel(page, true);
  await page.getByRole('combobox', { name: 'Saved maps', exact: true }).selectOption(fixture.record.id);
  await page.getByRole('button', { name: 'Open Map', exact: true }).click();
  await expect(page.getByLabel('Map work status', { exact: true })).toHaveText('Saved on this device', { timeout: 30000 });
  await toolsPanel(page, true);
  await expect(page.getByRole('textbox', { name: 'Map name', exact: true })).toHaveValue(fixture.record.name);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await expect(page.getByRole('combobox')).toHaveCount(1); // No unsupported shape selector added.
  const map = page.getByRole('img', { name: 'Atlas terrain map' });
  await expect.poll(async () => { const rect = (await map.boundingBox())!; return rect.width / rect.height; }).toBeCloseTo(2, 5);

  const signature = () => page.evaluate(async (id) => {
    const { LocalMapStore } = await import(new URL('/src/persistence/local-map-store.ts', location.origin).href) as typeof import('../src/persistence/local-map-store.ts');
    const { encodeHeightmap } = await import(new URL('/src/persistence/terrain-format.ts', location.origin).href) as typeof import('../src/persistence/terrain-format.ts');
    const { describeLegacyPlanarTerrain } = await import(new URL('/src/surfaces/legacy-planar.ts', location.origin).href) as typeof import('../src/surfaces/legacy-planar.ts');
    const loaded = await new LocalMapStore().open(id), bound = describeLegacyPlanarTerrain(loaded.terrain, { worldId: 'test-world', surfaceId: 'test-surface', patchId: 'legacy' });
    const record = await encodeHeightmap(bound.terrain, loaded.name);
    return {
      id: record.id, metadata: JSON.stringify(record.metadata), version: record.formatVersion,
      digest: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', record.elevations)), (byte) => byte.toString(16).padStart(2, '0')).join(''),
      negativeZero: Object.is(bound.terrain.elevations[0], -0), bounded: !bound.math.chart.periodicU && !bound.math.chart.periodicV,
    };
  }, fixture.record.id);
  const original = await signature();
  expect(original.digest).toBe(originalDigest); expect(original.metadata).toBe(JSON.stringify(fixture.record.metadata));
  expect(original.version).toBe(1); expect(original.negativeZero && original.bounded).toBe(true);
  await page.getByRole('button', { name: 'Zoom In', exact: true }).click();
  await page.getByRole('button', { name: 'Pan', exact: true }).click(); await toolsPanel(page, false);
  const area = (await page.getByLabel('Map display area').boundingBox())!;
  const center = { x: area.width / 2, y: area.height / 2 };
  await page.mouse.move(center.x, center.y); await page.mouse.down(); await page.mouse.move(center.x + 20, center.y + 10); await page.mouse.up();
  await toolsPanel(page, true); await page.getByRole('button', { name: 'Raise', exact: true }).click(); await toolsPanel(page, false);
  await page.mouse.click(center.x, center.y);
  await expect(page.getByText('Unsaved changes', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible(); expect(await signature()).toEqual(original);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click(); await expect(page.getByText('Saved on this device', { exact: true })).toBeVisible();
  const edited = await signature(); expect(edited.digest).not.toBe(original.digest); expect(edited.metadata).toBe(original.metadata);
  await toolsPanel(page, true);
  await page.screenshot({ path: info.outputPath('a4-legacy-preserved-regression.png') });
  expect(errors).toEqual([]); await expect(page.getByRole('alert')).toHaveCount(0);
});
