import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createCylindricalTerrain } from './cylindrical.ts';
import { prepareCylindricalDab, cylinderFalloffEnclosure, type CylindricalBrushSettings } from './cylindrical-brush.ts';
import type { CylinderRegion } from '../surfaces/cylinder.ts';

interface Sample { index: number; distance: string; falloff: string; before: string; expected: Record<string, { real: string; float32Word: number }> }
interface Case { name: string; center: { region: string; angle: string; coordinate: string }; radius: string; sensitiveIndex: number | null; samples: Sample[] }
const fixture = JSON.parse(readFileSync(new URL('./fixtures/cylinder-dab-reference.json', import.meta.url), 'utf8')) as { sampleCount: number; cases: Case[] };
const identity = { worldId: 'reference-world', surfaceId: 'exterior' };
const make = () => createCylindricalTerrain({ terrainId: 'fixture', geometry: { identity, provider: 'physical-closed-cylinder', version: 1, configuration: 'solid-capped', role: 'exterior', radiusMeters: 1, lengthMeters: 1.6 }, resolution: { angularSamples: 5, axialCells: 3, radialCells: 2 } });
for (const c of fixture.cases) for (const tool of ['raise', 'lower', 'smooth', 'flatten'] as const) test(`independent Decimal cylinder dab ${tool}: ${c.name}`, () => {
  const t = make(); assert.equal(t.sampleCount, fixture.sampleCount);
  for (const s of c.samples) t.write(t.keyAt(s.index), Number(s.before));
  const source = t.snapshot(), patchId: CylinderRegion = c.center.region === 'side' ? 'side' : c.center.region === 'start' ? 'cap-start' : 'cap-end';
  const settings: CylindricalBrushSettings = { version: 1, tool, radiusMeters: Number(c.radius), maxFalloffError: 1e-8,
    ...(tool === 'raise' || tool === 'lower' ? { strengthMeters: 160 } : tool === 'smooth' ? { intensity: .65 } : { intensity: .65, targetElevation: -250 }) } as CylindricalBrushSettings;
  const job = prepareCylindricalDab(t, { ...identity, patchId, u: (patchId === 'cap-end' ? -1 : 1) * Number(c.center.angle), v: Number(c.center.coordinate) }, settings);
  let pumps = 0;
  while (job.status === 'preparing') { assert.ok(++pumps < 100); job.pump(3); assert.deepEqual(t.copyElevations(), source.elevations); assert.equal(t.revision, source.revision); }
  const changed = job.commit(), result = t.copyElevations();
  assert.equal(t.revision - source.revision, changed);
  assert.equal(job.statistics.writes, changed); assert.equal(job.statistics.changesPrepared, changed);
  assert.ok(job.statistics.maxFalloffError <= 1e-8);
  let actualChanged = 0;
  for (const s of c.samples) {
    const value = result[s.index]!, ideal = Number(s.expected[tool]!.real);
    const rounding = Math.max(Math.abs(value), Math.abs(ideal)) * 2 ** -23 + 2 ** -149;
    assert.ok(Math.abs(value - ideal) <= job.statistics.maxPreRoundElevationErrorMeters + rounding, `${s.index}: ${value} vs ${ideal}`);
    if (Number(s.falloff) === 0) assert.ok(Object.is(value, source.elevations[s.index]));
    if (!Object.is(value, source.elevations[s.index])) actualChanged++;
  }
  assert.equal(actualChanged, changed);
  // An already-tight feasible upper endpoint can certify the inside case on
  // its first query. The outside fixture requires tightening the lower bound.
  if (c.name === 'boundary-outside') assert.ok(job.statistics.refinements > 0);
});

test('independent Decimal boundary tails are enclosed without a large absolute rounding floor', () => {
  for (const c of fixture.cases.filter((c) => c.sensitiveIndex !== null)) {
    const s = c.samples[c.sensitiveIndex!]!, distance = Number(s.distance), radius = Number(c.radius), ideal = Number(s.falloff);
    const interval = cylinderFalloffEnclosure(distance - 5e-13, distance + 5e-13, radius);
    assert.ok(interval.lower <= ideal && ideal <= interval.upper);
    assert.ok(Math.abs(interval.value - ideal) <= interval.error);
    if (ideal > 0) assert.ok(interval.upper < 1e-15);
    else assert.equal(interval.value, 0);
  }
});
