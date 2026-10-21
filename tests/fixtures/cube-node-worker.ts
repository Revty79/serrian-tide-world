import {createCubePathWorkRuntime} from '../../src/editor/cube-path-work-runtime.ts';
import type {CubePathRole,CubePathWorkInput,CubePathWorkOutput} from '../../src/editor/cube-path-work-protocol.ts';
import {createResponsiveSolidCubeSession} from '../../src/editor/solid-cube-responsive-session.ts';
import type {SolidCubeTerrain} from '../../src/terrain/solid-cube.ts';
import type {CubeHistoryLimits} from '../../src/editor/solid-cube-history.ts';
import type {SolidCubeStroke} from '../../src/editor/solid-cube-session.ts';

export function cubeNodeWorkers(transform?:(role:CubePathRole,message:CubePathWorkOutput)=>CubePathWorkOutput[]){
 const queue:{worker:FakeWorker;fn:()=>void}[]=[],workers:FakeWorker[]=[],messages:{role:CubePathRole;message:CubePathWorkOutput}[]=[];
 class FakeWorker{
  onmessage:Worker['onmessage']=null;onerror:Worker['onerror']=null;onmessageerror:Worker['onmessageerror']=null;terminated=false;
  readonly role:CubePathRole;runtime:ReturnType<typeof createCubePathWorkRuntime>;
  constructor(role:CubePathRole){this.role=role;this.runtime=this.createRuntime();workers.push(this);}
  createRuntime(){return createCubePathWorkRuntime(message=>{
    const role=this.role;
    const copy=structuredClone(message);messages.push({role,message:copy});
    for(const result of transform?transform(role,copy):[copy])queue.push({worker:this,fn:()=>this.onmessage?.call(this as unknown as Worker,new MessageEvent('message',{data:result}))});
   },fn=>queue.push({worker:this,fn}));}
  postMessage(input:CubePathWorkInput){const copy=structuredClone(input);queue.push({worker:this,fn:()=>{if(copy.type==='start'&&this.runtime.completed){this.runtime.dispose();this.runtime=this.createRuntime();}this.runtime.receive(copy);}});}
  terminate(){this.terminated=true;this.runtime.dispose();}
  crash(message='Injected cube worker failure'){this.onerror?.call(this as unknown as Worker,{message,preventDefault(){}} as ErrorEvent);}
  decodeFailure(){this.onmessageerror?.call(this as unknown as Worker,new MessageEvent('messageerror'));}
 }
 return {workers,messages,
  factory:(role:CubePathRole)=>new FakeWorker(role) as unknown as Worker,
  tick(){const task=queue.shift();if(task&&!task.worker.terminated)task.fn();},
  get pending(){return queue.length;},
 };
}

/** Verification-only deterministic message turns, never a timing substitute for browser workers. */
export function createSolidCubeSession(terrain:SolidCubeTerrain,historyLimits:CubeHistoryLimits={}){
 const rig=cubeNodeWorkers(),base=createResponsiveSolidCubeSession(terrain,{mode:'worker',historyLimits,workerFactory:rig.factory}),wrapped=new WeakMap<SolidCubeStroke,SolidCubeStroke>();
 const wrap=(stroke:SolidCubeStroke)=>{
  let result=wrapped.get(stroke);if(result)return result;
  result=Object.freeze({settings:stroke.settings,get status(){return stroke.status;},get failure(){return stroke.failure;},get statistics(){return stroke.statistics;},
   accept:stroke.accept,release:stroke.release,cancel:stroke.cancel,dispose:stroke.dispose,pump(steps=256){const status=stroke.pump(steps);rig.tick();return status;}});
  wrapped.set(stroke,result);return result;
 };
 return Object.freeze({terrain:base.terrain,history:base.history,binding:base.binding,
  get stroke(){return base.stroke?wrap(base.stroke):undefined;},get lastStroke(){return base.lastStroke?wrap(base.lastStroke):undefined;},get disposed(){return base.disposed;},get diagnostics(){return base.diagnostics;},
  begin(...args:Parameters<typeof base.begin>){return wrap(base.begin(...args));},
  pump(steps=256){const status=base.pump(steps);rig.tick();return status;},release:base.release,cancel:base.cancel,undo:base.undo,redo:base.redo,clearHistory:base.clearHistory,dispose:base.dispose,
 });
}
