import {createOctahedronWorkRuntime,type OctahedronWorkInput} from './octahedron-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<OctahedronWorkInput>)=>void)|null};
const runtime=createOctahedronWorkRuntime(m=>worker.postMessage(m),fn=>setTimeout(fn,0));worker.onmessage=e=>runtime.receive(e.data);
