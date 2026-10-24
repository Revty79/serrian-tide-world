import test from 'node:test';
import assert from 'node:assert/strict';
import {createHollowCubeWorld} from '../terrain/hollow-cube.ts';
import {HOLLOW_MATERIAL_CONTRACT,prepareHollowMaterial,materialFaceSample,materialEnvelopeValue,hollowMaterialContains,traceHollowMaterial,traceTerrainExcavation,terrainExcavationFreeBall} from './hollow-cube-material.ts';
import {SOLID_CUBE_FRAMES,SOLID_CUBE_FACES,type CubeVector} from './solid-cube.ts';
const config={provider:'physical-hollow-cube' as const,version:1 as const,worldId:'material',outerSideLengthMeters:1000000,innerSideLengthMeters:800000,surfaces:{exterior:{surfaceId:'out',terrainId:'ot'},interior:{surfaceId:'in',terrainId:'it'}}};
const fill=(world:ReturnType<typeof createHollowCubeWorld>,role:'exterior'|'interior',height:(p:CubeVector)=>number)=>{
 const terrain=world.surfaces[role].referenceTerrain;
 for(const key of terrain.samples())terrain.write(key,height(terrain.referencePositionAt(key)));
};
const near=(a:number,b:number,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} differs from ${b}`);

for(const outside of[-20000,0,50000])for(const inside of[-15000,0,35000])test(`material: all-face displaced levels outside ${outside}, inside ${inside}`,async()=>{
 const world=createHollowCubeWorld(config,8);fill(world,'exterior',()=>outside);fill(world,'interior',()=>inside);
 const before=world.surfaces.exterior.referenceTerrain.copyElevations(),model=await prepareHollowMaterial(world);
 assert.equal(model.contract,HOLLOW_MATERIAL_CONTRACT);near(model.guaranteedGapMeters,100000+outside+inside);
 for(const face of SOLID_CUBE_FACES){
  const frame=SOLID_CUBE_FRAMES[face],o=frame.normal.map(v=>v*1000000) as unknown as CubeVector,d=frame.normal.map(v=>-v) as unknown as CubeVector;
  const outer=traceHollowMaterial(model,o,d)!;assert.equal(outer.role,'exterior');assert.equal(outer.face,face);near(outer.distance,500000-outside);
  const inner=traceHollowMaterial(model,[0,0,0],frame.normal)!;assert.equal(inner.role,'interior');near(inner.distance,400000-inside);
  const cutaway=traceHollowMaterial(model,o,d,true)!;assert.equal(cutaway.role,'interior');near(cutaway.distance,1400000-inside);
  assert(hollowMaterialContains(model,frame.normal.map(v=>v*(450000+(outside-inside)/2)) as unknown as CubeVector));
 }
 assert.deepEqual(world.surfaces.exterior.referenceTerrain.copyElevations(),before);
 assert.equal(model.bytes,2*6*9**2*4);
});

test('material: mountain to seabed and inner mountain use bilinear actual heights and normals',async()=>{
 const world=createHollowCubeWorld(config,8);
 fill(world,'exterior',([x,y,z])=>z>0?30000+x*.04-y*.02:-10000);
 fill(world,'interior',([x,y,z])=>z>0?-12000+x*.01+y*.02:20000);
 const model=await prepareHollowMaterial(world),u=12345,v=-23456;
 const outer=traceHollowMaterial(model,[u,v,900000],[0,0,-1])!,inner=traceHollowMaterial(model,[u,v,0],[0,0,1])!;
 near(outer.point[2],530000+u*.04-v*.02,1e-6);near(inner.point[2],412000-u*.01-v*.02,1e-6);
 near(outer.normal[0]/outer.normal[2],-.04,1e-6);near(outer.normal[1]/outer.normal[2],.02,1e-6);
 const seabed=traceHollowMaterial(model,[u,v,-900000],[0,0,1])!;near(seabed.point[2],-490000);
 const innerMountain=traceHollowMaterial(model,[u,v,0],[0,0,-1])!;near(innerMountain.point[2],-380000);
});

test('material: signed heights at edges/corners form a closed continuous envelope',async()=>{
 const world=createHollowCubeWorld(config,8);
 fill(world,'exterior',([x,y,z])=>10000*(x+y+z)/500000);
 fill(world,'interior',([x,y,z])=>-5000*(x+y+z)/400000);
 const model=await prepareHollowMaterial(world);
 for(const direction of [[1,1,1],[-1,-1,-1],[1,1,.2],[-1,.2,-1],[.2,-1,-1]] as CubeVector[]){
  const length=Math.hypot(...direction),d=direction.map(v=>-v/length) as unknown as CubeVector,o=direction.map(v=>v/length*2000000) as unknown as CubeVector;
  const hit=traceHollowMaterial(model,o,d)!;assert(hit);near(materialEnvelopeValue(model.exterior,hit.point),0,1e-6);
  const delta=1;
  assert(!hollowMaterialContains(model,hit.point.map((v,i)=>v-d[i]!*delta) as unknown as CubeVector));
  assert(hollowMaterialContains(model,hit.point.map((v,i)=>v+d[i]!*delta) as unknown as CubeVector));
 }
});

test('material: arbitrary rays agree with independent occupancy crossing search',async()=>{
 const world=createHollowCubeWorld(config,16);
 fill(world,'exterior',([x,y,z])=>16000*Math.sin(x/80000)*Math.cos(y/90000)+12000*Math.sin(z/70000));
 fill(world,'interior',([x,y,z])=>9000*Math.cos(x/80000)+6000*Math.sin((y+z)/90000));
 const model=await prepareHollowMaterial(world);
 for(let i=0;i<80;i++){
  const o:[number,number,number]=[Math.sin(i*1.7)*300000,Math.cos(i*2.3)*300000,900000],raw:[number,number,number]=[.2*Math.sin(i),.2*Math.cos(i),-1],norm=Math.hypot(...raw),d=raw.map(v=>v/norm) as unknown as CubeVector;
  const point=(t:number)=>o.map((v,k)=>v+d[k]!*t) as unknown as CubeVector;
  let lo=0,hi=0;for(hi=1000;hi<1200000;hi+=1000)if(hollowMaterialContains(model,point(hi)))break;lo=hi-1000;
  for(let k=0;k<45;k++){const mid=(lo+hi)/2;if(hollowMaterialContains(model,point(mid)))hi=mid;else lo=mid;}
  const hit=traceHollowMaterial(model,o,d)!;assert(hit);near(hit.distance,(lo+hi)/2,1e-6);
 }
});

test('material: no uniform extra detail, original samples and clamped edge continuation',async()=>{
 const world=createHollowCubeWorld(config,2);fill(world,'exterior',([x,y])=>x*.01+y*.02);
 const model=await prepareHollowMaterial(world),face=model.exterior.find(f=>f.face==='pz')!;
 near(materialFaceSample(face,1234,5678).height,1234*.01+5678*.02,1e-7);
 near(materialFaceSample(face,600000,700000).height,15000);
 assert.equal(materialFaceSample(face,600000,700000).du,0);
});

test('material: cancelled, stale and intersecting shells reject without authority mutation',async()=>{
 const world=createHollowCubeWorld(config,16),t=world.surfaces.exterior.referenceTerrain,before=t.copyElevations();
 await assert.rejects(prepareHollowMaterial(world,async()=>{},()=>false),/cancelled/);assert.deepEqual(t.copyElevations(),before);
 let changed=false;await assert.rejects(prepareHollowMaterial(world,async()=>{if(!changed){changed=true;t.write(t.keyAt(0),1);}}),/source changed/);
 fill(world,'exterior',()=>-90000);fill(world,'interior',()=>-90000);
 await assert.rejects(prepareHollowMaterial(world),/positive material/);
});

test('material: a small direct cut intersects mountains and inner seabed without a reference-plane cap',async()=>{
 const world=createHollowCubeWorld(config,8);fill(world,'exterior',()=>30000);fill(world,'interior',()=>-10000);
 const model=await prepareHollowMaterial(world),cut={a:[0,0,390000] as CubeVector,b:[0,0,550000] as CubeVector,radius:.5};
 const through=traceTerrainExcavation(model,[cut],[0,0,600000],[0,0,-1])!;assert.equal(through.kind,'interior');near(through.point[2],-410000);
 const wall=traceTerrainExcavation(model,[cut],[0,0,470000],[1,0,0])!;assert.equal(wall.kind,'rock');near(wall.point[0],.5);
 for(let z=390000;z<=550000;z+=100)assert(terrainExcavationFreeBall(model,[cut],[0,0,z],.49));
 assert(!terrainExcavationFreeBall(model,[cut],[0,0,470000],.51));
 assert(!terrainExcavationFreeBall(model,[cut],[1,0,520000],0));
});

test('material: routed capsules join independently elevated endpoints; bends have real connected clearance',async()=>{
 const world=createHollowCubeWorld(config,8);fill(world,'exterior',()=>40000);fill(world,'interior',()=>20000);
 const model=await prepareHollowMaterial(world),route:CubeVector[]=[[0,0,545000],[0,0,460000],[100000,0,460000],[100000,0,375000]],cuts=route.slice(1).map((b,i)=>({a:route[i]!,b,radius:2000}));
 for(const c of cuts)for(let i=0;i<=50;i++)assert(terrainExcavationFreeBall(model,cuts,c.a.map((v,k)=>v+(c.b[k]!-v)*i/50) as unknown as CubeVector,1000));
 assert(!terrainExcavationFreeBall(model,cuts,[50000,10000,460000],1000));
 assert.equal(traceTerrainExcavation(model,cuts,[0,0,550000],[0,0,-1])!.kind,'rock'); // A bend is not a straight line of sight.
});
