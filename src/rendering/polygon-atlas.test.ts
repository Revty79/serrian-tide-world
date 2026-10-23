import test from 'node:test';import assert from 'node:assert/strict';
import {createDodecahedronTerrain} from '../terrain/dodecahedron.ts';
import {PolyhedronDisplayCache} from './polyhedron-field.ts';
test('dirty polygon colors include the full interpolation-cell stencil under a sheared pentagon chart',()=>{
 const identity={worldId:'polygon-stencil',surfaceId:'terrain'},t=createDodecahedronTerrain({terrainId:'terrain',geometry:{provider:'physical-regular-dodecahedron',version:1,identity,role:'exterior',edgeLengthMeters:1e6},subdivisions:32}),cache=new PolyhedronDisplayCache(t);for(const _ of cache.prepare())void _;
 for(const[column,row]of[[8,7],[9,8],[10,7]]){const k=t.resolve({...identity,patchId:'pentagon-1:1',column:column!,row:row!});t.write(k,1600);cache.refresh([k.index]);}
 const rects=cache.dirtySince(0);for(const a of cache.polygonAtlases)a.update(rects,true);
 const fresh=new PolyhedronDisplayCache(t);for(const _ of fresh.prepare())void _;
 assert.deepEqual(cache.data,fresh.data);for(const[i,a]of cache.polygonAtlases.entries())assert.deepEqual(a.pixels,fresh.polygonAtlases[i]!.pixels);let checked=0;
 for(const[aIndex,a]of cache.polygonAtlases.entries())for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
  const signs=a.coordinates.map((p,i)=>{const q=a.coordinates[(i+1)%a.coordinates.length]!;return(q[0]-p[0])*(y-p[1])-(q[1]-p[1])*(x-p[0]);});
  // The remainder of the rectangular tile is outside the physical polygon.
  if(!signs.every(s=>s>=-1e-9)&&!signs.every(s=>s<=1e-9))continue;
  const at=(y*a.width+x)*4;assert.deepEqual(a.pixels.subarray(at,at+4),fresh.polygonAtlases[aIndex]!.pixels.subarray(at,at+4),`${a.id} ${x},${y}`);checked++;
 }
 assert.ok(checked>10000);
});
