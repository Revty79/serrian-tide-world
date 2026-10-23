import {createPyramidWorkRuntime,type PyramidWorkInput} from './pyramid-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<PyramidWorkInput>)=>void)|null};
const runtime=createPyramidWorkRuntime(m=>worker.postMessage(m),fn=>setTimeout(fn,0));worker.onmessage=e=>runtime.receive(e.data);
