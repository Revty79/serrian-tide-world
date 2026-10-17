import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBlankTerrain } from '../terrain/model.ts';
import { gridToWorld, worldToGrid } from '../terrain/sampling.ts';
import { decodeHeightmap, encodeHeightmap, type SavedHeightmap } from '../persistence/terrain-format.ts';
import { FIT_CAMERA, cameraRect, zoomAt, panBy } from '../rendering/camera.ts';
import { describeLegacyPlanarTerrain } from './legacy-planar.ts';
import { createRectangularSurface } from './rectangular.ts';

const address = { worldId: 'host-supplied-world', surfaceId: 'host-supplied-surface', patchId: 'legacy-grid' };
function a3Fixture() {
  const fixture = JSON.parse(readFileSync(new URL('../../tests/fixtures/saves/a3-v1-heightmap.json', import.meta.url), 'utf8')) as {
    sourceCommit: string; record: Omit<SavedHeightmap, 'elevations'> & { elevationsBase64: string };
  };
  const { elevationsBase64, ...header } = fixture.record;
  const bytes = Uint8Array.from(Buffer.from(elevationsBase64, 'base64'));
  return { ...header, elevations: bytes.buffer };
}

test('explicit legacy binding matches existing planar grid coordinates at every sample and preserves identities', () => {
  const terrain = createBlankTerrain({ id: 'legacy-terrain', columns: 71, rows: 29, width: 2.5, height: 1.3 });
  const metadata = terrain.metadata, elevations = terrain.elevations;
  const bound = describeLegacyPlanarTerrain(terrain, address);
  assert.equal(bound.terrain, terrain); assert.equal(terrain.metadata, metadata); assert.equal(terrain.elevations, elevations);
  assert.equal(bound.world.id, address.worldId); assert.equal(bound.world.surfaces[0]!.terrainId, 'legacy-terrain');
  assert.notEqual(bound.world.id, bound.world.surfaces[0]!.identity.surfaceId);
  for (let row = 0; row < 29; row++) for (let column = 0; column < 71; column++) {
    const legacy = gridToWorld(terrain, { column, row }), modern = bound.lattice.positionAt({ column, row });
    assert.ok(Math.abs(legacy.x - modern.u) < 1e-15 && Math.abs(legacy.y - modern.v) < 1e-15);
    assert.deepEqual(worldToGrid(terrain, { x: modern.u, y: modern.v }), { column, row });
  }
  assert.equal(bound.math.topology.normalize({ ...address, u: -1, v: 0 }), null);
});

test('topology, metric and camera transforms never mutate terrain samples, metadata or source positions', () => {
  const terrain = createBlankTerrain({ id: 'unchanged' });
  terrain.elevations[3] = -0; terrain.elevations[99] = 1234.5;
  const before = new Uint32Array(terrain.elevations.buffer).slice(), metadata = terrain.metadata, buffer = terrain.elevations;
  const modern = describeLegacyPlanarTerrain(terrain, address);
  const periodic = createRectangularSurface({ address, width: 1, height: 1, units: 'map-units', periodicU: true });
  const position = Object.freeze({ ...address, u: 4.5, v: .5 }), stage = { width: 1440, height: 900 };
  periodic.topology.normalize(position); periodic.topology.advance(position, { du: 20, dv: .2 });
  periodic.metric.distance(position, { ...address, u: .7, v: .3 });
  modern.lattice.neighbor({ column: 511, row: 2 }, { column: 1, row: 0 });
  const zoomed = zoomAt(FIT_CAMERA, 4, { x: 900, y: 500 }, terrain.metadata.dimensions, stage);
  cameraRect(panBy(zoomed, { x: -150, y: 100 }, terrain.metadata.dimensions, stage), terrain.metadata.dimensions, stage);
  assert.equal(position.u, 4.5); assert.equal(terrain.metadata, metadata); assert.equal(terrain.elevations, buffer);
  assert.deepEqual(new Uint32Array(terrain.elevations.buffer), before);
});

test('frozen A3 v1 save decodes, binds and re-encodes with the same metadata, checksum and every elevation byte', async () => {
  const saved = a3Fixture(), loaded = await decodeHeightmap(saved);
  assert.equal(loaded.terrain.elevations.length, 64 * 32); assert.equal(loaded.terrain.metadata.seaLevel, 12.5);
  assert.ok(Object.is(loaded.terrain.elevations[0], -0)); assert.equal(loaded.terrain.elevations[3], 1234.5);
  const bound = describeLegacyPlanarTerrain(loaded.terrain, address);
  assert.equal(bound.math.chart.periodicU, false); assert.equal(bound.math.chart.periodicV, false);
  const encoded = await encodeHeightmap(bound.terrain, loaded.name, saved.savedAt);
  assert.equal(encoded.formatVersion, 1); assert.deepEqual(encoded.metadata, saved.metadata);
  assert.equal(encoded.checksum, saved.checksum);
  assert.deepEqual(new Uint8Array(encoded.elevations), new Uint8Array(saved.elevations));
  assert.equal('worldId' in encoded.metadata, false); assert.equal('surfaceId' in encoded.metadata, false);
});

test('separate surface bindings keep independent terrain buffers and reject cross-surface positions', () => {
  const first = createBlankTerrain({ id: 'first' }), second = createBlankTerrain({ id: 'second' });
  const a = describeLegacyPlanarTerrain(first, { ...address, surfaceId: 'a' });
  const b = describeLegacyPlanarTerrain(second, { ...address, surfaceId: 'b' });
  first.elevations[1] = 200;
  assert.equal(second.elevations[1], -100); assert.notEqual(a.terrain.elevations.buffer, b.terrain.elevations.buffer);
  assert.throws(() => a.math.topology.normalize(b.lattice.positionAt({ column: 0, row: 0 })), /another/);
});
