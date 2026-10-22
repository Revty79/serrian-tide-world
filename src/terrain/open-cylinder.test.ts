import test from 'node:test';import assert from 'node:assert/strict';
import {createOpenCylinderGeometry} from '../surfaces/open-cylinder.ts';
import {createOpenCylinderTerrain,createOpenCylinderWorld} from './open-cylinder.ts';
import {defineWorld} from '../surfaces/world.ts';
import {createAnnularDistance} from '../surfaces/open-cylinder-annular-distance.ts';
import {openCylinderDistance} from '../surfaces/open-cylinder-distance.ts';
const configuration={identity:{worldId:'open-foundation',surfaceId:'one-material-boundary'},provider:'physical-open-cylinder' as const,version:1 as const,configuration:'both-open' as const,outerRadiusMeters:1000,innerRadiusMeters:800,lengthMeters:1600};
const point=(patchId:'outer-wall'|'inner-wall'|'rim-start'|'rim-end',u=0,v=0)=>({...configuration.identity,patchId,u,v});
test('every actual annular chart has a right-handed nonsingular basis and reciprocal physical crease aliases',()=>{
 const g=createOpenCylinderGeometry(configuration);
 for(const patchId of ['outer-wall','inner-wall','rim-start','rim-end']as const)for(const u of[0,.731,-Math.PI]){
  const p=point(patchId,u,0),a=g.tangentVector(p,{du:1,dv:0}),b=g.tangentVector(p,{du:0,dv:1}),n=g.normal(p),cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  assert.ok(cross.reduce((s,x,i)=>s+x*n[i]!,0)>0);const join=g.crossRim(p);assert.deepEqual(g.referencePosition(join.position),g.referencePosition(p));assert.deepEqual(g.crossRim(join.position).position,g.normalize(p));assert.deepEqual(join.transport,{uu:1,uv:0,vu:0,vv:1});
 }
 assert.deepEqual(g.normal(point('rim-end',0,200)),[0,0,1]);assert.deepEqual(g.normal(point('rim-start',0,0)),[0,0,-1]);
 assert.throws(()=>g.normalize(point('rim-start',0,-1)));assert.throws(()=>g.normalize({...point('outer-wall'),surfaceId:'foreign'}));
});
test('canonical wall/rim ownership has no centers or duplicate seam words, including odd angular resolution',()=>{
 for(const A of[7,16,128]){
  const t=createOpenCylinderTerrain({terrainId:'connected-authority',geometry:configuration,resolution:{angularSamples:A,axialCells:8,radialCells:4}});
  assert.equal(t.sampleCount,A*32);for(const key of t.samples()){
   assert.equal(t.resolve(t.owner(key)).index,key.index);const neighbors=t.neighbors(key);assert.equal(neighbors.length,4);assert.equal(new Set(neighbors.map(k=>k.index)).size,4);
   for(const other of neighbors)assert.ok(t.neighbors(other).some(k=>k.index===key.index));
   for(const alias of t.aliases(key)){assert.equal(t.resolve(alias).index,key.index);assert.deepEqual(t.geometry.referencePosition(t.positionAt(alias)),t.referencePositionAt(key));}
  }
  const rim={...configuration.identity,patchId:'rim-start' as const,row:0,column:0},opposite={...rim,column:Math.floor(A/2)};
  assert.notEqual(t.resolve(rim).index,t.resolve(opposite).index);assert.ok(Math.hypot(...t.geometry.referencePosition(t.positionAt(rim)))>=800);
  const mid={...rim,row:4};assert.equal(t.resolve(mid).index,t.resolve({...mid,column:A}).index);
 }
});
test('one parent authority preserves independent walls and shared rims with atomic guarded Float32 patches',()=>{
 const t=createOpenCylinderTerrain({terrainId:'connected-authority',geometry:configuration,resolution:{angularSamples:16,axialCells:8,radialCells:4}}),outer=t.resolve({...configuration.identity,patchId:'outer-wall',column:2,row:0}),rim=t.resolve({...configuration.identity,patchId:'rim-start',column:2,row:8}),inner=t.resolve({...configuration.identity,patchId:'inner-wall',column:2,row:8});
 assert.equal(outer.index,rim.index);t.write(outer,-0);assert.ok(Object.is(t.read(rim),-0));assert.equal(t.read(inner),0);const rev=t.revision,before=t.copyElevations();
 assert.throws(()=>t.commitPreparedPatch(outer,rev,[{indices:new Uint32Array([outer.index,inner.index]),values:new Float32Array([10,Infinity]),count:2}]));assert.deepEqual(t.copyElevations(),before);assert.equal(t.revision,rev);
 assert.throws(()=>t.commitPreparedPatch(outer,rev-1,[{indices:new Uint32Array([outer.index]),values:new Float32Array([12]),count:1}]));assert.deepEqual(t.copyElevations(),before);
 assert.throws(()=>t.write({...outer,innerRadiusMeters:799},12));assert.throws(()=>t.write(inner,-51));before.fill(99);assert.ok(Object.is(t.read(outer),-0));
});
test('annular and inner-wall distance certificates exclude the missing-disk shortcuts',()=>{
 const g=createOpenCylinderGeometry(configuration),m=createAnnularDistance(800,1000,1600),encloses=(r:{lower:number;upper:number},d:number)=>assert.ok(r.lower<=d&&d<=r.upper,JSON.stringify({r,d}));
 encloses(m.annulus(800,800,Math.PI),800*Math.PI);encloses(m.annulus(1000,1000,Math.PI),1200+800*(Math.PI-2*Math.acos(.8)));encloses(m.innerHelix(Math.PI,31),Math.hypot(Math.PI*800,31));encloses(m.innerToRim(970,0,700),870);
 const d=openCylinderDistance(g,point('inner-wall',0,800),point('inner-wall',Math.PI,800));assert.ok(d.lowerBoundMeters>2513);assert.ok(d.upperBoundMeters<2514);
 const short=createOpenCylinderGeometry({...configuration,lengthMeters:100});assert.throws(()=>openCylinderDistance(short,point('outer-wall',0,50),point('outer-wall',Math.PI,50)),/nonexistent|alternative/);
 assert.throws(()=>m.innerToRim(970,.7,31,1e-12));
});
test('local outer relaxation and inner-rim calibration return global enclosures symmetrically',()=>{
 const g=createOpenCylinderGeometry(configuration),pairs=[[point('outer-wall',.2,500),point('outer-wall',.21,501)],[point('outer-wall',.2,1590),point('rim-end',.21,30)],[point('inner-wall',.2,10),point('rim-end',.21,170)]];
 for(const[a,b]of pairs){const ab=openCylinderDistance(g,a!,b!),ba=openCylinderDistance(g,b!,a!);assert.equal(ab.scope,'global-reference-surface');assert.ok(ab.upperBoundMeters-ab.lowerBoundMeters<=ab.requestedToleranceMeters);assert.ok(ab.lowerBoundMeters<=ba.upperBoundMeters&&ba.lowerBoundMeters<=ab.upperBoundMeters);assert.ok(ab.upperBoundMeters<50);}
});
test('a real Open Cylinder World binds one parent authority and snapshots configuration independently of caller mutation',()=>{
 const input={...configuration,identity:{...configuration.identity},terrainId:'one-parent'},world=createOpenCylinderWorld(input,{angularSamples:16,axialCells:8,radialCells:4});
 assert.equal(world.definition.shape.kind,'open-cylinder');assert.equal(world.definition.surfaces.length,1);assert.equal(world.definition.surfaces[0]!.role,'custom');assert.equal(world.terrain.metadata.terrainId,world.configuration.terrainId);assert.equal('terrainId'in world.geometry.metadata,false);
 input.identity.surfaceId='changed-by-caller';input.terrainId='changed-by-caller';assert.equal(world.terrain.keyAt(0).surfaceId,configuration.identity.surfaceId);assert.equal(world.terrain.keyAt(0).terrainId,'one-parent');assert.equal(world.terrain.read(world.terrain.keyAt(0)),0);
 assert.throws(()=>defineWorld({...world.definition,surfaces:[{...world.definition.surfaces[0]!,role:'exterior'}]}),/one connected/);
 assert.throws(()=>defineWorld({...world.definition,surfaces:[world.definition.surfaces[0]!,{...world.definition.surfaces[0]!,identity:{...configuration.identity,surfaceId:'second'},terrainId:'second'}]}),/one connected/);
});
