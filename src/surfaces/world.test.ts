import test from 'node:test';
import assert from 'node:assert/strict';
import { defineWorld, type SurfaceDefinition, type WorldShape } from './world.ts';

const surface = (surfaceId: string, role: SurfaceDefinition['role'] = 'exterior'): SurfaceDefinition => ({
  identity: { worldId: 'hollow-world', surfaceId }, role, terrainId: `terrain-${surfaceId}`,
  topology: { id: 'planned-cubed-sphere', version: 1 }, representation: { id: 'planned-shared-sphere-nodes', version: 1 },
});
const shape: WorldShape = { kind: 'hollow-sphere', outerRadiusMeters: 1000, innerRadiusMeters: 800 };

test('hollow world catalogs allow exterior, interior, or both with independent surface and terrain identities', () => {
  const exterior = surface('outside'), interior = surface('inside', 'interior');
  for (const surfaces of [[exterior], [interior], [exterior, interior]]) {
    const world = defineWorld({ id: 'hollow-world', shape, surfaces });
    assert.equal(world.surfaces.length, surfaces.length);
    assert.ok(world.surfaces.every((value) => value.identity.worldId === world.id));
    assert.equal(new Set(world.surfaces.map((value) => value.identity.surfaceId)).size, surfaces.length);
    assert.equal(new Set(world.surfaces.map((value) => value.terrainId)).size, surfaces.length);
    assert.ok(Object.isFrozen(world) && Object.isFrozen(world.shape) && Object.isFrozen(world.surfaces) && Object.isFrozen(world.surfaces[0]!.identity));
  }
});

test('catalog rejects duplicate/foreign identities, shared terrain IDs and invalid hollow references', () => {
  const exterior = surface('outside'), interior = surface('inside', 'interior');
  for (const surfaces of [[], [exterior, exterior], [exterior, { ...interior, terrainId: exterior.terrainId }],
    [exterior, { ...interior, identity: { ...interior.identity, worldId: 'other' } }], [exterior, surface('another-outside')], [surface('sheet', 'sheet')]]) {
    assert.throws(() => defineWorld({ id: 'hollow-world', shape, surfaces }));
  }
  for (const invalidShape of [
    { ...shape, innerRadiusMeters: 1000 }, { ...shape, innerRadiusMeters: 1100 }, { ...shape, outerRadiusMeters: NaN },
    { ...shape, innerRadiusMeters: -1 },
  ]) assert.throws(() => defineWorld({ id: 'hollow-world', shape: invalidShape, surfaces: [exterior] }));
});

test('flat outlines and other shapes have data contracts without implying editor support', () => {
  const shapes: WorldShape[] = [
    { kind: 'flat', outline: { kind: 'rectangle', width: 2, height: 1, units: 'map-units' } },
    { kind: 'flat', outline: { kind: 'circle', radius: 100, units: 'meters' } },
    { kind: 'flat', outline: { kind: 'triangle', vertices: [[0, 0], [2, 0], [0, 3]], units: 'meters' } },
    { kind: 'sphere', radiusMeters: 1000 }, { kind: 'cylinder', radiusMeters: 1000, lengthMeters: 2000 },
    { kind: 'custom', geometry: { id: 'owner-defined-folded-world', version: 2 } },
  ];
  for (const geometry of shapes) {
    const world = defineWorld({ id: 'hollow-world', shape: geometry, surfaces: [surface('only', 'custom')] });
    assert.deepEqual(world.shape, geometry); assert.notEqual(world.shape, geometry);
    assert.notEqual(world.surfaces[0]!.topology, surface('only').topology);
  }
  assert.throws(() => defineWorld({ id: 'hollow-world', surfaces: [surface('only')], shape: { kind: 'flat', outline: { kind: 'triangle', vertices: [[0, 0], [1, 1], [2, 2]], units: 'meters' } } }));
  assert.throws(() => defineWorld({ id: 'hollow-world', surfaces: [surface('only')], shape: { kind: 'custom', geometry: { id: '', version: 0 } } }));
});
