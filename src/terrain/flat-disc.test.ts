import{test}from'node:test';import assert from'node:assert/strict';
import{createFlatDisc,flatDiscResolution,flatDiscBrushPolicy}from'./flat-disc.ts';
import{createFlatDiscGeometry,FLAT_DISC_DEFAULT_DIMENSIONS}from'../surfaces/flat-disc.ts';
import{prepareCylindricalDab}from'./cylindrical-brush.ts';
import{createCylindricalHistory}from'../editor/cylindrical-history.ts';
import{PHYSICAL_PREVIEW_DAB_LIMITS}from'../editor/physical-brush-policy.ts';
import{cylinderBrushCandidates}from'./cylindrical-candidates.ts';
const configuration={...FLAT_DISC_DEFAULT_DIMENSIONS,provider:'physical-flat-disc' as const,version:1 as const,identity:{worldId:'disc',surfaceId:'connected-boundary'}};
test('Flat Disc specializes the exact closed cylinder with oriented caps, a complete wall and real rim aliases',()=>{
 const g=createFlatDiscGeometry(configuration),R=configuration.radiusMeters,H=configuration.thicknessMeters,p=(patchId:string,u:number,v:number)=>({...g.identity,patchId,u,v});
 assert.deepEqual(g.referencePosition(p('cap-start',0,0)),[0,0,0]);assert.deepEqual(g.referencePosition(p('cap-end',2,0)),[0,0,H]);
 assert.deepEqual(g.normal(p('cap-end',0,0)),[0,0,1]);assert.deepEqual(g.normal(p('cap-start',0,0)),[0,0,-1]);
 for(const angle of[-Math.PI,-1,0,1,Math.PI])for(const patchId of['cap-start','cap-end']){
  const q=p(patchId,angle,R),rim=g.crossRim(q).position;assert.equal(rim.patchId,'side');assert.deepEqual(g.referencePosition(q),g.referencePosition(rim));
 }
 assert.ok(Math.abs(g.volumeCubicMeters-Math.PI*R*R*H)<1);assert.throws(()=>createFlatDiscGeometry({...configuration,thicknessMeters:0}));
});
test('Disc profiles stay within existing capacity, have single distinct centers, periodic walls and shared canonical rims',()=>{
 for(const detail of[128,256]as const){const w=createFlatDisc({geometry:configuration,terrainId:'authority',detail}),t=w.terrain,r=t.metadata.representation.resolution;
  assert.ok(t.sampleCount<=65282);assert.equal(t.elevationByteLength,t.sampleCount*4);assert.equal(t.read(t.keyAt(0)),-100);
  const a={...t.metadata.identity,patchId:'cap-end' as const,column:0,row:0},b={...a,patchId:'cap-start' as const};
  assert.notEqual(t.resolve(a).index,t.resolve(b).index);for(let c=0;c<r.angularSamples;c++)assert.equal(t.resolve({...a,column:c}).index,t.resolve(a).index);
  for(const patchId of['cap-start','cap-end']as const)for(let column=0;column<r.angularSamples;column++){
   const q={...a,patchId,column,row:r.radialCells};assert.equal(t.crossRim(q).sample.index,t.resolve(q).index);
  }
  t.write(t.resolve(a),300);assert.equal(t.read(t.resolve(b)),-100);
 }
 assert.throws(()=>flatDiscResolution({...configuration,thicknessMeters:50000},128),/Higher/);flatDiscResolution({...configuration,thicknessMeters:50000},256);
});
test('Intrinsic disc distances stay planar, wrap circumferentially, and travel around the exterior rather than through material',()=>{
 const g=createFlatDiscGeometry(configuration),R=configuration.radiusMeters,H=configuration.thicknessMeters,p=(patchId:string,u:number,v:number)=>({...g.identity,patchId,u,v}),close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<2);
 close(g.globalDistance(p('cap-end',0,0),p('cap-end',1,R/2)).value,R/2);
 close(g.globalDistance(p('cap-end',0,0),p('cap-start',0,0)).value,2*R+H);
 close(g.globalDistance(p('cap-end',0,R),p('cap-start',0,R)).value,H);
 close(g.globalDistance(p('side',Math.PI-.01,H/2),p('side',-Math.PI+.01,H/2)).value,.02*R);
});
test('All four accepted brushes and whole-operation history edit actual disc authority exactly',()=>{
 const w=createFlatDisc({geometry:configuration,terrainId:'tools',detail:128}),t=w.terrain,h=createCylindricalHistory(t),p={...t.metadata.identity,patchId:'cap-end',u:0,v:0},radius=flatDiscBrushPolicy(configuration).defaultRadius;
 for(const tool of['raise','smooth','lower','flatten']as const){const before=new Uint32Array(t.copyElevations().buffer),job=prepareCylindricalDab(t,p,tool==='raise'||tool==='lower'?{version:1,tool,radiusMeters:radius,strengthMeters:200}:tool==='smooth'?{version:1,tool,radiusMeters:radius,intensity:.5}:{version:1,tool,radiusMeters:radius,intensity:.5,targetElevation:0});while(job.status==='preparing')job.pump(512);const operation=h.beginOperation(t);operation.commitDab(job);assert.equal(operation.finish('released'),true);const after=new Uint32Array(t.copyElevations().buffer);if(h.canUndo){h.undo();assert.deepEqual(new Uint32Array(t.copyElevations().buffer),before);h.redo();assert.deepEqual(new Uint32Array(t.copyElevations().buffer),after);}}
});
test('Thin-disc maximum brush preserves opposite centers but reaches the underside by the real rim route',()=>{
 const w=createFlatDisc({geometry:{...configuration,thicknessMeters:50000},terrainId:'thin',detail:256}),t=w.terrain,R=1e6,p=(patchId:string,u:number,v:number)=>({...t.metadata.identity,patchId,u,v});
 const apply=(point:ReturnType<typeof p>)=>{const j=prepareCylindricalDab(t,point,{version:1,tool:'raise',radiusMeters:.12*R,strengthMeters:200},PHYSICAL_PREVIEW_DAB_LIMITS);while(j.status==='preparing')j.pump(512);const changes=[...j.preparedChanges(t)];j.commit();return changes;};
 const before=t.copyElevations();apply(p('cap-end',0,0));for(const k of t.samples())if(t.owner(k).patchId==='cap-start')assert.equal(t.read(k),before[k.index]);
 const changes=apply(p('cap-end',0,.99*R)),regions=new Set(changes.map(c=>t.owner(t.keyAt(c.index)).patchId));assert.ok(regions.has('cap-start'));assert.ok(regions.has('cap-end'));assert.ok(regions.has('side'));
});
test('Mandatory rim-travel rejection stays below independently computed certified global distances',()=>{
 const w=createFlatDisc({geometry:{...configuration,thicknessMeters:50000},terrainId:'bounds',detail:256}),t=w.terrain,p=(patchId:string,u:number,v:number)=>({...t.metadata.identity,patchId,u,v});
 const points=[p('cap-start',0,0),p('cap-end',1,0),p('cap-end',.1,5e5),p('cap-start',-.3,9.5e5),p('side',.15,20000),p('side',-Math.PI,50000)];
 for(const a of points)for(const b of points){const bound=cylinderBrushCandidates(t,a,120000).chordLowerBound(b),distance=t.geometry.globalDistance(a,b);assert.ok(bound<=distance.upperBoundMeters,`${a.patchId} to ${b.patchId}`);}
});
