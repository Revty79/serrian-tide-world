import test from 'node:test';import assert from 'node:assert/strict';
import {createOpenCylinderTerrain} from './open-cylinder.ts';
import {beginOpenCylinderStroke} from './open-cylinder-stroke.ts';
import {createConnectedHistory} from '../editor/connected-history.ts';
import {reconstructOpenCylinderPath} from '../surfaces/open-cylinder-path.ts';
const identity={worldId:'open-gesture',surfaceId:'connected'},configuration={identity,provider:'physical-open-cylinder' as const,version:1 as const,configuration:'both-open' as const,outerRadiusMeters:1000,innerRadiusMeters:400,lengthMeters:1600},resolution={angularSamples:64,axialCells:32,radialCells:16},settings={version:1 as const,tool:'raise' as const,radiusMeters:70,strengthMeters:2};
const make=()=>createOpenCylinderTerrain({terrainId:'parent',geometry:configuration,resolution});
function gesture(events:number){
 const terrain=make(),history=createConnectedHistory(terrain),before=terrain.copyElevations(),start=terrain.geometry.fromMeridian(0,100),stroke=beginOpenCylinderStroke(terrain,history,start,settings);
 for(let i=1;i<=events;i++){stroke.move(terrain.geometry.fromMeridian(0,100+4400*(i/events)));while(stroke.statistics.pendingPositions>16)stroke.pump(32);}
 stroke.release();let pumps=0;while(stroke.status==='drawing'||stroke.status==='draining'){stroke.pump(32);assert.ok(++pumps<100000);}
 assert.equal(stroke.status,'complete');assert.equal(stroke.statistics.discardedPositions,0);assert.equal(stroke.statistics.acceptedPositions,events+1);assert.ok(Math.abs(stroke.statistics.traveledMeters-4400)<1e-6);assert.equal(history.statistics.entries,1);assert.equal(history.operations[0]!.termination,'released');assert.ok(stroke.statistics.maximumPathPieces>=2);
 const after=terrain.copyElevations();for(const patch of['outer-wall','inner-wall','rim-start','rim-end'])assert.ok([...terrain.samples()].some(key=>terrain.owner(key).patchId===patch&&terrain.read(key)>0));history.undo();assert.deepEqual(terrain.copyElevations(),before);history.redo();assert.deepEqual(terrain.copyElevations(),after);return after;
}
test('a full meridian gesture crosses all four creases and both scopes as one exact undoable operation',()=>{gesture(100);});
test('ordinary carried spacing is independent of event frequency along the same physical meridian',()=>{assert.deepEqual(gesture(100),gesture(400));});
test('oblique curved-wall to annulus input follows contained physical paths and exact whole-gesture replay',()=>{
 const t=make(),history=createConnectedHistory(t),before=t.copyElevations(),path=reconstructOpenCylinderPath(t.geometry,{...identity,patchId:'inner-wall',u:0,v:50},{...identity,patchId:'rim-end',u:.65,v:300},{version:1}),stroke=beginOpenCylinderStroke(t,history,path.start,settings);
 for(let i=1;i<=100;i++){stroke.move(path.atDistance(path.lengthMeters*(i/100)).position);while(stroke.statistics.pendingPositions>8)stroke.pump(32);}stroke.release();let pumps=0;while(stroke.status==='draining'){stroke.pump(32);assert.ok(++pumps<10000);}
 assert.equal(stroke.status,'complete');assert.equal(stroke.statistics.discardedPositions,0);assert.equal(history.statistics.entries,1);const painted=t.copyElevations();assert.notDeepEqual(painted,before);history.undo();assert.deepEqual(t.copyElevations(),before);history.redo();assert.deepEqual(t.copyElevations(),painted);
});
test('an unsupported nonlocal jump retains only its accepted prefix and one exact failed operation',()=>{
 const t=make(),history=createConnectedHistory(t),before=t.copyElevations(),stroke=beginOpenCylinderStroke(t,history,{...identity,patchId:'outer-wall',u:0,v:800},settings);while(stroke.statistics.committedDabs===0)stroke.pump(32);const prefix=t.copyElevations();stroke.move({...identity,patchId:'inner-wall',u:1,v:800});
 assert.throws(()=>{while(stroke.status==='drawing')stroke.pump(32);},/unsupported|nonlocal|intermediate/);assert.equal(stroke.status,'failed');assert.equal(stroke.statistics.pendingPositions,0);assert.deepEqual(t.copyElevations(),prefix);assert.equal(history.operations[0]!.termination,'failed');history.undo();assert.deepEqual(t.copyElevations(),before);history.redo();assert.deepEqual(t.copyElevations(),prefix);
});
test('cancellation releases pending work and preserves exact whole-prefix history',()=>{
 const t=make(),history=createConnectedHistory(t),before=t.copyElevations(),stroke=beginOpenCylinderStroke(t,history,{...identity,patchId:'rim-end',u:0,v:300},settings);while(stroke.statistics.committedDabs===0)stroke.pump(32);stroke.move({...identity,patchId:'rim-end',u:.1,v:310});stroke.cancel();const after=t.copyElevations();assert.equal(stroke.status,'cancelled');assert.equal(stroke.statistics.pendingPositions,0);assert.equal(history.operations[0]!.termination,'cancelled');history.undo();assert.deepEqual(t.copyElevations(),before);history.redo();assert.deepEqual(t.copyElevations(),after);
});
