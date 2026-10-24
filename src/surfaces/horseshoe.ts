import{assertIdentity,type SurfaceIdentity}from'./contracts.ts';import{polygonPrismGeometry,type PrismWallRegion}from'./polygon-prism.ts';import{crescentSinCos}from'./crescent.ts';
export const HORSESHOE_ARM_SEGMENTS=6,HORSESHOE_BEND_SEGMENTS=16,HORSESHOE_SEGMENTS=28;
export interface HorseshoeDimensions{readonly worldSizeMeters:number;readonly bendCurvature:number;readonly armLengthRatio:number;readonly armSpacingRatio:number;readonly bodyWidthRatio:number;readonly thicknessRatio:number;readonly endShape:'flat'|'beveled'}
export interface HorseshoeConfiguration extends HorseshoeDimensions{readonly provider:'physical-prismatic-horseshoe';readonly version:1;readonly identity:SurfaceIdentity;readonly role:'exterior'}
/** Scale is a uniform physical unit. The remaining dimensions are fractions of
 * that scale, so changing it actually scales the entire material solid. */
export function horseshoeDimensions(input:HorseshoeDimensions){const{worldSizeMeters:S,bendCurvature:c,armLengthRatio:l,armSpacingRatio:s,bodyWidthRatio:w,thicknessRatio:h,endShape}=input;
 if(![S,c,l,s,w,h].every(Number.isFinite)||S<100000||S>1e9||c<.8||c>1.6||l<.15||l>1||w<.08||w>.25||s<1.05*w||s>.9||h<.2*w||h>.6*w||!['flat','beveled'].includes(endShape))throw RangeError('Horseshoe requires scale 100,000–1,000,000,000 m, bend curvature 0.8–1.6, arm length 15–100%, body width 8–25%, spacing at least 105% of body width and at most 90% of scale, and thickness 20–60% of body width.');
 return Object.freeze({worldSizeMeters:S,bendCurvature:c,armLengthRatio:l,armSpacingRatio:s,bodyWidthRatio:w,thicknessRatio:h,endShape,bendRadiusMeters:S/(2*c),armLengthMeters:S*l,armSpacingMeters:S*s,bodyWidthMeters:S*w,thicknessMeters:S*h});
}
function buildHorseshoeGeometry(input:HorseshoeConfiguration){assertIdentity(input.identity);if(input.provider!=='physical-prismatic-horseshoe'||input.version!==1||input.role!=='exterior')throw RangeError('Unsupported Horseshoe geometry.');const d=horseshoeDimensions(input),identity=Object.freeze({...input.identity}),metadata=Object.freeze({provider:input.provider,version:1 as const,identity,role:input.role,...d}),r=d.bendRadiusMeters,b=d.armSpacingMeters/2,W=d.bodyWidthMeters,L=d.armLengthMeters,A=HORSESHOE_ARM_SEGMENTS,B=HORSESHOE_BEND_SEGMENTS,S=HORSESHOE_SEGMENTS;
 const O:([number,number])[]=[],I:([number,number])[]=[],terminal=d.endShape==='beveled'?.75:1,neck=L-W/4;
 const arm=(x:number,sign:1|-1,width:number)=>{O.push([x,sign*(b+width/2)]);I.push([x,sign*(b-width/2)]);};
 for(let i=0;i<=A;i++)arm(i===0?L:neck*(A-i)/(A-1),1,i===0?W*terminal:W);
 for(let j=1;j<=B;j++){const t=2*j/B-1,{s,c}=crescentSinCos(Math.PI*t/2);O.push(j===B?[0,-b-W/2]:[-(r+W/2)*c,-(b+W/2)*s]);I.push(j===B?[0,-b+W/2]:[-(r-W/2)*c,-(b-W/2)*s]);}
 for(let i=1;i<=A;i++)arm(i===A?L:neck*i/(A-1),-1,i===A?W*terminal:W);
 const points=[...O,...I.toReversed()],outer=O.map((_,i)=>i),inner=I.map((_,i)=>2*S+1-i),wallRegions=points.map((_,i):PrismWallRegion=>i<S?'outer':i===S?'second-end':i===2*S+1?'first-end':'inner'),g=polygonPrismGeometry({metadata,outline:points,outer,inner,wallRegions,scaleMeters:d.worldSizeMeters/2});
 // The central bend and both straight arms are real connected material, with
 // positive-width terminal faces. All upper/lower partitions are welded.
 return Object.freeze({...g,longitudinalSector:(face:string)=>{const id=g.physicalFaceId(face),i=Number(id.slice(id.lastIndexOf('-')+1));return !id.startsWith('wall-')?i:i<S?i:i===S?S-1:i===2*S+1?0:2*S-i;},centralOpeningMeters:d.armSpacingMeters-W,terminalWidthMeters:W*terminal});
}
export type HorseshoeGeometry=ReturnType<typeof buildHorseshoeGeometry>;let retained:{key:string;geometry:HorseshoeGeometry}|undefined;
export function createHorseshoeGeometry(input:HorseshoeConfiguration):HorseshoeGeometry{assertIdentity(input.identity);if(input.provider!=='physical-prismatic-horseshoe'||input.version!==1||input.role!=='exterior')throw RangeError('Unsupported Horseshoe geometry.');const dimensions=horseshoeDimensions(input),key=JSON.stringify({provider:input.provider,version:input.version,role:input.role,identity:{worldId:input.identity.worldId,surfaceId:input.identity.surfaceId},...dimensions});if(retained?.key===key)return retained.geometry;const geometry=buildHorseshoeGeometry(input);retained={key,geometry};return geometry;}
