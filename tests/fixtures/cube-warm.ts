// Separate matched repeated-session experiment; cold matrix fixture remains unchanged.
import {createSolidCubeTerrain} from '../../src/terrain/solid-cube.ts';
import {createSolidCubeSession} from '../../src/editor/solid-cube-session.ts';
import type {SolidCubeStroke, SolidCubeSession} from '../../src/editor/solid-cube-session.ts';
import type {CubeBrushSettings} from '../../src/terrain/solid-cube-brush.ts';
import type {SolidCubeFace} from '../../src/surfaces/solid-cube.ts';

declare global {var __cubeStage:<T>(name:string,fn:()=>T)=>T;}
let samples:Record<string,number[]>={};
globalThis.__cubeStage=(name,fn)=>{const at=performance.now();try{return fn();}finally{(samples[name]??=[]).push(performance.now()-at);}};
const identity={worldId:'cube-c2b2-fixture',surfaceId:'exterior'},geometry={identity,provider:'physical-solid-cube' as const,version:1 as const,configuration:'solid' as const,role:'exterior' as const,sideLengthMeters:1024};
const p=(patchId:SolidCubeFace,u=0,v=0)=>({...identity,patchId,u,v});
export const workloads=[
 ...(['px','nx','py','ny','pz','nz'] as const).map(face=>({label:'face-'+face,radius:40.96,inputs:[p(face,-10),p(face,10)]})),
 {label:'ordinary-edge',radius:40.96,inputs:[p('px',490),p('py',-490)]},
 {label:'ordinary-corner',radius:40.96,inputs:[p('px',500,500),p('py',-500,500)]},
 {label:'wide-edge',radius:563.2,inputs:[p('px',500),p('py',-200)]},
 {label:'wide-corner',radius:563.2,inputs:[p('px',500,500),p('py',-300,500)]},
 {label:'four-face-long',radius:256,inputs:[p('px',-409.6,-307.2),p('nx',-307.2,409.6)]},
 {label:'bending-65',radius:128,inputs:Array.from({length:65},(_,i)=>p('px',-128+4*i,64*Math.sin(i/8)))},
 {label:'ambiguous-reverse',radius:512,inputs:[p('px',128),p('px'),p('nx'),p('px')]},
];
const channel=new MessageChannel();let resolveTurn:(()=>void)|undefined;
channel.port1.onmessage=()=>{const next=resolveTurn;resolveTurn=undefined;next?.();};
const turn=()=>new Promise<void>(r=>{if(resolveTurn)throw Error('Concurrent fixture scheduling');resolveTurn=r;channel.port2.postMessage(0);});
const frame=()=>new Promise<void>(r=>requestAnimationFrame(()=>r()));
const digest=async(bytes:ArrayBufferView)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.buffer as ArrayBuffer))).map(v=>v.toString(16).padStart(2,'0')).join('');
type ResponsiveSession=SolidCubeSession & {diagnostics?:unknown;waitForProgress?:()=>Promise<void>};
const cache=new Map<string,{terrain:ReturnType<typeof createSolidCubeTerrain>;session:ResponsiveSession}>();
export async function run(options:{n:number;tool:CubeBrushSettings['tool'];label:string;mode?:string;trial?:number}){
 const work=workloads.find(w=>w.label===options.label);if(!work)throw Error('Unknown cube workload');
 const key=JSON.stringify([options.n,options.tool,options.label,options.mode]),previous=cache.get(key);
 if(previous)previous.session.undo();
 const terrain=previous?.terrain??createSolidCubeTerrain({terrainId:'cube-measured-'+options.n,geometry,cellsPerEdge:options.n});
 if(!previous)for(const key of terrain.samples())terrain.write(key,key.index===0?-0:((key.index*17)%41-20)*3);
 const sourceRevision=terrain.revision,source=terrain.copyElevations(),settings:CubeBrushSettings={version:1,tool:options.tool,radiusMeters:work.radius,
  ...(options.tool==='raise'||options.tool==='lower'?{strengthMeters:30}:{intensity:.8,...(options.tool==='flatten'?{targetElevation:43}:{})})} as CubeBrushSettings;
 let session:ResponsiveSession;
 if(previous)session=previous.session;
 else if(!options.mode||options.mode==='cooperative')session=createSolidCubeSession(terrain);
 else{const url=new URL('/src/editor/solid-cube-responsive-session.ts',location.origin).href;const module=await import(/* @vite-ignore */ url);session=module.createResponsiveSolidCubeSession(terrain,{mode:options.mode});}
 cache.set(key,{terrain,session});
 await frame();await frame();samples={};
 const frameGaps:number[]=[],tasks:number[]=[],pumps:{stage:string;ms:number}[]=[],acceptMs:number[]=[],commits:{ordinal:number;revision:number;atMs:number;center:unknown}[]=[];
 let previousFrame=performance.now(),raf=0,observing=true;
 const observeFrame=(time:number)=>{if(!observing)return;frameGaps.push(time-previousFrame);previousFrame=time;raf=requestAnimationFrame(observeFrame);};raf=requestAnimationFrame(observeFrame);
 const observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())tasks.push(entry.duration);});observer.observe({type:'longtask',buffered:false});
 const started=performance.now();let at=performance.now(),stroke:SolidCubeStroke;
 try{stroke=session.begin(work.inputs[0]!,settings);}catch(e){observing=false;cancelAnimationFrame(raf);observer.disconnect();session.dispose();throw e;}
 const beginMs=performance.now()-at;let next=1,released=false,error:string|undefined,lastCommitted=0,firstCommitMs:number|undefined;
 try{
  while(stroke.status==='drawing'||stroke.status==='draining'){
   if(!released){while(next<work.inputs.length){at=performance.now();const accepted=stroke.accept(work.inputs[next]!);acceptMs.push(performance.now()-at);if(!accepted)break;next++;}if(next===work.inputs.length){stroke.release();released=true;}}
   at=performance.now();try{stroke.pump(256);}finally{const ms=performance.now()-at;pumps.push({stage:stroke.statistics.lastStage,ms});}
   const stats=stroke.statistics;if(stats.committedDabs!==lastCommitted){lastCommitted=stats.committedDabs;const elapsed=performance.now()-started;if(stats.writes&&!firstCommitMs)firstCommitMs=elapsed;commits.push({ordinal:stats.lastCommittedDabOrdinal!,revision:terrain.revision,atMs:elapsed,center:stats.lastCommittedCenter});}
   if(session.waitForProgress)await session.waitForProgress();else await turn();
  }
 }catch(e){error=String(e);}
 const drainMs=performance.now()-started;observing=false;cancelAnimationFrame(raf);await turn();for(const entry of observer.takeRecords())tasks.push(entry.duration);observer.disconnect();
 const final=terrain.copyElevations(),operations=session.history.operations,history=Array.from({length:operations.length},(_,i)=>[...session.history.changes(i)]),statistics=stroke.statistics,diagnostics=session.diagnostics;
 at=performance.now();const undo=session.undo(),undoMs=performance.now()-at;const undone=terrain.copyElevations();
 if(!new Uint32Array(source.buffer).every((v,i)=>v===new Uint32Array(undone.buffer)[i]))throw Error('Fixture full-word Undo mismatch');
 at=performance.now();const redo=session.redo(),redoMs=performance.now()-at;const redone=terrain.copyElevations();
 if(!new Uint32Array(final.buffer).every((v,i)=>v===new Uint32Array(redone.buffer)[i]))throw Error('Fixture full-word Redo mismatch');
 const result={...options,radiusMeters:work.radius,inputs:work.inputs,sourceRevision,status:stroke.status,error,beginMs,acceptMs,firstCommitMs,drainMs,pumps,stages:samples,frameGaps,longTasks:tasks,commits,statistics,diagnostics,historyStatistics:session.history.statistics,operations,
  sourceSha256:await digest(source),finalSha256:await digest(final),historySha256:await digest(new TextEncoder().encode(JSON.stringify(history))),undo,redo,undoMs,redoMs,exactReplay:true};
 if(options.trial===2){session.dispose();cache.delete(key);}document.getElementById('status')!.textContent=JSON.stringify({n:options.n,tool:options.tool,label:options.label,mode:options.mode,status:result.status,drainMs,firstCommitMs},null,2);return result;
}
