import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCubeBrushDistancePlan, cubeBrushFalloff, cubeBrushRatioRoot, cubeNextUp, cubeNextDown, CubeDabCertificationError, type CubeDabMeter } from './cube-brush-distance.ts';
import { createCubeExactBudget, cubeFloatDyadic, cubeRootInterval } from './cube-route-exact.ts';
import { createSolidCubeRouter } from './solid-cube-routing.ts';
import { SOLID_CUBE_PROVIDER, SOLID_CUBE_FACES, SOLID_CUBE_PHYSICAL_EDGES, SOLID_CUBE_CORNERS, type SolidCubeConfiguration } from './solid-cube.ts';
import { createSolidCubeTerrain } from '../terrain/solid-cube.ts';
const identity = { worldId: 'brush-geometry', surfaceId: 'exterior' };
const configuration: SolidCubeConfiguration = { identity, provider: SOLID_CUBE_PROVIDER, version: 1, configuration: 'solid', role: 'exterior', sideLengthMeters: 8 };
const terrain = createSolidCubeTerrain({ terrainId: 'small', geometry: configuration, cellsPerEdge: 2 }), router = createSolidCubeRouter(configuration);
const p = (patchId: typeof SOLID_CUBE_FACES[number], u = 0, v = 0) => ({ ...identity, patchId, u, v });
export function cubeTestMeter(): CubeDabMeter & { work: number } { return { work: 0, tick() { this.work++; }, sequenceTests: 0, portalTests: 0, squaredRejected: 0, chordRejected: 0, commonFace: 0, rootComparisons: 0, rootFallbacks: 0 }; }
function drain<T>(generator: Generator<void, T>): T { for (;;) { const step = generator.next(); if (step.done) return step.value; } }
const centers = [...SOLID_CUBE_FACES.map((face) => p(face)), ...SOLID_CUBE_PHYSICAL_EDGES.map((e) => p(e.face, e.edge.startsWith('u') ? (e.edge.endsWith('min') ? -4 : 4) : 0, e.edge.startsWith('v') ? (e.edge.endsWith('min') ? -4 : 4) : 0)),
  ...SOLID_CUBE_CORNERS.map((c) => terrain.geometry.positionsForReference(c.signs.map((v) => v*4) as [number, number, number])[0]!)];
function equalSquared(a: bigint, exponent: number, b: { n: bigint; d: bigint; exponent: number }) {
  const shift = exponent-b.exponent;
  assert.equal(shift >= 0 ? (a*b.d)<<BigInt(shift) : a*b.d, shift >= 0 ? b.n : b.n<<BigInt(-shift));
}
for (const [i, center] of centers.entries()) test(`compiled exact footprint: center ${i} covers the 6 faces / 12 edges / 8 corners`, () => {
  const meter = cubeTestMeter(), plan = createCubeBrushDistancePlan(terrain, center, 32, meter);
  assert.equal(plan.summary.compiledSequences, 133);
  const discovered = new Set<number>();
  for (const address of plan.slots()) { const key = terrain.resolve(address); if (terrain.owner(key).patchId === address.patchId) { assert.ok(!discovered.has(key.index)); discovered.add(key.index); } }
  assert.equal(discovered.size, terrain.sampleCount);
  for (const key of terrain.samples()) {
    const address = terrain.owner(key), actual = drain(plan.squared(address.patchId, address.column, address.row)); assert.notEqual(actual, null);
    const expected = router.route(center, terrain.positionAt(address)); equalSquared(actual!, 2*plan.exponent, expected.distanceSquared);
  }
});
test('exact boundary, adjacent radius values and conservative candidate discovery', () => {
  const t = createSolidCubeTerrain({ terrainId: 'boundary', geometry: configuration, cellsPerEdge: 4 }), address = { ...identity, patchId: 'px' as const, column: 3, row: 2 };
  for (const [radius, inside] of [[cubeNextDown(2), false], [2, false], [cubeNextUp(2), true]] as const) {
    const plan = createCubeBrushDistancePlan(t, p('px'), radius, cubeTestMeter()), squared = drain(plan.squared('px', 3, 2));
    assert.equal(squared !== null, inside); if (inside) assert.ok([...plan.slots()].some((a) => a.patchId === address.patchId && a.column === 3 && a.row === 2));
  }
});
test('near-corner/edge, four-face, decimal, below-ULP and extreme centers agree with certified routes', () => {
  for (const length of [8, 1e-140, 5e153]) {
    const config = { ...configuration, sideLengthMeters: length }, t = createSolidCubeTerrain({ terrainId: `scale-${length}`, geometry: config, cellsPerEdge: 8 }), r = createSolidCubeRouter(config), h = length/2;
    for (const center of [p('px', h-4*Number.EPSILON*h, h-4*Number.EPSILON*h), p('px', Number.MIN_VALUE), p('ny', -h*.3, h*.2)]) {
      const plan = createCubeBrushDistancePlan(t, center, length*4, cubeTestMeter());
      for (const index of [0, 3, 17, 80, 120, 180, 260, t.sampleCount-1]) { const a = t.owner(t.keyAt(index)); equalSquared(drain(plan.squared(a.patchId, a.column, a.row))!, 2*plan.exponent, r.route(center, t.positionAt(a)).distanceSquared); }
    }
  }
});
test('small radius discovery never omits any independently certified interior sample', () => {
  const t = createSolidCubeTerrain({ terrainId: 'discovery', geometry: configuration, cellsPerEdge: 8 });
  for (const center of [p('px', 3.9, 3.8), p('ny', -.7, .3), ...centers.slice(6, 10)]) {
    const radius = 2.1, plan = createCubeBrushDistancePlan(t, center, radius, cubeTestMeter());
    const found = new Set([...plan.slots()].map((a) => t.resolve(a).index));
    for (const key of t.samples()) { const a = t.owner(key), expected = router.route(center, t.positionAt(a)); if (expected.distanceMeters.upper < radius) assert.ok(found.has(key.index)); }
  }
});
test('ratio roots have exact adjacent bounds, including subnormal ratios and an untrusted sqrt seed', () => {
  const cases: [bigint, bigint][] = [[0n, 1n], [1n, 1n], [1n, 4n], [2n, 3n], [1n, 1n<<2148n], [1n, 1n<<4300n]];
  for (let i = 1; i <= 100; i++) cases.push([BigInt(i*7919), BigInt(i*7919+104729)]);
  for (const [n, d] of cases) { const actual = drain(cubeBrushRatioRoot(n,d,cubeTestMeter())), reference = cubeRootInterval(createCubeExactBudget(), n,d,0); assert.deepEqual(actual, { lower: reference.lower, upper: reference.upper }); }
  const original = Math.sqrt, meter = cubeTestMeter();
  try { Math.sqrt = () => 0; const result = drain(cubeBrushRatioRoot(2n,3n,meter)); assert.equal(result.lower, cubeRootInterval(createCubeExactBudget(),2n,3n,0).lower); assert.equal(meter.rootFallbacks,1); }
  finally { Math.sqrt = original; }
});
test('outward cubic intervals enclose exact rational polynomial values; known weights are exact', () => {
  for (const t of [0, Number.MIN_VALUE, .125, .25, .5, .75, cubeNextDown(1), 1]) {
    const result = cubeBrushFalloff({ lower:t, upper:t }), q = cubeFloatDyadic(t), exponent = Math.min(q.exponent, 0), denominator = 1n<<BigInt(-exponent), numerator = q.n<<BigInt(q.exponent-exponent);
    const idealN = (denominator-numerator)**2n*(denominator+2n*numerator), idealD = denominator**3n;
    for (const [bound, lower] of [[result.lower, true], [result.upper, false]] as const) {
      const v = cubeFloatDyadic(bound); let left = v.n*idealD, right = idealN;
      if (v.exponent >= 0) left <<= BigInt(v.exponent); else right <<= BigInt(-v.exponent);
      assert.ok(lower ? left <= right : left >= right);
    }
    assert.ok(result.value >= result.lower && result.value <= result.upper);
  }
  assert.equal(cubeBrushFalloff({lower:.5,upper:.5}).value,.5);
  assert.equal(cubeBrushFalloff({lower:.75,upper:.75}).value,.15625);
});
test('invalid geometry queries and ratios fail explicitly', () => {
  assert.throws(() => createCubeBrushDistancePlan(terrain, { ...p('px'), worldId:'other' }, 2, cubeTestMeter()), RangeError);
  for (const radius of [0, NaN, Infinity]) assert.throws(() => createCubeBrushDistancePlan(terrain,p('px'),radius,cubeTestMeter()),RangeError);
  assert.throws(() => drain(cubeBrushRatioRoot(2n,1n,cubeTestMeter())), CubeDabCertificationError);
});
