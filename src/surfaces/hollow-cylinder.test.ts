import test from 'node:test';import assert from 'node:assert/strict';
import {createHollowCylinderWorld} from '../terrain/hollow-cylinder.ts';
import {hollowCylinderConfiguration,hollowCylinderDimensions,HOLLOW_CYLINDER_ROLES,type HollowCylinderConfiguration} from './hollow-cylinder.ts';
import {cross3,dot3,unitDirection} from './cube-sphere.ts';
import {createCylindricalHistory} from '../editor/cylindrical-history.ts';
import type {CylindricalBrushSettings} from '../terrain/cylindrical-brush.ts';
import {beginCylindricalStroke} from '../terrain/cylindrical-stroke.ts';
import {cylinderPreparedPatch} from '../editor/cylinder-prepared-patch.ts';
import {CylinderDisplayCache,cylinderPackedColor} from '../rendering/cylindrical-raster.ts';
import {createCylinderPreviewTerrain} from '../editor/cylinder-preview-session.ts';
const config:HollowCylinderConfiguration={provider:'physical-hollow-cylinder',version:1,configuration:'capped',worldId:'tube',outerRadiusMeters:1000,innerRadiusMeters:800,outerLengthMeters:1600,innerLengthMeters:1200,surfaces:{exterior:{surfaceId:'out',terrainId:'out-heights'},interior:{surfaceId:'in',terrainId:'in-heights'}}};
const make=(a=8)=>createHollowCylinderWorld(config,{angularSamples:a,axialCells:4,radialCells:3}),near=(a:number,b:number)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`),words=(t:ReturnType<typeof make>['surfaces']['exterior']['terrain'])=>new Uint32Array(t.copyElevations().buffer);
test('capped hollow cylinders: immutable coaxial configuration, independent identities, true cavity and explicit material bounds',()=>{
 const w=make(),d=w.dimensions;assert.equal(w.definition.shape.kind,'hollow-cylinder');assert.equal(d.radialThicknessMeters,200);assert.equal(d.endThicknessMeters,200);assert.equal(w.definition.surfaces.length,2);assert.equal(w.select({worldId:'tube',surfaceId:'in'}).role,'interior');assert.throws(()=>w.select({worldId:'other',surfaceId:'in'}));assert.equal(w.elevationByteLength,2*w.surfaces.exterior.terrain.sampleCount*4);near(d.cavityVolumeMeters3,Math.PI*800**2*1200);near(d.shellVolumeMeters3,Math.PI*(1000**2*1600-800**2*1200));
 const source=structuredClone(config),snapshot=hollowCylinderConfiguration(source);Reflect.set(source.surfaces.interior,'surfaceId','changed');assert.equal(snapshot.surfaces.interior.surfaceId,'in');
 for(const bad of[{innerRadiusMeters:1000},{innerRadiusMeters:1001},{innerLengthMeters:1600},{innerLengthMeters:1601},{innerLengthMeters:NaN},{outerRadiusMeters:1e10},{outerLengthMeters:1},{innerRadiusMeters:999.9999},{innerLengthMeters:1599.9999}])assert.throws(()=>hollowCylinderDimensions({...config,...bad}));
 assert.throws(()=>hollowCylinderConfiguration({...config,configuration:'open'}as unknown as HollowCylinderConfiguration));assert.throws(()=>hollowCylinderConfiguration({...config,surfaces:{exterior:config.surfaces.exterior,interior:config.surfaces.exterior}}));
});
test('capped inner/outer charts: actual side/cap normals, right-handed tangents, centered XYZ and their own accepted metrics',()=>{
 const w=make();for(const role of HOLLOW_CYLINDER_ROLES){const g=w.surfaces[role].geometry;
 for(const patchId of['side','cap-start','cap-end']as const){const p={...g.identity,patchId,u:.37,v:patchId==='side'?g.lengthMeters*.4:g.radiusMeters*.4},q=g.referencePosition(p),n=g.normal(p),tu=g.tangentVector(p,{du:1,dv:0}),tv=g.tangentVector(p,{du:0,dv:1});near(dot3(unitDirection(cross3(tu,tv)),n),1);near(dot3(g.elevatedPosition(p,20).map((v,i)=>v-q[i]!)as unknown as readonly[number,number,number],n),20);near(q[2],patchId==='side'?-g.lengthMeters*.1:patchId==='cap-start'?-g.lengthMeters/2:g.lengthMeters/2);near(patchId==='side'?Math.hypot(q[0],q[1]):Math.abs(q[2]),patchId==='side'?g.radiusMeters:g.lengthMeters/2);const ref=g.toReferenceChart(p);assert.deepEqual(g.toReferenceChart(g.fromReferenceChart(ref)),ref);}
 const a={...g.identity,patchId:'side',u:0,v:g.lengthMeters/2},b={...a,u:.4};near(g.sameRegionDistance(a,b).value,g.radiusMeters*.4);const result=g.globalDistance(a,b);assert(result.lowerBoundMeters<=g.radiusMeters*.4&&result.upperBoundMeters>=g.radiusMeters*.4);for(const end of['cap-start','cap-end']as const)assert.throws(()=>g.tangentVector({...g.identity,patchId:end,u:0,v:0},{du:1,dv:0}),/singular/);
 }
 assert.equal(w.surfaces.interior.geometry.kernel.metadata.role,'exterior');assert.equal(w.surfaces.interior.geometry.referencePosition({...w.surfaces.interior.geometry.identity,patchId:'cap-start',u:0,v:0})[2],-600);
});
test('odd/even cylindrical samples: reflected inner addresses preserve every owner, cap center, periodic alias and shared rim',()=>{
 for(const a of[8,13]){const w=make(a);for(const role of HOLLOW_CYLINDER_ROLES){const s=w.surfaces[role],t=s.terrain,g=s.geometry;
 for(const key of t.samples()){const owner=s.owner(key);assert.equal(s.resolve(owner).index,key.index);assert(owner.column>=0&&owner.column<a);for(const alias of s.aliases(key)){assert.equal(s.resolve(alias).index,key.index);const p=s.positionAt(alias),ref=g.referencePosition(p),kernel=t.geometry.referencePosition(t.positionAt(t.owner(key)));near(ref[0],kernel[0]);near(ref[1],kernel[1]);near(ref[2],kernel[2]-g.lengthMeters/2);if(alias.patchId==='side'&&(alias.row===0||alias.row===4)||alias.patchId!=='side'&&alias.row===3){const seam=s.crossRim(alias);assert.equal(seam.sample.index,key.index);const q=g.referencePosition(s.positionAt(seam.address));q.forEach((v,i)=>near(v,ref[i]!));}}}
 }}
});
test('accepted cylinder four-tool gestures edit either hollow bank and keep exact history without touching the other bank',()=>{
 const w=make();for(const role of HOLLOW_CYLINDER_ROLES){const s=w.surfaces[role],t=s.terrain,other=w.surfaces[role==='interior'?'exterior':'interior'].terrain,h=createCylindricalHistory(t);for(const key of t.samples())t.write(key,(key.index%7-3)*3);
 for(const patchId of['side','cap-start','cap-end']as const)for(const tool of['raise','lower','smooth','flatten']as const){const before=words(t),untouched=words(other),settings={version:1 as const,tool,radiusMeters:397.3,...(tool==='raise'||tool==='lower'?{strengthMeters:5}:{intensity:.6,...(tool==='flatten'?{targetElevation:2}:{})})},p=s.geometry.toReferenceChart({...s.geometry.identity,patchId,u:0,v:patchId==='side'?s.geometry.lengthMeters/2:0}),stroke=beginCylindricalStroke(t,h,p,settings as CylindricalBrushSettings);stroke.release();let count=0;while(stroke.statistics.hasPendingWork){assert(++count<100000);stroke.pump(128);}assert.equal(stroke.status,'complete');const after=words(t);assert.notDeepEqual(after,before);assert(h.undo());assert.deepEqual(words(t),before);assert(h.redo());assert.deepEqual(words(t),after);assert.deepEqual(words(other),untouched);}
 }
});
test('cylindrical shell bounds and host support guard whole patches and worker/history publication atomically',()=>{
 const w=make(),t=w.surfaces.interior.terrain,before=words(t),revision=t.revision;assert.throws(()=>t.write(t.keyAt(0),301),/clearance/);assert.throws(()=>t.commitPreparedPatch(t.keyAt(0),revision,[{indices:Uint32Array.of(0,1),values:Float32Array.of(1,301),count:2}]),/clearance/);assert.deepEqual(words(t),before);assert.equal(t.revision,revision);
 let protectedGround=true;w.setExcavationProtection((role,i,h,b)=>{if(role==='interior'&&i===1&&protectedGround&&!Object.is(h,b))throw Error('protected support');});const history=createCylindricalHistory(t),settings={version:1 as const,tool:'raise' as const,radiusMeters:100,strengthMeters:1},job=()=>cylinderPreparedPatch(t,{type:'prepared',task:1,sequence:1,sourceRevision:t.revision,center:{...t.metadata.identity,patchId:'side',u:0,v:600},settings,indices:Uint32Array.of(0,1),before:Float32Array.of(0,0),after:Float32Array.of(1,1),affectedSamples:2});
 const failed=history.beginOperation(t);assert.throws(()=>failed.commitDab(job()),/protected/);failed.finish('failed');assert.equal(history.statistics.entries,0);assert.deepEqual(words(t),before);assert.equal(t.revision,revision);
 protectedGround=false;const operation=history.beginOperation(t);operation.commitDab(job());operation.finish('released');const after=words(t),state=history.statistics;protectedGround=true;assert.throws(()=>history.undo(),/protected/);assert.deepEqual(words(t),after);assert.deepEqual(history.statistics,state);protectedGround=false;assert(history.undo());assert.deepEqual(words(t),before);assert(history.redo());assert.deepEqual(words(t),after);
});
test('initial cylinder display derives the real flat height for new zero banks while legacy cylinders stay at -100 m',()=>{
 for(const terrain of[make().surfaces.exterior.terrain,createCylinderPreviewTerrain(64)]){const cache=new CylinderDisplayCache(terrain);for(const _ of cache.prepare())void _;assert(cache.snapshot().every(color=>color===cylinderPackedColor(terrain.read(terrain.keyAt(0)),0)));assert.equal(terrain.read(terrain.keyAt(0)),terrain.metadata.identity.worldId==='tube'?0:-100);}
});


test('hollow cylinder address reflection captures the accepted resolution rather than a mutable caller descriptor',()=>{
 const resolution={angularSamples:13,axialCells:4,radialCells:3},w=createHollowCylinderWorld(config,resolution),s=w.surfaces.interior,key=s.terrain.keyAt(4),owner=s.owner(key),p=s.positionAt(owner);resolution.angularSamples=7;resolution.axialCells=9;assert.deepEqual(s.owner(key),owner);assert.equal(s.resolve(owner).index,key.index);assert.deepEqual(s.positionAt(owner),p);assert.equal(s.terrain.metadata.representation.resolution.angularSamples,13);
});
