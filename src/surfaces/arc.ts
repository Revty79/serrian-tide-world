import{assertIdentity,type SurfaceIdentity}from'./contracts.ts';
import{polygonPrismGeometry,type PrismWallRegion}from'./polygon-prism.ts';
import{crescentSinCos}from'./crescent.ts';
import type{PolyhedronPhysicalBounds}from'./polyhedron-contract.ts';import*as I from'./pyramid-interval.ts';

export const ARC_SEGMENTS=30;
export interface ArcDimensions{readonly worldSizeMeters:number;readonly curvature:number;readonly arcSpanDegrees:number;readonly bodyWidthRatio:number;readonly thicknessRatio:number;readonly endShape:'flat'|'beveled'}
export interface ArcConfiguration extends ArcDimensions{readonly provider:'physical-prismatic-arc';readonly version:1;readonly identity:SurfaceIdentity;readonly role:'exterior'}
export function arcEndCutLowerBound(barrier:number,A:PolyhedronPhysicalBounds,B:PolyhedronPhysicalBounds){return A[0][1]<=barrier&&B[0][1]<=barrier&&(A[2][0]>0&&B[2][1]<0||A[2][1]<0&&B[2][0]>0)?Math.max(0,I.subtract(I.multiply(I.exact(barrier),I.exact(2)),I.add(A[0],B[0]))[0]):0;}
/** Uniform physical scale, a circular generating centerline and genuine bounded
 * span. The generated straight facets define the actual reference solid. */
export function arcDimensions(input:ArcDimensions){const{worldSizeMeters:S,curvature:c,arcSpanDegrees:a,bodyWidthRatio:w,thicknessRatio:h,endShape}=input;
 if(![S,c,a,w,h].every(Number.isFinite)||S<100000||S>1e9||c<.8||c>1.6||a<30||a>358||w<.08||w>.25||h<.2*w||h>.6*w||!['flat','beveled'].includes(endShape))throw RangeError('Arc requires scale 100,000–1,000,000,000 m, curvature 0.8–1.6, span 30–358 degrees, body width 8–25% of scale and thickness 20–60% of body width.');
 const centerRadiusMeters=S/(2*c),bodyWidthMeters=S*w,arcSpanRadians=a*Math.PI/180;
 return Object.freeze({worldSizeMeters:S,curvature:c,arcSpanDegrees:a,bodyWidthRatio:w,thicknessRatio:h,endShape,arcSpanRadians,centerRadiusMeters,innerRadiusMeters:centerRadiusMeters-bodyWidthMeters/2,outerRadiusMeters:centerRadiusMeters+bodyWidthMeters/2,bodyWidthMeters,thicknessMeters:S*h,collarAngleRadians:Math.min(arcSpanRadians/ARC_SEGMENTS,bodyWidthMeters/(4*centerRadiusMeters))});
}
function buildArcGeometry(input:ArcConfiguration){assertIdentity(input.identity);if(input.provider!=='physical-prismatic-arc'||input.version!==1||input.role!=='exterior')throw RangeError('Unsupported Arc geometry.');
 const d=arcDimensions(input),identity=Object.freeze({...input.identity}),metadata=Object.freeze({provider:input.provider,version:1 as const,identity,role:input.role,...d}),N=ARC_SEGMENTS,a=d.arcSpanRadians/2;
 const angles=Object.freeze(Array.from({length:N+1},(_,i)=>i===0?-a:i===N?a:(2*(i-1)/(N-2)-1)*(a-d.collarAngleRadians)));
 const chain=(sign:1|-1)=>angles.map((theta,i)=>{const width=d.bodyWidthMeters*(d.endShape==='beveled'&&(i===0||i===N)?.75:1),r=d.centerRadiusMeters+sign*width/2,{s,c}=crescentSinCos(theta);return[r*c,r*s]as const;});
 const O=chain(1),I=chain(-1),outline=[...O,...I.toReversed()],outer=O.map((_,i)=>i),inner=I.map((_,i)=>2*N+1-i),wallRegions=outline.map((_,i):PrismWallRegion=>i<N?'outer':i===N?'second-end':i===2*N+1?'first-end':'inner');
 const g=polygonPrismGeometry({metadata,outline,outer,inner,wallRegions,scaleMeters:d.worldSizeMeters/2});
 const boundaryBounds=outline.map((p,i):PolyhedronPhysicalBounds=>{const q=outline[(i+1)%outline.length]!;return[[Math.min(p[0],q[0]),Math.max(p[0],q[0])],[-d.thicknessMeters/2,d.thicknessMeters/2],[Math.min(p[1],q[1]),Math.max(p[1],q[1])]];}),barrier=g.outline[g.inner[N/2]!]![0];
 return Object.freeze({...g,angles,boundaryDistanceLowerBound:(p:PolyhedronPhysicalBounds,edge:number)=>arcEndCutLowerBound(barrier,p,boundaryBounds[edge]!),terminalWidthMeters:d.bodyWidthMeters*(d.endShape==='beveled'?.75:1),terminalSeparationMeters:Math.hypot(I[0]![0]-I[N]![0],I[0]![1]-I[N]![1]),longitudinalSector:(face:string)=>{const id=g.physicalFaceId(face),i=Number(id.slice(id.lastIndexOf('-')+1));return!id.startsWith('wall-')?i:i<N?i:i===N?N-1:i===2*N+1?0:2*N-i;}});
}
export type ArcGeometry=ReturnType<typeof buildArcGeometry>;
let retained:{key:string;geometry:ArcGeometry}|undefined;
/** One immutable geometry entry, without terrain, view, history or edit state. */
export function createArcGeometry(input:ArcConfiguration):ArcGeometry{assertIdentity(input.identity);if(input.provider!=='physical-prismatic-arc'||input.version!==1||input.role!=='exterior')throw RangeError('Unsupported Arc geometry.');const dimensions=arcDimensions(input),key=JSON.stringify({provider:input.provider,version:input.version,role:input.role,identity:{worldId:input.identity.worldId,surfaceId:input.identity.surfaceId},...dimensions});if(retained?.key===key)return retained.geometry;const geometry=buildArcGeometry(input);retained={key,geometry};return geometry;}
