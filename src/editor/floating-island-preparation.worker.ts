import {createFloatingIslandWorkRuntime,type FloatingIslandWorkInput} from './floating-island-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<FloatingIslandWorkInput>)=>void)|null};
const runtime=createFloatingIslandWorkRuntime(m=>worker.postMessage(m),fn=>setTimeout(fn,0));worker.onmessage=e=>runtime.receive(e.data);
