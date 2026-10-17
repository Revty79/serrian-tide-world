import type { Terrain } from '../terrain/model.ts';
import { createRectangularLattice, createRectangularSurface } from './rectangular.ts';
import { assertChart, type ChartAddress } from './contracts.ts';
import { defineWorld } from './world.ts';

/** Explicit, in-memory interpretation of an unchanged A0–A3 terrain. Never rewrites or persists it. */
export function describeLegacyPlanarTerrain(terrain: Terrain, address: ChartAddress) {
  assertChart(address);
  const meta = terrain.metadata;
  if (meta.dataVersion !== 1 || meta.surface !== 'planar' || meta.elevationUnits !== 'meters' || meta.dimensions.units !== 'map-units'
    || !Number.isFinite(meta.seaLevel) || !(terrain.elevations instanceof Float32Array)
    || terrain.elevations.length !== meta.resolution.columns * meta.resolution.rows || !terrain.elevations.every(Number.isFinite)) throw new RangeError('Expected a valid legacy planar Float32 terrain.');
  const math = createRectangularSurface({ address, width: meta.dimensions.width, height: meta.dimensions.height, units: 'map-units' });
  const lattice = createRectangularLattice(math, meta.resolution.columns, meta.resolution.rows);
  const world = defineWorld({
    id: address.worldId,
    shape: { kind: 'flat', outline: { kind: 'rectangle', ...meta.dimensions } },
    surfaces: [{ identity: math.topology.identity, role: 'sheet', terrainId: meta.id,
      topology: { id: 'bounded-rectangle', version: 1 }, representation: { id: 'legacy-planar-float32', version: 1 } }],
  });
  return Object.freeze({ world, terrain, math, lattice });
}
