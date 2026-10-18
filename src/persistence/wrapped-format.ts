import type { Terrain, WrappedTerrainMetadata } from '../terrain/model.ts';
import { createWrappedTerrain, isWrapped, wrappedMath } from '../terrain/topology.ts';
import { MAX_SAMPLES, SAVE_FORMAT, record, textField, numberField, type SavedMapSummary } from './terrain-format.ts';
import { payloadChecksum, encodeElevationPayload, decodeElevationPayload } from './heightmap-payload.ts';

export interface SavedWrappedHeightmap extends SavedMapSummary {
  format: typeof SAVE_FORMAT;
  formatVersion: 2;
  metadata: WrappedTerrainMetadata;
  elevationEncoding: 'float32-le-row-major';
  elevations: ArrayBuffer;
  checksum: string;
}
function headerOf(value: unknown) {
  const root = record(value), meta = record(root.metadata), dimensions = record(meta.dimensions), resolution = record(meta.resolution), identity = record(meta.identity);
  if (root.format !== SAVE_FORMAT || root.formatVersion !== 2 || root.elevationEncoding !== 'float32-le-row-major'
    || meta.dataVersion !== 2 || meta.surface !== 'planar' || meta.topology !== 'horizontal-periodic' || meta.sampleOwnership !== 'unique-u-inclusive-v'
    || meta.elevationUnits !== 'meters' || dimensions.units !== 'map-units') throw new Error('Unsupported wrapped map format or sample ownership.');
  const id = textField(root.id, 128), name = textField(root.name, 120), savedAt = textField(root.savedAt, 32);
  if (id !== meta.id || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(savedAt) || !Number.isFinite(Date.parse(savedAt))) throw new Error('Invalid wrapped map identity or date.');
  const columns = numberField(resolution.columns), rows = numberField(resolution.rows), width = numberField(dimensions.width), height = numberField(dimensions.height), seaLevel = numberField(meta.seaLevel);
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 2 || rows < 2 || columns > 4096 || rows > 4096 || columns * rows > MAX_SAMPLES
    || width <= 0 || height <= 0 || !Number.isFinite(Math.hypot(width, height))) throw new Error('Invalid wrapped map dimensions.');
  const metadata: WrappedTerrainMetadata = {
    dataVersion: 2, id, surface: 'planar', dimensions: { width, height, units: 'map-units' }, resolution: { columns, rows }, elevationUnits: 'meters', seaLevel,
    topology: 'horizontal-periodic', sampleOwnership: 'unique-u-inclusive-v',
    identity: { worldId: textField(identity.worldId, 128), surfaceId: textField(identity.surfaceId, 128), patchId: textField(identity.patchId, 128) },
  };
  return { format: SAVE_FORMAT, formatVersion: 2, id, name, savedAt, metadata, elevationEncoding: 'float32-le-row-major' } as const;
}
export async function encodeWrappedHeightmap(terrain: Terrain, name: string, savedAt = new Date().toISOString()): Promise<SavedWrappedHeightmap> {
  if (!isWrapped(terrain)) throw new Error('Expected wrapped terrain.');
  wrappedMath(terrain);
  const header = headerOf({ format: SAVE_FORMAT, formatVersion: 2, id: terrain.metadata.id, name: name.trim(), savedAt, metadata: terrain.metadata, elevationEncoding: 'float32-le-row-major' });
  const elevations = encodeElevationPayload(terrain);
  return { ...header, elevations, checksum: await payloadChecksum(header, elevations) };
}
export async function decodeWrappedHeightmap(value: unknown) {
  const root = record(value), header = headerOf(value), payload = root.elevations;
  if (!(payload instanceof ArrayBuffer) || payload.byteLength !== header.metadata.resolution.columns * header.metadata.resolution.rows * 4) throw new Error('Incorrect wrapped elevation byte length.');
  if (typeof root.checksum !== 'string' || !/^[a-f0-9]{64}$/.test(root.checksum) || await payloadChecksum(header, payload) !== root.checksum) throw new Error('Wrapped map checksum failed; data may be corrupt.');
  const meta = header.metadata;
  const terrain = createWrappedTerrain({ id: meta.id, identity: meta.identity, ...meta.dimensions, ...meta.resolution, seaLevel: meta.seaLevel });
  decodeElevationPayload(payload, terrain.elevations);
  return { terrain, name: header.name };
}
