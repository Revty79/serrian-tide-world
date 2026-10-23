import {test} from 'node:test';import assert from 'node:assert/strict';
import {createIcosahedronTerrain} from './icosahedron.ts';import {ICOSAHEDRON_FACES} from '../surfaces/icosahedron.ts';
const identity={worldId:'tetra',surfaceId:'outside'},geometry={identity,provider:'physical-regular-icosahedron' as const,version:1 as const,role:'exterior' as const,edgeLengthMeters:1e6};
for(const n of[128,256])test(`icosahedron N${n}: every face alias resolves to one of exactly 10N^2+2 canonical Float32 words`,()=>{
 const t=createIcosahedronTerrain({terrainId:'t',geometry,subdivisions:n}),indices=new Set<number>();assert.equal(t.sampleCount,10*n*n+2);assert.equal(t.elevationByteLength,4*t.sampleCount);
 for(const patchId of ICOSAHEDRON_FACES)for(let row=0;row<=n;row++)for(let column=0;column<=n-row;column++){const address={...identity,patchId,row,column},key=t.resolve(address);indices.add(key.index);assert.equal(t.resolve(t.owner(key)).index,key.index);assert.equal(t.read(key),-100);}
 assert.equal(indices.size,t.sampleCount);for(let i=0;i<12;i++)assert.equal(t.aliases(t.keyAt(i)).length,5);
 const key=t.resolve({...identity,patchId:'f0',column:n/2,row:0});t.write(key,125);for(const a of t.aliases(key))assert.equal(t.read(t.resolve(a)),125);
 const snapshot=t.copyElevations();snapshot.fill(20);assert.equal(t.read(key),125);
});
test('icosahedron ownership handles non-power-of-two detail, symmetric neighbor joins and foreign or stale epochs',()=>{
 for(const n of[4,7,13]){const t=createIcosahedronTerrain({terrainId:'t',geometry,subdivisions:n});for(const k of t.samples()){assert.equal(t.resolve(t.owner(k)).index,k.index);for(const a of t.aliases(k))assert.equal(t.resolve(a).index,k.index);for(const other of t.neighbors(k))assert.ok(t.neighbors(other).some(x=>x.index===k.index));}}
 assert.throws(()=>createIcosahedronTerrain({terrainId:'t',geometry,subdivisions:128,elevationLimitMeters:1e6}));const t=createIcosahedronTerrain({terrainId:'t',geometry,subdivisions:128}),foreign=createIcosahedronTerrain({terrainId:'t',geometry:{...geometry,edgeLengthMeters:2e6},subdivisions:128});assert.throws(()=>t.read(foreign.keyAt(0)));assert.throws(()=>t.write({...t.keyAt(0),surfaceId:'other'},1));assert.throws(()=>t.write(t.keyAt(0),t.maxElevation+1));const before=t.copyElevations();assert.throws(()=>t.commitPreparedPatch(t.keyAt(0),t.revision+1,[{indices:new Uint32Array([0]),values:new Float32Array([10]),count:1}]));assert.deepEqual(t.copyElevations(),before);
});


import {PolyhedronDisplayCache} from '../rendering/polyhedron-field.ts';
test('qualified icosahedron N256 display has bounded twenty-face storage and unknown profiles retain the previous capacity',()=>{const t=createIcosahedronTerrain({terrainId:'t',geometry,subdivisions:256}),c=new PolyhedronDisplayCache(t);assert.equal(t.sampleCount,655362);assert.equal(c.data.byteLength,20*257*257*16);assert.equal(c.initialAtlas.size,20);assert.equal(c.ownedArrayBufferBytes,3*655362*4+20*257*257*20+20*513*513*4);assert.equal(c.atlasSize,513);assert.throws(()=>new PolyhedronDisplayCache({...t,geometry:{...t.geometry,metadata:{...t.geometry.metadata,provider:'unqualified'}}}),/capacity/);c.dispose();});
