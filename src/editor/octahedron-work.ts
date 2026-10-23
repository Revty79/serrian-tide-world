import {createOctahedronTerrain,type OctahedronTerrain} from '../terrain/octahedron.ts';
import {TRIANGULAR_POLYHEDRON_REPRESENTATION} from '../terrain/triangular-polyhedron.ts';
import {beginOctahedronStroke,prepareOctahedronDab} from '../terrain/octahedron-brush.ts';
import {createConnectedWorkRuntime} from './connected-work-runtime.ts';
import {beginConnectedWorkerStroke} from './connected-worker-stroke.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS} from './physical-brush-policy.ts';
import type {ConnectedWorkOutput,ConnectedWorkerInput} from './connected-work-protocol.ts';
import type {OctahedronStrokeOptions} from '../terrain/octahedron-brush.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import type {ConnectedHistory} from './connected-history.ts';
export function createOctahedronWorkerTerrain(meta:OctahedronTerrain['metadata'],initialValues?:Float32Array){if(meta.representation.provider!==TRIANGULAR_POLYHEDRON_REPRESENTATION||meta.representation.version!==1||meta.representation.ownership!=='vertices-edges-triangle-interiors'||meta.elevationUnits!=='meters'||meta.seaLevel!==0||meta.identity.worldId!==meta.geometry.identity.worldId||meta.identity.surfaceId!==meta.geometry.identity.surfaceId)throw RangeError('Invalid octahedron worker provider, topology or identity.');return createOctahedronTerrain({terrainId:meta.terrainId,geometry:meta.geometry,subdivisions:meta.representation.subdivisions,elevationLimitMeters:meta.elevationLimitMeters,initialElevation:0,initialValues});}
export function octahedronStencil(t:OctahedronTerrain,p:SurfacePosition,s:CylindricalBrushSettings,view:CylinderView){const job=prepareOctahedronDab(t,p,s,PHYSICAL_PREVIEW_DAB_LIMITS,view);return{job,finish:()=>{const result={center:job.center,indices:Uint32Array.from(job.preparedChanges(t),c=>c.index),revision:job.sourceRevision,settings:job.settings,affectedSamples:job.statistics.affectedSamples};job.cancel();return result;}};}
export type OctahedronWorkInput=ConnectedWorkerInput<OctahedronTerrain['metadata'],OctahedronStrokeOptions,CylinderView>;
export const createOctahedronWorkRuntime=(send:(m:ConnectedWorkOutput)=>void,schedule:(fn:()=>void)=>void)=>createConnectedWorkRuntime(send,schedule,{create:createOctahedronWorkerTerrain,createFromSnapshot:createOctahedronWorkerTerrain,begin:beginOctahedronStroke,preview:octahedronStencil});
export const octahedronWorkerFactory=()=>new Worker(new URL('./octahedron-preparation.worker.ts',import.meta.url),{type:'module'});
export function beginWorkerOctahedronStroke(t:OctahedronTerrain,h:ConnectedHistory<OctahedronTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,o:OctahedronStrokeOptions,changed:()=>void,factory=octahedronWorkerFactory){return beginConnectedWorkerStroke(t,h,p,s,o,changed,{begin:beginOctahedronStroke,preparedPatch:connectedPreparedPatch},factory);}
