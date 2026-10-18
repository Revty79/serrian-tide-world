import test from 'node:test';
import assert from 'node:assert/strict';
import { createWrappedTerrain, isWrapped } from '../terrain/topology.ts';
import { createBlankTerrain } from '../terrain/model.ts';
import { decodeMap, encodeMap } from './map-format.ts';
import { encodeHeightmap } from './terrain-format.ts';
import { payloadChecksum } from './heightmap-payload.ts';

const create = () => createWrappedTerrain({ id: 'v2-map', identity: { worldId: 'parent', surfaceId: 'outside-test', patchId: 'p' }, columns: 32, rows: 33, seaLevel: -20 });
test('v2 saves preserve unique sample ownership, Float32 bits and surface identity, while v1 stays v1', async () => {
  const terrain = create(); terrain.elevations.forEach((_, i, data) => { data[i] = i % 2 ? -0 : Math.fround(Math.sin(i) * 1234); });
  const encoded = await encodeMap(terrain, 'Wrapped test'), loaded = await decodeMap(structuredClone(encoded));
  assert.equal(encoded.formatVersion, 2); assert.ok(isWrapped(loaded.terrain)); assert.deepEqual(loaded.terrain.metadata, terrain.metadata);
  assert.deepEqual(new Uint32Array(loaded.terrain.elevations.buffer), new Uint32Array(terrain.elevations.buffer));
  const legacy = await encodeMap(createBlankTerrain({ id: 'v1' }), 'Bounded'); assert.equal(legacy.formatVersion, 1);
  assert.equal((await decodeMap(legacy)).terrain.metadata.dataVersion, 1);
  await assert.rejects(encodeHeightmap(terrain, 'Not a v1 map'));
});
test('v2 rejects corruption, unsupported ownership/identity/version/units and incorrect payload counts', async () => {
  const saved = await encodeMap(create(), 'Wrapped test');
  if (saved.formatVersion !== 2) throw new Error('Expected v2');
  const changes = [
    (value: typeof saved) => { new DataView(value.elevations).setFloat32(0, 123, true); },
    (value: typeof saved) => { Object.assign(value.metadata, { topology: 'sphere' }); },
    (value: typeof saved) => { Object.assign(value.metadata, { sampleOwnership: 'duplicate-endpoints' }); },
    (value: typeof saved) => { Object.assign(value.metadata.identity, { surfaceId: '' }); },
    (value: typeof saved) => { Object.assign(value.metadata.identity, { worldId: 'another-world' }); },
    (value: typeof saved) => { Object.assign(value, { formatVersion: 3 }); },
    (value: typeof saved) => { Object.assign(value.metadata.dimensions, { units: 'pixels' }); },
    (value: typeof saved) => { value.elevations = value.elevations.slice(4); },
  ];
  for (const change of changes) { const corrupt = structuredClone(saved); change(corrupt); await assert.rejects(decodeMap(corrupt)); }
  const corrupt = structuredClone(saved), { elevations, checksum: _checksum, ...header } = corrupt;
  new DataView(elevations).setFloat32(0, NaN, true); corrupt.checksum = await payloadChecksum(header, elevations);
  await assert.rejects(decodeMap(corrupt), /finite/);
});
