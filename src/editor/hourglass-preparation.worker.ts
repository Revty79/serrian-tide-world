import{createHourglassWorkRuntime,type HourglassWorkInput}from'./hourglass-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<HourglassWorkInput>)=>void)|null};
const runtime=createHourglassWorkRuntime(m=>worker.postMessage(m),fn=>setTimeout(fn,0));worker.onmessage=e=>runtime.receive(e.data);
