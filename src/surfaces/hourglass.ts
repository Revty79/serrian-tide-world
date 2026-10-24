import {assertIdentity,type SurfaceIdentity} from './contracts.ts';
import {createAxialGeometry,type AxialProfile} from './axial.ts';

export interface HourglassDimensions {
 readonly worldSizeMeters:number;readonly heightRatio:number;
 readonly firstEndRatio:number;readonly secondEndRatio:number;
 readonly waistRadiusRatio:number;readonly waistPosition:number;
 readonly flareShape:'straight'|'curved';readonly endShape:'flat';
}
export interface HourglassConfiguration extends HourglassDimensions {
 readonly provider:'physical-faceted-hourglass';readonly version:1;
 readonly identity:SurfaceIdentity;readonly role:'exterior';
}
export const HOURGLASS_DEFAULT_DIMENSIONS=Object.freeze({worldSizeMeters:2000000,heightRatio:.8,firstEndRatio:1,secondEndRatio:1,waistRadiusRatio:.35,waistPosition:.5,flareShape:'curved' as const,endShape:'flat' as const});
export function hourglassDimensions(p:HourglassDimensions){
 const {worldSizeMeters:S,heightRatio:h,firstEndRatio:a,secondEndRatio:b,waistRadiusRatio:w,waistPosition:c,flareShape,endShape}=p;
 if(![S,h,a,b,w,c].every(Number.isFinite)||S<100000||S>1e9||h<.4||h>1.5||a<.8||a>1.2||b<.8||b>1.2||w<.25||w>.6||c<.35||c>.65||!['straight','curved'].includes(flareShape)||endShape!=='flat')throw RangeError('Hourglass requires World Size 100,000–1,000,000,000 m, height 40–150% of Size, end widths 40–60% of Size, waist width 25–60% of the smaller end, waist position 35–65%, a supported flare and flat ends.');
 const heightMeters=S*h,firstEndRadiusMeters=S*a/4,secondEndRadiusMeters=S*b/4,waistRadiusMeters=Math.min(firstEndRadiusMeters,secondEndRadiusMeters)*w,waistLengthMeters=heightMeters*.15,waistCenterMeters=(c-.5)*heightMeters,firstJoinMeters=waistCenterMeters-waistLengthMeters/2,secondJoinMeters=waistCenterMeters+waistLengthMeters/2,firstFlareLengthMeters=firstJoinMeters+heightMeters/2,secondFlareLengthMeters=heightMeters/2-secondJoinMeters;
 return Object.freeze({...p,heightMeters,firstEndRadiusMeters,secondEndRadiusMeters,waistRadiusMeters,waistLengthMeters,waistCenterMeters,firstJoinMeters,secondJoinMeters,firstFlareLengthMeters,secondFlareLengthMeters,extentMeters:heightMeters});
}
/** Two outward-flaring polygonal frusta, each with four axial segments, a
 * positive-length waist and two planar closed caps. Curved uses a gently
 * concave radius profile sampled at four exact stations; facets, including
 * intentional slope creases, define the actual physical reference solid. */
export function createHourglassGeometry(input:HourglassConfiguration){
 assertIdentity(input.identity);if(input.provider!=='physical-faceted-hourglass'||input.version!==1||input.role!=='exterior')throw RangeError('Unsupported Hourglass geometry.');
 const d=hourglassDimensions(input),identity=Object.freeze({...input.identity});
 const metadata=Object.freeze({provider:input.provider,version:1 as const,identity,role:input.role,worldSizeMeters:d.worldSizeMeters,heightRatio:d.heightRatio,firstEndRatio:d.firstEndRatio,secondEndRatio:d.secondEndRatio,waistRadiusRatio:d.waistRadiusRatio,waistPosition:d.waistPosition,flareShape:d.flareShape,endShape:d.endShape,heightMeters:d.heightMeters,firstEndRadiusMeters:d.firstEndRadiusMeters,secondEndRadiusMeters:d.secondEndRadiusMeters,waistRadiusMeters:d.waistRadiusMeters,waistLengthMeters:d.waistLengthMeters,waistCenterMeters:d.waistCenterMeters,firstJoinMeters:d.firstJoinMeters,secondJoinMeters:d.secondJoinMeters,firstFlareLengthMeters:d.firstFlareLengthMeters,secondFlareLengthMeters:d.secondFlareLengthMeters,extentMeters:d.extentMeters});
 const flare=(t:number)=>d.flareShape==='straight'?t:1.25*t-.25*t*t;
 const first=Array.from({length:5},(_,i)=>{const t=1-i/4;return[-d.heightMeters/2+i*d.firstFlareLengthMeters/4,d.waistRadiusMeters+(d.firstEndRadiusMeters-d.waistRadiusMeters)*flare(t)] as const;}),second=Array.from({length:5},(_,i)=>{const t=i/4;return[d.secondJoinMeters+i*d.secondFlareLengthMeters/4,d.waistRadiusMeters+(d.secondEndRadiusMeters-d.waistRadiusMeters)*flare(t)] as const;});
 const profile=[[-d.heightMeters/2,0],...first,...second,[d.heightMeters/2,0]] as unknown as AxialProfile;
 const g=createAxialGeometry(metadata,profile,d.worldSizeMeters,{firstRadiusMeters:d.firstEndRadiusMeters,secondRadiusMeters:d.secondEndRadiusMeters,waistRadiusMeters:d.waistRadiusMeters,firstJoinMeters:d.firstJoinMeters,secondJoinMeters:d.secondJoinMeters,extentMeters:d.extentMeters});
 return Object.freeze({...g,gradientRegionId:(face:string)=>{const id=g.physicalFaceId(face);if(id.startsWith('first-terminal'))return'first-cap';if(id.startsWith('second-terminal'))return'second-cap';const [,band,sector]=id.split('-');return d.flareShape==='straight'&&Number(band)!==4?`${Number(band)<4?'first':'second'}-sector-${sector}`:id;}});
}
export type HourglassGeometry=ReturnType<typeof createHourglassGeometry>;
export {axialBandPosition as hourglassBandPosition} from './axial.ts';
