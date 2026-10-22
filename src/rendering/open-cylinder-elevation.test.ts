import test from 'node:test';import assert from 'node:assert/strict';
import {createOpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import {createCylindricalTerrain} from '../terrain/cylindrical.ts';
import {cylinderElevationSampler,cylinderElevationColor,cylinderRelief} from './cylindrical-elevation.ts';
import {openCylinderDisplayIndex,openCylinderElevationSampler} from './open-cylinder-elevation.ts';
const identity={worldId:'open-field',surfaceId:'connected'},configuration={identity,provider:'physical-open-cylinder' as const,version:1 as const,configuration:'both-open' as const,outerRadiusMeters:1000000,innerRadiusMeters:500000,lengthMeters:1600000},resolution={angularSamples:128,axialCells:64,radialCells:32};
for(const patch of['outer-wall','inner-wall']as const)test(`Open ${patch} has accepted cylinder height, coast, palette and physical gradient presentation`,()=>{
 const open=createOpenCylinderTerrain({terrainId:'open',geometry:configuration,resolution,initialElevation:-100}),R=patch==='outer-wall'?1000000:500000,closed=createCylindricalTerrain({terrainId:'solid',geometry:{identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:R,lengthMeters:1600000},resolution,initialElevation:-100});
 for(let row=0;row<=64;row++)for(let column=0;column<128;column++){
  const value=Math.fround(-100+1800*Math.max(0,Math.cos(column/128*Math.PI*2)*Math.cos((row/64-.5)*Math.PI*2)));open.write(open.keyAt(openCylinderDisplayIndex(open,patch,row,column)),value);closed.write(closed.resolve({...identity,patchId:'side',row,column}),value);
 }
 const before=open.copyElevations(),actual=openCylinderElevationSampler(before,open),baseline=cylinderElevationSampler(closed.copyElevations(),closed);
 for(let i=0;i<600;i++){
  const theta=-Math.PI+2*Math.PI*((i*.61803398875)%1),z=200000+1200000*((i*.41421356237)%1),a=actual({patchId:patch,theta,radiusMeters:R,zMeters:z}),b=baseline({region:'side',theta,radial:1,z:(z-800000)/R,depth:0});
  assert.ok(Math.abs(a.height-b.height)<1e-8);assert.ok(Math.abs(a.dx-b.dx)<1e-12);assert.ok(Math.abs(a.dy-b.dy)<1e-12);assert.equal(a.crossesSea,b.crossesSea);assert.deepEqual(cylinderElevationColor(a.height,0),cylinderElevationColor(b.height,0));assert.ok(Math.abs(cylinderRelief(a.dx,a.dy)-cylinderRelief(b.dx,b.dy))<1e-12);
 }
 assert.deepEqual(open.copyElevations(),before);
});
test('both annular display fields retain the true inner radius, shared crease words and physical radial gradients',()=>{
 const t=createOpenCylinderTerrain({terrainId:'rims',geometry:configuration,resolution,initialElevation:-100});
 for(const patchId of['rim-start','rim-end']as const)for(let row=0;row<=64;row++)for(let column=0;column<128;column++)t.write(t.keyAt(openCylinderDisplayIndex(t,patchId,row,column)),-100+row*7.8125);
 const field=openCylinderElevationSampler(t.copyElevations(),t);
 for(const patchId of['rim-start','rim-end']as const){
  const edge=field({patchId,theta:0,radiusMeters:500000,zMeters:patchId==='rim-start'?0:1600000});assert.equal(edge.height,-100);
  for(const theta of[0,Math.PI/2]){const sample=field({patchId,theta,radiusMeters:685000,zMeters:patchId==='rim-start'?0:1600000});assert.ok(Math.abs(sample.height-85)<1e-10);assert.ok(Math.abs(sample.dx-.001*Math.cos(theta))<1e-14);assert.ok(Math.abs(sample.dy-.001*Math.sin(theta))<1e-14);}
 }
 assert.equal(openCylinderDisplayIndex(t,'rim-start',0,0),openCylinderDisplayIndex(t,'inner-wall',0,0));assert.equal(openCylinderDisplayIndex(t,'rim-end',0,0),openCylinderDisplayIndex(t,'inner-wall',64,0));assert.notEqual(openCylinderDisplayIndex(t,'rim-start',0,0),openCylinderDisplayIndex(t,'rim-start',0,64));
});
