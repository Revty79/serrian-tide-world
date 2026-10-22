import test from 'node:test';import assert from 'node:assert/strict';
import {createCylindricalTerrain} from './cylindrical.ts';
import {prepareCylindricalDab,type CylindricalBrushSettings} from './cylindrical-brush.ts';
import {createOpenCylinderTerrain} from './open-cylinder.ts';
import {prepareOpenCylinderDab} from './open-cylinder-brush.ts';
import {openCylinderBrushCandidates} from './open-cylinder-candidates.ts';
import {openCylinderDistance} from '../surfaces/open-cylinder-distance.ts';
import {createConnectedHistory} from '../editor/connected-history.ts';
const identity={worldId:'open-brush',surfaceId:'connected'},configuration={identity,provider:'physical-open-cylinder' as const,version:1 as const,configuration:'both-open' as const,outerRadiusMeters:1000,innerRadiusMeters:400,lengthMeters:1600},resolution={angularSamples:128,axialCells:64,radialCells:32};
const make=()=>createOpenCylinderTerrain({terrainId:'parent',geometry:configuration,resolution});
const point=(patchId:'outer-wall'|'inner-wall'|'rim-start'|'rim-end',u=0,v=0)=>({...identity,patchId,u,v});
function ready<T extends {readonly status:string;pump(n:number):unknown}>(job:T){while(job.status==='preparing')job.pump(32);assert.equal(job.status,'ready');return job;}
for(const tool of ['raise','lower','flatten','smooth']as const)test(`Open Cylinder ${tool} reuses accepted arithmetic bit for bit on equivalent ordinary wall geography`,()=>{
 const open=make(),closed=createCylindricalTerrain({terrainId:'closed',geometry:{identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:1000,lengthMeters:1600},resolution,initialElevation:0});
 for(let row=0;row<=64;row++)for(let column=0;column<128;column++){
  const h=Math.fround(Math.sin(column*.37+row*.21)*30),address={...identity,column,row};open.write(open.resolve({...address,patchId:'outer-wall'}),h);closed.write(closed.resolve({...address,patchId:'side'}),h);
 }
 const settings:CylindricalBrushSettings=tool==='raise'||tool==='lower'?{version:1,tool,radiusMeters:70,strengthMeters:12.5}:tool==='flatten'?{version:1,tool,radiusMeters:70,intensity:.61,targetElevation:-22}:{version:1,tool,radiusMeters:70,intensity:.61};
 const before=open.copyElevations(),job=ready(prepareOpenCylinderDab(open,point('outer-wall',0,800),settings)),baseline=ready(prepareCylindricalDab(closed,{...identity,patchId:'side',u:0,v:800},settings));
 assert.ok(job.statistics.affectedSamples>3);job.commit();baseline.commit();
 for(let row=0;row<=64;row++)for(let column=0;column<128;column++){const address={...identity,column,row};assert.ok(Object.is(open.read(open.resolve({...address,patchId:'outer-wall'})),closed.read(closed.resolve({...address,patchId:'side'}))));}
 for(const key of open.samples())if(open.owner(key).patchId!=='outer-wall')assert.ok(Object.is(open.read(key),before[key.index]));
});
test('candidate windows conservatively cover certified physical footprints at both periodic seams and all four creases',()=>{
 const t=make(),centers=[point('outer-wall',Math.PI-.013,0),point('inner-wall',-Math.PI+.017,0),point('inner-wall',Math.PI-.021,1600),point('rim-end',.015,300),point('rim-start',-.014,300)];
 for(const center of centers){const plan=openCylinderBrushCandidates(t,center,70),keys=[...plan.samples()].map(s=>s.key.index),found=new Set(keys);assert.equal(found.size,keys.length);assert.deepEqual(keys,[...keys].sort((a,b)=>a-b));const c=t.geometry.referencePosition(center);let inside=0;
  for(const key of t.samples()){
   const p=t.positionAt(t.owner(key)),q=t.geometry.referencePosition(p);if(Math.hypot(q[0]-c[0],q[1]-c[1],q[2]-c[2])>70.000001)continue;
   const d=openCylinderDistance(t.geometry,center,p);if(d.upperBoundMeters<69.999999){inside++;assert.ok(found.has(key.index),`missed canonical ${key.index} from ${center.patchId}`);}
  }
  assert.ok(inside>1);assert.ok(keys.length<t.sampleCount/8);
 }
 assert.throws(()=>openCylinderBrushCandidates(t,point('outer-wall'),80),/limit/);
});
test('one exact history operation spans independent walls and shared rim words, retaining an undoable cancelled prefix',()=>{
 const t=make(),history=createConnectedHistory(t),before=t.copyElevations(),tx=history.beginOperation(t),settings={version:1 as const,tool:'raise' as const,radiusMeters:70,strengthMeters:12};
 for(const p of[point('outer-wall',0,0),point('rim-start',0,300),point('inner-wall',0,1600)])tx.commitDab(ready(prepareOpenCylinderDab(t,p,settings)));
 tx.finish('cancelled');assert.equal(history.statistics.entries,1);assert.equal(history.operations[0]!.termination,'cancelled');const painted=t.copyElevations();assert.notDeepEqual(painted,before);assert.equal(history.undo(),true);assert.deepEqual(t.copyElevations(),before);assert.equal(history.redo(),true);assert.deepEqual(t.copyElevations(),painted);
});
test('reference-shell protection rejects a ready cross-crease patch atomically',()=>{
 let protect=false;const t=createOpenCylinderTerrain({terrainId:'protected',geometry:configuration,resolution,validateSample:()=>{if(protect)throw Error('protected shell');}}),before=t.copyElevations(),job=ready(prepareOpenCylinderDab(t,point('outer-wall',0,0),{version:1,tool:'raise',radiusMeters:70,strengthMeters:12}));
 protect=true;assert.throws(()=>job.commit(),/protected/);assert.equal(job.status,'failed');assert.deepEqual(t.copyElevations(),before);assert.equal(t.revision,0);
});
