import type {OpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import type {OpenCylinderStrokeOptions} from '../terrain/open-cylinder-stroke.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import type {ConnectedHistory} from './connected-history.ts';
import {beginOpenWorkerNumerics} from './open-cylinder-work-runtime.ts';
import {beginConnectedWorkerStroke} from './connected-worker-stroke.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
export const openCylinderWorkerFactory=()=>new Worker(new URL('./open-cylinder-preparation.worker.ts',import.meta.url),{type:'module'});
const adapter={begin:beginOpenWorkerNumerics,preparedPatch:connectedPreparedPatch};
export function beginWorkerOpenCylinderStroke(terrain:OpenCylinderTerrain,history:ConnectedHistory<OpenCylinderTerrain>,first:SurfacePosition,settings:CylindricalBrushSettings,options:OpenCylinderStrokeOptions,changed:()=>void,factory=openCylinderWorkerFactory){return beginConnectedWorkerStroke(terrain,history,first,settings,options,changed,adapter,factory);}
