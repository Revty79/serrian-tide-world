import {BLANK_OCEAN_ELEVATION} from './initial-elevation.ts';
/** In-memory terrain contract. A future file format must declare its own encoding. */
export const TERRAIN_DATA_VERSION = 1 as const;

interface TerrainMetadataBase {
  readonly id: string;
  readonly surface: 'planar';
  /** Neutral editing extent; these are not physical distances or planetary coordinates. */
  readonly dimensions: {
    readonly width: number;
    readonly height: number;
    readonly units: 'map-units';
  };
  readonly resolution: {
    readonly columns: number;
    readonly rows: number;
  };
  readonly elevationUnits: 'meters';
  readonly seaLevel: number;
}

export interface BoundedTerrainMetadata extends TerrainMetadataBase { readonly dataVersion: 1 }
export interface WrappedTerrainMetadata extends TerrainMetadataBase {
  readonly dataVersion: 2;
  readonly topology: 'horizontal-periodic';
  readonly sampleOwnership: 'unique-u-inclusive-v';
  readonly identity: { readonly worldId: string; readonly surfaceId: string; readonly patchId: string };
}
export type TerrainMetadata = BoundedTerrainMetadata | WrappedTerrainMetadata;

export interface Terrain<M extends TerrainMetadata = TerrainMetadata> {
  readonly metadata: M;
  /** Row-major: row * columns + column. Row zero is the top of the editing surface. */
  readonly elevations: Float32Array;
}

interface BlankTerrainOptions {
  id: string;
  columns?: number;
  rows?: number;
  width?: number;
  height?: number;
  seaLevel?: number;
  initialElevation?: number;
}

export function assertFloat32Elevation(value: number): void {
  if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value))) {
    throw new RangeError('Elevation must be a finite 32-bit floating-point value.');
  }
}

export function createBlankTerrain({
  id,
  columns = 512,
  rows = 512,
  width = 1,
  height = 1,
  seaLevel = 0,
  initialElevation = BLANK_OCEAN_ELEVATION,
}: BlankTerrainOptions): Terrain<BoundedTerrainMetadata> {
  if (id.trim().length === 0) throw new RangeError('A terrain ID is required.');
  if (![columns, rows].every((size) => Number.isSafeInteger(size) && size >= 2)) {
    throw new RangeError('Grid dimensions must be integers of at least two samples.');
  }
  if (!Number.isSafeInteger(columns * rows)) throw new RangeError('Grid is too large.');
  if (![width, height].every((size) => Number.isFinite(size) && size > 0)) {
    throw new RangeError('Map dimensions must be finite and positive.');
  }
  if (!Number.isFinite(seaLevel)) throw new RangeError('Sea level must be finite.');
  assertFloat32Elevation(initialElevation);

  return {
    metadata: Object.freeze({
      dataVersion: TERRAIN_DATA_VERSION,
      id,
      surface: 'planar',
      dimensions: Object.freeze({ width, height, units: 'map-units' }),
      resolution: Object.freeze({ columns, rows }),
      elevationUnits: 'meters',
      seaLevel,
    }),
    elevations: new Float32Array(columns * rows).fill(initialElevation),
  };
}
