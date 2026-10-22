import { expect, type Page } from '@playwright/test';

/** A short leg can finish while the panel scrolls into view. Inspect the
 * persistent control atomically instead of waiting for a past button label.
 * Camera, progress, containment and exact-geography assertions still follow. */
export async function pausePassageTravelIfMoving(page:Page){
  await page.getByRole('button',{name:/^(Pause passage travel|Travel passage)$/}).evaluate(element=>{
    const button=element as HTMLButtonElement;
    if(!button.disabled&&button.textContent?.trim()==='Pause passage travel')button.click();
  });
}

export async function createWorld(page: Page, shape: 'bounded' | 'wrapped' | 'sphere', options: { name?: string; radius?: string; n?: number } = {}) {
  const dialog = page.getByRole('dialog', { name: 'New World / Map' });
  if (!await dialog.isVisible()) { await toolsPanel(page, true); await page.getByRole('button', { name: 'New World / Map', exact: true }).click(); }
  await page.getByLabel('World shape', { exact: true }).selectOption(shape);
  await page.getByLabel('World/map name', { exact: true }).fill(options.name ?? (shape === 'sphere' ? 'Untitled sphere' : shape === 'wrapped' ? 'Untitled wrapped world' : 'Untitled world'));
  if (shape === 'sphere') { await page.getByLabel('Sphere reference radius (m)', { exact: true }).fill(options.radius ?? '1000000'); await page.getByLabel('Spherical resolution', { exact: true }).selectOption(String(options.n ?? 128)); }
  await page.getByRole('button', { name: 'Create World / Map', exact: true }).click();
  await expect(dialog).not.toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('main', { name: 'Atlas workspace' })).toHaveAttribute('data-world-shape', shape);
  if (shape === 'sphere') await sphericalPresentation(page);
}
/** CPU fallback publishes a complete image asynchronously. Wait for the actual
 * displayed camera and source epoch rather than assuming two RAFs are enough. */
export async function sphericalPresentation(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.waitForFunction(() => [...document.querySelectorAll<HTMLCanvasElement>('canvas[data-resolution]')].every(c => c.dataset.ready === 'true' && c.dataset.viewPending === 'false' && c.dataset.displayPending !== 'true' && c.dataset.revision === c.dataset.displayRevision), undefined, { timeout: 60000 });
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
