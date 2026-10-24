import {createOpenCylinderTerrain,OPEN_CYLINDER_REPRESENTATION,type OpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import {beginOpenCylinderStroke,type OpenCylinderStrokeOptions} from '../terrain/open-cylinder-stroke.ts';
import type {ConnectedStrokeOptions} from '../terrain/connected-stroke.ts';
import {assertOpenCylinderPatch} from '../surfaces/open-cylinder.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import {prepareOpenCylinderDab} from '../terrain/open-cylinder-brush.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS} from './physical-brush-policy.ts';
import type {ConnectedHistory} from './connected-history.ts';
import {createConnectedWorkRuntime} from './connected-work-runtime.ts';
import type {ConnectedWorkOutput,ConnectedWorkerInput} from './connected-work-protocol.ts';
import type {OpenCylinderView} from '../rendering/open-cylinder-view.ts';
export type OpenCylinderWorkInput=ConnectedWorkerInput<OpenCylinderTerrain['metadata'],OpenCylinderStrokeOptions,OpenCylinderView>;
export function beginOpenWorkerNumerics(terrain:OpenCylinderTerrain,history:ConnectedHistory<OpenCylinderTerrain>,first:SurfacePosition,settings:CylindricalBrushSettings,options:ConnectedStrokeOptions<OpenCylinderTerrain>){if(options.initialDirection)assertOpenCylinderPatch(options.initialDirection.patchId);return beginOpenCylinderStroke(terrain,history,first,settings,options as OpenCylinderStrokeOptions);}
export function prepareOpenCylinderStencil(terrain:OpenCylinderTerrain,center:SurfacePosition,settings:CylindricalBrushSettings,_view:OpenCylinderView){
 const job=prepareOpenCylinderDab(terrain,center,settings,PHYSICAL_PREVIEW_DAB_LIMITS);
 return{job,finish:()=>{const result={center:job.center,indices:Uint32Array.from(job.preparedChanges(terrain),c=>c.index),revision:job.sourceRevision,settings:job.settings,affectedSamples:job.statistics.affectedSamples};job.cancel();return result;}};
}
/** Actual Open provider metadata; every identity/layout field is checked before
 * loading words into the private scratch epoch. Host visibility/protection and
 * revision validation still precede every authoritative commit. */
export function createOpenWorkerTerrain(metadata:OpenCylinderTerrain['metadata'],initialValues?:Float32Array){
 if(metadata.representation.provider!==OPEN_CYLINDER_REPRESENTATION||metadata.representation.version!==1||metadata.representation.ownership!=='one-cyclic-meridian-wall-owned-creases-midpoint-tie-exterior'||metadata.elevationUnits!=='meters'||metadata.seaLevel!==0||metadata.identity.worldId!==metadata.geometry.identity.worldId||metadata.identity.surfaceId!==metadata.geometry.identity.surfaceId)throw Error('Invalid Open Cylinder worker provider, layout or identity.');
 return createOpenCylinderTerrain({terrainId:metadata.terrainId,geometry:metadata.geometry,resolution:metadata.representation.resolution,initialValues});
}
export function createOpenCylinderWorkRuntime(send:(m:ConnectedWorkOutput)=>void,schedule:(fn:()=>void)=>void){return createConnectedWorkRuntime(send,schedule,{create:createOpenWorkerTerrain,createFromSnapshot:createOpenWorkerTerrain,begin:beginOpenWorkerNumerics,preview:prepareOpenCylinderStencil});}
