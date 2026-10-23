import {test} from 'node:test';import assert from 'node:assert/strict';
import {rayCapsuleInterval,prepareRayCapsuleInterval,type ExcavationPrimitive} from './hollow-cube-csg.ts';
import {unitDirection} from './cube-sphere.ts';
import type {CubeVector} from './solid-cube.ts';
test('cached capsule queries preserve exact accepted interval words across world scales, directions and sphere degeneracy',()=>{
 let seed=0x4bb51a67;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
 for(let j=0;j<128;j++){const scale=10**([-3,0,3,6,9][j%5]!),a=[(random()-.5)*scale,(random()-.5)*scale,(random()-.5)*scale] as const,b=j%11===0?a:a.map(x=>x+(random()-.5)*scale) as unknown as CubeVector,p:ExcavationPrimitive={a,b,radius:scale*2**(-1-j%12)},prepared=prepareRayCapsuleInterval(p);
  for(let i=0;i<256;i++){const o=a.map(x=>x+(random()*6-3)*scale) as unknown as CubeVector,d=unitDirection([random()*2-1,random()*2-1,random()*2-1]);assert.deepEqual(prepared(o,d),rayCapsuleInterval(o,d,p));}
 }
 for(const p of[{a:[0,0,0],b:[0,0,2],radius:1},{a:[1e9,2e9,0],b:[1e9,2e9,1e5],radius:.125}] as const){const prepared=prepareRayCapsuleInterval(p);for(const o of[p.a,[p.a[0]+p.radius,p.a[1],p.a[2]-1e9],[p.a[0]+2*p.radius,p.a[1],p.a[2]-1e9]] as const)for(const d of[[0,0,1],[1,0,0],[0,1,0],[1e-15,0,1]] as const)assert.deepEqual(prepared(o,d),rayCapsuleInterval(o,d,p));}
});
test('prepared capsule geometry owns a snapshot instead of a stale mutable endpoint alias',()=>{const a:[number,number,number]=[0,0,0],b:[number,number,number]=[0,0,2],p={a,b,radius:1},prepared=prepareRayCapsuleInterval(p);assert.deepEqual(prepared([0,0,-3],[0,0,1]),[2,6]);a[0]=b[0]=1e6;p.radius=2;assert.deepEqual(prepared([0,0,-3],[0,0,1]),[2,6]);assert.equal(rayCapsuleInterval([0,0,-3],[0,0,1],p),undefined);});
