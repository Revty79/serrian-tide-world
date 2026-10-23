import {createPyramidGeometry,type PyramidConfiguration} from './pyramid.ts';
import * as I from './pyramid-interval.ts';
export const HOLLOW_PYRAMID_ROLES=['exterior','interior'] as const;
export type HollowPyramidRole=typeof HOLLOW_PYRAMID_ROLES[number];
export interface HollowPyramidDimensions{readonly outerBaseWidthMeters:number;readonly outerHeightMeters:number;readonly innerBaseWidthMeters:number;readonly innerHeightMeters:number;readonly innerBaseZMeters:number}
export interface HollowPyramidConfiguration extends HollowPyramidDimensions{readonly provider:'physical-hollow-pyramid';readonly version:1;readonly worldId:string;readonly surfaces:Readonly<Record<HollowPyramidRole,{readonly surfaceId:string;readonly terrainId:string}>>}
/** Both solids are convex, centered and axis aligned. Testing the inner base
 * vertices and apex against every outer halfspace certifies ALL inner faces,
 * edges and their convex interiors. Outward intervals make clearance a lower
 * bound rather than a rounded-to-positive near-intersection. */
export function hollowPyramidDimensions(d:HollowPyramidDimensions){
 const {outerBaseWidthMeters:w,outerHeightMeters:h,innerBaseWidthMeters:iw,innerHeightMeters:ih,innerBaseZMeters:b}=d;
 if(![w,h,iw,ih,b].every(Number.isFinite)||![w,h,iw,ih].every(x=>x>=1&&x<=1e9)||h/w<.05||h/w>20||ih/iw<.05||ih/iw>20)throw RangeError('Hollow pyramids require finite supported right-pyramid dimensions.');
 const half=I.exact(.5),W=I.exact(w),H=I.exact(h),B=I.exact(b),IW=I.exact(iw),IH=I.exact(ih),slant=I.root(I.add(I.square(H),I.square(I.multiply(W,half))));
 const baseCorner=I.divide(I.multiply(half,I.subtract(I.multiply(W,I.subtract(H,B)),I.multiply(H,IW))),slant),apex=I.divide(I.multiply(I.multiply(W,half),I.subtract(I.subtract(H,B),IH)),slant),minimumClearanceMeters=Math.min(b,baseCorner[0],apex[0]);
 const minimumSupported=Math.max(.001,Math.max(w,h)*1e-9),outerVolume=w*w*h/3,cavityVolume=iw*iw*ih/3,shellVolume=outerVolume-cavityVolume;
 if(!(minimumClearanceMeters>=minimumSupported)||![outerVolume,cavityVolume,shellVolume].every(x=>Number.isFinite(x)&&x>0))throw RangeError('The complete inner pyramid must lie strictly inside every outer face, including base corners and apex, with positive supported clearance.');
 return Object.freeze({outerBaseWidthMeters:w,outerHeightMeters:h,innerBaseWidthMeters:iw,innerHeightMeters:ih,innerBaseZMeters:b,minimumClearanceMeters,cavityVolumeMeters3:cavityVolume,referenceShellVolumeMeters3:shellVolume});
}
export function hollowPyramidConfiguration(input:HollowPyramidConfiguration):HollowPyramidConfiguration{
 const d=hollowPyramidDimensions(input),surfaces={} as Record<HollowPyramidRole,{surfaceId:string;terrainId:string}>;
 const valid=(s:unknown)=>typeof s==='string'&&s.trim().length>0&&s.length<=128;
 if(input.provider!=='physical-hollow-pyramid'||input.version!==1||!valid(input.worldId)||!input.surfaces)throw RangeError('Version 1 physical hollow pyramid and World identity required.');
 for(const r of HOLLOW_PYRAMID_ROLES){const s=input.surfaces[r];if(!s||!valid(s.surfaceId)||!valid(s.terrainId))throw RangeError('Both independent pyramid surface and terrain identities are required.');surfaces[r]=Object.freeze({surfaceId:s.surfaceId,terrainId:s.terrainId});}
 if(surfaces.exterior.surfaceId===surfaces.interior.surfaceId||surfaces.exterior.terrainId===surfaces.interior.terrainId)throw RangeError('Hollow pyramid banks must have distinct identities.');
 return Object.freeze({provider:'physical-hollow-pyramid',version:1,worldId:input.worldId,outerBaseWidthMeters:d.outerBaseWidthMeters,outerHeightMeters:d.outerHeightMeters,innerBaseWidthMeters:d.innerBaseWidthMeters,innerHeightMeters:d.innerHeightMeters,innerBaseZMeters:d.innerBaseZMeters,surfaces:Object.freeze(surfaces)});
}
export function hollowPyramidSurface(c:HollowPyramidConfiguration,role:HollowPyramidRole){if(!HOLLOW_PYRAMID_ROLES.includes(role))throw RangeError('Unknown pyramid bank.');const config=hollowPyramidConfiguration(c);return createPyramidGeometry({provider:'physical-square-pyramid',version:1,identity:{worldId:config.worldId,surfaceId:config.surfaces[role].surfaceId},role,baseWidthMeters:role==='exterior'?config.outerBaseWidthMeters:config.innerBaseWidthMeters,heightMeters:role==='exterior'?config.outerHeightMeters:config.innerHeightMeters,baseZMeters:role==='exterior'?0:config.innerBaseZMeters} satisfies PyramidConfiguration);}
export function hollowPyramidElevationLimit(c:HollowPyramidConfiguration,role:HollowPyramidRole){const d=hollowPyramidDimensions(c);if(!HOLLOW_PYRAMID_ROLES.includes(role))throw RangeError('Unknown pyramid bank.');return Math.min(d.minimumClearanceMeters/4,(role==='exterior'?Math.min(d.outerBaseWidthMeters,d.outerHeightMeters):Math.min(d.innerBaseWidthMeters,d.innerHeightMeters))/8);}
