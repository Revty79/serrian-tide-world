import test from 'node:test';
import assert from 'node:assert/strict';
import {createHollowSphereWorld} from '../terrain/hollow-sphere.ts';
import {hollowSphereConfiguration,hollowSphereDimensions,HOLLOW_SPHERE_ROLES,type HollowSphereConfiguration} from './hollow-sphere.ts';
import {CUBE_FACES,FACE_EDGES,QUARTER_PI,cross3,dot3,unitDirection,type Vec3} from './cube-sphere.ts';
import {SphericalHistory} from '../editor/spherical-history.ts';
import {startSphericalBrushStroke} from '../terrain/spherical-brush.ts';
const config:HollowSphereConfiguration={provider:'physical-hollow-sphere',version:1,worldId:'world',outerRadiusMeters:1000,innerRadiusMeters:800,surfaces:{exterior:{surfaceId:'outside',terrainId:'out-heights'},interior:{surfaceId:'inside',terrainId:'in-heights'}}};
const near=(a:number,b:number)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const words=(t:ReturnType<typeof createHollowSphereWorld>['surfaces']['exterior']['terrain'])=>new Uint32Array(t.copyElevations().buffer);
test('hollow sphere: finite supported shell, immutable configuration and independent identities',()=>{
 const world=createHollowSphereWorld(config,8);near(world.dimensions.wallThicknessMeters,200);assert.equal(world.definition.shape.kind,'hollow-sphere');assert.equal(world.definition.surfaces.length,2);assert.equal(world.select({worldId:'world',surfaceId:'inside'}).role,'interior');assert.throws(()=>world.select({worldId:'foreign',surfaceId:'inside'}));
 assert.equal(world.elevationByteLength,2*(6*8**2+2)*4);assert.equal(world.surfaces.interior.terrain.read(world.surfaces.interior.terrain.keyAt(0)),0);
 const changed={...config,surfaces:{...config.surfaces,interior:{...config.surfaces.interior}}};const frozen=hollowSphereConfiguration(changed);changed.surfaces.interior.surfaceId='later';assert.equal(frozen.surfaces.interior.surfaceId,'inside');
 for(const [outer,inner]of [[1000,1000],[1000,1001],[Infinity,800],[1000,0],[1e13,800],[1000,1000-1e-6],[NaN,1]])assert.throws(()=>hollowSphereDimensions({outerRadiusMeters:outer!,innerRadiusMeters:inner!}));
 assert.throws(()=>hollowSphereConfiguration({...config,surfaces:{exterior:config.surfaces.exterior,interior:config.surfaces.exterior}}));
});
test('hollow sphere: actual round geometry and opposite normals with inward right-handed tangents',()=>{
 const w=createHollowSphereWorld(config,8);
 for(const role of HOLLOW_SPHERE_ROLES)for(const face of CUBE_FACES){const g=w.surfaces[role].geometry,p={...g.identity,patchId:face,u:.2,v:-.3},q=g.referencePosition(p),n=g.normal(p),u=g.tangentVector(p,{du:1,dv:0}),v=g.tangentVector(p,{du:0,dv:1});near(Math.hypot(...q),g.radiusMeters);near(dot3(unitDirection(q),n),g.orientation);near(dot3(unitDirection(cross3(u,v)),n),1);near(Math.hypot(...g.elevatedPosition(p,25)),g.radiusMeters+g.orientation*25);near(dot3(g.direction(g.fromReferenceChart(g.toReferenceChart(p))),g.direction(p)),1);}
});
test('hollow sphere: all seams, vertices and poles preserve canonical connectivity at both radii',()=>{
 const w=createHollowSphereWorld(config,8);for(const role of HOLLOW_SPHERE_ROLES){const{geometry:g,terrain:t}=w.surfaces[role];for(const face of CUBE_FACES)for(const edge of FACE_EDGES)for(const a of[-QUARTER_PI,0,QUARTER_PI]){const p={...g.identity,patchId:face,u:edge.startsWith('u')?(edge.endsWith('min')?-1:1)*QUARTER_PI:a,v:edge.startsWith('v')?(edge.endsWith('min')?-1:1)*QUARTER_PI:a},to=g.crossEdge(p,edge).position;near(dot3(g.direction(p),g.direction(to)),1);const pos=g.toReferenceChart(p),n=8,key=t.resolve({...pos,column:Math.round((pos.u/QUARTER_PI+1)*n/2),row:Math.round((pos.v/QUARTER_PI+1)*n/2)});assert(t.aliases(key).length>=2);assert(t.neighbors(key).length>=3);}
 for(const direction of[[0,0,1],[0,0,-1],[1,1,1]]as Vec3[]){const ps=g.positionsForDirection(direction);for(const p of ps)near(dot3(g.direction(p),unitDirection(direction)),1);}
 const a=g.positionsForDirection([0,0,1])[0]!,b=g.positionsForDirection([0,0,-1])[0]!;near(g.metric.distance(a,b).value,Math.PI*g.radiusMeters);}
});
test('hollow sphere: accepted four tools and exact whole-gesture history never edit the other surface',()=>{
 const w=createHollowSphereWorld(config,16);for(const role of HOLLOW_SPHERE_ROLES){const t=w.surfaces[role].terrain,other=w.surfaces[role==='interior'?'exterior':'interior'].terrain,untouched=words(other),history=new SphericalHistory(t);
 for(const tool of['raise','lower','smooth','flatten']as const){const before=words(t),settings=tool==='raise'||tool==='lower'?{tool,radiusMeters:t.geometry.radiusMeters*.4,strengthMeters:tool==='raise'?20:5}:tool==='smooth'?{tool,radiusMeters:t.geometry.radiusMeters*.4,intensity:.6}:{tool,radiusMeters:t.geometry.radiusMeters*.4,intensity:.6,targetElevation:3};const stroke=startSphericalBrushStroke(t,{...t.metadata.identity,direction:[1,1,1]},settings,history);stroke.moveTo({...t.metadata.identity,direction:[1,.8,1]});stroke.end();const after=words(t);assert.notDeepEqual(after,before);assert(history.undo());assert.deepEqual(words(t),before);assert(history.redo());assert.deepEqual(words(t),after);assert.deepEqual(words(other),untouched);}
 }
});
test('hollow sphere: shell and cavity bounds reject an entire invalid dab before any write',()=>{
 const w=createHollowSphereWorld(config,16);for(const role of HOLLOW_SPHERE_ROLES){const t=w.surfaces[role].terrain,before=words(t),revision=t.revision;assert.throws(()=>startSphericalBrushStroke(t,{...t.metadata.identity,direction:[1,0,0]},{tool:'lower',radiusMeters:t.geometry.radiusMeters*.5,strengthMeters:1000}));assert.equal(t.revision,revision);assert.deepEqual(words(t),before);assert.throws(()=>t.write(t.keyAt(0),-51));assert.throws(()=>t.write(t.keyAt(0),role==='interior'?401:1001));}
});
