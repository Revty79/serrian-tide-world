import type {SurfacePosition} from './contracts.ts';
import type {PolyhedronGeometry} from './polyhedron-contract.ts';
type PolyhedronFace=string;type PolyhedronPosition=SurfacePosition;
import {polyhedronUnfoldings,polyhedronRouteCertificate} from './polyhedron-path.ts';
import * as I from './pyramid-interval.ts';
import {paintingStage} from '../editor/painting-metrics.ts';
import {polyhedronLocalDomain} from './polyhedron-local-domain.ts';
import {polyhedronPositionBounds,polyhedronPhysicalLength} from './polyhedron-physical-bounds.ts';
type Route=ReturnType<typeof polyhedronUnfoldings>[number];
interface Linear{readonly c:number;readonly u:number;readonly v:number;readonly error:number}
type LinearPoint=readonly[Linear,Linear];
const zero=I.exact(0);
/** u/v are in [0,1]. Coefficient intervals already enclose all unfolding and
 * source arithmetic. The extra 512 eps sum exceeds gamma_8, coefficient-center
 * rounding and final-bound rounding; 512 MIN_VALUE covers underflow. This
 * bounded affine evaluation replaces repeated interval matrix reconstruction,
 * not the distance or falloff certificate. */
function linear(c:I.Interval,u:I.Interval,v:I.Interval):Linear{const mid=(a:I.Interval)=>a[0]+(a[1]-a[0])/2,values=[c,u,v].map(mid),width=[c,u,v].reduce((sum,a,k)=>sum+Math.max(Math.abs(values[k]!-a[0]),Math.abs(a[1]-values[k]!)),0),magnitude=[c,u,v].reduce((sum,a)=>sum+Math.max(Math.abs(a[0]),Math.abs(a[1])),0);return{c:values[0]!,u:values[1]!,v:values[2]!,error:width+512*Number.EPSILON*magnitude+512*Number.MIN_VALUE};}
const evaluate=(l:Linear,p:PolyhedronPosition):I.Interval=>{const value=l.c+l.u*p.u+l.v*p.v;return[value-l.error,value+l.error];};
const subtract=I.pointSubtract,cross=I.pointCross;
function native(g:PolyhedronGeometry,face:PolyhedronFace){const v=g.chartVertexBounds(face);return{u:v[1]!,v:v[g.isTriangle(face)?2:3]!};}
const apply=(t:Route['placements'][number]['bounds'],p:I.IntervalPoint):I.IntervalPoint=>[I.add(I.subtract(I.multiply(t.a,p[0]),I.multiply(t.b,p[1])),t.x),I.add(I.add(I.multiply(t.b,p[0]),I.multiply(t.a,p[1])),t.y)];
function fromPoint(g:PolyhedronGeometry,p:PolyhedronPosition):I.IntervalPoint{const n=native(g,p.patchId);return[I.add(I.multiply(n.u[0],I.exact(p.u)),I.multiply(n.v[0],I.exact(p.v))),I.add(I.multiply(n.u[1],I.exact(p.u)),I.multiply(n.v[1],I.exact(p.v)))];}
/** Exact chart membership certifies a source/end portal without strict side
 * signs. TwoSum's residual must be zero for the implicit triangle weight: a
 * rounded u+v==1 alone does not prove that the binary64 inputs sum exactly to 1. */
export function trianglePortalEndpoint(g:PolyhedronGeometry,p:PolyhedronPosition,edge:readonly[number,number]){
 if(!g.isTriangle(p.patchId))return false;const sum=p.u+p.v,b=sum-p.u,error=(p.u-(sum-b))+(p.v-b),zero=[sum===1&&error===0,p.u===0,p.v===0];return g.vertexIds(p.patchId).every((id,k)=>edge.includes(id)||zero[k]);
}
function makeRoute(g:PolyhedronGeometry,start:PolyhedronPosition,route:Route){const origin=fromPoint(g,start),target=route.placements.at(-1)!.bounds,n=native(g,route.placements.at(-1)!.face),b0=subtract(apply(target,[zero,zero]),origin),bu=subtract(apply(target,n.u),apply(target,[zero,zero])),bv=subtract(apply(target,n.v),apply(target,[zero,zero])),delta:LinearPoint=[linear(b0[0],bu[0],bv[0]),linear(b0[1],bu[1],bv[1])];
 const portals=route.edges.map(([i,j],k)=>{const placement=route.placements[k]!,ids=g.vertexIds(placement.face),p=subtract(placement.bounds.vertices[ids.indexOf(i)]!,origin),q=subtract(placement.bounds.vertices[ids.indexOf(j)]!,origin),edge=subtract(q,p),fixed=cross(edge,[I.neg(p[0]),I.neg(p[1])]),cp=linear(cross(b0,p),cross(bu,p),cross(bv,p)),cq=linear(cross(b0,q),cross(bu,q),cross(bv,q)),last=linear(I.add(fixed,cross(edge,b0)),cross(edge,bu),cross(edge,bv)),den=linear(cross(b0,edge),cross(bu,edge),cross(bv,edge)),num=cross(p,edge);return{cp,cq,fixed,last,den,num};});
 return{route,delta,portals,startsOnFirst:!!route.edges.length&&trianglePortalEndpoint(g,start,route.edges[0]!)};
}
type PreparedRoute=ReturnType<typeof makeRoute>;
interface SourceState{start:PolyhedronPosition;aliases:Map<PolyhedronFace,PolyhedronPosition>;routes:Map<PolyhedronFace,PreparedRoute[]>;localRoutes:Map<PolyhedronFace,PreparedRoute[]>;direct:Map<PolyhedronFace,LinearPoint>;domainChecked:boolean;domain?:ReturnType<typeof polyhedronLocalDomain>}
const cache=new WeakMap<PolyhedronGeometry,SourceState>();
function source(g:PolyhedronGeometry,start:PolyhedronPosition){let state=cache.get(g);if(!state||state.start.patchId!==start.patchId||state.start.u!==start.u||state.start.v!==start.v){state={start,aliases:new Map(g.aliases(start).map(p=>[p.patchId,p])),routes:new Map(),localRoutes:new Map(),direct:new Map(),domainChecked:false};cache.set(g,state);}return state;}
function straight(g:PolyhedronGeometry,start:PolyhedronPosition,end:PolyhedronPosition,state:ReturnType<typeof source>){let coefficients=state.direct.get(end.patchId);if(!coefficients){const n=native(g,end.patchId),a=fromPoint(g,start);coefficients=[linear(I.neg(a[0]),n.u[0],n.v[0]),linear(I.neg(a[1]),n.u[1],n.v[1])];state.direct.set(end.patchId,coefficients);}return I.pointLength([evaluate(coefficients[0],end),evaluate(coefficients[1],end)]);}
function sameSign(a:I.Interval,b:I.Interval){return a[0]>0&&b[0]>0||a[1]<0&&b[1]<0;}
function possible(g:PolyhedronGeometry,route:PreparedRoute,end:PolyhedronPosition){let previous=0,previousUpper=0,feasible=true;const opposite=(a:I.Interval,b:I.Interval)=>a[1]<0&&b[0]>0||b[1]<0&&a[0]>0;
 for(const[k,p]of route.portals.entries()){
  // The first/last segment endpoints are already inside their convex faces.
  // Exact portal membership fixes the crossing parameter to 0/1. Together
  // with ordered remaining portals, convexity gives an actual surface witness.
  if(k===0&&route.startsOnFirst){continue;}
  if(k===route.portals.length-1&&trianglePortalEndpoint(g,end,route.route.edges[k]!)){previous=previousUpper=1;continue;}
  const cp=evaluate(p.cp,end),cq=evaluate(p.cq,end),last=evaluate(p.last,end);if(sameSign(cp,cq)||sameSign(p.fixed,last))return false;feasible&&=opposite(cp,cq)&&opposite(p.fixed,last);const den=evaluate(p.den,end);if(den[0]<=0&&den[1]>=0){feasible=false;continue;}const t=I.divide(p.num,den);if(t[1]<0||t[0]>1||previous>t[1])return false;feasible&&=t[0]>=previousUpper&&t[0]>=0&&t[1]<=1;previous=Math.max(previous,t[0]);previousUpper=Math.max(previousUpper,t[1]);}return{feasible};}
function enclosure(g:PolyhedronGeometry,prepared:readonly PreparedRoute[],end:PolyhedronPosition){
 let lower=Infinity,upper=Infinity;const surviving:Route[]=[];
 for(const route of prepared){const proof=possible(g,route,end);if(!proof)continue;const length=I.pointLength([evaluate(route.delta[0],end),evaluate(route.delta[1],end)]);surviving.push(route.route);lower=Math.min(lower,length[0]);if(proof.feasible)upper=Math.min(upper,length[1]);}
 return{lower:Math.max(0,lower),upper,surviving};
}
/** Compile an explicitly complete, geometry-qualified straight-route set. The
 * caller owns its domain proof and vertex propagation. This exposes the same
 * accepted portal certificates without preparing the unrestricted face graph. */
export function preparePolyhedronRouteEnclosures(g:PolyhedronGeometry,start:SurfacePosition,routes:readonly Route[]){const prepared=routes.map(r=>makeRoute(g,g.normalize(start),r));return(end:SurfacePosition)=>enclosure(g,prepared,g.normalize(end));}
/** Strict crossings or exact endpoint membership prove that the unfolded segment
 * intersects every portal in order. Convex face segments are then a
 * real feasible witness. Ambiguous grazing routes still contribute lower bounds;
 * without a sufficiently narrow global enclosure they use the original solver. */
export function preparedPolyhedronDistance(g:PolyhedronGeometry,a:SurfacePosition,b:SurfacePosition,options:{absoluteToleranceMeters?:number;maxBoxes?:number},witness=false){const start=g.normalize(a),end=g.normalize(b),state=source(g,start),tolerance=options.absoluteToleranceMeters??g.scaleMeters*1e-6;if(!Number.isFinite(tolerance)||tolerance<=0||!Number.isInteger(options.maxBoxes??32768)||(options.maxBoxes??32768)<1)throw RangeError('Invalid pyramid distance options.');let common=state.aliases.get(end.patchId),target=end;
 // The straight segment in ONE convex planar physical polygon is an actual
 // surface route and attains the ambient lower bound. Its chart diagonal is
 // merely an atlas boundary. Reconstruct through those charts only; no route
 // leaving the physical face can be shorter. This is not an interior shortcut.
 if(g.physicalFaceId&&start.patchId!==end.patchId&&g.physicalFaceId(start.patchId)===g.physicalFaceId(end.patchId)){
  const length=polyhedronPhysicalLength(polyhedronPositionBounds(g,start),polyhedronPositionBounds(g,end));
  if(witness){const faces=g.faces.filter(f=>g.physicalFaceId!(f)===g.physicalFaceId!(start.patchId));return{onlyRoutes:polyhedronUnfoldings(g,start.patchId,end.patchId,faces),consideredRoutes:1};}
  if(length[1]-length[0]<=tolerance)return{scope:'global-reference-surface' as const,lowerBoundMeters:Math.max(0,length[0]),upperBoundMeters:length[1],evaluatedBoxes:0,evaluatedRoutes:1};
 }
 if(!common&&(end.u===0||end.v===0||end.u+end.v===1||!g.isTriangle(end.patchId)&&(end.u===1||end.v===1))){for(const alias of g.aliases(end)){const match=state.aliases.get(alias.patchId);if(match){common=match;target=alias;break;}}}
 if(common){const value=common.u===target.u&&common.v===target.v?[0,0] as const:straight(g,common,target,state);if(value[1]-value[0]>tolerance)return;
  if(witness&&g.physicalFaceId){
   const exactBoundary=(p:SurfacePosition)=>{const sum=p.u+p.v,b=sum-p.u;return g.isTriangle(p.patchId)&&(p.u===0||p.v===0||sum===1&&(p.u-(sum-b))+(p.v-b)===0);};
   if((common.patchId===start.patchId||exactBoundary(start))&&(target.patchId===end.patchId||exactBoundary(end))){
    // A segment in the shared convex chart attains the ambient lower bound.
    // Original endpoint charts join it at certified zero-length portals. Retain
    // all routes in those endpoint stars for the existing exact witness solver;
    // an outside route cannot beat that actual straight surface segment.
    const endFaces=new Set(g.aliases(end).map(p=>p.patchId)),faces=g.faces.filter(f=>state.aliases.has(f)||endFaces.has(f)),routes=polyhedronUnfoldings(g,start.patchId,end.patchId,faces);return{onlyRoutes:routes,consideredRoutes:routes.length};
   }
  }
  // A rounded alias is not exact portal membership. For polygon witnesses let
  // the certified local-domain/polyline path below handle that ambiguity.
  if(!(witness&&g.physicalFaceId))return{scope:'global-reference-surface' as const,lowerBoundMeters:Math.max(0,value[0]),upperBoundMeters:value[1],evaluatedBoxes:0,evaluatedRoutes:1};}
 if(!state.domainChecked){state.domainChecked=true;state.domain=paintingStage('polyhedronDomainCertificate',()=>polyhedronLocalDomain(g,start));}
 const domain=state.domain;
 if(domain&&domain.escapeLowerBoundMeters>0&&domain.faces.includes(end.patchId)){
  let local=state.localRoutes.get(end.patchId);if(!local){local=paintingStage('polyhedronSourcePreparation',()=>polyhedronUnfoldings(g,start.patchId,end.patchId,domain.faces).map(route=>makeRoute(g,start,route)));state.localRoutes.set(end.patchId,local);}
  if(local.length<=(options.maxBoxes??32768)){
   const e=enclosure(g,local,end);
   if(Number.isFinite(e.upper)&&e.upper<domain.escapeLowerBoundMeters&&e.upper-e.lower<=tolerance){
    if(witness)return{onlyRoutes:e.surviving,consideredRoutes:local.length};
    return{scope:'global-reference-surface' as const,lowerBoundMeters:e.lower,upperBoundMeters:e.upper,evaluatedBoxes:0,evaluatedRoutes:local.length,certifiedDomainFaces:domain.faces.length,escapeLowerBoundMeters:domain.escapeLowerBoundMeters};
   }
   if(g.physicalFaceId&&e.surviving.length){
    // Near a join, interval portal signs can be ambiguous even though a real
    // local polyline is extremely short. Ask the ORIGINAL witness solver for
    // that upper bound before compiling global routes. Only its existing tight
    // certificate plus the same escape proof can establish global optimality.
    try{const c=polyhedronRouteCertificate(g,start,end,e.surviving,options);if(c.upperBoundMeters<domain.escapeLowerBoundMeters){if(witness)return{onlyRoutes:e.surviving,consideredRoutes:local.length};return{scope:'global-reference-surface' as const,...c,evaluatedBoxes:0,evaluatedRoutes:local.length,certifiedDomainFaces:domain.faces.length,escapeLowerBoundMeters:domain.escapeLowerBoundMeters};}}
    catch(error){if(!(error instanceof RangeError))throw error;}
   }
  }
 }
 let prepared=state.routes.get(end.patchId);if(!prepared){prepared=paintingStage('polyhedronSourcePreparation',()=>polyhedronUnfoldings(g,start.patchId,end.patchId).map(route=>makeRoute(g,start,route)));if(g.physicalFaceId&&state.routes.size>=4)state.routes.delete(state.routes.keys().next().value!);state.routes.set(end.patchId,prepared);}if(prepared.length>(options.maxBoxes??32768))throw RangeError('Pyramid route work budget exhausted.');
 // Retain all possible route bounds for the caller's exact witness selection.
 const {lower,upper,surviving}=enclosure(g,prepared,end);if(!surviving.length)return;
 if(!witness&&Number.isFinite(upper)&&upper-lower<=tolerance)return{scope:'global-reference-surface' as const,lowerBoundMeters:lower,upperBoundMeters:upper,evaluatedBoxes:0,evaluatedRoutes:prepared.length};return{onlyRoutes:surviving,consideredRoutes:prepared.length};
}
