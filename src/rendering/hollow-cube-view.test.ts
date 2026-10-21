import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cubeCamera,cubeLayout,cubeRayHit,cubeNetHit,projectCube,dragCube,rotateCube,cubeSurfaceView} from './solid-cube-view.ts';
import {SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,type CubeVector} from '../surfaces/solid-cube.ts';
import {createSolidCubeTerrain} from '../terrain/solid-cube.ts';
const size={width:1100,height:750},inside={orientation:-1 as const,physicalScale:.8};
test('inward rays select the far physical wall, net projection/picking is reversible on all six faces, physical scale preserves shell dimensions',()=>{
 for(const face of SOLID_CUBE_FACES){const camera=cubeCamera(SOLID_CUBE_FRAMES[face].normal.map(v=>-v) as unknown as CubeVector),hit=cubeRayHit(0,0,camera,-1);assert.equal(hit?.face,face);
  for(const u of[-.7,0,.35])for(const v of[-.4,0,.9])for(const mode of['physical','net'] as const){const p=projectCube(face,u,v,camera,mode,size,inside),l=cubeLayout(camera,mode,size,inside),x=(p.x-l.x)/l.scale,y=(l.y-p.y)/l.scale,h=mode==='physical'?cubeRayHit(x,y,camera,-1):cubeNetHit(x+.5,y,-1);assert.equal(h?.face,face);assert.ok(Math.abs(h!.u-u)<1e-14);assert.ok(Math.abs(h!.v-v)<1e-14);}
 }
 assert.equal(cubeLayout(cubeCamera(),'physical',size,inside).scale,cubeLayout(cubeCamera(),'physical',size).scale*.8);assert.deepEqual(dragCube(cubeCamera(),30,-15),rotateCube(cubeCamera(),-30/180,-15/180));
 for(const appearance of [{orientation:0,physicalScale:1},{orientation:1,physicalScale:0},{orientation:-1,physicalScale:Infinity}])assert.throws(()=>cubeSurfaceView(appearance as never));
});
test('zero initial reference heights allocate once with revision zero; solid default and strict validation remain unchanged',()=>{
 const options={terrainId:'initial-tests',cellsPerEdge:4,geometry:{identity:{worldId:'initial',surfaceId:'x'},provider:'physical-solid-cube' as const,version:1 as const,configuration:'solid' as const,role:'exterior' as const,sideLengthMeters:10}},zero=createSolidCubeTerrain({...options,initialElevation:0}),legacy=createSolidCubeTerrain(options);
 assert.equal(zero.revision,0);assert.equal(zero.read(zero.keyAt(0)),0);assert.equal(legacy.read(legacy.keyAt(0)),-100);assert.equal(zero.elevationByteLength,legacy.elevationByteLength);assert.throws(()=>createSolidCubeTerrain({...options,initialElevation:Infinity}));assert.throws(()=>createSolidCubeTerrain({...options,geometry:{...options.geometry,role:'interior'} as never}));
});
