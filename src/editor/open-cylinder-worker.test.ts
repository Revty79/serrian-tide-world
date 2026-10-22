import test from 'node:test';import assert from 'node:assert/strict';
import {createOpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import {beginOpenCylinderStroke} from '../terrain/open-cylinder-stroke.ts';
import {beginWorkerOpenCylinderStroke} from './open-cylinder-work.ts';
import {createOpenCylinderWorkRuntime,createOpenWorkerTerrain,type OpenCylinderWorkInput} from './open-cylinder-work-runtime.ts';
import {createConnectedHistory} from './connected-history.ts';
import type {ConnectedWorkOutput} from './connected-work-protocol.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS} from './physical-brush-policy.ts';
const identity={worldId:'worker-open',surfaceId:'one-parent'},geometry={identity,provider:'physical-open-cylinder' as const,version:1 as const,configuration:'both-open' as const,outerRadiusMeters:1e6,innerRadiusMeters:8e5,lengthMeters:16e5};
function make(n:number){return createOpenCylinderTerrain({terrainId:'authority',geometry,resolution:{angularSamples:n,axialCells:n/2,radialCells:n/4},initialElevation:-100});}
const words=(t:ReturnType<typeof make>)=>new Uint32Array(t.copyElevations().buffer),turn=()=>new Promise<void>(r=>setImmediate(r));
function factory(corrupt=(m:ConnectedWorkOutput)=>m){return()=>{let dead=false;const port={onmessage:undefined as((e:{data:ConnectedWorkOutput})=>void)|undefined,terminate(){dead=true;},postMessage(m:OpenCylinderWorkInput){setImmediate(()=>{if(!dead)runtime.receive(m);});}};const runtime=createOpenCylinderWorkRuntime(m=>setImmediate(()=>{if(!dead)port.onmessage?.({data:corrupt(m)});}),f=>setImmediate(()=>{if(!dead)f();}));return port as unknown as Worker;};}
async function finish(s:ReturnType<typeof beginWorkerOpenCylinderStroke>){for(let i=0;s.status==='drawing'||s.status==='draining';i++){assert.ok(i<100000);s.pump();await turn();}}
for(const n of[128,256])for(const tool of['raise','lower','smooth','flatten']as const)test(`Open N${n} ${tool}: accepted worker gives exact canonical words/history over both annuli, four joins and periodic seam`,async()=>{
 for(const patch of['rim-start','rim-end']as const){const t=make(n),reference=make(n);for(let i=0;i<t.sampleCount;i++){const h=Math.fround(-100+(i*13%17)*20);t.write(t.keyAt(i),h);reference.write(reference.keyAt(i),h);}t.write(t.keyAt(1),-0);reference.write(reference.keyAt(1),-0);
  const before=words(t),history=createConnectedHistory(t),rh=createConnectedHistory(reference),settings:CylindricalBrushSettings=tool==='raise'||tool==='lower'?{version:1,tool,radiusMeters:83700,strengthMeters:200}:tool==='smooth'?{version:1,tool,radiusMeters:83700,intensity:.5}:{version:1,tool,radiusMeters:83700,intensity:.5,targetElevation:200};
  const options={spacingMeters:83700*.2371,dabLimits:PHYSICAL_PREVIEW_DAB_LIMITS,maxDabs:2048},end=patch==='rim-end',points=[{patchId:'outer-wall',u:Math.PI-.025,v:end?1590000:10000},{patchId:patch,u:Math.PI-.025,v:end?10000:190000},{patchId:patch,u:Math.PI-.01,v:100000},{patchId:patch,u:-Math.PI+.01,v:end?190000:10000},{patchId:'inner-wall',u:-Math.PI+.025,v:end?10000:1590000}].map(p=>({...identity,...p}));
  const a=beginWorkerOpenCylinderStroke(t,history,points[0]!,settings,options,()=>{},factory()),b=beginOpenCylinderStroke(reference,rh,points[0]!,settings,options);
  for(const p of points.slice(1)){a.move(p);b.move(p);}a.release();b.release();while(b.status==='draining')b.pump(16);await finish(a);
  assert.equal(a.status,'complete');assert.equal(a.diagnostics.backend,'worker');assert.deepEqual(words(t),words(reference));assert.deepEqual([...history.changes(0)],[...rh.changes(0)]);const after=words(t);history.undo();assert.deepEqual(words(t),before);history.redo();assert.deepEqual(words(t),after);
 }
});
test('Open worker rejects closed-provider/foreign layout and stale proposals before canonical publication',async()=>{
 const t=make(128),metadata=t.metadata;assert.throws(()=>createOpenWorkerTerrain({...metadata,geometry:{...metadata.geometry,provider:'physical-closed-cylinder'}} as unknown as typeof metadata));assert.throws(()=>createOpenWorkerTerrain({...metadata,identity:{...identity,surfaceId:'foreign'}}));
 const before=words(t),s=beginWorkerOpenCylinderStroke(t,createConnectedHistory(t),{...identity,patchId:'rim-end',u:0,v:100000},{version:1,tool:'raise',radiusMeters:83700,strengthMeters:200},{spacingMeters:20000,dabLimits:PHYSICAL_PREVIEW_DAB_LIMITS},()=>{},factory(m=>{if(m.type==='prepared')m.sourceRevision++;return m;}));s.release();await finish(s);assert.equal(s.status,'failed');assert.deepEqual(words(t),before);
});
