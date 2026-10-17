import type { Terrain } from '../terrain/model.ts';
import type { ViewportSize } from '../terrain/sampling.ts';
import { createElevationRaster } from './elevation-raster.ts';

/** Resizes only the display bitmap. The numerical terrain is never resized or mutated. */
export function renderTerrain(
  canvas: HTMLCanvasElement,
  terrain: Terrain,
  viewport: ViewportSize,
  pixelRatio = 1,
): void {
  if (![viewport.width, viewport.height, pixelRatio]
    .every((value) => Number.isFinite(value) && value > 0)) {
    throw new RangeError('Display size and pixel ratio must be finite and positive.');
  }
  const context = canvas.getContext('2d');
  if (!context) throw new Error('A 2D canvas context is required to display Atlas.');

  const raster = createElevationRaster(terrain);
  const source = canvas.ownerDocument.createElement('canvas');
  source.width = raster.width;
  source.height = raster.height;
  const sourceContext = source.getContext('2d');
  if (!sourceContext) throw new Error('A 2D canvas context is required to render terrain.');
  const image = sourceContext.createImageData(raster.width, raster.height);
  image.data.set(raster.pixels);
  sourceContext.putImageData(image, 0, 0);

  canvas.width = Math.max(1, Math.round(viewport.width * pixelRatio));
  canvas.height = Math.max(1, Math.round(viewport.height * pixelRatio));
  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
}
