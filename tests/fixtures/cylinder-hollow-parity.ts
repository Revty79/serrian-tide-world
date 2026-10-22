import {createCylindricalTerrain} from '../../src/terrain/cylindrical.ts';
import {createCylindricalHistory} from '../../src/editor/cylindrical-history.ts';
import {beginCylindricalStroke} from '../../src/terrain/cylindrical-stroke.ts';
import {CylinderDisplayCache,cylinderRasterSteps} from '../../src/rendering/cylindrical-raster.ts';
import {initialCylinderView} from '../../src/rendering/cylindrical-view.ts';
import type {CylinderExcavationDisplay} from '../../src/rendering/hollow-cylinder-display.ts';

/** Real accepted brush arithmetic, identical complete height words and pose.
 * The cutter is behind the cylinder. It enables the production physical-cut
 * path without changing the visible surface used for the parity comparison. */
export function cylinderParityScene(n:number,initialElevation:number){
 const terrain=createCylindricalTerrain({terrainId:'parity-heights',geometry:{identity:{worldId:'parity',surfaceId:'outside'},provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:1_000_000,lengthMeters:1_600_000},resolution:{angularSamples:n,axialCells:n/2,radialCells:n/4},initialElevation});
 const view=initialCylinderView(),center={...terrain.metadata.identity,patchId:'side',u:Math.atan2(view.frame.forward[1],view.frame.forward[0]),v:800000},history=createCylindricalHistory(terrain),stroke=beginCylindricalStroke(terrain,history,center,{version:1,tool:'raise',radiusMeters:140000,strengthMeters:2000});
 stroke.release();while(stroke.statistics.hasPendingWork)stroke.pump(128);
 if(stroke.status!=='complete')throw Error('Parity fixture brush failed');
 const cache=new CylinderDisplayCache(terrain);for(const _ of cache.prepare())void _;
 const f=view.frame.forward,cut:CylinderExcavationDisplay={model:{radiusMeters:1_000_000,outerHalfLength:.8,innerRatio:.8,innerHalfLength:.6,primitives:[{a:[-f[0],-f[1],-f[2]*.5],b:[-f[0]*.7,-f[1]*.7,-f[2]*.5],radius:.03}]},opposite:cache,role:'exterior',revision:1};
 return{terrain,cache,view,cut};
}
export function cylinderHollowParity(n:number,initialElevation:number){
 const{terrain,cache,view,cut}=cylinderParityScene(n,initialElevation);
 const before=terrain.copyElevations(),size={width:640,height:480},render=(excavation?:CylinderExcavationDisplay)=>{const work=cylinderRasterSteps(cache,view,size,size.width*size.height,undefined,'relief',excavation);let next=work.next();while(!next.done)next=work.next();return next.value;},solid=render(),hollow=render(cut);
 let differing=0,totalError=0,maxError=0,interiorDiffering=0,interiorMaxError=0,checked=0;
 for(let y=2;y<size.height-2;y++)for(let x=2;x<size.width-2;x++){
  const at=(y*size.width+x)*4,opaque=[at,at-8,at+8,at-size.width*8,at+size.width*8].every(i=>solid.pixels[i+3]===255&&hollow.pixels[i+3]===255);let error=0;
  for(let c=0;c<4;c++)error=Math.max(error,Math.abs(solid.pixels[at+c]!-hollow.pixels[at+c]!));
  if(error)differing++;maxError=Math.max(maxError,error);totalError+=error;
  if(opaque){checked++;if(error)interiorDiffering++;interiorMaxError=Math.max(interiorMaxError,error);}
 }
 const unchanged=terrain.copyElevations().every((v,i)=>Object.is(v,before[i]));
 cache.dispose();return{n,initialElevation,size,view,solid,hollow,metrics:{differing,maxError,totalError,interiorDiffering,interiorMaxError,checked,unchanged},elevations:terrain.copyElevations()};
}
