import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SOLID_CUBE_CONNECTIONS, SOLID_CUBE_FACES, SOLID_CUBE_PROVIDER, type CubeVector, type SolidCubeConfiguration, type SolidCubeFace } from '../surfaces/solid-cube.ts';
import { createSolidCubeTerrain, solidCubeSampleCount, SOLID_CUBE_REPRESENTATION, type SolidCubeSampleAddress, type SolidCubeSampleKey } from './solid-cube.ts';

const identity = { worldId: 'cube-world', surfaceId: 'outside' };
const geometry: SolidCubeConfiguration = { identity, provider: SOLID_CUBE_PROVIDER, version: 1, configuration: 'solid', role: 'exterior', sideLengthMeters: 10 };
const make = (cellsPerEdge = 4) => createSolidCubeTerrain({ terrainId: 'cube-terrain', geometry, cellsPerEdge });
const address = (patchId: SolidCubeFace, column: number, row: number): SolidCubeSampleAddress => ({ ...identity, patchId, column, row });
// Independent integer embedding, no runtime frames, adjacency or ownership formulas.
function xyz(face: SolidCubeFace, column: number, row: number, n: number): CubeVector {
  switch (face) {
    case 'px': return [n, column, row];
    case 'nx': return [0, n - column, row];
    case 'py': return [n - column, n, row];
    case 'ny': return [column, 0, row];
    case 'pz': return [column, row, n];
    case 'nz': return [column, n - row, 0];
  }
}

for (const n of [2, 3, 8]) test(`N=${n}: independent boundary-lattice enumeration certifies ownership, alias multiplicity and mesh Euler counts`, () => {
  const terrain = make(n), byPoint = new Map<string, number>(), byIndex = new Map<number, string>(), aliasUses = new Map<number, number>();
  // Enumerate the boundary of an (N+1)^3 integer box independently.
  const expected = new Set<string>();
  for (let x = 0; x <= n; x++) for (let y = 0; y <= n; y++) for (let z = 0; z <= n; z++) if ([x, y, z].some((i) => i === 0 || i === n)) expected.add([x, y, z].join());
  for (const face of SOLID_CUBE_FACES) for (let row = 0; row <= n; row++) for (let column = 0; column <= n; column++) {
    const a = address(face, column, row), key = terrain.resolve(a), point = xyz(face, column, row, n).join();
    if (byPoint.has(point)) assert.equal(key.index, byPoint.get(point));
    if (byIndex.has(key.index)) assert.equal(point, byIndex.get(key.index));
    byPoint.set(point, key.index); byIndex.set(key.index, point); aliasUses.set(key.index, (aliasUses.get(key.index) ?? 0) + 1);
    assert.deepEqual(terrain.resolve(terrain.owner(key)), key);
    assert.deepEqual(terrain.owner(key), terrain.aliases(key)[0]);
    assert.equal(terrain.read(key), -100);
  }
  assert.deepEqual(new Set(byPoint.keys()), expected); assert.equal(byIndex.size, 6 * n * n + 2);
  assert.deepEqual([...byIndex.keys()].sort((a, b) => a - b), Array.from({ length: terrain.sampleCount }, (_, i) => i));
  let interiors = 0, edgeSamples = 0, corners = 0, degreeSum = 0;
  for (const key of terrain.samples()) {
    const aliases = terrain.aliases(key), neighbors = terrain.neighbors(key);
    assert.equal(aliases.length, aliasUses.get(key.index));
    if (aliases.length === 1) interiors++; else if (aliases.length === 2) edgeSamples++; else { assert.equal(aliases.length, 3); corners++; }
    assert.equal(neighbors.length, aliases.length === 3 ? 3 : 4); degreeSum += neighbors.length;
    assert.equal(new Set(neighbors.map((k) => k.index)).size, neighbors.length);
    for (const other of neighbors) {
      assert.ok(terrain.neighbors(other).some((k) => k.index === key.index));
      assert.ok(Math.abs(Math.hypot(...terrain.referencePositionAt(key).map((v, i) => v - terrain.referencePositionAt(other)[i]!)) - 10 / n) < 1e-13);
    }
  }
  assert.deepEqual([interiors, edgeSamples, corners], [6 * (n - 1) ** 2, 12 * (n - 1), 8]);
  assert.equal(degreeSum / 2, 12 * n * n); assert.equal(terrain.sampleCount - degreeSum / 2 + 6 * n * n, 2);
});

for (const n of [128, 256]) test(`N=${n}: all aliases have exact physical positions, canonical values and bounded single-buffer memory`, () => {
  const terrain = make(n), values = terrain.copyElevations();
  assert.equal(terrain.sampleCount, n === 128 ? 98306 : 393218);
  assert.equal(terrain.elevationByteLength, n === 128 ? 393224 : 1572872);
  assert.equal(values.length, 6 * n * n + 2); assert.ok(values.every((v) => v === -100));
  let aliasesVisited = 0, corners = 0, edgeVertices = 0, interiorVertices = 0;
  const seen = new Uint8Array(terrain.sampleCount);
  for (const face of SOLID_CUBE_FACES) for (let row = 0; row <= n; row++) for (let column = 0; column <= n; column++) {
    const a = address(face, column, row), key = terrain.resolve(a), q = xyz(face, column, row, n), physical = q.map((v) => (2 * v - n) * (5 / n));
    const actual = terrain.geometry.referencePosition(terrain.positionAt(a));
    assert.deepEqual(actual, physical);
    assert.deepEqual(terrain.referencePositionAt(key), physical);
    seen[key.index] = seen[key.index]! + 1;
    assert.equal(terrain.read(key), -100); aliasesVisited++;
  }
  for (const uses of seen) { if (uses === 1) interiorVertices++; else if (uses === 2) edgeVertices++; else { assert.equal(uses, 3); corners++; } }
  assert.deepEqual([interiorVertices, edgeVertices, corners], [6 * (n - 1) ** 2, 12 * (n - 1), 8]);
  assert.equal(aliasesVisited, 6 * (n + 1) ** 2);
  assert.equal(terrain.sampleSpacingMeters, 10 / n);
  values.fill(123); assert.equal(terrain.read(terrain.keyAt(0)), -100); // defensive copy
  // Exact words through EVERY boundary alias, including signed zero and a Float32 maximum.
  const cases = [0, -0, 0.1, -435.25, 3.4028234663852886e38];
  for (const value of cases) {
    for (const face of SOLID_CUBE_FACES) for (let along = 0; along <= n; along++) for (const [column, row] of [[0, along], [n, along], [along, 0], [along, n]]) {
      const a = address(face, column!, row!), key = terrain.resolve(a);
      terrain.write(key, value);
      for (const alias of terrain.aliases(key)) assert.ok(Object.is(terrain.read(terrain.resolve(alias)), Math.fround(value)));
    }
  }
});

test('odd lattice counts and decimal side lengths give bit-identical physical aliases', () => {
  for (const n of [3, 7, 255]) for (const sideLengthMeters of [0.1, 123.456]) {
    const t = createSolidCubeTerrain({ terrainId: 'decimal', geometry: { ...geometry, sideLengthMeters }, cellsPerEdge: n });
    for (const c of SOLID_CUBE_CONNECTIONS) for (let along = 0; along <= n; along++) {
      const fixed = c.edge.endsWith('min') ? 0 : n, a = address(c.face, c.edge.startsWith('u') ? fixed : along, c.edge.startsWith('v') ? fixed : along);
      const key = t.resolve(a), expected = t.geometry.referencePosition(t.positionAt(a));
      for (const alias of t.aliases(key)) assert.deepEqual(t.geometry.referencePosition(t.positionAt(alias)), expected);
    }
  }
});

test('all directed discrete edge aliases are reciprocal, including reversed orientation and every corner', () => {
  for (const n of [3, 128, 256]) {
    const terrain = make(n);
    for (const c of SOLID_CUBE_CONNECTIONS) for (let along = 0; along <= n; along++) {
      const fixed = c.edge.endsWith('min') ? 0 : n, a = address(c.face, c.edge.startsWith('u') ? fixed : along, c.edge.startsWith('v') ? fixed : along);
      const crossed = terrain.crossEdge(a, c.edge), back = terrain.crossEdge(crossed.address, c.toEdge);
      assert.deepEqual(back.address, a); assert.deepEqual(crossed.sample, terrain.resolve(a));
      assert.deepEqual(terrain.geometry.referencePosition(terrain.positionAt(a)), terrain.geometry.referencePosition(terrain.positionAt(crossed.address)));
    }
  }
});

test('writes preserve exact Float32 semantics and revision changes only for a changed canonical word', () => {
  const terrain = make(), key = terrain.resolve(address('px', 4, 4)), aliases = terrain.aliases(key);
  assert.equal(aliases.length, 3); assert.equal(terrain.revision, 0);
  terrain.write(key, -100); assert.equal(terrain.revision, 0);
  for (const [i, value] of [0, -0, 1 / 3, -1 / 3].entries()) {
    terrain.write(terrain.resolve(aliases[i % 3]!), value); assert.equal(terrain.revision, i + 1);
    for (const alias of aliases) assert.ok(Object.is(terrain.read(terrain.resolve(alias)), Math.fround(value)));
    terrain.write(key, Math.fround(value)); assert.equal(terrain.revision, i + 1);
  }
  const before = terrain.copyElevations(), revision = terrain.revision;
  for (const value of [NaN, Infinity, -Infinity, 1e39]) assert.throws(() => terrain.write(key, value), RangeError);
  assert.deepEqual(terrain.copyElevations(), before); assert.equal(terrain.revision, revision);
});

test('foreign Worlds, surfaces, terrains, dimensions, representations and resolutions cannot address this authority', () => {
  const terrain = make(), key = terrain.keyAt(0), original = terrain.copyElevations();
  for (const patch of [{ worldId: 'elsewhere' }, { surfaceId: 'inside' }, { terrainId: 'other' }, { sideLengthMeters: 11 }, { representation: 'equiangular-cube-sphere-vertices' }, { representationVersion: 2 }, { cellsPerEdge: 128 }, { index: -1 }, { index: 0.5 }, { index: terrain.sampleCount }, { index: NaN }]) {
    const foreign = { ...key, ...patch } as SolidCubeSampleKey;
    assert.throws(() => terrain.read(foreign), RangeError); assert.throws(() => terrain.write(foreign, 20), RangeError);
    assert.throws(() => terrain.owner(foreign), RangeError); assert.throws(() => terrain.aliases(foreign), RangeError); assert.throws(() => terrain.neighbors(foreign), RangeError);
  }
  for (const patch of [{ worldId: 'elsewhere' }, { surfaceId: 'inside' }, { patchId: 'unknown' }, { column: -1 }, { column: 5 }, { row: 0.5 }, { row: Infinity }]) assert.throws(() => terrain.resolve({ ...address('px', 0, 0), ...patch } as SolidCubeSampleAddress), RangeError);
  assert.deepEqual(terrain.copyElevations(), original); assert.equal(terrain.revision, 0);
  const sibling = createSolidCubeTerrain({ terrainId: 'sibling', geometry: { ...geometry, identity: { ...identity, surfaceId: 'independent-exterior' } }, cellsPerEdge: 4 });
  sibling.write(sibling.keyAt(0), 500); terrain.write(key, -500);
  assert.equal(sibling.read(sibling.keyAt(0)), 500); assert.equal(terrain.read(key), -500);
});

test('representation/dimensions reject invalid inputs before allocation and snapshots do not retain mutable options', () => {
  for (const n of [0, 1, -1, NaN, Infinity, 2.5, 257, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => solidCubeSampleCount(n), RangeError); assert.throws(() => make(n), RangeError);
  }
  for (const terrainId of ['', ' ', 'x'.repeat(129)]) assert.throws(() => createSolidCubeTerrain({ terrainId, geometry }), RangeError);
  // Geometry area is representable, but the N=256 cell area underflows.
  assert.throws(() => createSolidCubeTerrain({ terrainId: 'tiny', geometry: { ...geometry, sideLengthMeters: 1e-160 }, cellsPerEdge: 256 }), RangeError);
  const mutable = { terrainId: 'snapshot', geometry: { ...geometry, identity: { ...identity } }, cellsPerEdge: 4 }, terrain = createSolidCubeTerrain(mutable);
  mutable.terrainId = 'changed'; mutable.geometry.identity.worldId = 'changed'; mutable.cellsPerEdge = 256;
  assert.equal(terrain.metadata.terrainId, 'snapshot'); assert.equal(terrain.metadata.identity.worldId, identity.worldId); assert.equal(terrain.metadata.representation.cellsPerEdge, 4);
  assert.ok(Object.isFrozen(terrain.metadata)); assert.ok(Object.isFrozen(terrain.metadata.representation));
  assert.equal(terrain.metadata.representation.provider, SOLID_CUBE_REPRESENTATION);
  assert.throws(() => terrain.crossEdge(address('px', 2, 2), 'u-max'), RangeError);
});
