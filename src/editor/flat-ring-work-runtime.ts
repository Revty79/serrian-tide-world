import type {OpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import {createOpenWorkerTerrain} from './open-cylinder-work-runtime.ts';
import {flatRingResolution} from '../terrain/flat-ring.ts';
import {beginFlatRingStroke,type OpenCylinderStrokeOptions} from '../terrain/flat-ring-stroke.ts';
import type {ConnectedStrokeOptions} from '../terrain/connected-stroke.ts';
import {assertOpenCylinderPatch} from '../surfaces/open-cylinder.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import {prepareFlatRingDab} from '../terrain/flat-ring-brush.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS} from './physical-brush-policy.ts';
import type {ConnectedHistory} from './connected-history.ts';
import {createConnectedWorkRuntime} from './connected-work-runtime.ts';
import type {ConnectedWorkOutput,ConnectedWorkerInput} from './connected-work-protocol.ts';
import type {OpenCylinderView} from '../rendering/open-cylinder-view.ts';
export type OpenCylinderWorkInput=ConnectedWorkerInput<OpenCylinderTerrain['metadata'],OpenCylinderStrokeOptions,OpenCylinderView>;
export function beginFlatRingWorkerNumerics(terrain:OpenCylinderTerrain,history:ConnectedHistory<OpenCylinderTerrain>,first:SurfacePosition,settings:CylindricalBrushSettings,options:ConnectedStrokeOptions<OpenCylinderTerrain>){if(options.initialDirection)assertOpenCylinderPatch(options.initialDirection.patchId);return beginFlatRingStroke(terrain,history,first,settings,options as OpenCylinderStrokeOptions);}
export function prepareFlatRingStencil(terrain:OpenCylinderTerrain,center:SurfacePosition,settings:CylindricalBrushSettings,_view:OpenCylinderView){
 const job=prepareFlatRingDab(terrain,center,settings,PHYSICAL_PREVIEW_DAB_LIMITS);
 return{job,finish:()=>{const result={center:job.center,indices:Uint32Array.from(job.preparedChanges(terrain),c=>c.index),revision:job.sourceRevision,settings:job.settings,affectedSamples:job.statistics.affectedSamples};job.cancel();return result;}};
}
export function createFlatRingWorkerTerrain(metadata:OpenCylinderTerrain['metadata'],values?:Float32Array){
 const g=metadata.geometry,dimensions={outerRadiusMeters:g.outerRadiusMeters,innerRadiusMeters:g.innerRadiusMeters,thicknessMeters:g.lengthMeters},actual=metadata.representation.resolution,detail=actual.angularSamples/(g.innerRadiusMeters/g.outerRadiusMeters<.2?1:2),expected=flatRingResolution(dimensions,detail);
 if(Object.keys(expected).some(k=>actual[k as keyof typeof expected]!==expected[k as keyof typeof expected]))throw Error('Unqualified Flat Ring worker profile.');
 return createOpenWorkerTerrain(metadata,values);
}
export function createFlatRingWorkRuntime(send:(m:ConnectedWorkOutput)=>void,schedule:(fn:()=>void)=>void){return createConnectedWorkRuntime(send,schedule,{create:createFlatRingWorkerTerrain,createFromSnapshot:createFlatRingWorkerTerrain,begin:beginFlatRingWorkerNumerics,preview:prepareFlatRingStencil});}
