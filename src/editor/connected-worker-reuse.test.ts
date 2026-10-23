import {test} from 'node:test';import assert from 'node:assert/strict';
import {createOctahedronTerrain} from '../terrain/octahedron.ts';
import {beginOctahedronStroke} from '../terrain/octahedron-brush.ts';
import {createOctahedronWorkRuntime,beginWorkerOctahedronStroke} from './octahedron-work.ts';
import {OctahedronSession} from './octahedron-session.ts';
import {createConnectedHistory} from './connected-history.ts';
import {initialOctahedronView} from '../rendering/octahedron-view.ts';
import type {ConnectedWorkerFactory} from './connected-session-contracts.ts';
import type {ConnectedWorkOutput} from './connected-work-protocol.ts';
import type {CylindricalBrushSettings} from '../terrain/connected-brush.ts';
const turn=()=>new Promise<void>(r=>setImmediate(r));
const terrain=(id:string,n=16,edge=1e6)=>createOctahedronTerrain({terrainId:id,geometry:{provider:'physical-regular-octahedron',version:1,identity:{worldId:id,surfaceId:id},role:'exterior',edgeLengthMeters:edge},subdivisions:n});
const brush:CylindricalBrushSettings={version:1,tool:'raise',strengthMeters:200,radiusMeters:80000},words=(t:ReturnType<typeof terrain>)=>new Uint32Array(t.copyElevations().buffer);
function ports(){
 const instances:{dead:boolean;tasks:number[];worker:Worker}[]=[];let corrupt=false;
 const create=()=>{
  const entry={dead:false,tasks:[] as number[],worker:undefined as unknown as Worker};
  const port={onmessage:null as null|((e:{data:ConnectedWorkOutput})=>void),onerror:null,onmessageerror:null,terminate(){entry.dead=true;},postMessage(m:Parameters<ReturnType<typeof createOctahedronWorkRuntime>['receive']>[0]){if(m.type==='start')entry.tasks.push(m.task);setImmediate(()=>{if(!entry.dead)runtime.receive(m);});}};
  const runtime=createOctahedronWorkRuntime(m=>setImmediate(()=>{if(entry.dead)return;if(corrupt&&m.type==='prepared'){m.indices[0]=1e9;corrupt=false;}port.onmessage?.({data:m});}),fn=>setImmediate(()=>{if(!entry.dead)fn();}));entry.worker=port as unknown as Worker;instances.push(entry);return entry.worker;
 };return{create,instances,corrupt:()=>{corrupt=true;}};
}
async function finishSession(s:OctahedronSession){for(let i=0;s.painting;i++){assert.ok(i<100000);s.pump(3);await turn();}}
test('host retains only clean idle worker realms across strokes/previews and retires cancelled, failed and disposed tasks',async()=>{
 const t=terrain('host'),s=new OctahedronSession(t,'worker reuse'),p={...t.metadata.identity,patchId:'ppp',u:.3,v:.3},view=initialOctahedronView(t.geometry),fake=ports();for(const _ of s.cache.prepare()){void _;}s.enableWorkers(fake.create);
 for(let i=0;i<3;i++){assert.equal(s.begin(p,brush,view),true);s.release();await finishSession(s);assert.equal(s.statistics.failures,0);}
 const reused=fake.instances[0]!;assert.equal(reused.tasks.length,3);assert.equal(reused.dead,false);assert.ok(fake.instances.filter(p=>!p.dead).length<=1);
 s.requestPreview(p,brush,view);await new Promise(r=>setTimeout(r,100));s.requestPreview(p,brush,view);for(let i=0;s.previewPending;i++){assert.ok(i<100000);await turn();}assert.ok(s.stencil);assert.equal(reused.tasks.length,3);assert.equal(reused.dead,false);assert.ok(fake.instances.filter(p=>!p.dead).length<=1);
 const before=words(t);fake.corrupt();s.begin(p,brush,view);s.release();await finishSession(s);assert.equal(s.statistics.failures,1);assert.equal(reused.dead,true);assert.deepEqual(words(t),before);
 const prior=fake.instances.filter(p=>!p.dead)[0]!;s.begin(p,brush,view);s.cancel('test cancellation');assert.equal(prior.dead,true);assert.deepEqual(words(t),before);
 s.begin(p,brush,view);s.release();await finishSession(s);assert.equal(s.statistics.failures,1);assert.notDeepEqual(words(t),before);s.dispose();assert.ok(fake.instances.every(p=>p.dead));
});
test('a reused runtime validates fresh geometry/identities/words each task and matches cooperative four-tool history exactly',async()=>{
 const fake=ports();let idle:Worker|undefined;
 const factory:ConnectedWorkerFactory=Object.assign(()=>{const w=idle??fake.create();idle=undefined;return w;},{release:(w:Worker,completed:boolean)=>{if(completed){w.onmessage=null;idle=w;}else w.terminate();}});
 for(const[index,tool]of(['raise','lower','smooth','flatten']as const).entries()){
  const t=terrain('scope-'+index,16+index,1e6+index*1e5),ref=terrain('scope-'+index,16+index,1e6+index*1e5);
  for(let i=0;i<t.sampleCount;i++){const value=i===0?-0:(i%11-5)*20;t.write(t.keyAt(i),value);ref.write(ref.keyAt(i),value);}
  const first=words(t),h=createConnectedHistory(t),rh=createConnectedHistory(ref),a={...t.metadata.identity,patchId:'ppp',u:.3,v:.3},b={...a,u:.38,v:.3},settings=tool==='raise'||tool==='lower'?{...brush,tool}:{version:1 as const,tool,radiusMeters:brush.radiusMeters,intensity:.5,...(tool==='flatten'?{targetElevation:300}:{})},options={spacingMeters:10000,maxDabs:100};
  const actual=beginWorkerOctahedronStroke(t,h,a,settings as CylindricalBrushSettings,options,()=>{},factory),expected=beginOctahedronStroke(ref,rh,a,settings as CylindricalBrushSettings,options);actual.move(b);expected.move(b);actual.release();expected.release();while(expected.status==='draining')expected.pump(16);
  for(let i=0;actual.status==='draining';i++){assert.ok(i<100000);await turn();}assert.equal(actual.status,'complete');assert.deepEqual(words(t),words(ref));assert.deepEqual(h.operations,rh.operations);const end=words(t);h.undo();assert.deepEqual(words(t),first);h.redo();assert.deepEqual(words(t),end);
 }assert.equal(fake.instances.length,1);assert.equal(fake.instances[0]!.tasks.length,4);idle?.terminate();
});
