import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createSolidCubeTerrain } from '../src/terrain/solid-cube.ts';
import { prepareSolidCubeDab } from '../src/terrain/solid-cube-brush.ts';
import { createCubeBrushDistancePlan, cubeBrushRatioRoot, cubeBrushFalloff, cubeNextUp, cubeNextDown } from '../src/surfaces/cube-brush-distance.ts';
import { SOLID_CUBE_PROVIDER, SOLID_CUBE_FACES, SOLID_CUBE_PHYSICAL_EDGES, SOLID_CUBE_CORNERS } from '../src/surfaces/solid-cube.ts';
const prefix = process.argv[2] ?? '.local/cube-c1-', sha = (b) => createHash('sha256').update(b).digest('hex');
const json = (v) => JSON.stringify(v, (_, x) => typeof x === 'bigint' ? x.toString() : x, 2)+'\n';
const identity = { worldId:'cube-c1-certificate',surfaceId:'exterior' };
const config = (length=8) => ({ identity,provider:SOLID_CUBE_PROVIDER,version:1,configuration:'solid',role:'exterior',sideLengthMeters:length });
const make = (n=2,length=8) => createSolidCubeTerrain({ terrainId:`certificate-${n}-${length}`,geometry:config(length),cellsPerEdge:n });
const point = (patchId,u=0,v=0) => ({ ...identity,patchId,u,v });
const meter = () => ({ work:0,tick(){this.work++;},sequenceTests:0,portalTests:0,squaredRejected:0,chordRejected:0,commonFace:0,rootComparisons:0,rootFallbacks:0 });
const drain = (g) => { for (;;) { const s=g.next(); if(s.done)return s.value; } };
const words = (t) => new Uint32Array(t.copyElevations().buffer);
const ready = (dab,steps=256) => { while(dab.status==='preparing')dab.pump(steps); return dab; };
const seed = (t) => { for(const key of t.samples())t.write(key,key.index===0?-0:((key.index*17)%41-20)*3); };
const geometryCases=[], dabs=[], sampleProofs=[],largeWordCases=[];
function geometryCase(t,center,radius,key,label,plan) {
  const a=t.owner(key), position=t.positionAt(a), m=meter(); plan??=createCubeBrushDistancePlan(t,center,radius,m);
  const squared=drain(plan.squared(a.patchId,a.column,a.row)), root=squared===null?null:drain(cubeBrushRatioRoot(squared,plan.radiusSquared,m));
  const entry={label,sideLengthMeters:t.metadata.geometry.sideLengthMeters,center,radiusMeters:radius,position,address:a,index:key.index,
    gridExponent:plan.exponent,squared,inside:squared!==null,root,weight:root===null?null:cubeBrushFalloff(root)};
  geometryCases.push(entry); return geometryCases.length-1;
}
const model=make(), centers=[...SOLID_CUBE_FACES.map((f)=>point(f)),...SOLID_CUBE_PHYSICAL_EDGES.map((e)=>point(e.face,e.edge.startsWith('u')?(e.edge.endsWith('min')?-4:4):0,e.edge.startsWith('v')?(e.edge.endsWith('min')?-4:4):0)),
  ...SOLID_CUBE_CORNERS.map((c)=>model.geometry.positionsForReference(c.signs.map((v)=>v*4))[0])];
for(const [i,center] of centers.entries()) {
  const radius=6.5, plan=createCubeBrushDistancePlan(model,center,radius,meter());
  const samples=[...model.samples()].map((key)=>({address:model.owner(key),position:model.positionAt(model.owner(key)),caseIndex:geometryCase(model,center,radius,key,`small-center-${i}-sample-${key.index}`,plan)}));
  const settings=[{version:1,tool:'raise',radiusMeters:radius,strengthMeters:30},{version:1,tool:'lower',radiusMeters:radius,strengthMeters:30},
    {version:1,tool:'smooth',radiusMeters:radius,intensity:.8},{version:1,tool:'flatten',radiusMeters:radius,intensity:.7,targetElevation:-43}];
  if(i===0)settings.push(...[120,0,-120,-0].map((targetElevation)=>({version:1,tool:'flatten',radiusMeters:radius,intensity:1,targetElevation})),{version:1,tool:'smooth',radiusMeters:radius,intensity:0},{version:1,tool:'flatten',radiusMeters:radius,intensity:0,targetElevation:0});
  for(const s of settings){const t=make();seed(t);const before=words(t),revision=t.revision,dab=ready(prepareSolidCubeDab(t,center,s),17),dry=words(t),revisionAfterPrepare=t.revision,writes=dab.commit();
    dabs.push({label:`${s.tool}-center-${i}-variant-${dabs.length}`,sideLengthMeters:8,cellsPerEdge:2,settings:s,targetNegativeZero:Object.is(s.targetElevation,-0),samples,
      beforeWords:[...before],dryRunWords:[...dry],afterWords:[...words(t)],revisionBefore:revision,revisionAfterPrepare,revisionAfter:t.revision,writes,statistics:dab.statistics});}
}
// Boundary, cut-locus, four-face, decimal, near-corner and extreme geometry cases.
for(const [label,length,n,center,target] of [
  ['opposite-centers-four-ties-inside',8,8,point('px'),['nx',4,4]],
  ['opposite-corners-six-ties-inside',8,8,point('px',4,4),['nx',8,0]],
  ['literal-four-face-inside',10,10,point('px',-4,-3),['nx',2,9]],
]) {
  const t=make(n,length),[patchId,column,row]=target;
  geometryCase(t,center,length*4,t.resolve({...identity,patchId,column,row}),label);
}
for(const [length,n,center,radius] of [[8,4,point('px'),2],[8,4,point('px'),cubeNextDown(2)],[8,4,point('px'),cubeNextUp(2)],
  [8,8,point('px',3.999999999999,3.999999999999),3],[8,8,point('px',-3.2,-2.4),32],[8,8,point('px',Number.MIN_VALUE),32],
  [8,8,point('ny',-.7,.3),2.1],[1e-140,8,point('px',Number.MIN_VALUE),4e-140],[5e153,8,point('px',Number.MIN_VALUE),2e154],
  [8,8,point('px'),Number.MAX_VALUE]]) {
  const t=make(n,length), plan=createCubeBrushDistancePlan(t,center,radius,meter());
  const indices=n===4?[0,4,12,13,17,24,25,40,60,80,97]:[0,3,17,40,80,120,180,260,t.sampleCount-1];
  for(const index of indices)geometryCase(t,center,radius,t.keyAt(index),`special-${geometryCases.length}`,plan);
}
// Selected N128/N256 near-edge/corner/inside/outside queries; full-word dry-run invariance.
for(const n of [128,256]) {
  const t=make(n);seed(t); const before=words(t),revision=t.revision,center=point('px',3.95,3.95),radius=.4,plan=createCubeBrushDistancePlan(t,center,radius,meter());
  const dab=ready(prepareSolidCubeDab(t,center,{version:1,tool:'smooth',radiusMeters:radius,intensity:.7})),changes=[...dab.preparedChanges(t)];
  assert.deepEqual(words(t),before);assert.equal(t.revision,revision);
  const indices=new Set([0,1,n,n+1,t.sampleCount-1,...changes.filter((_,i)=>i%Math.max(1,Math.floor(changes.length/24))===0).map((c)=>c.index)]);
  for(const index of indices)geometryCase(t,center,radius,t.keyAt(index),`N${n}-${index}`,plan);
  sampleProofs.push({n,samples:t.sampleCount,sourceBytes:t.elevationByteLength,sourceRevision:revision,afterPrepareRevision:t.revision,
    sourceSha256:sha(before),dryRunSha256:sha(words(t)),fullWordsExact:true,selectedGeometryChecks:indices.size,changesPrepared:changes.length,statistics:dab.statistics});dab.cancel();
  for(const settings of [{version:1,tool:'raise',radiusMeters:radius,strengthMeters:30},{version:1,tool:'lower',radiusMeters:radius,strengthMeters:30},
    {version:1,tool:'smooth',radiusMeters:radius,intensity:.8},{version:1,tool:'flatten',radiusMeters:radius,intensity:.7,targetElevation:-43}]) {
    const prepared=ready(prepareSolidCubeDab(t,center,settings)),changes=[...prepared.preparedChanges(t)],after=new Map(changes.map((c)=>[c.index,c.after]));
    const selected=[...new Set([0,1,n,t.sampleCount-1,...changes.filter((_,i)=>i%Math.max(1,Math.ceil(changes.length/24))===0).map((c)=>c.index)])];
    for(const index of selected){const key=t.keyAt(index),position=t.positionAt(t.owner(key)),record=Float32Array.of(after.get(index)??t.read(key));
      largeWordCases.push({label:`N${n}-${settings.tool}-${index}`,sideLengthMeters:8,cellsPerEdge:n,settings,position,caseIndex:geometryCase(t,center,radius,key,`large-word-${largeWordCases.length}`,plan),
        beforeWord:before[index],afterWord:new Uint32Array(record.buffer)[0],neighbors:t.neighbors(key).map((k)=>({index:k.index,position:t.positionAt(t.owner(k)),word:before[k.index]}))});}
    assert.deepEqual(words(t),before);assert.equal(t.revision,revision);prepared.cancel();
  }
}
writeFileSync(prefix+'oracle-input.json',json({geometryCases,dabs,largeWordCases}));
const python=spawnSync('python',['scripts/cube-dab-reference.py'],{input:json({geometryCases,dabs,largeWordCases}),encoding:'utf8',windowsHide:true,maxBuffer:64*1024*1024});
writeFileSync(prefix+'oracle-stderr.txt',python.stderr??'');if(python.status!==0)throw Error(`Independent dab oracle failed: ${python.stderr??python.error}`);
const certificate=JSON.parse(python.stdout);
assert.equal(certificate.cases.find((c)=>c.label==='opposite-centers-four-ties-inside').physicalShortestRoutes,4);
assert.equal(certificate.cases.find((c)=>c.label==='opposite-corners-six-ties-inside').physicalShortestRoutes,6);
assert.equal(certificate.cases.find((c)=>c.label==='literal-four-face-inside').squaredNumerator,'400');
writeFileSync(prefix+'oracle-certificate.json',json(certificate));writeFileSync(prefix+'sample-preservation.json',json(sampleProofs));
console.log(json({geometryCases:certificate.geometryCases,dabs:certificate.dabs,verifiedFloat32Words:certificate.verifiedFloat32Words,selectedLargeWords:certificate.selectedLargeWords,oracleMs:certificate.elapsedMs,sampleProofs}));
