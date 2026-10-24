import {assertIdentity,type SurfaceIdentity,type SurfacePosition,type SurfaceTangent} from './contracts.ts';
import {triangulatedPolygonGeometry} from './triangulated-polygon.ts';
import {freezePolyhedronArrays,type PolyhedronPhysicalBounds,type PolyhedronVector} from './polyhedron-contract.ts';
import {pyramidCross,pyramidDot,pyramidSub} from './pyramid.ts';
import * as I from './pyramid-interval.ts';

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
// Dyadic coordinates avoid a hidden ideal circular model. The slight variation
// of polygon radius is intentional and persisted by construction version 1.
const quadrant=[[1,0],[15/16,6/16],[11/16,11/16],[6/16,15/16]] as const;
const circle=Array.from({length:16},(_,k)=>{const [a,b]=quadrant[k%4]!,q=Math.floor(k/4);return(q===0?[a,b]:q===1?[-b,a]:q===2?[-a,-b]:[b,-a]) as readonly[number,number];});
export function createDumbbellGeometry(input:DumbbellConfiguration){
 assertIdentity(input.identity);if(input.provider!=='physical-faceted-dumbbell'||input.version!==1||input.role!=='exterior')throw RangeError('Unsupported Dumbbell geometry.');
 const d=dumbbellDimensions(input),identity=Object.freeze({...input.identity}),metadata=Object.freeze({provider:input.provider,version:1 as const,identity,role:input.role,...d});
 const R1=d.firstLobeRadiusMeters,R2=d.secondLobeRadiusMeters,c1=d.firstCenterMeters,c2=d.secondCenterMeters;
 const profile=freezePolyhedronArrays([
  [c1-R1,0],[c1-.875*R1,.5*R1],[c1-.5*R1,.875*R1],[c1,R1],[c1+.6*R1,.8*R1],[-d.neckLengthMeters/2,d.neckRadiusMeters],
  [d.neckLengthMeters/2,d.neckRadiusMeters],[c2-.6*R2,.8*R2],[c2,R2],[c2+.5*R2,.875*R2],[c2+.875*R2,.5*R2],[c2+R2,0],
 ] as const);
 if(profile.some((p,i)=>i>0&&p[0]<=profile[i-1]![0]))throw RangeError('Dumbbell profile must have strictly increasing axial stations.');
 const vertices:PolyhedronVector[]=[[profile[0][0],0,0]],vertexBounds:PolyhedronPhysicalBounds[]=[[I.exact(profile[0][0]),I.exact(0),I.exact(0)]];
 for(const [x,r] of profile.slice(1,-1))for(const [y,z] of circle){vertices.push([x,r*y,r*z]);vertexBounds.push([I.exact(x),I.multiply(I.exact(r),I.exact(y)),I.multiply(I.exact(r),I.exact(z))]);}
 vertices.push([profile.at(-1)![0],0,0]);
 vertexBounds.push([I.exact(profile.at(-1)![0]),I.exact(0),I.exact(0)]);
 const N=DUMBBELL_SECTORS,ring=(i:number,j:number)=>1+i*N+(j+N)%N,polygons:{id:string;vertices:readonly number[]}[]=[];
 // Winding is checked against the radial exterior below, including both poles.
 for(let j=0;j<N;j++)polygons.push({id:`first-terminal-${j}`,vertices:[0,ring(0,j+1),ring(0,j)]});
 for(let i=0;i<9;i++)for(let j=0;j<N;j++)polygons.push({id:`band-${i}-${j}`,vertices:[ring(i,j),ring(i,j+1),ring(i+1,j+1),ring(i+1,j)]});
 for(let j=0;j<N;j++)polygons.push({id:`second-terminal-${j}`,vertices:[vertices.length-1,ring(9,j),ring(9,j+1)]});
 const physicalPolygons=Object.freeze(polygons.map(p=>Object.freeze({id:p.id,vertices:Object.freeze(p.vertices)})));
 const g=triangulatedPolygonGeometry({metadata,vertices:freezePolyhedronArrays(vertices),vertexBounds:freezePolyhedronArrays(vertexBounds),polygons:physicalPolygons,scaleMeters:input.worldSizeMeters/2,minimumDimensionMeters:2*d.neckRadiusMeters});
 const signedVolume=g.faces.reduce((sum,f)=>{const [a,b,c]=g.vertexIds(f).map(i=>vertices[i]!);return sum+pyramidDot(a!,pyramidCross(b!,c!))/6;},0);
 if(!(signedVolume>0)||g.faces.some(face=>{const f=g.frame(face),p=g.referencePosition({...identity,patchId:face,u:1/3,v:1/3});return pyramidDot(f.normal,[0,p[1],p[2]])< -input.worldSizeMeters*1e-12||Math.hypot(...pyramidCross(f.u,f.v))<input.worldSizeMeters**2*1e-9;}))throw RangeError('Dumbbell has invalid winding or a degenerate chart.');
 const tangentVector=(p:SurfacePosition,t:SurfaceTangent):PolyhedronVector=>{const f=g.frame(g.normalize(p).patchId);if(![t.du,t.dv].every(Number.isFinite))throw RangeError('Finite Dumbbell tangent required.');return f.u.map((v,k)=>v*t.du+f.v[k]!*t.dv) as unknown as PolyhedronVector;};
 const vertexAngleDefectsRadians=Object.freeze(vertices.map((p,i)=>2*Math.PI-g.faces.filter(f=>g.vertexIds(f).includes(i)).reduce((sum,f)=>{const ids=g.vertexIds(f),k=ids.indexOf(i),a=pyramidSub(vertices[ids[(k+1)%3]!]!,p),b=pyramidSub(vertices[ids[(k+2)%3]!]!,p);return sum+Math.atan2(Math.hypot(...pyramidCross(a,b)),pyramidDot(a,b));},0)));
 return Object.freeze({...g,simplePhysicalFaceRoutes:true as const,profile,vertexAngleDefectsRadians,volumeMeters3:signedVolume,circumradiusMeters:Math.max(...vertices.map(p=>Math.hypot(...p))),heightMeters:2*Math.max(R1,R2),diameterMeters:d.extentMeters,
  tangentVector,metricSquared:(p:SurfacePosition,t:SurfaceTangent)=>{const v=tangentVector(p,t);return pyramidDot(v,v);},
  localCoordinates:(face:string,p:PolyhedronVector)=>{const f=g.frame(face),q=pyramidSub(p,f.origin),uu=pyramidDot(f.u,f.u),uv=pyramidDot(f.u,f.v),vv=pyramidDot(f.v,f.v),du=pyramidDot(q,f.u),dv=pyramidDot(q,f.v),det=uu*vv-uv*uv;return{u:(du*vv-dv*uv)/det,v:(dv*uu-du*uv)/det};},
 });
}
export type DumbbellGeometry=ReturnType<typeof createDumbbellGeometry>;
/** Physical bilinear position inside a planar homothetic trapezoid, resolved
 * into its existing affine triangle charts. No new terrain representation. */
export function dumbbellBandPosition(g:DumbbellGeometry,band:number,sector:number,along=.5,around=.5):SurfacePosition{
 if(!Number.isInteger(band)||band<0||band>8||!Number.isInteger(sector)||sector<0||sector>15||![along,around].every(x=>Number.isFinite(x)&&x>=0&&x<=1))throw RangeError('Invalid Dumbbell band position.');
 const polygon=g.physicalFaces.find(p=>p.id===`band-${band}-${sector}`)!,v=polygon.vertices.map(i=>g.vertices[i]!),weights=[(1-along)*(1-around),(1-along)*around,along*around,along*(1-around)],point=[0,1,2].map(k=>v.reduce((s,p,i)=>s+weights[i]!*p[k]!,0)) as unknown as PolyhedronVector;
 for(const face of g.faces.filter(f=>g.physicalFaceId(f)===polygon.id)){let {u,v}=g.localCoordinates(face,point);if(u< -1e-9||v< -1e-9||u+v>1+1e-9)continue;u=Math.max(0,Math.min(1,u));v=Math.max(0,Math.min(1,v));if(u+v>1)v=1-u;return g.normalize({...g.identity,patchId:face,u,v});}throw Error('Dumbbell band lost its physical triangle chart.');
}
