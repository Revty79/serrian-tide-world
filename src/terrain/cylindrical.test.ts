import assert from 'node:assert/strict';
import test from 'node:test';
import { CYLINDER_PROVIDER, type CylinderConfiguration, type CylinderRegion } from '../surfaces/cylinder.ts';
import { createCylindricalTerrain, cylindricalSampleCount, type CylinderResolution, type CylinderSampleAddress, type CylinderSampleKey } from './cylindrical.ts';

const identity = { worldId: 'w', surfaceId: 'exterior' };
const geometry: CylinderConfiguration = { identity, provider: CYLINDER_PROVIDER, version: 1, configuration: 'solid-capped', role: 'exterior', radiusMeters: 6, lengthMeters: 12 };
const resolution = { angularSamples: 8, axialCells: 4, radialCells: 3 };
const create = (r = resolution) => createCylindricalTerrain({ terrainId: 'cylinder', geometry, resolution: r });
const address = (patchId: CylinderRegion, column: number, row: number): CylinderSampleAddress => ({ ...identity, patchId, column, row });

test('cylinder canonical layout has independent index and 3D sample fixtures', () => {
  const t = create();
  assert.equal(t.sampleCount, 74); // 40 side (including both rims), 17 per cap.
  for (const [d, i, xyz] of [
    [address('side', 0, 0), 0, [6, 0, 0]], [address('side', 2, 2), 18, [0, 6, 6]],
    [address('side', 4, 4), 36, [-6, 0, 12]], [address('cap-start', 0, 0), 40, [0, 0, 0]],
    [address('cap-start', 2, 1), 43, [0, 2, 0]], [address('cap-end', 0, 0), 57, [0, 0, 12]],
    [address('cap-end', 2, 2), 68, [0, -4, 12]], [address('cap-end', 2, 3), 38, [0, -6, 12]],
  ] as const) {
    const k = t.resolve(d); assert.equal(k.index, i);
    const got = t.referencePositionAt(k); got.forEach((v, axis) => assert.ok(Math.abs(v - xyz[axis]!) < 1e-12));
  }
});

for (const r of [{ angularSamples: 4, axialCells: 2, radialCells: 2 }, { angularSamples: 7, axialCells: 3, radialCells: 4 }, resolution, { angularSamples: 32, axialCells: 7, radialCells: 5 }]) {
  test(`cylinder exhaustive ownership, aliases, centers and wrap ${JSON.stringify(r)}`, () => {
    const t = create(r), seen = new Map<number, number>();
    for (const patchId of ['side', 'cap-start', 'cap-end'] as const) for (let row = 0; row <= (patchId === 'side' ? r.axialCells : r.radialCells); row++) for (let c = 0; c < r.angularSamples; c++) {
      const d = address(patchId, c, row), k = t.resolve(d);
      seen.set(k.index, (seen.get(k.index) ?? 0) + 1);
      assert.ok(t.aliases(k).some((a) => a.patchId === patchId && a.column === c && a.row === row));
      for (const turns of [-3, -1, 1, 4]) assert.equal(t.resolve({ ...d, column: c + turns * r.angularSamples }).index, k.index);
    }
    assert.equal(seen.size, t.sampleCount);
    assert.equal([...t.samples()].length, t.sampleCount);
    for (const k of t.samples()) {
      assert.equal(t.resolve(t.owner(k)).index, k.index);
      assert.equal(t.aliases(k).length, seen.get(k.index));
      for (const d of t.aliases(k)) {
        assert.equal(t.resolve(d).index, k.index);
        assert.deepEqual(t.geometry.referencePosition(t.positionAt(d)), t.referencePositionAt(k));
      }
    }
    assert.equal([...seen.values()].filter((n) => n === r.angularSamples).length, 2);
    assert.equal([...seen.values()].filter((n) => n === 2).length, 2 * r.angularSamples);
  });
  test(`cylinder every directed rim and neighbor is reciprocal, graph connected ${JSON.stringify(r)}`, () => {
    const t = create(r);
    for (const row of [0, r.axialCells]) for (let c = 0; c < r.angularSamples; c++) {
      const d = address('side', c, row), seam = t.crossRim(d), back = t.crossRim(seam.address);
      assert.deepEqual(back.address, d); assert.equal(seam.sample.index, t.resolve(d).index);
      assert.equal(seam.address.column, row === 0 ? c : (r.angularSamples - c) % r.angularSamples);
      assert.deepEqual(t.geometry.referencePosition(t.positionAt(d)), t.geometry.referencePosition(t.positionAt(seam.address)));
    }
    const visited = new Set<number>(), queue = [0];
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q]!; if (visited.has(i)) continue; visited.add(i);
      const k = t.keyAt(i), n = t.neighbors(k);
      assert.equal(n.length, new Set(n.map((k) => k.index)).size);
      const d = t.owner(k);
      assert.equal(n.length, d.patchId !== 'side' && d.row === 0 ? r.angularSamples : 4);
      for (const neighbor of n) {
        assert.notEqual(i, neighbor.index);
        assert.ok(t.neighbors(neighbor).some((k) => k.index === i));
        if (!visited.has(neighbor.index)) queue.push(neighbor.index);
      }
    }
    assert.equal(visited.size, t.sampleCount);
  });
}

for (const angularSamples of [4, 7, 9, 32]) test(`cylinder independent oriented cell counts, closure, genus and neighbor graph A=${angularSamples}`, () => {
  // Build a welded mesh with symbolic physical labels, without using provider indices/aliases.
  const r = { angularSamples, axialCells: 5, radialCells: 4 }, t = create(r), { angularSamples: a, axialCells: z, radialCells: p } = r;
  const wrap = (n: number) => (n + a) % a;
  const label = (region: CylinderRegion, c: number, row: number) => {
    c = wrap(c);
    if (region === 'side') return `side:${row}:${c}`;
    if (row === 0) return `${region}:center`;
    if (row === p) return `side:${region === 'cap-end' ? z : 0}:${region === 'cap-end' ? wrap(-c) : c}`;
    return `${region}:${row}:${c}`;
  };
  const polygons: string[][] = [], samples = new Map<string, number>();
  for (const region of ['side', 'cap-start', 'cap-end'] as const) {
    const max = region === 'side' ? z : p;
    for (let row = 0; row <= max; row++) for (let c = 0; c < a; c++) samples.set(label(region, c, row), t.resolve(address(region, c, row)).index);
    for (let row = region === 'side' ? 0 : 1; row < max; row++) for (let c = 0; c < a; c++) polygons.push([label(region, c, row), label(region, c + 1, row), label(region, c + 1, row + 1), label(region, c, row + 1)]);
    if (region !== 'side') for (let c = 0; c < a; c++) polygons.push([label(region, 0, 0), label(region, c + 1, 1), label(region, c, 1)]);
  }
  const directed = new Map<string, number>(), adjacency = new Map<string, Set<string>>();
  for (const polygon of polygons) for (let j = 0; j < polygon.length; j++) {
    const from = polygon[j]!, to = polygon[(j + 1) % polygon.length]!, edge = `${from}>${to}`;
    directed.set(edge, (directed.get(edge) ?? 0) + 1);
    if (!adjacency.has(from)) adjacency.set(from, new Set()); adjacency.get(from)!.add(to);
  }
  for (const [edge, count] of directed) { assert.equal(count, 1); const [from, to] = edge.split('>'); assert.equal(directed.get(`${to}>${from}`), 1); }
  assert.equal(samples.size, t.sampleCount); assert.equal(new Set(samples.values()).size, samples.size);
  assert.equal(samples.size, a * (z + 2 * p - 1) + 2);
  assert.equal(directed.size / 2, a * (2 * z + 4 * p - 1));
  assert.equal(polygons.length, a * (z + 2 * p));
  assert.equal(samples.size - directed.size / 2 + polygons.length, 2);
  for (const [label, index] of samples) assert.deepEqual(t.neighbors(t.keyAt(index)).map((k) => k.index).sort((x, y) => x - y), [...adjacency.get(label)!].map((s) => samples.get(s)!).sort((x, y) => x - y));
});

test('cylinder one exact Float32 authority through rim/center aliases, signed zero and finite validation', () => {
  const t = create(); assert.equal(t.metadata.seaLevel, 0); assert.ok(t.copyElevations().every((v) => v === -100));
  const rim = t.resolve(address('side', 3, 4)), alias = t.crossRim(address('side', 3, 4)).sample;
  for (const value of [Math.PI, 12345.678, 0, -0, 1e-40, -3.4028234663852886e38]) {
    t.write(alias, value); assert.ok(Object.is(t.read(rim), Math.fround(value)));
    const rev = t.revision; t.write(rim, value); assert.equal(t.revision, rev);
  }
  const rev = t.revision, bytes = t.copyElevations();
  for (const value of [NaN, Infinity, -Infinity, 1e40, Number.MAX_VALUE]) assert.throws(() => t.write(rim, value));
  assert.equal(t.revision, rev); assert.deepEqual(t.copyElevations(), bytes);
  t.write(t.resolve(address('cap-start', 6, 0)), 345.25);
  for (let c = 0; c < 8; c++) assert.equal(t.read(t.resolve(address('cap-start', c, 0))), 345.25);
  t.write(rim, 0); const r = t.revision; t.write(rim, -0); assert.equal(t.revision, r + 1);
});

test('cylinder snapshots and copies preserve identity/revision and isolate numerical storage', () => {
  const t = create(), key = t.keyAt(0); t.write(key, -0);
  const snapshot = t.snapshot(), copy = t.copyElevations();
  assert.equal(snapshot.metadata, t.metadata); assert.equal(snapshot.revision, t.revision);
  assert.ok(Object.isFrozen(snapshot.metadata.geometry)); assert.ok(Object.isFrozen(snapshot.metadata.representation.resolution));
  snapshot.elevations[0] = 500; copy[0] = 600; assert.ok(Object.is(t.read(key), -0));
  t.write(key, 700); assert.equal(snapshot.elevations[0], 500); assert.equal(copy[0], 600);
  assert.deepEqual(t.metadata.identity, identity);
});

test('cylinder keys reject other Worlds, surfaces, terrains, geometry, resolution and representation', () => {
  const t = create(), k = t.keyAt(0);
  for (const patch of [
    { worldId: 'other' }, { surfaceId: 'other' }, { terrainId: 'other' }, { representation: 'sphere' }, { representationVersion: 2 },
    { angularSamples: 9 }, { axialCells: 5 }, { radialCells: 4 }, { radiusMeters: 7 }, { lengthMeters: 13 }, { index: -1 }, { index: .5 }, { index: t.sampleCount },
  ]) for (const action of [(key: CylinderSampleKey) => t.read(key), (key: CylinderSampleKey) => t.write(key, 1), (key: CylinderSampleKey) => t.neighbors(key), (key: CylinderSampleKey) => t.aliases(key)]) assert.throws(() => action({ ...k, ...patch } as CylinderSampleKey));
  for (const changed of [{ worldId: 'other' }, { surfaceId: 'other' }]) {
    const other = createCylindricalTerrain({ terrainId: 'cylinder', geometry: { ...geometry, identity: { ...identity, ...changed } }, resolution });
    other.write(other.keyAt(0), 42); assert.equal(t.read(k), -100); assert.throws(() => t.read(other.keyAt(0)));
  }
  const other = createCylindricalTerrain({ terrainId: 'other-terrain', geometry, resolution });
  assert.throws(() => other.read(k)); other.write(other.keyAt(0), 34); assert.equal(t.read(k), -100);
});

test('cylinder invalid sample addresses, identities, resolutions and underflow fail before use', () => {
  const t = create();
  for (const patch of [{ column: .5 }, { column: Infinity }, { column: Number.MAX_SAFE_INTEGER + 1 }, { row: -1 }, { row: 5 }, { row: NaN }, { patchId: 'other' }, { worldId: 'other' }, { surfaceId: 'other' }]) assert.throws(() => t.resolve({ ...address('side', 0, 0), ...patch } as CylinderSampleAddress));
  assert.throws(() => t.resolve(address('cap-end', 0, 4)));
  assert.throws(() => t.crossRim(address('side', 1, 2)));
  assert.throws(() => t.crossRim(address('cap-start', 1, 2)));
  for (const field of ['angularSamples', 'axialCells', 'radialCells']) for (const value of [0, 1, -1, .5, NaN, Infinity, 1025]) assert.throws(() => create({ ...resolution, [field]: value }));
  for (const terrainId of ['', ' ', 'x'.repeat(129), 4]) assert.throws(() => createCylindricalTerrain({ terrainId, geometry, resolution } as Parameters<typeof createCylindricalTerrain>[0]));
  assert.throws(() => createCylindricalTerrain({ terrainId: 'tiny', geometry: { ...geometry, radiusMeters: Number.MIN_VALUE }, resolution }));
  assert.throws(() => createCylindricalTerrain({ terrainId: 'tiny', geometry: { ...geometry, lengthMeters: Number.MIN_VALUE }, resolution }));
});

for (const r of [resolution, { angularSamples: 1024, axialCells: 512, radialCells: 256 }]) test(`cylinder exact allocation bounds ${JSON.stringify(r)}`, () => {
  const t = create(r), expected = r.angularSamples * (r.axialCells + 1) + 2 * (1 + r.angularSamples * (r.radialCells - 1));
  assert.equal(cylindricalSampleCount(r as CylinderResolution), expected); assert.equal(t.elevationByteLength, expected * 4);
  assert.equal(t.copyElevations().byteLength, expected * 4);
  assert.ok(t.elevationByteLength <= 4190216);
  for (const i of [0, r.angularSamples - 1, r.angularSamples * (r.axialCells + 1), expected - 1]) assert.equal(t.resolve(t.owner(t.keyAt(i))).index, i);
});

test('cylinder maximum-resolution canonical ownership covers every index exactly', () => {
  const t = create({ angularSamples: 1024, axialCells: 512, radialCells: 256 });
  let visited = 0;
  for (const key of t.samples()) {
    assert.equal(key.index, visited++);
    assert.equal(t.resolve(t.owner(key)).index, key.index);
  }
  assert.equal(visited, 1047554);
});

test('cylinder metadata is detached from mutable caller options', () => {
  const callerIdentity = { ...identity }, callerGeometry = { ...geometry, identity: callerIdentity }, callerResolution = { ...resolution };
  const t = createCylindricalTerrain({ terrainId: 'cylinder', geometry: callerGeometry, resolution: callerResolution });
  callerIdentity.worldId = 'changed'; callerGeometry.radiusMeters = 99; callerResolution.angularSamples = 64;
  assert.equal(t.metadata.identity.worldId, 'w'); assert.equal(t.metadata.geometry.radiusMeters, 6);
  assert.equal(t.metadata.representation.resolution.angularSamples, 8);
  assert.equal(t.resolve(address('side', 0, 0)).index, 0);
});
