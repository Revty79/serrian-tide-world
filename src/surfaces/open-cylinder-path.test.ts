import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createOpenCylinderGeometry} from './open-cylinder.ts';
import {reconstructOpenCylinderPath} from './open-cylinder-path.ts';
import {createAnnularDistance} from './open-cylinder-annular-distance.ts';
import {physicalPathSpacings} from './physical-path-spacing.ts';
import {openCylinderMeridianDistance} from './open-cylinder-meridian.ts';
const configuration={identity:{worldId:'open-path',surfaceId:'boundary'},provider:'physical-open-cylinder' as const,version:1 as const,configuration:'both-open' as const,outerRadiusMeters:1000,innerRadiusMeters:800,lengthMeters:1600},g=createOpenCylinderGeometry(configuration);
const p=(patchId:'outer-wall'|'inner-wall'|'rim-start'|'rim-end',u=0,v=0)=>({...configuration.identity,patchId,u,v});
test('certified annular and inner-rim enclosures contain 45 independent 85-digit Decimal reference solutions',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/open-cylinder-distance-oracle.json',import.meta.url),'utf8')) as {independentDecimalDigits:number;cases:{ri:number;ro:number;L:number;b:number;theta:number;axial:number;expectedDistanceMeters:string}[]};assert.equal(fixture.independentDecimalDigits,85);assert.equal(fixture.cases.length,45);
 for(const c of fixture.cases){const bounds=createAnnularDistance(c.ri,c.ro,c.L).innerToRim(c.b,c.theta,c.axial),truth=Number(c.expectedDistanceMeters);assert.ok(bounds.lower<=truth&&truth<=bounds.upper,JSON.stringify(c));}
});
test('outward meridian enclosures contain 48 independent Decimal sums with fractional dimensions and large cancellation',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/open-cylinder-distance-oracle.json',import.meta.url),'utf8')) as {meridianCases:{ro:number;ri:number;L:number;a:string;b:string;vA:number;vB:number;expectedDistanceMeters:string}[]};assert.equal(fixture.meridianCases.length,48);
 for(const c of fixture.meridianCases){const world=createOpenCylinderGeometry({...configuration,outerRadiusMeters:c.ro,innerRadiusMeters:c.ri,lengthMeters:c.L}),bounds=openCylinderMeridianDistance(world,{...configuration.identity,patchId:c.a,u:0,v:c.vA},{...configuration.identity,patchId:c.b,u:0,v:c.vB},c.ro*1e-6),truth=Number(c.expectedDistanceMeters);assert.ok(bounds.lower<=truth&&truth<=bounds.upper,JSON.stringify(c));}
 const exact=openCylinderMeridianDistance(g,p('inner-wall',0,100),p('inner-wall',0,170),1e-30);assert.equal(exact.lower,70);assert.equal(exact.upper,70);
});
test('continuous paths stay on actual annular material, expose proper one-sided tangents and obey global length certificates',()=>{
 const pairs=[[p('inner-wall',0,800),p('inner-wall',Math.PI,800)],[p('rim-start',0,200),p('rim-start',Math.PI,200)],[p('inner-wall',.31,31),p('rim-end',1.7,30)],[p('rim-start',.31,170),p('inner-wall',1.7,1569)],[p('outer-wall',.2,500),p('outer-wall',.21,501)],[p('outer-wall',.2,1590),p('rim-end',.21,30)]];
 for(const[a,b]of pairs){const path=reconstructOpenCylinderPath(g,a!,b!,{version:1});assert.deepEqual(path.atDistance(0).position,g.normalize(a!));assert.deepEqual(path.atDistance(path.lengthMeters).position,g.normalize(b!));assert.ok(path.shortestExcessUpperBoundMeters<=path.requestedToleranceMeters);
  for(let i=0;i<=200;i++){const location=path.atDistance(path.lengthMeters*(i/200)),q=location.referencePosition,r=Math.hypot(q[0],q[1]),tol=path.positionErrorBoundMeters;assert.ok(r>=800-tol&&r<=1000+tol&&q[2]>=-tol&&q[2]<=1600+tol);assert.ok(location.oneSidedPatchId);const sheet=g.aliases(location.position).find(p=>p.patchId===location.oneSidedPatchId)??location.position,normal=g.normal(sheet);assert.ok(Math.abs(normal.reduce((s,x,j)=>s+x*location.tangent![j]!,0))<1e-9);assert.ok(Math.abs(Math.hypot(...location.tangent!)-1)<1e-9);}
 }
 const inner=reconstructOpenCylinderPath(g,p('inner-wall',0,800),p('inner-wall',Math.PI,800),{version:1});assert.ok(inner.lengthLowerBoundMeters<=Math.PI*800&&inner.lengthUpperBoundMeters>=Math.PI*800);
 const annulus=reconstructOpenCylinderPath(g,p('rim-start',0,200),p('rim-start',Math.PI,200),{version:1});assert.ok(annulus.lengthMeters>2683&&annulus.lengthMeters<2684);assert.ok(annulus.pieces.some(p=>p.kind==='rim-arc'));
});
test('cut-locus continuity chooses the incoming angular direction and transports a wall tangent onto the annulus',()=>{
 const path=reconstructOpenCylinderPath(g,p('inner-wall',0,800),p('inner-wall',Math.PI,800),{version:1,continuity:{patchId:'inner-wall',direction:[0,-1,0]}});assert.ok(path.atDistance(10).position.u<0);assert.ok(path.continuityAlignment!>.999999);
 const crease=reconstructOpenCylinderPath(g,p('outer-wall',0,1600),p('rim-end',0,100),{version:1,continuity:{patchId:'outer-wall',direction:[0,0,1]}});assert.ok(crease.continuityAlignment!>.999999);assert.equal(crease.atDistance(10).oneSidedPatchId,'rim-end');
 assert.throws(()=>reconstructOpenCylinderPath(g,p('inner-wall',0,800),p('inner-wall',.1,800),{version:1,continuity:{patchId:'inner-wall',direction:[1,0,0]}}),/tangent/);
});
test('the accepted carried-spacing engine gives the same physical points across partial annular-path traversals',()=>{
 const path=reconstructOpenCylinderPath(g,p('inner-wall',.1,31),p('rim-end',1.7,30),{version:1}),spacing=47,whole=physicalPathSpacings(path,{spacingMeters:spacing}),expected=[...whole],split=path.lengthMeters*.37,a=physicalPathSpacings(path,{spacingMeters:spacing,toMeters:split}),first=[...a],terminal=a.next();if(!terminal.done)throw Error('Expected completed partial traversal.');const result=terminal.value;
 assert.equal(result.status,'complete');const b=physicalPathSpacings(path,{spacingMeters:spacing,fromMeters:split,residualMeters:result.residualMeters,residualErrorBoundMeters:result.roundoffBoundMeters}),actual=[...first,...b];assert.equal(actual.length,expected.length);
 for(let i=0;i<actual.length;i++)assert.ok(Math.hypot(...actual[i]!.referencePosition.map((x,j)=>x-expected[i]!.referencePosition[j]!))<1e-8);
});
