import {assertIdentity,type SurfaceIdentity,type SurfacePosition,type SurfaceTangent} from './contracts.ts';
import {triangulatedPolygonGeometry} from './triangulated-polygon.ts';
import {freezePolyhedronArrays,type PolyhedronPhysicalBounds,type PolyhedronVector} from './polyhedron-contract.ts';
import {pyramidCross,pyramidDot,pyramidSub} from './pyramid.ts';
import * as I from './pyramid-interval.ts';

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
export function createCrescentGeometry(input:CrescentConfiguration){
 assertIdentity(input.identity);const d=crescentDimensions(input);
 if(input.provider!=='physical-prismatic-crescent'||input.version!==1||input.role!=='exterior')throw RangeError('Unsupported Crescent geometry.');
 const identity=Object.freeze({...input.identity}),metadata=Object.freeze({provider:input.provider,version:1 as const,identity,role:input.role,...d});
 const S=CRESCENT_SEGMENTS,R=d.worldSizeMeters/2,a=(360-d.openingDegrees)*Math.PI/360,q=d.tipShape==='full'?.4:0;
 const points:([number,number])[]=[],outer:number[]=[],inner:number[]=[];
 const point=(i:number,sign:number)=>{const t=2*i/S-1,{s,c}=crescentSinCos(a*t),b=crescentSinCos(Math.PI*t/2).c,f=i===0||i===S?0:b*(1+q*(1-b*b)),r=R+sign*d.bodyWidthMeters*f/2;return[d.curvature*r*c,r*s] as [number,number];};
 for(let i=0;i<=S;i++){outer.push(points.length);points.push(point(i,1));}
 inner[S]=outer[S]!;inner[0]=outer[0]!;
 for(let i=S-1;i>0;i--){inner[i]=points.length;points.push(point(i,-1));}
 const outline=Object.freeze(points.map(p=>Object.freeze(p))),M=outline.length;
 const vertices=freezePolyhedronArrays([d.thicknessMeters/2,-d.thicknessMeters/2].flatMap(y=>outline.map(([x,z])=>[x,y,z] as PolyhedronVector)));
 const vertexBounds=freezePolyhedronArrays(vertices.map(v=>v.map(I.exact) as unknown as PolyhedronPhysicalBounds));
 const distinct=(ids:readonly number[])=>ids.filter((v,i)=>i===0||v!==ids[i-1]).filter((v,i,all)=>i!==all.length-1||v!==all[0]);
 const polygons=[];
 for(let i=0;i<S;i++){
  const upper=distinct([outer[i]!,inner[i]!,inner[i+1]!,outer[i+1]!]);
  polygons.push(Object.freeze({id:`upper-${i}`,vertices:Object.freeze(upper)}));
  polygons.push(Object.freeze({id:`lower-${i}`,vertices:Object.freeze(upper.toReversed().map(v=>v+M))}));
 }
 for(let i=0;i<M;i++){const j=(i+1)%M;polygons.push(Object.freeze({id:`wall-${i}`,vertices:Object.freeze([i,j,j+M,i+M])}));}
 const g=triangulatedPolygonGeometry({metadata,vertices,vertexBounds,polygons:Object.freeze(polygons),scaleMeters:R,minimumDimensionMeters:d.thicknessMeters});
 const signedArea=outline.reduce((s,p,i)=>{const b=outline[(i+1)%M]!;return s+p[0]*b[1]-p[1]*b[0];},0)/2;
 if(!(signedArea>0)||g.faces.some(f=>{const frame=g.frame(f);return ![...frame.normal,...frame.u,...frame.v].every(Number.isFinite)||Math.hypot(...pyramidCross(frame.u,frame.v))<=R*R*1e-10;}))throw RangeError('Crescent geometry has a degenerate physical chart.');
 const perimeterOffsets=[0];for(let i=0;i<M;i++){const b=outline[(i+1)%M]!,p=outline[i]!;perimeterOffsets.push(perimeterOffsets[i]!+Math.hypot(b[0]-p[0],b[1]-p[1]));}
 const region=(face:string)=>{const id=g.physicalFaceId(face);return id.startsWith('upper-')?'upper':id.startsWith('lower-')?'lower':Number(id.slice(5))<S?'outer':'inner';};
 const tangent=(p:SurfacePosition,t:SurfaceTangent)=>{const f=g.frame(g.normalize(p).patchId);return f.u.map((v,k)=>v*t.du+f.v[k]!*t.dv) as unknown as PolyhedronVector;};
 return Object.freeze({...g,outline,outer:Object.freeze(outer),inner:Object.freeze(inner),segments:S,region,
  planarAreaMeters2:signedArea,volumeMeters3:signedArea*d.thicknessMeters,perimeterMeters:perimeterOffsets[M]!,perimeterOffsets:Object.freeze(perimeterOffsets),
  heightMeters:d.thicknessMeters,diameterMeters:d.worldSizeMeters,circumradiusMeters:Math.max(...vertices.map(p=>Math.hypot(...p))),
  tangentVector:tangent,metricSquared:(p:SurfacePosition,t:SurfaceTangent)=>{const v=tangent(p,t);return pyramidDot(v,v);},
  localCoordinates:(face:string,p:PolyhedronVector)=>{const f=g.frame(face),v=pyramidSub(p,f.origin),uu=pyramidDot(f.u,f.u),uv=pyramidDot(f.u,f.v),vv=pyramidDot(f.v,f.v),du=pyramidDot(v,f.u),dv=pyramidDot(v,f.v),det=uu*vv-uv*uv;return{u:(du*vv-dv*uv)/det,v:(dv*uu-du*uv)/det};},
 });
}
export type CrescentGeometry=ReturnType<typeof createCrescentGeometry>;
