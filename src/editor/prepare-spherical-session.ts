import { CUBE_FACES, type CubeFace } from '../surfaces/cube-sphere.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import { makeSphericalDisplayCache, sphericalFaceTextureSteps, type FaceTexture } from '../rendering/spherical-raster.ts';
import { workStep, type PersistenceWork } from '../persistence/cooperative-work.ts';
import { SphericalSession } from './spherical-session.ts';

export async function prepareSphericalSession(terrain: SphericalTerrain, name: string, saved: boolean, work: PersistenceWork = {}) {
  const start = performance.now(), source = terrain.copyElevations(), faces = {} as Record<CubeFace, FaceTexture>;
  let maxTaskMs = 0;
  for (const [index, face] of CUBE_FACES.entries()) {
    const steps = sphericalFaceTextureSteps(terrain, source, face, true); let result: IteratorResult<void, FaceTexture>;
    do {
      const taskStart = performance.now();
      do { result = steps.next(); } while (!result.done && performance.now() - taskStart < 8);
      maxTaskMs = Math.max(maxTaskMs, performance.now() - taskStart);
      await workStep(work, `Preparing spherical chart ${face}`, index / 6);
    } while (!result.done);
    faces[face] = result.value;
  }
  const cache = makeSphericalDisplayCache(faces, terrain.revision), editor = new SphericalSession(terrain, cache, name, saved);
  return { terrain, cache, editor, preparationMs: performance.now() - start, maxPreparationTaskMs: maxTaskMs };
}
