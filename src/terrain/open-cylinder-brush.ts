import {paintingStage} from '../editor/painting-metrics.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import {openCylinderDistance} from '../surfaces/open-cylinder-distance.ts';
import type {OpenCylinderTerrain,OpenCylinderSampleKey} from './open-cylinder.ts';
import {openCylinderBrushCandidates} from './open-cylinder-candidates.ts';
import {connectedSmoothEstimate} from './connected-smoothing.ts';
import {prepareConnectedDab,type ConnectedDabAdapter,type CylindricalBrushSettings,type CylinderDabLimits} from './connected-brush.ts';

/** Finite-volume wall/annulus conductances. Every crease is a real shared ring;
 * there are no polar centers and no smoothing across empty disk material. */
export function openCylinderSmoothEstimate(t:OpenCylinderTerrain,key:OpenCylinderSampleKey,current:number){return paintingStage('smoothNeighborhood',()=>{
 const row=t.meridianRow(key),A=t.metadata.representation.resolution.angularSamples,angle=2*Math.PI/A,R=t.geometry.metadata.outerRadiusMeters,r=t.rowGeometry(row).radius,previous=t.rowGeometry(row-1),next=t.rowGeometry(row+1),before=t.meridianSpacing(row,row-1),after=t.meridianSpacing(row,row+1),neighbors=t.neighbors(key);
 const area=angle*(before*(3*r+previous.radius)+after*(3*r+next.radius))/8;
 const conductances=neighbors.map(other=>{const otherRow=t.meridianRow(other);if(otherRow===row)return(before+after)/(2*r*angle);const d=t.meridianSpacing(row,otherRow),otherRadius=t.rowGeometry(otherRow).radius;return angle*(r+otherRadius)/(2*d);});
 return connectedSmoothEstimate(t,neighbors,conductances,current,area/(R*R));
});}
export const OPEN_CYLINDER_DAB_ADAPTER=Object.freeze<ConnectedDabAdapter<OpenCylinderTerrain>>({candidates:openCylinderBrushCandidates,distance:(t,a,b,options)=>openCylinderDistance(t.geometry,a,b,options),smooth:openCylinderSmoothEstimate});
/** All four tools use exactly the same accepted influence and commit engine. */
export function prepareOpenCylinderDab(terrain:OpenCylinderTerrain,center:SurfacePosition,settings:CylindricalBrushSettings,limits:CylinderDabLimits={}){return prepareConnectedDab(terrain,center,settings,OPEN_CYLINDER_DAB_ADAPTER,limits);}
