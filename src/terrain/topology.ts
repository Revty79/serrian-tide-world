import { createBlankTerrain, type Terrain, type WrappedTerrainMetadata } from './model.ts';
import { createRectangularLattice, createRectangularSurface } from '../surfaces/rectangular.ts';
import { assertChart, type ChartAddress } from '../surfaces/contracts.ts';

export const isWrapped = (terrain: Terrain): terrain is Terrain<WrappedTerrainMetadata> => terrain.metadata.dataVersion === 2;
const mathCache = new WeakMap<Terrain, ReturnType<typeof makeMath>>();
function makeMath(terrain: Terrain<WrappedTerrainMetadata>) {
  const { metadata } = terrain;
  if (metadata.topology !== 'horizontal-periodic' || metadata.sampleOwnership !== 'unique-u-inclusive-v') throw new RangeError('Unsupported terrain topology.');
  const surface = createRectangularSurface({ address: metadata.identity, ...metadata.dimensions, periodicU: true });
  const lattice = createRectangularLattice(surface, metadata.resolution.columns, metadata.resolution.rows);
  return { surface, lattice };
}
export function wrappedMath(terrain: Terrain<WrappedTerrainMetadata>) {
  let math = mathCache.get(terrain);
  if (!math) { math = makeMath(terrain); mathCache.set(terrain, math); }
  return math;
}
/** New periodic authority only. Never converts or reinterprets a legacy bounded grid. */
export function createWrappedTerrain(options: { id: string; identity: ChartAddress; columns?: number; rows?: number; width?: number; height?: number; seaLevel?: number }): Terrain<WrappedTerrainMetadata> {
  assertChart(options.identity);
  const initial = createBlankTerrain(options);
  const terrain: Terrain<WrappedTerrainMetadata> = {
    metadata: Object.freeze({ ...initial.metadata, dataVersion: 2, topology: 'horizontal-periodic', sampleOwnership: 'unique-u-inclusive-v', identity: Object.freeze({ ...options.identity }) }),
    elevations: initial.elevations,
  };
  wrappedMath(terrain);
  return terrain;
}
