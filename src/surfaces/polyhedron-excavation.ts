import type {PolyhedronMaterial} from './polyhedron-material.ts';
import {polyhedronRayInterval,polyhedronPositionAt,polyhedronCavityBallFits,polyhedronBallOutside} from './polyhedron-material.ts';
import type {PolyhedronVector} from './polyhedron-contract.ts';
import {rayCapsuleInterval,prepareRayCapsuleInterval,type ExcavationPrimitive} from './hollow-cube-csg.ts';
import {segmentPointDistance} from './passages.ts';
import {pyramidDot as dot,pyramidSub as sub,pyramidUnit as unit} from './pyramid.ts';
import type {SurfacePosition} from './contracts.ts';
export interface PolyhedronExcavation{readonly body:PolyhedronMaterial;readonly primitives:readonly ExcavationPrimitive[]}
export interface PolyhedronExcavationHit{readonly distance:number;readonly point:PolyhedronVector;readonly normal:PolyhedronVector;readonly kind:'exterior'|'interior'|'rock';readonly position?:SurfacePosition}
/** Same analytic capsule/ball union and interval subtraction as accepted
 * hollow Cube/Cylinder. Only convex boundary clipping and chart recovery vary. */
/** Derived immutable capsule-axis cache. The accepted complete graph union,
 * interval calculation, primitive budgets and canonical data are unchanged. */
export function preparePolyhedronExcavation(model:PolyhedronExcavation){const primitives=model.primitives.map(p=>Object.freeze({a:Object.freeze([...p.a]) as unknown as PolyhedronVector,b:Object.freeze([...p.b]) as unknown as PolyhedronVector,radius:p.radius})),snapshot=Object.freeze({body:model.body,primitives:Object.freeze(primitives)}),queries=primitives.map(prepareRayCapsuleInterval);return Object.freeze({primitiveCount:primitives.length,trace:(origin:PolyhedronVector,direction:PolyhedronVector)=>trace(snapshot,origin,direction,queries)});}
export function tracePolyhedronExcavation(model:PolyhedronExcavation,origin:PolyhedronVector,direction:PolyhedronVector):PolyhedronExcavationHit|undefined{return trace(model,origin,direction);}
function trace(model:PolyhedronExcavation,origin:PolyhedronVector,direction:PolyhedronVector,queries?:readonly ReturnType<typeof prepareRayCapsuleInterval>[]):PolyhedronExcavationHit|undefined{
 const d=unit(direction),body=model.body,outer=polyhedronRayInterval(body.outerPlanes,origin,d);if(!outer||outer.exit<=0)return;
 const inner=body.interior?polyhedronRayInterval(body.innerPlanes,origin,d):undefined,free:{lo:number;hi:number;primitive:number}[]=[];if(inner)free.push({lo:inner.enter,hi:inner.exit,primitive:-1});
 model.primitives.forEach((p,i)=>{const interval=queries?queries[i]!(origin,d):rayCapsuleInterval(origin,d,p);if(interval)free.push({lo:interval[0],hi:interval[1],primitive:i});});
 let cursor=Math.max(0,outer.enter),which=-2;const epsilon=body.guardMeters*8;free.sort((a,b)=>a.lo-b.lo);for(const item of free){if(item.lo>cursor+epsilon)break;if(item.hi>cursor){cursor=item.hi;which=item.primitive;}}if(cursor>=outer.exit-epsilon||which===-2&&outer.enter< -epsilon)return;
 const point=origin.map((x,k)=>x+cursor*d[k]!) as unknown as PolyhedronVector;
 if(which>=0){const p=model.primitives[which]!,axis=sub(p.b,p.a),length=dot(axis,axis),t=length?Math.max(0,Math.min(1,dot(sub(point,p.a),axis)/length)):0,normal=unit(p.a.map((x,k)=>x+t*axis[k]!-point[k]!) as unknown as PolyhedronVector);return{distance:cursor,point,normal,kind:'rock'};}
 const kind=which===-1?'interior':'exterior',g=kind==='interior'?body.interior!:body.exterior,face=kind==='interior'?inner!.exitFace:outer.enterFace;
 // A free-volume eye is mandatory. A start inside unexcavated rock must not
 // fabricate an exterior hit at t=0 with no entry plane.
 if(!face)return;const normal=g.frame(face).normal.map(x=>kind==='interior'?-x:x) as unknown as PolyhedronVector;return{distance:cursor,point,normal,kind,position:polyhedronPositionAt(g,face,point,false)};
}
export function polyhedronFreeVolume(model:PolyhedronExcavation,p:PolyhedronVector,margin=0){if(!Number.isFinite(margin)||margin<0)throw RangeError('Finite nonnegative inspection clearance required.');const body=model.body;if(polyhedronBallOutside(body,p,margin)||polyhedronCavityBallFits(body,p,margin))return true;return model.primitives.some(c=>c.radius>margin+body.guardMeters*8&&segmentPointDistance(p,c.a,c.b)<c.radius-margin-body.guardMeters*8);}
/** A surface hit can be painted only on its selected real bank. An exposed
 * tunnel wall is physical rock, never an invented terrain chart. */
export function polyhedronExcavationPosition(model:PolyhedronExcavation,origin:PolyhedronVector,direction:PolyhedronVector,surfaceId:string){const hit=tracePolyhedronExcavation(model,origin,direction);return hit?.position?.surfaceId===surfaceId?hit.position:undefined;}
export function polyhedronInspectionEyeFits(model:PolyhedronExcavation,p:PolyhedronVector){return polyhedronFreeVolume(model,p,model.body.guardMeters*8);}
