import test from 'node:test';
import assert from 'node:assert/strict';
import {createHollowCubeWorld} from '../terrain/hollow-cube.ts';
import {HollowCubeDocument} from '../editor/hollow-cube-document.ts';
import {encodeHollowCube,decodeHollowCube,validateHollowCube} from './hollow-cube-format.ts';
import {payloadChecksum} from './heightmap-payload.ts';
const config={provider:'physical-hollow-cube' as const,version:1 as const,worldId:'parent',outerSideLengthMeters:1000000,innerSideLengthMeters:800000,surfaces:{exterior:{surfaceId:'out',terrainId:'out-terrain'},interior:{surfaceId:'in',terrainId:'in-terrain'}}};
const fast={yield:async()=>{}};
for(const n of[128,256])test(`H2 v6 N${n} exact two-surface words, parent identities, strict corrupt and size rejection`,async()=>{
 const world=createHollowCubeWorld(config,n),doc=new HollowCubeDocument(world,'Saved hollow');doc.selectedSurface='interior';
 for(const role of ['exterior','interior']as const){const t=world.surfaces[role].referenceTerrain;for(const [i,v]of[[0,-0],[t.sampleCount-1,Math.fround(role==='exterior'?300.125:-99.3)]])t.write(t.keyAt(i!),v!);}
 const saved=await encodeHollowCube(doc,undefined,fast),restored=await decodeHollowCube(saved,fast);assert.equal(saved.formatVersion,6);assert.equal(restored.editor.selectedSurface,'interior');assert.deepEqual(restored.world.configuration,config);
 for(const r of ['exterior','interior']as const)assert.deepEqual(new Uint32Array(restored.editor.sessions[r].terrain.copyElevations().buffer),new Uint32Array(doc.sessions[r].terrain.copyElevations().buffer));
 const damaged=structuredClone(saved),words=new Uint32Array(damaged.elevations);words[12]=words[12]!^1;await assert.rejects(validateHollowCube(damaged,fast),/checksum/);
 await assert.rejects(validateHollowCube({...saved,elevations:new ArrayBuffer(12)},fast),/size/);
 await assert.rejects(validateHollowCube({...saved,formatVersion:5},fast),/format/);
 const unsafe=structuredClone(saved);new DataView(unsafe.elevations).setFloat32(0,-30000,true);const {elevations,checksum,...header}=unsafe;unsafe.checksum=await payloadChecksum(header,elevations);await assert.rejects(decodeHollowCube(unsafe,fast),/reserved shell/);
 restored.editor.dispose();doc.dispose();
});
