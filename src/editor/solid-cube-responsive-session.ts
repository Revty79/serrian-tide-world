import {createSolidCubeSessionWithPath, type CubeStrokeOptions} from './solid-cube-session.ts';
import type {CubeBrushSettings} from '../terrain/solid-cube-brush.ts';
import type {SolidCubeTerrain} from '../terrain/solid-cube.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CubeHistoryLimits} from './solid-cube-history.ts';
import {createCubeWorkerPath,cubePathWorkerFactory,cubeWorkerIsIdle, type CubeExecutionMode, type CubePathWorkerFactory} from './cube-worker-path.ts';
import {CUBE_PATH_WORK_LIMITS, type CubePathRole} from './cube-path-work-protocol.ts';
import {createSolidCubeStrokePath} from '../surfaces/solid-cube-stroke-path.ts';

export interface ResponsiveCubeOptions {readonly mode?:CubeExecutionMode;readonly historyLimits?:CubeHistoryLimits;readonly workerFactory?:CubePathWorkerFactory;readonly startupTimeoutMs?:number;readonly workTimeoutMs?:number;readonly reuseWorkers?:boolean;readonly trackPublications?:boolean;readonly placement?:'exact'|'bounded-phase'}
/** One C2B1 authority/history. Only pure physical-path preparation may leave the host. */
export function createResponsiveSolidCubeSession(terrain:SolidCubeTerrain,options:ResponsiveCubeOptions={}){
 const mode=options.mode??'auto',timeout=options.startupTimeoutMs??CUBE_PATH_WORK_LIMITS.startupTimeoutMs;
 if(options.placement!==undefined&&options.placement!=='exact'&&options.placement!=='bounded-phase')throw RangeError('Invalid cube spacing policy');
 if(!['auto','cooperative','worker'].includes(mode)||!Number.isSafeInteger(timeout)||timeout<1||timeout>CUBE_PATH_WORK_LIMITS.startupTimeoutMs)throw RangeError('Invalid responsive cube execution options');
 if(options.reuseWorkers!==undefined&&typeof options.reuseWorkers!=='boolean')throw RangeError('Invalid cube worker reuse option');
 if(options.workTimeoutMs!==undefined&&(!Number.isSafeInteger(options.workTimeoutMs)||options.workTimeoutMs<1||options.workTimeoutMs>CUBE_PATH_WORK_LIMITS.workTimeoutMs))throw RangeError('Invalid cube worker request timeout');
 const binding=JSON.stringify({...terrain.keyAt(0),sampleCount:terrain.sampleCount,elevationByteLength:terrain.elevationByteLength});let bridge:ReturnType<typeof createCubeWorkerPath>|undefined;
 const cached:Partial<Record<CubePathRole,Worker>>={},terminated=new WeakSet<Worker>(),created=new WeakSet<Worker>(),pool={created:0,reused:0,terminated:0,idleFailures:0};
 const destroy=(worker:Worker)=>{for(const role of['primary','verifier'] as const)if(cached[role]===worker)delete cached[role];if(!terminated.has(worker)&&cubeWorkerIsIdle(worker)){terminated.add(worker);worker.onmessage=null;worker.onerror=null;worker.onmessageerror=null;worker.terminate();pool.terminated++;}};
 const acquire:CubePathWorkerFactory=role=>{let worker=cached[role];if(worker){if(!cubeWorkerIsIdle(worker))throw Error('Cube pool worker is still leased');pool.reused++;return worker;}worker=(options.workerFactory??cubePathWorkerFactory)(role);if(!cubeWorkerIsIdle(worker))throw Error('Cube factory returned an owned worker');cached[role]=worker;if(!created.has(worker)){created.add(worker);pool.created++;}return worker;};
 const releaseWorker=(role:CubePathRole,worker:Worker,reusable:boolean)=>{
  if(!reusable||options.reuseWorkers===false){destroy(worker);return;}cached[role]=worker;
  worker.onmessage=()=>{};worker.onerror=e=>{e.preventDefault();pool.idleFailures++;destroy(worker);};worker.onmessageerror=()=>{pool.idleFailures++;destroy(worker);};
 };
 const core=createSolidCubeSessionWithPath(terrain,options.historyLimits??{},(configuration,radius,limits={})=>{
  if(options.placement==='bounded-phase')return createSolidCubeStrokePath(configuration,radius,limits,'bounded-phase');
  bridge=createCubeWorkerPath(configuration,radius,limits,{mode,binding,revision:()=>terrain.revision,factory:acquire,startupTimeoutMs:timeout,workTimeoutMs:options.workTimeoutMs,releaseWorker});return bridge.path;
 },options.trackPublications??false);
 let channel:MessageChannel|undefined,turnPromise:Promise<void>|undefined,resolveTurn:(()=>void)|undefined;
 const turn=()=>{
  if(typeof setImmediate==='function')return new Promise<void>(r=>setImmediate(r));
  if(!channel){channel=new MessageChannel();channel.port1.onmessage=()=>{const resolve=resolveTurn;turnPromise=undefined;resolveTurn=undefined;resolve?.();};}
  return turnPromise??=new Promise<void>(r=>{resolveTurn=r;channel!.port2.postMessage(0);});
 };
 return Object.freeze({terrain:core.terrain,history:core.history,binding:core.binding,
  get stroke(){return core.stroke;},get lastStroke(){return core.lastStroke;},get disposed(){return core.disposed;},get diagnostics(){return bridge?{...bridge.diagnostics,pool:{...pool,retained:Object.keys(cached).length}}:undefined;},
  get waitingForPath(){return bridge?.waiting??false;},
  begin(first:SurfacePosition,settings:CubeBrushSettings,strokeOptions:CubeStrokeOptions={}){return core.begin(first,settings,strokeOptions);},
  pump:(steps=256)=>core.pump(steps),release:()=>core.release(),cancel:()=>core.cancel(),undo:()=>core.undo(),redo:()=>core.redo(),clearHistory:()=>core.clearHistory(),
  waitForProgress(){return core.disposed||!core.stroke?Promise.resolve():bridge&&(bridge.waiting||bridge.idle&&core.stroke.statistics.lastStage==='idle')?bridge.waitForProgress():turn();},
  dispose(){core.dispose();for(const worker of Object.values(cached))destroy(worker);resolveTurn?.();turnPromise=undefined;resolveTurn=undefined;channel?.port1.close();channel?.port2.close();channel=undefined;},
 });
}
