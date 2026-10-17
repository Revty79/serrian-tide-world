import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankTerrain } from '../terrain/model.ts';
import { decodeHeightmap, encodeHeightmap, MAX_SAMPLES } from './terrain-format.ts';

test('versioned saves round-trip every Float32 bit, nonstandard dimensions, sea level and identity', async () => {
  const terrain = createBlankTerrain({ id: 'custom-world', columns: 71, rows: 29, width: 2.5, height: 1.3, seaLevel: -23.25 });
  terrain.elevations.forEach((_, i, data) => { data[i] = i % 3 ? Math.fround(Math.sin(i) * 1e20) : -0; });
  const original = terrain.elevations.slice(), metadata = structuredClone(terrain.metadata);
  const record = await encodeHeightmap(terrain, '  My world  '), reopened = await decodeHeightmap(structuredClone(record));
  assert.equal(record.elevations.byteLength, terrain.elevations.length * 4);
  assert.equal(reopened.name, 'My world'); assert.deepEqual(reopened.terrain.metadata, metadata);
  assert.ok(original.every((v, i) => Object.is(v, reopened.terrain.elevations[i])));
  assert.notEqual(reopened.terrain.elevations, terrain.elevations); assert.deepEqual(terrain.elevations, original);
});
test('corrupt payloads, altered metadata and incompatible versions are rejected without mutating current work', async () => {
  const terrain = createBlankTerrain({ id: 'current' }), before = terrain.elevations.slice();
  const saved = await encodeHeightmap(terrain, 'World');
  const changes = [
    (v: typeof saved) => { new DataView(v.elevations).setFloat32(100, 123, true); },
    (v: typeof saved) => { v.elevations = v.elevations.slice(4); },
    (v: typeof saved) => { Object.assign(v, { formatVersion: 2 }); },
    (v: typeof saved) => { Object.assign(v.metadata, { seaLevel: 11 }); },
    (v: typeof saved) => { Object.assign(v.metadata.resolution, { columns: 4096, rows: 4096 }); },
    (v: typeof saved) => { Object.assign(v.metadata.dimensions, { width: -1 }); },
    (v: typeof saved) => { v.id = 'different'; },
    (v: typeof saved) => { v.name = ''; },
    (v: typeof saved) => { v.savedAt = 'yesterday'; },
  ];
  for (const change of changes) { const corrupt = structuredClone(saved); change(corrupt); await assert.rejects(decodeHeightmap(corrupt)); }
  assert.deepEqual(terrain.elevations, before); assert.equal(terrain.metadata.id, 'current');
});
test('validation rejects nonfinite elevations, mismatched shape and oversized or blank names', async () => {
  const terrain = createBlankTerrain({ id: 'invalid', columns: 2, rows: 2 });
  for (const value of [NaN, Infinity, -Infinity]) { terrain.elevations[0] = value; await assert.rejects(encodeHeightmap(terrain, 'World')); }
  terrain.elevations[0] = -100;
  await assert.rejects(encodeHeightmap(terrain, ' ')); await assert.rejects(encodeHeightmap(terrain, 'a'.repeat(121)));
  await assert.rejects(encodeHeightmap({ ...terrain, elevations: new Float32Array(3) }, 'World'));
  assert.equal(MAX_SAMPLES, 1024 * 1024);
});
