import {createIcosahedronTerrain,type IcosahedronTerrain} from '../terrain/icosahedron.ts';
import {TRIANGULAR_POLYHEDRON_REPRESENTATION} from '../terrain/triangular-polyhedron.ts';
import {beginIcosahedronStroke,prepareIcosahedronDab} from '../terrain/icosahedron-brush.ts';
import {createConnectedWorkRuntime} from './connected-work-runtime.ts';
import {beginConnectedWorkerStroke} from './connected-worker-stroke.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS} from './physical-brush-policy.ts';
import type {ConnectedWorkOutput,ConnectedWorkerInput} from './connected-work-protocol.ts';
import type {IcosahedronStrokeOptions} from '../terrain/icosahedron-brush.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import type {ConnectedHistory} from './connected-history.ts';
export function createIcosahedronWorkerTerrain(meta:IcosahedronTerrain['metadata'],initialValues?:Float32Array){if(meta.representation.provider!==TRIANGULAR_POLYHEDRON_REPRESENTATION||meta.representation.version!==1||meta.representation.ownership!=='vertices-edges-triangle-interiors'||meta.elevationUnits!=='meters'||meta.seaLevel!==0||meta.identity.worldId!==meta.geometry.identity.worldId||meta.identity.surfaceId!==meta.geometry.identity.surfaceId)throw RangeError('Invalid icosahedron worker provider, topology or identity.');return createIcosahedronTerrain({terrainId:meta.terrainId,geometry:meta.geometry,subdivisions:meta.representation.subdivisions,elevationLimitMeters:meta.elevationLimitMeters,initialElevation:0,initialValues});}
export function icosahedronStencil(t:IcosahedronTerrain,p:SurfacePosition,s:CylindricalBrushSettings,view:CylinderView){const job=prepareIcosahedronDab(t,p,s,PHYSICAL_PREVIEW_DAB_LIMITS,view);return{job,finish:()=>{const result={center:job.center,indices:Uint32Array.from(job.preparedChanges(t),c=>c.index),revision:job.sourceRevision,settings:job.settings,affectedSamples:job.statistics.affectedSamples};job.cancel();return result;}};}
export type IcosahedronWorkInput=ConnectedWorkerInput<IcosahedronTerrain['metadata'],IcosahedronStrokeOptions,CylinderView>;
export const createIcosahedronWorkRuntime=(send:(m:ConnectedWorkOutput)=>void,schedule:(fn:()=>void)=>void)=>createConnectedWorkRuntime(send,schedule,{create:createIcosahedronWorkerTerrain,createFromSnapshot:createIcosahedronWorkerTerrain,begin:beginIcosahedronStroke,preview:icosahedronStencil});
export const icosahedronWorkerFactory=()=>new Worker(new URL('./icosahedron-preparation.worker.ts',import.meta.url),{type:'module'});
export function beginWorkerIcosahedronStroke(t:IcosahedronTerrain,h:ConnectedHistory<IcosahedronTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,o:IcosahedronStrokeOptions,changed:()=>void,factory=icosahedronWorkerFactory){return beginConnectedWorkerStroke(t,h,p,s,o,changed,{begin:beginIcosahedronStroke,preparedPatch:connectedPreparedPatch},factory);}
