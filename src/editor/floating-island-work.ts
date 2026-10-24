import {createPhysicalPieceTerrain as createFloatingIslandTerrain,type PhysicalPieceTerrain as FloatingIslandTerrain} from '../terrain/physical-piece.ts';
import {TRIANGULAR_POLYHEDRON_REPRESENTATION} from '../terrain/triangular-polyhedron.ts';
import {beginFloatingIslandStroke,prepareFloatingIslandDab} from '../terrain/floating-island-brush.ts';
import {createConnectedWorkRuntime} from './connected-work-runtime.ts';
import {beginConnectedWorkerStroke} from './connected-worker-stroke.ts';
import {connectedPreparedPatch} from './connected-prepared-patch.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS} from './physical-brush-policy.ts';
import type {ConnectedWorkOutput,ConnectedWorkerInput} from './connected-work-protocol.ts';
import type {FloatingIslandStrokeOptions} from '../terrain/floating-island-brush.ts';
import type {CylinderView} from '../rendering/cylindrical-view.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import type {ConnectedHistory} from './connected-history.ts';
export function createFloatingIslandWorkerTerrain(meta:FloatingIslandTerrain['metadata'],initialValues?:Float32Array){if(meta.representation.provider!==TRIANGULAR_POLYHEDRON_REPRESENTATION||meta.representation.version!==1||meta.representation.ownership!=='vertices-edges-triangle-interiors'||meta.elevationUnits!=='meters'||meta.seaLevel!==0||meta.identity.worldId!==meta.geometry.identity.worldId||meta.identity.surfaceId!==meta.geometry.identity.surfaceId)throw RangeError('Invalid floating-island worker provider, topology or identity.');return createFloatingIslandTerrain({terrainId:meta.terrainId,geometry:meta.geometry,subdivisions:meta.representation.subdivisions,elevationLimitMeters:meta.elevationLimitMeters,initialElevation:0,initialValues});}
export function floatingIslandStencil(t:FloatingIslandTerrain,p:SurfacePosition,s:CylindricalBrushSettings,view:CylinderView){const job=prepareFloatingIslandDab(t,p,s,PHYSICAL_PREVIEW_DAB_LIMITS,view);return{job,finish:()=>{const result={center:job.center,indices:Uint32Array.from(job.preparedChanges(t),c=>c.index),revision:job.sourceRevision,settings:job.settings,affectedSamples:job.statistics.affectedSamples};job.cancel();return result;}};}
export type FloatingIslandWorkInput=ConnectedWorkerInput<FloatingIslandTerrain['metadata'],FloatingIslandStrokeOptions,CylinderView>;
export const createFloatingIslandWorkRuntime=(send:(m:ConnectedWorkOutput)=>void,schedule:(fn:()=>void)=>void)=>createConnectedWorkRuntime(send,schedule,{create:createFloatingIslandWorkerTerrain,createFromSnapshot:createFloatingIslandWorkerTerrain,begin:beginFloatingIslandStroke,preview:floatingIslandStencil});
export const floatingIslandWorkerFactory=()=>new Worker(new URL('./floating-island-preparation.worker.ts',import.meta.url),{type:'module'});
export function beginWorkerFloatingIslandStroke(t:FloatingIslandTerrain,h:ConnectedHistory<FloatingIslandTerrain>,p:SurfacePosition,s:CylindricalBrushSettings,o:FloatingIslandStrokeOptions,changed:()=>void,factory=floatingIslandWorkerFactory){return beginConnectedWorkerStroke(t,h,p,s,o,changed,{begin:beginFloatingIslandStroke,preparedPatch:connectedPreparedPatch},factory);}
