import { createBlankTerrain, type Terrain, type TerrainMetadata } from '../terrain/model.ts';

export const SAVE_FORMAT = 'serrian-tide-heightmap';
export const SAVE_VERSION = 1;
export const MAX_SAMPLES = 1_048_576;
export interface SavedMapSummary { id: string; name: string; savedAt: string }
export interface SavedHeightmap extends SavedMapSummary {
  format: typeof SAVE_FORMAT;
  formatVersion: typeof SAVE_VERSION;
  metadata: TerrainMetadata;
  elevationEncoding: 'float32-le-row-major';
  elevations: ArrayBuffer;
  checksum: string;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid saved map structure.');
  return value as Record<string, unknown>;
}
function textField(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid map name or identity.');
  return value;
}
function numberField(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid map metadata.');
  return value;
}
function validatedHeader(value: unknown) {
  const root = record(value), meta = record(root.metadata), dimensions = record(meta.dimensions), resolution = record(meta.resolution);
  if (root.format !== SAVE_FORMAT || root.formatVersion !== SAVE_VERSION || root.elevationEncoding !== 'float32-le-row-major'
    || meta.dataVersion !== 1 || meta.surface !== 'planar' || meta.elevationUnits !== 'meters' || dimensions.units !== 'map-units') {
    throw new Error('Unsupported saved map format or version.');
  }
  const id = textField(root.id, 128), name = textField(root.name, 120), savedAt = textField(root.savedAt, 32);
  if (id !== meta.id || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(savedAt) || !Number.isFinite(Date.parse(savedAt))) throw new Error('Invalid saved map identity or date.');
  const columns = numberField(resolution.columns), rows = numberField(resolution.rows);
  const width = numberField(dimensions.width), height = numberField(dimensions.height), seaLevel = numberField(meta.seaLevel);
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 2 || rows < 2 || columns > 4096 || rows > 4096
    || columns * rows > MAX_SAMPLES || width <= 0 || height <= 0) throw new Error('Saved map dimensions exceed supported limits.');
  const metadata: TerrainMetadata = { dataVersion: 1, id, surface: 'planar', dimensions: { width, height, units: 'map-units' }, resolution: { columns, rows }, elevationUnits: 'meters', seaLevel };
  return { format: SAVE_FORMAT, formatVersion: SAVE_VERSION, id, name, savedAt, metadata, elevationEncoding: 'float32-le-row-major' } as const;
}
async function checksum(header: ReturnType<typeof validatedHeader>, payload: ArrayBuffer) {
  const prefix = new TextEncoder().encode(JSON.stringify(header));
  const bytes = new Uint8Array(prefix.length + payload.byteLength);
  bytes.set(prefix); bytes.set(new Uint8Array(payload), prefix.length);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Browser-independent versioned representation; payload has a specified endianness. */
export async function encodeHeightmap(terrain: Terrain, name: string, savedAt = new Date().toISOString()): Promise<SavedHeightmap> {
  const header = validatedHeader({ format: SAVE_FORMAT, formatVersion: SAVE_VERSION, id: terrain.metadata.id, name: name.trim(), savedAt, metadata: terrain.metadata, elevationEncoding: 'float32-le-row-major' });
  if (terrain.elevations.length !== header.metadata.resolution.columns * header.metadata.resolution.rows) throw new Error('Incorrect elevation count.');
  const payload = new ArrayBuffer(terrain.elevations.byteLength), view = new DataView(payload);
  const bits = new Uint32Array(terrain.elevations.buffer, terrain.elevations.byteOffset, terrain.elevations.length);
  terrain.elevations.forEach((value, index) => {
    if (!Number.isFinite(value)) throw new Error('Saved elevations must be finite.');
    view.setUint32(index * 4, bits[index]!, true);
  });
  return { ...header, elevations: payload, checksum: await checksum(header, payload) };
}

/** Validate completely before constructing a replacement document. Never mutates current work. */
export async function decodeHeightmap(value: unknown): Promise<{ terrain: Terrain; name: string }> {
  const root = record(value), header = validatedHeader(value);
  const payload = root.elevations;
  if (!(payload instanceof ArrayBuffer) || payload.byteLength !== header.metadata.resolution.columns * header.metadata.resolution.rows * 4) throw new Error('Incorrect saved elevation byte length.');
  if (typeof root.checksum !== 'string' || !/^[a-f0-9]{64}$/.test(root.checksum) || await checksum(header, payload) !== root.checksum) throw new Error('Saved map checksum failed; data may be corrupt.');
  const { metadata } = header;
  const terrain = createBlankTerrain({ id: metadata.id, ...metadata.resolution, ...metadata.dimensions, seaLevel: metadata.seaLevel });
  const bits = new Uint32Array(terrain.elevations.buffer), view = new DataView(payload);
  for (let i = 0; i < bits.length; i++) {
    const value = view.getFloat32(i * 4, true);
    if (!Number.isFinite(value)) throw new Error('Saved elevations must be finite.');
    bits[i] = view.getUint32(i * 4, true);
  }
  return { terrain, name: header.name };
}

export function decodeSummary(value: unknown): SavedMapSummary {
  const root = record(value);
  return { id: textField(root.id, 128), name: textField(root.name, 120), savedAt: textField(root.savedAt, 32) };
}
