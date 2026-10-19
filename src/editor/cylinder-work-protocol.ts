import type { CylindricalTerrain } from '../terrain/cylindrical.ts';
import type { CylindricalBrushSettings, prepareCylindricalDab } from '../terrain/cylindrical-brush.ts';
import type { CylinderStrokeOptions, beginCylindricalStroke } from '../terrain/cylindrical-stroke.ts';
import type { SurfacePosition } from '../surfaces/contracts.ts';
import type { CylinderView } from '../rendering/cylindrical-view.ts';
import type { paintingMetrics } from './painting-metrics.ts';

export type CylinderWorkStats = ReturnType<typeof beginCylindricalStroke>['statistics'];
export type CylinderWorkInput =
  | { type: 'start'; task: number; metadata: CylindricalTerrain['metadata']; revision: number; values: Float32Array; center: SurfacePosition; settings: CylindricalBrushSettings; options: Omit<CylinderStrokeOptions, 'commitReady'>; preview?: CylinderView; measure?: boolean }
  | { type: 'move'; task: number; point: SurfacePosition; ordinal: number }
  | { type: 'release'; task: number }
  | { type: 'ack'; task: number; sequence: number; revision: number };
export type CylinderPrepared = { type: 'prepared'; task: number; sequence: number; sourceRevision: number; center: SurfacePosition; settings: CylindricalBrushSettings; indices: Uint32Array; before: Float32Array; after: Float32Array; affectedSamples: number; stats?: CylinderWorkStats; dabStatistics?: ReturnType<typeof prepareCylindricalDab>['statistics']; previewStages?: ReturnType<typeof paintingMetrics> };
export type CylinderWorkOutput = CylinderPrepared
  | { type: 'progress'; task: number; stats: CylinderWorkStats }
  | { type: 'done'; task: number; stats?: CylinderWorkStats; stages: ReturnType<typeof paintingMetrics> }
  | { type: 'error'; task: number; message: string; stats?: CylinderWorkStats; stages: ReturnType<typeof paintingMetrics> };
