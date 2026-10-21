import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createSolidCubeSession,type SolidCubeStroke,type CubeStrokeOptions} from './solid-cube-session.ts';
import {createSolidCubeHistory,type CubeHistoryLimits} from './solid-cube-history.ts';
import {createSolidCubeTerrain,type SolidCubeTerrain} from '../terrain/solid-cube.ts';
import {prepareSolidCubeDab,type CubeBrushSettings} from '../terrain/solid-cube-brush.ts';
import {createSolidCubeStrokePath} from '../surfaces/solid-cube-stroke-path.ts';
import {SOLID_CUBE_PROVIDER,SOLID_CUBE_FACES,SOLID_CUBE_PHYSICAL_EDGES,SOLID_CUBE_CORNERS,type SolidCubeConfiguration,type SolidCubeFace,type SolidCubePosition} from '../surfaces/solid-cube.ts';

const identity={worldId:'cube-execution',surfaceId:'exterior'};
const config:SolidCubeConfiguration={identity,provider:SOLID_CUBE_PROVIDER,version:1,configuration:'solid',role:'exterior',sideLengthMeters:8};
const p=(patchId:SolidCubeFace,u=0,v=0):SolidCubePosition=>({...identity,patchId,u,v});
const make=(n=2,c=config)=>createSolidCubeTerrain({terrainId:'execution-terrain',geometry:c,cellsPerEdge:n});
const words=(t:SolidCubeTerrain)=>new Uint32Array(t.copyElevations().buffer);
const seed=(t:SolidCubeTerrain)=>{for(const k of t.samples())t.write(k,k.index===0?-0:((k.index*17)%41-20)*3);};
const settings=(tool:CubeBrushSettings['tool'],radiusMeters=4):CubeBrushSettings=>tool==='raise'||tool==='lower'?{version:1,tool,radiusMeters,strengthMeters:20}:
  {version:1,tool,radiusMeters,intensity:.8,...(tool==='flatten'?{targetElevation:43}:{})} as CubeBrushSettings;
const tools=['raise','lower','smooth','flatten'] as const;
function centers(points:readonly SolidCubePosition[],s:CubeBrushSettings,c=config){
  const path=createSolidCubeStrokePath(c,s.radiusMeters),out:SolidCubePosition[]=[];
  const take=()=>{for(;;){const e=path.take();if(!e)break;if(e.kind==='dab')out.push(e.center);}};
  for(const q of points)while(!path.accept(q)){path.pump();take();}path.release();
  while(path.status==='draining'){path.pump();take();}assert.equal(path.status,'complete');return out;
}
function reference(t:SolidCubeTerrain,points:readonly SolidCubePosition[],s:CubeBrushSettings,c=config){
  for(const center of centers(points,s,c)){const job=prepareSolidCubeDab(t,center,s);while(job.status==='preparing')job.pump(61);job.commit();}
  return words(t);
}
function until(stroke:SolidCubeStroke,condition:()=>boolean,steps=256){
  let pumps=0;while(!condition()){assert.ok(++pumps<2_000_000);assert.ok(stroke.status==='drawing'||stroke.status==='draining',stroke.status);stroke.pump(steps);}
}
function draw(t:SolidCubeTerrain,points:readonly SolidCubePosition[],s:CubeBrushSettings,steps=256,historyLimits:CubeHistoryLimits={},options:CubeStrokeOptions={}){
  const session=createSolidCubeSession(t,historyLimits),stroke=session.begin(points[0]!,s,options);
  for(const q of points.slice(1))while(!stroke.accept(q))stroke.pump(steps);stroke.release();until(stroke,()=>stroke.status==='complete',steps);return {session,stroke};
}
function prove(t:SolidCubeTerrain,points:readonly SolidCubePosition[],s:CubeBrushSettings,steps=256,c=config){
  seed(t);const before=words(t),r=make(t.metadata.representation.cellsPerEdge,c);seed(r);
  const expected=reference(r,points,s,c),{session,stroke}=draw(t,points,s,steps),after=words(t);
  assert.deepEqual(after,expected);assert.equal(stroke.statistics.uncompletedInputs,0);assert.equal(stroke.statistics.uncommittedGeneratedDabs,0);
  assert.equal(stroke.statistics.generatedDabs,centers(points,s,c).length);assert.equal(stroke.statistics.committedDabs,stroke.statistics.generatedDabs);
  assert.equal(stroke.statistics.history.activeBytes,0);assert.equal(stroke.statistics.history.draftBytes,0);
  const net=[...before.keys()].filter(i=>before[i]!==after[i]);
  if(net.length){
    assert.equal(session.history.statistics.entries,1);assert.deepEqual([...session.history.changes(0)],net.map(index=>({index,beforeWord:before[index],afterWord:after[index]})));
    const revision=t.revision;assert.equal(session.undo(),true);assert.deepEqual(words(t),before);assert.equal(t.revision,revision+net.length);
    assert.equal(session.redo(),true);assert.deepEqual(words(t),after);assert.equal(t.revision,revision+2*net.length);
  }else assert.equal(session.history.statistics.entries,0);
  return {session,stroke,before,after};
}
for(const face of SOLID_CUBE_FACES)for(const tool of tools)test(`${face} ${tool}: multiple C1 dabs, complete words and one exact history entry`,()=>{
  prove(make(4),[p(face,-1),p(face,1)],settings(tool,2),17);
});
for(const edge of SOLID_CUBE_PHYSICAL_EDGES)for(const tool of tools)test(`${edge.edgeId} ${tool}: ordered physical edge execution`,()=>{
  prove(make(),[p(edge.face),p(edge.toFace)],settings(tool),127);
});
for(const corner of SOLID_CUBE_CORNERS)for(const tool of tools)test(`${corner.cornerId} ${tool}: singular corner observation and immediate reverse`,()=>{
  const t=make(),a=t.geometry.positionsForReference(corner.signs.map(s=>4*s) as [number,number,number])[0]!,b=t.geometry.positionsForReference(corner.signs.map(s=>-4*s) as [number,number,number])[0]!;
  prove(t,[a,b,a],settings(tool,8),256);
});
for(const tool of tools)test(`${tool}: four-face curve and exact subdivisions agree at different pump sizes`,()=>{
  const c={...config,sideLengthMeters:10},a=p('px',-4,-3),b=p('nx',-3,4),s=settings(tool);
  const sparse=prove(make(4,c),[a,b],s,1,c),dense=prove(make(4,c),[a,p('ny',3,1),p('pz',-3,-1),b],s,4096,c);
  assert.deepEqual(sparse.after,dense.after);assert.deepEqual([...sparse.session.history.changes(0)],[...dense.session.history.changes(0)]);
});
test('continuation ambiguity, changing Smooth sources and physical residuals agree with sequential execution',()=>{
  const points=[p('px',1),p('px'),p('nx'),p('px')];prove(make(4),points,settings('smooth',8),31);
  const t=make(4),s=settings('smooth'),session=createSolidCubeSession(t);seed(t);session.clearHistory();
  const before=words(t),stroke=session.begin(p('px',-2),s);stroke.accept(p('px',2));stroke.release();
  until(stroke,()=>stroke.statistics.committedDabs===1);const firstRevision=t.revision;
  until(stroke,()=>stroke.statistics.committedDabs===2);assert.ok(t.revision>firstRevision);assert.notDeepEqual(words(t),before);
  const ref=make(4);seed(ref);const cs=centers([p('px',-2),p('px',2)],s);
  for(const center of cs.slice(0,2)){const job=prepareSolidCubeDab(ref,center,s);while(job.status==='preparing')job.pump(7);job.commit();}
  assert.deepEqual(words(t),words(ref));stroke.cancel();assert.equal(session.history.operations[0]!.termination,'cancelled');session.undo();assert.deepEqual(words(t),before);
});
for(const n of [128,256])for(const tool of tools)test(`N${n} ${tool}: full-authority, updated pre-dab state and exact replay`,()=>{
  prove(make(n),[p('px',3.9),p('py',-3.9)],settings(tool,.4),257);
});
test('immutable settings, one owner, exact authority binding, input backpressure and distinct stages',()=>{
  const t=make(4),session=createSolidCubeSession(t),other=createSolidCubeSession(t),s={...settings('raise',2)};
  const stroke=session.begin(p('px',-2),s);s.radiusMeters=6;assert.equal(stroke.settings.radiusMeters,2);assert.throws(()=>other.begin(p('px'),s));
  assert.equal(session.terrain,t);assert.equal(session.binding.terrainId,t.metadata.terrainId);assert.equal(session.binding.cellsPerEdge,4);
  assert.equal(stroke.statistics.acceptedInputs,1);assert.equal(stroke.statistics.generatedDabs,1);assert.equal(stroke.statistics.committedDabs,0);
  const original=words(t),revision=t.revision;
  until(stroke,()=>stroke.statistics.pendingDabStage==='reserved',1);
  assert.deepEqual(words(t),original);assert.equal(t.revision,revision);assert.equal(stroke.statistics.preparedDabs,1);assert.equal(stroke.statistics.reservedDabs,1);
  assert.equal(stroke.statistics.committedDabs,0);stroke.pump(1);assert.equal(stroke.statistics.committedDabs,1);
  for(let i=0;i<8;i++)assert.equal(stroke.accept(p('px',-1+i/8)),true);assert.equal(stroke.accept(p('px',1)),false);assert.equal(stroke.statistics.acceptedInputs,9);
  stroke.cancel();assert.equal(stroke.statistics.uncommittedGeneratedDabs,0);assert.equal(stroke.statistics.uncompletedInputs,8);assert.equal(stroke.status,'cancelled');
  assert.throws(()=>other.begin(p('px'),settings('raise')),/revision/);session.undo();other.clearHistory();const next=other.begin(p('px'),settings('raise'));next.cancel();
});
for(const stop of ['preparing','collecting','reserved','committed'] as const)test(`cancel at ${stop}: preserve exactly one committed prefix`,()=>{
  const t=make(4);seed(t);const before=words(t),session=createSolidCubeSession(t),stroke=session.begin(p('px',-2),settings('raise',2));stroke.accept(p('px',2));
  if(stop==='committed')until(stroke,()=>stroke.statistics.committedDabs===3);
  else until(stroke,()=>stroke.statistics.pendingDabStage===stop);
  const prefix=words(t),commits=stroke.statistics.committedDabs;stroke.cancel();assert.equal(stroke.status,'cancelled');assert.deepEqual(words(t),prefix);
  assert.equal(stroke.statistics.pendingDabStage,'none');assert.equal(stroke.statistics.history.draftBytes,0);assert.equal(stroke.statistics.history.activeBytes,0);
  assert.equal(session.history.statistics.entries,commits?1:0);if(commits){session.undo();assert.deepEqual(words(t),before);session.redo();assert.deepEqual(words(t),prefix);}
  const revision=t.revision;stroke.pump(4096);assert.equal(t.revision,revision);
});
for(const stage of ['preparing','collecting','reserved'] as const)test(`cancel during next ${stage} after one publication: exact prefix survives`,()=>{
  const t=make(4),before=words(t),session=createSolidCubeSession(t),s=session.begin(p('px',-2),settings('raise',2));s.accept(p('px',2));
  until(s,()=>s.statistics.committedDabs===1);const prefix=words(t);until(s,()=>s.statistics.pendingDabStage===stage);
  assert.equal(s.statistics.pendingSourceRevision,t.revision);assert.deepEqual(words(t),prefix);s.cancel();assert.deepEqual(words(t),prefix);
  assert.equal(session.history.operations[0]!.dabs,1);assert.equal(s.statistics.uncommittedGeneratedDabs,1);assert.equal(s.statistics.history.activeBytes,0);
  session.undo();assert.deepEqual(words(t),before);session.redo();assert.deepEqual(words(t),prefix);
});
test('new editing branches Redo only after a real publication; no-op gestures retain it and signed zero is exact',()=>{
  const t=make(4),before=words(t),session=createSolidCubeSession(t);
  const first=session.begin(p('px'),settings('raise',2));first.release();until(first,()=>first.status==='complete');const firstAfter=words(t);session.undo();
  const noop=session.begin(p('px'),{version:1,tool:'smooth',radiusMeters:2,intensity:0});noop.release();until(noop,()=>noop.status==='complete');assert.equal(session.history.canRedo,true);assert.equal(session.history.statistics.entries,1);
  const cancelled=session.begin(p('px'),settings('lower',2));cancelled.cancel();assert.equal(session.history.canRedo,true);session.redo();assert.deepEqual(words(t),firstAfter);session.undo();
  const different=session.begin(p('px'),settings('lower',2));different.release();until(different,()=>different.status==='complete');assert.equal(session.history.canRedo,false);assert.equal(session.history.statistics.entries,1);session.undo();assert.deepEqual(words(t),before);
  const zero=make(4);zero.write(zero.resolve({...identity,patchId:'px',column:2,row:2}),0);const z=words(zero);
  const {session:zs}=draw(zero,[p('px')],{version:1,tool:'flatten',radiusMeters:1,intensity:1,targetElevation:-0});
  const after=words(zero);assert.ok([...after].includes(0x80000000));zs.undo();assert.deepEqual(words(zero),z);zs.redo();assert.deepEqual(words(zero),after);
});
test('external revision conflicts stop stale work; disjoint explicit replay is safe, overlapping replay is atomic',()=>{
  for(const overlap of [false,true]){
    const t=make(4),before=words(t),session=createSolidCubeSession(t),stroke=session.begin(p('px',-2),settings('raise',2));stroke.accept(p('px',2));
    until(stroke,()=>stroke.statistics.committedDabs===1);const prefix=words(t);
    until(stroke,()=>stroke.statistics.pendingDabStage==='reserved');
    const changed=[...prefix.keys()].find(i=>prefix[i]!==before[i])!,index=overlap?changed:t.sampleCount-1;t.write(t.keyAt(index),77);const foreign=words(t);
    assert.throws(()=>stroke.pump(),/revision/);assert.equal(stroke.status,'failed');assert.deepEqual(words(t),foreign);assert.equal(session.history.statistics.entries,1);
    if(overlap){const cursor=session.history.statistics.cursor;assert.throws(()=>session.undo());assert.deepEqual(words(t),foreign);assert.equal(session.history.statistics.cursor,cursor);t.write(t.keyAt(index),new Float32Array(prefix.buffer)[index]!);}
    assert.equal(session.undo(),true);const expected=before.slice();if(!overlap)expected[index]=new Uint32Array(Float32Array.of(77).buffer)[0]!;assert.deepEqual(words(t),expected);
  }
});
test('invalid foreign input and path/input exhaustion seal the committed prefix without claiming completion',()=>{
  for(const kind of ['foreign','input','path'] as const){
    const t=make(4),before=words(t),session=createSolidCubeSession(t),stroke=session.begin(p('px',-2),settings('raise',2),
      kind==='input'?{pathLimits:{maxAcceptedInputs:1}}:kind==='path'?{pathLimits:{maxStepWork:1}}:{});
    until(stroke,()=>stroke.statistics.committedDabs===1);
    if(kind==='foreign')assert.throws(()=>stroke.accept({...p('px'),worldId:'foreign'}));
    else if(kind==='input')assert.throws(()=>stroke.accept(p('px')));
    else{stroke.accept(p('nx'));assert.throws(()=>until(stroke,()=>stroke.status==='complete'));}
    assert.equal(stroke.status,'failed');assert.equal(session.history.operations[0]!.termination,'failed');assert.equal(stroke.statistics.committedDabs,1);
    const prefix=words(t);session.undo();assert.deepEqual(words(t),before);session.redo();assert.deepEqual(words(t),prefix);
  }
});
test('C1 preparation, history reservation and aggregate work budgets preserve earlier commits exactly',()=>{
  for(const options of [{dabLimits:{maxChanges:1}},{dabLimits:{maxCandidates:1}},{maxDabWorkUnits:2200}]){
    const t=make(4),before=words(t),session=createSolidCubeSession(t),stroke=session.begin(p('px',-2),settings('raise',2),options);
    stroke.accept(p('px',2));stroke.release();assert.throws(()=>until(stroke,()=>stroke.status==='complete'));assert.equal(stroke.status,'failed');
    assert.ok(stroke.statistics.committedDabs>=1);const prefix=words(t);session.undo();assert.deepEqual(words(t),before);session.redo();assert.deepEqual(words(t),prefix);
  }
  for(const limits of [{maxStrokeSamples:1},{maxBytes:1},{maxBookkeepingSteps:1},{maxBookkeepingSteps:2}]){
    const t=make(4),before=words(t),session=createSolidCubeSession(t,limits),stroke=session.begin(p('px',-2),settings('raise',2));stroke.accept(p('px',2));stroke.release();
    assert.throws(()=>until(stroke,()=>stroke.status==='complete'));assert.equal(stroke.status,'failed');assert.equal(stroke.statistics.history.draftBytes,0);
    if(stroke.statistics.committedDabs){session.undo();assert.deepEqual(words(t),before);}else assert.deepEqual(words(t),before);
  }
});
test('duplicate observations and edge aliases never replay a center or thin accepted input',()=>{
  const t=make(4),points=[p('px'),p('px',4),p('py',-4),p('py'),p('py')],s=settings('raise');
  const result=prove(t,points,s,17);assert.equal(result.stroke.statistics.acceptedInputs,5);assert.equal(result.stroke.statistics.fullyExecutedInputs,5);
  assert.equal(result.stroke.statistics.path.duplicateInputs,2);assert.equal(result.stroke.statistics.generatedDabs,9);
});
test('net-zero history has no entry; draft cancellation does not evict; memory eviction stays explicitly bounded',()=>{
  const t=make(4),history=createSolidCubeHistory(t,{maxEntries:1}),run=(op:ReturnType<typeof history.beginOperation>)=>{
    while(op.stage==='preparing')op.pumpPreparation(7);while(op.stage==='collecting')op.pumpBookkeeping(1);op.commitDab();
  };
  const first=history.beginOperation(t);first.startDab(p('px',2),settings('raise',2));run(first);first.finish('released');const before=words(t);
  const second=history.beginOperation(t);second.startDab(p('px',-2),settings('raise',2));run(second);second.startDab(p('px',-2),settings('lower',2));run(second);
  assert.equal(second.finish('released'),false);assert.equal(history.statistics.entries,1);assert.equal(history.statistics.evictions,0);assert.deepEqual(words(t),before);
  const memory=createSolidCubeSession(make(4),{maxEntries:32,maxBytes:12288});
  for(const u of [-2,2]){const s=memory.begin(p('px',u),settings('raise',2));s.release();until(s,()=>s.status==='complete');}
  assert.equal(memory.history.statistics.entries,1);assert.equal(memory.history.statistics.evictions,1);assert.equal(memory.history.statistics.retainedBytes,12288);
  const s=memory.begin(p('px'),settings('raise',2));until(s,()=>s.statistics.pendingDabStage==='reserved');s.cancel();assert.equal(memory.history.statistics.entries,1);assert.equal(memory.history.statistics.evictions,1);
});
test('publication rejection leaves the ready dab unpublished and prior commits exactly undoable',()=>{
  const actual=make(4),before=words(actual);let reject=false;
  const authority=Object.freeze({...actual,get revision(){return actual.revision;},commitPreparedPatch:(...args:Parameters<SolidCubeTerrain['commitPreparedPatch']>)=>{
    if(reject)throw new Error('Injected pre-publication rejection.');return actual.commitPreparedPatch(...args);
  }});
  const session=createSolidCubeSession(authority),stroke=session.begin(p('px',-2),settings('raise',2));stroke.accept(p('px',2));
  until(stroke,()=>stroke.statistics.committedDabs===1);const prefix=words(actual);until(stroke,()=>stroke.statistics.pendingDabStage==='reserved');reject=true;
  assert.throws(()=>stroke.pump(),/rejection/);assert.deepEqual(words(actual),prefix);assert.equal(session.history.statistics.entries,1);assert.equal(stroke.status,'failed');
  reject=false;session.undo();assert.deepEqual(words(actual),before);session.redo();assert.deepEqual(words(actual),prefix);
});
test('history eviction is bounded, foreign histories reject, disposal seals the prefix, and invalid controls do not mutate',()=>{
  const t=make(4),session=createSolidCubeSession(t,{maxEntries:1,maxBytes:12288});
  for(const u of [-2,2]){const s=session.begin(p('px',u),settings('raise',2));s.release();until(s,()=>s.status==='complete');}
  assert.equal(session.history.statistics.entries,1);assert.equal(session.history.statistics.evictions,1);assert.ok(session.history.statistics.retainedBytes<=12288);
  const h=createSolidCubeHistory(t);assert.throws(()=>h.beginOperation(make(4)),/Foreign/);
  const s=session.begin(p('px'),settings('raise',2));until(s,()=>s.statistics.committedDabs===1);session.dispose();assert.equal(s.status,'disposed');assert.equal(session.disposed,true);assert.throws(()=>session.begin(p('px'),settings('raise')));
  const fresh=createSolidCubeSession(make());for(const radius of [0,Infinity,Number.MIN_VALUE])assert.throws(()=>fresh.begin(p('px'),settings('raise',radius)));
  const valid=fresh.begin(p('px'),settings('raise'));assert.throws(()=>valid.pump(0));valid.cancel();assert.equal(fresh.history.statistics.entries,0);
  assert.throws(()=>fresh.begin(p('px'),settings('raise'),{dabLimits:{maxWorkUnits:Infinity}}));
});
test('cancellation also detects intervening external mutation and retains the exact conflict prefix',()=>{
  const t=make(4),session=createSolidCubeSession(t),s=session.begin(p('px',-2),settings('raise',2));until(s,()=>s.statistics.committedDabs===1);
  t.write(t.keyAt(t.sampleCount-1),77);const foreign=words(t);assert.equal(s.cancel(),'failed');assert.ok(s.failure);assert.deepEqual(words(t),foreign);
  assert.equal(session.history.operations[0]!.termination,'failed');session.undo();assert.equal(t.read(t.keyAt(t.sampleCount-1)),77);
});
test('long exact input cannot reset C2A radical spacing to evade its limits; prefix remains undoable',()=>{
  const t=make(),before=words(t),session=createSolidCubeSession(t),s=session.begin(p('px',3),settings('raise',1_000_000));
  until(s,()=>s.statistics.committedDabs===1);const prefix=words(t);let failed=false;
  try{for(let i=1;i<170;i++){const q=p('px',3*Math.sin(i*.1),3*Math.cos(i*.3));while(!s.accept(q))s.pump();
    while(s.statistics.path.pendingInputs||s.statistics.path.activeRoute)s.pump();}}
  catch{failed=true;}
  assert.equal(failed,true);assert.equal(s.status,'failed');assert.match(s.failure!.message,/radical|work|precision/);assert.equal(s.statistics.committedDabs,1);assert.deepEqual(words(t),prefix);
  session.undo();assert.deepEqual(words(t),before);session.redo();assert.deepEqual(words(t),prefix);
});
