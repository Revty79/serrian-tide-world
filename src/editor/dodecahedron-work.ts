import {createDodecahedronTerrain,type DodecahedronTerrain} from '../terrain/dodecahedron.ts';
import {TRIANGULAR_POLYHEDRON_REPRESENTATION} from '../terrain/triangular-polyhedron.ts';
import {beginDodecahedronStroke,prepareDodecahedronDab} from '../terrain/dodecahedron-brush.ts';
import {createConnectedWorkRuntime} from './connected-work-runtime.ts';
import {beginConnectedWorkerStroke} from './connected-worker-stroke.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS} from './physical-brush-policy.ts';
import type {ConnectedWorkOutput,ConnectedWorkerInput} from './connected-work-protocol.ts';
import type {DodecahedronStrokeOptions} from '../terrain/dodecahedron-brush.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import type {ConnectedHistory} from './connected-history.ts';
export function createDodecahedronWorkerTerrain(meta:DodecahedronTerrain['metadata'],initialValues?:Float32Array){if(meta.representation.provider!==TRIANGULAR_POLYHEDRON_REPRESENTATION||meta.representation.version!==1||meta.representation.ownership!=='vertices-edges-triangle-interiors'||meta.elevationUnits!=='meters'||meta.seaLevel!==0||meta.identity.worldId!==meta.geometry.identity.worldId||meta.identity.surfaceId!==meta.geometry.identity.surfaceId)throw RangeError('Invalid dodecahedron worker provider, topology or identity.');return createDodecahedronTerrain({terrainId:meta.terrainId,geometry:meta.geometry,subdivisions:meta.representation.subdivisions,elevationLimitMeters:meta.elevationLimitMeters,initialElevation:0,initialValues});}
export function dodecahedronStencil(t:DodecahedronTerrain,p:SurfacePosition,s:CylindricalBrushSettings,view:CylinderView){const job=prepareDodecahedronDab(t,p,s,PHYSICAL_PREVIEW_DAB_LIMITS,view);return{job,finish:()=>{const result={center:job.center,indices:Uint32Array.from(job.preparedChanges(t),c=>c.index),revision:job.sourceRevision,settings:job.settings,affectedSamples:job.statistics.affectedSamples};job.cancel();return result;}};}
export type DodecahedronWorkInput=ConnectedWorkerInput<DodecahedronTerrain['metadata'],DodecahedronStrokeOptions,CylinderView>;
export const createDodecahedronWorkRuntime=(send:(m:ConnectedWorkOutput)=>void,schedule:(fn:()=>void)=>void)=>createConnectedWorkRuntime(send,schedule,{create:createDodecahedronWorkerTerrain,createFromSnapshot:createDodecahedronWorkerTerrain,begin:beginDodecahedronStroke,preview:dodecahedronStencil});
export const dodecahedronWorkerFactory=()=>new Worker(new URL('./dodecahedron-preparation.worker.ts',import.meta.url),{type:'module'});
export function beginWorkerDodecahedronStroke(t:DodecahedronTerrain,h:ConnectedHistory<DodecahedronTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,o:DodecahedronStrokeOptions,changed:()=>void,factory=dodecahedronWorkerFactory){return beginConnectedWorkerStroke(t,h,p,s,o,changed,{begin:beginDodecahedronStroke,preparedPatch:connectedPreparedPatch},factory);}
