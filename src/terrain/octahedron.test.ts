import {test} from 'node:test';import assert from 'node:assert/strict';
import {createOctahedronTerrain} from './octahedron.ts';import {OCTAHEDRON_FACES} from '../surfaces/octahedron.ts';
const identity={worldId:'tetra',surfaceId:'outside'},geometry={identity,provider:'physical-regular-octahedron' as const,version:1 as const,role:'exterior' as const,edgeLengthMeters:1e6};
for(const n of[128,256])test(`octahedron N${n}: every face alias resolves to one of exactly 4N^2+2 canonical Float32 words`,()=>{
 const t=createOctahedronTerrain({terrainId:'t',geometry,subdivisions:n}),indices=new Set<number>();assert.equal(t.sampleCount,4*n*n+2);assert.equal(t.elevationByteLength,4*t.sampleCount);
 for(const patchId of OCTAHEDRON_FACES)for(let row=0;row<=n;row++)for(let column=0;column<=n-row;column++){const address={...identity,patchId,row,column},key=t.resolve(address);indices.add(key.index);assert.equal(t.resolve(t.owner(key)).index,key.index);assert.equal(t.read(key),-100);}
 assert.equal(indices.size,t.sampleCount);for(let i=0;i<6;i++)assert.equal(t.aliases(t.keyAt(i)).length,4);
 const key=t.resolve({...identity,patchId:'ppp',column:n/2,row:0});t.write(key,125);for(const a of t.aliases(key))assert.equal(t.read(t.resolve(a)),125);
 const snapshot=t.copyElevations();snapshot.fill(20);assert.equal(t.read(key),125);
});
test('octahedron ownership handles non-power-of-two detail, symmetric neighbor joins and foreign or stale epochs',()=>{
 for(const n of[4,7,13]){const t=createOctahedronTerrain({terrainId:'t',geometry,subdivisions:n});for(const k of t.samples()){assert.equal(t.resolve(t.owner(k)).index,k.index);for(const a of t.aliases(k))assert.equal(t.resolve(a).index,k.index);for(const other of t.neighbors(k))assert.ok(t.neighbors(other).some(x=>x.index===k.index));}}
 assert.throws(()=>createOctahedronTerrain({terrainId:'t',geometry,subdivisions:128,elevationLimitMeters:1e6}));const t=createOctahedronTerrain({terrainId:'t',geometry,subdivisions:128}),foreign=createOctahedronTerrain({terrainId:'t',geometry:{...geometry,edgeLengthMeters:2e6},subdivisions:128});assert.throws(()=>t.read(foreign.keyAt(0)));assert.throws(()=>t.write({...t.keyAt(0),surfaceId:'other'},1));assert.throws(()=>t.write(t.keyAt(0),t.maxElevation+1));const before=t.copyElevations();assert.throws(()=>t.commitPreparedPatch(t.keyAt(0),t.revision+1,[{indices:new Uint32Array([0]),values:new Float32Array([10]),count:1}]));assert.deepEqual(t.copyElevations(),before);
});

import {PolyhedronDisplayCache} from '../rendering/polyhedron-field.ts';
test('octahedron numerical N256 does not silently raise the accepted interactive display capacity',()=>{const t=createOctahedronTerrain({terrainId:'t',geometry,subdivisions:256});assert.equal(t.sampleCount,262146);assert.throws(()=>new PolyhedronDisplayCache(t),/capacity/);});
