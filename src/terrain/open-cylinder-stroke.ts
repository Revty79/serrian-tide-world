import type {SurfacePosition} from '../surfaces/contracts.ts';
import {assertOpenCylinderPatch} from '../surfaces/open-cylinder.ts';
import {reconstructOpenCylinderPath,type OpenCylinderPathOptions} from '../surfaces/open-cylinder-path.ts';
import type {ConnectedHistory} from '../editor/connected-history.ts';
import type {OpenCylinderTerrain} from './open-cylinder.ts';
import {OPEN_CYLINDER_DAB_ADAPTER} from './open-cylinder-brush.ts';
import type {CylindricalBrushSettings} from './connected-brush.ts';
import {beginConnectedStroke,type ConnectedStrokeAdapter,type ConnectedStrokeOptions} from './connected-stroke.ts';
export interface OpenCylinderStrokeOptions extends ConnectedStrokeOptions<OpenCylinderTerrain>{readonly initialDirection?:OpenCylinderPathOptions['continuity']}
const adapter=Object.freeze<ConnectedStrokeAdapter<OpenCylinderTerrain>>({...OPEN_CYLINDER_DAB_ADAPTER,
 normalize:(t,p)=>t.geometry.normalize(p),radiusMeters:t=>t.geometry.metadata.innerRadiusMeters,
 path:(t,a,b,options)=>{const c=options.continuity;let continuity:OpenCylinderPathOptions['continuity'];if(c){const patchId=c.patchId;assertOpenCylinderPatch(patchId);continuity={patchId,direction:c.direction};}return reconstructOpenCylinderPath(t.geometry,a,b,{...options,continuity});},
});
/** Same accepted gesture engine: ordered input, carried physical spacing,
 * bounded work, explicit failures and exact whole-gesture history. */
export function beginOpenCylinderStroke(terrain:OpenCylinderTerrain,history:ConnectedHistory<OpenCylinderTerrain>,first:SurfacePosition,settings:CylindricalBrushSettings,options:OpenCylinderStrokeOptions={}){return beginConnectedStroke(terrain,history,first,settings,adapter,options);}
