import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createSolidCubeSession} from '../src/editor/solid-cube-session.ts';
import {createSolidCubeTerrain} from '../src/terrain/solid-cube.ts';
import {prepareSolidCubeDab} from '../src/terrain/solid-cube-brush.ts';
import {createSolidCubeStrokePath} from '../src/surfaces/solid-cube-stroke-path.ts';
import {createCubeBrushDistancePlan,cubeBrushRatioRoot,cubeBrushFalloff} from '../src/surfaces/cube-brush-distance.ts';
import {createSolidCubeGeometry,SOLID_CUBE_PROVIDER,SOLID_CUBE_FACES,SOLID_CUBE_PHYSICAL_EDGES,SOLID_CUBE_CORNERS} from '../src/surfaces/solid-cube.ts';
const prefix=process.argv[2]??'.local/cube-c2b1-',json=v=>JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x,2)+'\n',sha=v=>createHash('sha256').update(v).digest('hex');
const identity={worldId:'c2b1-certificate',surfaceId:'exterior'},configuration=side=>({identity,provider:SOLID_CUBE_PROVIDER,version:1,configuration:'solid',role:'exterior',sideLengthMeters:side});
const p=(patchId,u=0,v=0)=>({...identity,patchId,u,v}),make=(n=2,side=8)=>createSolidCubeTerrain({terrainId:`c2b1-${n}-${side}`,geometry:configuration(side),cellsPerEdge:n});
const words=t=>new Uint32Array(t.copyElevations().buffer),seed=t=>{for(const k of t.samples())t.write(k,k.index===0?-0:((k.index*17)%41-20)*3);};
const tools=['raise','lower','smooth','flatten'],settings=(tool,radiusMeters)=>({version:1,tool,radiusMeters,...(tool==='raise'||tool==='lower'?{strengthMeters:30}:{intensity:.8,...(tool==='flatten'?{targetElevation:-43}:{})})});
function centers(points,s,side){
 const path=createSolidCubeStrokePath(configuration(side),s.radiusMeters),out=[];
 const take=()=>{for(;;){const e=path.take();if(!e)break;if(e.kind==='dab')out.push(e.center);}};
 for(const q of points)while(!path.accept(q)){path.pump();take();}path.release();while(path.status==='draining'){path.pump();take();}return out;
}
const geometryCases=[],smallCases=[],largeCases=[],resources=[],faultCases=[];
const meter=()=>({tick(){},sequenceTests:0,portalTests:0,squaredRejected:0,chordRejected:0,commonFace:0,rootComparisons:0,rootFallbacks:0});
const drain=g=>{for(;;){const s=g.next();if(s.done)return s.value;}};
function geometricSamples(t,center,radius,label){
 const plan=createCubeBrushDistancePlan(t,center,radius,meter());
 return [...t.samples()].map(key=>{const address=t.owner(key),position=t.positionAt(address),m=meter(),squared=drain(plan.squared(address.patchId,address.column,address.row));
  const root=squared===null?null:drain(cubeBrushRatioRoot(squared,plan.radiusSquared,m)),caseIndex=geometryCases.length;
  geometryCases.push({label:`${label}-${key.index}`,sideLengthMeters:t.metadata.geometry.sideLengthMeters,center,radiusMeters:radius,position,address,index:key.index,gridExponent:plan.exponent,squared,inside:squared!==null,root,weight:root===null?null:cubeBrushFalloff(root)});
  return {address,position,caseIndex};
 });
}
function execute(label,n,points,s,{side=8,stopAfter,options={},historyLimits={},stopStage}={}){
 const t=make(n,side),reference=make(n,side);seed(t);seed(reference);const initial=words(t),expectedCenters=centers(points,s,side);
 const session=createSolidCubeSession(t,historyLimits),stroke=session.begin(points[0],s,options),snapshots=[],dabs=[],trace=[];
 let previous=initial,revision=t.revision,preparedSeen=-1,commits=0,stopped=false,error;
 const pump=()=>{
  const before=stroke.statistics;stroke.pump(label.includes('dense')?17:256);const after=stroke.statistics;
  if(before.pendingDabStage!==after.pendingDabStage||before.committedDabs!==after.committedDabs)trace.push({stage:after.lastStage,generated:after.generatedDabs,prepared:after.preparedDabs,reserved:after.reservedDabs,committed:after.committedDabs,sourceRevision:t.revision,pendingSourceRevision:after.pendingSourceRevision});
  if(after.pendingDabStage==='collecting'&&preparedSeen!==after.generatedDabs){assert.equal(after.pendingSourceRevision,t.revision);assert.equal(t.revision,revision);assert.deepEqual(words(t),previous);preparedSeen=after.generatedDabs;}
  if(after.pendingDabStage==='reserved'){assert.equal(t.revision,revision);assert.deepEqual(words(t),previous);}
  if(after.committedDabs>commits){
   assert.equal(after.committedDabs,commits+1);const center=after.lastCommittedCenter;assert.deepEqual(center,expectedCenters[commits]);
   // Independent minimal sequential executor: ONLY accepted C1, no session,
   // lease/history reservation, progress handling or new execution code.
   const r=prepareSolidCubeDab(reference,expectedCenters[commits],s);while(r.status==='preparing')r.pump(61);r.commit();
   const current=words(t),expected=words(reference);assert.deepEqual(current,expected);
   const statistics=after.history.lastDabStatistics;assert.equal(t.revision,revision+statistics.writes);
   snapshots.push({actual:current,reference:expected});
   if(n===2)dabs.push({label:`${label}-dab-${commits}`,sideLengthMeters:side,cellsPerEdge:n,settings:s,targetNegativeZero:Object.is(s.targetElevation,-0),samples:geometricSamples(t,center,s.radiusMeters,`${label}-${commits}`),
    beforeWords:[...previous],dryRunWords:[...previous],afterWords:[...current],revisionBefore:revision,revisionAfterPrepare:revision,revisionAfter:t.revision,writes:statistics.writes,statistics});
   previous=current;revision=t.revision;commits++;
  }
 };
 try{
  for(const q of points.slice(1))while(!stroke.accept(q))pump();stroke.release();
  let pumps=0;while(stroke.status==='draining'){
   if(++pumps>2_000_000)throw Error('Verification driver bound exceeded.');
   if(stopAfter!==undefined&&commits>=stopAfter&&(!stopStage||stroke.statistics.pendingDabStage===stopStage)){
    stopped=true;stroke.cancel();break;
   }
   pump();
  }
 }catch(e){error=String(e);assert.equal(stroke.status,'failed');}
 assert.ok(stroke.status==='complete'||stroke.status==='cancelled'||stroke.status==='failed');
 const final=words(t);assert.deepEqual(final,words(reference));
 const changes=session.history.statistics.entries?[...session.history.changes(0)]:[],net=[...initial.keys()].filter(i=>initial[i]!==final[i]).map(index=>({index,beforeWord:initial[index],afterWord:final[index]}));assert.deepEqual(changes,net);
 const operations=session.history.operations;assert.equal(operations.length,net.length?1:0);
 let undo=final,redo=final;if(net.length){assert.equal(session.undo(),true);undo=words(t);assert.deepEqual(undo,initial);assert.equal(session.redo(),true);redo=words(t);assert.deepEqual(redo,final);}
 const item={label,n,sideLengthMeters:side,settings:s,inputs:points,status:stroke.status,error,stopped,committedDabs:commits,expectedCenterCount:expectedCenters.length,statistics:stroke.statistics,
  operations,changes,trace,initialWords:n===2?[...initial]:undefined,finalWords:n===2?[...final]:undefined,undoWords:n===2?[...undo]:undefined,redoWords:n===2?[...redo]:undefined,dabs};
 if(n===2)smallCases.push(item);
 else{
  assert.equal(new Uint8Array(Uint32Array.of(0x01020304).buffer)[0],4,'This evidence stream uses little-endian uint32.');
  const blocks=[['initial',initial],...snapshots.flatMap((r,i)=>[[`actual-${i}`,r.actual],[`reference-${i}`,r.reference]]),['final',final],['undo',undo],['redo',redo]],vectors=[];let offset=0;
  const raw=Buffer.concat(blocks.map(([name,array])=>{const data=Buffer.from(array.buffer,array.byteOffset,array.byteLength);vectors.push({name,offsetBytes:offset,wordCount:array.length,sha256:sha(data)});offset+=data.length;return data;}));
  const compressed=gzipSync(raw),path=prefix+`full-words-${label}.bin.gz`;writeFileSync(path,compressed);
  item.fullWords={path,encoding:'uint32-le',uncompressedBytes:raw.length,compressedBytes:compressed.length,sha256:sha(compressed),uncompressedSha256:sha(raw),vectors};largeCases.push(item);
 }
 if(stroke.status!=='complete')resources.push({label,status:stroke.status,error,committedDabs:commits,uncommittedGeneratedDabs:stroke.statistics.uncommittedGeneratedDabs,fullPrefixAndReplayExact:true,statistics:stroke.statistics});
 return item;
}
for(const [i,f] of SOLID_CUBE_FACES.entries())execute(`face-${f}`,2,[p(f),p(f,1)],settings(tools[i%4],4));
for(const [i,e] of SOLID_CUBE_PHYSICAL_EDGES.entries())execute(`edge-${e.edgeId}`,2,[p(e.face),p(e.toFace)],settings(tools[i%4],8));
const geometry=createSolidCubeGeometry(configuration(8));
for(const [i,c] of SOLID_CUBE_CORNERS.entries())execute(`corner-${c.cornerId}`,2,[geometry.positionsForReference(c.signs.map(s=>4*s))[0],geometry.positionsForReference(c.signs.map(s=>-4*s))[0]],settings(tools[i%4],8));
for(const tool of tools){
 execute(`four-face-${tool}`,2,[p('px',-4,-3),p('nx',-3,4)],settings(tool,8),{side:10});
 execute(`dense-four-face-${tool}`,2,[p('px',-4,-3),p('ny',3,1),p('pz',-3,-1),p('nx',-3,4)],settings(tool,8),{side:10});
 for(const n of [128,256])execute(`N${n}-${tool}`,n,[p('px',3.9),p('py',-3.9)],settings(tool,.4));
}
for(const tool of tools){execute(`cancel-${tool}`,2,[p('px'),p('py')],settings(tool,4),{stopAfter:2,stopStage:'preparing'});}
execute('cancel-zero',2,[p('px'),p('py')],settings('raise',4),{stopAfter:0});
execute('fail-path',2,[p('px'),p('nx')],settings('raise',4),{options:{pathLimits:{maxStepWork:1}}});
execute('fail-work',2,[p('px'),p('py')],settings('raise',4),{options:{maxDabWorkUnits:2000}});
execute('fail-history',2,[p('px'),p('py')],settings('raise',4),{historyLimits:{maxBookkeepingSteps:5}});
execute('no-op',2,[p('px'),p('py')],{version:1,tool:'smooth',radiusMeters:4,intensity:0});
const zero=execute('signed-zero',2,[p('px',4,4)],{version:1,tool:'flatten',radiusMeters:1,intensity:1,targetElevation:-0});assert.ok(zero.finalWords.includes(0x80000000));
for(const kind of ['external-disjoint','external-overlap','publication-rejection','history-samples']){
 const actual=make(4);seed(actual);let reject=false;
 const t=kind==='publication-rejection'?Object.freeze({...actual,get revision(){return actual.revision;},commitPreparedPatch:(...args)=>{if(reject)throw Error('Injected pre-publication rejection.');return actual.commitPreparedPatch(...args);}}):actual;
 const initial=words(t),revision=t.revision,s=settings('raise',2),session=createSolidCubeSession(t,kind==='history-samples'?{maxStrokeSamples:1}:{}),stroke=session.begin(p('px',-2),s);stroke.accept(p('px',2));
 while(stroke.statistics.committedDabs<1)stroke.pump(17);
 const prefixWords=words(t),firstStatistics=stroke.statistics.history.lastDabStatistics,firstRevision=t.revision;
 const firstDab={label:kind,sideLengthMeters:8,cellsPerEdge:4,settings:s,targetNegativeZero:false,samples:geometricSamples(t,p('px',-2),2,kind),beforeWords:[...initial],dryRunWords:[...initial],afterWords:[...prefixWords],revisionBefore:revision,revisionAfterPrepare:revision,revisionAfter:firstRevision,writes:firstStatistics.writes,statistics:firstStatistics};
 let external,blockedReplay=false,blockedWords;
 if(kind!=='history-samples')while(stroke.statistics.pendingDabStage!=='reserved')stroke.pump(17);
 if(kind.startsWith('external')){
  const index=kind==='external-disjoint'?t.sampleCount-1:[...prefixWords.keys()].find(i=>initial[i]!==prefixWords[i]);t.write(t.keyAt(index),77);external={index,word:new Uint32Array(Float32Array.of(77).buffer)[0],overlap:kind==='external-overlap'};
 }else if(kind==='publication-rejection')reject=true;
 assert.throws(()=>{while(stroke.status==='drawing')stroke.pump(17);});assert.equal(stroke.status,'failed');assert.equal(stroke.statistics.committedDabs,1);
 const current=words(t),expected=prefixWords.slice();if(external)expected[external.index]=external.word;assert.deepEqual(current,expected);
 if(external?.overlap){const cursor=session.history.statistics.cursor;assert.throws(()=>session.undo());blockedWords=words(t);assert.deepEqual(blockedWords,current);assert.equal(session.history.statistics.cursor,cursor);blockedReplay=true;actual.write(actual.keyAt(external.index),new Float32Array(prefixWords.buffer)[external.index]);}
 reject=false;const changes=[...session.history.changes(0)];session.undo();const undo=words(t),expectedUndo=initial.slice();if(external&&!external.overlap)expectedUndo[external.index]=external.word;assert.deepEqual(undo,expectedUndo);
 session.redo();const redo=words(t),expectedRedo=prefixWords.slice();if(external&&!external.overlap)expectedRedo[external.index]=external.word;assert.deepEqual(redo,expectedRedo);
 stroke.pump(4096);assert.deepEqual(words(t),redo);
 faultCases.push({kind,initial:[...initial],prefix:[...prefixWords],current:[...current],undo:[...undo],redo:[...redo],external,blockedReplay,blockedWords:blockedWords&&[...blockedWords],changes,firstDab,statistics:stroke.statistics,fullPrefixAndReplayExact:true});
}
for(const a of smallCases.filter(c=>c.label.startsWith('dense-'))){const b=smallCases.find(c=>c.label===a.label.slice(6));assert.deepEqual(a.finalWords,b.finalWords);assert.deepEqual(a.changes,b.changes);}
const payload={geometryCases,smallCases,largeCases,faultCases};writeFileSync(prefix+'execution-oracle-input.json',json(payload));writeFileSync(prefix+'resource-prefix-evidence.json',json({stoppedGestures:resources,faultCases}));
const python=spawnSync('python',['scripts/cube-execution-reference.py'],{input:json(payload),encoding:'utf8',windowsHide:true,maxBuffer:128*1024*1024});writeFileSync(prefix+'execution-oracle-stderr.txt',python.stderr);assert.equal(python.status,0,python.stderr);
const certificate=JSON.parse(python.stdout);writeFileSync(prefix+'execution-oracle-certificate.json',json(certificate));console.log(json({...certificate,smallResults:undefined,largeResults:undefined,faultResults:undefined}));
