import {createCylinderGeometry, type CylinderConfiguration} from './cylinder.ts';
import type {SurfaceIdentity} from './contracts.ts';

export interface FlatDiscDimensions {readonly radiusMeters:number; readonly thicknessMeters:number}
export interface FlatDiscConfiguration extends FlatDiscDimensions {
  readonly provider:'physical-flat-disc'; readonly version:1; readonly identity:SurfaceIdentity;
}
export const FLAT_DISC_DEFAULT_DIMENSIONS:FlatDiscDimensions=Object.freeze({radiusMeters:1e6,thicknessMeters:1e5});
export const FLAT_DISC_REGIONS=Object.freeze([
  {id:'cap-end',label:'Upper center'}, {id:'upper-middle',label:'Upper middle'},
  {id:'upper-edge',label:'Upper near rim'}, {id:'upper-rim',label:'Upper rim'},
  {id:'side',label:'Sidewall'}, {id:'lower-rim',label:'Lower rim'},
  {id:'lower-edge',label:'Lower near rim'}, {id:'lower-middle',label:'Lower middle'},
  {id:'cap-start',label:'Lower center'}, {id:'seam',label:'Circumferential seam'},
] as const);

export function flatDiscDimensions(input:FlatDiscDimensions){
  const {radiusMeters:R,thicknessMeters:H}=input,diameterMeters=2*R;
  if(![R,H].every(Number.isFinite)||diameterMeters<1e5||diameterMeters>1e9||H/R<.05||H/R>.4)
    throw RangeError('Disc Diameter must be 100,000–1,000,000,000 m; Disc Thickness must be 2.5–20% of its diameter.');
  return Object.freeze({radiusMeters:R,thicknessMeters:H,diameterMeters});
}

/** A disc is the accepted closed circular cylinder, with disc proportions.
 * One connected exterior has three stable patch identities and two shared rims.
 * Reference z=0..H is translated by the accepted camera to -H/2..H/2. */
export function createFlatDiscGeometry(input:FlatDiscConfiguration){
  if(input.provider!=='physical-flat-disc'||input.version!==1)throw RangeError('Unsupported Flat Disc construction.');
  const d=flatDiscDimensions(input),configuration: CylinderConfiguration={
    provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',
    identity:input.identity,radiusMeters:d.radiusMeters,lengthMeters:d.thicknessMeters,
  },boundary=createCylinderGeometry(configuration),metadata:FlatDiscConfiguration=Object.freeze({
    provider:input.provider,version:1,identity:boundary.identity,radiusMeters:d.radiusMeters,thicknessMeters:d.thicknessMeters,
  });
  return Object.freeze({metadata,identity:boundary.identity,boundary,
    upperPatch:'cap-end' as const,lowerPatch:'cap-start' as const,sidewallPatch:'side' as const,
    areaSquareMeters:2*Math.PI*d.radiusMeters*(d.radiusMeters+d.thicknessMeters),
    volumeCubicMeters:Math.PI*d.radiusMeters*d.radiusMeters*d.thicknessMeters,
    normalize:boundary.normalize,referencePosition:boundary.referencePosition,normal:boundary.normal,
    crossRim:boundary.crossRim,globalDistance:boundary.globalDistance,
  });
}
