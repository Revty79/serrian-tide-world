import test from 'node:test';
import assert from 'node:assert/strict';
import { CUBE_FACES, type CubeFace, type Vec3 } from '../surfaces/cube-sphere.ts';
import { renderSphericalGlobe, sphericalRasterCacheBytes, type SphericalDisplayCache } from './spherical-raster.ts';
import { renderSphericalGlobe as reference } from '../../tests/fixtures/spherical-raster-reference.ts';
import { INITIAL_SPHERICAL_VIEW, recenterSphere, rotateSphere } from './spherical-view.ts';

function texture(seed: number, side = 33): SphericalDisplayCache {
  let s = seed;
  return { sourceRevision: seed, byteLength: 6 * side * side * 4, faces: Object.fromEntries(CUBE_FACES.map((face) => [face, { side, pixels: Uint8ClampedArray.from({ length: side * side * 4 }, () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s >>> 24; }) }])) as Record<CubeFace, SphericalDisplayCache['faces']['px']> };
}
test('cached rays and signed face permutations reproduce every original RGBA byte across orientations, zooms, cropped limbs and changed textures', () => {
  const caches = [texture(17), texture(891, 65)], orientations: Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [1, 1, 1], [-1, 1, -1]];
  let reusable: Uint8ClampedArray | undefined, frames = 0;
  for (const size of [{ width: 1440, height: 900 }, { width: 3440, height: 1440 }, { width: 900, height: 900 }, { width: 412, height: 839 }]) for (const zoom of [1, 1.25, 3, 4]) for (const direction of orientations) {
    const view = rotateSphere(recenterSphere({ ...INITIAL_SPHERICAL_VIEW, zoom }, direction), .017, -.023);
    for (const cache of caches) {
      const expected = reference(cache, view, size, 12000), actual = renderSphericalGlobe(cache, view, size, 12000, reusable); reusable = actual.pixels;
      assert.deepEqual(actual, expected); assert.ok(sphericalRasterCacheBytes() <= 8 * 1024 * 1024); frames++;
    }
  }
  assert.equal(frames, 256);
});
test('unchanged-view terrain refinement, camera rotation and edit/settled quality changes never reuse world-dependent pixels', () => {
  const cache = texture(23), size = { width: 1440, height: 900 };
  for (let i = 0; i < 12; i++) {
    cache.faces.py.pixels.fill(i * 21); cache.sourceRevision++;
    const view = rotateSphere(INITIAL_SPHERICAL_VIEW, i * .15, i * .017), budget = i % 2 ? 35000 : 220000;
    assert.deepEqual(renderSphericalGlobe(cache, view, size, budget), reference(cache, view, size, budget));
    assert.ok(sphericalRasterCacheBytes() <= 8 * 1024 * 1024);
  }
});
test('oversized public raster requests use the uncached exact path and cannot grow the cache beyond its absolute budget', () => {
  const cache = texture(139), size = { width: 1800, height: 1800 }, before = sphericalRasterCacheBytes();
  assert.deepEqual(renderSphericalGlobe(cache, INITIAL_SPHERICAL_VIEW, size, 2000000), reference(cache, INITIAL_SPHERICAL_VIEW, size, 2000000));
  assert.equal(sphericalRasterCacheBytes(), before);
});
