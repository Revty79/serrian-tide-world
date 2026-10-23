import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTetrahedronTerrain} from '../terrain/tetrahedron.ts';
import {createHollowTetrahedronWorld} from '../terrain/hollow-tetrahedron.ts';
import {SolidTetrahedronSession} from './tetrahedron-session.ts';
import {prepareHollowTetrahedronDocument} from './hollow-tetrahedron-document.ts';
import {polyhedronHoleAt} from '../surfaces/polyhedron-holes.ts';
import {polyhedronMapLink} from '../surfaces/polyhedron-passages.ts';
import {createConnectedHistory} from './connected-history.ts';
import {prepareTetrahedronDab} from '../terrain/tetrahedron-brush.ts';

async function fixture(hollow:boolean){
 const identity={worldId:'tetrahedron-guard',surfaceId:'outside'};
 if(hollow){const world=createHollowTetrahedronWorld({provider:'physical-hollow-tetrahedron',version:1,worldId:identity.worldId,outerEdgeLengthMeters:1e6,innerEdgeLengthMeters:8e5,surfaces:{exterior:{surfaceId:'outside',terrainId:'outside-terrain'},interior:{surfaceId:'inside',terrainId:'inside-terrain'}}},32,0);return(await prepareHollowTetrahedronDocument(world,'Guard test')).editor;}
 return new SolidTetrahedronSession(createTetrahedronTerrain({terrainId:'outside-terrain',geometry:{provider:'physical-regular-tetrahedron',version:1,identity,role:'exterior',edgeLengthMeters:1e6},subdivisions:32,initialElevation:0}),'Guard test');
}

for(const hollow of[false,true])test(`${hollow?'Hollow':'Solid'} Tetrahedron: complete patches and terrain history cannot change opening support`,async()=>{
 const editor=await fixture(hollow),store=editor.connectionStore,banks=Object.values(store.banks),anchor={...store.body.exterior.identity,patchId:'south',u:.3,v:.3},hole=polyhedronHoleAt(store.body,anchor,1000);
 try{
  const entries=hole.mouths.map(m=>{const t=banks.find(t=>t.geometry.identity.surfaceId===m.position.surfaceId)!;const key=t.resolve({...t.geometry.identity,patchId:m.position.patchId,row:Math.round(m.position.v*t.subdivisions),column:Math.round(m.position.u*t.subdivisions)});t.write(key,12);const history=createConnectedHistory(t),operation=history.beginOperation(t),job=prepareTetrahedronDab(t,t.positionAt(t.owner(key)),{version:1,tool:'flatten',radiusMeters:100000,intensity:1,targetElevation:0});while(job.status==='preparing')job.pump(64);operation.commitDab(job);operation.finish('released');assert.equal(t.read(key),0);return{t,key,history};});
  await store.changeConnections({...store.connections,holes:[hole]});
  for(const {t,key,history}of entries){const before=new Uint32Array(t.copyElevations().buffer),revision=t.revision,cursor=history.statistics.cursor;assert.throws(()=>t.write(key,1),/protected/);const indices=Uint32Array.from([key.index,(key.index+1)%t.sampleCount].sort((a,b)=>a-b));assert.throws(()=>t.commitPreparedPatch(key,revision,[{indices,values:Float32Array.of(50,50),count:2}]),/protected/);assert.throws(()=>history.undo(),/protected/);assert.equal(history.statistics.cursor,cursor);assert.equal(t.revision,revision);assert.deepEqual(new Uint32Array(t.copyElevations().buffer),before);}
  await store.changeConnections({...store.connections,holes:[]});for(const {t,key,history}of entries){assert.equal(history.undo(),true);assert.equal(t.read(key),12);assert.equal(history.redo(),true);assert.equal(t.read(key),0);}
 }finally{editor.dispose();}
});

for(const hollow of[false,true])test(`${hollow?'Hollow':'Solid'} Tetrahedron: host unlock cannot release a connection transaction`,async()=>{
 const editor=await fixture(hollow),store=editor.connectionStore,anchor={...store.body.exterior.identity,patchId:'south',u:.3,v:.3};
 try{const link=polyhedronMapLink(store.body,anchor,{kind:'map-location',worldId:'external',mapId:'map',locationId:'door'}),update=store.changeConnections({...store.connections,links:[link]});assert.equal(editor.locked,true);editor.locked=true;editor.locked=false;assert.equal(editor.locked,true);if('surfaces'in editor)for(const s of Object.values(editor.surfaces))assert.equal(s.editor.locked,true);await assert.rejects(editor.drainForSave(),/Wait/);await update;assert.equal(editor.locked,false);assert.equal(store.connections.links.length,1);}finally{editor.dispose();}
});
