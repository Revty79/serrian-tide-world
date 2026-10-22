import type {CylindricalTerrain} from '../terrain/cylindrical.ts';
import type {CylinderStrokeOptions} from '../terrain/cylindrical-stroke.ts';
import type {CylindricalHistory} from './cylindrical-history.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/cylindrical-brush.ts';
import {cylinderPreparedPatch} from './cylinder-prepared-patch.ts';
import {beginConnectedWorkerStroke} from './connected-worker-stroke.ts';
export type CylinderWorkerFactory=()=>Worker;
export const cylinderWorkerFactory:CylinderWorkerFactory=()=>new Worker(new URL('./cylinder-preparation.worker.ts',import.meta.url),{type:'module'});
import {beginCylinderWorkerNumerics} from './cylinder-worker-numerics.ts';
const adapter={begin:beginCylinderWorkerNumerics,preparedPatch:cylinderPreparedPatch};
export function beginWorkerCylinderStroke(terrain:CylindricalTerrain,history:CylindricalHistory,first:SurfacePosition,settings:CylindricalBrushSettings,options:CylinderStrokeOptions,changed:()=>void,factory=cylinderWorkerFactory){return beginConnectedWorkerStroke(terrain,history,first,settings,options,changed,adapter,factory);}
