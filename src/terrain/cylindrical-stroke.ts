import type {SurfacePosition} from '../surfaces/contracts.ts';
import {assertCylinderRegion} from '../surfaces/cylinder.ts';
import {reconstructCylinderPath,type CylinderPathOptions} from '../surfaces/cylinder-path.ts';
import type {CylindricalHistory} from '../editor/cylindrical-history.ts';
import {CYLINDRICAL_DAB_ADAPTER,type CylindricalBrushSettings} from './cylindrical-brush.ts';
import type {CylindricalTerrain} from './cylindrical.ts';
import {beginConnectedStroke,type ConnectedStrokeAdapter,type ConnectedStrokeOptions} from './connected-stroke.ts';
export {CYLINDER_STROKE_LIMITS,type CylinderStrokeStatus,type CylinderTransitionIntent} from './connected-stroke.ts';
export interface CylinderStrokeOptions extends ConnectedStrokeOptions<CylindricalTerrain>{readonly initialDirection?:CylinderPathOptions['continuity']}
const adapter=Object.freeze<ConnectedStrokeAdapter<CylindricalTerrain>>({...CYLINDRICAL_DAB_ADAPTER,
 normalize:(t,p)=>t.geometry.normalize(p),radiusMeters:t=>t.metadata.geometry.radiusMeters,
 path:(t,a,b,options)=>{const c=options.continuity;let continuity:CylinderPathOptions['continuity'];if(c){const patchId=c.patchId;assertCylinderRegion(patchId);continuity={patchId,direction:c.direction};}return reconstructCylinderPath(t.geometry,a,b,{...options,continuity});},
});
/** Closed wrapper over the accepted common gesture ordering and spacing core. */
export function beginCylindricalStroke(terrain:CylindricalTerrain,history:CylindricalHistory,first:SurfacePosition,settings:CylindricalBrushSettings,options:CylinderStrokeOptions={}){return beginConnectedStroke(terrain,history,first,settings,adapter,options);}
