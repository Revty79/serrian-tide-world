import { SphericalElevationField } from '../rendering/spherical-elevation.ts';
import type { SphericalDisplayCache } from '../rendering/spherical-raster.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import { workStep,type PersistenceWork } from '../persistence/cooperative-work.ts';
export async function prepareSphericalField(terrain:SphericalTerrain,cache:SphericalDisplayCache,work:PersistenceWork={}){
 const field=new SphericalElevationField(terrain,cache),steps=field.prepare('all');let maxTaskMs=0,done=false;
 try{while(!done){const at=performance.now();let result=steps.next();while(!result.done&&performance.now()-at<8)result=steps.next();maxTaskMs=Math.max(maxTaskMs,performance.now()-at);done=!!result.done;await workStep(work,'Preparing physical spherical display',done?1:.9);}cache.elevationField=field;return{field,maxTaskMs};}finally{if(!done)steps.return([]);}
}
