import {assertIdentity,type SurfaceIdentity} from './contracts.ts';
import {createAxialGeometry} from './axial.ts';
import {freezePolyhedronArrays} from './polyhedron-contract.ts';

/** A fixed, closed polygonal reference solid. These are physical facets, not
 * a display approximation to an unimplemented smooth surface of revolution. */
export const DUMBBELL_SECTORS=16;
export interface DumbbellDimensions {
 readonly worldSizeMeters:number;
 readonly firstLobeRatio:number;
 readonly secondLobeRatio:number;
 readonly neckRadiusRatio:number;
 readonly neckLengthRatio:number;
 readonly transitionShape:'compact'|'extended';
}
export interface DumbbellConfiguration extends DumbbellDimensions {
 readonly provider:'physical-faceted-dumbbell';readonly version:1;
 readonly identity:SurfaceIdentity;readonly role:'exterior';
}
export const DUMBBELL_DEFAULT_DIMENSIONS=Object.freeze({worldSizeMeters:2000000,firstLobeRatio:1,secondLobeRatio:1,neckRadiusRatio:.35,neckLengthRatio:.5,transitionShape:'compact' as const});
export function dumbbellDimensions(p:DumbbellDimensions){
 const {worldSizeMeters:S,firstLobeRatio:a,secondLobeRatio:b,neckRadiusRatio:r,neckLengthRatio:l,transitionShape}=p;
 if(![S,a,b,r,l].every(Number.isFinite)||S<100000||S>1e9||a<.8||a>1.2||b<.8||b>1.2||r<.25||r>.45||l<.1||l>2||!['compact','extended'].includes(transitionShape))throw RangeError('Dumbbell requires World Size 100,000–1,000,000,000 m, lobe ratios 0.8–1.2, neck radius 0.25–0.45 of the smaller lobe radius, neck length 0.1–2 reference radii, and a supported transition.');
 const R=S/4,R1=R*a,R2=R*b,neckRadiusMeters=Math.min(R1,R2)*r,neckLengthMeters=R*l,transitionRatio=transitionShape==='compact'?.35:.65;
 const firstCenterMeters=-neckLengthMeters/2-(.6+transitionRatio)*R1,secondCenterMeters=neckLengthMeters/2+(.6+transitionRatio)*R2;
 return Object.freeze({worldSizeMeters:S,firstLobeRatio:a,secondLobeRatio:b,neckRadiusRatio:r,neckLengthRatio:l,transitionShape,firstLobeRadiusMeters:R1,secondLobeRadiusMeters:R2,neckRadiusMeters,neckLengthMeters,firstTransitionLengthMeters:transitionRatio*R1,secondTransitionLengthMeters:transitionRatio*R2,firstCenterMeters,secondCenterMeters,centerSpacingMeters:secondCenterMeters-firstCenterMeters,extentMeters:secondCenterMeters+R2-firstCenterMeters+R1});
}
export function createDumbbellGeometry(input:DumbbellConfiguration){
 assertIdentity(input.identity);if(input.provider!=='physical-faceted-dumbbell'||input.version!==1||input.role!=='exterior')throw RangeError('Unsupported Dumbbell geometry.');
 const d=dumbbellDimensions(input),identity=Object.freeze({...input.identity}),metadata=Object.freeze({provider:input.provider,version:1 as const,identity,role:input.role,...d});
 const R1=d.firstLobeRadiusMeters,R2=d.secondLobeRadiusMeters,c1=d.firstCenterMeters,c2=d.secondCenterMeters;
 const profile=freezePolyhedronArrays([
  [c1-R1,0],[c1-.875*R1,.5*R1],[c1-.5*R1,.875*R1],[c1,R1],[c1+.6*R1,.8*R1],[-d.neckLengthMeters/2,d.neckRadiusMeters],
  [d.neckLengthMeters/2,d.neckRadiusMeters],[c2-.6*R2,.8*R2],[c2,R2],[c2+.5*R2,.875*R2],[c2+.875*R2,.5*R2],[c2+R2,0],
 ] as const);
 return createAxialGeometry(metadata,profile,input.worldSizeMeters,{firstRadiusMeters:R1,secondRadiusMeters:R2,waistRadiusMeters:d.neckRadiusMeters,firstJoinMeters:-d.neckLengthMeters/2,secondJoinMeters:d.neckLengthMeters/2,extentMeters:d.extentMeters});
}
export type DumbbellGeometry=ReturnType<typeof createDumbbellGeometry>;
export {axialBandPosition as dumbbellBandPosition} from './axial.ts';
