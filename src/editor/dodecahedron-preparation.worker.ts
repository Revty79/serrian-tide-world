import {createDodecahedronWorkRuntime,type DodecahedronWorkInput} from './dodecahedron-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<DodecahedronWorkInput>)=>void)|null};
const runtime=createDodecahedronWorkRuntime(m=>worker.postMessage(m),fn=>setTimeout(fn,0));worker.onmessage=e=>runtime.receive(e.data);
