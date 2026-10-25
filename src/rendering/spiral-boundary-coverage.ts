import type {SpiralTerrain} from '../terrain/spiral.ts';
import {spiralPixelPicker,projectSpiral} from './spiral-view.ts';
import {createPolyhedronBoundaryCoverage} from './polyhedron-boundary-coverage.ts';
export type {BoundaryPixelRect as SpiralPixelRect} from './polyhedron-boundary-coverage.ts';
export const SpiralBoundaryCoverage=createPolyhedronBoundaryCoverage<SpiralTerrain>(projectSpiral,spiralPixelPicker);
export type SpiralBoundaryCoverage=InstanceType<typeof SpiralBoundaryCoverage>;
