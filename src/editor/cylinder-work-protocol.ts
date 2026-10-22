import type { CylindricalTerrain } from '../terrain/cylindrical.ts';
import type { CylindricalBrushSettings } from '../terrain/cylindrical-brush.ts';
import type { CylinderStrokeOptions } from '../terrain/cylindrical-stroke.ts';
import type { SurfacePosition } from '../surfaces/contracts.ts';
import type { CylinderView } from '../rendering/cylindrical-view.ts';
import type {ConnectedPreparedPatch,ConnectedWorkOutput} from './connected-work-protocol.ts';
import type {ConnectedStrokeStatistics} from '../terrain/connected-stroke.ts';

export type CylinderWorkStats = ConnectedStrokeStatistics;
export type CylinderWorkInput =
  | { type: 'start'; task: number; metadata: CylindricalTerrain['metadata']; revision: number; values: Float32Array; center: SurfacePosition; settings: CylindricalBrushSettings; options: Omit<CylinderStrokeOptions, 'commitReady'>; preview?: CylinderView; measure?: boolean }
  | { type: 'move'; task: number; point: SurfacePosition; ordinal: number }
  | { type: 'release'; task: number }
  | { type: 'ack'; task: number; sequence: number; revision: number };
export type CylinderPrepared = ConnectedPreparedPatch;
export type CylinderWorkOutput = ConnectedWorkOutput;
