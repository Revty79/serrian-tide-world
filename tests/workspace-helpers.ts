import type { Page } from '@playwright/test';

/** The full-screen shell overlays controls; tests explicitly open tools or expose the map. */
export async function toolsPanel(page: Page, open: boolean) {
  const button = page.getByRole('button', { name: open ? 'Open tools' : 'Close tools', exact: true });
  if (await button.count()) await button.click();
  if (open) {
    const panel = page.getByRole('complementary', { name: 'Atlas tools' });
    if (await panel.count()) await panel.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
  }
}
