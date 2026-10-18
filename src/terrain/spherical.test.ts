import test from 'node:test';
import assert from 'node:assert/strict';
import { CUBE_FACES, FACE_CONNECTIONS, geodesicDistanceMeters } from '../surfaces/cube-sphere.ts';
import { CARDINAL_DIRECTIONS, createSphericalTerrain, sphericalSampleCount, type SphericalSampleAddress } from './spherical.ts';

const identity = { worldId: 'sphere-world', surfaceId: 'habitable' };
const make = (cellsPerEdge = 8) => createSphericalTerrain({ terrainId: 'sphere-terrain', identity, radiusMeters: 1_250_000, cellsPerEdge });
const bits = (values: Float32Array) => new Uint32Array(values.buffer, values.byteOffset, values.length);

test('blank spherical authority has physical radius, stable identities and one finite Float32 payload, with no six-array duplication', () => {
  const input = { ...identity }, sphere = createSphericalTerrain({ terrainId: 'initial', identity: input, radiusMeters: 700 });
  input.worldId = 'later-input-mutation';
  assert.equal(sphere.metadata.identity.worldId, identity.worldId); assert.equal(sphere.metadata.geometry.radiusMeters, 700);
  assert.equal(sphere.metadata.representation.cellsPerEdge, 128); assert.equal(sphere.metadata.seaLevel, 0); assert.equal(sphere.metadata.elevationUnits, 'meters');
  assert.equal(sphere.sampleCount, 98_306); assert.equal(sphere.elevationByteLength, 393_224);
  const copy = sphere.copyElevations(); assert.ok(copy instanceof Float32Array); assert.ok(copy.every((v) => v === -100));
  copy.fill(999); assert.equal(sphere.read(sphere.keyAt(0)), -100);
  assert.ok(Object.isFrozen(sphere.metadata)); assert.ok(Object.isFrozen(sphere.metadata.representation.faces));
});

for (const cells of [2, 3, 8, 16]) test(`all face addresses at N=${cells} resolve exactly once into 6N²+2 canonical nodes with 1/2/3 chart aliases`, () => {
  const sphere = make(cells), occurrences = new Map<number, SphericalSampleAddress[]>();
  for (const patchId of CUBE_FACES) for (let row = 0; row <= cells; row++) for (let column = 0; column <= cells; column++) {
    const address = { ...identity, patchId, column, row }, key = sphere.resolve(address);
    const list = occurrences.get(key.index) ?? []; list.push(address); occurrences.set(key.index, list);
  }
  assert.equal(occurrences.size, 6 * cells * cells + 2);
  const counts = [0, 0, 0, 0];
  for (const key of sphere.samples()) {
    const aliases = sphere.aliases(key), actual = occurrences.get(key.index)!; assert.deepEqual(aliases, actual);
    counts[aliases.length]!++;
    for (const address of aliases) {
      assert.deepEqual(sphere.resolve(address), key);
      assert.ok(geodesicDistanceMeters(sphere.geometry.direction(sphere.positionAt(address)), sphere.directionAt(key), 1) < 1e-14);
    }
  }
  assert.deepEqual(counts.slice(1), [6 * (cells - 1) ** 2, 12 * (cells - 1), 8]);
});

test('all face quads form a connected closed sphere: every graph edge has two incident faces and Euler characteristic is two', () => {
  const cells = 8, sphere = make(cells), edges = new Map<string, number>(), quads = new Set<string>();
  for (const patchId of CUBE_FACES) for (let row = 0; row < cells; row++) for (let column = 0; column < cells; column++) {
    const indices = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([dx, dy]) => sphere.resolve({ ...identity, patchId, column: column + dx!, row: row + dy! }).index);
    quads.add([...indices].sort((a, b) => a - b).join('/'));
    for (let i = 0; i < 4; i++) { const key = [indices[i], indices[(i + 1) % 4]].sort((a, b) => a! - b!).join('/'); edges.set(key, (edges.get(key) ?? 0) + 1); }
  }
  assert.equal(quads.size, 384); assert.equal(edges.size, 768); assert.ok([...edges.values()].every((count) => count === 2));
  assert.equal(sphere.sampleCount - edges.size + quads.size, 2);
  const visited = new Set([0]), queue = [0];
  for (let i = 0; i < queue.length; i++) for (const neighbor of sphere.neighbors(sphere.keyAt(queue[i]!))) if (!visited.has(neighbor.index)) { visited.add(neighbor.index); queue.push(neighbor.index); }
  assert.equal(visited.size, 386);
});

test('edge and cell neighbors are reciprocal, alias-independent, unique and degree-correct at every corner', () => {
  const sphere = make();
  for (const key of sphere.samples()) for (const mode of ['edges', 'cells'] as const) {
    const neighbors = sphere.neighbors(key, mode), corner = sphere.aliases(key).length === 3;
    assert.equal(neighbors.length, mode === 'edges' ? (corner ? 3 : 4) : (corner ? 6 : 8));
    assert.equal(new Set(neighbors.map((k) => k.index)).size, neighbors.length);
    for (const neighbor of neighbors) { assert.notEqual(neighbor.index, key.index); assert.ok(sphere.neighbors(neighbor, mode).some((k) => k.index === key.index)); }
  }
});

test('every supported cardinal step on all six charts, edges and corners is valid and reciprocal by canonical identity', () => {
  const sphere = make(), cells = 8; let crossed = 0;
  for (const patchId of CUBE_FACES) for (let row = 0; row <= cells; row++) for (let column = 0; column <= cells; column++) for (const direction of CARDINAL_DIRECTIONS) {
    const address = { ...identity, patchId, row, column }, source = sphere.resolve(address), next = sphere.step(address, direction);
    assert.ok(sphere.neighbors(source).some((k) => k.index === next.sample.index));
    assert.equal(sphere.step(next.address, next.reverseDirection).sample.index, source.index);
    if (next.seam) crossed++;
  }
  assert.equal(crossed, 24 * (cells + 1));
});

test('deterministic writes along all twelve shared boundaries and all corners are immediately identical through every adjoining face', () => {
  const sphere = make(), before = sphere.copyElevations(), modified = new Set<number>();
  for (const connection of FACE_CONNECTIONS) for (let along = 0; along <= 8; along++) {
    const address = { ...identity, patchId: connection.face, column: connection.edge.startsWith('u') ? (connection.edge.endsWith('min') ? 0 : 8) : along, row: connection.edge.startsWith('v') ? (connection.edge.endsWith('min') ? 0 : 8) : along };
    const key = sphere.resolve(address), value = Math.fround(123.25 + key.index / 8); sphere.write(key, value); modified.add(key.index);
    for (const alias of sphere.aliases(key)) assert.equal(sphere.read(sphere.resolve(alias)), value);
  }
  assert.equal(modified.size, 12 * 7 + 8);
  const after = sphere.copyElevations(); for (let i = 0; i < before.length; i++) if (!modified.has(i)) assert.equal(after[i], before[i]);
  const key = sphere.resolve({ ...identity, patchId: 'px', row: 0, column: 0 }); sphere.write(key, -0);
  for (const alias of sphere.aliases(key)) assert.ok(Object.is(sphere.read(sphere.resolve(alias)), -0));
  assert.equal(bits(sphere.copyElevations())[key.index], 0x80000000);
});

test('poles are ordinary nodes, geometry/view-direction queries mutate no data, metadata or sample identities', () => {
  const sphere = make(), key = sphere.resolve({ ...identity, patchId: 'pz', column: 4, row: 4 }); sphere.write(key, 731.25);
  const before = bits(sphere.copyElevations()), metadata = sphere.metadata;
  assert.deepEqual(sphere.directionAt(key), [0, 0, 1]); assert.equal(sphere.aliases(key).length, 1); assert.equal(sphere.neighbors(key).length, 4);
  for (const direction of [[1, 2, 3], [0, 0, 1], [0, 0, -1], [1, 1, 1], [-1, -1, 0]] as const) for (const point of sphere.geometry.positionsForDirection(direction)) {
    sphere.geometry.referencePosition(point); sphere.geometry.metric.distance(point, sphere.positionAt(sphere.aliases(key)[0]!)); sphere.geometry.canonicalPosition(point);
  }
  for (const k of sphere.samples()) { sphere.directionAt(k); sphere.neighbors(k, 'cells'); }
  assert.deepEqual(bits(sphere.copyElevations()), before); assert.equal(sphere.metadata, metadata); assert.equal(sphere.read(key), 731.25);
});

test('invalid keys, cross-surface addresses, resolutions and elevations fail before mutating authoritative terrain', () => {
  const sphere = make(), key = sphere.keyAt(0), before = bits(sphere.copyElevations());
  for (const n of [0, 1, 2.5, 513, Infinity, NaN]) assert.throws(() => sphericalSampleCount(n));
  for (const change of [{ worldId: 'foreign' }, { surfaceId: 'interior' }, { terrainId: 'other' }, { representationVersion: 2 }, { cellsPerEdge: 16 }, { index: -1 }, { index: 386 }, { index: NaN }]) {
    const bad = { ...key, ...change } as typeof key; assert.throws(() => sphere.read(bad)); assert.throws(() => sphere.write(bad, 10)); assert.throws(() => sphere.neighbors(bad));
  }
  for (const value of [Infinity, NaN, 1e39, -1e39]) assert.throws(() => sphere.write(key, value));
  for (const direction of ['diagonal', '__proto__', 'constructor']) assert.throws(() => sphere.step({ ...identity, patchId: 'px', column: 8, row: 8 }, direction as 'u+'));
  for (const change of [{ worldId: 'foreign' }, { surfaceId: 'interior' }, { patchId: 'cube' }, { column: -1 }, { row: 9 }, { column: .5 }]) assert.throws(() => sphere.resolve({ ...identity, patchId: 'px', column: 1, row: 1, ...change } as SphericalSampleAddress));
  assert.deepEqual(bits(sphere.copyElevations()), before);
});

test('separate surfaces and resolutions cannot alias canonical keys or elevations even under the same parent World', () => {
  const first = make(), second = createSphericalTerrain({ terrainId: 'inside-terrain', identity: { ...identity, surfaceId: 'inside' }, radiusMeters: 500, cellsPerEdge: 8 }), finer = make(16);
  const key = first.keyAt(0); first.write(key, 123.75);
  assert.equal(second.read(second.keyAt(0)), -100); assert.equal(finer.read(finer.keyAt(0)), -100);
  assert.throws(() => second.write(key, 50)); assert.throws(() => finer.write(key, 50));
});
