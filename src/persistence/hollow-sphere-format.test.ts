import test from 'node:test';
import assert from 'node:assert/strict';
import {createHollowSphereWorld} from '../terrain/hollow-sphere.ts';
import {prepareHollowSphereDocument} from '../editor/hollow-sphere-document.ts';
import {encodeHollowSphere,decodeHollowSphere,validateHollowSphere} from './hollow-sphere-format.ts';
import {payloadChecksum} from './heightmap-payload.ts';
import {cutSphereHoleAt,resizeSphereHole} from '../surfaces/hollow-sphere-holes.ts';
const config={provider:'physical-hollow-sphere' as const,version:1 as const,worldId:'parent',outerRadiusMeters:1000000,innerRadiusMeters:800000,surfaces:{exterior:{surfaceId:'outside',terrainId:'out-words'},interior:{surfaceId:'inside',terrainId:'in-words'}}};
const fast={yield:async()=>{}},words=(a:Float32Array)=>new Uint32Array(a.buffer,a.byteOffset,a.length);
for(const n of[128,256])test(`hollow sphere v8 N${n}: strict parent/roles and exact words survive guarded two-bank Save/Open`,async()=>{
 const w=createHollowSphereWorld(config,n),{editor}=await prepareHollowSphereDocument(w,'Hollow planet',false,'interior',fast);
 try{
  for(const[r,role]of(['exterior','interior']as const).entries()){const t=w.surfaces[role].terrain;t.write(t.keyAt(0),-0);t.write(t.keyAt(14),r?1234.125:-999.125);t.write(t.keyAt(t.sampleCount-1),r?999.375:3000.125);}
  const saved=await encodeHollowSphere(editor,undefined,fast),restored=await decodeHollowSphere(saved,fast);
  try{assert.equal(saved.formatVersion,8);assert.equal(restored.editor.selectedSurface,'interior');assert.deepEqual(restored.editor.world.configuration,config);assert.equal(restored.editor.modified,false);for(const r of['exterior','interior']as const)assert.deepEqual(words(restored.editor.surfaces[r].terrain.copyElevations()),words(editor.surfaces[r].terrain.copyElevations()));assert.equal(saved.elevations.byteLength,2*(6*n*n+2)*4);}finally{restored.editor.dispose();}
  const damaged=structuredClone(saved),damagedWords=new Uint32Array(damaged.elevations);damagedWords[14]=damagedWords[14]!^1;await assert.rejects(validateHollowSphere(damaged,fast),/integrity/);
  for(const bad of[{...saved,formatVersion:3},{...saved,elevations:new ArrayBuffer(4)},{...saved,extra:true},{...saved,selectedSurface:'foreign'},{...saved,metadata:{...saved.metadata,orientation:'outward'}},{...saved,metadata:{...saved.metadata,cellsPerEdge:512}}])await assert.rejects(validateHollowSphere(bad,fast));
  const unsafe=structuredClone(saved);new DataView(unsafe.elevations).setFloat32(0,-60000,true);const{elevations,checksum,...header}=unsafe;unsafe.checksum=await payloadChecksum(header,elevations);await assert.rejects(decodeHollowSphere(unsafe,fast),/shell/);
  const copy=structuredClone(saved);let mutated=false;const checked=await validateHollowSphere(copy,{yield:async()=>{if(!mutated){mutated=true;new DataView(copy.elevations).setFloat32(0,Infinity,true);Reflect.set(copy.metadata.configuration.surfaces.exterior,'surfaceId','mutated');}}});assert.equal(new DataView(checked.elevations).getFloat32(0,true),-0);assert.equal(checked.metadata.configuration.surfaces.exterior.surfaceId,'outside');
 }finally{editor.dispose();}
});
test('hollow sphere v9: off-axis physical holes, exact identities and connection Undo/Redo survive Save/Open; unsafe support rejects before promotion',async()=>{
 const world=createHollowSphereWorld(config,128),{editor}=await prepareHollowSphereDocument(world,'Radial',false,'exterior',fast),g=world.surfaces.exterior.geometry,hole=cutSphereHoleAt(world,g.positionsForDirection([.93,.27,.1])[0]!,10000);
 try{await editor.changeConnections({...editor.connections,holes:[hole]});const resized=resizeSphereHole(world,hole,15000);await editor.changeConnections({...editor.connections,holes:[resized]});const saved=await encodeHollowSphere(editor,undefined,fast);assert.equal(saved.formatVersion,9);const restored=await decodeHollowSphere(saved,fast);try{assert.deepEqual(restored.editor.connections,editor.connections);assert.equal(restored.editor.modified,false);await restored.editor.replay();assert.deepEqual(restored.editor.connections.holes,[hole]);await restored.editor.replay(true);assert.deepEqual(restored.editor.connections.holes,[resized]);for(const role of['exterior','interior']as const)assert.deepEqual(words(restored.editor.surfaces[role].terrain.copyElevations()),words(editor.surfaces[role].terrain.copyElevations()));}finally{restored.editor.dispose();}
 const bad=structuredClone(saved),t=world.surfaces.exterior.terrain,ref=world.surfaces.exterior.geometry.toReferenceChart(resized.mouths[0]!.position),key=t.resolve({...ref,column:Math.round((ref.u/(Math.PI/4)+1)*64),row:Math.round((ref.v/(Math.PI/4)+1)*64)});new DataView(bad.elevations).setFloat32(key.index*4,1,true);const{elevations,checksum,...header}=bad;bad.checksum=await payloadChecksum(header,elevations);await assert.rejects(decodeHollowSphere(bad,fast),/level ground/);
 const tampered=structuredClone(saved);Reflect.set(tampered.connections!.holes[0]!.mouths[0]!,'id','changed-mouth');await assert.rejects(validateHollowSphere(tampered,fast));
 }finally{editor.dispose();}
});
