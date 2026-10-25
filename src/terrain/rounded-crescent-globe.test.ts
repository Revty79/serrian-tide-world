import {test} from 'node:test';import assert from 'node:assert/strict';
import {createRoundedCrescentWorld} from './rounded-crescent-globe.ts';
import {ROUNDED_CRESCENT_DEFAULTS as defaults,roundedPosition} from '../surfaces/rounded-crescent-globe.ts';
import {roundedBrushPolicy} from './rounded-crescent-brush-metric.ts';
import {startSphericalBrushStroke,type SphericalBrushSettings} from './spherical-brush.ts';
import {SphericalHistory} from '../editor/spherical-history.ts';
import {unitDirection,type Vec3,CUBE_FACES} from '../surfaces/cube-sphere.ts';
const identity={worldId:'rounded-test-world',surfaceId:'whole-rounded-exterior'};
test('native canonical ownership covers the full curved body and both regular poles without false longitudinal wrap',()=>{
 for(const detail of [128,256] as const){const world=createRoundedCrescentWorld({terrainId:'rounded-terrain',identity,dimensions:defaults,detail}),t=world.terrain;assert.equal(t.sampleCount,6*detail*detail+2);assert.ok(t.copyElevations().every(v=>v===-100));
  for(const face of CUBE_FACES)for(const edge of [0,detail])for(let along=0;along<=detail;along+=8){const k=t.resolve({...identity,patchId:face,row:edge,column:along});for(const alias of t.aliases(k)){assert.equal(t.resolve(alias).index,k.index);const physical=roundedPosition(world.geometry,t.geometry.direction(t.positionAt(alias)));assert.ok(physical.every(Number.isFinite));}}
  const a=t.resolve({...identity,patchId:'px',row:detail/2,column:detail/2}),b=t.resolve({...identity,patchId:'nx',row:detail/2,column:detail/2});assert.notEqual(a.index,b.index);assert.ok(!t.neighbors(a).some(k=>k.index===b.index));
 }
});
test('four tools use curved physical footprints on inner/outer center, rounded sides, seams and both terminals, with exact whole-gesture history',()=>{
 for(const detail of [128,256] as const)for(const tool of ['raise','lower','smooth','flatten'] as const){
  const world=createRoundedCrescentWorld({terrainId:'rounded-'+tool,identity,dimensions:defaults,detail}),t=world.terrain,g=world.geometry;
  if(tool==='smooth')for(const k of t.samples())if(k.index%5===0)t.write(k,250);
  const h=new SphericalHistory(t),before=t.copyElevations(),radius=roundedBrushPolicy(g).defaultRadius,settings:SphericalBrushSettings=tool==='raise'||tool==='lower'?{tool,radiusMeters:radius,strengthMeters:120}:tool==='smooth'?{tool,radiusMeters:radius,intensity:.6}:{tool,radiusMeters:radius,intensity:.6,targetElevation:300};
  for(const point of [[0,-1,0],[0,1,0],[0,0,1],[1,0,0],[-1,0,0],[1,1,0]] as Vec3[]){const center=unitDirection(point),next=unitDirection(center.map((v,i)=>v+[.008,.006,.01][i]!) as unknown as Vec3),stroke=startSphericalBrushStroke(t,{...identity,direction:center},settings,h,undefined,{roundedGlobe:g});stroke.moveTo({...identity,direction:next});stroke.end();assert.ok(stroke.statistics.writes>0);assert.ok(stroke.statistics.peakPreparedBytes<=65536);}
  const after=t.copyElevations();assert.notDeepEqual(after,before);for(let i=0;i<6;i++)h.undo();assert.deepEqual(t.copyElevations(),before);for(let i=0;i<6;i++)h.redo();assert.deepEqual(t.copyElevations(),after);
 }
});
test('a close-opening profile never paints through the gap or material; maximum supported brush retains real terminal continuity',()=>{
 const world=createRoundedCrescentWorld({terrainId:'no-gap-shortcut',identity,dimensions:{...defaults,spanDegrees:300,curvatureRatio:.85,bodyRadiusRatio:.5},detail:256}),g=world.geometry,t=world.terrain,n=256,other=t.resolve({...identity,patchId:'nx',row:n/2,column:n/2}),own=t.resolve({...identity,patchId:'px',row:n/2,column:n/2}),radius=roundedBrushPolicy(g).maximum;
 const stroke=startSphericalBrushStroke(t,{...identity,direction:[1,0,0]},{tool:'raise',radiusMeters:radius,strengthMeters:100},undefined,undefined,{roundedGlobe:g});stroke.end();assert.equal(t.read(other),-100);assert.equal(t.read(own),0);for(const key of t.neighbors(own))assert.ok(t.read(key)>-100);
 assert.throws(()=>startSphericalBrushStroke(t,{...identity,direction:[1,0,0]},{tool:'raise',radiusMeters:radius*1.001,strengthMeters:100},undefined,undefined,{roundedGlobe:g}),RangeError);
});
