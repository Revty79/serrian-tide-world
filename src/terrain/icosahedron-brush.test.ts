import {test} from 'node:test';import assert from 'node:assert/strict';
import {createIcosahedronTerrain} from './icosahedron.ts';import {prepareIcosahedronDab,icosahedronBrushPolicy,ICOSAHEDRON_DAB_ADAPTER} from './icosahedron-brush.ts';
import {prepareConnectedDab,type CylindricalBrushSettings} from './connected-brush.ts';import {polyhedronRouteCertificate,polyhedronUnfoldings} from '../surfaces/polyhedron-path.ts';
const identity={worldId:'tetra',surfaceId:'outside'},geometry={identity,provider:'physical-regular-icosahedron' as const,version:1 as const,role:'exterior' as const,edgeLengthMeters:1e6};
function ready<T extends{status:string;pump(n:number):unknown}>(job:T){while(job.status==='preparing')job.pump(64);assert.equal(job.status,'ready');return job;}
const settings=(tool:'raise'|'lower'|'smooth'|'flatten',radius:number):CylindricalBrushSettings=>tool==='raise'||tool==='lower'?{version:1,tool,radiusMeters:radius,strengthMeters:200}:tool==='smooth'?{version:1,tool,radiusMeters:radius,intensity:.5}:{version:1,tool,radiusMeters:radius,intensity:.5,targetElevation:20};
for(const n of[16,32])test(`icosahedron N${n}: all four brushes at faces, twenty real triangles, edges and vertices match exhaustive certificates within their published numerical and Float32 bounds`,()=>{
 const routes=new Map<string,ReturnType<typeof polyhedronUnfoldings>>();
 for(const tool of['raise','lower','smooth','flatten'] as const)for(const[patchId,u,v]of[['f0',.3,.3],['f3',0,.5],['f1',0,0]] as const){
 const t=createIcosahedronTerrain({terrainId:'t',geometry,subdivisions:n}),reference=createIcosahedronTerrain({terrainId:'t',geometry,subdivisions:n}),policy=icosahedronBrushPolicy(t);assert.ok(policy.wellSampled&&policy.defaultRadius/policy.maxSpacing>=3);
 for(let i=0;i<t.sampleCount;i+=17){t.write(t.keyAt(i),30);reference.write(reference.keyAt(i),30);}
 const p={...identity,patchId,u,v},s=settings(tool,policy.defaultRadius),a=ready(prepareIcosahedronDab(t,p,s)),b=ready(prepareConnectedDab(reference,p,s,{...ICOSAHEDRON_DAB_ADAPTER,distance:(t,a,b,o)=>{const key=a.patchId+':'+b.patchId;let r=routes.get(key);if(!r){r=polyhedronUnfoldings(t.geometry,a.patchId,b.patchId);routes.set(key,r);}return{scope:'global-reference-surface',...polyhedronRouteCertificate(t.geometry,a,b,r,o),evaluatedBoxes:0};}}));assert.ok(a.statistics.affectedSamples>0);a.commit();b.commit();
 const actual=t.copyElevations(),expected=reference.copyElevations(),error=a.statistics.maxPreRoundElevationErrorMeters+b.statistics.maxPreRoundElevationErrorMeters;
 // Independently enclosed routes can straddle a Float32 rounding boundary.
 // This is the accepted brush error contract; exact replay is tested separately.
 for(let i=0;i<actual.length;i++){const rounding=2**-23*Math.max(Math.abs(actual[i]!),Math.abs(expected[i]!),2**-126);assert.ok(Math.abs(actual[i]!-expected[i]!)<=error+rounding,`${tool} ${patchId} ${i}: ${actual[i]} vs ${expected[i]}`);}
 }
});
