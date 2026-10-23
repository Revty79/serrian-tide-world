import {test} from 'node:test';import assert from 'node:assert/strict';
import {createTrapezohedronTerrain} from '../terrain/trapezohedron.ts';import {trapezohedronWorkspaceAdapter} from '../components/trapezohedron-workspace-adapter.ts';
for(const role of['exterior','interior'] as const)test(`decahedron ${role} footprint: one canonical physical dot preserves all alias positions; map cuts keep every alias`,()=>{
 const t=createTrapezohedronTerrain({terrainId:'preview',geometry:{provider:'physical-pentagonal-trapezohedron',version:1,identity:{worldId:'preview',surfaceId:role},role,radiusMeters:1e6},subdivisions:128}),a=trapezohedronWorkspaceAdapter(t),physical=a.initial('physical'),map=a.initial('map'),indices=new Set([...Array.from({length:t.boundarySampleCount},(_,i)=>i),...Array.from({length:128},(_,i)=>Math.min(t.sampleCount-1,t.boundarySampleCount+i*1024))]);
 for(const index of indices){const expected=t.aliases(t.keyAt(index)).map(p=>t.positionAt(p)),one=a.samplePositions(index,physical);assert.equal(one.length,1);const p=a.project(one[0]!,physical,{width:1440,height:950})!;for(const alias of expected){const q=a.project(alias,physical,{width:1440,height:950})!;assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<1e-6);}assert.deepEqual(a.samplePositions(index,map),expected);}
 // Evict old entries and revisit a pole: eviction cannot change the footprint.
 for(let index=0;index<9000;index++)a.samplePositions(index,physical);assert.deepEqual(a.samplePositions(0,physical),[t.positionAt(t.owner(t.keyAt(0)))]);
});
