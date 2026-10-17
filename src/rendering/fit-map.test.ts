import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitMap } from './fit-map.ts';

test('a square map fits wide and tall viewports without distortion', () => {
  assert.deepEqual(fitMap({ width: 1, height: 1 }, { width: 1200, height: 500 }), { left: 350, top: 0, width: 500, height: 500 });
  assert.deepEqual(fitMap({ width: 1, height: 1 }, { width: 400, height: 1000 }), { left: 0, top: 300, width: 400, height: 400 });
});

test('non-square logical maps preserve their own aspect, independent of sample resolution', () => {
  assert.deepEqual(fitMap({ width: 2, height: 1 }, { width: 400, height: 800 }), { left: 0, top: 300, width: 400, height: 200 });
  assert.deepEqual(fitMap({ width: 2, height: 1 }, { width: 1200, height: 600 }), { left: 0, top: 0, width: 1200, height: 600 });
});

test('invalid map or viewport dimensions are rejected', () => {
  for (const invalid of [0, -1, NaN, Infinity]) {
    assert.throws(() => fitMap({ width: invalid, height: 1 }, { width: 400, height: 800 }), RangeError);
    assert.throws(() => fitMap({ width: 1, height: 1 }, { width: 400, height: invalid }), RangeError);
  }
});
