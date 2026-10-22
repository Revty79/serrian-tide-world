import test from 'node:test';import assert from 'node:assert/strict';
import {createSphericalTerrain} from '../terrain/spherical.ts';
import {INITIAL_SPHERICAL_VIEW,projectSphere,unprojectSphere,recenterSphere,rotateSphere} from './spherical-view.ts';
import {dot3} from '../surfaces/cube-sphere.ts';
import {globeLimbZone} from './spherical-limb-assist.ts';
import {prepareSphericalSession} from '../editor/prepare-spherical-session.ts';
import {sphericalFieldRaster} from './spherical-field-raster.ts';
const terrain=()=>createSphericalTerrain({terrainId:'heights',identity:{worldId:'w',surfaceId:'inside'},radiusMeters:800000,cellsPerEdge:8,initialElevation:1000});
test('hollow sphere cavity: center-camera perspective roundtrips the whole viewport and respects physical direction',()=>{
 const t=terrain(),size={width:1200,height:800};for(const view of[{...INITIAL_SPHERICAL_VIEW,interior:true,interiorView:'center' as const},rotateSphere({...INITIAL_SPHERICAL_VIEW,interior:true,interiorView:'center' as const},.5,.8),recenterSphere({...INITIAL_SPHERICAL_VIEW,interior:true,interiorView:'center' as const},[0,0,-1])])for(const x of[0,100,600,1100,1200])for(const y of[0,50,400,800]){const d=unprojectSphere(t,{x,y},view,size)!;assert(d);assert(dot3(d,view.frame.forward)>0);const p=projectSphere(t,d,view,size)[0]!;assert(p);assert(Math.hypot(p.x-x,p.y-y)<1e-9);}
 assert.equal(unprojectSphere(t,{x:0,y:0},INITIAL_SPHERICAL_VIEW,size),null);const inside={...INITIAL_SPHERICAL_VIEW,interior:true,interiorView:'center' as const};assert.equal(globeLimbZone(inside,{x:900,y:400},size),null);assert.equal(projectSphere(t,[-1,0,0],inside,size).length,0);assert(unprojectSphere(t,{x:700,y:400},inside,size)![1]<0);
});
test('hollow sphere cavity: bounded Canvas rays cover the actual inside view, with no artificial outer globe silhouette',async()=>{
 const t=terrain(),prepared=await prepareSphericalSession(t,'Inside',false,{yield:async()=>{}}),field=prepared.cache.elevationField!;const steps=sphericalFieldRaster(field.snapshot(),{...INITIAL_SPHERICAL_VIEW,interior:true,interiorView:'center' as const},{width:320,height:200},'elevation',64000);let result=steps.next();while(!result.done)result=steps.next();assert.equal(result.value.left,0);assert.equal(result.value.top,0);assert.equal(result.value.width,320);assert.equal(result.value.height,200);for(let i=3;i<result.value.pixels.length;i+=4)assert.equal(result.value.pixels[i],255);
});

test('inside editing overview retains the accepted fitted projection and independent geography',()=>{const t=terrain(),size={width:1200,height:800},view={...INITIAL_SPHERICAL_VIEW,interior:true};assert.equal(unprojectSphere(t,{x:0,y:0},view,size),null);for(const p of[{x:600,y:400},{x:700,y:500}]){const d=unprojectSphere(t,p,view,size)!;assert(d);const q=projectSphere(t,d,view,size)[0]!;assert(Math.hypot(p.x-q.x,p.y-q.y)<1e-9);}assert(unprojectSphere(t,{x:700,y:400},view,size)![1]>0);});
