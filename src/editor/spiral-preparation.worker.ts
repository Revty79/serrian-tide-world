import{createSpiralWorkRuntime,type SpiralWorkInput}from'./spiral-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<SpiralWorkInput>)=>void)|null};
const runtime=createSpiralWorkRuntime(m=>worker.postMessage(m),fn=>setTimeout(fn,0));worker.onmessage=e=>runtime.receive(e.data);
