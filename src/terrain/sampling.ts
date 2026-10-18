import type { Terrain } from './model.ts';
import { isWrapped, wrappedMath } from './topology.ts';

export interface Point {
  x: number;
  y: number;
}

export interface GridPoint {
  column: number;
  row: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export function gridIndex(terrain: Terrain, { column, row }: GridPoint): number {
  const { columns, rows } = terrain.metadata.resolution;
  if (!Number.isInteger(column) || !Number.isInteger(row)
    || column < 0 || column >= columns || row < 0 || row >= rows) {
    throw new RangeError('Sample lies outside the terrain grid.');
  }
  return row * columns + column;
}

function assertPointWithin(point: Point, width: number, height: number): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)
    || point.x < 0 || point.x > width || point.y < 0 || point.y > height) {
    throw new RangeError('Point lies outside the planar editing surface.');
  }
}

/** Samples include both edges of the map; out-of-range coordinates never wrap. */
export function worldToGrid(terrain: Terrain, point: Point): GridPoint {
  const { width, height } = terrain.metadata.dimensions;
  const { columns, rows } = terrain.metadata.resolution;
  if (isWrapped(terrain)) {
    const normalized = wrappedMath(terrain).surface.topology.normalize({ ...terrain.metadata.identity, u: point.x, v: point.y });
    if (!normalized) throw new RangeError('Point lies outside the bounded vertical extent.');
    return { column: Math.round(normalized.u / width * columns) % columns, row: Math.round(normalized.v / height * (rows - 1)) };
  }
  assertPointWithin(point, width, height);
  return {
    column: Math.round((point.x / width) * (columns - 1)),
    row: Math.round((point.y / height) * (rows - 1)),
  };
}

export function gridToWorld(terrain: Terrain, point: GridPoint): Point {
  gridIndex(terrain, point);
  if (isWrapped(terrain)) { const position = wrappedMath(terrain).lattice.positionAt(point); return { x: position.u, y: position.v }; }
  const { width, height } = terrain.metadata.dimensions;
  const { columns, rows } = terrain.metadata.resolution;
  return {
    x: (point.column / (columns - 1)) * width,
    y: (point.row / (rows - 1)) * height,
  };
}

/** Accepts CSS-pixel coordinates relative to the canvas, independent of device pixel ratio. */
export function viewportToWorld(terrain: Terrain, point: Point, viewport: ViewportSize): Point {
  if (![viewport.width, viewport.height].every((size) => Number.isFinite(size) && size > 0)) {
    throw new RangeError('Viewport dimensions must be finite and positive.');
  }
  assertPointWithin(point, viewport.width, viewport.height);
  return {
    x: (point.x / viewport.width) * terrain.metadata.dimensions.width,
    y: (point.y / viewport.height) * terrain.metadata.dimensions.height,
  };
}

export function sampleElevation(terrain: Terrain, point: Point): number {
  return terrain.elevations[gridIndex(terrain, worldToGrid(terrain, point))]!;
}

export function inspectElevation(terrain: Terrain, point: Point) {
  const elevation = sampleElevation(terrain, point);
  if (!Number.isFinite(elevation)) throw new RangeError('Sampled elevation is not finite.');
  const relativeHeight = elevation - terrain.metadata.seaLevel;
  return {
    position: isWrapped(terrain) ? { x: wrappedMath(terrain).surface.topology.normalize({ ...terrain.metadata.identity, u: point.x, v: point.y })!.u, y: point.y } : { ...point },
    elevation,
    seaLevelRelation: relativeHeight > 0 ? 'above' as const : relativeHeight < 0 ? 'below' as const : 'at' as const,
  };
}

export type ElevationSample = ReturnType<typeof inspectElevation>;
