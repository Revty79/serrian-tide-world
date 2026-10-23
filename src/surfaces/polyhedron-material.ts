import type {SurfacePosition} from './contracts.ts';
import type {PolyhedronGeometry,PolyhedronVector,PolyhedronPhysicalBounds} from './polyhedron-contract.ts';
import {freezePolyhedronArrays} from './polyhedron-contract.ts';
import {pyramidDot as dot,pyramidSub as sub,pyramidUnit as unit} from './pyramid.ts';
import * as I from './pyramid-interval.ts';
export type PolyhedronRole='exterior'|'interior';
export interface PolyhedronPlane{readonly face:string;readonly normal:PolyhedronVector;readonly offset:number;readonly bounds:{readonly normal:PolyhedronPhysicalBounds;readonly offset:I.Interval;readonly normUpper:number}}
const zero=I.exact(0),vsub=(a:PolyhedronPhysicalBounds,b:PolyhedronPhysicalBounds)=>a.map((x,k)=>I.subtract(x,b[k]!)) as unknown as PolyhedronPhysicalBounds;
const vdot=(a:PolyhedronPhysicalBounds,b:PolyhedronPhysicalBounds)=>a.reduce((s,x,k)=>I.add(s,I.multiply(x,b[k]!)),zero);
const exactVector=(p:PolyhedronVector)=>p.map(I.exact) as unknown as PolyhedronPhysicalBounds;
const finite=(p:PolyhedronVector)=>{if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))throw RangeError('A finite physical position in meters is required.');return p;};
function planes(g:PolyhedronGeometry):readonly PolyhedronPlane[]{return Object.freeze(g.faces.map(face=>{
 const ids=g.vertexIds(face),a=g.physicalVertexBounds(ids[0]!),b=g.physicalVertexBounds(ids[1]!),c=g.physicalVertexBounds(ids[2]!),u=vsub(b,a),v=vsub(c,a),cross=[I.subtract(I.multiply(u[1],v[2]),I.multiply(u[2],v[1])),I.subtract(I.multiply(u[2],v[0]),I.multiply(u[0],v[2])),I.subtract(I.multiply(u[0],v[1]),I.multiply(u[1],v[0]))] as const,length=I.root(vdot(cross,cross));
 if(length[0]<=0)throw RangeError('A physical material face needs a nondegenerate certified plane.');
 const normal=freezePolyhedronArrays(cross.map(x=>I.divide(x,length))) as unknown as PolyhedronPhysicalBounds,f=g.frame(face),bounds={normal,offset:freezePolyhedronArrays(vdot(normal,a)),normUpper:I.root(vdot(normal,normal))[1]};
 if(dot(normal.map(x=>(x[0]+x[1])/2) as unknown as PolyhedronVector,f.normal)<.9)throw RangeError('Material faces must retain their actual outward winding.');
 return Object.freeze({face,normal:f.normal,offset:dot(f.normal,f.origin),bounds:Object.freeze(bounds)});
}));}
function signed(plane:PolyhedronPlane,p:PolyhedronVector){return I.subtract(vdot(plane.bounds.normal,exactVector(p)),plane.bounds.offset);}
export interface PolyhedronMaterial{
 readonly worldId:string;readonly exterior:PolyhedronGeometry;readonly interior?:PolyhedronGeometry;readonly outerPlanes:readonly PolyhedronPlane[];readonly innerPlanes:readonly PolyhedronPlane[];
 readonly scaleMeters:number;readonly guardMeters:number;readonly minimumClearanceMeters:number;readonly cavitySeedClearanceMeters?:number;readonly seed:PolyhedronVector;readonly bounds:readonly[PolyhedronVector,PolyhedronVector];
 select(p:SurfacePosition):{role:PolyhedronRole;geometry:PolyhedronGeometry;position:SurfacePosition};
}
/** Actual convex reference body, with an optional independently identified
 * cavity boundary. This descriptor owns no terrain and creates no extra bank. */
export function polyhedronMaterial(exterior:PolyhedronGeometry,interior?:PolyhedronGeometry):PolyhedronMaterial{
 if(exterior.metadata.role!=='exterior'||interior&&(interior.metadata.role!=='interior'||interior.identity.worldId!==exterior.identity.worldId||interior.identity.surfaceId===exterior.identity.surfaceId))throw RangeError('Material boundaries need distinct correctly oriented surfaces in one real World.');
 const outerPlanes=planes(exterior),innerPlanes=interior?planes(interior):Object.freeze([]),scaleMeters=exterior.scaleMeters,guardMeters=65536*Number.EPSILON*Math.max(scaleMeters,...exterior.vertices.flat().map(Math.abs)),seed=exterior.inspectionEyeMeters;
 const minimumClearanceMeters=interior?Math.min(...outerPlanes.flatMap(plane=>interior.vertices.map((_,i)=>I.subtract(plane.bounds.offset,vdot(plane.bounds.normal,interior.physicalVertexBounds(i)))[0])))-guardMeters:Math.min(...outerPlanes.map(p=>-signed(p,seed)[1]))-guardMeters;
 if(!(minimumClearanceMeters>0))throw RangeError('The complete material body/cavity needs certified positive clearance.');
 const bounds=freezePolyhedronArrays([0,1].map(side=>[0,1,2].map(k=>(side?Math.max:Math.min)(...exterior.vertices.map(v=>v[k]!))) as unknown as PolyhedronVector)) as unknown as readonly[PolyhedronVector,PolyhedronVector];
 const cavitySeedClearanceMeters=interior?Math.min(...innerPlanes.map(p=>-signed(p,interior.inspectionEyeMeters)[1]/p.bounds.normUpper))-guardMeters:undefined;
 return Object.freeze({worldId:exterior.identity.worldId,exterior,interior,outerPlanes,innerPlanes,scaleMeters,guardMeters,minimumClearanceMeters,cavitySeedClearanceMeters,seed,bounds,select:(p:SurfacePosition)=>{
  if(p.worldId!==exterior.identity.worldId)throw RangeError('Foreign physical World anchor.');const geometry=p.surfaceId===exterior.identity.surfaceId?exterior:interior&&p.surfaceId===interior.identity.surfaceId?interior:undefined;
  if(!geometry)throw RangeError('Unknown actual polyhedron terrain surface.');return{role:geometry===exterior?'exterior' as const:'interior' as const,geometry,position:geometry.normalize(p)};
 }});
}
export function polyhedronOuterBallFits(body:PolyhedronMaterial,p:PolyhedronVector,r:number){finite(p);if(!Number.isFinite(r)||r<0)throw RangeError('Finite nonnegative material radius required.');return body.outerPlanes.every(plane=>I.add(signed(plane,p),I.multiply(I.exact(r),I.exact(plane.bounds.normUpper)))[1]<=-body.guardMeters);}
export function polyhedronCavityBallFits(body:PolyhedronMaterial,p:PolyhedronVector,r:number){finite(p);if(!Number.isFinite(r)||r<0)throw RangeError('Finite nonnegative physical radius required.');return !!body.interior&&body.innerPlanes.every(plane=>I.add(signed(plane,p),I.multiply(I.exact(r),I.exact(plane.bounds.normUpper)))[1]<=-body.guardMeters);}
export function polyhedronBallOutside(body:PolyhedronMaterial,p:PolyhedronVector,r:number){finite(p);if(!Number.isFinite(r)||r<0)throw RangeError('Finite nonnegative physical radius required.');return body.outerPlanes.some(plane=>I.subtract(signed(plane,p),I.multiply(I.exact(r),I.exact(plane.bounds.normUpper)))[0]>=body.guardMeters);}
/** A face interior uses its physical normal. A real crease has no unique
 * normal; use the direction to/from that convex boundary's strict interior
 * seed. The corresponding material ray is validated, not assumed to fit. */
export function polyhedronEntranceNormal(body:PolyhedronMaterial,p:SurfacePosition):PolyhedronVector{
 const s=body.select(p);if(s.geometry.aliases(s.position).length===1)return s.geometry.normal(s.position);
 const q=s.geometry.referencePosition(s.position),seed=s.geometry.inspectionEyeMeters;return unit(s.role==='exterior'?sub(q,seed):sub(seed,q));
}
function cavitySeparated(body:PolyhedronMaterial,a:PolyhedronVector,b:PolyhedronVector,r:number){
 if(!body.interior)return true;
 const fits=(normal:PolyhedronPhysicalBounds,offsetUpper:number,normUpper:number)=>[a,b].every(p=>I.subtract(I.subtract(vdot(normal,exactVector(p)),I.exact(offsetUpper)),I.multiply(I.exact(r),I.exact(normUpper)))[0]>=body.guardMeters);
 if(body.innerPlanes.some(p=>fits(p.bounds.normal,p.bounds.offset[1],p.bounds.normUpper)))return true;
 const g=body.interior,candidates:PolyhedronVector[]=[];
 // Any separating direction is valid; the support maximum is certified over
 // every real inner vertex. Closest-point guesses affect acceptance only, never
 // safety. They cover genuine edge/vertex neighborhoods without fake planes.
 for(const p of[a,b,a.map((x,k)=>(x+b[k]!)/2) as unknown as PolyhedronVector]){
  for(const q of g.vertices)candidates.push(sub(p,q));
  for(const edge of g.edges){const q=g.vertices[edge[0]]!,d=sub(g.vertices[edge[1]]!,q),t=Math.max(0,Math.min(1,dot(sub(p,q),d)/dot(d,d)));candidates.push(sub(p,q.map((x,k)=>x+t*d[k]!) as unknown as PolyhedronVector));}
 }
 for(const candidate of candidates){if(Math.hypot(...candidate)<=body.guardMeters)continue;const normal=exactVector(unit(candidate)),normUpper=I.root(vdot(normal,normal))[1],offsetUpper=Math.max(...g.vertices.map((_,i)=>vdot(normal,g.physicalVertexBounds(i))[1]));if(fits(normal,offsetUpper,normUpper))return true;}
 return false;
}
/** Endpoint balls suffice for every outer convex halfspace. Inner exclusion
 * needs a real separating plane for each bounded subsegment. Ambiguous narrow
 * clearances reject; no sampled midpoint is promoted to a volume proof. */
export function polyhedronMaterialCapsuleFits(body:PolyhedronMaterial,a:PolyhedronVector,b:PolyhedronVector,r:number){
 if(!polyhedronOuterBallFits(body,a,r)||!polyhedronOuterBallFits(body,b,r))return false;
 return polyhedronCapsuleAvoidsCavity(body,a,b,r);
}
/** Also used for exterior portal stubs, whose first ball deliberately crosses
 * the outer surface but must never cut an unselected cavity entrance. */
export function polyhedronCapsuleAvoidsCavity(body:PolyhedronMaterial,a:PolyhedronVector,b:PolyhedronVector,r:number){
 finite(a);finite(b);if(!Number.isFinite(r)||r<0)throw RangeError('Finite nonnegative physical radius required.');
 // A witnessed cavity point proves rejection, never acceptance. This avoids
 // subdividing obvious body-crossing chords during bounded passage discovery.
 if(body.interior){const delta=sub(b,a),length=Math.hypot(...delta);if(length>body.guardMeters){const direction=delta.map(x=>x/length) as unknown as PolyhedronVector,span=polyhedronRayInterval(body.innerPlanes,a,direction);if(span){const lo=Math.max(0,span.enter),hi=Math.min(length,span.exit);if(hi>lo){const t=(lo+hi)/2,p=a.map((x,k)=>x+t*direction[k]!) as unknown as PolyhedronVector;if(polyhedronCavityBallFits(body,p,body.guardMeters*8))return false;}}}}
 let boxes=0;const check=(p:PolyhedronVector,q:PolyhedronVector,radius:number,depth:number):boolean=>{if(++boxes>128)return false;if(cavitySeparated(body,p,q,radius))return true;if(depth===0)return false;const mid=p.map((x,k)=>x+(q[k]!-x)/2) as unknown as PolyhedronVector;
  // Widen by interpolation roundoff before using separately rounded subpieces.
  const pad=16*Number.EPSILON*Math.max(body.scaleMeters,...p.map(Math.abs),...q.map(Math.abs)),expanded=I.add(I.exact(radius),I.exact(pad))[1];return check(p,mid,expanded,depth-1)&&check(mid,q,expanded,depth-1);};
 return check(a,b,r,7);
}
export interface PolyhedronRayInterval{readonly enter:number;readonly exit:number;readonly enterFace:string;readonly exitFace:string}
export function polyhedronRayInterval(boundaries:readonly PolyhedronPlane[],origin:PolyhedronVector,direction:PolyhedronVector):PolyhedronRayInterval|undefined{
 let enter=-Infinity,exit=Infinity,enterFace='',exitFace='';for(const plane of boundaries){const d=dot(plane.normal,direction),gap=plane.offset-dot(plane.normal,origin);if(Math.abs(d)<1e-14){if(gap<0)return;continue;}const t=gap/d;if(d<0){if(t>enter){enter=t;enterFace=plane.face;}}else if(t<exit){exit=t;exitFace=plane.face;}if(enter>exit)return;}
 return{enter,exit,enterFace,exitFace};
}
/** Projection onto the actual planar triangle/square; no cylinder chart. */
export function polyhedronPositionAt(g:PolyhedronGeometry,face:string,point:PolyhedronVector,canonical=true):SurfacePosition{
 const f=g.frame(face),d=sub(point,f.origin),uu=dot(f.u,f.u),vv=dot(f.v,f.v),uv=dot(f.u,f.v),det=uu*vv-uv*uv,du=dot(d,f.u),dv=dot(d,f.v);let u=(du*vv-dv*uv)/det,v=(dv*uu-du*uv)/det;
 const eps=1e-9;if(u<-eps||v<-eps||u>1+eps||v>1+eps||g.isTriangle(face)&&u+v>1+eps)throw RangeError('Physical point is outside the actual reference face.');u=Math.max(0,Math.min(1,u));v=Math.max(0,Math.min(1,v));if(g.isTriangle(face)&&u+v>1)v=1-u;const p={...g.identity,patchId:face,u,v};return canonical?g.canonicalPosition(g.normalize(p)):p;
}
