import { CUBE_FACES, type CubeFace } from '../surfaces/cube-sphere.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import { elevationToColor } from './elevation-colors.ts';
import type { SphericalDisplayCache } from './spherical-raster.ts';

export interface TextureRegion { face: CubeFace; left: number; top: number; right: number; bottom: number }
/** Revision-aware derived pixels; sparse numerical reads and boundary aliases, never a second elevation field. */
export function updateSphericalTextures(terrain: SphericalTerrain, cache: SphericalDisplayCache, changed: Iterable<number> | 'all'): TextureRegion[] {
  if (cache.sourceRevision === terrain.revision) return [];
  const n = terrain.metadata.representation.cellsPerEdge, regions = new Map<CubeFace, TextureRegion>();
  const extend = (face: CubeFace, column: number, row: number, all = false) => {
    const resolution = cache.faces[face].side - 1, scale = resolution / n;
    const left = all ? 0 : Math.max(0, Math.floor((column - 1) * scale)), right = all ? resolution : Math.min(resolution, Math.ceil((column + 1) * scale));
    const top = all ? 0 : Math.max(0, Math.floor((row - 1) * scale)), bottom = all ? resolution : Math.min(resolution, Math.ceil((row + 1) * scale));
    const previous = regions.get(face);
    regions.set(face, { face, left: Math.min(left, previous?.left ?? left), right: Math.max(right, previous?.right ?? right), top: Math.min(top, previous?.top ?? top), bottom: Math.max(bottom, previous?.bottom ?? bottom) });
  };
  if (changed === 'all') for (const face of CUBE_FACES) extend(face, 0, 0, true);
  else for (const index of changed) for (const address of terrain.aliases(terrain.keyAt(index))) extend(address.patchId, address.column, address.row);
  const values = new Map<number, number>();
  const value = (index: number) => { let height = values.get(index); if (height === undefined) { height = terrain.read(terrain.keyAt(index)); values.set(index, height); } return height; };
  for (const region of regions.values()) {
    const texture = cache.faces[region.face], resolution = texture.side - 1, indices = texture.sampleIndices;
    const at = (column: number, row: number) => value(indices ? indices[row * (n + 1) + column]! : terrain.resolve({ ...terrain.metadata.identity, patchId: region.face, column, row }).index);
    for (let y = region.top; y <= region.bottom; y++) for (let x = region.left; x <= region.right; x++) {
      const u = x * n / resolution, v = y * n / resolution, left = Math.min(n - 1, Math.floor(u)), top = Math.min(n - 1, Math.floor(v)), fx = u - left, fy = v - top;
      const h = (at(left, top) * (1 - fx) + at(left + 1, top) * fx) * (1 - fy) + (at(left, top + 1) * (1 - fx) + at(left + 1, top + 1) * fx) * fy;
      const color = elevationToColor(h, terrain.metadata.seaLevel), offset = (y * texture.side + x) * 4;
      texture.pixels[offset] = color[0]; texture.pixels[offset + 1] = color[1]; texture.pixels[offset + 2] = color[2]; texture.pixels[offset + 3] = 255;
    }
  }
  cache.sourceRevision = terrain.revision;
  return [...regions.values()];
}
