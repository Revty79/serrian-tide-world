import{createArcWorkRuntime,type ArcWorkInput}from'./arc-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<ArcWorkInput>)=>void)|null};
const runtime=createArcWorkRuntime(m=>worker.postMessage(m),fn=>setTimeout(fn,0));worker.onmessage=e=>runtime.receive(e.data);
