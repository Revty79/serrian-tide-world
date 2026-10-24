import{createCrescentWorkRuntime,type CrescentWorkInput}from'./crescent-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<CrescentWorkInput>)=>void)|null};
const runtime=createCrescentWorkRuntime(m=>worker.postMessage(m),fn=>setTimeout(fn,0));worker.onmessage=e=>runtime.receive(e.data);
