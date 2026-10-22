import type {CylindricalTerrain} from '../terrain/cylindrical.ts';
import {beginCylindricalStroke,type CylinderStrokeOptions} from '../terrain/cylindrical-stroke.ts';
import type {CylindricalHistory} from './cylindrical-history.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/cylindrical-brush.ts';
import type {ConnectedStrokeOptions} from '../terrain/connected-stroke.ts';
import {assertCylinderRegion} from '../surfaces/cylinder.ts';
export function beginCylinderWorkerNumerics(terrain:CylindricalTerrain,history:CylindricalHistory,first:SurfacePosition,settings:CylindricalBrushSettings,options:ConnectedStrokeOptions<CylindricalTerrain>){if(options.initialDirection)assertCylinderRegion(options.initialDirection.patchId);return beginCylindricalStroke(terrain,history,first,settings,options as CylinderStrokeOptions);}
