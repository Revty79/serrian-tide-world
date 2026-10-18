import assert from 'node:assert/strict';
import test from 'node:test';
import { createCylindricalTerrain, type CylinderPatchBlock } from './cylindrical.ts';
const identity = { worldId: 'patch-world', surfaceId: 'exterior' };
const make = () => createCylindricalTerrain({ terrainId: 'patch', geometry: { identity, provider: 'physical-closed-cylinder', version: 1, configuration: 'solid-capped', role: 'exterior', radiusMeters: 1, lengthMeters: 2 }, resolution: { angularSamples: 7, axialCells: 3, radialCells: 2 } });
const block = (indices: number[], values: number[], count = indices.length): CylinderPatchBlock => ({ indices: Uint32Array.from(indices), values: Float32Array.from(values), count });

test('cylinder prepared patch validates every block before the first write', () => {
  for (const bad of [block([1], [Infinity]), block([0], [1]), block([3, 2], [1, 2]), block([100000], [1]), block([1], [1], 2), block([1], [], 1)]) {
    const t = make(), before = t.snapshot();
    assert.throws(() => t.commitPreparedPatch(t.keyAt(0), t.revision, [block([0], [23]), bad]));
    assert.deepEqual(t.copyElevations(), before.elevations); assert.equal(t.revision, before.revision);
  }
});

test('cylinder prepared patch enforces identities, revision and bounded ordinary arrays', () => {
  const t = make(), before = t.snapshot();
  assert.throws(() => t.commitPreparedPatch({ ...t.keyAt(0), worldId: 'foreign' }, t.revision, [block([0], [1])]));
  assert.throws(() => t.commitPreparedPatch(t.keyAt(0), t.revision + 1, [block([0], [1])]));
  assert.throws(() => t.commitPreparedPatch(t.keyAt(0), t.revision, Array.from({ length: 257 }, () => block([], []))));
  assert.throws(() => t.commitPreparedPatch(t.keyAt(0), t.revision, [{ indices: new Uint32Array(new SharedArrayBuffer(4)), values: new Float32Array(1), count: 1 }]));
  const detached = new Uint32Array([0]); structuredClone(detached.buffer, { transfer: [detached.buffer] });
  assert.throws(() => t.commitPreparedPatch(t.keyAt(0), t.revision, [{ indices: detached, values: new Float32Array([1]), count: 1 }]));
  assert.deepEqual(t.copyElevations(), before.elevations); assert.equal(t.revision, before.revision);
});

test('cylinder prepared patch has exact Float32/signed-zero writes and per-word revision behavior', () => {
  const t = make(), key = t.keyAt(0), initial = t.revision, blocks = [block([0], [-0]), block([1, 2], [0, Math.PI])];
  assert.equal(t.commitPreparedPatch(key, initial, blocks), 3); assert.equal(t.revision, initial + 3);
  assert.ok(Object.is(t.read(t.keyAt(0)), -0)); assert.ok(Object.is(t.read(t.keyAt(1)), 0)); assert.equal(t.read(t.keyAt(2)), Math.fround(Math.PI));
  assert.equal(t.commitPreparedPatch(key, t.revision, blocks), 0); assert.equal(t.revision, initial + 3);
  assert.equal(t.commitPreparedPatch(key, t.revision, [block([0], [0])]), 1); assert.equal(t.revision, initial + 4);
});
