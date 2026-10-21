import {createSolidCubeTerrain} from '../../src/terrain/solid-cube.ts';
import {createSolidCubeSession} from '../../src/editor/solid-cube-session.ts';
import {createResponsiveSolidCubeSession,type ResponsiveCubeOptions} from '../../src/editor/solid-cube-responsive-session.ts';
import type {CubePathRole,CubePathWorkOutput} from '../../src/editor/cube-path-work-protocol.ts';
import type {CubeBrushSettings} from '../../src/terrain/solid-cube-brush.ts';
const identity={worldId:'cube-browser-worker',surfaceId:'exterior'},geometry={identity,provider:'physical-solid-cube' as const,version:1 as const,configuration:'solid' as const,role:'exterior' as const,sideLengthMeters:8};
const p=(patchId:string,u=0,v=0)=>({...identity,patchId,u,v});
const make=(n:number)=>{const t=createSolidCubeTerrain({terrainId:'browser-worker',geometry,cellsPerEdge:n});for(const k of t.samples())t.write(k,k.index===0?-0:((k.index*17)%41-20)*3);return t;};
const words=(t:ReturnType<typeof make>)=>new Uint32Array(t.copyElevations().buffer);
function check(condition:unknown,message:string):asserts condition{if(!condition)throw Error(message);}
function equal(a:Uint32Array,b:Uint32Array){check(a.length===b.length,'word length');for(let i=0;i<a.length;i++)check(a[i]===b[i],'canonical word '+i);}
const turn=()=>new Promise<void>(r=>setTimeout(r,0));
const digest=async(a:Uint32Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a.buffer as ArrayBuffer))).map(v=>v.toString(16).padStart(2,'0')).join('');
export async function exercise(options:{scenario:string;n?:number;tool?:CubeBrushSettings['tool']}){
 const {scenario}=options,n=options.n??4,tool=options.tool??'raise',terrain=make(n),before=words(terrain),referenceTerrain=make(n),reference=createSolidCubeSession(referenceTerrain);
 const settings:CubeBrushSettings={version:1,tool,radiusMeters:n>=128?.4:2,...(tool==='raise'||tool==='lower'?{strengthMeters:20}:{intensity:.8,...(tool==='flatten'?{targetElevation:43}:{})})} as CubeBrushSettings;
 const points=n>=128?[p('px',3.9),p('py',-3.9),p('py',-3.5)]:[p('px',3.9),p('py',-3.9),p('pz',-3.9),p('px',3.9)],snapshots:{words:Uint32Array;revision:number;center:unknown}[]=[];
 const ref=reference.begin(points[0]!,settings);for(const point of points.slice(1))check(ref.accept(point),'reference input');ref.release();let last=0;
 while(ref.status==='draining'){ref.pump(256);if(ref.statistics.committedDabs!==last){last=ref.statistics.committedDabs;snapshots.push({words:words(referenceTerrain),revision:referenceTerrain.revision,center:ref.statistics.lastCommittedCenter});}}
 check(ref.status==='complete','reference complete');
 const trace:unknown[]=[],instances:{raw:Worker;wrapper:Worker;terminated:boolean;observedErrors:number}[]=[],started=performance.now();
 function record(direction:string,role:CubePathRole,m:unknown){check(trace.length<8192,'fixture trace budget');const x=m as Record<string,unknown>;trace.push({at:performance.now()-started,direction,role,type:x?.type,task:x?.task,generation:x?.generation,sequence:x?.sequence,revision:x?.revision,ack:x?.ack,body:x?.type==='step'?{status:(x.body as {status?:unknown})?.status,event:(x.body as {event?:unknown})?.event}:undefined});}
 const factory=(role:CubePathRole):Worker=>{
  if(scenario==='construction'&&role==='verifier')throw Error('Browser construction fixture');
  const raw=new Worker(scenario.startsWith('crash-')?new URL('./cube-fault.worker.ts',import.meta.url):new URL('../../src/editor/cube-path.worker.ts',import.meta.url),{type:'module'});
  const wrapper={onmessage:null,onerror:null,onmessageerror:null,postMessage(message:unknown){record('host',role,message);if(scenario!=='timeout')raw.postMessage(message);},terminate(){item.terminated=true;raw.terminate();}} as unknown as Worker;
  const item={raw,wrapper,terminated:false,observedErrors:0};instances.push(item);
  raw.onmessage=event=>{const m=event.data as CubePathWorkOutput;record('worker',role,m);
   if(role==='primary'&&m.type==='step'){
    if(scenario==='corrupt'&&m.body.event?.kind==='dab')m.body.event={...m.body.event,center:{...m.body.event.center,u:m.body.event.center.u+.125}};
    if(scenario==='order')m.sequence++;
   }
   if(scenario==='stale'){wrapper.onmessage?.call(wrapper,new MessageEvent('message',{data:{...m,task:m.task-1}}));}
   wrapper.onmessage?.call(wrapper,new MessageEvent('message',{data:m}));
   if(scenario==='duplicate'&&role==='primary'&&m.type==='step')wrapper.onmessage?.call(wrapper,new MessageEvent('message',{data:m}));
  };
  raw.onerror=event=>{item.observedErrors++;record('native-error',role,{type:'error'});event.preventDefault();wrapper.onerror?.call(wrapper,event);};raw.onmessageerror=event=>wrapper.onmessageerror?.call(wrapper,event);
  return wrapper;
 };
 const opts:ResponsiveCubeOptions={mode:scenario==='disabled'?'cooperative':'worker',workerFactory:scenario==='unavailable'?()=>{throw Error('Worker unavailable fixture');}:factory,...(scenario==='timeout'?{startupTimeoutMs:5}:{})};
 const session=createResponsiveSolidCubeSession(terrain,opts),stroke=session.begin(points[0]!,settings);for(const point of points.slice(1))check(stroke.accept(point),'worker input');stroke.release();
 let count=0,published=0,error='',interrupted=false,foreign:Uint32Array|undefined;
 const verify=()=>{if(stroke.statistics.committedDabs!==published){published=stroke.statistics.committedDabs;const expected=snapshots[published-1]!;equal(words(terrain),expected.words);check(terrain.revision===expected.revision,'source epoch');check(JSON.stringify(stroke.statistics.lastCommittedCenter)===JSON.stringify(expected.center),'physical center');}};
 try{
  while(stroke.status==='drawing'||stroke.status==='draining'){
   check(++count<300000,'browser pump bound');const stats=stroke.statistics,diag=session.diagnostics!;
   const phase=scenario.split('-')[1];
   const hit=phase==='queued'&&stats.committedDabs===0||phase==='startup'&&diag.backend==='starting paired path workers'||phase==='waiting'&&diag.requests>0&&diag.verifiedSteps===0||phase==='published'&&stats.committedDabs>=2&&stats.pendingDabStage==='none'||stats.committedDabs>=2&&stats.pendingDabStage===phase;
   if(!interrupted&&scenario.startsWith('cancel-')&&hit){interrupted=true;stroke.cancel();break;}
   if(!interrupted&&scenario==='dispose'&&diag.requests>0){interrupted=true;const waiting=session.waitForProgress();session.dispose();await waiting;break;}
   if(!interrupted&&scenario==='external'&&diag.requests>0){interrupted=true;terrain.write(terrain.keyAt(terrain.sampleCount-1),17);foreign=words(terrain);}
   if(!interrupted&&scenario.startsWith('crash-')&&diag.verifiedSteps>0&&hit){
    interrupted=true;const prefix=words(terrain);instances[0]!.raw.postMessage({type:'fixture-crash'});
    for(let i=0;!instances[0]!.observedErrors;i++){check(i<1000,'native crash observed');await turn();}equal(words(terrain),prefix);
   }
   stroke.pump(scenario.startsWith('crash-')||scenario.startsWith('cancel-')?1:256);verify();await session.waitForProgress();
  }
 }catch(e){error=String(e);verify();}
 const expectedFailure=['corrupt','order','duplicate','external'].includes(scenario)||scenario.startsWith('crash-');
 if(expectedFailure)check(stroke.status==='failed'&&error.length>0,'explicit failed prefix');
 else if(scenario.startsWith('cancel-'))check(stroke.status==='cancelled'&&interrupted,'cancel phase reached');
 else if(scenario==='dispose')check(stroke.status==='disposed','disposed prefix');
 else check(stroke.status==='complete'&&!error,'complete ordered drain '+error);
 const prefix=words(terrain),committed=stroke.statistics.committedDabs;
 if(scenario==='external')equal(prefix,foreign!);else equal(prefix,committed?snapshots[committed-1]!.words:before);
 const operations=session.history.operations;
 if(committed){check(operations.length===1,'one gesture operation');const expectedBefore=before.slice();if(scenario==='external')expectedBefore[expectedBefore.length-1]=new Uint32Array(Float32Array.of(17).buffer)[0]!;
  // Disposed sessions intentionally reject normal history actions; their authoritative prefix is still save-safe.
  if(!session.disposed){session.undo();equal(words(terrain),expectedBefore);session.redo();equal(words(terrain),prefix);}
 }else check(operations.length===0,'no empty operation');
 if(stroke.status==='complete')check(JSON.stringify([...session.history.changes(0)])===JSON.stringify([...reference.history.changes(0)]),'complete history words/order');
 if(scenario==='rapid'){
  for(let i=0;i<2;i++){session.undo();const s=session.begin(points[0]!,settings);for(const point of points.slice(1))check(s.accept(point),'rapid input');s.release();while(s.status==='draining'){s.pump(256);await session.waitForProgress();}check(s.status==='complete','rapid stroke complete');equal(words(terrain),prefix);}
  check(session.diagnostics!.pool.created===2&&session.diagnostics!.pool.reused===4,'bounded warm pool');check(session.history.operations.length===1&&!session.history.canRedo,'history branch');
 }
 const diagnostics=session.diagnostics;session.dispose();reference.dispose();await turn();check(instances.every(w=>w.terminated),'all native worker instances terminated');
 const result={...options,status:stroke.status,error,committedDabs:committed,fullWordsComparedPerPublication:terrain.sampleCount,sourceSha256:await digest(before),prefixSha256:await digest(prefix),exactWords:true,exactHistory:true,diagnostics,disposedDiagnostics:session.diagnostics,nativeWorkers:instances.length,nativeErrors:instances.reduce((a,w)=>a+w.observedErrors,0),allWorkersTerminated:true,trace};
 document.getElementById('status')!.textContent=JSON.stringify({...result,trace:`${trace.length} actual wire events recorded`},null,2);return result;
}
