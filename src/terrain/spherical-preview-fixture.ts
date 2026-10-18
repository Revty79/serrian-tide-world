import { unitArcAngle } from '../surfaces/great-circle.ts';
import { unitDirection, type Vec3 } from '../surfaces/cube-sphere.ts';
import type { SphericalTerrain } from './spherical.ts';

const features = [
  { direction: unitDirection([1, 1, .2]), radius: 1, height: 5200 },
  { direction: unitDirection([-1, -1, -1]), radius: 1, height: 4800 },
  { direction: unitDirection([0, -1, 1]), radius: .85, height: 4300 },
  { direction: unitDirection([1, .1, -1]), radius: .8, height: 3700 },
] as const;
/** Explicit synthetic inspection fixture, not a procedural world generator or Earth geography. */
export function previewFixtureElevation(direction: Vec3): number {
  let elevation = -900;
  for (const feature of features) elevation += feature.height * Math.max(0, 1 - unitArcAngle(direction, feature.direction) / feature.radius) ** 2;
  return Math.fround(elevation);
}
/** Host schedules bounded batches; each physical vertex is initialized once through canonical ownership. */
export function fillSphericalPreviewRange(terrain: SphericalTerrain, first: number, last: number) {
  for (let i = first; i < Math.min(last, terrain.sampleCount); i++) {
    const key = terrain.keyAt(i); terrain.write(key, previewFixtureElevation(terrain.directionAt(key)));
  }
}
