import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createSolidCubeStrokePath} from '../src/surfaces/solid-cube-stroke-path.ts';
import {createSolidCubeRouter} from '../src/surfaces/solid-cube-routing.ts';
import {createSolidCubeGeometry,SOLID_CUBE_PROVIDER,SOLID_CUBE_FACES,SOLID_CUBE_PHYSICAL_EDGES,SOLID_CUBE_CORNERS} from '../src/surfaces/solid-cube.ts';
import {createSolidCubeTerrain} from '../src/terrain/solid-cube.ts';
import {prepareSolidCubeDab} from '../src/terrain/solid-cube-brush.ts';
import {createCubeBrushDistancePlan,cubeBrushRatioRoot,cubeBrushFalloff} from '../src/surfaces/cube-brush-distance.ts';
const prefix=process.argv[2]??'.local/cube-c2a-',json=v=>JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x,2)+'\n';
const identity={worldId:'c2a-certificate',surfaceId:'outside'},config=(side=10)=>({identity,provider:SOLID_CUBE_PROVIDER,version:1,configuration:'solid',role:'exterior',sideLengthMeters:side});
const p=(patchId,u=0,v=0)=>({...identity,patchId,u,v}),geometry=createSolidCubeGeometry(config());
const cases=[];
function capture(label,inputs,radius=4,configuration=config()){
 const path=createSolidCubeStrokePath(configuration,radius),events=[];
 const drain=()=>{for(;;){const e=path.take();if(!e)break;events.push(e);}};
 for(const point of inputs)while(!path.accept(point)){path.pump();drain();}
 path.release();while(path.status==='draining'){path.pump();drain();}assert.equal(path.status,'complete');
 const paths=events.filter(e=>e.kind==='path'),dabs=events.filter(e=>e.kind==='dab');
 const routeQueries=paths.map((e,i)=>({label:`${label}-${i}`,sideLengthMeters:configuration.sideLengthMeters,first:e.from,second:e.to,result:createSolidCubeRouter(configuration).route(e.from,e.to)}));
 for(const e of paths)assert.deepEqual(e.route,routeQueries.find(q=>q.first===e.from&&q.second===e.to).result.routes[e.route.index]);
 return {label,inputs,sideLengthMeters:configuration.sideLengthMeters,spacingMeters:path.spacingMeters,paths,dabs,routeQueries,statistics:path.statistics};
}
for(const f of SOLID_CUBE_FACES){cases.push(capture(`face-${f}`,[p(f),p(f,3,4)],1));cases.push(capture(`dense-face-${f}`,[p(f),p(f,1.5,2),p(f,3,4)],1));}
for(const edge of SOLID_CUBE_PHYSICAL_EDGES){const a=p(edge.face),b=p(edge.toFace),mid=geometry.positionsForReference(geometry.referencePosition(p(edge.face,edge.edge.startsWith('u')?(edge.edge.endsWith('min')?-5:5):0,edge.edge.startsWith('v')?(edge.edge.endsWith('min')?-5:5):0)))[0];
 cases.push(capture(`edge-${edge.edgeId}`,[a,b]));cases.push(capture(`dense-edge-${edge.edgeId}`,[a,mid,b]));}
for(const c of SOLID_CUBE_CORNERS){const a=geometry.positionsForReference(c.signs.map(s=>s*5))[0],b=geometry.positionsForReference(c.signs.map(s=>-s*5))[0];cases.push(capture(`corner-${c.cornerId}`,[p(a.patchId),a,b,a],8));}
cases.push(capture('four-face',[p('px',-4,-3),p('nx',-3,4)]));
cases.push(capture('dense-four-face',[p('px',-4,-3),p('ny',3,1),p('pz',-3,-1),p('nx',-3,4)]));
cases.push(capture('irrational-bend',[p('px'),p('px',3,3),p('px',4,1)],1));
cases.push(capture('dense-irrational-bend',[p('px'),p('px',.75,.75),p('px',1.5,1.5),p('px',3,3),p('px',3.5,2),p('px',4,1)],1));
cases.push(capture('near-boundary',[p('px',5-2**-49,5-2**-49),p('nx',-5+2**-49,-5+2**-49)],8));
cases.push(capture('subnormal',[p('px',Number.MIN_VALUE),p('nx')],8));
cases.push(capture('continuation-and-backtrack',[p('px',1,0),p('px'),p('nx'),p('px')],8));
const bending=Array.from({length:17},(_,i)=>p('px',-4+i/4,(i*i%31)/8-2));
cases.push(capture('many-bends',bending));cases.push(capture('dense-many-bends',bending.flatMap((q,i)=>i?[p('px',(q.u+bending[i-1].u)/2,(q.v+bending[i-1].v)/2),q]:[q])));
for(const a of cases.filter(c=>c.label.startsWith('dense-'))){const b=cases.find(c=>c.label===a.label.slice(6));assert.deepEqual(a.dabs.map(d=>d.center),b.dabs.map(d=>d.center));}
function oracle(script,payload,out){const result=spawnSync('python',[script],{input:json(payload),encoding:'utf8',windowsHide:true,maxBuffer:128*1024*1024});assert.equal(result.status,0,result.stderr);const parsed=JSON.parse(result.stdout);writeFileSync(prefix+out,json(parsed));return parsed;}
writeFileSync(prefix+'stroke-oracle-input.json',json(cases));const certificate=oracle('scripts/cube-stroke-reference.py',cases,'stroke-oracle-certificate.json');
// Accepted Cube-C1 oracle checks prepared values at emitted centers. No patch is committed.
const geometryCases=[],largeWordCases=[],proofs=[],sha=v=>createHash('sha256').update(v).digest('hex');
const words=t=>new Uint32Array(t.copyElevations().buffer),word=x=>new Uint32Array(Float32Array.of(x).buffer)[0];
const meter=()=>({tick(){},sequenceTests:0,portalTests:0,squaredRejected:0,chordRejected:0,commonFace:0,rootComparisons:0,rootFallbacks:0});
const drain=g=>{for(;;){const s=g.next();if(s.done)return s.value;}};
for(const n of [2,128,256]){
 const configuration=config(8),t=createSolidCubeTerrain({terrainId:`c2a-N${n}`,geometry:configuration,cellsPerEdge:n});
 for(const k of t.samples())t.write(k,k.index===0?-0:((k.index*17)%41-20)*3);
 const source=words(t),revision=t.revision,radius=n===2?4.5:.4;
 const centers=capture(`integration-${n}`,[p('px',n===2?3:3.9),p('py',n===2?-3:-3.9)],radius,configuration).dabs.map(d=>d.center);
 for(const [ci,center] of centers.entries())for(const settings of [{version:1,tool:'raise',radiusMeters:radius,strengthMeters:30},{version:1,tool:'lower',radiusMeters:radius,strengthMeters:30},
  {version:1,tool:'smooth',radiusMeters:radius,intensity:.8},{version:1,tool:'flatten',radiusMeters:radius,intensity:.7,targetElevation:-43}]){
  const a=prepareSolidCubeDab(t,center,settings),b=prepareSolidCubeDab(t,center,settings);
  while(a.status==='preparing')a.pump(17);while(b.status==='preparing')b.pump(256);
  assert.equal(a.status,'ready');assert.equal(b.status,'ready');const changes=[...a.preparedChanges(t)];assert.deepEqual(changes,[...b.preparedChanges(t)]);
  const selected=n===2?[...t.samples()].map(k=>k.index):[...new Set([0,t.sampleCount-1,...changes.filter((_,i)=>i%Math.max(1,Math.ceil(changes.length/16))===0).map(c=>c.index)])];
  const after=new Map(changes.map(c=>[c.index,c.after])),plan=createCubeBrushDistancePlan(t,center,radius,meter());
  for(const index of selected){const key=t.keyAt(index),address=t.owner(key),position=t.positionAt(address),m=meter(),squared=drain(plan.squared(address.patchId,address.column,address.row));
   const root=squared===null?null:drain(cubeBrushRatioRoot(squared,plan.radiusSquared,m));const caseIndex=geometryCases.length;
   geometryCases.push({label:`N${n}-${ci}-${settings.tool}-${index}`,sideLengthMeters:8,center,radiusMeters:radius,position,address,index,gridExponent:plan.exponent,squared,inside:squared!==null,root,weight:root===null?null:cubeBrushFalloff(root)});
   largeWordCases.push({label:`N${n}-${ci}-${settings.tool}-${index}`,sideLengthMeters:8,cellsPerEdge:n,settings,position,caseIndex,beforeWord:source[index],afterWord:word(after.get(index)??t.read(key)),neighbors:t.neighbors(key).map(k=>({position:t.positionAt(t.owner(k)),word:source[k.index]}))});
  }
  assert.equal(t.revision,revision);assert.deepEqual(words(t),source);
  proofs.push({n,center,settings,changedWords:changes.length,allPreparedWordsEqualAcrossPumpSizes:true,preparedSha256:sha(json(changes)),revision,afterRevision:t.revision,sourceSha256:sha(source),afterSourceSha256:sha(words(t)),statistics:a.statistics});a.cancel();b.cancel();
 }
}
const payload={geometryCases,dabs:[],largeWordCases};writeFileSync(prefix+'dab-oracle-input.json',json(payload));
const dabs=oracle('scripts/cube-dab-reference.py',payload,'dab-oracle-certificate.json');writeFileSync(prefix+'terrain-preservation.json',json(proofs));
console.log(json({strokeCases:certificate.cases,paths:certificate.paths,dabs:certificate.dabs,coordinateBoundsChecked:certificate.coordinateBoundsChecked,strokeOracleMs:certificate.elapsedMs,
 preparedDabs:proofs.length,independentPreparedWords:dabs.selectedLargeWords,dabOracleMs:dabs.elapsedMs,allSourcesUnchanged:true}));
