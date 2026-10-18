import test from 'node:test';
import assert from 'node:assert/strict';
import { createSphericalTerrain } from '../terrain/spherical.ts';
import { CUBE_FACES, FACE_BASES, FACE_CONNECTIONS, QUARTER_PI, unitDirection, type Vec3 } from '../surfaces/cube-sphere.ts';
import { INITIAL_SPHERICAL_VIEW, inspectSphere, netEdgeIsJoined, netFaceRect, projectSphere, recenterSphere, rotateSphere, sphericalLayout, unprojectSphere, zoomSphere, type SphericalView } from './spherical-view.ts';
import { buildSphericalFaceTexture, makeSphericalDisplayCache, renderSphericalGlobe, type FaceTexture } from './spherical-raster.ts';
import { fillSphericalPreviewRange } from '../terrain/spherical-preview-fixture.ts';

const identity = { worldId: 'view-test', surfaceId: 'sphere' }, size = { width: 1400, height: 1000 };
const make = () => createSphericalTerrain({ terrainId: 'view', identity, radiusMeters: 123456, cellsPerEdge: 8 });
const distance = (a: Vec3, b: Vec3) => Math.hypot(...a.map((v, i) => v - b[i]!));
const net: SphericalView = { ...INITIAL_SPHERICAL_VIEW, mode: 'net' };
function specialPoints() {
  const points: Vec3[] = CUBE_FACES.map((f) => FACE_BASES[f].normal);
  const pairs = new Set<string>();
  for (const edge of FACE_CONNECTIONS) {
    const id = [edge.face, edge.toFace].sort().join('/'); if (pairs.has(id)) continue; pairs.add(id);
    const a = FACE_BASES[edge.face].normal, b = FACE_BASES[edge.toFace].normal;
    for (const t of [-.7, 0, .7]) {
      const p = { ...identity, patchId: edge.face, u: edge.edge.startsWith('u') ? (edge.edge.endsWith('min') ? -1 : 1) * QUARTER_PI : t, v: edge.edge.startsWith('v') ? (edge.edge.endsWith('min') ? -1 : 1) * QUARTER_PI : t };
      points.push(make().geometry.direction(p));
    }
    points.push(unitDirection([a[0] + b[0], a[1] + b[1], a[2] + b[2]]));
  }
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) points.push(unitDirection([x, y, z]));
  points.push(unitDirection([1, 2, 3]), unitDirection([1e-10, -1e-10, 1]), unitDirection([1e-10, 0, -1]));
  return points;
}
test('orthographic and net inverses agree at every face, all twelve edges/eight corners and arbitrary/near poles', () => {
  const terrain = make(), before = new Uint32Array(terrain.copyElevations().buffer), metadata = terrain.metadata;
  for (const d of specialPoints()) for (const view of [recenterSphere(INITIAL_SPHERICAL_VIEW, d), net]) {
    const projected = projectSphere(terrain, d, view, size); assert.ok(projected.length > 0);
    for (const p of projected) {
      const inverse = unprojectSphere(terrain, p, view, size); assert.ok(inverse); assert.ok(distance(inverse, d) < 2e-12);
      assert.equal(inspectSphere(terrain, inverse).key.index, inspectSphere(terrain, d).key.index);
    }
  }
  assert.deepEqual(new Uint32Array(terrain.copyElevations().buffer), before); assert.equal(terrain.metadata, metadata);
});
test('seeded round trips after arbitrary rotations and zooms retain precision and correct far-side occlusion', () => {
  const terrain = make(); let state = 123;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
  let view = INITIAL_SPHERICAL_VIEW;
  for (let i = 0; i < 500; i++) {
    view = rotateSphere(view, random() - .5, random() - .5);
    const d = unitDirection([random() - .5, random() - .5, random() - .5]);
    for (const p of projectSphere(terrain, d, view, size)) assert.ok(distance(unprojectSphere(terrain, p, view, size)!, d) < 1e-10);
    const antipode = view.frame.forward.map((v) => -v) as unknown as Vec3;
    assert.deepEqual(projectSphere(terrain, antipode, view, size), []);
    assert.ok(distance(unprojectSphere(terrain, { x: size.width / 2, y: size.height / 2 }, view, size)!, view.frame.forward) < 1e-14);
  }
  assert.equal(zoomSphere(view, 1e10).zoom, 4); assert.equal(zoomSphere(view, .001).zoom, 1);
  for (const p of [{ x: 0, y: 0 }, { x: -1, y: 300 }, { x: NaN, y: 3 }]) assert.equal(unprojectSphere(terrain, p, view, size), null);
});
test('six-face net has exactly five correctly oriented joined folds, seven paired visual cuts and invalid gaps', () => {
  const terrain = make(), pairs = new Set<string>(); let joins = 0, cuts = 0;
  for (const connection of FACE_CONNECTIONS) {
    const id = [connection.face, connection.toFace].sort().join('/'); if (pairs.has(id)) continue; pairs.add(id);
    const places: number[] = [];
    for (const t of [-QUARTER_PI, -.27, 0, .31, QUARTER_PI]) {
      const p = { ...identity, patchId: connection.face, u: connection.edge.startsWith('u') ? (connection.edge.endsWith('min') ? -1 : 1) * QUARTER_PI : t, v: connection.edge.startsWith('v') ? (connection.edge.endsWith('min') ? -1 : 1) * QUARTER_PI : t };
      const occurrences = projectSphere(terrain, terrain.geometry.direction(p), net, size);
      const a = occurrences.find((v) => v.face === connection.face)!, b = occurrences.find((v) => v.face === connection.toFace)!;
      places.push(Math.hypot(a.x - b.x, a.y - b.y));
    }
    if (places.every((n) => n < 1e-9)) joins++; else { cuts++; assert.ok(places.slice(1, -1).every((n) => n > 1)); }
  }
  assert.equal(joins, 5); assert.equal(cuts, 7);
  assert.equal(FACE_CONNECTIONS.filter((c) => netEdgeIsJoined(terrain, c.face, c.edge)).length, 10);
  const rect = netFaceRect('ny', net, size);
  assert.equal(unprojectSphere(terrain, { x: rect.x + rect.side / 2, y: rect.y - rect.side / 2 }, net, size), null);
  assert.equal(terrain.sampleCount, 6 * 8 * 8 + 2);
});

test('orthographic limb tolerance is explicit and invalid view states fail without changing geography', () => {
  const terrain = make(); let view = INITIAL_SPHERICAL_VIEW;
  for (let i = 0; i < 100; i++) {
    view = rotateSphere(view, .173, -.219);
    for (const d of [view.frame.right, view.frame.up]) for (const p of projectSphere(terrain, d, view, size)) assert.ok(distance(unprojectSphere(terrain, p, view, size)!, d) < 1e-7);
  }
  for (const view of [{ ...INITIAL_SPHERICAL_VIEW, zoom: NaN }, { ...INITIAL_SPHERICAL_VIEW, pan: { x: Infinity, y: 0 } }, { ...INITIAL_SPHERICAL_VIEW, frame: { ...INITIAL_SPHERICAL_VIEW.frame, right: [1, 0, 0] as Vec3 } }]) assert.throws(() => sphericalLayout(view, size));
  assert.throws(() => rotateSphere(view, NaN, 0)); assert.throws(() => zoomSphere(view, 0));
  assert.equal(terrain.revision, 0);
});
test('derived textures agree at every joined/cut boundary and corner; rendering and projection never change authority', () => {
  const terrain = make(); fillSphericalPreviewRange(terrain, 0, terrain.sampleCount);
  const snapshot = terrain.copyElevations(), before = new Uint32Array(snapshot.buffer).slice(), revision = terrain.revision;
  const faces = Object.fromEntries(CUBE_FACES.map((face) => [face, buildSphericalFaceTexture(terrain, snapshot, face)])) as Record<typeof CUBE_FACES[number], FaceTexture>;
  const cache = makeSphericalDisplayCache(faces, revision);
  for (const d of specialPoints()) {
    let color: number[] | undefined;
    for (const p of terrain.geometry.positionsForDirection(d)) {
      // Test exact shared samples only; arbitrary chart locations interpolate separately.
      const x = (p.u / QUARTER_PI + 1) * 8, y = (p.v / QUARTER_PI + 1) * 8;
      if (Math.abs(x - Math.round(x)) > 1e-9 || Math.abs(y - Math.round(y)) > 1e-9) continue;
      const tex = faces[p.patchId], offset = (Math.round(y) * tex.side + Math.round(x)) * 4, next = Array.from(tex.pixels.slice(offset, offset + 4));
      if (color) assert.deepEqual(next, color); color = next;
    }
  }
  for (const face of CUBE_FACES) {
    const view = recenterSphere(INITIAL_SPHERICAL_VIEW, FACE_BASES[face].normal), raster = renderSphericalGlobe(cache, view, { width: 300, height: 240 }, 40_000);
    assert.ok(raster.pixels.some((v) => v > 0)); assert.ok(raster.columns * raster.rows <= 40000);
    assert.equal(renderSphericalGlobe(cache, view, { width: 300, height: 240 }, 40_000, raster.pixels).pixels, raster.pixels);
  }
  assert.deepEqual(new Uint32Array(terrain.copyElevations().buffer), before); assert.equal(terrain.revision, revision);
  assert.ok(cache.byteLength <= 6 * 513 * 513 * 4);
});
