import type {OpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import type {OpenCylinderStrokeOptions} from '../terrain/open-cylinder-stroke.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import type {ConnectedHistory} from './connected-history.ts';
import {beginFlatRingWorkerNumerics} from './flat-ring-work-runtime.ts';
import {beginConnectedWorkerStroke} from './connected-worker-stroke.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
export const flatRingWorkerFactory=()=>new Worker(new URL('./flat-ring-preparation.worker.ts',import.meta.url),{type:'module'});
const adapter={begin:beginFlatRingWorkerNumerics,preparedPatch:connectedPreparedPatch};
export function beginWorkerFlatRingStroke(terrain:OpenCylinderTerrain,history:ConnectedHistory<OpenCylinderTerrain>,first:SurfacePosition,settings:CylindricalBrushSettings,options:OpenCylinderStrokeOptions,changed:()=>void,factory=flatRingWorkerFactory){return beginConnectedWorkerStroke(terrain,history,first,settings,options,changed,adapter,factory);}
