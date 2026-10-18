// Fixed-work AB/BA comparison against the frozen D2-R renderer; no browser/terrain changes.
import { renderSphericalGlobe as before, makeSphericalDisplayCache, buildSphericalFaceTexture } from '../tests/fixtures/spherical-raster-reference.ts';
import { renderSphericalGlobe as after } from '../src/rendering/spherical-raster.ts';
import { createSphericalTerrain } from '../src/terrain/spherical.ts';
import { CUBE_FACES } from '../src/surfaces/cube-sphere.ts';
import { INITIAL_SPHERICAL_VIEW, rotateSphere } from '../src/rendering/spherical-view.ts';
import { writeFileSync } from 'node:fs';
const t=createSphericalTerrain({terrainId:'bench',identity:{worldId:'bench',surfaceId:'sphere'},radiusMeters:1000000,cellsPerEdge:256}),source=t.copyElevations();
const cache=makeSphericalDisplayCache(Object.fromEntries(CUBE_FACES.map(face=>[face,buildSphericalFaceTexture(t,source,face)])),0),size={width:412,height:839},measurements=[];
for(const budget of [35000,220000]){const results=[];for(let round=0;round<6;round++)for(const [label,render] of round%2?[['after',after],['before',before]]:[['before',before],['after',after]]){let reuse;const start=performance.now();for(let i=0;i<25;i++)reuse=render(cache,rotateSphere(INITIAL_SPHERICAL_VIEW,i*.01,0),size,budget,reuse).pixels;results.push({round,label,ms:performance.now()-start});}measurements.push({budget,results});}
const result={method:'Same Node process, exact frozen pre-P1 renderer, fixed 25 camera positions per trial, same texture/resolution/raster budget, six AB/BA rounds. Round zero includes warmup and cold ray construction. This isolates raster CPU work; browser editing is measured separately.',node:process.version,measurements};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
