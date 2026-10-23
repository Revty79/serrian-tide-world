import {createTetrahedronWorkRuntime,type TetrahedronWorkInput} from './tetrahedron-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<TetrahedronWorkInput>)=>void)|null};
const runtime=createTetrahedronWorkRuntime(m=>worker.postMessage(m),fn=>setTimeout(fn,0));worker.onmessage=e=>runtime.receive(e.data);
