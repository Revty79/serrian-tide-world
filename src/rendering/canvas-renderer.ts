import type { Terrain } from '../terrain/model.ts';
import type { ViewportSize } from '../terrain/sampling.ts';
import { createElevationRaster } from './elevation-raster.ts';
import { createDisplayRaster } from './display-raster.ts';

export function terrainRasterCanvas(canvas: HTMLCanvasElement, terrain: Terrain, interpolate = false) {
  const raster = interpolate ? createDisplayRaster(terrain, canvas.ownerDocument.defaultView?.matchMedia('(pointer: coarse)').matches ? 589_824 : 1_048_576) : createElevationRaster(terrain);
  const source = canvas.ownerDocument.createElement('canvas');
  source.width = raster.width; source.height = raster.height;
  const context = source.getContext('2d');
  if (!context) throw new Error('A 2D canvas context is required to render terrain.');
  const image = context.createImageData(raster.width, raster.height); image.data.set(raster.pixels); context.putImageData(image, 0, 0);
  return source;
}

/** Resizes only the display bitmap. The numerical terrain is never resized or mutated. */
export function renderTerrain(
  canvas: HTMLCanvasElement,
  terrain: Terrain,
  viewport: ViewportSize,
  pixelRatio = 1,
  interpolate = false,
): void {
  if (![viewport.width, viewport.height, pixelRatio]
    .every((value) => Number.isFinite(value) && value > 0)) {
    throw new RangeError('Display size and pixel ratio must be finite and positive.');
  }
  const context = canvas.getContext('2d');
  if (!context) throw new Error('A 2D canvas context is required to display Atlas.');

  const source = terrainRasterCanvas(canvas, terrain, interpolate);

  canvas.width = Math.max(1, Math.round(viewport.width * pixelRatio));
  canvas.height = Math.max(1, Math.round(viewport.height * pixelRatio));
  context.imageSmoothingEnabled = interpolate;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
}

/** Repeat a presentation raster horizontally; one elevation authority, one bounded vertical extent. */
export function renderWrappedView(canvas: HTMLCanvasElement, source: HTMLCanvasElement, rect: { left: number; top: number; width: number; height: number }, stage: ViewportSize, pixelRatio = 1) {
  const width = Math.max(1, Math.round(stage.width * pixelRatio)), height = Math.max(1, Math.round(stage.height * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const context = canvas.getContext('2d');
  if (!context) throw new Error('A 2D canvas context is required.');
  context.resetTransform(); context.clearRect(0, 0, width, height);
  context.setTransform(width / stage.width, 0, 0, height / stage.height, 0, 0);
  context.save(); context.beginPath(); context.rect(0, rect.top, stage.width, rect.height); context.clip();
  context.imageSmoothingEnabled = true;
  const pattern = context.createPattern(source, 'repeat-x');
  if (!pattern) throw new Error('The wrapped view could not be created.');
  const dx = rect.width / source.width, dy = rect.height / (source.height - 1);
  pattern.setTransform(new DOMMatrix([dx, 0, 0, dy, rect.left - dx / 2, rect.top - dy / 2]));
  context.fillStyle = pattern; context.fillRect(0, 0, stage.width, stage.height); context.restore();
}
