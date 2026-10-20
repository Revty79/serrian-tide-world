import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CubeRouteCertificationError, createCubeExactBudget, cubeDyadicGrid, cubeFloatDyadic, cubeFraction, cubeFractionCompare, cubeFractionSubtract, cubeRootInterval } from './cube-route-exact.ts';

test('exact IEEE inputs include signed zero, normals and the smallest subnormal', () => {
  assert.deepEqual(cubeFloatDyadic(-0), { n: 0n, exponent: 0 });
  assert.deepEqual(cubeFloatDyadic(3), { n: 3n, exponent: 0 });
  assert.deepEqual(cubeFloatDyadic(-0.125), { n: -1n, exponent: -3 });
  assert.deepEqual(cubeFloatDyadic(Number.MIN_VALUE), { n: 1n, exponent: -1074 });
  assert.deepEqual(cubeFloatDyadic(Number.MAX_VALUE), { n: (1n << 53n) - 1n, exponent: 971 });
  for (const n of [NaN, Infinity, -Infinity]) assert.throws(() => cubeFloatDyadic(n), RangeError);
  assert.deepEqual(cubeDyadicGrid(createCubeExactBudget(), [3, 4, 0.25, 0]), { integers: [12n, 16n, 1n, 0n], exponent: -2 });
});
test('rational predicates reduce signs and compare without tolerances', () => {
  const b = createCubeExactBudget();
  assert.deepEqual(cubeFraction(b, 6n, -8n), { n: -3n, d: 4n });
  assert.deepEqual(cubeFraction(b, 0n, 1000n), { n: 0n, d: 1n });
  assert.deepEqual(cubeFractionSubtract(b, { n: 1n, d: 3n }, { n: 1n, d: 4n }), { n: 1n, d: 12n });
  assert.equal(cubeFractionCompare(b, { n: 1n, d: 3n }, { n: 2n, d: 6n }), 0);
  assert.equal(cubeFractionCompare(b, { n: (1n << 1200n) + 1n, d: 1n << 1200n }, { n: 1n, d: 1n }), 1);
  assert.throws(() => cubeFraction(b, 1n, 0n), CubeRouteCertificationError);
});
for (const [n, d, exponent, lower, upper] of [
  [0n, 1n, 0, 0, 0], [25n, 4n, 0, 2.5, 2.5], [2n, 1n, 0, 1.414213562373095, 1.4142135623730951],
  [1n, 9n, 0, 0.3333333333333333, 0.33333333333333337],
  [1n, 1n, -2148, Number.MIN_VALUE, Number.MIN_VALUE], [2n, 1n, -2148, Number.MIN_VALUE, 2 * Number.MIN_VALUE],
  [1n, 1n, -2200, 0, Number.MIN_VALUE], [1n, 1n, 1000, 2 ** 500, 2 ** 500],
] as const) test(`certified root ${n}/${d} * 2^${exponent} has independently specified Float64 neighbors`, () => {
  const b = createCubeExactBudget(), interval = cubeRootInterval(b, n, d, exponent);
  assert.deepEqual(interval, { lower, upper, units: 'meters' });
  assert.ok(b.snapshot().rootComparisons <= 64); assert.ok(Object.isFrozen(interval));
});
test('unachievable precision, arithmetic work and finite-range limits fail explicitly', () => {
  assert.throws(() => cubeRootInterval(createCubeExactBudget(), 2n, 1n, 0, 1e-20), (e: unknown) => e instanceof CubeRouteCertificationError && e.code === 'precision');
  assert.throws(() => cubeRootInterval(createCubeExactBudget(), 1n, 1n, 2048), (e: unknown) => e instanceof CubeRouteCertificationError && e.code === 'range');
  assert.throws(() => cubeRootInterval(createCubeExactBudget(1), 2n, 1n, 0), (e: unknown) => e instanceof CubeRouteCertificationError && e.code === 'work');
  assert.throws(() => cubeFraction(createCubeExactBudget(), 1n << 17000n), (e: unknown) => e instanceof CubeRouteCertificationError && e.code === 'work');
  for (const n of [0, -1, 1.5, 200001, NaN, Infinity]) assert.throws(() => createCubeExactBudget(n), RangeError);
  for (const width of [0, -1, NaN, Infinity]) assert.throws(() => cubeRootInterval(createCubeExactBudget(), 2n, 1n, 0, width), RangeError);
});
