import type {SurfacePosition} from '../surfaces/contracts.ts';
import type {CylindricalTerrain} from './cylindrical.ts';
import {cylinderBrushCandidates} from './cylindrical-candidates.ts';
import {cylindricalSmoothEstimate} from './cylindrical-smoothing.ts';
import {prepareConnectedDab,type ConnectedDabAdapter,type CylindricalBrushSettings,type CylinderDabLimits} from './connected-brush.ts';
export * from './connected-brush.ts';
export const CYLINDRICAL_DAB_ADAPTER=Object.freeze<ConnectedDabAdapter<CylindricalTerrain>>({
 candidates:cylinderBrushCandidates,
 distance:(terrain,first,last,options)=>terrain.geometry.globalDistance(first,last,options),
 smooth:cylindricalSmoothEstimate,
});
/** Closed geometry adapter over the accepted common dab engine. */
export function prepareCylindricalDab(terrain:CylindricalTerrain,input:SurfacePosition,settings:CylindricalBrushSettings,limits:CylinderDabLimits={}){
 return prepareConnectedDab(terrain,input,settings,CYLINDRICAL_DAB_ADAPTER,limits);
}
