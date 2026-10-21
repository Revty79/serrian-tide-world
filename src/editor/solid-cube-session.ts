import type {SurfacePosition} from '../surfaces/contracts.ts';
import {createSolidCubeStrokePath, type CubeStrokePathLimits, type SolidCubeStrokePath} from '../surfaces/solid-cube-stroke-path.ts';
import {CUBE_DAB_LIMITS, type CubeBrushSettings, type CubeDabLimits} from '../terrain/solid-cube-brush.ts';
import type {SolidCubeTerrain} from '../terrain/solid-cube.ts';
import {createSolidCubeHistory, type CubeHistoryLimits, type SolidCubeHistoryOperation} from './solid-cube-history.ts';

export const CUBE_STROKE_EXECUTION_LIMITS=Object.freeze({maxDabWorkUnits:CUBE_DAB_LIMITS.maxWorkUnits});
export type CubeStrokeStatus='drawing'|'draining'|'complete'|'cancelled'|'failed'|'disposed';
export interface CubeStrokeOptions {
  /** Interactive lifetime is count/storage bounded; each dab retains its original
   * work ceiling. Legacy numerical callers retain the aggregate gesture ceiling. */
  readonly workWindow?:'gesture'|'dab';
  readonly pathLimits?:CubeStrokePathLimits;
  readonly dabLimits?:CubeDabLimits;
  readonly maxDabWorkUnits?:number;
}
export interface CubeStrokeFailure {readonly name:string;readonly message:string;readonly stage:string}
export interface CubeDabTimeline {readonly pathReadyAt:number;readonly preparationStartedAt:number;readonly preparationReadyAt?:number;readonly historyReadyAt?:number}
export interface CubeStrokeStatistics {
  readonly lastCommittedTiming:CubeDabTimeline|undefined;
  readonly stageCpuMs:Readonly<{path:number;preparation:number;history:number;publication:number}>;
  readonly pumps:number;readonly initializedDabs:number;readonly committedDabs:number;readonly changingDabs:number;readonly writes:number;
  readonly fullyExecutedInputs:number;readonly lastCommittedDabOrdinal:number|undefined;readonly lastCommittedInputSequence:number|undefined;
  readonly completedDabWork:number;readonly failedInitializationWorkAllowance:number;readonly peakPreparedDabBytes:number;readonly lastStage:string;
  readonly acceptedInputs:number;readonly generatedDabs:number;readonly preparedDabs:number;readonly reservedDabs:number;
  readonly uncompletedInputs:number;readonly uncommittedGeneratedDabs:number;readonly dabWorkUnits:number;
  readonly path:SolidCubeStrokePath['statistics'];readonly history:SolidCubeHistoryOperation['statistics'];
  readonly pendingDabStage:SolidCubeHistoryOperation['stage'];
  readonly pendingSourceRevision:number|undefined;readonly expectedSourceRevision:number;
  readonly lastCommittedCenter:SurfacePosition|undefined;
}
export interface SolidCubeStroke {
  readonly settings:CubeBrushSettings;readonly status:CubeStrokeStatus;readonly failure:CubeStrokeFailure|undefined;
  readonly statistics:CubeStrokeStatistics;
  accept(point:SurfacePosition):boolean;
  release():CubeStrokeStatus;cancel():CubeStrokeStatus;dispose():CubeStrokeStatus;pump(steps?:number):CubeStrokeStatus;
}
const owners=new WeakMap<SolidCubeTerrain,object>();
/** Internal scheduling adapter. Geometry, C1 preparation and history remain owned by this session. */
export type CubeExecutionPath=SolidCubeStrokePath & {
  synchronized?():void;
  acknowledge?(revision:number,committedDabs:number,writes:number):void;
};
export type CubeExecutionPathFactory=(...args:Parameters<typeof createSolidCubeStrokePath>)=>CubeExecutionPath;

/** A cooperative numerical session, not an editor, worker or persistence adapter. */
export function createSolidCubeSession(terrain:SolidCubeTerrain,historyLimits:CubeHistoryLimits={}) {
  return createSolidCubeSessionWithPath(terrain,historyLimits,createSolidCubeStrokePath);
}

/** @internal Only trusted, validated scheduling adapters may supply physical path events. */
export function createSolidCubeSessionWithPath(terrain:SolidCubeTerrain,historyLimits:CubeHistoryLimits,pathFactory:CubeExecutionPathFactory,trackPublications=false) {
  const history=createSolidCubeHistory(terrain,historyLimits,trackPublications),token=Object.freeze({}),key=Object.freeze({...terrain.keyAt(0)});
  const binding=Object.freeze({...key,sampleCount:terrain.sampleCount,elevationByteLength:terrain.elevationByteLength});
  let active:SolidCubeStroke|undefined,last:SolidCubeStroke|undefined,disposed=false,beginning=false;
  const bound=()=>{
    const now=terrain.keyAt(0);
    for(const k of Object.keys(key) as (keyof typeof key)[])if(!Object.is(now[k],key[k]))throw new Error('Cube authority identity/configuration changed.');
    if(terrain.sampleCount!==binding.sampleCount||terrain.elevationByteLength!==binding.elevationByteLength)throw new Error('Cube authority dimensions changed.');
  };
  const available=()=>{if(disposed)throw new Error('Cube session is disposed.');bound();};
  return Object.freeze({terrain,history,binding,
    get stroke(){return active;},get lastStroke(){return last;},get disposed(){return disposed;},
    begin(first:SurfacePosition,inputSettings:CubeBrushSettings,input:CubeStrokeOptions={}):SolidCubeStroke {
      available();if(active||beginning||owners.has(terrain))throw new Error('One cube stroke may own this authority at a time.');
      beginning=true;owners.set(terrain,token);
      let path:CubeExecutionPath|undefined,operation:SolidCubeHistoryOperation|undefined;
      try{
        history.synchronized();
        const raw=Object.freeze({...inputSettings}),options=Object.freeze({...input,dabLimits:Object.freeze({...input.dabLimits})});
        if(options.workWindow!==undefined&&options.workWindow!=='gesture'&&options.workWindow!=='dab')throw RangeError('Invalid cube dab work window.');
        for(const k of Object.keys(CUBE_DAB_LIMITS) as (keyof typeof CUBE_DAB_LIMITS)[]){
          const n=options.dabLimits[k];if(n!==undefined&&(!Number.isSafeInteger(n)||n<1||n>CUBE_DAB_LIMITS[k]))throw new RangeError('Cube dab limits may only lower existing hard bounds.');
        }
        const maxDabWork=options.maxDabWorkUnits??CUBE_STROKE_EXECUTION_LIMITS.maxDabWorkUnits;
        if(!Number.isSafeInteger(maxDabWork)||maxDabWork<1||maxDabWork>CUBE_STROKE_EXECUTION_LIMITS.maxDabWorkUnits)throw new RangeError('Cube stroke work can only lower its hard limit.');
        path=pathFactory(terrain.metadata.geometry,raw.radiusMeters,options.pathLimits);path.accept(first);path.pump();
        const initial=path.take();if(!initial||initial.kind!=='dab'||initial.ordinal!==0)throw new Error('Cube initial path certificate is missing.');
        operation=history.beginOperation(terrain);
        const p=path,op=operation;
        let status:CubeStrokeStatus='drawing',failure:CubeStrokeFailure|undefined;
        let pendingOrdinal=initial.ordinal,pendingInput=initial.inputSequence,initializing=false;
        let pathReadyAt=performance.now(),timeline:CubeDabTimeline={pathReadyAt,preparationStartedAt:pathReadyAt},lastCommittedTiming:CubeDabTimeline|undefined;
        const stageCpuMs={path:0,preparation:0,history:0,publication:0};
        const measure=<T>(stage:keyof typeof stageCpuMs,work:()=>T)=>{const start=performance.now();try{return work();}finally{stageCpuMs[stage]+=performance.now()-start;}};
        const stats={pumps:0,initializedDabs:0,committedDabs:0,changingDabs:0,writes:0,fullyExecutedInputs:0,
          lastCommittedDabOrdinal:undefined as number|undefined,lastCommittedInputSequence:undefined as number|undefined,
          lastCommittedCenter:undefined as SurfacePosition|undefined,
          completedDabWork:0,failedInitializationWorkAllowance:0,peakPreparedDabBytes:0,lastStage:'initialize'};
        const synchronized=()=>{bound();op.synchronized();p.synchronized?.();};
        const account=()=>{const current=op.current;if(current){stats.completedDabWork+=current.statistics.workUnits;stats.peakPreparedDabBytes=Math.max(stats.peakPreparedDabBytes,current.statistics.peakPreparedBytes);}};
        const progress=()=>{if(op.stage==='none'&&p.statistics.dabs===stats.committedDabs)stats.fullyExecutedInputs=p.statistics.processedInputs;};
        const finish=(reason:'complete'|'cancelled'|'failed'|'disposed')=>{
          if(!['drawing','draining'].includes(status))return status;
          if(reason!=='failed')try{synchronized();}catch(error){
            failure=Object.freeze({name:error instanceof Error?error.name:'Error',message:error instanceof Error?error.message:String(error),stage:'termination-source'});reason='failed';
          }
          account();op.cancelPending();p.cancel();op.finish(reason==='complete'?'released':reason);status=reason;
          if(owners.get(terrain)===token)owners.delete(terrain);active=undefined;return status;
        };
        const fail=(error:unknown):never=>{
          if(initializing&&!op.current){const allowance=options.workWindow==='dab'?maxDabWork:Math.max(0,maxDabWork-stats.completedDabWork);stats.failedInitializationWorkAllowance+=allowance;stats.completedDabWork+=allowance;}
          failure=Object.freeze({name:error instanceof Error?error.name:'Error',message:error instanceof Error?error.message:String(error),stage:stats.lastStage});
          finish('failed');throw error;
        };
        const initialize=(center:SurfacePosition,settings:CubeBrushSettings)=>{
          timeline={pathReadyAt,preparationStartedAt:performance.now()};
          synchronized();const remaining=options.workWindow==='dab'?maxDabWork:maxDabWork-stats.completedDabWork;if(remaining<1)throw new RangeError('Cube stroke aggregate dab work exhausted.');
          const limits=Object.freeze({...options.dabLimits,maxWorkUnits:Math.min(options.dabLimits.maxWorkUnits??CUBE_DAB_LIMITS.maxWorkUnits,remaining)});
          initializing=true;measure('preparation',()=>op.startDab(center,settings,limits));initializing=false;stats.initializedDabs++;
          if(op.stage==='collecting')timeline={...timeline,preparationReadyAt:performance.now()};
        };
        initialize(initial.center,raw);const settings=op.current!.settings;
        const stroke:SolidCubeStroke=Object.freeze({settings,
          get status(){return status;},get failure(){return failure;},
          get statistics(){const ps=p.statistics,hs=op.statistics,current=op.current;return Object.freeze({...stats,lastCommittedTiming,stageCpuMs:Object.freeze({...stageCpuMs}),
            acceptedInputs:ps.acceptedInputs,generatedDabs:ps.dabs,preparedDabs:hs.preparedDabs,reservedDabs:hs.reservedDabs,
            uncompletedInputs:ps.acceptedInputs-stats.fullyExecutedInputs,uncommittedGeneratedDabs:ps.dabs-stats.committedDabs,
            dabWorkUnits:stats.completedDabWork+(current?.statistics.workUnits??0),path:ps,history:hs,pendingDabStage:op.stage,
            pendingSourceRevision:current?.sourceRevision,expectedSourceRevision:history.expectedRevision});},
          accept(point:SurfacePosition){
            if(status!=='drawing')throw new Error('Cube stroke no longer accepts input.');
            try{stats.lastStage='input';synchronized();return p.accept(point);}catch(error){return fail(error);}
          },
          release(){if(status==='drawing'){try{stats.lastStage='release';synchronized();p.release();status='draining';}catch(error){return fail(error);}}return status;},
          cancel:()=>finish('cancelled'),dispose:()=>finish('disposed'),
          pump(steps=256){
            if(status!=='drawing'&&status!=='draining')return status;
            if(!Number.isSafeInteger(steps)||steps<1||steps>4096)throw new RangeError('Cube execution pump needs 1-4096 steps.');
            stats.pumps++;
            try{
              synchronized();
              if(op.stage==='preparing'){stats.lastStage='preparation';measure('preparation',()=>op.pumpPreparation(steps));if(op.stage as string==='collecting')timeline={...timeline,preparationReadyAt:performance.now()};}
              else if(op.stage==='collecting'){stats.lastStage='history';measure('history',()=>op.pumpBookkeeping(steps));if(op.stage as string==='reserved')timeline={...timeline,historyReadyAt:performance.now()};}
              else if(op.stage==='reserved'){
                stats.lastStage='publication';const current=op.current!,work=current.statistics.workUnits,peak=current.statistics.peakPreparedBytes;
                const writes=measure('publication',()=>op.commitDab());lastCommittedTiming=Object.freeze({...timeline});stats.completedDabWork+=work;stats.peakPreparedDabBytes=Math.max(stats.peakPreparedDabBytes,peak);
                stats.committedDabs++;if(writes)stats.changingDabs++;stats.writes+=writes;stats.lastCommittedDabOrdinal=pendingOrdinal;stats.lastCommittedInputSequence=pendingInput;stats.lastCommittedCenter=current.center;progress();
                p.acknowledge?.(terrain.revision,stats.committedDabs,stats.writes);
              }else{
                const event=p.take();
                if(event?.kind==='dab'){
                  stats.lastStage='initialize';if(event.ordinal!==stats.committedDabs)throw new Error('Cube dab order does not match the committed prefix.');
                  pendingOrdinal=event.ordinal;pendingInput=event.inputSequence;initialize(event.center,settings);
                }else if(event){stats.lastStage='path-certificate';pathReadyAt=performance.now();}
                else if(p.status==='complete'){stats.lastStage='finish';progress();finish('complete');}
                else if(status==='draining'||p.statistics.pendingInputs||p.statistics.activeRoute){stats.lastStage='path';measure('path',()=>p.pump());progress();}
                else stats.lastStage='idle';
              }
              if(status==='drawing'||status==='draining')synchronized();return status;
            }catch(error){return fail(error);}
          },
        });
        active=last=stroke;return stroke;
      }catch(error){operation?.finish('failed');path?.cancel();if(owners.get(terrain)===token)owners.delete(terrain);throw error;}
      finally{beginning=false;}
    },
    pump(steps=256){return active?.pump(steps);},
    release(){return active?.release();},cancel(){return active?.cancel();},
    undo(){available();active?.cancel();return history.undo();},redo(){available();active?.cancel();return history.redo();},
    clearHistory(){available();active?.cancel();history.clear();},
    dispose(){active?.dispose();disposed=true;},
  });
}
export type SolidCubeSession=ReturnType<typeof createSolidCubeSession>;
