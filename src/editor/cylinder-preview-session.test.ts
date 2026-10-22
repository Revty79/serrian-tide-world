import assert from 'node:assert/strict';
import test from 'node:test';
import { CylinderPreviewSession, createCylinderPreviewTerrain } from './cylinder-preview-session.ts';
import { cylinderBrushFromControls, defaultCylinderControls } from './cylinder-controls.ts';
import { initialCylinderView, recenterCylinder } from '../rendering/cylindrical-view.ts';
import { CylinderDisplayCache, cylinderInterpolatedColor, cylinderPackedColor, cylinderRasterSteps } from '../rendering/cylindrical-raster.ts';
const settings = (tool: 'raise'|'lower'|'smooth'|'flatten') => ({ version: 1 as const, tool, radiusMeters: 83700, ...(tool === 'raise' || tool === 'lower' ? { strengthMeters: 200 } : { intensity: .65, ...(tool === 'flatten' ? { targetElevation: -250 } : {}) }) }) as NonNullable<ReturnType<typeof cylinderBrushFromControls>>;
const make = (n=64) => { const t = createCylinderPreviewTerrain(n), s = new CylinderPreviewSession(t); for (const _ of s.cache.prepare()) void _; return s; };
const p = (s: ReturnType<typeof make>, patchId: 'side'|'cap-start'|'cap-end', v: number, u=0) => ({ ...s.terrain.metadata.identity, patchId, u, v });
const words = (s: ReturnType<typeof make>) => new Uint32Array(s.terrain.copyElevations().buffer);
const drain = (s: ReturnType<typeof make>) => { let n=0; while (s.painting) { assert.ok(++n<100000); s.pump(10); } };
const cacheMatches = (s: ReturnType<typeof make>) => { const colors=s.cache.snapshot(); for(const k of s.terrain.samples()) assert.equal(colors[k.index], cylinderPackedColor(s.terrain.read(k),0)); assert.equal(s.cache.sourceRevision,s.terrain.revision); };
const currentStencil = (s: CylinderPreviewSession) => s.stencil;
for (const tool of ['raise','lower','smooth','flatten'] as const) test(`real cylinder preview ${tool} observer preserves B2B2 one-operation history and exact derived colors`,()=>{
 const s=make(); for(const key of s.terrain.samples())s.terrain.write(key,((key.index*13)%17-8)*20);for(const _ of s.cache.prepare())void _;
 const before=words(s),view=initialCylinderView('map');assert.ok(s.begin(p(s,'side',50000),settings(tool),view));s.move(p(s,'cap-start',950000));s.release();drain(s);assert.equal(s.history.statistics.entries,1);assert.ok(s.statistics.dabs>1);cacheMatches(s);const after=words(s);s.undo();assert.deepEqual(words(s),before);cacheMatches(s);s.redo();assert.deepEqual(words(s),after);cacheMatches(s);s.dispose();assert.equal(s.history.statistics.retainedBytes,0);
});
test('physical visibility guard rejects hidden sample writes atomically, including prepared queued dabs',()=>{
 const s=make(),view=recenterCylinder(s.terrain.geometry,initialCylinderView(),p(s,'side',800000)),before=words(s);
 assert.ok(s.begin(p(s,'side',800000,Math.PI-.01),settings('raise'),view));s.release();drain(s);assert.deepEqual(words(s),before);assert.equal(s.history.statistics.entries,0);assert.equal(s.statistics.failures,1);
 assert.ok(s.begin(p(s,'side',800000),settings('raise'),view));while(!s.lastDab)s.pump(10);const prefix=words(s);s.move(p(s,'side',800000,1.5));s.release();drain(s);assert.equal(s.history.statistics.entries,1);s.undo();assert.deepEqual(words(s),before);s.redo();assert.deepEqual(words(s),prefix);
});
test('exact dry stencil matches the next actual canonical changes and invalidates on source/settings changes',()=>{
 const s=make(),center=p(s,'cap-start',0),brush=settings('raise'),view=initialCylinderView('map'),before=words(s);
 s.requestPreview(center,brush,view);while(s.previewPending)s.pumpPreview();assert.ok(s.stencil);const expected=[...s.stencil.indices];assert.ok(expected.length>0);
 s.begin(center,brush,view);s.release();drain(s);const after=words(s);assert.deepEqual([...after.keys()].filter(i=>after[i]!==before[i]),expected);
 s.requestPreview(center,{...brush,radiusMeters:130000},view);assert.equal(s.stencil,undefined);while(s.previewPending)s.pumpPreview();assert.ok(currentStencil(s)!.indices.length>expected.length);
 s.requestPreview(center,settings('smooth'),view);s.terrain.write(s.terrain.keyAt(0),999);while(s.previewPending)s.pumpPreview();assert.match(s.previewMessage,/changed/);assert.equal(s.stencil,undefined);
});
test('release drains; cancellation, replacement and repeated preview failures preserve bounded numerical state',()=>{
 const s=make(),before=words(s),view=initialCylinderView('map');s.begin(p(s,'cap-start',0),settings('raise'),view);while(!s.lastDab)s.pump(10);const prefix=words(s);s.move(p(s,'cap-start',50000));s.pump(.001);s.cancel('View switched');assert.deepEqual(words(s),prefix);assert.equal(s.history.statistics.entries,1);s.undo();assert.deepEqual(words(s),before);
 for(let i=0;i<10;i++){s.requestPreview(p(s,'cap-start',0),{...settings('raise'),radiusMeters:2000000},view);s.pumpPreview();s.requestPreview(undefined,undefined,view);}assert.equal(s.previewPending,false);assert.deepEqual(words(s),before);s.dispose();assert.equal(s.begin(p(s,'side',800000),settings('raise'),view),false);
});
test('derived palette interpolation has correct cap orientation, rim aliases, center fan and bounded coherent render epochs',()=>{
 const s=make(),t=s.terrain;for(const k of t.samples())t.write(k,k.index*2-500);for(const _ of s.cache.prepare())void _;const colors=s.cache.snapshot(),{radiusMeters:r,lengthMeters:l}=t.metadata.geometry;
 for(const k of t.samples()){const q=t.positionAt(t.owner(k)),xyz=t.geometry.referencePosition(q);const c=cylinderInterpolatedColor(colors,t,{region:q.patchId,theta:Math.atan2(xyz[1],xyz[0]),radial:Math.hypot(xyz[0],xyz[1])/r,z:(xyz[2]-l/2)/r,depth:0});assert.equal(c,colors[k.index]);}
 const job=cylinderRasterSteps(s.cache,initialCylinderView('map'),{width:800,height:600},20000),first=job.next();assert.equal(first.done,false);const revision=s.cache.sourceRevision;t.write(t.keyAt(0),9000);s.cache.refresh([0]);let result=job.next();while(!result.done)result=job.next();assert.equal(result.value.revision,revision);assert.ok(result.value.pixels.byteLength<=80000);assert.equal(result.value.snapshotBytes,t.sampleCount*4);
 assert.throws(()=>new CylinderDisplayCache(createCylinderPreviewTerrain(512)));assert.throws(()=>cylinderRasterSteps(s.cache,initialCylinderView(),{width:800,height:600},1500001).next());
});
test('physical controls validate contextual parameters and supported preview detail explicitly',()=>{
 const defaults=defaultCylinderControls(1000000);assert.equal(cylinderBrushFromControls(defaults,1000000)!.radiusMeters,83700);
 for(const c of [{...defaults,radius:''},{...defaults,strength:'0'},{...defaults,tool:'flatten' as const,target:''},{...defaults,tool:'smooth' as const,intensity:'101'},{...defaults,tool:'navigate' as const}])assert.equal(cylinderBrushFromControls(c,1000000),undefined);
 assert.equal(cylinderBrushFromControls({...defaults,tool:'flatten',target:'-250'},1000000)!.tool,'flatten');assert.throws(()=>createCylinderPreviewTerrain(512));
});
test('UI spacing uses the approved physical option without predictable quarter-radius cap-center ties',()=>{
 const s=make(),view=initialCylinderView('map'),before=words(s);assert.ok(s.begin(p(s,'cap-start',0),settings('raise'),view));s.move(p(s,'cap-start',200000));s.release();drain(s);assert.equal(s.statistics.failures,0);assert.equal(s.statistics.dabs,11);assert.equal(s.history.statistics.entries,1);s.undo();assert.deepEqual(words(s),before);s.dispose();assert.equal(s.cache.byteLength,0);
});
