import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHollowCubeSurfaceGeometry,hollowCubeDimensions,hollowCubeConfiguration,type HollowCubeConfiguration} from './hollow-cube.ts';
import {createSolidCubeGeometry,SOLID_CUBE_FACES,SOLID_CUBE_CORNERS,SOLID_CUBE_FRAMES,cubeDot,type CubeVector} from './solid-cube.ts';
import {createHollowCubeWorld,assessHollowCubeClearance} from '../terrain/hollow-cube.ts';
import {CubeEditorSession} from '../editor/cube-editor-session.ts';
const config:HollowCubeConfiguration={provider:'physical-hollow-cube',version:1,worldId:'hollow-tests',outerSideLengthMeters:1000,innerSideLengthMeters:800,surfaces:{exterior:{surfaceId:'outside',terrainId:'outside-terrain'},interior:{surfaceId:'inside',terrainId:'inside-terrain'}}};
const cross=(a:CubeVector,b:CubeVector)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

test('hollow dimensions validate cavity, shell, precision and independent immutable identities without relaxing solid v1',()=>{
 assert.equal(hollowCubeDimensions(config).nominalWallThicknessMeters,100);assert.equal(hollowCubeDimensions(config).cavityVolumeMeters3,512000000);assert.equal(hollowCubeDimensions(config).referenceShellVolumeMeters3,488000000);
 for(const [outer,inner]of [[0,0],[1,1],[1,2],[1,-1],[Infinity,1],[1,NaN],[1e200,1e199],[1e-200,1e-201],[Number.MIN_VALUE,Number.MIN_VALUE/2]])assert.throws(()=>hollowCubeDimensions({outerSideLengthMeters:outer!,innerSideLengthMeters:inner!}));
 assert.throws(()=>hollowCubeConfiguration({...config,surfaces:{...config.surfaces,interior:{...config.surfaces.interior,surfaceId:'outside'}}}));
 assert.throws(()=>hollowCubeConfiguration({...config,surfaces:{...config.surfaces,interior:{...config.surfaces.interior,terrainId:'outside-terrain'}}}));
 const g=createHollowCubeSurfaceGeometry(config,'interior');assert.equal(g.metadata.role,'interior');assert.equal(g.kernelConfiguration.role,'exterior');assert.throws(()=>createSolidCubeGeometry({...g.kernelConfiguration,role:'interior'} as never));
 const original=config.surfaces.interior.surfaceId;const snapshot=hollowCubeConfiguration(config);assert.notEqual(snapshot.surfaces,config.surfaces);assert.equal(snapshot.surfaces.interior.surfaceId,original);
});

for(const role of ['exterior','interior'] as const)test(`${role}: six oriented charts, all 12 reciprocal edges, eight shared corners and correct signed elevation`,()=>{
 const g=createHollowCubeSurfaceGeometry(config,role),half=g.metadata.sideLengthMeters/2,orientation=role==='interior'?-1:1;
 for(const face of SOLID_CUBE_FACES){const f=g.frame(face),p={...g.identity,patchId:face,u:17,v:-29};assert.deepEqual(cross(f.u,f.v).map(v=>v||0),f.normal.map(v=>v||0));assert.equal(cubeDot(f.normal,SOLID_CUBE_FRAMES[face].normal),orientation);
  assert.deepEqual(g.fromReferenceChart(g.toReferenceChart(p)),p);const q=g.referencePosition(p),e=g.elevatedPosition(p,12),l=g.elevatedPosition(p,-12);assert.ok(Math.abs(cubeDot(e,f.normal)-cubeDot(q,f.normal)-12)<1e-12);assert.ok(Math.abs(cubeDot(l,f.normal)-cubeDot(q,f.normal)+12)<1e-12);
 }
 assert.equal(g.connections.length,24);assert.equal(new Set(g.connections.map(c=>c.edgeId)).size,12);
 for(const c of g.connections){const p={...g.identity,patchId:c.face,u:c.edge.startsWith('u')?(c.edge.endsWith('min')?-half:half):17,v:c.edge.startsWith('v')?(c.edge.endsWith('min')?-half:half):17},t=g.crossEdge(p,c.edge),back=g.crossEdge(t.position,c.toEdge);assert.deepEqual(g.referencePosition(t.position),g.referencePosition(p));assert.deepEqual(back.position,p);assert.equal(t.position.surfaceId,g.identity.surfaceId);assert.ok(t.transport.uu*t.transport.vv-t.transport.uv*t.transport.vu===1);}
 for(const c of SOLID_CUBE_CORNERS){const q=c.signs.map(s=>s*half) as unknown as CubeVector,aliases=g.positionsForReference(q);assert.equal(aliases.length,3);for(const a of aliases){assert.deepEqual(g.referencePosition(a),q);assert.equal(g.aliases(a).length,3);}}
 assert.throws(()=>g.normalize({...g.identity,surfaceId:'other',patchId:'pz',u:0,v:0}));
});

test('independent canonical owners include every face/edge/corner, with oriented row aliases and no cross-surface key ownership',()=>{
 const world=createHollowCubeWorld(config,8);assert.equal(world.definition.shape.kind,'hollow-cube');assert.equal(world.elevationByteLength,2*(6*8*8+2)*4);
 for(const s of Object.values(world.surfaces)){const seen=new Set<number>();for(const face of SOLID_CUBE_FACES)for(let row=0;row<=8;row++)for(let column=0;column<=8;column++){
  const a={...s.geometry.identity,patchId:face,column,row},key=s.resolve(a);seen.add(key.index);for(const alias of s.aliases(key)){assert.equal(s.resolve(alias).index,key.index);assert.deepEqual(s.geometry.referencePosition(s.positionAt(alias)),s.referenceTerrain.referencePositionAt(key));}
 }assert.equal(seen.size,s.referenceTerrain.sampleCount);assert.equal(s.referenceTerrain.revision,0);}
 const a=world.surfaces.exterior.referenceTerrain,b=world.surfaces.interior.referenceTerrain;assert.throws(()=>b.read(a.keyAt(0)));assert.throws(()=>a.write(b.keyAt(0),123));a.write(a.keyAt(0),123);assert.equal(b.read(b.keyAt(0)),0);b.write(b.keyAt(0),-0);assert.equal(a.read(a.keyAt(0)),123);assert.equal(a.revision,1);assert.equal(b.revision,1);assert.throws(()=>world.select({worldId:'foreign',surfaceId:'inside'}));
});

test('both selected surfaces use the accepted bounded-phase engine, brushes and separate exact histories',async()=>{
 const world=createHollowCubeWorld(config,16),sessions=Object.values(world.surfaces).map(s=>new CubeEditorSession(s.referenceTerrain,s.role));
 for(const [i,s]of Object.values(world.surfaces).entries()){const editor=sessions[i]!,other=sessions[1-i]!,before=new Uint32Array(editor.terrain.copyElevations().buffer),otherBefore=new Uint32Array(other.terrain.copyElevations().buffer);
  const point=(face:string,u=0,v=0)=>s.geometry.toReferenceChart({...s.geometry.identity,patchId:face,u,v});
  assert.equal(editor.begin(point('pz',80,20),{version:1,tool:'raise',radiusMeters:160,strengthMeters:200}),true);editor.accept(point('px',-40,50));editor.release();await editor.drainForSave();assert.equal(editor.core.lastStroke?.status,'complete');assert.equal(editor.snapshot().placement,'bounded-phase');assert.equal(editor.history.operations.length,1);const after=new Uint32Array(editor.terrain.copyElevations().buffer);assert.notDeepEqual(after,before);assert.deepEqual(new Uint32Array(other.terrain.copyElevations().buffer),otherBefore);await editor.replay();assert.deepEqual(new Uint32Array(editor.terrain.copyElevations().buffer),before);await editor.replay(true);assert.deepEqual(new Uint32Array(editor.terrain.copyElevations().buffer),after);
 }for(const s of sessions)s.dispose();
});

test('all four existing brushes replay exact words on all six charts of each surface without touching the other authority',async()=>{
 const world=createHollowCubeWorld(config,16);for(const role of ['exterior','interior'] as const){const s=world.surfaces[role],other=world.surfaces[role==='exterior'?'interior':'exterior'].referenceTerrain,untouched=new Uint32Array(other.copyElevations().buffer),session=new CubeEditorSession(s.referenceTerrain,role);
  for(const face of SOLID_CUBE_FACES)for(const tool of ['raise','lower','smooth','flatten'] as const){const before=new Uint32Array(session.terrain.copyElevations().buffer),point=s.geometry.toReferenceChart({...s.geometry.identity,patchId:face,u:0,v:0}),settings=tool==='raise'||tool==='lower'?{version:1 as const,tool,radiusMeters:100,strengthMeters:tool==='raise'?20:5}:tool==='smooth'?{version:1 as const,tool,radiusMeters:100,intensity:.5}:{version:1 as const,tool,radiusMeters:100,intensity:.5,targetElevation:3};assert.equal(session.begin(point,settings),true);session.release();await session.drainForSave();const after=new Uint32Array(session.terrain.copyElevations().buffer);assert.notDeepEqual(after,before);await session.replay();assert.deepEqual(new Uint32Array(session.terrain.copyElevations().buffer),before);await session.replay(true);assert.deepEqual(new Uint32Array(session.terrain.copyElevations().buffer),after);assert.deepEqual(new Uint32Array(other.copyElevations().buffer),untouched);}
  session.dispose();
 }
});

test('reference clearance screens combined lowering, cavity collapse and foreign proposals without writes or collision overclaims',async()=>{
 const w=createHollowCubeWorld(config,4),yieldWork=()=>Promise.resolve();let check=await assessHollowCubeClearance(w,undefined,yieldWork);assert.equal(check.conservativeFaceGapMeters,100);assert.equal(check.volumetricCollisionCertified,false);
 w.surfaces.exterior.referenceTerrain.write(w.surfaces.exterior.referenceTerrain.keyAt(0),-60);const t=w.surfaces.interior.referenceTerrain,revision=t.revision;
 check=await assessHollowCubeClearance(w,{role:'interior',changes:[{key:t.keyAt(0),elevation:-40}]},yieldWork);assert.equal(check.status,'unsafe-reference-envelope');assert.equal(t.revision,revision);assert.equal(t.read(t.keyAt(0)),0);
 check=await assessHollowCubeClearance(w,{role:'interior',changes:[{key:t.keyAt(0),elevation:400}]},yieldWork);assert.match(check.issues.join(' '),/cavity/);
 await assert.rejects(assessHollowCubeClearance(w,{role:'interior',changes:[{key:w.surfaces.exterior.referenceTerrain.keyAt(0),elevation:1}]},yieldWork));
 const large=createHollowCubeWorld(config,32),changed=large.surfaces.interior.referenceTerrain;await assert.rejects(assessHollowCubeClearance(large,undefined,async()=>{changed.write(changed.keyAt(1),changed.read(changed.keyAt(1))+1);}));
});
