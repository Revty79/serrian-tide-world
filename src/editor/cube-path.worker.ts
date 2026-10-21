import {createCubePathWorkRuntime} from './cube-path-work-runtime.ts';
import type {CubePathWorkInput} from './cube-path-work-protocol.ts';
import {paintingStage} from './painting-metrics.ts';
// The isolated measurement server instruments unchanged C2A calls through this hook.
// The production geometry module contains no clock or hook calls.
Object.assign(globalThis,{__cubeStage:paintingStage});
const channel=new MessageChannel();let next:(()=>void)|undefined;
channel.port1.onmessage=()=>{const fn=next;next=undefined;fn?.();};
const createRuntime=()=>createCubePathWorkRuntime(message=>postMessage(message),fn=>{if(next)throw Error('Cube worker scheduling queue exceeded');next=fn;channel.port2.postMessage(0);});
let runtime:ReturnType<typeof createRuntime>|undefined;
self.onmessage=(event:MessageEvent<CubePathWorkInput>)=>{
 if(event.data.type==='start'&&(!runtime||runtime.completed)){runtime?.dispose();runtime=createRuntime();}
 runtime?.receive(event.data);
};
