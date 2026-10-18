import test from 'node:test';
import assert from 'node:assert/strict';
import { createCylinderGeometry } from './cylinder.ts';
import { reconstructCylinderPath } from './cylinder-path.ts';
import { cylinderPathSpacings } from './cylinder-path-spacing.ts';
const identity = { worldId: 'spacing', surfaceId: 'outside' }, g = createCylinderGeometry({ identity, provider: 'physical-closed-cylinder', version: 1, configuration: 'solid-capped', role: 'exterior', radiusMeters: 1, lengthMeters: 4 });
const point = (v: number) => ({ ...identity, patchId: 'side', u: 0, v });
const path = reconstructCylinderPath(g, point(.5), point(3), { version: 1 });
test('physical spacing is ordered, includes an exact end once and performs no fresh distance work', () => {
  const sample = cylinderPathSpacings(path, { spacingMeters: .25 }), values = [...sample];
  assert.equal(values.length, 10); assert.deepEqual(values.map(x=>x.distanceMeters), Array.from({length:10},(_,i)=>(i+1)/4)); assert.ok(values.at(-1)!.atEnd);
  const end = sample.next(); assert.ok(end.done); assert.equal(end.value.residualMeters, 0); assert.equal(sample.status, 'complete');
});
test('residual carries through partial ranges, zero moves and successive connected paths', () => {
  const whole = cylinderPathSpacings(path, { spacingMeters: .37, residualMeters: .1 }), expected = [...whole].map(x=>x.distanceMeters);
  const first = cylinderPathSpacings(path, { spacingMeters: .37, residualMeters: .1, toMeters: 1.1 }), a = [...first], result = first.next(); assert.ok(result.done);
  const second = cylinderPathSpacings(path, { spacingMeters: .37, residualMeters: result.value.residualMeters, fromMeters: 1.1 }), actual = [...a,...second].map(x=>x.distanceMeters);
  assert.equal(actual.length, expected.length); for(let i=0;i<actual.length;i++)assert.ok(Math.abs(actual[i]!-expected[i]!)<1e-14);
  const z = cylinderPathSpacings(path, { spacingMeters: .37, residualMeters: .1, fromMeters: .5, toMeters: .5 }); assert.ok(z.next().done); assert.equal(z.return().value.residualMeters,.1);
  const continuation = reconstructCylinderPath(g, point(3), point(3.8), {version:1}), end = whole.next(); assert.ok(end.done);
  const next = cylinderPathSpacings(continuation,{spacingMeters:.37,residualMeters:end.value.residualMeters}); const q=next.next();assert.ok(!q.done); assert.ok(Math.abs(q.value.distanceMeters-(.37-end.value.residualMeters))<1e-14);
});
test('lazy sampling cancellation stops immediately and preserves the last accepted traversal', () => {
  const it = cylinderPathSpacings(path,{spacingMeters:.25,residualMeters:.1}); const first=it.next();assert.ok(!first.done);
  const cancelled=it.return();assert.ok(cancelled.done);assert.equal(cancelled.value.status,'cancelled');assert.equal(cancelled.value.traversedToMeters,.15);assert.ok(Math.abs(cancelled.value.residualMeters)<1e-14);
  assert.deepEqual(it.next(),cancelled);assert.deepEqual(it.return(),cancelled);assert.equal(it.status,'cancelled');
});
test('point, arithmetic and input limits reject unsupported spacing without unlimited iteration', () => {
  for(const options of [{spacingMeters:0},{spacingMeters:NaN},{spacingMeters:1,residualMeters:1},{spacingMeters:1,residualMeters:-1},{spacingMeters:1,fromMeters:2,toMeters:1},{spacingMeters:1,toMeters:3},{spacingMeters:1,maxPoints:65537},{spacingMeters:1e-30}])assert.throws(()=>cylinderPathSpacings(path,options));
  assert.throws(()=>cylinderPathSpacings(path,{spacingMeters:.1,maxPoints:10}),/budget/);
  const partial=cylinderPathSpacings(path,{spacingMeters:.1,toMeters:.5,maxPoints:5});assert.equal([...partial].length,5);
});
