import { assertFloat32Elevation, type Terrain } from './model.ts';
import { gridIndex, type GridPoint } from './sampling.ts';

/** Low-level numerical mutation only. Call the renderer afterwards to display a change. */
export function setElevation(terrain: Terrain, point: GridPoint, elevation: number): void {
  assertFloat32Elevation(elevation);
  terrain.elevations[gridIndex(terrain, point)] = elevation;
}

/** Explicit reset only. Retains the complete terrain object, metadata, and buffer. */
export function resetTerrainToOcean(terrain: Terrain): void {
  const { columns, rows } = terrain.metadata.resolution;
  if (!(terrain.elevations instanceof Float32Array)
    || ![columns, rows].every((value) => Number.isSafeInteger(value) && value >= 2)
    || terrain.elevations.length !== columns * rows) {
    throw new RangeError('Reset requires a valid Float32 terrain grid.');
  }
  terrain.elevations.fill(-100);
}
