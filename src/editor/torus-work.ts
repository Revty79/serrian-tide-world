import {createTorusTerrain,type TorusTerrain} from '../terrain/torus.ts';
import {TORUS_REPRESENTATION} from '../terrain/torus.ts';
import {beginTorusStroke,prepareTorusDab} from '../terrain/torus-brush.ts';
import {createConnectedWorkRuntime} from './connected-work-runtime.ts';
import {beginConnectedWorkerStroke} from './connected-worker-stroke.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS} from './physical-brush-policy.ts';
import type {ConnectedWorkOutput,ConnectedWorkerInput} from './connected-work-protocol.ts';
import type {TorusStrokeOptions} from '../terrain/torus-brush.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import type {ConnectedHistory} from './connected-history.ts';
export function createTorusWorkerTerrain(meta:TorusTerrain['metadata'],initialValues?:Float32Array){if(meta.representation.provider!==TORUS_REPRESENTATION||meta.representation.version!==1||meta.representation.ownership!=='double-periodic-no-endpoints'||meta.elevationUnits!=='meters'||meta.seaLevel!==0||meta.identity.worldId!==meta.geometry.identity.worldId||meta.identity.surfaceId!==meta.geometry.identity.surfaceId)throw RangeError('Invalid torus worker provider, topology or identity.');const terrain=createTorusTerrain({terrainId:meta.terrainId,geometry:meta.geometry,subdivisions:meta.representation.subdivisions,initialElevation:0,initialValues});if(JSON.stringify(terrain.metadata)!==JSON.stringify(meta))throw RangeError('Invalid torus worker metadata.');return terrain;}
export function torusStencil(t:TorusTerrain,p:SurfacePosition,s:CylindricalBrushSettings,view:CylinderView){const job=prepareTorusDab(t,p,s,PHYSICAL_PREVIEW_DAB_LIMITS,view);return{job,finish:()=>{const result={center:job.center,indices:Uint32Array.from(job.preparedChanges(t),c=>c.index),revision:job.sourceRevision,settings:job.settings,affectedSamples:job.statistics.affectedSamples};job.cancel();return result;}};}
export type TorusWorkInput=ConnectedWorkerInput<TorusTerrain['metadata'],TorusStrokeOptions,CylinderView>;
export const createTorusWorkRuntime=(send:(m:ConnectedWorkOutput)=>void,schedule:(fn:()=>void)=>void)=>createConnectedWorkRuntime(send,schedule,{create:createTorusWorkerTerrain,createFromSnapshot:createTorusWorkerTerrain,begin:beginTorusStroke,preview:torusStencil});
export const torusWorkerFactory=()=>new Worker(new URL('./torus-preparation.worker.ts',import.meta.url),{type:'module'});
export function beginWorkerTorusStroke(t:TorusTerrain,h:ConnectedHistory<TorusTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,o:TorusStrokeOptions,changed:()=>void,factory=torusWorkerFactory){return beginConnectedWorkerStroke(t,h,p,s,o,changed,{begin:beginTorusStroke,preparedPatch:connectedPreparedPatch},factory);}
