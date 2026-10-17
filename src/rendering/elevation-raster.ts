import type { Terrain } from '../terrain/model.ts';
import { elevationToColor } from './elevation-colors.ts';

/** One opaque pixel per elevation sample. No browser or React dependency. */
export function createElevationRaster(terrain: Terrain) {
  const { columns, rows } = terrain.metadata.resolution;
  const pixels = new Uint8ClampedArray(columns * rows * 4);
  for (let index = 0; index < terrain.elevations.length; index += 1) {
    const color = elevationToColor(terrain.elevations[index]!, terrain.metadata.seaLevel);
    const offset = index * 4;
    pixels[offset] = color[0];
    pixels[offset + 1] = color[1];
    pixels[offset + 2] = color[2];
    pixels[offset + 3] = 255;
  }
  return { width: columns, height: rows, pixels };
}
