import {createIcosahedronWorkRuntime,type IcosahedronWorkInput} from './icosahedron-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<IcosahedronWorkInput>)=>void)|null};
const runtime=createIcosahedronWorkRuntime(m=>worker.postMessage(m),fn=>setTimeout(fn,0));worker.onmessage=e=>runtime.receive(e.data);
