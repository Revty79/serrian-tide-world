import test from 'node:test';
import assert from 'node:assert/strict';
import {createHollowCubeWorld} from '../terrain/hollow-cube.ts';
import {HollowCubeDocument,assertHollowElevation} from './hollow-cube-document.ts';
export const testHollow=()=>createHollowCubeWorld({provider:'physical-hollow-cube',version:1,worldId:'world',outerSideLengthMeters:1000000,innerSideLengthMeters:800000,surfaces:{exterior:{surfaceId:'out',terrainId:'out-terrain'},interior:{surfaceId:'in',terrainId:'in-terrain'}}},128);
for(const role of ['exterior','interior'] as const)test(`H1 ${role}: existing four tools, inward chart, independent exact history`,async()=>{
 const world=testHollow(),doc=new HollowCubeDocument(world,'Hollow'),session=doc.sessions[role],surface=world.surfaces[role];
 const publicPoint={...surface.geometry.identity,patchId:'px',u:0,v:10000},point=surface.geometry.toReferenceChart(publicPoint),other=world.surfaces[role==='exterior'?'interior':'exterior'].referenceTerrain;
 const initial=new Uint32Array(session.terrain.copyElevations().buffer);
 for(const tool of ['raise','lower','smooth','flatten'] as const){const settings=tool==='smooth'?{version:1 as const,tool,radiusMeters:40000,intensity:.5}:tool==='flatten'?{version:1 as const,tool,radiusMeters:40000,intensity:.5,targetElevation:400}:{version:1 as const,tool,radiusMeters:40000,strengthMeters:200};
  assert.equal(session.begin(point,settings),true);session.accept({...point,u:15000});session.release();await session.drainForSave();assert.equal(session.error,'');
 }
 assert.notDeepEqual(new Uint32Array(session.terrain.copyElevations().buffer),initial);const edited=session.terrain.copyElevations();
 for(let i=0;i<4;i++)await session.replay();assert.deepEqual(new Uint32Array(session.terrain.copyElevations().buffer),initial);
 for(let i=0;i<4;i++)await session.replay(true);assert.deepEqual(session.terrain.copyElevations(),edited);assert.equal(other.revision,0);doc.dispose();
});
test('H1 bounds reject both unsafe envelopes before publication',()=>{const world=testHollow();for(const role of ['exterior','interior'] as const){assert.throws(()=>assertHollowElevation(world,role,-25001),/reserved shell/);assertHollowElevation(world,role,-25000);}assert.throws(()=>assertHollowElevation(world,'interior',200001));});
