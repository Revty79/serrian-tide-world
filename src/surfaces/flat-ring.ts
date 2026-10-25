import type {SurfaceIdentity} from './contracts.ts';
import {createOpenCylinderGeometry} from './open-cylinder.ts';

export interface FlatRingDimensions {readonly outerRadiusMeters:number;readonly innerRadiusMeters:number;readonly thicknessMeters:number}
export interface FlatRingConfiguration extends FlatRingDimensions {readonly provider:'physical-flat-ring';readonly version:1;readonly identity:SurfaceIdentity}
export const FLAT_RING_DEFAULT_DIMENSIONS:FlatRingDimensions=Object.freeze({outerRadiusMeters:1e6,innerRadiusMeters:350000,thicknessMeters:150000});
export const FLAT_RING_PRESETS=Object.freeze({Standard:[.35,.15],Wide:[.2,.12],Narrow:[.8,.15],'Small opening':[.06,.15],'Large opening':[.85,.1],Thin:[.35,.1],Thick:[.35,.3]} as const);
export function flatRingDimensions(input:FlatRingDimensions){
 const {outerRadiusMeters:R,innerRadiusMeters:r,thicknessMeters:H}=input;
 if(![R,r,H].every(Number.isFinite)||2*R<1e6||2*R>1e9||r/R<.06||r/R>.85||H/R<.1||H/R>.3)
  throw RangeError('Ring Diameter must be 1,000,000–1,000,000,000 m; Hole Diameter must be 6–85% of Ring Diameter; Thickness must be 5–15% of Ring Diameter.');
 return Object.freeze({outerRadiusMeters:R,innerRadiusMeters:r,thicknessMeters:H,diameterMeters:2*R,holeDiameterMeters:2*r,widthMeters:R-r});
}
/** A solid annular slab. One toroidal boundary, four charts, four real shared
 * creases. The accepted open-cylinder adapter supplies positions and normals. */
export function createFlatRingGeometry(input:FlatRingConfiguration){
 if(input.provider!=='physical-flat-ring'||input.version!==1)throw RangeError('Unsupported Flat Ring construction.');
 const d=flatRingDimensions(input),boundary=createOpenCylinderGeometry({identity:input.identity,provider:'physical-open-cylinder',version:1,configuration:'both-open',outerRadiusMeters:d.outerRadiusMeters,innerRadiusMeters:d.innerRadiusMeters,lengthMeters:d.thicknessMeters});
 const metadata:FlatRingConfiguration=Object.freeze({provider:input.provider,version:1,identity:boundary.identity,outerRadiusMeters:d.outerRadiusMeters,innerRadiusMeters:d.innerRadiusMeters,thicknessMeters:d.thicknessMeters});
 return Object.freeze({metadata,identity:boundary.identity,boundary,upperPatch:'rim-end' as const,lowerPatch:'rim-start' as const,innerPatch:'inner-wall' as const,outerPatch:'outer-wall' as const,
  areaSquareMeters:2*Math.PI*(d.outerRadiusMeters*d.outerRadiusMeters-d.innerRadiusMeters*d.innerRadiusMeters+(d.outerRadiusMeters+d.innerRadiusMeters)*d.thicknessMeters),
  volumeCubicMeters:Math.PI*(d.outerRadiusMeters*d.outerRadiusMeters-d.innerRadiusMeters*d.innerRadiusMeters)*d.thicknessMeters});
}
