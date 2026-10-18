import test from 'node:test';
import assert from 'node:assert/strict';
import { createWrappedTerrain, wrappedMath } from './topology.ts';
import { worldToGrid, gridToWorld, inspectElevation } from './sampling.ts';
import { startBrushStroke, type BrushSettings } from './brush.ts';
import { TerrainHistory } from '../editor/terrain-history.ts';
import { resetTerrainToOcean } from './modifications.ts';

const create = (columns = 64, rows = 65) => createWrappedTerrain({ id: 'wrapped', identity: { worldId: 'world', surfaceId: 'sheet', patchId: 'chart' }, columns, rows });
const words = (data: Float32Array) => new Uint32Array(data.buffer).slice();

test('wrapped authority is blank, unique per period, identity-bearing and vertically bounded', () => {
  const terrain = create(), math = wrappedMath(terrain);
  assert.equal(terrain.metadata.dataVersion, 2); assert.equal(terrain.elevations.length, 64 * 65);
  assert.ok(terrain.elevations.every((v) => v === -100));
  for (const x of [-2, -1, -0, 0, 1, 2]) assert.deepEqual(worldToGrid(terrain, { x, y: .5 }), { column: 0, row: 32 });
  assert.deepEqual(gridToWorld(terrain, { column: 63, row: 64 }), { x: 63 / 64, y: 1 });
  assert.equal(math.lattice.neighbor({ column: 63, row: 32 }, { column: 1, row: 0 })!.index.column, 0);
  assert.equal(math.lattice.neighbor({ column: 0, row: 0 }, { column: 0, row: -1 }), null);
  assert.throws(() => worldToGrid(terrain, { x: 0, y: 1.001 }));
  terrain.elevations[32 * 64] = 421.25;
  assert.equal(inspectElevation(terrain, { x: -3, y: .5 }).elevation, 421.25);
  assert.equal(inspectElevation(terrain, { x: 3.125, y: .5 }).position.x, .125);
});

for (const tool of ['raise', 'lower', 'smooth', 'flatten'] as const) {
  test(`${tool} is seam-translation invariant and restores exact stroke/reset bits through history`, () => {
    const a = create(), b = create(), shift = 16;
    for (let row = 0; row < 65; row++) for (let column = 0; column < 64; column++) {
      const value = Math.fround(Math.sin(column * .3) * 500 + row / 3);
      a.elevations[row * 64 + column] = value;
      b.elevations[row * 64 + (column + shift) % 64] = value;
    }
    const before = words(a.elevations), meta = a.metadata, buffer = a.elevations, history = new TerrainHistory(a);
    const settings: BrushSettings = tool === 'raise' || tool === 'lower' ? { tool, radius: .12, strength: 300 }
      : tool === 'smooth' ? { tool, radius: .12, intensity: .7 } : { tool, radius: .12, intensity: .7, targetElevation: 250 };
    history.begin();
    const first = startBrushStroke(a, { x: .94, y: .5 }, settings), second = startBrushStroke(b, { x: .94 + shift / 64, y: .5 }, settings);
    first.moveTo({ x: 1.06, y: .5 }); second.moveTo({ x: 1.06 + shift / 64, y: .5 }); first.end(); second.end(); history.commit();
    const edited = words(a.elevations); assert.notDeepEqual(edited, before);
    for (let row = 0; row < 65; row++) for (let column = 0; column < 64; column++) assert.ok(Math.abs(a.elevations[row * 64 + column]! - b.elevations[row * 64 + (column + shift) % 64]!) < .001);
    history.undo(); assert.deepEqual(words(a.elevations), before); history.redo(); assert.deepEqual(words(a.elevations), edited);
    history.begin(); resetTerrainToOcean(a); history.commit(); assert.ok(a.elevations.every((v) => v === -100));
    history.undo(); assert.deepEqual(words(a.elevations), edited); assert.equal(a.metadata, meta); assert.equal(a.elevations, buffer);
  });
}

test('one seam dab reaches both sides and never applies twice, even with a radius exceeding half the period', () => {
  const terrain = create(), { surface } = wrappedMath(terrain), radius = .8;
  startBrushStroke(terrain, { x: 1, y: .5 }, { tool: 'raise', radius, strength: 100 }).end();
  for (let row = 0; row < 65; row++) for (let column = 0; column < 64; column++) {
    const distance = surface.metric.distance({ ...terrain.metadata.identity, u: 0, v: .5 }, { ...terrain.metadata.identity, u: column / 64, v: row / 64 }).value / radius;
    const falloff = distance >= 1 ? 0 : (1 - distance) ** 2 * (1 + 2 * distance);
    assert.equal(terrain.elevations[row * 64 + column], Math.fround(-100 + 100 * falloff));
  }
  assert.equal(terrain.elevations[32 * 64], 0);
  assert.equal(terrain.elevations[32 * 64 + 1], terrain.elevations[32 * 64 + 63]);
});

test('Smooth reads the actual wrapped pre-dab neighbors, including unique neighbors on a two-column grid', () => {
  const terrain = create(); terrain.elevations.fill(0); terrain.elevations[32 * 64 + 63] = 900;
  startBrushStroke(terrain, { x: 0, y: .5 }, { tool: 'smooth', radius: .1, intensity: 1 }).end();
  assert.equal(terrain.elevations[32 * 64], 100);
  const tiny = create(2, 3); tiny.elevations.set([0, 60, 0, 60, 0, 60]);
  startBrushStroke(tiny, { x: 0, y: .5 }, { tool: 'smooth', radius: 1, intensity: 1 }).end();
  assert.equal(tiny.elevations[2], 30);
});

test('seam-crossing paths are event-frequency independent in either direction for all four tools', () => {
  for (const tool of ['raise', 'lower', 'smooth', 'flatten'] as const) {
    const outputs: Float32Array[] = [];
    for (const count of [1, 80]) {
      const terrain = create(); terrain.elevations.forEach((_, i, data) => { data[i] = i % 2 ? 500 : -100; });
      const settings: BrushSettings = tool === 'raise' || tool === 'lower' ? { tool, radius: .1, strength: 200 }
        : tool === 'smooth' ? { tool, radius: .1, intensity: .5 } : { tool, radius: .1, intensity: .5, targetElevation: 600 };
      const stroke = startBrushStroke(terrain, { x: .1, y: .5 }, settings);
      for (let i = 1; i <= count; i++) stroke.moveTo({ x: .1 - .2 * i / count, y: .5 });
      stroke.end(); outputs.push(terrain.elevations);
    }
    outputs[0]!.forEach((v, i) => assert.ok(Math.abs(v - outputs[1]![i]!) < .001));
  }
});
