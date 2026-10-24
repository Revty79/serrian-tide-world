import test from 'node:test';import assert from 'node:assert/strict';
import {createRingworld,ringworldResolution} from './ringworld.ts';
import {createRingworldGeometry} from '../surfaces/ringworld.ts';
import {openCylinderDistance} from '../surfaces/open-cylinder-distance.ts';
import {reconstructOpenCylinderPath} from '../surfaces/open-cylinder-path.ts';
import {prepareOpenCylinderDab} from './open-cylinder-brush.ts';
import {createConnectedHistory} from '../editor/connected-history.ts';
const geometry={identity:{worldId:'ring',surfaceId:'boundary'},provider:'physical-rectangular-ringworld' as const,version:1 as const,innerRadiusMeters:1000000,outerRadiusMeters:1200000,widthMeters:400000};
const make=(detail:128|256=128)=>createRingworld({geometry,terrainId:'terrain',detail});
const at=(patchId:'outer-wall'|'inner-wall'|'rim-end'|'rim-start',u=0,v=0)=>({...geometry.identity,patchId,u,v});
test('Ringworld has four genuine regions, correct normals, metrics, annular area and volume',()=>{
 const g=createRingworldGeometry(geometry),{innerRadiusMeters:ri,outerRadiusMeters:ro,widthMeters:W}=geometry;
 assert.equal(g.regions.length,4);assert.equal(g.volumeCubicMeters,Math.PI*(ro-ri)*(ro+ri)*W);
 assert.ok(Math.abs(g.regions.reduce((sum,r)=>sum+g.regionArea(r.id),0)-g.areaSquareMeters)<g.areaSquareMeters*1e-15);
 for(const region of g.regions){const p=at(region.id,.37,region.id.endsWith('wall')?W/2:100000),q=g.referencePosition(p),n=g.normal(p);assert.ok(Math.hypot(q[0],q[1])>=ri);assert.ok(Math.abs(Math.hypot(...n)-1)<1e-15);const radius=g.boundary.physical(p).radius;assert.ok(Math.abs(g.metricSquared(p,{du:.02,dv:30})-(radius*.02)**2-900)<.001);}
 assert.deepEqual(g.normal(at('inner-wall')),[-1,-0,0]);assert.deepEqual(g.normal(at('rim-end')),[0,0,1]);assert.deepEqual(g.normal(at('rim-start')),[0,0,-1]);
 assert.ok(g.referencePosition(at('inner-wall'))[0]+g.normal(at('inner-wall'))[0]*10<ri,'positive inner elevation points into opening');
});
for(const detail of[128,256]as const)test(`Ringworld N${detail} is metric-spaced, bounded, periodic, with single canonical crease ownership`,()=>{
 const w=make(detail),t=w.terrain,r=t.metadata.representation.resolution,A=r.angularSamples,Z=r.axialCells,P=r.radialCells,h=2*Math.PI*1200000/A;
 assert.equal(A,4*detail);assert.equal(t.sampleCount,A*(2*Z+4*P));assert.ok(t.sampleCount<=262144);assert.equal(t.elevationByteLength,4*t.sampleCount);
 assert.ok(400000/Z<=h&&200000/(2*P)<=h);assert.ok(t.copyElevations().every(v=>v===-100));
 for(let column=0;column<A;column++)for(const[wall,row,rim,rimRow]of[['outer-wall',0,'rim-start',2*P],['outer-wall',Z,'rim-end',0],['inner-wall',0,'rim-end',2*P],['inner-wall',Z,'rim-start',0]]as const){const key=t.resolve({...geometry.identity,patchId:wall,column,row}),alias=t.resolve({...geometry.identity,patchId:rim,column:column+A,row:rimRow});assert.equal(key.index,alias.index);assert.equal(t.aliases(key).length,2);assert.deepEqual(t.referencePositionAt(key),t.referencePositionAt(alias));}
 assert.throws(()=>t.read({...t.keyAt(0),terrainId:'foreign'}));
});
test('Ringworld rejects unsupported dimensions, detail, degenerate and duplicate identities',()=>{
 for(const patch of[{innerRadiusMeters:0},{outerRadiusMeters:1000000},{widthMeters:1},{widthMeters:10000000},{outerRadiusMeters:NaN},{outerRadiusMeters:Infinity}])assert.throws(()=>createRingworldGeometry({...geometry,...patch}));
 assert.throws(()=>ringworldResolution(geometry,512));assert.throws(()=>createRingworld({geometry,terrainId:'ring',detail:128}));
 for(const width of[.15,.5])for(const thickness of[.08,.25])for(const detail of[128,256]){const ro=1000000;assert.doesNotThrow(()=>ringworldResolution({innerRadiusMeters:ro*(1-thickness),outerRadiusMeters:ro,widthMeters:ro*width},detail));}
});
test('Ringworld paths use certified annular distance and never cut across empty space or material',()=>{
 const g=make().terrain.geometry,a=at('inner-wall',0,200000),b=at('inner-wall',Math.PI,200000),d=openCylinderDistance(g,a,b);
 assert.ok(d.lowerBoundMeters>=Math.PI*1000000-1);assert.ok(d.upperBoundMeters<=Math.PI*1000000+1);
 const path=reconstructOpenCylinderPath(g,at('outer-wall',0,390000),at('inner-wall',0,10000),{version:1});assert.ok(Math.abs(path.lengthMeters-220000)<.001);
 for(let i=0;i<=32;i++){const p=path.atDistance(path.lengthMeters*i/32).position,q=g.physical(p);assert.ok(q.radius>=1000000&&q.radius<=1200000);assert.ok(p.patchId.endsWith('wall')||q.z===0||q.z===400000);}
});
for(const tool of['raise','lower','smooth','flatten']as const)test(`Ringworld ${tool} works on both bands, rims and shared seams with exact whole-gesture history`,()=>{
 const t=make().terrain,history=createConnectedHistory(t);for(let i=0;i<t.sampleCount;i++){const k=t.keyAt(i);t.write(k,Math.fround(-100+40*Math.sin(i*.31)));}
 const before=t.copyElevations(),tx=history.beginOperation(t),settings=tool==='raise'||tool==='lower'?{version:1 as const,tool,radiusMeters:25000,strengthMeters:50}:tool==='flatten'?{version:1 as const,tool,radiusMeters:25000,intensity:.6,targetElevation:80}:{version:1 as const,tool,radiusMeters:25000,intensity:.6};
 for(const p of[at('inner-wall',Math.PI-.005,200000),at('outer-wall',-Math.PI+.005,200000),at('rim-end',0,100000),at('rim-start',0,100000),at('outer-wall',.1,400000)]){const job=prepareOpenCylinderDab(t,p,settings);while(job.status==='preparing')job.pump(32);assert.equal(job.status,'ready');assert.ok(job.statistics.affectedSamples>0);tx.commitDab(job);}
 tx.finish('released');const after=t.copyElevations();assert.notDeepEqual(after,before);assert.equal(history.statistics.entries,1);assert.ok(history.undo());assert.deepEqual(t.copyElevations(),before);assert.ok(history.redo());assert.deepEqual(t.copyElevations(),after);
});
test('independent inner band interior painting preserves every outer band word',()=>{
 const t=make().terrain,before=t.copyElevations(),job=prepareOpenCylinderDab(t,at('inner-wall',0,200000),{version:1,tool:'raise',radiusMeters:25000,strengthMeters:300});while(job.status==='preparing')job.pump(32);job.commit();assert.notDeepEqual(t.copyElevations(),before);for(const key of t.samples())if(t.owner(key).patchId==='outer-wall')assert.equal(t.read(key),before[key.index]);
});
