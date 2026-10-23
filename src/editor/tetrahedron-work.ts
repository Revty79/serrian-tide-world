import {createTetrahedronTerrain,type TetrahedronTerrain} from '../terrain/tetrahedron.ts';
import {TRIANGULAR_POLYHEDRON_REPRESENTATION} from '../terrain/triangular-polyhedron.ts';
import {beginTetrahedronStroke,prepareTetrahedronDab} from '../terrain/tetrahedron-brush.ts';
import {createConnectedWorkRuntime} from './connected-work-runtime.ts';
import {beginConnectedWorkerStroke} from './connected-worker-stroke.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS} from './physical-brush-policy.ts';
import type {ConnectedWorkOutput,ConnectedWorkerInput} from './connected-work-protocol.ts';
import type {TetrahedronStrokeOptions} from '../terrain/tetrahedron-brush.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import type {ConnectedHistory} from './connected-history.ts';
export function createTetrahedronWorkerTerrain(meta:TetrahedronTerrain['metadata'],initialValues?:Float32Array){if(meta.representation.provider!==TRIANGULAR_POLYHEDRON_REPRESENTATION||meta.representation.version!==1||meta.representation.ownership!=='vertices-edges-triangle-interiors'||meta.elevationUnits!=='meters'||meta.seaLevel!==0||meta.identity.worldId!==meta.geometry.identity.worldId||meta.identity.surfaceId!==meta.geometry.identity.surfaceId)throw RangeError('Invalid tetrahedron worker provider, topology or identity.');return createTetrahedronTerrain({terrainId:meta.terrainId,geometry:meta.geometry,subdivisions:meta.representation.subdivisions,elevationLimitMeters:meta.elevationLimitMeters,initialElevation:0,initialValues});}
export function tetrahedronStencil(t:TetrahedronTerrain,p:SurfacePosition,s:CylindricalBrushSettings,view:CylinderView){const job=prepareTetrahedronDab(t,p,s,PHYSICAL_PREVIEW_DAB_LIMITS,view);return{job,finish:()=>{const result={center:job.center,indices:Uint32Array.from(job.preparedChanges(t),c=>c.index),revision:job.sourceRevision,settings:job.settings,affectedSamples:job.statistics.affectedSamples};job.cancel();return result;}};}
export type TetrahedronWorkInput=ConnectedWorkerInput<TetrahedronTerrain['metadata'],TetrahedronStrokeOptions,CylinderView>;
export const createTetrahedronWorkRuntime=(send:(m:ConnectedWorkOutput)=>void,schedule:(fn:()=>void)=>void)=>createConnectedWorkRuntime(send,schedule,{create:createTetrahedronWorkerTerrain,createFromSnapshot:createTetrahedronWorkerTerrain,begin:beginTetrahedronStroke,preview:tetrahedronStencil});
export const tetrahedronWorkerFactory=()=>new Worker(new URL('./tetrahedron-preparation.worker.ts',import.meta.url),{type:'module'});
export function beginWorkerTetrahedronStroke(t:TetrahedronTerrain,h:ConnectedHistory<TetrahedronTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,o:TetrahedronStrokeOptions,changed:()=>void,factory=tetrahedronWorkerFactory){return beginConnectedWorkerStroke(t,h,p,s,o,changed,{begin:beginTetrahedronStroke,preparedPatch:connectedPreparedPatch},factory);}
