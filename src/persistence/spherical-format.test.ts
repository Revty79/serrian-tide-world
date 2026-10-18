import test from 'node:test';
import assert from 'node:assert/strict';
import { createSphericalTerrain } from '../terrain/spherical.ts';
import { startSphericalBrushStroke } from '../terrain/spherical-brush.ts';
import { decodeSphericalHeightmap, encodeSphericalHeightmap, validateSphericalHeightmap, MAX_SAVED_SPHERE_BYTES } from './spherical-format.ts';
import { payloadChecksum } from './heightmap-payload.ts';
import { decodeMap } from './map-format.ts';
const identity = { worldId: 'persistence-world', surfaceId: 'surface' }, radiusMeters = 735000;
const make = (cellsPerEdge = 8) => createSphericalTerrain({ terrainId: 'terrain', identity, radiusMeters, cellsPerEdge });
const work = { yield: async () => {} }, date = '2026-10-18T12:00:00.000Z';
const bits = (t: ReturnType<typeof make>) => new Uint32Array(t.copyElevations().buffer);
const encode = (t: ReturnType<typeof make>) => encodeSphericalHeightmap(t, 'Round world', date, work);
async function rehash(value: Awaited<ReturnType<typeof encode>>) { const { elevations, checksum: _checksum, ...header } = value; value.checksum = await payloadChecksum(header, elevations); return value; }
for (const n of [128, 256]) {
  test(`v3 blank N=${n} round-trips exact bits, dimensions, identity and shared ownership`, async () => {
    const t = make(n), record = await encode(t), loaded = await decodeSphericalHeightmap(record, work);
    assert.equal(record.elevations.byteLength, (6 * n * n + 2) * 4); assert.ok(record.elevations.byteLength <= MAX_SAVED_SPHERE_BYTES);
    assert.deepEqual(loaded.terrain.metadata, t.metadata); assert.deepEqual(bits(loaded.terrain), bits(t)); assert.equal(loaded.name, 'Round world');
  });
  test(`v3 sculpted N=${n} preserves every Float32 bit including boundaries, corners, signed zero and subnormals`, async () => {
    const t = make(n), stroke = startSphericalBrushStroke(t, { ...identity, direction: [1, 1, 1] }, { tool: 'raise', radiusMeters: radiusMeters * .2, strengthMeters: 2500 });
    stroke.moveTo({ ...identity, direction: [0, 0, 1] }); stroke.end();
    const special = [-0, 0, -(2 ** -149), 2 ** -149, -12345.5, 3.4028234663852886e38];
    for (const key of t.samples()) if (t.aliases(key).length > 1 || key.index < special.length) t.write(key, special[key.index % special.length]!);
    const saved = await encode(t), loaded = (await decodeSphericalHeightmap(saved, work)).terrain; assert.deepEqual(bits(loaded), bits(t));
    const view = new DataView(saved.elevations), words = bits(t); for (let i = 0; i < words.length; i++) assert.equal(view.getUint32(4 * i, true), words[i]);
    for (const key of loaded.samples()) if (loaded.aliases(key).length > 1) for (const address of loaded.aliases(key)) assert.ok(Object.is(loaded.read(loaded.resolve(address)), t.read(key)));
  });
}
test('v3 rejects corrupt/incompatible headers and payloads, including unchecked extra metadata and sparse face IDs', async () => {
  const source = await encode(make());
  const changes: ((r: any) => void)[] = [
    (r) => r.format = 'other', (r) => r.formatVersion = 4, (r) => r.elevationEncoding = 'float32-be', (r) => r.metadata.geometry.kind = 'cube',
    (r) => r.metadata.representation.provider = 'other', (r) => r.metadata.representation.version = 2, (r) => r.metadata.representation.ownership = 'six-arrays',
    (r) => r.metadata.representation.faces.reverse(), (r) => r.metadata.representation.faces = new Array(6), (r) => r.metadata.elevationUnits = 'feet', (r) => r.metadata.seaLevel = 3,
    (r) => r.metadata.geometry.radiusMeters = 0, (r) => r.metadata.geometry.radiusMeters = Infinity, (r) => r.metadata.geometry.radiusMeters = Number.MAX_VALUE,
    (r) => r.metadata.representation.cellsPerEdge = 257, (r) => r.metadata.representation.cellsPerEdge = 1, (r) => r.metadata.representation.cellsPerEdge = 2.5,
    (r) => r.sampleCount++, (r) => r.id = 'different', (r) => r.metadata.identity.worldId = '', (r) => r.metadata.identity.surfaceId = 'x'.repeat(129),
    (r) => r.savedAt = '2026-02-30T00:00:00.000Z', (r) => r.name = '', (r) => r.name = 'x'.repeat(121), (r) => r.metadata.camera = {}, (r) => r.extra = true,
    (r) => r.elevations = r.elevations.slice(4), (r) => new DataView(r.elevations).setFloat32(8, 900, true), (r) => r.checksum = '0'.repeat(64),
  ];
  for (const change of changes) { const damaged = structuredClone(source); change(damaged); await assert.rejects(decodeSphericalHeightmap(damaged, work)); }
  await assert.rejects(decodeMap(source)); await assert.rejects(decodeMap({ formatVersion: 4 }));
});
test('v3 integrity covers all valid metadata changes and rejects rehashed nonfinite Float32 payloads', async () => {
  const source = await encode(make());
  for (const change of [(r: any) => r.name += 'changed', (r: any) => r.metadata.geometry.radiusMeters++, (r: any) => r.metadata.identity.worldId += 'changed']) {
    const damaged = structuredClone(source); change(damaged); await assert.rejects(decodeSphericalHeightmap(damaged, work), /checksum/);
  }
  for (const word of [0x7fc00000, 0x7f800000, 0xff800000]) { const damaged = structuredClone(source); new DataView(damaged.elevations).setUint32(4, word, true); await rehash(damaged); await assert.rejects(validateSphericalHeightmap(damaged, work), /finite/); }
});
test('encode and decode take private snapshots before yielding; caller mutation cannot race verified restoration', async () => {
  const t = make(), before = bits(t); let changed = false;
  const saved = await encodeSphericalHeightmap(t, 'Round world', date, { yield: async () => { if (!changed) { changed = true; t.write(t.keyAt(0), 900); } } });
  const loaded = await decodeSphericalHeightmap(saved, { yield: async () => { new DataView(saved.elevations).setFloat32(0, 3200, true); (saved.metadata.identity as { worldId: string }).worldId = 'mutated'; } });
  assert.deepEqual(bits(loaded.terrain), before); assert.equal(loaded.terrain.metadata.identity.worldId, identity.worldId);
});
