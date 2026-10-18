import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createCylindricalTerrain} from './cylindrical.ts';
import {createCylindricalHistory} from '../editor/cylindrical-history.ts';
import {beginCylindricalStroke} from './cylindrical-stroke.ts';
import type {CylindricalBrushSettings} from './cylindrical-brush.ts';
import type {CylinderRegion} from '../surfaces/cylinder.ts';
interface Point {region:string;angle:string;coordinate:string}
interface Case {name:string;length:string;spacing:string;brushRadius:string;dabCount:number;initialDirection:[number,number,number]|null;inputs:Point[];denseInputs:Point[];centers:Point[];beforeWords:number[];expected:Record<string,{words:number[];values:string[]}>}
const fixture=JSON.parse(readFileSync(new URL('./fixtures/cylinder-stroke-reference.json',import.meta.url),'utf8')) as {resolution:{angularSamples:number;axialCells:number;radialCells:number};cases:Case[]};
const identity={worldId:'independent-strokes',surfaceId:'outside'};
const point=(p:Point)=>({...identity,patchId:(p.region==='side'?'side':p.region==='start'?'cap-start':'cap-end') as CylinderRegion,u:Number(p.angle)*(p.region==='end'?-1:1),v:Number(p.coordinate)});
for(const c of fixture.cases)for(const tool of ['raise','lower','smooth','flatten'] as const)test(`independent Decimal continuous ${tool}: ${c.name}`,()=>{
 const results=[];
 for(const dense of [false,true]){
  const t=createCylindricalTerrain({terrainId:'ref',geometry:{identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:1,lengthMeters:Number(c.length)},resolution:fixture.resolution});
  const source=new Float32Array(Uint32Array.from(c.beforeWords).buffer);for(const key of t.samples())t.write(key,source[key.index]!);const before=new Uint32Array(t.copyElevations().buffer),h=createCylindricalHistory(t);
  const settings={version:1,tool,radiusMeters:Number(c.brushRadius),maxFalloffError:1e-8,...(tool==='raise'||tool==='lower'?{strengthMeters:43.7}:{intensity:.65,...(tool==='flatten'?{targetElevation:-250}:{})})} as CylindricalBrushSettings;
  const inputs=dense?c.denseInputs:c.inputs,first=point(inputs[0]!),s=beginCylindricalStroke(t,h,first,settings,{spacingMeters:Number(c.spacing),initialDirection:c.initialDirection?{patchId:first.patchId,direction:c.initialDirection}:undefined});
  for(const p of inputs.slice(1))s.move(point(p),'shortest-surface');s.release();let pumps=0,last=0,maxPositionError=0;
  while(s.status==='draining'){
   assert.ok(++pumps<100000);s.pump(dense?1:64);const stats=s.statistics;
   if(stats.committedDabs>last){const actual=t.geometry.referencePosition(stats.lastCommittedCenter!),expected=t.geometry.referencePosition(point(c.centers[last]!));maxPositionError=Math.max(maxPositionError,Math.hypot(...actual.map((v,i)=>v-expected[i]!)));last=stats.committedDabs;}
  }
  assert.equal(s.status,'complete');assert.equal(s.statistics.committedDabs,c.dabCount);assert.equal(last,c.centers.length);assert.ok(maxPositionError<1e-8);assert.equal(h.statistics.entries,1);
  const actual=t.copyElevations(),magnitude=Math.max(1,...actual.map(Math.abs),...c.expected[tool]!.values.map(v=>Math.abs(Number(v))));
  const bound=s.statistics.sumPreRoundElevationErrorMeters+c.dabCount*(magnitude*2**-23+2**-149)+1500*c.dabCount*maxPositionError/Number(c.brushRadius);
  for(let i=0;i<actual.length;i++)assert.ok(Math.abs(actual[i]!-Number(c.expected[tool]!.values[i]))<=bound,`${i}: ${actual[i]} vs ${c.expected[tool]!.values[i]}, bound ${bound}`);
  const after=new Uint32Array(actual.buffer);h.undo();assert.deepEqual(new Uint32Array(t.copyElevations().buffer),before);h.redo();assert.deepEqual(new Uint32Array(t.copyElevations().buffer),after);
  results.push({actual,bound});
 }
 for(let i=0;i<results[0]!.actual.length;i++)assert.ok(Math.abs(results[0]!.actual[i]!-results[1]!.actual[i]!)<=results[0]!.bound+results[1]!.bound,'event subdivision numerical agreement');
});
