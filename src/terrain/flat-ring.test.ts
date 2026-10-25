import test from 'node:test';import assert from 'node:assert/strict';
import {FLAT_RING_PRESETS,flatRingDimensions} from '../surfaces/flat-ring.ts';
import {createFlatRing,flatRingResolution,flatRingBrushPolicy,FLAT_RING_MAX_SAMPLES} from './flat-ring.ts';
import {flatRingDistance} from '../surfaces/flat-ring-distance.ts';
import {prepareFlatRingDab} from './flat-ring-brush.ts';
import {PHYSICAL_PREVIEW_DAB_LIMITS} from '../editor/physical-brush-policy.ts';
const make=(ratio=.35,h=.15,detail:128|256=128,R=1e6)=>createFlatRing({geometry:{provider:'physical-flat-ring',version:1,identity:{worldId:'ring-test-world',surfaceId:'connected-boundary'},outerRadiusMeters:R,innerRadiusMeters:ratio*R,thicknessMeters:h*R},terrainId:'ring-terrain',detail});
for(const [name,[ri,h]]of Object.entries(FLAT_RING_PRESETS))for(const detail of[128,256]as const)test(`${name} N${detail}: bounded genuine four-region terrain and useful default`,()=>{
 if(name==='Small opening'&&detail===128){assert.throws(()=>make(ri,h,detail),/Higher Terrain Detail/);return;}
 const w=make(ri,h,detail),t=w.terrain,g=t.geometry,R=w.configuration.outerRadiusMeters;
 assert.ok(t.sampleCount<=FLAT_RING_MAX_SAMPLES);assert.equal(t.elevationByteLength,t.sampleCount*4);assert.deepEqual(t.metadata.representation.resolution,flatRingResolution(w.configuration,detail));
 for(let i=0;i<t.sampleCount;i++){const key=t.keyAt(i),p=t.positionAt(t.owner(key)),xyz=g.referencePosition(p);assert.ok(Math.hypot(xyz[0],xyz[1])>=ri*R-1e-8);assert.equal(t.read(key),-100);for(const alias of t.aliases(key))assert.equal(t.resolve(alias).index,i);}
 assert.deepEqual(g.normal({...g.identity,patchId:'inner-wall',u:0,v:0}),[-1,-0,0]);assert.deepEqual(g.normal({...g.identity,patchId:'rim-end',u:0,v:0}),[0,0,1]);
});
test('configuration rejects unresolved material, unsupported dimensions and identity collisions',()=>{
 for(const ratio of[0,.059,.851,1,NaN])assert.throws(()=>make(ratio));for(const h of[.099,.301,Infinity])assert.throws(()=>make(.35,h));
 assert.throws(()=>flatRingDimensions({outerRadiusMeters:1,innerRadiusMeters:.35,thicknessMeters:.15}));
});
test('hole isolation and legitimate around-hole influence use the same certified annular distance',()=>{
 const w=make(.06,.15,256),t=w.terrain,g=t.geometry,r=g.metadata.innerRadiusMeters,p={...g.identity,patchId:'rim-end',u:0,v:g.thicknessMeters},q={...p,u:-Math.PI};
 const d=flatRingDistance(g,p,q);assert.ok(d.lowerBoundMeters<=Math.PI*r&&d.upperBoundMeters>=Math.PI*r);assert.ok(d.lowerBoundMeters>2*r);
 const res=t.metadata.representation.resolution,key=t.resolve({...g.identity,patchId:'inner-wall',column:res.angularSamples/2,row:0});
 function dab(radiusMeters:number){const job=prepareFlatRingDab(t,p,{version:1,tool:'raise',radiusMeters,strengthMeters:100},PHYSICAL_PREVIEW_DAB_LIMITS);while(job.status==='preparing')job.pump(512);job.commit();}
 dab(150000);assert.equal(t.read(key),-100);dab(200000);assert.ok(t.read(key)>-100,'large brush must reach around the actual inner arc');
});
test('upper to lower influence traverses both inner rims, while ordinary upper geography is independent',()=>{
 const w=make(.06,.15,256),t=w.terrain,g=t.geometry,p={...g.identity,patchId:'rim-end',u:0,v:g.thicknessMeters},q={...p,patchId:'rim-start',v:0};
 const d=flatRingDistance(g,p,q);assert.equal(d.lowerBoundMeters,150000);assert.equal(d.upperBoundMeters,150000);
 const key=t.resolve({...g.identity,patchId:'inner-wall',column:0,row:t.metadata.representation.resolution.axialCells});
 const job=prepareFlatRingDab(t,p,{version:1,tool:'raise',radiusMeters:200000,strengthMeters:100},PHYSICAL_PREVIEW_DAB_LIMITS);while(job.status==='preparing')job.pump(512);job.commit();assert.ok(t.read(key)>-100);
 const normal=make(),n=normal.terrain,ng=n.geometry,upper={...ng.identity,patchId:'rim-end',u:0,v:ng.thicknessMeters/2},lower=n.resolve({...ng.identity,patchId:'rim-start',column:0,row:n.metadata.representation.resolution.radialCells});
 const small=prepareFlatRingDab(n,upper,{version:1,tool:'raise',radiusMeters:flatRingBrushPolicy(normal.configuration).defaultRadius,strengthMeters:100});while(small.status==='preparing')small.pump(512);small.commit();assert.equal(n.read(lower),-100);
});
for(const [name,[ri,h]]of Object.entries(FLAT_RING_PRESETS))test(`${name}: default and maximum brush certificates retain UI budgets on every strip and crease`,()=>{
 const w=make(ri,h,256),t=w.terrain,g=t.geometry,policy=flatRingBrushPolicy(w.configuration);
 for(const patchId of['outer-wall','inner-wall','rim-start','rim-end']as const)for(const fraction of[0,.05,.5,.95,1])for(const radiusMeters of[policy.defaultRadius,policy.maximum]){
  const p={...g.identity,patchId,u:.17,v:fraction*(patchId.endsWith('wall')?h*1e6:g.thicknessMeters)},job=prepareFlatRingDab(t,p,{version:1,tool:'raise',radiusMeters,strengthMeters:100},PHYSICAL_PREVIEW_DAB_LIMITS);
  while(job.status==='preparing')job.pump(512);assert.equal(job.status,'ready');assert.ok(job.statistics.distanceQueries<=4096);assert.ok(job.statistics.candidates<=8192);assert.ok(job.statistics.peakPreparedBytes<=65536);job.cancel();
 }
});
