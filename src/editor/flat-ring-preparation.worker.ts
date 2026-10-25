import {createFlatRingWorkRuntime,type OpenCylinderWorkInput} from './flat-ring-work-runtime.ts';
const runtime=createFlatRingWorkRuntime(message=>postMessage(message,{transfer:message.type==='prepared'?[message.indices.buffer,message.before.buffer,message.after.buffer]:[]}),fn=>setTimeout(fn,0));
self.onmessage=(event:MessageEvent<OpenCylinderWorkInput>)=>runtime.receive(event.data);
