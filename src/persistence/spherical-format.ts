import { CUBE_FACES, assertSphereRadius } from '../surfaces/cube-sphere.ts';
import { createSphericalTerrain, sphericalSampleCount, SPHERICAL_REPRESENTATION, type SphericalTerrain } from '../terrain/spherical.ts';
import { SAVE_FORMAT, record, textField, numberField, type SavedMapSummary } from './terrain-format.ts';
import { payloadChecksum } from './heightmap-payload.ts';
import { workStep, type PersistenceWork } from './cooperative-work.ts';

export const SPHERE_SAVE_VERSION = 3;
export const MAX_SAVED_SPHERE_CELLS = 256;
export const MAX_SAVED_SPHERE_BYTES = (6 * MAX_SAVED_SPHERE_CELLS ** 2 + 2) * 4;
const BLOCK = 16384;
export interface SavedSphericalHeightmap extends SavedMapSummary {
  format: typeof SAVE_FORMAT; formatVersion: 3; metadata: SphericalTerrain['metadata']; sampleCount: number;
  elevationEncoding: 'float32-le-canonical'; elevations: ArrayBuffer; checksum: string;
}
function exact(value: Record<string, unknown>, keys: string[]) {
  const actual = Object.keys(value).sort();
  if (actual.length !== keys.length || actual.some((key, i) => key !== [...keys].sort()[i])) throw new Error('Unsupported spherical record fields.');
}
/** Every persisted field is either a discriminator or part of the canonical checksum header. */
export function sphericalHeader(value: unknown) {
  const root = record(value); exact(root, ['format', 'formatVersion', 'id', 'name', 'savedAt', 'metadata', 'sampleCount', 'elevationEncoding', 'elevations', 'checksum']);
  const meta = record(root.metadata), identity = record(meta.identity), geometry = record(meta.geometry), rep = record(meta.representation);
  exact(meta, ['terrainId', 'identity', 'geometry', 'representation', 'elevationUnits', 'seaLevel']); exact(identity, ['worldId', 'surfaceId']); exact(geometry, ['kind', 'radiusMeters']); exact(rep, ['provider', 'version', 'cellsPerEdge', 'ownership', 'faces']);
  if (root.format !== SAVE_FORMAT || root.formatVersion !== 3 || root.elevationEncoding !== 'float32-le-canonical' || geometry.kind !== 'sphere'
    || meta.elevationUnits !== 'meters' || meta.seaLevel !== 0 || rep.provider !== SPHERICAL_REPRESENTATION || rep.version !== 1 || rep.ownership !== 'interiors-edges-corners'
    || !Array.isArray(rep.faces) || rep.faces.length !== 6 || CUBE_FACES.some((face, i) => (rep.faces as unknown[])[i] !== face) || Object.keys(rep.faces).length !== 6) throw new Error('Unsupported spherical geometry, representation, units or ownership.');
  const cellsPerEdge = numberField(rep.cellsPerEdge);
  if (cellsPerEdge > MAX_SAVED_SPHERE_CELLS) throw new Error('Spherical save exceeds the N=256 resource limit.');
  const sampleCount = sphericalSampleCount(cellsPerEdge), radiusMeters = numberField(geometry.radiusMeters); assertSphereRadius(radiusMeters);
  if (root.sampleCount !== sampleCount) throw new Error('Incorrect unique spherical sample count.');
  const id = textField(root.id, 128), name = textField(root.name, 120), savedAt = textField(root.savedAt, 32);
  if (id !== textField(meta.terrainId, 128) || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(savedAt) || !Number.isFinite(Date.parse(savedAt)) || new Date(savedAt).toISOString() !== savedAt) throw new Error('Invalid spherical identity or date.');
  const metadata: SphericalTerrain['metadata'] = { terrainId: id, identity: { worldId: textField(identity.worldId, 128), surfaceId: textField(identity.surfaceId, 128) }, geometry: { kind: 'sphere', radiusMeters }, representation: { provider: SPHERICAL_REPRESENTATION, version: 1, cellsPerEdge, ownership: 'interiors-edges-corners', faces: CUBE_FACES }, elevationUnits: 'meters', seaLevel: 0 };
  return { format: SAVE_FORMAT, formatVersion: 3, id, name, savedAt, metadata, sampleCount, elevationEncoding: 'float32-le-canonical' } as const;
}
export async function validateSphericalHeightmap(value: unknown, work: PersistenceWork = {}): Promise<SavedSphericalHeightmap> {
  const header = sphericalHeader(value), root = record(value), input = root.elevations;
  if (!(input instanceof ArrayBuffer) || input.byteLength !== header.sampleCount * 4 || input.byteLength > MAX_SAVED_SPHERE_BYTES) throw new Error('Incorrect spherical elevation byte length.');
  if (typeof root.checksum !== 'string' || !/^[a-f0-9]{64}$/.test(root.checksum)) throw new Error('Invalid spherical checksum.');
  // Private snapshot before the first await: callers cannot change checked bytes during validation/restore.
  const elevations = input.slice(0), checksum = root.checksum, view = new DataView(elevations);
  for (let first = 0; first < header.sampleCount; first += BLOCK) {
    for (let i = first; i < Math.min(header.sampleCount, first + BLOCK); i++) if (!Number.isFinite(view.getFloat32(i * 4, true))) throw new Error('Saved spherical elevations must be finite.');
    await workStep(work, 'Validating spherical samples', Math.min(1, (first + BLOCK) / header.sampleCount));
  }
  work.progress?.('Checking spherical integrity', 0);
  if (await payloadChecksum(header, elevations) !== checksum) throw new Error('Spherical checksum failed; metadata or terrain may be corrupt.');
  return { ...header, elevations, checksum };
}
export async function encodeSphericalHeightmap(terrain: SphericalTerrain, name: string, savedAt = new Date().toISOString(), work: PersistenceWork = {}): Promise<SavedSphericalHeightmap> {
  const header = sphericalHeader({ format: SAVE_FORMAT, formatVersion: 3, id: terrain.metadata.terrainId, name: name.trim(), savedAt, metadata: terrain.metadata, sampleCount: terrain.sampleCount, elevationEncoding: 'float32-le-canonical', elevations: null, checksum: null });
  const source = terrain.copyElevations();
  if (source.length !== header.sampleCount) throw new Error('Incorrect spherical source length.');
  const words = new Uint32Array(source.buffer, source.byteOffset, source.length), elevations = new ArrayBuffer(source.byteLength), view = new DataView(elevations);
  for (let first = 0; first < source.length; first += BLOCK) {
    for (let i = first; i < Math.min(source.length, first + BLOCK); i++) { if (!Number.isFinite(source[i])) throw new Error('Saved spherical elevations must be finite.'); view.setUint32(i * 4, words[i]!, true); }
    await workStep(work, 'Encoding spherical samples', Math.min(1, (first + BLOCK) / source.length));
  }
  work.progress?.('Computing spherical integrity', 0);
  return { ...header, elevations, checksum: await payloadChecksum(header, elevations) };
}
export async function decodeSphericalHeightmap(value: unknown, work: PersistenceWork = {}) {
  const saved = await validateSphericalHeightmap(value, work), meta = saved.metadata;
  // Construct only after ALL metadata, bytes, finite values and checksum pass.
  const terrain = createSphericalTerrain({ terrainId: meta.terrainId, identity: meta.identity, radiusMeters: meta.geometry.radiusMeters, cellsPerEdge: meta.representation.cellsPerEdge }), view = new DataView(saved.elevations);
  for (let first = 0; first < saved.sampleCount; first += BLOCK) {
    for (let i = first; i < Math.min(saved.sampleCount, first + BLOCK); i++) terrain.write(terrain.keyAt(i), view.getFloat32(i * 4, true));
    await workStep(work, 'Restoring spherical terrain', Math.min(1, (first + BLOCK) / saved.sampleCount));
  }
  return { terrain, name: saved.name };
}
