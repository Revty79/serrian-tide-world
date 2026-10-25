import {createRibbonGeometry,type RibbonConfiguration} from '../surfaces/ribbon.ts';
import{createRibbonWorkRuntime,type RibbonWorkInput}from'./ribbon-work.ts';
const worker=globalThis as unknown as{postMessage(message:unknown):void;onmessage:((event:MessageEvent<RibbonWorkInput|{type:'warm';geometry:RibbonConfiguration}>)=>void)|null};
// Reuse the accepted Cube worker's single pending MessageChannel turn.
// The runtime keeps its existing six-millisecond slice and canonical ACK gate.
const channel=new MessageChannel();let next:(()=>void)|undefined;
channel.port1.onmessage=()=>{const fn=next;next=undefined;fn?.();};
const runtime=createRibbonWorkRuntime(m=>worker.postMessage(m),fn=>{if(next)throw Error('Ribbon worker scheduling queue exceeded');next=fn;channel.port2.postMessage(0);});worker.onmessage=e=>{if(e.data?.type==='warm'){createRibbonGeometry(e.data.geometry);return;}runtime.receive(e.data);};
