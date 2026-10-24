import{createHorseshoeWorkRuntime,type HorseshoeWorkInput}from'./horseshoe-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<HorseshoeWorkInput>)=>void)|null};
const runtime=createHorseshoeWorkRuntime(m=>worker.postMessage(m),fn=>setTimeout(fn,0));worker.onmessage=e=>runtime.receive(e.data);
