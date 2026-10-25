import { sphericalCapCandidates } from '../terrain/spherical-cap.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import type { SphericalBrushSettings } from '../terrain/spherical-brush.ts';
import type { Vec3 } from '../surfaces/cube-sphere.ts';
/** Calibrated against P1C's actual / baselines, not a geometry approximation.
 * Rectangles bound preparation work only; the unchanged engine checks the cap. */
export function sphericalWorkDecision(terrain:SphericalTerrain,center:Vec3,settings:SphericalBrushSettings,coarse:boolean,physicalWork?:{angularRadius:number;cost:number}){
 const regions=sphericalCapCandidates(terrain,center,physicalWork?.angularRadius??Math.min(Math.PI,settings.radiusMeters/terrain.metadata.geometry.radiusMeters)).regions;
 const candidates=regions.reduce((sum,r)=>sum+(r.right-r.left+1)*(r.bottom-r.top+1),0),weighted=candidates*(settings.tool==='smooth'?8:1)*(physicalWork?.cost??1),threshold=coarse?6000:24000;
 const noOp=(settings.tool==='smooth'||settings.tool==='flatten')&&settings.intensity===0;
 return{backend:!noOp&&weighted>=threshold?'worker' as const:'cooperative' as const,candidates,weighted,threshold,coarse,reason:noOp?'Zero-intensity brush':weighted>=threshold?'Preparation exceeds calibrated UI-work threshold':'Preparation is cheaper than background handoff'};
}
