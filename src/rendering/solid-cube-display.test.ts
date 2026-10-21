import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSolidCubeTerrain} from '../terrain/solid-cube.ts';
import {SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,SOLID_CUBE_PHYSICAL_EDGES,SOLID_CUBE_CORNERS,cubeDot,type CubeVector} from '../surfaces/solid-cube.ts';
import {cubeCamera,cubeLayout,cubeRayHit,cubeNetHit,projectCube,rotateCube} from './solid-cube-view.ts';
import {assertCubeDisplayField,prepareCubeDisplayField,cubeDisplaySample,cubeNeighborAddress,cubeDisplayColor,createCubeDemonstration,CUBE_DISPLAY_LIMITS} from './solid-cube-field.ts';

const identity={worldId:'cube-display-check',surfaceId:'exterior'},make=(n=8)=>createSolidCubeTerrain({terrainId:'cube-display-check',cellsPerEdge:n,geometry:{identity,provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters:1024}});
const close=(a:number,b:number,e=1e-10)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
const world=(face:typeof SOLID_CUBE_FACES[number],u:number,v:number)=>{const f=SOLID_CUBE_FRAMES[face];return f.normal.map((q,i)=>q+u*f.u[i]!+v*f.v[i]!) as unknown as CubeVector;};
for(const face of SOLID_CUBE_FACES)test(`physical cube ${face}: every front projection reconstructs the actual reference plane`,()=>{
 const camera=cubeCamera(SOLID_CUBE_FRAMES[face].normal),size={width:721,height:483},layout=cubeLayout(camera,'physical',size);
 for(const [u,v]of[[-.8,-.6],[0,0],[.2,.73],[.81,-.23]] as const){const p=projectCube(face,u,v,camera,'physical',size),hit=cubeRayHit((p.x-layout.x)/layout.scale,(layout.y-p.y)/layout.scale,camera)!;assert.equal(hit.face,face);close(hit.u,u);close(hit.v,v);}
});
for(const edge of SOLID_CUBE_PHYSICAL_EDGES)test(`physical cube edge ${edge.edgeId}: both charts project to one line and use actual connected stencil samples`,()=>{
 const terrain=make(),camera=cubeCamera(SOLID_CUBE_FRAMES[edge.face].normal.map((q,i)=>q+SOLID_CUBE_FRAMES[edge.toFace].normal[i]!) as unknown as CubeVector),size={width:800,height:600};
 for(const k of[0,2,4,6,8]){const a={...identity,patchId:edge.face,column:edge.edge.startsWith('u')?(edge.edge.endsWith('min')?0:8):k,row:edge.edge.startsWith('v')?(edge.edge.endsWith('min')?0:8):k};
  const b=terrain.crossEdge(a,edge.edge).address,key=terrain.resolve(a),neighbors=new Set(terrain.neighbors(key).map(q=>q.index));assert.equal(terrain.resolve(b).index,key.index);
  const pa=terrain.positionAt(a),pb=terrain.positionAt(b),x=projectCube(a.patchId,pa.u/512,pa.v/512,camera,'physical',size),y=projectCube(b.patchId,pb.u/512,pb.v/512,camera,'physical',size);close(x.x,y.x);close(x.y,y.y);
  for(const [dc,dr]of[[1,0],[-1,0],[0,1],[0,-1]]){const q=cubeNeighborAddress(a.patchId,a.column,a.row,dc!,dr!,8);assert.ok(neighbors.has(terrain.resolve({...identity,patchId:q.face,column:q.column,row:q.row}).index));}
 }
});
for(const corner of SOLID_CUBE_CORNERS)test(`physical cube corner ${corner.cornerId}: three faces share a visible point, never a rounded normal`,()=>{
 const terrain=make(),camera=cubeCamera(corner.signs),hit=cubeRayHit(0,0,camera)!,p=world(hit.face,hit.u,hit.v);p.forEach((q,i)=>close(q,corner.signs[i]!));assert.ok(corner.faces.includes(hit.face));
 const key=terrain.resolve({...identity,patchId:hit.face,column:Math.round((hit.u+1)*4),row:Math.round((hit.v+1)*4)});assert.equal(terrain.aliases(key).length,3);assert.equal(terrain.neighbors(key).length,3);
 for(const face of corner.faces){assert.equal(SOLID_CUBE_FRAMES[face].normal.filter(q=>q!==0).length,1);}
});
test('connected cube net folds back to the accepted five edge joins, with reversible face orientations',()=>{
 const terrain=make(),camera=cubeCamera(),size={width:1200,height:900},l=cubeLayout(camera,'net',size);
 const joins=[['pz','u-min'],['pz','u-max'],['pz','v-min'],['pz','v-max'],['px','v-min']] as const;
 for(const [face,edge]of joins)for(const t of[-1,-.4,0,.6,1]){
  const p={...identity,patchId:face,u:edge.startsWith('u')?(edge.endsWith('min')?-512:512):t*512,v:edge.startsWith('v')?(edge.endsWith('min')?-512:512):t*512},q=terrain.geometry.crossEdge(p,edge).position;
  const a=projectCube(p.patchId,p.u/512,p.v/512,camera,'net',size),b=projectCube(q.patchId,q.u/512,q.v/512,camera,'net',size);close(a.x,b.x);close(a.y,b.y);
 }
 for(const face of SOLID_CUBE_FACES)for(const [u,v]of[[-.7,.4],[.3,-.6],[0,0]] as const){const p=projectCube(face,u,v,camera,'net',size),hit=cubeNetHit((p.x-l.x)/l.scale+.5,(l.y-p.y)/l.scale)!;assert.equal(hit.face,face);close(hit.u,u);close(hit.v,v);}
 assert.equal(cubeNetHit(-1,1),undefined);
});
test('rotation, recenter and zoom preserve a finite orthonormal frame and true aspect ratio',()=>{
 let camera=cubeCamera();for(let i=0;i<1000;i++)camera=rotateCube(camera,.013,-.007);
 close(cubeDot(camera.right,camera.up),0);close(cubeDot(camera.up,camera.forward),0);for(const vector of[camera.right,camera.up,camera.forward])close(Math.hypot(...vector),1);
 for(const size of[{width:1440,height:900},{width:412,height:550},{width:900,height:900},{width:3440,height:1440}]){const l=cubeLayout(cubeCamera([0,0,1]),'physical',size),a=projectCube('pz',-1,-1,cubeCamera([0,0,1]),'physical',size),b=projectCube('pz',1,1,cubeCamera([0,0,1]),'physical',size);close(Math.abs(b.x-a.x),Math.abs(b.y-a.y));assert.ok(l.scale>0);}
 assert.throws(()=>cubeCamera([0,0,0]));assert.throws(()=>rotateCube(camera,Infinity,0));assert.throws(()=>cubeLayout(camera,'net',{width:0,height:1}));
});
test('elevation preparation independently matches affine physical gradients, folded edges and shared corner heights',async()=>{
 const terrain=make(),coeff:CubeVector=[2,-3,1];for(const key of terrain.samples())terrain.write(key,cubeDot(coeff,terrain.referencePositionAt(key)));
 const before=terrain.copyElevations(),revision=terrain.revision,field=await prepareCubeDisplayField(terrain);
 for(const face of SOLID_CUBE_FACES)for(const [u,v]of[[-.5,-.5],[0,0],[.5,.5]] as const){const s=cubeDisplaySample(field,face,u,v),f=SOLID_CUBE_FRAMES[face];close(s.height,cubeDot(coeff,world(face,u,v))*512);close(s.du,cubeDot(coeff,f.u));close(s.dv,cubeDot(coeff,f.v));}
 for(const edge of SOLID_CUBE_PHYSICAL_EDGES)for(const t of[-.5,0,.5]){const p={...identity,patchId:edge.face,u:edge.edge.startsWith('u')?(edge.edge.endsWith('min')?-512:512):t*512,v:edge.edge.startsWith('v')?(edge.edge.endsWith('min')?-512:512):t*512},q=terrain.geometry.crossEdge(p,edge.edge),a=cubeDisplaySample(field,p.patchId,p.u/512,p.v/512),b=cubeDisplaySample(field,q.position.patchId,q.position.u/512,q.position.v/512);close(a.height,b.height);close(b.du,q.transport.uu*a.du+q.transport.uv*a.dv);close(b.dv,q.transport.vu*a.du+q.transport.vv*a.dv);}
 for(const corner of SOLID_CUBE_CORNERS){const expected=cubeDot(coeff,corner.signs)*512;for(const face of corner.faces){const f=SOLID_CUBE_FRAMES[face],s=cubeDisplaySample(field,face,cubeDot(corner.signs,f.u),cubeDot(corner.signs,f.v));close(s.height,expected);assert.ok([s.du,s.dv].every(Number.isFinite));}}
 assert.deepEqual(new Uint32Array(terrain.copyElevations().buffer),new Uint32Array(before.buffer));assert.equal(terrain.revision,revision);
});
for(const n of[128,256] as const)test(`N${n}: coarse/full views retain every canonical word/revision and all boundary ownership`,async()=>{
 const terrain=await createCubeDemonstration(n),before=terrain.copyElevations(),revision=terrain.revision,coarse=await prepareCubeDisplayField(terrain,16),full=await prepareCubeDisplayField(terrain);
 assert.ok(full.bytes<=CUBE_DISPLAY_LIMITS.maxFieldBytes);assert.equal(full.bytes,6*(n+1)**2*16);
 for(const face of SOLID_CUBE_FACES)for(const c of[0,n/2,n])for(const r of[0,n/2,n]){const h=terrain.read(terrain.resolve({...terrain.metadata.identity,patchId:face,column:c,row:r}));close(cubeDisplaySample(full,face,2*c/n-1,2*r/n-1).height,h);close(cubeDisplaySample(coarse,face,2*c/n-1,2*r/n-1).height,h);}
 assert.deepEqual(new Uint32Array(terrain.copyElevations().buffer),new Uint32Array(before.buffer));assert.equal(terrain.revision,revision);
 assert.ok(before.some(v=>v<0)&&before.some(v=>v>3000));
});
test('sea-level classification follows numerical interpolation; signed zero remains in the authority',async()=>{
 const terrain=make(2);for(const key of terrain.samples()){const p=terrain.referencePositionAt(key);terrain.write(key,p[0]/5);}
 const key=terrain.keyAt(0);terrain.write(key,-0);const before=terrain.copyElevations(),revision=terrain.revision,field=await prepareCubeDisplayField(terrain);
 for(const u of[-.9,-.1,0,.1,.9])close(cubeDisplaySample(field,'pz',u,0).height,u*512/5,1e-5);
 assert.notDeepEqual(cubeDisplayColor('pz',-1,0,0),cubeDisplayColor('pz',1,0,0));assert.deepEqual(cubeDisplayColor('pz',-0,0,0),cubeDisplayColor('pz',0,0,0));
 assert.deepEqual(new Uint32Array(terrain.copyElevations().buffer),new Uint32Array(before.buffer));assert.ok(Object.is(terrain.read(key),-0));assert.equal(terrain.revision,revision);
});
test('source mutation or disposal during preparation rejects the obsolete display epoch',async()=>{
 const terrain=make();let yielded=0;const revision=terrain.revision;
 await assert.rejects(prepareCubeDisplayField(terrain,8,async()=>{if(++yielded===1)terrain.write(terrain.keyAt(0),3);}),/source changed/);assert.equal(terrain.revision,revision+1);
 await assert.rejects(prepareCubeDisplayField(terrain,8,async()=>{},()=>false),/disposed/);
 await assert.rejects(prepareCubeDisplayField(terrain,3),/divide/);
});
test('renderer payload bounds reject malformed and oversized fields before display allocations',async()=>{const field=await prepareCubeDisplayField(make(2));assert.doesNotThrow(()=>assertCubeDisplayField(field));for(const value of[{...field,n:257},{...field,data:new Float32Array(1)},{...field,sourceRevision:-1},{...field,bytes:1}])assert.throws(()=>assertCubeDisplayField(value));});
test('unrepresentable display gradients fail explicitly while preserving all canonical words',async()=>{const terrain=createSolidCubeTerrain({terrainId:'tiny-display',cellsPerEdge:2,geometry:{identity,provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters:1e-100}});for(const key of terrain.samples())terrain.write(key,key.index%2?100:-100);const before=terrain.copyElevations(),revision=terrain.revision;await assert.rejects(prepareCubeDisplayField(terrain),/Float32 rendering range/);assert.deepEqual(terrain.copyElevations(),before);assert.equal(terrain.revision,revision);});
