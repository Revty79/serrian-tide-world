import test from 'node:test';import assert from 'node:assert/strict';
import {createFlatRing} from '../terrain/flat-ring.ts';
import {FLAT_RING_PRESETS} from '../surfaces/flat-ring.ts';
import {flatRingWorkspaceAdapter,flatRingRegion,FLAT_RING_REGIONS} from '../components/flat-ring-workspace-adapter.ts';
import {initialFlatRingView} from '../editor/flat-ring-session.ts';
import {openCylinderViewAdapter} from './open-cylinder-view.ts';
for(const [name,[ratio,h]]of Object.entries(FLAT_RING_PRESETS))test(`${name}: real physical picking, annular hole, underside orientation and wall circumference`,()=>{
 const w=createFlatRing({geometry:{provider:'physical-flat-ring',version:1,identity:{worldId:'w',surfaceId:'s'},outerRadiusMeters:1e6,innerRadiusMeters:ratio*1e6,thicknessMeters:h*1e6},terrainId:'t',detail:256}),g=w.terrain.geometry,a=flatRingWorkspaceAdapter(w),size={width:1440,height:950},before=w.terrain.copyElevations();
 for(const entry of FLAT_RING_REGIONS){const p=flatRingRegion(w,entry.id,.71),v=a.recenter(initialFlatRingView(),p),projection=openCylinderViewAdapter(g,v,size);assert.equal(projection.fittedInside,false);const screen=projection.project(p)[0];assert.ok(screen);const hit=projection.hitAt(screen);assert.ok(hit);const q=projection.positionAtHit(hit);assert.ok(q);assert.ok(Math.hypot(...g.referencePosition(p).map((x,k)=>x-g.referencePosition(q)[k]!))<1e-2,entry.label);}
 for(const mapProjection of['upper-annulus','lower-annulus','inner-wall','outer-wall']as const){const v={...initialFlatRingView('map'),mapProjection},adapter=openCylinderViewAdapter(g,v,size),patchId=mapProjection==='upper-annulus'?'rim-end':mapProjection==='lower-annulus'?'rim-start':mapProjection;
  for(const angle of[0,.71,-Math.PI,Math.PI-.01]){const p={...g.identity,patchId,u:angle,v:patchId.endsWith('wall')?h*5e5:g.thicknessMeters/2},screen=adapter.project(p)[0];assert.ok(screen);const hit=adapter.hitAt(screen);assert.ok(hit);const q=adapter.positionAtHit(hit)!;assert.ok(Math.hypot(...g.referencePosition(p).map((x,k)=>x-g.referencePosition(q)[k]!))<1e-2);}
  if(mapProjection.endsWith('annulus')){assert.equal(adapter.hitAt({x:adapter.layout.x,y:adapter.layout.y}),undefined);const p={...g.identity,patchId,u:Math.PI/2,v:g.thicknessMeters/2},screen=adapter.project(p)[0]!;assert.equal(screen.y<adapter.layout.y,mapProjection==='upper-annulus');}
  else{const halfWidth=mapProjection==='inner-wall'?Math.PI*ratio:Math.PI;assert.equal(adapter.rayAt(halfWidth+.001,0),undefined);assert.equal(adapter.rayAt(halfWidth-.001,0)?.kind,'terrain');}
 }
 assert.deepEqual(w.terrain.copyElevations(),before);assert.equal(w.terrain.revision,0);
});
