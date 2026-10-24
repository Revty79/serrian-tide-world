import {createTorusWorkRuntime,type TorusWorkInput} from './torus-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<TorusWorkInput>)=>void)|null};
const runtime=createTorusWorkRuntime(m=>worker.postMessage(m),fn=>setTimeout(fn,0));worker.onmessage=e=>runtime.receive(e.data);
