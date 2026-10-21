// Test-only crashable realm. Numerical execution is the production runtime.
import {createCubePathWorkRuntime} from '../../src/editor/cube-path-work-runtime.ts';
import type {CubePathWorkInput} from '../../src/editor/cube-path-work-protocol.ts';
const channel=new MessageChannel();let next:(()=>void)|undefined;
channel.port1.onmessage=()=>{const fn=next;next=undefined;fn?.();};
const create=()=>createCubePathWorkRuntime(message=>postMessage(message),fn=>{if(next)throw Error('Fixture queue exceeded');next=fn;channel.port2.postMessage(0);});
let runtime:ReturnType<typeof create>|undefined;
self.onmessage=(event:MessageEvent<CubePathWorkInput|{type:'fixture-crash'}>)=>{
 if(event.data.type==='fixture-crash')throw Error('Intentional native cube worker crash');
 if(event.data.type==='start'&&(!runtime||runtime.completed)){runtime?.dispose();runtime=create();}
 runtime?.receive(event.data);
};
