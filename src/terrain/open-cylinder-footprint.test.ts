import test from 'node:test';import assert from 'node:assert/strict';
import {createOpenCylinderTerrain} from './open-cylinder.ts';
import {createCylindricalTerrain} from './cylindrical.ts';
import {prepareOpenCylinderDab} from './open-cylinder-brush.ts';
import {prepareCylindricalDab} from './cylindrical-brush.ts';
import {openCylinderBrushRadiusLimit} from './open-cylinder-candidates.ts';
import {openCylinderWorkspaceAdapter} from '../components/open-cylinder-workspace-adapter.ts';
const identity={worldId:'footprint',surfaceId:'comparison'},geometry={identity,provider:'physical-open-cylinder' as const,version:1 as const,configuration:'both-open' as const,outerRadiusMeters:1e6,innerRadiusMeters:8e5,lengthMeters:16e5};
function ready<T extends{readonly status:string;pump(n:number):unknown}>(job:T){while(job.status==='preparing')job.pump(64);assert.equal(job.status,'ready');return job;}
for(const n of[128,256])for(const patch of['rim-start','rim-end']as const)test(`N${n} ${patch}: accepted default radius resolves angular footprint; common annular/cap sample words match exactly`,()=>{
 const resolution={angularSamples:n,axialCells:n/2,radialCells:n/4},open=createOpenCylinderTerrain({terrainId:'open',geometry,resolution,initialElevation:-100}),closed=createCylindricalTerrain({terrainId:'closed',geometry:{identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:1e6,lengthMeters:16e5},resolution,initialElevation:-100}),adapter=openCylinderWorkspaceAdapter(open,'exterior'),radius=Number(adapter.defaultControls().radius);
 assert.equal(radius,83700);assert.ok(radius<openCylinderBrushRadiusLimit(open));assert.ok(radius<geometry.lengthMeters/2&&radius<(geometry.outerRadiusMeters-geometry.innerRadiusMeters)/2);
 const settings={version:1 as const,tool:'raise' as const,radiusMeters:radius,strengthMeters:200},a=ready(prepareOpenCylinderDab(open,{...identity,patchId:patch,u:0,v:100000},settings)),b=ready(prepareCylindricalDab(closed,{...identity,patchId:patch==='rim-start'?'cap-start':'cap-end',u:0,v:900000},settings));
 const columns=new Set([...a.preparedChanges(open)].map(c=>c.index%n));assert.ok(columns.size>=3);a.commit();b.commit();let compared=0;
 for(let row=1;row<resolution.radialCells;row++){const rho=1e6*row/resolution.radialCells;if(rho<8e5)continue;const v=patch==='rim-start'?rho-8e5:1e6-rho,openRow=v/(2e5/(2*resolution.radialCells));if(!Number.isInteger(openRow))continue;for(let column=0;column<n;column++){
  const actual=open.read(open.resolve({...identity,patchId:patch,row:openRow,column})),baseline=closed.read(closed.resolve({...identity,patchId:patch==='rim-start'?'cap-start':'cap-end',row,column:patch==='rim-start'?column:(n-column)%n}));assert.ok(Object.is(actual,baseline));compared++;
 }}assert.ok(compared>=n*4);
 const old=createOpenCylinderTerrain({terrainId:'old',geometry,resolution,initialElevation:-100}),oldDab=ready(prepareOpenCylinderDab(old,{...identity,patchId:patch,u:0,v:100000},{...settings,radiusMeters:28800})),oldColumns=new Set([...oldDab.preparedChanges(old)].map(c=>c.index%n));assert.ok(oldColumns.size<columns.size);
});
