import {createTrapezohedronWorkRuntime,type TrapezohedronWorkInput} from './trapezohedron-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<TrapezohedronWorkInput>)=>void)|null};
const runtime=createTrapezohedronWorkRuntime(m=>worker.postMessage(m),fn=>setTimeout(fn,0));worker.onmessage=e=>runtime.receive(e.data);
