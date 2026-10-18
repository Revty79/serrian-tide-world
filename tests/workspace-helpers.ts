import { expect, type Page } from '@playwright/test';

export async function createWorld(page: Page, shape: 'bounded' | 'wrapped' | 'sphere', options: { name?: string; radius?: string; n?: number } = {}) {
  const dialog = page.getByRole('dialog', { name: 'New World / Map' });
  if (!await dialog.isVisible()) { await toolsPanel(page, true); await page.getByRole('button', { name: 'New World / Map', exact: true }).click(); }
  await page.getByLabel('World shape', { exact: true }).selectOption(shape);
  await page.getByLabel('World/map name', { exact: true }).fill(options.name ?? (shape === 'sphere' ? 'Untitled sphere' : shape === 'wrapped' ? 'Untitled wrapped world' : 'Untitled world'));
  if (shape === 'sphere') { await page.getByLabel('Sphere reference radius (m)', { exact: true }).fill(options.radius ?? '1000000'); await page.getByLabel('Spherical resolution', { exact: true }).selectOption(String(options.n ?? 128)); }
  await page.getByRole('button', { name: 'Create World / Map', exact: true }).click();
  await expect(dialog).not.toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('main', { name: 'Atlas workspace' })).toHaveAttribute('data-world-shape', shape);
}
export async function startAtlas(page: Page) { await page.goto('/'); await createWorld(page, 'bounded'); }

/** The full-screen shell overlays controls; tests explicitly open tools or expose the map. */
export async function toolsPanel(page: Page, open: boolean) {
  const browse = page.getByRole('button', { name: 'Browse saved maps', exact: true });
  if (await browse.isVisible()) await browse.click();
  const button = page.getByRole('button', { name: open ? 'Open tools' : 'Close tools', exact: true });
  if (await button.count()) await button.click();
  if (open) {
    const panel = page.getByRole('complementary', { name: 'Atlas tools' });
    if (await panel.count()) await panel.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
  }
}
