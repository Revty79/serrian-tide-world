import { assertFloat32Elevation, type Terrain } from './model.ts';
import { gridIndex, type GridPoint } from './sampling.ts';

/** Low-level numerical mutation only. Call the renderer afterwards to display a change. */
export function setElevation(terrain: Terrain, point: GridPoint, elevation: number): void {
  assertFloat32Elevation(elevation);
  terrain.elevations[gridIndex(terrain, point)] = elevation;
}
