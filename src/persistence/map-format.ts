import type {SavedHollowPyramid} from './hollow-pyramid-format.ts';
import type {SavedPyramid} from './pyramid-format.ts';
import type {SavedOpenCylinder} from './open-cylinder-format.ts';
import type {SavedHollowCylinder} from './hollow-cylinder-format.ts';
import type { Terrain } from '../terrain/model.ts';
import { isWrapped } from '../terrain/topology.ts';
import { decodeHeightmap, encodeHeightmap, record, type SavedHeightmap } from './terrain-format.ts';
import { decodeWrappedHeightmap, encodeWrappedHeightmap, type SavedWrappedHeightmap } from './wrapped-format.ts';
import type { SavedCylindricalHeightmap } from './cylindrical-format.ts';
import type { SavedSphericalHeightmap } from './spherical-format.ts';
import type {SavedSolidCubeHeightmap} from './solid-cube-format.ts';

import type {SavedHollowCube} from './hollow-cube-format.ts';
import type {SavedHollowSphere} from './hollow-sphere-format.ts';

export type PlanarSavedMap = SavedHeightmap | SavedWrappedHeightmap;
export type SavedMap = SavedHollowPyramid | SavedPyramid | SavedOpenCylinder | PlanarSavedMap | SavedSphericalHeightmap | SavedCylindricalHeightmap | SavedSolidCubeHeightmap | SavedHollowCube | SavedHollowSphere | SavedHollowCylinder;
export const encodeMap = (terrain: Terrain, name: string, savedAt?: string): Promise<PlanarSavedMap> => isWrapped(terrain) ? encodeWrappedHeightmap(terrain, name, savedAt) : encodeHeightmap(terrain, name, savedAt);
export function decodeMap(value: unknown): Promise<{ terrain: Terrain; name: string }> {
  const version = record(value).formatVersion;
  if (version === 1) return decodeHeightmap(value);
  if (version === 2) return decodeWrappedHeightmap(value);
  return Promise.reject(new Error('Unsupported saved map version.'));
}
