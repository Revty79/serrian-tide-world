import {createPyramidTerrain,PYRAMID_REPRESENTATION,type PyramidTerrain} from '../terrain/pyramid.ts';
import {beginPyramidStroke,preparePyramidDab} from '../terrain/pyramid-brush.ts';
import {createConnectedWorkRuntime} from './connected-work-runtime.ts';
import {beginConnectedWorkerStroke} from './connected-worker-stroke.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS} from './physical-brush-policy.ts';
import type {ConnectedWorkOutput,ConnectedWorkerInput} from './connected-work-protocol.ts';
import type {PyramidStrokeOptions} from '../terrain/pyramid-brush.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import type {ConnectedHistory} from './connected-history.ts';
export function createPyramidWorkerTerrain(meta:PyramidTerrain['metadata'],initialValues?:Float32Array){if(meta.representation.provider!==PYRAMID_REPRESENTATION||meta.representation.version!==1||meta.representation.ownership!=='vertices-edges-triangle-interiors-base-interior'||meta.elevationUnits!=='meters'||meta.seaLevel!==0||meta.identity.worldId!==meta.geometry.identity.worldId||meta.identity.surfaceId!==meta.geometry.identity.surfaceId)throw RangeError('Invalid pyramid worker provider, topology or identity.');return createPyramidTerrain({terrainId:meta.terrainId,geometry:meta.geometry,subdivisions:meta.representation.subdivisions,elevationLimitMeters:meta.elevationLimitMeters,initialElevation:0,initialValues});}
export function pyramidStencil(t:PyramidTerrain,p:SurfacePosition,s:CylindricalBrushSettings,view:CylinderView){const job=preparePyramidDab(t,p,s,PHYSICAL_PREVIEW_DAB_LIMITS,view);return{job,finish:()=>{const result={center:job.center,indices:Uint32Array.from(job.preparedChanges(t),c=>c.index),revision:job.sourceRevision,settings:job.settings,affectedSamples:job.statistics.affectedSamples};job.cancel();return result;}};}
export type PyramidWorkInput=ConnectedWorkerInput<PyramidTerrain['metadata'],PyramidStrokeOptions,CylinderView>;
export const createPyramidWorkRuntime=(send:(m:ConnectedWorkOutput)=>void,schedule:(fn:()=>void)=>void)=>createConnectedWorkRuntime(send,schedule,{create:createPyramidWorkerTerrain,createFromSnapshot:createPyramidWorkerTerrain,begin:beginPyramidStroke,preview:pyramidStencil});
export const pyramidWorkerFactory=()=>new Worker(new URL('./pyramid-preparation.worker.ts',import.meta.url),{type:'module'});
export function beginWorkerPyramidStroke(t:PyramidTerrain,h:ConnectedHistory<PyramidTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,o:PyramidStrokeOptions,changed:()=>void,factory=pyramidWorkerFactory){return beginConnectedWorkerStroke(t,h,p,s,o,changed,{begin:beginPyramidStroke,preparedPatch:connectedPreparedPatch},factory);}
