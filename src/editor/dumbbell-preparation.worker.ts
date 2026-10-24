import{createDumbbellWorkRuntime,type DumbbellWorkInput}from'./dumbbell-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<DumbbellWorkInput>)=>void)|null};
const runtime=createDumbbellWorkRuntime(m=>worker.postMessage(m),fn=>setTimeout(fn,0));worker.onmessage=e=>runtime.receive(e.data);
