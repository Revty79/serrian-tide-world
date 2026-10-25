import{createSpiralWorkRuntime,type SpiralWorkInput}from'./spiral-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<SpiralWorkInput>)=>void)|null};
// Reuse the accepted Cube worker's single pending MessageChannel turn.
// The runtime keeps its existing six-millisecond slice and canonical ACK gate.
const channel=new MessageChannel();let next:(()=>void)|undefined;
channel.port1.onmessage=()=>{const fn=next;next=undefined;fn?.();};
const runtime=createSpiralWorkRuntime(m=>worker.postMessage(m),fn=>{if(next)throw Error('Spiral worker scheduling queue exceeded');next=fn;channel.port2.postMessage(0);});worker.onmessage=e=>runtime.receive(e.data);
