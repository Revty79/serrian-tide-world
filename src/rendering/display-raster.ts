import type { Terrain } from '../terrain/model.ts';
import { isWrapped } from '../terrain/topology.ts';
import { elevationToColor } from './elevation-colors.ts';

/** Pixel coverage of a locally linear shoreline, integrating the height gradient over the pixel. */
export function coastCoverage(elevation: number, seaLevel: number, spanU: number, spanV: number) {
  const total = spanU + spanV;
  if (total === 0) return elevation > seaLevel ? 1 : 0;
  const t = seaLevel - elevation + total / 2;
  if (t <= 0) return 1;
  if (t >= total) return 0;
  if (spanU === 0 || spanV === 0) return 1 - t / total;
  const squared = (value: number) => Math.max(0, value) ** 2;
  return Math.max(0, Math.min(1, 1 - (squared(t) - squared(t - spanU) - squared(t - spanV) + squared(t - total)) / (2 * spanU * spanV)));
}

/** Presentation only: interpolate elevations, then classify water/land and color. Never writes terrain. */
export function displayElevation(terrain: Terrain, column: number, row: number): number {
  const { columns, rows } = terrain.metadata.resolution;
  const periodic = isWrapped(terrain);
  const x = periodic ? ((column % columns) + columns) % columns : Math.max(0, Math.min(columns - 1, column));
  const y = Math.max(0, Math.min(rows - 1, row));
  const left = Math.floor(x), top = Math.floor(y), right = periodic ? (left + 1) % columns : Math.min(columns - 1, left + 1), bottom = Math.min(rows - 1, top + 1);
  const tx = x - left, ty = y - top;
  const a = terrain.elevations[top * columns + left]! * (1 - tx) + terrain.elevations[top * columns + right]! * tx;
  const b = terrain.elevations[bottom * columns + left]! * (1 - tx) + terrain.elevations[bottom * columns + right]! * tx;
  return a * (1 - ty) + b * ty;
}
export function createDisplayRaster(terrain: Terrain, budget = 1_048_576, antialiasCoasts = true) {
  const { columns, rows } = terrain.metadata.resolution;
  const factor = Math.min(4, Math.max(1, Math.sqrt(budget / (columns * rows))));
  const periodic = isWrapped(terrain);
  const width = Math.max(columns, Math.floor((periodic ? columns : columns - 1) * factor) + (periodic ? 0 : 1));
  const height = Math.max(rows, Math.floor((rows - 1) * factor) + 1);
  const pixels = new Uint8ClampedArray(width * height * 4);
  const stepX = (periodic ? columns : columns - 1) / (periodic ? width : width - 1), stepY = (rows - 1) / (height - 1);
  const seaLevel = terrain.metadata.seaLevel, values = terrain.elevations;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const gx = x * stepX, gy = y * stepY, left = Math.floor(gx), top = Math.floor(gy), right = periodic ? (left + 1) % columns : Math.min(columns - 1, left + 1), bottom = Math.min(rows - 1, top + 1);
    const a = values[top * columns + left]!, b = values[top * columns + right]!, c = values[bottom * columns + left]!, d = values[bottom * columns + right]!;
    const tx = gx - left, ty = gy - top;
    const elevation = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    let color = elevationToColor(elevation, seaLevel);
    const index = (y * width + x) * 4;
    // Area coverage only in cells intersecting the coastline. This is not a blur pass.
    if (antialiasCoasts && Math.min(a, b, c, d) <= seaLevel && Math.max(a, b, c, d) > seaLevel) {
      const spanU = Math.abs((b - a) * (1 - ty) + (d - c) * ty) * stepX;
      const spanV = Math.abs((c - a) * (1 - tx) + (d - b) * tx) * stepY;
      const coverage = coastCoverage(elevation, seaLevel, spanU, spanV);
      if (coverage > 0 && coverage < 1) {
        const epsilon = Math.max(Number.EPSILON, Math.abs(seaLevel) * Number.EPSILON * 4);
        const land = elevationToColor(Math.max(seaLevel + epsilon, elevation + (spanU + spanV) / 4), seaLevel);
        const water = elevationToColor(Math.min(seaLevel, elevation - (spanU + spanV) / 4), seaLevel);
        color = [0, 1, 2].map((i) => Math.round(land[i]! * coverage + water[i]! * (1 - coverage))) as [number, number, number];
      }
    }
    pixels[index] = color[0]; pixels[index + 1] = color[1]; pixels[index + 2] = color[2]; pixels[index + 3] = 255;
  }
  return { width, height, pixels };
}
