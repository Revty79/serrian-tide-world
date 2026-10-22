import test from 'node:test';import assert from 'node:assert/strict';
import {createOpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import {elevationToColor} from './elevation-colors.ts';
import {initialOpenCylinderView,openCylinderViewAdapter,openCylinderReferenceModel,type OpenCylinderView} from './open-cylinder-view.ts';
import {OpenCylinderDisplayCache,openCylinderRasterSteps,openCylinderVisibilityGuard} from './open-cylinder-raster.ts';
const configuration={identity:{worldId:'open-view',surfaceId:'boundary'},provider:'physical-open-cylinder' as const,version:1 as const,configuration:'both-open' as const,outerRadiusMeters:1000000,innerRadiusMeters:500000,lengthMeters:1600000},size={width:320,height:240},resolution={angularSamples:64,axialCells:32,radialCells:16};
const make=()=>createOpenCylinderTerrain({terrainId:'source',geometry:configuration,resolution,initialElevation:-100}),axis={right:[1,0,0]as const,up:[0,1,0]as const,forward:[0,0,1]as const},side={right:[0,1,0]as const,up:[0,0,1]as const,forward:[1,0,0]as const};
function raster(t:ReturnType<typeof make>,view:OpenCylinderView){const cache=new OpenCylinderDisplayCache(t);const prepare=cache.prepare();while(!prepare.next().done){}const steps=openCylinderRasterSteps(cache,view,size,size.width*size.height,undefined,'relief');let next;do{next=steps.next();}while(!next.done);cache.dispose();return next.value;}
function pixel(r:ReturnType<typeof raster>,x:number,y:number){const at=(Math.max(0,Math.min(r.rows-1,Math.floor(y)))*r.columns+Math.max(0,Math.min(r.columns-1,Math.floor(x))))*4;return[...r.pixels.subarray(at,at+4)];}
test('natural axial openings remain empty in actual output pixels for Outside, fitted Inside and immersive inspection',()=>{
 const t=make(),before=t.copyElevations();for(const scope of['exterior','interior']as const){const view={...initialOpenCylinderView(scope),frame:axis},adapter=openCylinderViewAdapter(t.geometry,view,size),result=raster(t,view);assert.equal(adapter.rayAt(0,0),undefined);assert.equal(pixel(result,160,120)[3],0);assert.deepEqual(pixel(result,160+.75*adapter.layout.scale,120),[...elevationToColor(-100,0),255]);}
 const immersive={...initialOpenCylinderView('interior'),frame:axis,interiorView:'center' as const},adapter=openCylinderViewAdapter(t.geometry,immersive,size),result=raster(t,immersive);assert.equal(adapter.rayAt(0,0),undefined);assert.equal(pixel(result,160,120)[3],0);assert.equal(adapter.rayAt(1,0)?.kind,'terrain');assert.deepEqual(pixel(result,160+adapter.layout.scale,120),[...elevationToColor(-100,0),255]);assert.deepEqual(t.copyElevations(),before);
});
test('fitted Inside shows the actual independent inner geography in a bounded overview and preserves physical scope selection',()=>{
 const t=make();for(const key of t.samples()){const patch=t.owner(key).patchId;if(patch==='outer-wall')t.write(key,1000);}
 const outside={...initialOpenCylinderView(),frame:side},inside={...initialOpenCylinderView('interior'),frame:side},out=openCylinderViewAdapter(t.geometry,outside,size),inner=openCylinderViewAdapter(t.geometry,inside,size);
 assert.equal(out.rayAt(0,0)?.kind,'terrain');assert.equal(inner.rayAt(0,0)?.kind,'terrain');assert.equal(out.positionAtHit(out.rayAt(0,0)!)!.patchId,'outer-wall');assert.equal(inner.positionAtHit(inner.rayAt(0,0)!)!.patchId,'inner-wall');assert.deepEqual(pixel(raster(t,outside),160,120),[...elevationToColor(1000,0),255]);assert.deepEqual(pixel(raster(t,inside),160,120),[...elevationToColor(-100,0),255]);assert.ok(2*inner.layout.h*inner.layout.scale<=size.height*.71);
 const p={...configuration.identity,patchId:'inner-wall',u:0,v:800000},key=t.resolve({...configuration.identity,patchId:'inner-wall',row:16,column:0});assert.throws(()=>openCylinderVisibilityGuard(t,outside,size)(p,[key.index]),/hidden|unselected/);assert.doesNotThrow(()=>openCylinderVisibilityGuard(t,inside,size)(p,[key.index]));assert.throws(()=>openCylinderVisibilityGuard(t,{...inside,interiorView:'center'},size)(p,[key.index]),/inspection/);
});
test('the connected map roundtrips every patch, including both periodic seam copies and the shared midpoint scope',()=>{
 const t=make(),view={...initialOpenCylinderView('interior','map'),phase:.37,pan:{x:.13,y:-.27}},adapter=openCylinderViewAdapter(t.geometry,view,size);
 for(const patchId of['outer-wall','inner-wall','rim-start','rim-end']as const)for(const v of[0,patchId.endsWith('wall')?800000:250000,patchId.endsWith('wall')?1600000:500000]){
  const p={...configuration.identity,patchId,u:Math.PI+.37,v},points=adapter.project(p);assert.ok(points.length>=2);for(const point of points){const hit=adapter.hitAt(point)!;assert.equal(hit.kind,'terrain');const q=adapter.positionAtHit(hit)!,a=t.geometry.referencePosition(p),b=t.geometry.referencePosition(q);assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])<1e-6);assert.ok(adapter.editablePositionAtHit(hit));}
 }
 const p={...configuration.identity,patchId:'rim-end',u:0,v:250000};assert.equal(t.geometry.canonicalScope(p),'exterior');assert.equal(t.geometry.scopeContains(p,'exterior'),true);assert.equal(t.geometry.scopeContains(p,'interior'),true);
});
test('display source validation rejects a filled-cap model and a camera inside actual material',()=>{
 const t=make(),view=initialOpenCylinderView('interior'),model=openCylinderReferenceModel(t.geometry);assert.throws(()=>openCylinderViewAdapter(t.geometry,view,size,{...model,innerHalfLength:model.outerHalfLength*.8}),/geometry/);assert.throws(()=>openCylinderViewAdapter(t.geometry,{...view,interiorView:'center',eyeMeters:[750000,0,0]},size),/free volume/);
});
