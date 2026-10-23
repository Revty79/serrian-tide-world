import {createTrapezohedronTerrain,type TrapezohedronTerrain} from '../terrain/trapezohedron.ts';
import {TRIANGULAR_POLYHEDRON_REPRESENTATION} from '../terrain/triangular-polyhedron.ts';
import {beginTrapezohedronStroke,prepareTrapezohedronDab} from '../terrain/trapezohedron-brush.ts';
import {createConnectedWorkRuntime} from './connected-work-runtime.ts';
import {beginConnectedWorkerStroke} from './connected-worker-stroke.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS} from './physical-brush-policy.ts';
import type {ConnectedWorkOutput,ConnectedWorkerInput} from './connected-work-protocol.ts';
import type {TrapezohedronStrokeOptions} from '../terrain/trapezohedron-brush.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import type {ConnectedHistory} from './connected-history.ts';
export function createTrapezohedronWorkerTerrain(meta:TrapezohedronTerrain['metadata'],initialValues?:Float32Array){if(meta.representation.provider!==TRIANGULAR_POLYHEDRON_REPRESENTATION||meta.representation.version!==1||meta.representation.ownership!=='vertices-edges-triangle-interiors'||meta.elevationUnits!=='meters'||meta.seaLevel!==0||meta.identity.worldId!==meta.geometry.identity.worldId||meta.identity.surfaceId!==meta.geometry.identity.surfaceId)throw RangeError('Invalid trapezohedron worker provider, topology or identity.');return createTrapezohedronTerrain({terrainId:meta.terrainId,geometry:meta.geometry,subdivisions:meta.representation.subdivisions,elevationLimitMeters:meta.elevationLimitMeters,initialElevation:0,initialValues});}
export function trapezohedronStencil(t:TrapezohedronTerrain,p:SurfacePosition,s:CylindricalBrushSettings,view:CylinderView){const job=prepareTrapezohedronDab(t,p,s,PHYSICAL_PREVIEW_DAB_LIMITS,view);return{job,finish:()=>{const result={center:job.center,indices:Uint32Array.from(job.preparedChanges(t),c=>c.index),revision:job.sourceRevision,settings:job.settings,affectedSamples:job.statistics.affectedSamples};job.cancel();return result;}};}
export type TrapezohedronWorkInput=ConnectedWorkerInput<TrapezohedronTerrain['metadata'],TrapezohedronStrokeOptions,CylinderView>;
export const createTrapezohedronWorkRuntime=(send:(m:ConnectedWorkOutput)=>void,schedule:(fn:()=>void)=>void)=>createConnectedWorkRuntime(send,schedule,{create:createTrapezohedronWorkerTerrain,createFromSnapshot:createTrapezohedronWorkerTerrain,begin:beginTrapezohedronStroke,preview:trapezohedronStencil});
export const trapezohedronWorkerFactory=()=>new Worker(new URL('./trapezohedron-preparation.worker.ts',import.meta.url),{type:'module'});
export function beginWorkerTrapezohedronStroke(t:TrapezohedronTerrain,h:ConnectedHistory<TrapezohedronTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,o:TrapezohedronStrokeOptions,changed:()=>void,factory=trapezohedronWorkerFactory){return beginConnectedWorkerStroke(t,h,p,s,o,changed,{begin:beginTrapezohedronStroke,preparedPatch:connectedPreparedPatch},factory);}
