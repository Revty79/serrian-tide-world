import assert from 'node:assert/strict';
import test from 'node:test';
import {createCylinderGeometry} from './cylinder.ts';
import {reconstructCylinderPath} from './cylinder-path.ts';
import {cylinderPathSpacings} from './cylinder-path-spacing.ts';
const identity={worldId:'decimal',surfaceId:'outside'};
function path(length: number){const g=createCylinderGeometry({identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:1,lengthMeters:length+1});return reconstructCylinderPath(g,{...identity,patchId:'side',u:0,v:0},{...identity,patchId:'side',u:0,v:length},{version:1});}
test('decimal exact multiples emit the final point once and leave zero residual',()=>{
 for(const [length,spacing,count]of [[.3,.1,3],[.6,.2,3],[.7,.1,7],[.9,.3,3],[1.2,.1,12]]){const p=path(length!),it=cylinderPathSpacings(p,{spacingMeters:spacing!}),q=[...it];assert.equal(q.length,count);assert.equal(q.at(-1)!.distanceMeters,length);assert.ok(q.at(-1)!.atEnd);assert.equal(it.return().value.residualMeters,0);assert.equal(new Set(q.map(v=>v.distanceMeters)).size,q.length);}
});
test('near multiples snap only inside the declared bound, with no beyond-end duplicate',()=>{
 for(const sign of [-1,1]){const p=path(.3+sign*1e-15),it=cylinderPathSpacings(p,{spacingMeters:.1}),q=[...it];assert.equal(q.length,3);assert.equal(q.at(-1)!.distanceMeters,p.lengthMeters);assert.equal(it.return().value.residualMeters,0);assert.ok(q.every((p,i)=>i===0||p.distanceMeters>q[i-1]!.distanceMeters));}
 const p=path(.3-1e-10),it=cylinderPathSpacings(p,{spacingMeters:.1});assert.equal([...it].length,2);assert.ok(it.return().value.residualMeters>.09);
 assert.throws(()=>cylinderPathSpacings(path(.3),{spacingMeters:.1,maxPoints:2}),/budget/);
});
test('decimal partial traversals carry uncertainty without duplicate shared endpoints',()=>{
 const p=path(.6),a=cylinderPathSpacings(p,{spacingMeters:.1,toMeters:.3}),first=[...a],r=a.return().value;
 const b=cylinderPathSpacings(p,{spacingMeters:.1,fromMeters:.3,residualMeters:r.residualMeters,residualErrorBoundMeters:r.roundoffBoundMeters}),second=[...b];
 assert.equal(first.length,3);assert.equal(second.length,3);assert.equal(new Set([...first,...second].map(v=>v.distanceMeters)).size,6);assert.equal(b.return().value.residualMeters,0);
 const c=cylinderPathSpacings(path(.3),{spacingMeters:.1,residualErrorBoundMeters:r.roundoffBoundMeters});assert.equal([...c].length,3);
 const z=cylinderPathSpacings(p,{spacingMeters:.1,residualMeters:.1-1e-16,fromMeters:.2,toMeters:.2});assert.equal([...z].length,0);assert.equal(z.return().value.residualMeters,.1-1e-16);
 assert.throws(()=>cylinderPathSpacings(p,{spacingMeters:.1,residualErrorBoundMeters:.03}),/resolution/);
});
test('large cumulative ranges preserve decimal endpoint count and bounded residual',()=>{
 const p=path(1e12+1),it=cylinderPathSpacings(p,{spacingMeters:.1,fromMeters:1e12,toMeters:1e12+.3}),q=[...it];assert.equal(q.length,3);assert.equal(q.at(-1)!.distanceMeters,1e12+.3);assert.equal(it.return().value.residualMeters,0);
 const cancelled=cylinderPathSpacings(path(.3),{spacingMeters:.1});cancelled.next();const r=cancelled.return();assert.equal(r.value.emittedPoints,1);assert.equal(r.value.status,'cancelled');assert.ok(cancelled.next().done);
});
test('many partial decimal ranges carry the error budget and never duplicate shared boundaries',()=>{
 const p=path(301);let residual=0,error=0,previous=-1,count=0;
 for(let i=0;i<1000;i++){const it=cylinderPathSpacings(p,{spacingMeters:.1,residualMeters:residual,residualErrorBoundMeters:error,fromMeters:i*.3,toMeters:(i+1)*.3,maxPoints:3});for(const q of it){assert.ok(q.distanceMeters>previous);previous=q.distanceMeters;count++;}const end=it.return().value;residual=end.residualMeters;error=end.roundoffBoundMeters;}
 assert.equal(count,3000);assert.equal(residual,0);assert.equal(previous,300);assert.ok(error>0&&error<1e-7);
});
