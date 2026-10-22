import test from 'node:test';import assert from 'node:assert/strict';
import {createAtlasDocument,type WorldSetup} from './atlas-document.ts';
import {hollowStartingElevation} from '../terrain/initial-elevation.ts';
const setup={name:'Initial terrain',radiusMeters:1000000,innerRadiusMeters:800000,lengthMeters:1600000,innerLengthMeters:1200000,cylinderDetail:128 as const,cellsPerEdge:128 as const,sideLengthMeters:1000000,innerSideLengthMeters:800000};
for(const shape of['hollow-sphere','hollow-cylinder','hollow-cube']as const)for(const terrainStart of[undefined,'reference-shell']as const)test(`${shape}: new ocean default and explicit reference shell initialize two independent banks without history`,async()=>{
 const doc=await createAtlasDocument({...setup,shape,terrainStart},{yield:async()=>{}});
 if(doc.kind!=='hollow-cube'&&doc.kind!=='hollow-cylinder'&&doc.kind!=='hollow-sphere')throw Error('Wrong World');
 try{const terrains=doc.kind==='hollow-cube'?[doc.editor.world.surfaces.exterior.referenceTerrain,doc.editor.world.surfaces.interior.referenceTerrain]:[doc.editor.world.surfaces.exterior.terrain,doc.editor.world.surfaces.interior.terrain];assert.notEqual(terrains[0],terrains[1]);for(const terrain of terrains){assert(terrain.copyElevations().every(h=>Object.is(h,terrainStart==='reference-shell'?0:-100)));assert.equal(terrain.revision,0);}assert.equal(doc.editor.modified,false);assert.deepEqual(doc.editor.connections,{holes:[],passages:[],links:[]});}finally{doc.editor.dispose();}
});
test('ocean initialization rejects unsupported thin shells and unknown starts rather than clamping source data',async()=>{
 assert.equal(hollowStartingElevation(undefined,400),-100);assert.equal(hollowStartingElevation('reference-shell',.001),0);assert.throws(()=>hollowStartingElevation(undefined,399.9),/400 m/);assert.throws(()=>hollowStartingElevation('invalid' as 'ocean',1000),/Choose/);
 await assert.rejects(createAtlasDocument({...setup,shape:'hollow-sphere',innerRadiusMeters:999950}as WorldSetup),/400 m/);
});
