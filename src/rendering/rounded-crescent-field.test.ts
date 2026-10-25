import {test} from 'node:test';import assert from 'node:assert/strict';
import {CUBE_FACES,type CubeFace} from '../surfaces/cube-sphere.ts';
import {createSphericalTerrain} from '../terrain/spherical.ts';
import {buildSphericalFaceTexture,makeSphericalDisplayCache,type FaceTexture} from './spherical-raster.ts';
import {SphericalElevationField} from './spherical-elevation.ts';
import {roundedFieldClasses} from './rounded-crescent-field-classes.ts';
const finish=<T>(steps:Generator<void,T>)=>{let n=steps.next();while(!n.done)n=steps.next();return n.value;};
test('bounded cached alias stencils preserve the accepted field exactly across cells, seams, corners and journal gaps',()=>{
 const t=createSphericalTerrain({terrainId:'cached-aliases',identity:{worldId:'field-world',surfaceId:'field-surface'},radiusMeters:1e6,cellsPerEdge:32}),source=t.copyElevations(),faces=Object.fromEntries(CUBE_FACES.map(face=>[face,buildSphericalFaceTexture(t,source,face,true)])) as Record<CubeFace,FaceTexture>,a=new SphericalElevationField(t,makeSphericalDisplayCache(faces,t.revision)),b=new SphericalElevationField(t,makeSphericalDisplayCache(faces,t.revision));finish(a.prepare('all'));finish(b.prepare('all'));a.enableRegionHistory();const initial=a.sourceRevision;let summary=roundedFieldClasses(a);
 for(let i=0;i<132;i++){const face=CUBE_FACES[i%6]!,key=t.resolve({...t.metadata.identity,patchId:face,column:i%3===0?0:i%3===1?32:i*11%33,row:i*7%33});t.write(key,500*Math.sin(i+.2));finish(a.prepare([key.index]));finish(b.prepare([key.index]));summary=roundedFieldClasses(a,a.regions,summary);assert.deepEqual(summary,roundedFieldClasses(a));for(const f of CUBE_FACES)assert.deepEqual(a.data[f],b.data[f]);}
 assert.equal(a.regionsSince(initial),undefined);assert.deepEqual(a.regionsSince(a.sourceRevision),[]);assert.ok(a.regionsSince(a.previousRevision)!.length>0);
});
test('sign summaries include every reconstruction corner and retain mixed blocks and tiny positive GPU values',()=>{
 const n=16,side=17,data=Object.fromEntries(CUBE_FACES.map(f=>[f,new Float32Array(side*side*4).fill(10)])) as Record<CubeFace,Float32Array>,field={n,data,sourceRevision:0,heightScale:100};
 let summary=roundedFieldClasses(field);assert.ok(summary.data.every(v=>v===2));data.px[(8*side+8)*4]=-1;summary=roundedFieldClasses(field);assert.deepEqual([...summary.data.slice(0,4)],[0,0,0,0]);data.nx.fill(0);data.nx[0]=2**-149;summary=roundedFieldClasses(field);assert.equal(summary.data[4],0);assert.equal(summary.data[5],1);
});
