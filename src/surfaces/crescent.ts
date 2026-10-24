import {assertIdentity,type SurfaceIdentity} from './contracts.ts';
import{polygonPrismGeometry}from'./polygon-prism.ts';

export const CRESCENT_SEGMENTS=32;
export interface CrescentDimensions {
 readonly worldSizeMeters:number;readonly curvature:number;readonly openingDegrees:number;
 readonly bodyWidthMeters:number;readonly thicknessMeters:number;readonly tipShape:'fine'|'full';
}
export interface CrescentConfiguration extends CrescentDimensions {
 readonly provider:'physical-prismatic-crescent';readonly version:1;readonly identity:SurfaceIdentity;readonly role:'exterior';
}
/** Fixed arithmetic, rather than host transcendental functions, reconstructs
 * exactly the same binary64 outline on every conforming JS implementation.
 * The resulting vertices DEFINE the faceted reference solid. It is not a
 * hidden smooth surface or a visual mask over a different material body. */
export function crescentSinCos(x:number){
 let s=x,c=1,st=x,ct=1;const xx=x*x;
 for(let k=1;k<=20;k++){st=-st*xx/((2*k)*(2*k+1));ct=-ct*xx/((2*k-1)*(2*k));s+=st;c+=ct;}
 return{s,c};
}
export function crescentDimensions(d:CrescentDimensions){
 const {worldSizeMeters:s,curvature:c,openingDegrees:o,bodyWidthMeters:w,thicknessMeters:h,tipShape}=d,R=s/2;
 if(![s,c,o,w,h].every(Number.isFinite)||s<100000||s>1e9||c<.8||c>1.25||o<60||o>160||w/R<.25||w/R>.6||h/w<.2||h/w>.6||!['fine','full'].includes(tipShape))throw RangeError('Crescent requires World Size 100,000–1,000,000,000 m, curvature 0.8–1.25, opening 60–160°, body width 12.5–30% of World Size, and thickness 20–60% of body width.');
 return Object.freeze({worldSizeMeters:s,curvature:c,openingDegrees:o,bodyWidthMeters:w,thicknessMeters:h,tipShape});
}
/** Closed extrusion of a tapering polygonal crescent. Its two planar caps are
 * tiled by convex strips, never one falsely convex cap. Outer/inner wall strips
 * meet at two actual terminal edges. Tip cap triangles have positive area;
 * no collapsed quad, duplicate endpoint or zero-area triangle is allocated.
 * Internal fan diagonals and cap strip joins are welded numerical charts. */
function buildCrescentGeometry(input:CrescentConfiguration){
 assertIdentity(input.identity);const d=crescentDimensions(input);
 if(input.provider!=='physical-prismatic-crescent'||input.version!==1||input.role!=='exterior')throw RangeError('Unsupported Crescent geometry.');
 const identity=Object.freeze({...input.identity}),metadata=Object.freeze({provider:input.provider,version:1 as const,identity,role:input.role,...d});
 const S=CRESCENT_SEGMENTS,R=d.worldSizeMeters/2,a=(360-d.openingDegrees)*Math.PI/360,q=d.tipShape==='full'?.4:0;
 const points:([number,number])[]=[],outer:number[]=[],inner:number[]=[];
 const point=(i:number,sign:number)=>{const t=2*i/S-1,{s,c}=crescentSinCos(a*t),b=crescentSinCos(Math.PI*t/2).c,f=i===0||i===S?0:b*(1+q*(1-b*b)),r=R+sign*d.bodyWidthMeters*f/2;return[d.curvature*r*c,r*s] as [number,number];};
 for(let i=0;i<=S;i++){outer.push(points.length);points.push(point(i,1));}
 inner[S]=outer[S]!;inner[0]=outer[0]!;
 for(let i=S-1;i>0;i--){inner[i]=points.length;points.push(point(i,-1));}
 return polygonPrismGeometry({metadata,outline:points,outer,inner,wallRegions:points.map((_,i)=>i<S?'outer' as const:'inner' as const),scaleMeters:R});
}
export type CrescentGeometry=ReturnType<typeof buildCrescentGeometry>;
let retained:{key:string;geometry:CrescentGeometry}|undefined;
/** One immutable physical/metric model survives private worker terrain epochs.
 * No terrain words, history or view state is retained by this bounded cache. */
export function createCrescentGeometry(input:CrescentConfiguration):CrescentGeometry{
 assertIdentity(input.identity);const d=crescentDimensions(input);
 if(input.provider!=='physical-prismatic-crescent'||input.version!==1||input.role!=='exterior')throw RangeError('Unsupported Crescent geometry.');
 const key=JSON.stringify({provider:input.provider,version:input.version,role:input.role,identity:{worldId:input.identity.worldId,surfaceId:input.identity.surfaceId},...d});
 if(retained?.key===key)return retained.geometry;
 const geometry=buildCrescentGeometry(input);retained={key,geometry};return geometry;
}
