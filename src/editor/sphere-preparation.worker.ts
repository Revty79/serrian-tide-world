import { createSphereWorkRuntime } from './sphere-work-runtime.ts';
import type { SphereWorkInput } from './sphere-work-protocol.ts';
const runtime=createSphereWorkRuntime(message=>{const transfer=message.type==='prepared'?[message.indices.buffer,message.before.buffer,message.after.buffer]:[];postMessage(message,{transfer});},fn=>setTimeout(fn,0));
self.onmessage=(event:MessageEvent<SphereWorkInput>)=>runtime.receive(event.data);
