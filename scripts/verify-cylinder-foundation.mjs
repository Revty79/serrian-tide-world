// Reproducible A7-A allocation/precision receipt; numerical tests provide the independent mesh oracle.
// Run: node --expose-gc scripts/verify-cylinder-foundation.mjs
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createCylindricalTerrain } from '../src/terrain/cylindrical.ts';
const geometry = { identity: { worldId: 'a7-a-proof', surfaceId: 'exterior' }, provider: 'physical-closed-cylinder', version: 1, configuration: 'solid-capped', role: 'exterior', radiusMeters: 6371000, lengthMeters: 12000000 };
if (!global.gc) throw Error('Use --expose-gc for an isolated retained allocation measurement.');
const records = [];
for (const resolution of [{ angularSamples: 128, axialCells: 64, radialCells: 32 }, { angularSamples: 256, axialCells: 128, radialCells: 64 }, { angularSamples: 1024, axialCells: 512, radialCells: 256 }]) {
  global.gc(); const before = process.memoryUsage().arrayBuffers, start = performance.now();
  const terrain = createCylindricalTerrain({ terrainId: 'receipt', geometry, resolution });
  const creationMs = performance.now() - start;
  const retainedArrayBufferDelta = process.memoryUsage().arrayBuffers - before;
  assert.equal(retainedArrayBufferDelta, terrain.elevationByteLength);
  const snapshot = terrain.snapshot(), snapshotArrayBufferDelta = process.memoryUsage().arrayBuffers - before;
  assert.equal(snapshotArrayBufferDelta, 2 * terrain.elevationByteLength);
  const center = terrain.resolve({ ...geometry.identity, patchId: 'cap-start', column: 17, row: 0 });
  terrain.write(center, -0); assert.equal(snapshot.elevations[center.index], -100);
  const words = new Uint32Array(snapshot.elevations.buffer);
  assert.ok(words.every((word) => word === 0xc2c80000)); // Independent IEEE754 encoding of -100.
  records.push({ resolution, sampleCount: terrain.sampleCount, authorityBytes: terrain.elevationByteLength, retainedArrayBufferDelta, snapshotArrayBufferDelta, creationMs, blankFloat32Word: 'c2c80000', blankSnapshotSha256: createHash('sha256').update(new Uint8Array(snapshot.elevations.buffer)).digest('hex') });
}
const receipt = { timestamp: new Date().toISOString(), node: process.version, platform: process.platform, geometry, records, caveat: 'Isolated Node ArrayBuffer deltas, not browser/process/total JS memory. Each caller-owned snapshot adds another authority-sized buffer. No cylinder renderer or brush is implemented.' };
writeFileSync('docs/evidence/a7-a-cylinder-allocation.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
