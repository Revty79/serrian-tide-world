import { createCylinderGeometry } from '../surfaces/cylinder.ts';
import { createCylindricalTerrain, cylindricalSampleCount, type CylindricalTerrain } from '../terrain/cylindrical.ts';
import { assertInteractiveCylinderDimensions, cylinderResolution } from '../editor/cylinder-configuration.ts';
import { SAVE_FORMAT, record, textField, numberField, type SavedMapSummary } from './terrain-format.ts';
import { payloadChecksum } from './heightmap-payload.ts';
import { workStep, type PersistenceWork } from './cooperative-work.ts';

export const CYLINDER_SAVE_VERSION = 4;
export const MAX_SAVED_CYLINDER_BYTES = 65282 * 4;
const BLOCK = 8192;
export interface SavedCylindricalHeightmap extends SavedMapSummary {
  format: typeof SAVE_FORMAT; formatVersion: 4; metadata: CylindricalTerrain['metadata']; sampleCount: number;
  elevationEncoding: 'float32-le-canonical'; elevations: ArrayBuffer; checksum: string;
}
function exact(value: Record<string, unknown>, keys: string[]) {
  const actual = Object.keys(value).sort(), expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, i) => key !== expected[i])) throw new Error('Unsupported cylindrical record fields.');
}
/** Reconstruct a canonical header. Every persisted field is checked and checksum-covered. */
export function cylindricalHeader(value: unknown) {
  const root = record(value); exact(root, ['format', 'formatVersion', 'id', 'name', 'savedAt', 'metadata', 'sampleCount', 'elevationEncoding', 'elevations', 'checksum']);
  const meta = record(root.metadata), identity = record(meta.identity), geometry = record(meta.geometry), geometryIdentity = record(geometry.identity), rep = record(meta.representation), res = record(rep.resolution);
  exact(meta, ['terrainId', 'identity', 'geometry', 'representation', 'elevationUnits', 'seaLevel']); exact(identity, ['worldId', 'surfaceId']); exact(geometryIdentity, ['worldId', 'surfaceId']);
  exact(geometry, ['identity', 'provider', 'version', 'configuration', 'role', 'radiusMeters', 'lengthMeters']); exact(rep, ['provider', 'version', 'resolution', 'ownership']); exact(res, ['angularSamples', 'axialCells', 'radialCells']);
  if (root.format !== SAVE_FORMAT || root.formatVersion !== 4 || root.elevationEncoding !== 'float32-le-canonical' || meta.elevationUnits !== 'meters' || !Object.is(meta.seaLevel, 0)
    || geometry.provider !== 'physical-closed-cylinder' || geometry.version !== 1 || geometry.configuration !== 'solid-capped' || geometry.role !== 'exterior'
    || rep.provider !== 'cylinder-rings-shared-rims' || rep.version !== 1 || rep.ownership !== 'side-rims-cap-interiors-single-centers') throw new Error('Unsupported cylinder geometry, representation, units or ownership.');
  const id = textField(root.id, 128), name = textField(root.name, 120), savedAt = textField(root.savedAt, 32), worldId = textField(identity.worldId, 128), surfaceId = textField(identity.surfaceId, 128);
  if (id !== textField(meta.terrainId, 128) || worldId !== geometryIdentity.worldId || surfaceId !== geometryIdentity.surfaceId
    || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(savedAt) || !Number.isFinite(Date.parse(savedAt)) || new Date(savedAt).toISOString() !== savedAt) throw new Error('Invalid cylinder identity or save date.');
  const radiusMeters = numberField(geometry.radiusMeters), lengthMeters = numberField(geometry.lengthMeters); assertInteractiveCylinderDimensions(radiusMeters, lengthMeters);
  const resolution = cylinderResolution(numberField(res.angularSamples));
  if (res.axialCells !== resolution.axialCells || res.radialCells !== resolution.radialCells) throw new Error('Unsupported cylinder resolution ratio.');
  const sampleCount = cylindricalSampleCount(resolution); if (root.sampleCount !== sampleCount) throw new Error('Incorrect canonical cylinder sample count.');
  const physical = createCylinderGeometry({ identity: { worldId, surfaceId }, provider: 'physical-closed-cylinder', version: 1, configuration: 'solid-capped', role: 'exterior', radiusMeters, lengthMeters });
  const metadata: CylindricalTerrain['metadata'] = { terrainId: id, identity: physical.identity, geometry: physical.metadata, representation: { provider: 'cylinder-rings-shared-rims', version: 1, resolution, ownership: 'side-rims-cap-interiors-single-centers' }, elevationUnits: 'meters', seaLevel: 0 };
  return { format: SAVE_FORMAT, formatVersion: 4, id, name, savedAt, metadata, sampleCount, elevationEncoding: 'float32-le-canonical' } as const;
}
export async function validateCylindricalHeightmap(value: unknown, work: PersistenceWork = {}): Promise<SavedCylindricalHeightmap> {
  const header = cylindricalHeader(value), root = record(value), input = root.elevations;
  if (!(input instanceof ArrayBuffer) || input.byteLength !== header.sampleCount * 4 || input.byteLength > MAX_SAVED_CYLINDER_BYTES) throw new Error('Incorrect cylinder elevation byte length.');
  if (typeof root.checksum !== 'string' || !/^[a-f0-9]{64}$/.test(root.checksum)) throw new Error('Invalid cylinder checksum.');
  const elevations = input.slice(0), checksum = root.checksum, view = new DataView(elevations);
  for (let first = 0; first < header.sampleCount; first += BLOCK) {
    for (let i = first; i < Math.min(header.sampleCount, first + BLOCK); i++) if (!Number.isFinite(view.getFloat32(i * 4, true))) throw new Error('Saved cylinder elevations must be finite.');
    await workStep(work, 'Validating cylinder samples', Math.min(1, (first + BLOCK) / header.sampleCount));
  }
  work.progress?.('Checking cylinder integrity', 0);
  if (await payloadChecksum(header, elevations) !== checksum) throw new Error('Cylinder checksum failed; metadata or terrain may be corrupt.');
  return { ...header, elevations, checksum };
}
export async function encodeCylindricalHeightmap(terrain: CylindricalTerrain, name: string, savedAt = new Date().toISOString(), work: PersistenceWork = {}): Promise<SavedCylindricalHeightmap> {
  const header = cylindricalHeader({ format: SAVE_FORMAT, formatVersion: 4, id: terrain.metadata.terrainId, name: name.trim(), savedAt, metadata: terrain.metadata, sampleCount: terrain.sampleCount, elevationEncoding: 'float32-le-canonical', elevations: null, checksum: null });
  const source = terrain.copyElevations(), words = new Uint32Array(source.buffer, source.byteOffset, source.length), elevations = new ArrayBuffer(source.byteLength), view = new DataView(elevations);
  for (let first = 0; first < source.length; first += BLOCK) {
    for (let i = first; i < Math.min(source.length, first + BLOCK); i++) { if (!Number.isFinite(source[i])) throw new Error('Saved cylinder elevations must be finite.'); view.setUint32(i * 4, words[i]!, true); }
    await workStep(work, 'Encoding cylinder samples', Math.min(1, (first + BLOCK) / source.length));
  }
  work.progress?.('Computing cylinder integrity', 0);
  return { ...header, elevations, checksum: await payloadChecksum(header, elevations) };
}
export async function decodeCylindricalHeightmap(value: unknown, work: PersistenceWork = {}) {
  const saved = await validateCylindricalHeightmap(value, work), meta = saved.metadata;
  const terrain = createCylindricalTerrain({ terrainId: meta.terrainId, geometry: meta.geometry, resolution: meta.representation.resolution }), view = new DataView(saved.elevations);
  for (let first = 0; first < saved.sampleCount; first += BLOCK) {
    for (let i = first; i < Math.min(saved.sampleCount, first + BLOCK); i++) terrain.write(terrain.keyAt(i), view.getFloat32(i * 4, true));
    await workStep(work, 'Restoring cylinder terrain', Math.min(1, (first + BLOCK) / saved.sampleCount));
  }
  return { terrain, name: saved.name };
}
