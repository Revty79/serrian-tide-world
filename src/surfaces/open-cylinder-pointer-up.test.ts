import test from 'node:test';import assert from 'node:assert/strict';
import {createOpenCylinderGeometry} from './open-cylinder.ts';
import {reconstructOpenCylinderPath} from './open-cylinder-path.ts';
const g=createOpenCylinderGeometry({identity:{worldId:'ulp',surfaceId:'rim'},provider:'physical-open-cylinder',version:1,configuration:'both-open',outerRadiusMeters:1e6,innerRadiusMeters:8e5,lengthMeters:16e5});
test('near-coincident rim pointer-up retains the accepted reconstruction error contract, input and global excess certificate',()=>{
 for(const patchId of['rim-start','rim-end']as const)for(const u of[0,-Math.PI/2,Math.PI/3])for(const dv of[2e-12,1e-11,1e-10,1e-9]){
  const a={...g.identity,patchId,u,v:10000},b={...a,v:a.v+dv},path=reconstructOpenCylinderPath(g,a,b,{version:1});assert.deepEqual(path.start,a);assert.deepEqual(path.end,b);assert.ok(path.lengthUpperBoundMeters>=path.distance.lowerBoundMeters);assert.ok(path.shortestExcessUpperBoundMeters<=path.requestedToleranceMeters);const x=g.referencePosition(a),y=g.referencePosition(b);assert.ok(Math.hypot(...x.map((v,i)=>v-y[i]!))<=path.positionErrorBoundMeters);assert.ok(path.lengthErrorBoundMeters>0);
 }
 const a={...g.identity,patchId:'rim-start',u:0,v:10000};assert.equal(reconstructOpenCylinderPath(g,a,a,{version:1}).lengthErrorBoundMeters,0);
});
