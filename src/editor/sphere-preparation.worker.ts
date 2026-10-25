import { createSphereWorkRuntime } from './sphere-work-runtime.ts';
import type { SphereWorkInput } from './sphere-work-protocol.ts';
// Rounded Crescent's small acknowledged dabs use yielding tasks without the
// nested timer clamp. Native Sphere keeps its established timer scheduler.
let roundedScheduling=false;const channel=new MessageChannel(),pending:(()=>void)[]=[];
channel.port1.onmessage=()=>pending.shift()?.();
const runtime=createSphereWorkRuntime(message=>{const transfer=message.type==='prepared'?[message.indices.buffer,message.before.buffer,message.after.buffer]:[];postMessage(message,{transfer});},fn=>{if(roundedScheduling){pending.push(fn);channel.port2.postMessage(0);}else setTimeout(fn,0);});
self.onmessage=(event:MessageEvent<SphereWorkInput>)=>{if(event.data.type==='warm'||event.data.type==='start')roundedScheduling=!!event.data.roundedGeometry;runtime.receive(event.data);};
