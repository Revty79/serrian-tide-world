import test from 'node:test';import assert from 'node:assert/strict';
import {createHollowSphereWorld} from '../terrain/hollow-sphere.ts';
import {prepareHollowSphereDocument} from '../editor/hollow-sphere-document.ts';
import {cutSphereHoleAt} from '../surfaces/hollow-sphere-holes.ts';
import {sphereExcavation} from '../surfaces/hollow-sphere-excavation.ts';
import {sphereCutSampler} from './sphere-excavation-pixels.ts';
import {INITIAL_SPHERICAL_VIEW,recenterSphere} from './spherical-view.ts';
test('spherical cut pixels reveal the actual opposing bank, an open cavity mouth and physical rock walls; reference-only views stay separate',async()=>{
 const world=createHollowSphereWorld({provider:'physical-hollow-sphere',version:1,worldId:'pixels',outerRadiusMeters:1000000,innerRadiusMeters:800000,surfaces:{exterior:{surfaceId:'out',terrainId:'a'},interior:{surfaceId:'in',terrainId:'b'}}},16),t=world.surfaces.interior.terrain;t.write(t.resolve({...t.metadata.identity,patchId:'nx',column:8,row:8}),2000);const{editor}=await prepareHollowSphereDocument(world,'Pixels',false,'exterior',{yield:async()=>{}});
 try{const g=world.surfaces.exterior.geometry,hole=cutSphereHoleAt(world,g.positionsForDirection([1,0,0])[0]!,10000);await editor.changeConnections({...editor.connections,holes:[hole]});const model=sphereExcavation(world,[hole]),outside=editor.surfaces.exterior.cache.elevationField!.snapshot(),inside=editor.surfaces.interior.cache.elevationField!.snapshot(),size={width:320,height:200},out=new Float64Array(4),sample=sphereCutSampler(outside,{model,opposite:inside,role:'exterior'},INITIAL_SPHERICAL_VIEW,size,'elevation')!;assert(sample(160,100,out));assert.deepEqual([...out],[137.25,120,90.75,1]);assert(!sample(200,130,out));assert.equal(sphereCutSampler(inside,{model,opposite:outside,role:'interior'},{...INITIAL_SPHERICAL_VIEW,interior:true},size,'elevation'),undefined);assert.equal(sphereCutSampler(inside,{model,opposite:outside,role:'interior'},{...INITIAL_SPHERICAL_VIEW,mode:'net'},size,'elevation'),undefined);
 const center={...INITIAL_SPHERICAL_VIEW,interior:true,interiorView:'center'as const},cavity=sphereCutSampler(inside,{model,opposite:outside,role:'interior'},center,size,'elevation')!;assert(cavity(160,100,out));assert.equal(out[3],0);const bore=sphereCutSampler(inside,{model,opposite:outside,role:'interior'},{...recenterSphere(center,[0,1,0]),eyeMeters:[900000,0,0]},size,'elevation')!;assert(bore(160,100,out));assert.equal(out[3],1);assert(out[0]!>out[2]!+20);
 }finally{editor.dispose();}
});
