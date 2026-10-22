import test from 'node:test';import assert from 'node:assert/strict';
import {createOpenCylinderTerrain} from '../terrain/open-cylinder.ts';
import {OpenCylinderDisplayCache,openCylinderRasterSteps} from './open-cylinder-raster.ts';
import {initialOpenCylinderView} from './open-cylinder-view.ts';
import {openCylinderWorkspaceAdapter} from '../components/open-cylinder-workspace-adapter.ts';
import {prepareOpenCylinderDab} from '../terrain/open-cylinder-brush.ts';
import type {CoherentTerrainRaster} from './coherent-terrain-raster.ts';
import {rasterRegions} from './coherent-terrain-raster.ts';
const identity={worldId:'dirty',surfaceId:'open'},geometry={identity,provider:'physical-open-cylinder' as const,version:1 as const,configuration:'both-open' as const,outerRadiusMeters:1e6,innerRadiusMeters:8e5,lengthMeters:16e5},size={width:400,height:300};
function finish(g:Generator<void,CoherentTerrainRaster>){let r;do{r=g.next();}while(!r.done);return r.value;}
for(const n of[128,256])for(const scope of['exterior','interior']as const)for(const patch of['wall','rim','map-seam','map-corner']as const)test(`Open N${n} ${scope} ${patch}: bounded update preserves full-render terrain pixels and all unrelated pixels`,()=>{
 const t=createOpenCylinderTerrain({terrainId:'one',geometry,resolution:{angularSamples:n,axialCells:n/2,radialCells:n/4},initialElevation:-100}),cache=new OpenCylinderDisplayCache(t);for(const _ of cache.prepare())void _;
 const adapter=openCylinderWorkspaceAdapter(t,scope),view={...initialOpenCylinderView(scope,patch.startsWith('map')?'map':'physical'),...(patch==='rim'?{frame:{right:[1,0,0]as const,up:[0,1,0]as const,forward:[0,0,1]as const}}:{frame:{right:[0,1,0]as const,up:[0,0,1]as const,forward:[1,0,0]as const}})},base=finish(openCylinderRasterSteps(cache,view,size,120000,undefined,'relief'));
 const center={...identity,patchId:patch==='map-corner'?'rim-start':patch==='rim'?'rim-end':scope==='exterior'?'outer-wall':'inner-wall',u:patch.startsWith('map')?Math.PI-.01:0,v:patch==='map-corner'?190000:patch==='rim'?100000:800000},revision=t.revision,job=prepareOpenCylinderDab(t,center,{version:1,tool:'raise',radiusMeters:83700,strengthMeters:900});while(job.status==='preparing')job.pump(64);job.commit();cache.refresh([...t.samples()].map(k=>k.index));
 const region=adapter.dirtyRegion!([{fromRevision:revision,toRevision:t.revision,center,radiusMeters:83700}],view,size,base.columns,base.rows);assert.ok(region);
 const partial=finish(openCylinderRasterSteps(cache,view,size,120000,undefined,'relief',undefined,{base,region})),full=finish(openCylinderRasterSteps(cache,view,size,120000,undefined,'relief'));
 const regions=rasterRegions(region);let outsideChanged=0,max=0;for(let y=0;y<full.rows;y++)for(let x=0;x<full.columns;x++)for(let c=0;c<4;c++){const at=(y*full.columns+x)*4+c;max=Math.max(max,Math.abs(partial.pixels[at]!-full.pixels[at]!));if(!regions.some(r=>x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom))outsideChanged+=Number(base.pixels[at]!==full.pixels[at]);}assert.equal(outsideChanged,0);assert.equal(max,0);
});
