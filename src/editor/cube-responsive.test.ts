import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createSolidCubeTerrain} from '../terrain/solid-cube.ts';
import {createSolidCubeSession as acceptedSession, type SolidCubeStroke} from './solid-cube-session.ts';
import {createSolidCubeSession as workerSession,cubeNodeWorkers} from '../../tests/fixtures/cube-node-worker.ts';
import {createResponsiveSolidCubeSession} from './solid-cube-responsive-session.ts';
import {createCubeValueComparison} from './cube-work-value.ts';
import {SOLID_CUBE_FACES,SOLID_CUBE_PHYSICAL_EDGES,SOLID_CUBE_CORNERS} from '../surfaces/solid-cube.ts';
import type {CubePathWorkOutput} from './cube-path-work-protocol.ts';
import type {CubeBrushSettings} from '../terrain/solid-cube-brush.ts';
import type {SolidCubeFace} from '../surfaces/solid-cube.ts';
const identity={worldId:'responsive-cube',surfaceId:'exterior'},geometry={identity,provider:'physical-solid-cube' as const,version:1 as const,configuration:'solid' as const,role:'exterior' as const,sideLengthMeters:8};
const p=(patchId:SolidCubeFace,u=0,v=0)=>({...identity,patchId,u,v});
const make=(n=4,configuration=geometry)=>{const t=createSolidCubeTerrain({terrainId:'cube-check',geometry:configuration,cellsPerEdge:n});for(const key of t.samples())t.write(key,key.index===0?-0:((key.index*17)%41-20)*3);return t;};
const words=(t:ReturnType<typeof make>)=>new Uint32Array(t.copyElevations().buffer);
const settings=(tool:CubeBrushSettings['tool']):CubeBrushSettings=>({version:1,tool,radiusMeters:4,...(tool==='raise'||tool==='lower'?{strengthMeters:20}:{intensity:.8,...(tool==='flatten'?{targetElevation:43}:{})})} as CubeBrushSettings);
function finish(stroke:SolidCubeStroke){for(let i=0;stroke.status==='drawing'||stroke.status==='draining';i++){assert.ok(i<2_000_000);stroke.pump(256);}}
for(const tool of['raise','lower','smooth','flatten'] as const)test(`paired worker ${tool} preserves complete canonical words and exact history`,()=>{
 const a=make(),b=make(),reference=acceptedSession(a),session=workerSession(b),before=words(b),points=[p('px',1),p('nx'),p('px',1)];
 for(const host of[reference,session]){const stroke=host.begin(points[0]!,settings(tool));for(const point of points.slice(1))stroke.accept(point);stroke.release();finish(stroke);assert.equal(stroke.status,'complete');}
 assert.deepEqual(words(b),words(a));assert.deepEqual([...session.history.changes(0)],[...reference.history.changes(0)]);assert.equal(session.diagnostics!.verifiedSteps>0,true);
 const after=words(b);session.undo();assert.deepEqual(words(b),before);session.redo();assert.deepEqual(words(b),after);assert.equal(session.diagnostics!.liveWorkers,0);session.dispose();reference.dispose();
});

const tools=['raise','lower','smooth','flatten'] as const;
type Point=ReturnType<typeof p>;
function until(stroke:SolidCubeStroke,check:()=>boolean,rig?:ReturnType<typeof cubeNodeWorkers>,quantum=256){let count=0;while(!check()){assert.ok(++count<2_000_000);assert.ok(stroke.status==='drawing'||stroke.status==='draining',stroke.status);stroke.pump(quantum);rig?.tick();}}
function reference(points:Point[],s:CubeBrushSettings,n=4,configuration=geometry){
 const terrain=make(n,configuration),session=acceptedSession(terrain),before=words(terrain),snapshots:{words:Uint32Array;revision:number}[]=[],stroke=session.begin(points[0]!,s);let index=1,released=false,last=0;
 while(stroke.status==='drawing'||stroke.status==='draining'){
  if(!released){while(index<points.length&&stroke.accept(points[index]!))index++;if(index===points.length){stroke.release();released=true;}}
  stroke.pump(256);if(stroke.statistics.committedDabs!==last){last=stroke.statistics.committedDabs;snapshots.push({words:words(terrain),revision:terrain.revision});}
 }
 assert.equal(stroke.status,'complete');return {terrain,session,before,snapshots};
}
function prove(points:Point[],s:CubeBrushSettings,n=4,quantum=256,mode:'worker'|'auto'|'cooperative'='worker',configuration=geometry){
 const ref=reference(points,s,n,configuration),terrain=make(n,configuration),rig=cubeNodeWorkers(),session=createResponsiveSolidCubeSession(terrain,{mode,workerFactory:rig.factory}),stroke=session.begin(points[0]!,s);let index=1,released=false,last=0,count=0;
 while(stroke.status==='drawing'||stroke.status==='draining'){
  assert.ok(++count<2_000_000);if(!released){while(index<points.length&&stroke.accept(points[index]!))index++;if(index===points.length){stroke.release();released=true;}}
  stroke.pump(quantum);rig.tick();if(stroke.statistics.committedDabs!==last){last=stroke.statistics.committedDabs;assert.deepEqual(words(terrain),ref.snapshots[last-1]!.words);assert.equal(terrain.revision,ref.snapshots[last-1]!.revision);}
 }
 assert.equal(stroke.status,'complete');assert.equal(stroke.statistics.uncompletedInputs,0);assert.equal(last,ref.snapshots.length);assert.deepEqual(words(terrain),words(ref.terrain));
 assert.deepEqual(session.history.operations,ref.session.history.operations);for(let i=0;i<session.history.operations.length;i++)assert.deepEqual([...session.history.changes(i)],[...ref.session.history.changes(i)]);
 const final=words(terrain);session.undo();assert.deepEqual(words(terrain),ref.before);session.redo();assert.deepEqual(words(terrain),final);const diagnostics=session.diagnostics!;session.dispose();ref.session.dispose();assert.equal(session.diagnostics!.pool.retained,0);assert.ok(rig.workers.every(w=>w.terminated));return {final,diagnostics};
}
for(const face of SOLID_CUBE_FACES)for(const tool of tools)test(`worker ${face} ${tool}: every published dab and revision equals C2B1`,()=>{prove([p(face,-1),p(face,1)],settings(tool));});
for(const edge of SOLID_CUBE_PHYSICAL_EDGES)for(const tool of tools)test(`worker ${edge.edgeId} ${tool}: complete physical edge words/history`,()=>{prove([p(edge.face),p(edge.toFace)],settings(tool),2);});
for(const corner of SOLID_CUBE_CORNERS)for(const tool of tools)test(`worker ${corner.cornerId} ${tool}: corner ambiguity and exact reverse`,()=>{
 const t=make(2),a=t.geometry.positionsForReference(corner.signs.map(s=>4*s) as [number,number,number])[0]!,b=t.geometry.positionsForReference(corner.signs.map(s=>-4*s) as [number,number,number])[0]!;
 prove([a,b,a],{...settings(tool),radiusMeters:8},2);
});
for(const n of[128,256])for(const tool of tools)test(`worker N${n} ${tool}: full authority and each source epoch`,()=>{prove([p('px',3.9),p('py',-3.9)],{...settings(tool),radiusMeters:.4},n,127);});
for(const tool of tools)test(`auto ${tool}: real mid-path handoff preserves every algebraic residual and source word`,()=>{
 const points=Array.from({length:65},(_,i)=>p('px',-1+i/32,.5*Math.sin(i/8))),s={...settings(tool),radiusMeters:1};
 const result=prove(points,s,4,256,'auto');assert.equal(result.diagnostics.workerAttachments,2);assert.ok(result.diagnostics.replayWorkUnits>0);assert.equal(result.diagnostics.sourceElevationCopies,0);assert.ok(result.diagnostics.peakStoredResponses<=2);assert.ok(result.diagnostics.peakPendingInputs<=8);
});
test('cooperative/auto cheap paths avoid workers, and pump quantum cannot change geography',()=>{
 const points=[p('px',-1),p('px',1)],s=settings('raise'),a=prove(points,s,4,1,'cooperative'),b=prove(points,s,4,4096,'auto');assert.deepEqual(a.final,b.final);assert.equal(a.diagnostics.workerAttachments,0);assert.equal(b.diagnostics.workerAttachments,0);
});
test('normal completion reuses only two workers across strokes, Undo/Redo and source epochs; disposal terminates both',()=>{
 const terrain=make(),original=words(terrain),rig=cubeNodeWorkers(),session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:rig.factory}),other=acceptedSession(terrain);
 for(let round=0;round<3;round++){
  const stroke=session.begin(p('px',-1),settings('raise'));assert.throws(()=>other.begin(p('px'),settings('raise')),/One cube stroke/);stroke.accept(p('nx',1));stroke.release();until(stroke,()=>stroke.status==='complete',rig);
  assert.equal(session.diagnostics!.pool.created,2);assert.equal(session.diagnostics!.pool.retained,2);assert.equal(session.diagnostics!.pool.reused,round*2);assert.ok(rig.workers.every(w=>!w.terminated));
 }
 const final=words(terrain);for(let i=0;i<3;i++)session.undo();assert.deepEqual(words(terrain),original);for(let i=0;i<3;i++)session.redo();assert.deepEqual(words(terrain),final);session.dispose();assert.equal(session.diagnostics!.pool.terminated,2);assert.ok(rig.workers.every(w=>w.terminated));other.dispose();
});
test('construction failure after one worker exists safely resumes the untouched local path without replaying terrain',()=>{
 const points=[p('px',-1),p('nx',1)],ref=reference(points,settings('raise')),terrain=make(),rig=cubeNodeWorkers();
 const session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:role=>{if(role==='verifier')throw Error('constructor fixture');return rig.factory(role);}}),stroke=session.begin(points[0]!,settings('raise'));stroke.accept(points[1]!);stroke.release();until(stroke,()=>stroke.status==='complete',rig);
 assert.deepEqual(words(terrain),words(ref.terrain));assert.deepEqual([...session.history.changes(0)],[...ref.session.history.changes(0)]);assert.match(session.diagnostics!.fallbackReason,/constructor fixture/);assert.equal(session.diagnostics!.pool.retained,0);assert.equal(rig.workers.length,1);assert.ok(rig.workers[0]!.terminated);session.dispose();ref.session.dispose();
});
function failedPrefix(transform:(role:'primary'|'verifier',m:CubePathWorkOutput)=>CubePathWorkOutput[],pattern?:RegExp){
 const points=[p('px',-1),p('nx',1)],s=settings('raise'),ref=reference(points,s),terrain=make(),rig=cubeNodeWorkers(transform),session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:rig.factory}),stroke=session.begin(points[0]!,s);stroke.accept(points[1]!);stroke.release();
 if(pattern)assert.throws(()=>until(stroke,()=>stroke.status==='complete',rig),pattern);else assert.throws(()=>until(stroke,()=>stroke.status==='complete',rig));assert.equal(stroke.status,'failed');const count=stroke.statistics.committedDabs;assert.ok(count>=1);assert.deepEqual(words(terrain),ref.snapshots[count-1]!.words);const prefix=words(terrain);assert.equal(session.history.operations.length,1);assert.equal(session.history.operations[0]!.termination,'failed');session.undo();assert.deepEqual(words(terrain),ref.before);session.redo();assert.deepEqual(words(terrain),prefix);assert.ok(rig.workers.every(w=>w.terminated));session.dispose();ref.session.dispose();
}
test('changed physical center with otherwise valid topology is rejected before painting',()=>{failedPrefix((role,m)=>{if(role==='primary'&&m.type==='step'&&m.body.event?.kind==='dab')m.body.event={...m.body.event,center:{...m.body.event.center,u:m.body.event.center.u===4?3.875:m.body.event.center.u+.125}};return[m];});});
test('changed path policy/full route witness is rejected, including ambiguity data',()=>{failedPrefix((role,m)=>{if(role==='primary'&&m.type==='step'&&m.body.event?.kind==='path')m.body.event={...m.body.event,ambiguity:m.body.event.ambiguity+1};return[m];});});
test('duplicate current results never advance history twice',()=>{failedPrefix((role,m)=>role==='primary'&&m.type==='step'?[m,m]:[m]);});
test('out-of-order acknowledgements never admit a proposal',()=>{failedPrefix((role,m)=>{if(role==='primary'&&m.type==='accepted')m.sequence++;return[m];});});
test('nonfinite timing certificate cannot smuggle otherwise matching geography',()=>{failedPrefix((role,m)=>{if(role==='primary'&&m.type==='step')m.workMs=NaN;return[m];});});
test('nested getters are rejected without evaluating them',()=>{let called=0;failedPrefix((role,m)=>{if(role==='primary'&&m.type==='step')Object.defineProperty(m.body,'event',{enumerable:true,get(){called++;throw Error('must not run');}});return[m];});assert.equal(called,0);});
test('stale tasks and generations are ignored while the correct stream still completes',()=>{
 const points=[p('px'),p('nx')],ref=reference(points,settings('lower')),terrain=make(),rig=cubeNodeWorkers((_role,m)=>[{...m,task:m.task-1},{...m,generation:m.generation-1},m]),session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:rig.factory}),stroke=session.begin(points[0]!,settings('lower'));stroke.accept(points[1]!);stroke.release();until(stroke,()=>stroke.status==='complete',rig);assert.deepEqual(words(terrain),words(ref.terrain));assert.ok(session.diagnostics!.staleMessages>0);session.dispose();ref.session.dispose();
});
for(const stage of['preparing','collecting','reserved'] as const)test(`worker crash during host ${stage} cannot publish the pending dab`,()=>{
 const terrain=make(),before=words(terrain),rig=cubeNodeWorkers(),session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:rig.factory}),stroke=session.begin(p('px',-1),settings('raise'));stroke.accept(p('nx',1));stroke.release();
 until(stroke,()=>stroke.statistics.committedDabs>=2&&stroke.statistics.pendingDabStage===stage,rig,1);const prefix=words(terrain);rig.workers[0]!.crash();assert.throws(()=>stroke.pump(1));assert.equal(stroke.status,'failed');assert.deepEqual(words(terrain),prefix);session.undo();assert.deepEqual(words(terrain),before);session.redo();assert.deepEqual(words(terrain),prefix);assert.equal(session.history.operations[0]!.termination,'failed');session.dispose();
});
test('startup timeout resumes the exact cooperative prefix and accepted input order',async()=>{
 const terrain=make(),ref=reference([p('px'),p('nx')],settings('raise')),rig=cubeNodeWorkers(),session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:rig.factory,startupTimeoutMs:1}),stroke=session.begin(p('px'),settings('raise'));stroke.accept(p('nx'));stroke.release();
 until(stroke,()=>session.diagnostics!.backend==='starting paired path workers');await new Promise(r=>setTimeout(r,10));until(stroke,()=>stroke.status==='complete',rig);assert.deepEqual(words(terrain),words(ref.terrain));assert.match(session.diagnostics!.fallbackReason,/timed out/);session.dispose();ref.session.dispose();
});
test('bounded data comparison preserves signed zero/BigInt/DAGs and rejects cycles, unsafe views and oversized values',()=>{
 const shared={n:7n,d:3n},value={a:shared,b:shared,z:-0},comparison=createCubeValueComparison(value,structuredClone(value));let pumps=0;while(!comparison.complete){comparison.pump(1);pumps++;}assert.ok(pumps>1);assert.deepEqual(comparison.value,value);assert.ok(Object.is((comparison.value as typeof value).z,-0));assert.ok(Object.isFrozen(comparison.value));
 for(const value of[NaN,new Float32Array(2),1n<<20000n,()=>0]){const c=createCubeValueComparison(value,value);assert.throws(()=>{while(!c.complete)c.pump(128);});}
 const cycle:{next?:unknown}={};cycle.next=cycle;const c=createCubeValueComparison(cycle,cycle);assert.throws(()=>{while(!c.complete)c.pump(128);},/cyclic/);
 const poison=JSON.parse('{"__proto__":{"polluted":true}}'),safe=createCubeValueComparison(poison,poison);while(!safe.complete)safe.pump(128);assert.equal(Object.getPrototypeOf(safe.value),Object.prototype);assert.equal(({} as {polluted?:boolean}).polluted,undefined);
});

for(const tool of tools)test(`worker ${tool}: literal 20 m four-face sparse/dense inputs retain identical words at quantum1/4096`,()=>{
 const configuration={...geometry,sideLengthMeters:10},a=p('px',-4,-3),b=p('nx',-3,4),s=settings(tool);
 const sparse=prove([a,b],s,4,1,'worker',configuration),dense=prove([a,p('ny',3,1),p('pz',-3,-1),b],s,4,4096,'worker',configuration);assert.deepEqual(sparse.final,dense.final);
});
test('independent nearest-even checks reject correlated center corruption in both replicas',()=>{
 failedPrefix((_role,m)=>{if(m.type==='step'&&m.body.event?.kind==='dab'&&Math.abs(m.body.event.center.u)<3.5)m.body.event={...m.body.event,center:{...m.body.event.center,u:m.body.event.center.u+.125}};return[m];},/nearest-even/);
});
test('independent physical checks reject correlated endpoint corruption in both replicas',()=>{
 failedPrefix((_role,m)=>{if(m.type==='step'&&m.body.event?.kind==='path')m.body.event={...m.body.event,to:{...m.body.event.to,v:m.body.event.to.v+.125}};return[m];},/endpoints/);
});
for(const phase of['before-first','startup','waiting','preparing','collecting','reserved','published'] as const)test(`cancel ${phase}: exact prefix is one operation and pending work cannot paint`,()=>{
 const terrain=make(),before=words(terrain),rig=cubeNodeWorkers(),session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:rig.factory}),stroke=session.begin(p('px',-1),settings('raise'));stroke.accept(p('nx',1));stroke.release();
 const condition=()=>phase==='before-first'||phase==='startup'&&session.diagnostics!.backend==='starting paired path workers'||phase==='waiting'&&session.diagnostics!.requests>0&&session.diagnostics!.verifiedSteps===0||phase==='published'&&stroke.statistics.committedDabs>=2&&stroke.statistics.pendingDabStage==='none'||stroke.statistics.committedDabs>=2&&stroke.statistics.pendingDabStage===phase;
 until(stroke,condition,rig,1);const prefix=words(terrain),commits=stroke.statistics.committedDabs;stroke.cancel();assert.equal(stroke.status,'cancelled');for(let i=0;i<1000&&rig.pending;i++)rig.tick();assert.deepEqual(words(terrain),prefix);assert.ok(rig.workers.every(w=>w.terminated));
 if(commits){assert.equal(session.history.operations.length,1);assert.equal(session.history.operations[0]!.termination,'cancelled');session.undo();assert.deepEqual(words(terrain),before);session.redo();assert.deepEqual(words(terrain),prefix);}else assert.equal(session.history.operations.length,0);session.dispose();
});
test('external canonical edit during a worker wait stops stale work, preserving a disjoint word through exact replay',()=>{
 const terrain=make(),before=words(terrain),rig=cubeNodeWorkers(),session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:rig.factory}),stroke=session.begin(p('px',-1),{...settings('raise'),radiusMeters:2});stroke.accept(p('nx',1));stroke.release();until(stroke,()=>session.diagnostics!.requests>0,rig);
 terrain.write(terrain.keyAt(terrain.sampleCount-1),17);const foreign=words(terrain);assert.throws(()=>stroke.pump(),/revision/);assert.equal(stroke.status,'failed');assert.deepEqual(words(terrain),foreign);session.undo();const expected=before.slice();expected[expected.length-1]=new Uint32Array(Float32Array.of(17).buffer)[0]!;assert.deepEqual(words(terrain),expected);session.redo();assert.deepEqual(words(terrain),foreign);session.dispose();
});
test('lost post-startup responses are bounded by a request timeout and retain a failed prefix',async()=>{
 const terrain=make(),before=words(terrain),rig=cubeNodeWorkers((role,m)=>role==='primary'&&m.type==='step'&&m.sequence>=2?[]:[m]),session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:rig.factory,workTimeoutMs:1}),stroke=session.begin(p('px',-1),settings('raise'));stroke.accept(p('nx',1));stroke.release();
 until(stroke,()=>session.diagnostics!.requests>=2&&session.diagnostics!.verifiedSteps>=1,rig);const prefix=words(terrain);await new Promise(r=>setTimeout(r,10));assert.throws(()=>stroke.pump(),/timed out/);assert.equal(stroke.status,'failed');assert.deepEqual(words(terrain),prefix);session.undo();assert.deepEqual(words(terrain),before);session.redo();assert.deepEqual(words(terrain),prefix);session.dispose();
});
test('disposal resolves a pending progress wait, seals the prefix and leaves no live workers',async()=>{
 const terrain=make(),rig=cubeNodeWorkers(),session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:rig.factory}),stroke=session.begin(p('px'),settings('raise'));stroke.accept(p('nx'));stroke.release();until(stroke,()=>session.diagnostics!.backend==='starting paired path workers');const prefix=words(terrain),waiting=session.waitForProgress();session.dispose();await waiting;assert.equal(stroke.status,'disposed');assert.equal(session.history.operations[0]!.termination,'disposed');assert.equal(session.diagnostics!.pool.retained,0);assert.ok(rig.workers.every(w=>w.terminated));for(let i=0;i<1000&&rig.pending;i++)rig.tick();assert.deepEqual(words(terrain),prefix);assert.throws(()=>session.begin(p('px'),settings('raise')),/disposed/);
});
test('a single worker instance cannot impersonate both independently checked roles',()=>{
 const terrain=make(),ref=reference([p('px'),p('nx')],settings('raise')),rig=cubeNodeWorkers(),one=rig.factory('primary'),session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:()=>one}),stroke=session.begin(p('px'),settings('raise'));stroke.accept(p('nx'));stroke.release();until(stroke,()=>stroke.status==='complete',rig);assert.match(session.diagnostics!.fallbackReason,/owned/);assert.deepEqual(words(terrain),words(ref.terrain));assert.equal(session.diagnostics!.pool.retained,0);session.dispose();ref.session.dispose();
});
test('idle worker failure is evicted and replacement does not reuse old task or source state',()=>{
 const terrain=make(),rig=cubeNodeWorkers(),session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:rig.factory});
 for(let round=0;round<2;round++){const stroke=session.begin(p('px'),settings('lower'));stroke.accept(p('nx'));stroke.release();until(stroke,()=>stroke.status==='complete',rig);if(!round){rig.workers[0]!.crash('idle fixture');assert.equal(session.diagnostics!.pool.idleFailures,1);assert.equal(session.diagnostics!.pool.retained,1);}}
 assert.equal(session.diagnostics!.pool.created,3);assert.equal(session.diagnostics!.pool.retained,2);session.dispose();assert.ok(rig.workers.every(w=>w.terminated));
});
test('disabled reuse terminates completed workers instead of growing a pool',()=>{
 const terrain=make(),rig=cubeNodeWorkers(),session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:rig.factory,reuseWorkers:false});for(let round=0;round<3;round++){const stroke=session.begin(p('px'),settings('raise'));stroke.accept(p('nx'));stroke.release();until(stroke,()=>stroke.status==='complete',rig);assert.equal(session.diagnostics!.pool.retained,0);assert.equal(session.diagnostics!.pool.created,2*(round+1));assert.ok(rig.workers.every(w=>w.terminated));}session.dispose();
});
test('no-op worker strokes preserve Redo; new real writes branch once; signed zero survives exact replay',()=>{
 const terrain=make(),rig=cubeNodeWorkers(),session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:rig.factory});const first=session.begin(p('px'),settings('raise'));first.accept(p('nx'));first.release();until(first,()=>first.status==='complete',rig);session.undo();
 const noop=session.begin(p('px'),{version:1,tool:'smooth',radiusMeters:2,intensity:0});noop.accept(p('nx'));noop.release();until(noop,()=>noop.status==='complete',rig);assert.equal(session.history.canRedo,true);session.redo();session.undo();
 const next=session.begin(p('px'),settings('lower'));next.release();until(next,()=>next.status==='complete',rig);assert.equal(session.history.canRedo,false);assert.equal(session.history.operations.length,1);session.dispose();
 const zero=make();zero.write(zero.keyAt(0),0);const zr=cubeNodeWorkers(),zs=createResponsiveSolidCubeSession(zero,{mode:'worker',workerFactory:zr.factory}),position=zero.positionAt(zero.owner(zero.keyAt(0))),stroke=zs.begin(position,{version:1,tool:'flatten',radiusMeters:1,intensity:1,targetElevation:-0});stroke.release();until(stroke,()=>stroke.status==='complete',zr);assert.ok(Object.is(zero.read(zero.keyAt(0)),-0));zs.undo();assert.ok(Object.is(zero.read(zero.keyAt(0)),0));zs.redo();assert.ok(Object.is(zero.read(zero.keyAt(0)),-0));zs.dispose();
});
test('optional replay-log exhaustion retains exact cooperative geography rather than dropping input',()=>{
 const points=[p('px',-4),p('px',4)],s={...settings('raise'),radiusMeters:.125},result=prove(points,s,2,256,'auto');assert.equal(result.diagnostics.workerAttachments,0);assert.match(result.diagnostics.fallbackReason,/replay log budget/);assert.equal(result.diagnostics.retainedReplayBytes,0);
});
test('worker-unavailable Node host falls back from a valid path checkpoint without duplicating dabs',()=>{
 const terrain=make(),ref=reference([p('px'),p('nx')],settings('raise')),session=createResponsiveSolidCubeSession(terrain,{mode:'worker'}),stroke=session.begin(p('px'),settings('raise'));stroke.accept(p('nx'));stroke.release();until(stroke,()=>stroke.status==='complete');assert.deepEqual(words(terrain),words(ref.terrain));assert.match(session.diagnostics!.fallbackReason,/Worker/);assert.equal(stroke.statistics.committedDabs,ref.snapshots.length);session.dispose();ref.session.dispose();
});
test('accepted path work exhaustion in both workers preserves one exact first-dab operation',()=>{
 const terrain=make(),before=words(terrain),rig=cubeNodeWorkers(),session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:rig.factory}),stroke=session.begin(p('px'),settings('raise'),{pathLimits:{maxStepWork:1}});stroke.accept(p('nx'));stroke.release();assert.throws(()=>until(stroke,()=>stroke.status==='complete',rig),/limit|budget/);assert.equal(stroke.status,'failed');assert.equal(stroke.statistics.committedDabs,1);const prefix=words(terrain);session.undo();assert.deepEqual(words(terrain),before);session.redo();assert.deepEqual(words(terrain),prefix);assert.equal(session.history.operations[0]!.termination,'failed');session.dispose();
});
test('idle progress wait sleeps until input, release or cancellation rather than polling high-priority turns',async()=>{
 const terrain=make(),session=createResponsiveSolidCubeSession(terrain,{mode:'cooperative'}),stroke=session.begin(p('px'),settings('raise'));until(stroke,()=>stroke.statistics.committedDabs===1);stroke.pump();assert.equal(stroke.statistics.lastStage,'idle');let resolved=false;const wait=session.waitForProgress().then(()=>{resolved=true;});await new Promise(r=>setTimeout(r,5));assert.equal(resolved,false);stroke.accept(p('px',1));await wait;stroke.release();until(stroke,()=>stroke.status==='complete');session.dispose();
});
for(const tool of tools)test(`N256 wide ${tool}: unchanged 65,536-word cap gives exactly the C2B1 failed prefix`,()=>{
 const points=[p('px',3.90625),p('py',-1.5625)],s={...settings(tool),radiusMeters:4.4},a=make(256),b=make(256),original=words(b),native=acceptedSession(a),rig=cubeNodeWorkers(),session=createResponsiveSolidCubeSession(b,{mode:'worker',workerFactory:rig.factory});
 const results=[];
 for(const host of[native,session]){const stroke=host.begin(points[0]!,s);stroke.accept(points[1]!);stroke.release();let error:unknown;
  try{for(let i=0;stroke.status==='draining';i++){assert.ok(i<2_000_000);stroke.pump(256);if(host===session)rig.tick();}}catch(e){error=e;}
  assert.equal(stroke.status,'failed');assert.match(String(error),/history|sample|budget/i);assert.equal(stroke.statistics.committedDabs,1);assert.equal(host.history.operations.length,1);assert.equal(host.history.operations[0]!.termination,'failed');results.push(stroke.statistics);
 }
 assert.deepEqual(words(a),words(b));assert.equal(a.revision,b.revision);assert.deepEqual([...session.history.changes(0)],[...native.history.changes(0)]);assert.equal(results[0]!.writes,results[1]!.writes);const prefix=words(b);session.undo();assert.deepEqual(words(b),original);session.redo();assert.deepEqual(words(b),prefix);assert.ok(rig.workers.every(w=>w.terminated));session.dispose();native.dispose();
});
for(const field of['revision','committedDabs','writes','ordinal'] as const)test(`runtime rejects changed ${field} after adoption without publishing speculative source`,()=>{
 const terrain=make(),before=words(terrain),rig=cubeNodeWorkers(),factory=(role:'primary'|'verifier')=>{const worker=rig.factory(role),post=worker.postMessage.bind(worker);worker.postMessage=(raw:unknown)=>{const input=structuredClone(raw) as import('./cube-path-work-protocol.ts').CubePathWorkInput;if(role==='primary'&&input.type==='step'&&input.sequence>=2){if(field==='ordinal'){input.inputs=[{ordinal:999,point:p('px')}];}else input.ack[field]++;}post(input);};return worker;};
 const session=createResponsiveSolidCubeSession(terrain,{mode:'worker',workerFactory:factory}),stroke=session.begin(p('px'),settings('raise'));stroke.accept(p('nx'));stroke.release();assert.throws(()=>until(stroke,()=>stroke.status==='complete',rig),/acknowledged|acknowledgement|input/i);assert.equal(stroke.status,'failed');const prefix=words(terrain);session.undo();assert.deepEqual(words(terrain),before);session.redo();assert.deepEqual(words(terrain),prefix);session.dispose();
});
