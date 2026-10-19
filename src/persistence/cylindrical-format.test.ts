import test from 'node:test';
import assert from 'node:assert/strict';
import { createCylinderPreviewTerrain } from '../editor/cylinder-preview-session.ts';
import { encodeCylindricalHeightmap, decodeCylindricalHeightmap, validateCylindricalHeightmap, MAX_SAVED_CYLINDER_BYTES } from './cylindrical-format.ts';
import { payloadChecksum } from './heightmap-payload.ts';
import { decodeMap } from './map-format.ts';
const work = { yield: async () => {} }, date = '2026-10-18T12:00:00.000Z';
const bits = (t: ReturnType<typeof createCylinderPreviewTerrain>) => new Uint32Array(t.copyElevations().buffer);
const encode = (n = 64) => encodeCylindricalHeightmap(createCylinderPreviewTerrain(n), 'Cylinder', date, work);
for (const n of [64, 128, 256]) test(`v4 cylinder ${n} restores every canonical Float32 word, identity, shared rim and cap center`, async () => {
  const t = createCylinderPreviewTerrain(n), special = [-0, 0, -(2 ** -149), 2 ** -149, -12345.5, 3.4028234663852886e38];
  for (const k of t.samples()) t.write(k, special[k.index % special.length]!);
  const saved = await encodeCylindricalHeightmap(t, ' Exact cylinder ', date, work), loaded = await decodeCylindricalHeightmap(saved, work);
  assert.equal(saved.name, 'Exact cylinder'); assert.equal(saved.formatVersion, 4); assert.equal(saved.elevations.byteLength, t.sampleCount * 4); assert.ok(saved.elevations.byteLength <= MAX_SAVED_CYLINDER_BYTES);
  assert.deepEqual(loaded.terrain.metadata, t.metadata); assert.deepEqual(bits(loaded.terrain), bits(t));
  for (const k of loaded.terrain.samples()) for (const alias of loaded.terrain.aliases(k)) assert.ok(Object.is(loaded.terrain.read(loaded.terrain.resolve(alias)), t.read(k)));
  const view = new DataView(saved.elevations), words = bits(t); for (let i = 0; i < words.length; i++) assert.equal(view.getUint32(i * 4, true), words[i]);
});
test('v4 cylinder fails closed on malformed headers, dimensions, identities, ownership, resources, lengths and integrity', async () => {
  const source = await encode(); const changes: ((r: any) => void)[] = [
    r => r.format = 'wrong', r => r.formatVersion = 3, r => r.elevationEncoding = 'float32-be', r => r.metadata.geometry.provider = 'sphere', r => r.metadata.geometry.version++, r => r.metadata.geometry.role = 'interior', r => r.metadata.geometry.configuration = 'open',
    r => r.id += 'foreign', r => r.metadata.identity.worldId = '', r => r.metadata.identity.surfaceId = 'x'.repeat(129), r => r.metadata.geometry.identity.worldId += 'foreign', r => r.name = ' ', r => r.name = 'x'.repeat(121), r => r.savedAt = '2026-02-30T00:00:00.000Z',
    r => r.metadata.geometry.radiusMeters = 0, r => r.metadata.geometry.lengthMeters = NaN, r => r.metadata.geometry.radiusMeters = Infinity, r => r.metadata.geometry.lengthMeters = 1e10, r => r.metadata.geometry.lengthMeters = 1,
    r => r.metadata.representation.provider = 'duplicate', r => r.metadata.representation.version++, r => r.metadata.representation.ownership = 'per-chart', r => r.metadata.representation.resolution.angularSamples = 512, r => r.metadata.representation.resolution.radialCells++, r => r.sampleCount++,
    r => r.metadata.elevationUnits = 'feet', r => r.metadata.seaLevel = -0, r => r.metadata.extra = 1, r => r.metadata.geometry.camera = {}, r => r.extra = 1,
    r => r.elevations = r.elevations.slice(4), r => r.elevations = new SharedArrayBuffer(r.elevations.byteLength), r => r.checksum = 'x', r => new DataView(r.elevations).setFloat32(0, 8, true)
  ];
  for (const change of changes) { const r = structuredClone(source); change(r); await assert.rejects(decodeCylindricalHeightmap(r, work)); }
  await assert.rejects(decodeMap(source));
});
test('v4 checksum covers valid metadata mutations; even rehashed nonfinite elevation words are rejected', async () => {
  const source = await encode();
  for (const change of [(r: any) => r.name += 'x', (r: any) => r.metadata.geometry.radiusMeters++, (r: any) => r.savedAt = '2026-10-18T12:00:01.000Z', (r: any) => { r.metadata.identity.worldId += 'x'; r.metadata.geometry.identity.worldId += 'x'; }]) {
    const r = structuredClone(source); change(r); await assert.rejects(validateCylindricalHeightmap(r, work), /checksum/);
  }
  for (const word of [0x7fc00000, 0x7f800000, 0xff800000]) { const r = structuredClone(source); new DataView(r.elevations).setUint32(0, word, true); const { elevations, checksum: _checksum, ...header } = r; r.checksum = await payloadChecksum(header, elevations); await assert.rejects(validateCylindricalHeightmap(r, work), /finite/); }
});
test('v4 encode/validation snapshot before yielding and failed/cancelled work cannot mutate the source authority', async () => {
  const t = createCylinderPreviewTerrain(), before = bits(t); let changed = false;
  const r = await encodeCylindricalHeightmap(t, 'Cylinder', date, { yield: async () => { if (!changed) { changed = true; t.write(t.keyAt(0), 42); } } });
  const copy = structuredClone(r), loaded = await decodeCylindricalHeightmap(copy, { yield: async () => { new DataView(copy.elevations).setFloat32(0, 500, true); (copy.metadata.identity as { worldId: string }).worldId = 'mutated'; } }); assert.deepEqual(bits(loaded.terrain), before);
  const current = bits(t); await assert.rejects(encodeCylindricalHeightmap(t, 'Cylinder', date, { yield: async () => { throw Error('cancelled'); } }), /cancelled/); assert.deepEqual(bits(t), current);
});
