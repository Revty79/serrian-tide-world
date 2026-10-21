import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSolidCubeTerrain} from '../terrain/solid-cube.ts';
import {createSphericalTerrain} from '../terrain/spherical.ts';
import {createCylindricalTerrain} from '../terrain/cylindrical.ts';
import {prepareSolidCubeDab} from '../terrain/solid-cube-brush.ts';
import {prepareCylindricalDab} from '../terrain/cylindrical-brush.ts';
import {startSphericalBrushStroke} from '../terrain/spherical-brush.ts';
import {createSolidCubeSessionWithPath} from './solid-cube-session.ts';
import {createSolidCubeStrokePath} from '../surfaces/solid-cube-stroke-path.ts';
import {createCylindricalHistory} from './cylindrical-history.ts';
import {beginCylindricalStroke} from '../terrain/cylindrical-stroke.ts';
import {radialFalloff} from '../terrain/brush-math.ts';
import {CYLINDER_UI_SPACING_RATIO,defaultCylinderControls} from './cylinder-controls.ts';
import {DEFAULT_ADDITIVE_STRENGTH_METERS} from './brush-defaults.ts';
const identity={worldId:'parity',surfaceId:'exterior'},radius=45000,strength=200,R=1000000,offset=radius*.017,leg=[-5*radius+offset,5*radius+offset];
type Tool='raise'|'lower';
function make(shape:'cube'|'sphere'|'cylinder'){
 if(shape==='cube'){
  const t=createSolidCubeTerrain({terrainId:'cube',cellsPerEdge:16,geometry:{identity,provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters:1000000}}),key=t.resolve({...identity,patchId:'pz',column:8,row:8}),point=(x:number)=>({...identity,patchId:'pz',u:x,v:0});
  return{read:()=>t.read(key),dab(x:number,tool:Tool){const job=prepareSolidCubeDab(t,point(x),{version:1,tool,radiusMeters:radius,strengthMeters:strength});while(job.status==='preparing')job.pump(256);job.commit();},stroke(xs:number[],tool:Tool,_spacing?:number){const core=createSolidCubeSessionWithPath(t,{capacity:'surface'},(c,r,l)=>createSolidCubeStrokePath(c,r,l,'bounded-phase'));const s=core.begin(point(xs[0]!),{version:1,tool,radiusMeters:radius,strengthMeters:strength},{workWindow:'dab'});for(const x of xs.slice(1)){while(!s.accept(point(x)))s.pump();}s.release();while(s.status==='draining')s.pump();assert.equal(s.status,'complete');return s.statistics.committedDabs;}};
 }
 if(shape==='sphere'){
  const t=createSphericalTerrain({terrainId:'sphere',identity,radiusMeters:R,cellsPerEdge:16}),key=t.resolve({...identity,patchId:'pz',column:8,row:8}),point=(x:number)=>({...identity,direction:[Math.sin(x/R),0,Math.cos(x/R)] as const});
  return{read:()=>t.read(key),dab(x:number,tool:Tool){startSphericalBrushStroke(t,point(x),{tool,radiusMeters:radius,strengthMeters:strength}).end();},stroke(xs:number[],tool:Tool,_spacing?:number){const s=startSphericalBrushStroke(t,point(xs[0]!),{tool,radiusMeters:radius,strengthMeters:strength});for(const x of xs.slice(1))s.moveTo(point(x));s.end();return s.statistics.dabs;}};
 }
 const t=createCylindricalTerrain({terrainId:'cylinder',geometry:{identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:R,lengthMeters:1600000},resolution:{angularSamples:32,axialCells:16,radialCells:8}}),key=t.resolve({...identity,patchId:'side',column:0,row:8}),point=(x:number)=>({...identity,patchId:'side',u:0,v:800000+x});
 return{read:()=>t.read(key),dab(x:number,tool:Tool){const job=prepareCylindricalDab(t,point(x),{version:1,tool,radiusMeters:radius,strengthMeters:strength});while(job.status==='preparing')job.pump(256);job.commit();},stroke(xs:number[],tool:Tool,spacing=radius/4){const h=createCylindricalHistory(t),s=beginCylindricalStroke(t,h,point(xs[0]!),{version:1,tool,radiusMeters:radius,strengthMeters:strength},{spacingMeters:spacing});for(const x of xs.slice(1))s.move(point(x),'shortest-surface');s.release();while(s.status==='draining')s.pump(256);assert.equal(s.status,'complete');return s.statistics.committedDabs;}};
}
test('all geometries apply the same 200 m single dab and cubic radial falloff in actual canonical elevations',()=>{
 assert.equal(DEFAULT_ADDITIVE_STRENGTH_METERS,200);assert.equal(defaultCylinderControls(R).strength,'200');
 for(const tool of['raise','lower'] as const)for(const ratio of[0,.25,.5,.75,.99,1.01]){
  const expected=Math.fround(-100+(tool==='raise'?1:-1)*strength*(ratio>=1?0:radialFalloff(ratio))),values=[];
  for(const shape of['cube','sphere','cylinder'] as const){const world=make(shape);world.dab(radius*ratio,tool);values.push(world.read());assert.ok(Math.abs(world.read()-expected)<=.00002,`${shape} ${tool} at ${ratio}: ${world.read()} vs ${expected}`);}
  assert.ok(Math.max(...values)-Math.min(...values)<=.00002);
 }
});
test('identical 45 km radius, strength and 450 km travel give the same dab density and overlap; reversal and Lower retain physical units',()=>{
 const results=[];
 for(const shape of['cube','sphere','cylinder'] as const){const world=make(shape),dabs=world.stroke([...leg,leg[0]!],'raise'),raised=world.read();assert.equal(dabs,81);assert.ok(Math.abs(raised-1500)<.0003,`${shape}: ${raised}`);assert.equal(world.stroke([...leg,leg[0]!],'lower'),81);assert.ok(Math.abs(world.read()+100)<.0003);results.push(raised);}
 assert.ok(Math.max(...results)-Math.min(...results)<.0003);
});
test('accepted cylinder UI spacing is slightly denser than radius/4, never an unexplained cube strength multiplier',()=>{
 const standard=make('cylinder'),ui=make('cylinder');assert.equal(standard.stroke(leg,'raise'),41);assert.equal(ui.stroke(leg,'raise',radius*CYLINDER_UI_SPACING_RATIO),43);
 assert.ok(Math.abs(standard.read()-700)<.0002);assert.ok(ui.read()>standard.read());assert.ok(ui.read()<standard.read()+70);
});
