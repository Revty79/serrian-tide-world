import test from'node:test';import assert from'node:assert/strict';
import{createSphericalTerrain}from'../terrain/spherical.ts';import{CUBE_FACES,FACE_EDGES,QUARTER_PI,unitDirection,type CubeFace}from'../surfaces/cube-sphere.ts';
import{buildSphericalFaceTexture,makeSphericalDisplayCache,type FaceTexture}from'./spherical-raster.ts';
import{SphericalElevationField,sampleSphereFace,sphereDisplayColor,type SphereFieldSnapshot}from'./spherical-elevation.ts';
import{sphericalFieldRaster}from'./spherical-field-raster.ts';import{INITIAL_SPHERICAL_VIEW}from'./spherical-view.ts';
const make=(n=16)=>createSphericalTerrain({terrainId:'field',identity:{worldId:'world',surfaceId:'sphere'},radiusMeters:1000000,cellsPerEdge:n});
const finish=<T>(steps:Generator<void,T>)=>{let next=steps.next();while(!next.done)next=steps.next();return next.value;};
function field(t:ReturnType<typeof make>){const source=t.copyElevations(),faces=Object.fromEntries(CUBE_FACES.map(f=>[f,buildSphericalFaceTexture(t,source,f,true)])) as Record<CubeFace,FaceTexture>;const f=new SphericalElevationField(t,makeSphericalDisplayCache(faces,t.revision));finish(f.prepare('all'));return f;}
const words=(t:ReturnType<typeof make>)=>new Uint32Array(t.copyElevations().buffer);
test('world-tangent slopes follow physical radius and all chart aliases share exact field words',()=>{
 const t=make(32),k=[1000,2000,3000];for(const s of t.samples()){const d=t.directionAt(s);t.write(s,k[0]!*d[0]+k[1]!*d[1]+k[2]!*d[2]);}const before=words(t),f=field(t),side=f.n+1;
 for(const key of t.samples()){const d=t.directionAt(key),h=k[0]!*d[0]+k[1]!*d[1]+k[2]!*d[2],expected=k.map((v,i)=>(v-h*d[i]!)/1000000),aliases=t.aliases(key),first=aliases[0]!,offset=(first.row*side+first.column)*4,data=f.data[first.patchId];assert.ok(Math.hypot(data[offset+1]!-expected[0]!,data[offset+2]!-expected[1]!,data[offset+3]!-expected[2]!)<.00014);for(const a of aliases){const p=(a.row*side+a.column)*4;assert.deepEqual([...f.data[a.patchId].subarray(p,p+4)],[...data.subarray(offset,offset+4)]);}assert.deepEqual([...f.directions.subarray(key.index*3,key.index*3+3)],d);}
 assert.deepEqual(words(t),before);
});
test('interpolated elevations and physical slopes are continuous at every fold and corner',()=>{
 const t=make();for(const s of t.samples()){const[x,y,z]=t.directionAt(s);t.write(s,3000*x*y-2000*z+500*x);}const f=field(t);
 for(const face of CUBE_FACES)for(const edge of FACE_EDGES)for(const along of[-QUARTER_PI,-.71,-.14,0,.37,QUARTER_PI]){const p={...t.metadata.identity,patchId:face,u:edge.startsWith('u')?(edge.endsWith('min')?-1:1)*QUARTER_PI:along,v:edge.startsWith('v')?(edge.endsWith('min')?-1:1)*QUARTER_PI:along},q=t.geometry.crossEdge(p,edge).position,a=sampleSphereFace(f,face,p.u,p.v),b=sampleSphereFace(f,q.patchId,q.u,q.v);assert.ok(Math.abs(a.height-b.height)<1e-8);assert.ok(Math.hypot(...a.gradient.map((v,i)=>v-b.gradient[i]!))<1e-12);}
 for(const d of[unitDirection([0,0,1]),unitDirection([0,0,-1]),unitDirection([1,1,1])])for(const p of t.geometry.positionsForDirection(d)){const value=sampleSphereFace(f,p.patchId,p.u,p.v);assert.ok(Number.isFinite(value.height)&&value.gradient.every(Number.isFinite));}
});
test('coast classification follows reconstructed elevation, not blended source palette colors',()=>{
 const data=Object.fromEntries(CUBE_FACES.map(f=>[f,Float32Array.from([-1000,0,0,0,1000,0,0,0,-1000,0,0,0,1000,0,0,0])])) as Record<CubeFace,Float32Array>,f:SphereFieldSnapshot={n:1,data,sourceRevision:0,heightScale:1000};
 const coast=sampleSphereFace(f,'px',0,0),land=sampleSphereFace(f,'px',QUARTER_PI/2,0);assert.equal(coast.height,0);assert.deepEqual(sphereDisplayColor(coast.height,coast.gradient,'elevation'),[37,111,143]);assert.equal(land.height,500);assert.deepEqual(sphereDisplayColor(land.height,land.gradient,'elevation'),[128,152,96]);
});
test('display epochs publish atomically; cancellation and later numerical changes do not mutate snapshots',()=>{
 const t=make(),f=field(t),old=f.snapshot(),a=t.resolve({...t.metadata.identity,patchId:'px',column:0,row:0});t.write(a,4400);const revision=t.revision,steps=f.prepare('all');steps.next();assert.equal(f.sourceRevision,old.sourceRevision);t.write(t.keyAt(0),-3000);finish(steps);assert.equal(f.sourceRevision,revision);assert.deepEqual([...old.data.px],new Array(old.data.px.length).fill(0).map((_,i)=>i%4===0?-100:0));const b=field(t);finish(f.prepare([0]));for(const face of CUBE_FACES)assert.deepEqual(f.data[face],b.data[face]);assert.equal(f.sourceRevision,t.revision);const cancel=f.prepare('all');cancel.next();cancel.return([]);assert.equal(f.building,false);assert.equal(f.sourceRevision,t.revision);
});
test('bounded CPU Globe/Net reconstruction retains exact terrain and reports coherent revisions',()=>{
 const t=make(8);for(const k of t.samples())t.write(k,t.directionAt(k)[1]*8000);const before=words(t),f=field(t);
 for(const mode of['globe','net'] as const)for(const appearance of['relief','elevation'] as const){const steps=sphericalFieldRaster(f.snapshot(),{...INITIAL_SPHERICAL_VIEW,mode},{width:320,height:240},appearance,6000);let yields=0,next=steps.next();while(!next.done){yields++;next=steps.next();}assert.ok(yields>1);assert.ok(next.value.pixels.some(v=>v>0));assert.equal(next.value.revision,t.revision);assert.ok(next.value.columns*next.value.rows<=6000);assert.deepEqual(words(t),before);}
});
