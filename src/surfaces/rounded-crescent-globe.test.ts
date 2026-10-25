import {test} from 'node:test';import assert from 'node:assert/strict';
import {ROUNDED_CRESCENT_DEFAULTS as defaults,ROUNDED_CRESCENT_PRESETS as presets,roundedCrescentGeometry,roundedPoint,roundedPosition,roundedInverse,roundedContains,roundedDifferential,roundedNormal,roundedMetric,roundedSurfaceArea,roundedVolume} from './rounded-crescent-globe.ts';
import {dot3,unitDirection,type Vec3} from './cube-sphere.ts';
import {roundedGeodesic,roundedBrushRoute} from './rounded-crescent-distance.ts';

test('supported rounded profiles are smooth injective solids with real volume, taper, regular terminal charts and inverse coordinates',()=>{
 for(const dimensions of Object.values(presets)){
  const g=roundedCrescentGeometry({...defaults,...dimensions});
  for(let i=0;i<500;i++){
   const u=-1+2*(i+.5)/500,t=i*2.399963229728653,r=Math.sqrt(1-u*u),p:Vec3=[u,r*Math.cos(t),r*Math.sin(t)],q=roundedPoint(g,p),back=roundedInverse(g,q),D=roundedDifferential(g,p),n=roundedNormal(g,p);
   assert.ok(Math.hypot(...back.map((v,k)=>v-p[k]!))<3e-14);assert.ok(D.determinant<0);
   assert.ok(roundedContains(g,roundedPoint(g,p.map(v=>v*.999) as unknown as Vec3)));
   const outside=q.map((v,k)=>v+1e-6*n[k]!) as unknown as Vec3;assert.equal(roundedContains(g,outside),false);
   for(const v of [[0,0,1],[0,1,0],[1,0,0]] as Vec3[]){const tangent=v.map((x,k)=>x-dot3(v,p)*p[k]!) as unknown as Vec3;if(Math.hypot(...tangent)<1e-7)continue;const metric=roundedMetric(g,p,tangent);assert.ok(metric>=g.minimumStretch**2*g.scaleMeters**2*dot3(tangent,tangent)*(1-1e-12));}
  }
  for(const sign of [-1,1]){const pole:Vec3=[sign,0,0],D=roundedDifferential(g,pole);assert.ok(Math.hypot(...D.y)>0&&Math.hypot(...D.z)>0);assert.ok(roundedNormal(g,pole).every(Number.isFinite));}
  const physical=roundedSurfaceArea(g,40);assert.ok(physical.areaMeters2>0&&physical.volumeMeters3>0);assert.ok(Math.abs(physical.volumeMeters3/roundedVolume(g)-1)<.001);assert.ok(g.bodyDepth/g.bodyRadius>=.65);
 }
});
test('physical Jacobian, mixed metric and second derivatives match independently differenced swept positions',()=>{
 const g=roundedCrescentGeometry({...defaults,depthRatio:.7,tipTaper:.3,tipRoundness:.2}),p:Vec3=[.42,.6,.3],D=roundedDifferential(g,p),h=1e-5;
 for(let j=0;j<3;j++){const plus=p.map((v,i)=>v+(i===j?h:0)) as unknown as Vec3,minus=p.map((v,i)=>v-(i===j?h:0)) as unknown as Vec3,a=roundedPoint(g,plus),b=roundedPoint(g,minus),expected=[D.x,D.y,D.z][j]!;for(let k=0;k<3;k++)assert.ok(Math.abs((a[k]!-b[k]!)/(2*h)-expected[k]!)<1e-8);}
 const t:Vec3=[.3,-.1,.2],a=roundedPoint(g,p.map((v,i)=>v+h*t[i]!) as unknown as Vec3),b=roundedPoint(g,p.map((v,i)=>v-h*t[i]!) as unknown as Vec3),q=roundedPoint(g,p),second=D.second(t,t);for(let k=0;k<3;k++)assert.ok(Math.abs((a[k]!-2*q[k]!+b[k]!)/h**2-second[k]!)<1e-5);
 assert.notEqual(dot3(D.x,D.y),0,'ellipse/taper mixed metric is not silently discarded');
});
test('invalid dimensions, collapsed opening and unsupported curvature fail without normalizing parameters',()=>{
 for(const bad of [{worldSizeMeters:0},{curvatureRatio:.7},{spanDegrees:360},{bodyRadiusRatio:.6,curvatureRatio:.75},{depthRatio:.1},{tipTaper:1},{tipRoundness:.5},{spanDegrees:NaN}])assert.throws(()=>roundedCrescentGeometry({...defaults,...bad}),RangeError);
});
test('actual curved geodesics converge against further refined integration at center, inner/outer banks and both tips',()=>{
 for(const dimensions of Object.values(presets))for(const p of [[0,1,0],[0,-1,0],[0,0,1],[1,0,0],[-1,0,0],[.7,.7,.14]] as Vec3[]){
  const g=roundedCrescentGeometry({...defaults,...dimensions}),a=unitDirection(p),b=unitDirection(a.map((v,i)=>v+[.012,.01,-.016][i]!) as unknown as Vec3),route=roundedGeodesic(g,a,b),reference=roundedGeodesic(g,a,b,{steps:32,tolerance:1e-9});
  assert.ok(Math.abs(route.lengthMeters-reference.lengthMeters)<Math.max(1e-4,reference.lengthMeters*2e-7));
  const mid=route.at(.5),start=roundedPosition(g,a),end=roundedPosition(g,b);assert.ok(Math.abs(Math.hypot(...mid)-1)<1e-14);assert.ok(route.lengthMeters>=Math.hypot(...end.map((v,i)=>v-start[i]!))*(1-1e-8));
 }
});
test('bounded fast brush routes stay on material and agree with refined geodesics throughout the supported local footprint',()=>{
 let checked=0,worst=0;
 for(const dimensions of Object.values(presets)){const g=roundedCrescentGeometry({...defaults,...dimensions}),limit=.2*Math.min(g.bodyRadius,g.bodyDepth)*(1-g.tipTaper)*g.scaleMeters;
  for(let i=0;i<160;i++){const a=unitDirection([Math.sin(i*2.4),Math.cos(i*2.4),Math.sin(i*1.7)]),b=unitDirection(a.map((v,k)=>v+.06*Math.sin(i*(k+1)+.3)) as unknown as Vec3),fast=roundedBrushRoute(g,a,b);if(fast.lengthMeters>limit*1.05)continue;const reference=roundedGeodesic(g,a,b,{steps:16,tolerance:1e-8});worst=Math.max(worst,Math.abs(fast.lengthMeters-reference.lengthMeters)/reference.lengthMeters);assert.ok(Math.abs(Math.hypot(...fast.atParameter(.37))-1)<1e-14);checked++;}
 }
 assert.ok(checked>700);assert.ok(worst<.0001,`distance relative error ${worst} exceeds 0.01% qualification`);
});
