import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSolidCubeTerrain} from '../terrain/solid-cube.ts';
import {encodeSolidCubeHeightmap,decodeSolidCubeHeightmap,validateSolidCubeHeightmap,MAX_SAVED_SOLID_CUBE_BYTES} from './solid-cube-format.ts';
import {payloadChecksum} from './heightmap-payload.ts';
import {decodeMap} from './map-format.ts';
import {createAtlasDocument} from '../editor/atlas-document.ts';
const work={yield:async()=>{}},date='2026-10-21T12:00:00.000Z';
const make=(n=128)=>createSolidCubeTerrain({terrainId:'cube-f-test',cellsPerEdge:n,geometry:{identity:{worldId:'cube-f-world',surfaceId:'exterior'},provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters:1_000_000}});
const bits=(t:ReturnType<typeof make>)=>new Uint32Array(t.copyElevations().buffer);
for(const n of[128,256])test(`v5 N${n}: every canonical word, signed zero, aliases, geometry and continued exact editing`,async()=>{
 const t=make(n),special=[-0,0,-(2**-149),2**-149,-12345.5,3.4028234663852886e38];for(const key of t.samples())t.write(key,special[key.index%special.length]!);
 const saved=await encodeSolidCubeHeightmap(t,' Exact cube ',date,work),loaded=await decodeSolidCubeHeightmap(saved,work);assert.equal(saved.name,'Exact cube');assert.equal(saved.formatVersion,5);assert.ok(saved.elevations.byteLength<=MAX_SAVED_SOLID_CUBE_BYTES);assert.deepEqual(loaded.terrain.metadata,t.metadata);assert.deepEqual(bits(loaded.terrain),bits(t));
 const view=new DataView(saved.elevations),words=bits(t);for(let i=0;i<words.length;i++)assert.equal(view.getUint32(i*4,true),words[i]);
 for(const key of loaded.terrain.samples())if(key.index%97===0)for(const alias of loaded.terrain.aliases(key))assert.ok(Object.is(loaded.terrain.read(loaded.terrain.resolve(alias)),t.read(key)));
 loaded.terrain.write(loaded.terrain.keyAt(0),1200);assert.equal(loaded.terrain.read(loaded.terrain.keyAt(0)),1200);assert.equal(bits(t)[0],0x80000000);
});
test('v5 rejects unknown fields/versions, ownership, dimensions, malformed payload and corruption before replacement',async()=>{
 const source=await encodeSolidCubeHeightmap(make(),'Cube',date,work);
 const changes:((r:any)=>void)[]=[r=>r.format='wrong',r=>r.formatVersion=6,r=>r.elevationEncoding='float32-be',r=>r.id+='foreign',r=>r.name=' ',r=>r.name='x'.repeat(121),r=>r.savedAt='2026-02-30T00:00:00.000Z',r=>r.sampleCount++,r=>r.metadata.identity.worldId='',r=>r.metadata.geometry.identity.worldId+='foreign',r=>r.metadata.geometry.provider='cube-sphere',r=>r.metadata.geometry.version++,r=>r.metadata.geometry.role='interior',r=>r.metadata.geometry.configuration='hollow',r=>r.metadata.geometry.sideLengthMeters=0,r=>r.metadata.geometry.sideLengthMeters=1e10,r=>r.metadata.geometry.sideLengthMeters=Infinity,r=>r.metadata.representation.provider='six-rasters',r=>r.metadata.representation.version++,r=>r.metadata.representation.ownership='per-face',r=>r.metadata.representation.cellsPerEdge=512,r=>r.metadata.representation.cellsPerEdge=64,r=>r.metadata.representation.faces.reverse(),r=>r.metadata.representation.faces.pop(),r=>r.metadata.elevationUnits='feet',r=>r.metadata.seaLevel=-0,r=>r.metadata.extra=1,r=>r.metadata.geometry.camera={},r=>r.extra=1,r=>r.elevations=r.elevations.slice(4),r=>r.elevations=new SharedArrayBuffer(r.elevations.byteLength),r=>r.checksum='x',r=>new DataView(r.elevations).setUint32(0,42,true)];
 for(const change of changes){const r=structuredClone(source);change(r);await assert.rejects(decodeSolidCubeHeightmap(r,work));}await assert.rejects(decodeMap(source));
});
test('v5 covers all accepted header fields with integrity and rejects rehashed NaN/infinities',async()=>{
 const source=await encodeSolidCubeHeightmap(make(),'Cube',date,work);
 for(const change of[(r:any)=>r.name+='x',(r:any)=>r.metadata.geometry.sideLengthMeters++,(r:any)=>r.savedAt='2026-10-21T12:00:01.000Z',(r:any)=>{r.metadata.identity.surfaceId+='x';r.metadata.geometry.identity.surfaceId+='x';}]){const r=structuredClone(source);change(r);await assert.rejects(validateSolidCubeHeightmap(r,work),/checksum/);}
 for(const word of[0x7fc00000,0x7f800000,0xff800000]){const r=structuredClone(source);new DataView(r.elevations).setUint32(0,word,true);const{elevations,checksum:_checksum,...header}=r;r.checksum=await payloadChecksum(header,elevations);await assert.rejects(validateSolidCubeHeightmap(r,work),/finite/);}
});
test('v5 snapshots validation input before yield; encode detects source changes; cancellation preserves authority',async()=>{
 const t=make(),source=await encodeSolidCubeHeightmap(t,'Cube',date,work),copy=structuredClone(source),before=bits(t);
 const loaded=await decodeSolidCubeHeightmap(copy,{yield:async()=>{new DataView(copy.elevations).setFloat32(0,500,true);(copy.metadata.identity as {worldId:string}).worldId='mutated';}});assert.deepEqual(bits(loaded.terrain),before);
 let changed=false;await assert.rejects(encodeSolidCubeHeightmap(t,'Cube',date,{yield:async()=>{if(!changed){changed=true;t.write(t.keyAt(0),42);}}}),/changed while saving/);
 const current=bits(t);await assert.rejects(encodeSolidCubeHeightmap(t,'Cube',date,{yield:async()=>{throw Error('cancelled');}}),/cancelled/);assert.deepEqual(bits(t),current);
});
test('cube World creation has explicit dimensions, new identities and clean saved editor reinitialization',async()=>{
 for(const sideLengthMeters of[undefined,0,1e10])await assert.rejects(createAtlasDocument({shape:'cube',name:'Cube',radiusMeters:0,cellsPerEdge:128,sideLengthMeters},work));
 const a=await createAtlasDocument({shape:'cube',name:' Cube ',radiusMeters:0,cellsPerEdge:128,sideLengthMeters:1000},work),b=await createAtlasDocument({shape:'cube',name:'Cube',radiusMeters:0,cellsPerEdge:256,sideLengthMeters:2000},work);
 assert.equal(a.kind,'cube');assert.equal(b.kind,'cube');if(a.kind==='cube'&&b.kind==='cube'){assert.notEqual(a.terrain.metadata.identity.worldId,b.terrain.metadata.identity.worldId);assert.equal(a.editor.hasSaved,false);assert.equal(a.editor.modified,false);assert.equal(a.editor.history.statistics.entries,0);assert.ok([...a.terrain.copyElevations()].every(v=>v===-100));a.editor.dispose();b.editor.dispose();}
});
