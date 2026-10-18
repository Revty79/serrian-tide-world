import type { Terrain } from '../terrain/model.ts';
import { isWrapped } from '../terrain/topology.ts';
import { decodeHeightmap, encodeHeightmap, record, type SavedHeightmap } from './terrain-format.ts';
import { decodeWrappedHeightmap, encodeWrappedHeightmap, type SavedWrappedHeightmap } from './wrapped-format.ts';

export type SavedMap = SavedHeightmap | SavedWrappedHeightmap;
export const encodeMap = (terrain: Terrain, name: string, savedAt?: string): Promise<SavedMap> => isWrapped(terrain) ? encodeWrappedHeightmap(terrain, name, savedAt) : encodeHeightmap(terrain, name, savedAt);
export function decodeMap(value: unknown): Promise<{ terrain: Terrain; name: string }> {
  const version = record(value).formatVersion;
  if (version === 1) return decodeHeightmap(value);
  if (version === 2) return decodeWrappedHeightmap(value);
  return Promise.reject(new Error('Unsupported saved map version.'));
}
