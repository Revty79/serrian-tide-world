import assert from 'node:assert/strict';
import test from 'node:test';
import {createCylindricalTerrain} from './cylindrical.ts';
import {createCylindricalHistory} from '../editor/cylindrical-history.ts';
import {beginCylindricalStroke, type CylinderStrokeOptions} from './cylindrical-stroke.ts';
import type {CylindricalBrushSettings} from './cylindrical-brush.ts';
const identity={worldId:'stroke',surfaceId:'outside'};
const p=(patchId:'side'|'cap-start'|'cap-end',v:number,theta=.13)=>({...identity,patchId,u:patchId==='cap-end'?-theta:theta,v});
const make=(A=7,Z=4,P=3)=>createCylindricalTerrain({terrainId:'s',geometry:{identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:1,lengthMeters:1.6},resolution:{angularSamples:A,axialCells:Z,radialCells:P}});
const settings=(tool:CylindricalBrushSettings['tool']='raise'):CylindricalBrushSettings=>({version:1,tool,radiusMeters:.713,...(tool==='raise'||tool==='lower'?{strengthMeters:43.7}:{intensity:.65,...(tool==='flatten'?{targetElevation:-250}:{})})} as CylindricalBrushSettings);
const words=(t:ReturnType<typeof make>)=>new Uint32Array(t.copyElevations().buffer);
const seed=(t:ReturnType<typeof make>)=>{for(const k of t.samples())t.write(k,((k.index*13)%17-8)*20);t.write(t.keyAt(1),-0);};
function drain(s:ReturnType<typeof beginCylindricalStroke>,steps=64){let n=0;while(s.statistics.hasPendingWork&&(s.status==='drawing'||s.status==='draining')){assert.ok(++n<100000);s.pump(steps);}}
const roundTrip=[p('cap-start',1),p('side',1.6),p('cap-end',0),p('cap-end',1),p('side',0),p('cap-start',0)];
for(const tool of ['raise','lower','smooth','flatten'] as const)test(`${tool} continuous round trip through both rims/caps is one exact reversible operation`,()=>{
 const t=make();seed(t);const before=words(t),h=createCylindricalHistory(t),s=beginCylindricalStroke(t,h,p('cap-start',0),settings(tool),{spacingMeters:.4});for(const q of roundTrip)s.move(q,'shortest-surface');s.release();assert.equal(s.status,'draining');drain(s,3);
 assert.equal(s.status,'complete');assert.equal(s.statistics.committedDabs,19);assert.equal(s.statistics.processedPositions,7);assert.equal(s.statistics.discardedPositions,0);assert.equal(h.statistics.entries,1);const after=words(t);assert.notDeepEqual(after,before);h.undo();assert.deepEqual(words(t),before);h.redo();assert.deepEqual(words(t),after);
});
for(const tool of ['raise','lower','smooth','flatten'] as const)test(`${tool} sparse/dense equivalent radial/axial inputs preserve spacing and numerical results`,()=>{
 const run=(dense:boolean,steps:number)=>{const t=make();seed(t);const h=createCylindricalHistory(t),s=beginCylindricalStroke(t,h,p('cap-start',0),settings(tool),{spacingMeters:.4});
 const q=dense?[p('cap-start',.25),p('cap-start',.5),p('cap-start',.75),p('cap-start',1),p('side',.4),p('side',.8),p('side',1.2),p('side',1.6),p('cap-end',.75),p('cap-end',.5),p('cap-end',.25),p('cap-end',0)]:roundTrip.slice(0,3);for(const point of q){s.move(point,'shortest-surface');if(dense)drain(s,steps);}s.release();drain(s,steps);return{words:words(t),stats:s.statistics};};
 const a=run(false,64),b=run(true,1);assert.equal(a.stats.committedDabs,10);assert.equal(b.stats.committedDabs,10);assert.deepEqual(a.words,b.words);
});
test('initial settings are immutable, stationary holding adds no dabs and decimal axial endpoints are not omitted',()=>{
 const t=make(),h=createCylindricalHistory(t),input=settings(),s=beginCylindricalStroke(t,h,p('side',.4),input,{spacingMeters:.1});drain(s);const initial=words(t);for(let i=0;i<20;i++)s.pump();assert.deepEqual(words(t),initial);assert.equal(s.statistics.committedDabs,1);
 if(input.tool==='raise')(input as {strengthMeters:number}).strengthMeters=999;s.move(p('side',.4));s.move(p('side',.7));s.release();drain(s);assert.equal(s.statistics.committedDabs,4);assert.equal(s.settings.tool,'raise');assert.equal((s.settings as {strengthMeters:number}).strengthMeters,43.7);
});
test('angular wrap, explicit cap shortcuts, cut preferences and actual intermediate trajectories remain physical',()=>{
 const t=make(),h=createCylindricalHistory(t),s=beginCylindricalStroke(t,h,p('side',.8,Math.PI-.2),settings(),{spacingMeters:.1});s.move(p('side',.8,-Math.PI+.2));s.release();drain(s);assert.equal(s.statistics.committedDabs,5);
 const q=make(),hh=createCylindricalHistory(q),shortcut=beginCylindricalStroke(q,hh,p('side',.02,0),settings(),{spacingMeters:.2,initialDirection:{patchId:'side',direction:[0,0,-1]}});shortcut.move(p('side',.02,Math.PI),'shortest-surface');shortcut.release();drain(shortcut);assert.equal(shortcut.statistics.maximumPathPieces,3);assert.equal(hh.statistics.entries,1);
 const a=make(),ha=createCylindricalHistory(a),jump=beginCylindricalStroke(a,ha,p('side',.8,0),settings());drain(jump);const prefix=words(a);jump.move(p('side',.8,2));assert.throws(()=>drain(jump),/intermediate/);assert.deepEqual(words(a),prefix);assert.equal(jump.status,'failed');assert.equal(ha.operations[0]!.termination,'failed');
});
test('release drains accepted order; cancellation/disposal discard pending preparation and retain one prefix operation',()=>{
 for(const termination of ['cancel','dispose'] as const){const t=make();seed(t);const before=words(t),h=createCylindricalHistory(t),s=beginCylindricalStroke(t,h,p('cap-start',0),settings());drain(s);const prefix=words(t);s.move(p('cap-start',.5));s.pump();s.pump();s.pump(1);s[termination]();const end=words(t);assert.deepEqual(end,prefix);for(let i=0;i<3;i++)s.pump();assert.deepEqual(words(t),prefix);assert.equal(h.statistics.entries,1);h.undo();assert.deepEqual(words(t),before);h.redo();assert.deepEqual(words(t),prefix);assert.ok(s.statistics.discardedPositions>0);}
 const t=make(),h=createCylindricalHistory(t),s=beginCylindricalStroke(t,h,p('cap-start',0),settings());s.cancel();assert.equal(t.revision,0);assert.equal(h.statistics.entries,0);
});
test('external edits fail a pending stroke without overwriting data and preserve conflict-safe prefix history',()=>{
 for(const overlap of [false,true]){const t=make(),h=createCylindricalHistory(t),s=beginCylindricalStroke(t,h,p('cap-start',0),settings());drain(s);s.move(p('cap-start',.3));s.pump();s.pump();const index=overlap?t.resolve({...identity,patchId:'cap-start',row:0,column:0}).index:0;t.write(t.keyAt(index),1234);const external=words(t);assert.throws(()=>s.pump());assert.deepEqual(words(t),external);assert.equal(s.status,'failed');if(overlap){assert.throws(()=>h.undo(),/externally/);assert.deepEqual(words(t),external);}else{h.undo();assert.equal(t.read(t.keyAt(index)),1234);}}
});
test('queue, path, dab, history and accumulated-error failures preserve the committed prefix',()=>{
 const configurations: {options:CylinderStrokeOptions; history?:{maxStrokeSamples:number}; first?:ReturnType<typeof p>; target:ReturnType<typeof p>; enqueue?:number}[]=[
 {options:{maxPendingPositions:1},target:p('cap-start',.1),enqueue:2},
 {options:{maxDabs:1},target:p('cap-start',.5)},
 {options:{pathMaxBoxes:1},first:p('cap-start',.5),target:p('cap-end',.8,2.4)},
 {options:{maxSpacingErrorMeters:1e-15},target:p('cap-start',.3)},
 {options:{dabLimits:{maxDistanceQueries:1}},target:p('cap-start',.3)},
 {options:{},history:{maxStrokeSamples:1},target:p('cap-start',.5)},
 ];
 for(const c of configurations){const t=make(),before=words(t),h=createCylindricalHistory(t,c.history),s=beginCylindricalStroke(t,h,c.first??p('cap-start',0),settings(),c.options);try{drain(s);s.move(c.target,'shortest-surface');if(c.enqueue)s.move(c.target);s.release();drain(s);}catch{}assert.equal(s.status,'failed',JSON.stringify(c));if(c.options.pathMaxBoxes)assert.match(s.failure!.message,/box|budget/i);const partial=words(t);if(h.canUndo){h.undo();assert.deepEqual(words(t),before);h.redo();assert.deepEqual(words(t),partial);}else assert.deepEqual(partial,before);}
});
test('no-op strokes retain Redo, replacement is safe, and foreign/invalid input ends explicitly',()=>{
 const t=make(),h=createCylindricalHistory(t),s=beginCylindricalStroke(t,h,p('cap-start',0),settings());s.release();drain(s);h.undo();const noop=beginCylindricalStroke(t,h,p('cap-start',0),{version:1,tool:'smooth',radiusMeters:.713,intensity:0});noop.release();drain(noop);assert.ok(h.canRedo);
 const active=beginCylindricalStroke(t,h,p('cap-start',0),settings());assert.throws(()=>beginCylindricalStroke(t,h,p('side',.2),settings()));drain(active);active.dispose();const next=beginCylindricalStroke(t,h,p('side',.2),settings());assert.throws(()=>next.move({...p('side',.3),worldId:'foreign'}));assert.equal(next.status,'failed');assert.equal(next.statistics.committedDabs,0);assert.throws(()=>next.move(p('side',.2)));
});
test('maximum-resolution stroke/history and intentional reservation failure use sparse bounded storage',()=>{
 const t=make(1024,512,256),before=words(t),h=createCylindricalHistory(t),s=beginCylindricalStroke(t,h,p('side',.8),{version:1,tool:'raise',radiusMeters:.0137,strengthMeters:100},{spacingMeters:.00625});s.move(p('side',.825));s.release();drain(s);assert.equal(s.statistics.committedDabs,5);assert.ok(h.statistics.retainedBytes<t.elevationByteLength/100);const after=words(t);h.undo();assert.deepEqual(words(t),before);h.redo();assert.deepEqual(words(t),after);
 const q=make(1024,512,256),hq=createCylindricalHistory(q,{maxStrokeSamples:64}),fail=beginCylindricalStroke(q,hq,p('cap-start',0),{version:1,tool:'raise',radiusMeters:.0137,strengthMeters:100});assert.throws(()=>drain(fail),/budget/);assert.equal(q.revision,0);assert.equal(hq.statistics.retainedBytes,0);
});
test('long ordered input streams retain one operation and bounded pending/storage state',()=>{
 const t=make(16,4,3),before=words(t),h=createCylindricalHistory(t),s=beginCylindricalStroke(t,h,p('side',.8,0),{version:1,tool:'raise',radiusMeters:.217,strengthMeters:10},{spacingMeters:.1,maxPendingPositions:8});
 for(let i=1;i<=2000;i++){s.move(p('side',.8,i*.01));if(i%8===0)drain(s);}s.release();drain(s);assert.equal(s.statistics.processedPositions,2001);assert.equal(s.statistics.committedDabs,201);assert.ok(s.statistics.peakPendingPositions<=8);assert.equal(h.statistics.entries,1);const after=words(t);h.undo();assert.deepEqual(words(t),before);h.redo();assert.deepEqual(words(t),after);
});
test('aggregate work caps stop before another dab commits and release detects external changes',()=>{
 const t=make(8,4,4),before=words(t),h=createCylindricalHistory(t),s=beginCylindricalStroke(t,h,p('cap-start',0,0),{version:1,tool:'raise',radiusMeters:.001,strengthMeters:10},{spacingMeters:.25,maxTotalDistanceQueries:1});drain(s);assert.equal(s.statistics.committedDabs,1);s.move(p('cap-start',.25,0),'shortest-surface');s.release();assert.throws(()=>drain(s),/aggregate/);assert.equal(s.statistics.committedDabs,1);assert.equal(s.statistics.distanceQueries,1);h.undo();assert.deepEqual(words(t),before);
 const q=make(),hh=createCylindricalHistory(q),idle=beginCylindricalStroke(q,hh,p('cap-start',0),settings());drain(idle);q.write(q.keyAt(0),22);assert.throws(()=>idle.release(),/revision/);assert.equal(idle.status,'failed');
 for(const options of [{maxTotalPathBoxes:262145},{maxTotalDistanceQueries:0},{maxDabs:16385},{spacingMeters:0},{maxSpacingErrorMeters:1}]){const terrain=make();assert.throws(()=>beginCylindricalStroke(terrain,createCylindricalHistory(terrain),p('cap-start',0),settings(),options),RangeError);}
});
