import type {SurfacePosition} from './contracts.ts';
import type {PolyhedronVector} from './polyhedron-contract.ts';
import type {ThroughHole} from './through-hole.ts';
import {passageId} from './passages.ts';
import {polyhedronPositionAt,polyhedronRayInterval,polyhedronCavityBallFits,polyhedronBallOutside,polyhedronEntranceNormal,type PolyhedronMaterial} from './polyhedron-material.ts';
import {pyramidDot as dot,pyramidSub as sub} from './pyramid.ts';
export type PolyhedronHole=Omit<ThroughHole,'geometry'>&{readonly geometry:'convex-polyhedron-reference-axis';readonly sourceMouthId:string};
const exact=(value:unknown,keys:readonly string[])=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==keys.toSorted().join(','))throw RangeError('Unsupported polyhedral hole fields.');};
export function polyhedronHoleBounds(body:PolyhedronMaterial){return{min:body.scaleMeters*1e-5,max:Math.min(body.minimumClearanceMeters*.2,(body.cavitySeedClearanceMeters??Infinity)*.1),supported:body.minimumClearanceMeters>=body.scaleMeters*1e-4};}
export function normalizePolyhedronAnchor(body:PolyhedronMaterial,p:SurfacePosition){exact(p,['worldId','surfaceId','patchId','u','v']);return body.select(p).position;}
function mouthsAt(body:PolyhedronMaterial,input:SurfacePosition){
 const s=body.select(normalizePolyhedronAnchor(body,input)),p=s.position,q=s.geometry.referencePosition(p),into=polyhedronEntranceNormal(body,p).map(x=>-x) as unknown as PolyhedronVector;
 if(!body.interior){
  const interval=polyhedronRayInterval(body.outerPlanes,q,into);if(!interval||interval.exit<=body.guardMeters*4||interval.enter>body.guardMeters*4)throw RangeError('This face normal does not enter the actual solid. Choose a nearby valid face point.');
  return[p,polyhedronPositionAt(body.exterior,interval.exitFace,q.map((x,k)=>x+into[k]!*interval.exit) as unknown as PolyhedronVector)];
 }
 const interval=polyhedronRayInterval(s.role==='exterior'?body.innerPlanes:body.outerPlanes,q,into),distance=s.role==='exterior'?interval?.enter:interval?.exit,face=s.role==='exterior'?interval?.enterFace:interval?.exitFace;
 if(!interval||distance===undefined||distance<=body.guardMeters*4||!face)throw RangeError('This normal does not reach the other actual shell boundary. Choose a different opening point or author a physical tunnel.');
 const other=s.role==='exterior'?body.interior:body.exterior,target=polyhedronPositionAt(other,face,q.map((x,k)=>x+into[k]!*distance) as unknown as PolyhedronVector);
 const outerSpan=polyhedronRayInterval(body.outerPlanes,q,into);if(!outerSpan||distance>outerSpan.exit+body.guardMeters*4)throw RangeError('The aperture axis leaves the material before reaching its corresponding boundary.');
 return s.role==='exterior'?[p,target]:[target,p];
}
/** Solid bores have two real exterior mouths. Hollow bores join the exterior
 * and actual cavity. One selected real face supplies the physical normal. */
export function polyhedronHoleAt(body:PolyhedronMaterial,anchor:SurfacePosition,radiusMeters:number,id:string=crypto.randomUUID()):PolyhedronHole{
 const p=normalizePolyhedronAnchor(body,anchor),positions=mouthsAt(body,p),mouths=positions.map(position=>({id:crypto.randomUUID(),position})),source=mouths.find(m=>m.position.surfaceId===p.surfaceId&&m.position.patchId===p.patchId&&m.position.u===p.u&&m.position.v===p.v);
 if(!source)throw Error('The actual aperture source mouth must retain its canonical anchor.');
 return validatePolyhedronHole(body,{kind:'through-hole',version:1,id,worldId:body.worldId,geometry:'convex-polyhedron-reference-axis',radiusMeters,sourceMouthId:source.id,mouths});
}
export function validatePolyhedronHole(body:PolyhedronMaterial,input:PolyhedronHole):PolyhedronHole{
 exact(input,['kind','version','id','worldId','geometry','radiusMeters','sourceMouthId','mouths']);passageId(input.id);passageId(input.sourceMouthId);
 const limits=polyhedronHoleBounds(body),r=input.radiusMeters;if(input.kind!=='through-hole'||input.version!==1||input.geometry!=='convex-polyhedron-reference-axis'||input.worldId!==body.worldId||!limits.supported||!Number.isFinite(r)||r<limits.min||r>limits.max)throw RangeError('Unsupported physical aperture or material clearance.');
 if(!Array.isArray(input.mouths)||input.mouths.length!==2||Object.keys(input.mouths).join(',')!=='0,1')throw RangeError('A through bore needs two dense actual mouths.');
 const mouths=input.mouths.map(m=>{exact(m,['id','position']);passageId(m.id);return{id:m.id,position:normalizePolyhedronAnchor(body,m.position)};});
 if(mouths[0]!.id===mouths[1]!.id||input.id===mouths[0]!.id||input.id===mouths[1]!.id)throw RangeError('Aperture and mouth identities must be independent.');
 const source=mouths.find(m=>m.id===input.sourceMouthId);if(!source)throw RangeError('The normal source must be an actual mouth.');
 const expected=mouthsAt(body,source.position),tol=body.guardMeters*8;
 for(let i=0;i<2;i++){
  const m=mouths[i]!,q=expected[i]!,a=body.select(m.position),b=body.select(q);if(a.role!==b.role||Math.hypot(...sub(a.geometry.referencePosition(m.position),b.geometry.referencePosition(q)))>tol)throw RangeError('Hole mouths do not follow the same real face-normal bore.');
 }
 if(Math.hypot(...sub(body.select(mouths[0]!.position).geometry.referencePosition(mouths[0]!.position),body.select(mouths[1]!.position).geometry.referencePosition(mouths[1]!.position)))<=body.guardMeters*4)throw RangeError('An opening must remove a positive length of actual material.');
 const canonical=Object.freeze({...input,mouths:Object.freeze(mouths.map(m=>Object.freeze(m)))});cut(body,canonical);return canonical;
}
function freeEnd(body:PolyhedronMaterial,anchor:SurfacePosition,out:PolyhedronVector,r:number){
 const s=body.select(anchor),q=s.geometry.referencePosition(anchor);
 if(s.role==='exterior'){
  for(let extension=2*r;extension<=body.scaleMeters*4;extension*=2){const p=q.map((x,k)=>x+extension*out[k]!) as unknown as PolyhedronVector;if(polyhedronBallOutside(body,p,r))return p;}
  throw RangeError('This normal exit is too tangential for the requested aperture. Choose a nearby valid face point.');
 }
 const eroded=body.innerPlanes.map(p=>({...p,offset:p.offset-(r+body.guardMeters*16)*p.bounds.normUpper})),span=polyhedronRayInterval(eroded,q,out);
 if(!span||span.exit<=Math.max(0,span.enter)+body.guardMeters*32)throw RangeError('The aperture needs a complete free endpoint ball inside the actual cavity. Reduce its width or move it away from the crease.');
 const t=Math.max(0,span.enter)+Math.min(r,(span.exit-Math.max(0,span.enter))/2),p=q.map((x,k)=>x+t*out[k]!) as unknown as PolyhedronVector;
 if(!polyhedronCavityBallFits(body,p,r))throw RangeError('The complete inner aperture clearance cannot be certified.');return p;
}
function cut(body:PolyhedronMaterial,h:PolyhedronHole){
 const source=h.mouths.find(m=>m.id===h.sourceMouthId)!,other=h.mouths.find(m=>m.id!==h.sourceMouthId)!,s=body.select(source.position),q=s.geometry.referencePosition(source.position),target=body.select(other.position).geometry.referencePosition(other.position),normal=polyhedronEntranceNormal(body,source.position),r=h.radiusMeters;
 if(dot(sub(target,q),normal)>=0)throw RangeError('The normal bore must pass into actual material.');
 return{a:freeEnd(body,source.position,normal,r),b:freeEnd(body,other.position,normal.map(x=>-x) as unknown as PolyhedronVector,r),r};
}
export function polyhedronHoleCut(body:PolyhedronMaterial,hole:PolyhedronHole){return cut(body,validatePolyhedronHole(body,hole));}
export function resizePolyhedronHole(body:PolyhedronMaterial,h:PolyhedronHole,radiusMeters:number){return validatePolyhedronHole(body,{...h,radiusMeters});}
export function movePolyhedronHole(body:PolyhedronMaterial,h:PolyhedronHole,anchor:SurfacePosition){
 const existing=validatePolyhedronHole(body,h),next=polyhedronHoleAt(body,anchor,existing.radiusMeters,existing.id),sourceIndex=next.mouths.findIndex(m=>m.id===next.sourceMouthId),oldSource=existing.mouths.find(m=>m.id===existing.sourceMouthId)!,oldOther=existing.mouths.find(m=>m.id!==existing.sourceMouthId)!;
 if(body.interior)return validatePolyhedronHole(body,{...next,sourceMouthId:existing.mouths[sourceIndex]!.id,mouths:next.mouths.map((m,i)=>({...m,id:existing.mouths[i]!.id}))});
 return validatePolyhedronHole(body,{...next,sourceMouthId:oldSource.id,mouths:next.mouths.map((m,i)=>({...m,id:i===sourceIndex?oldSource.id:oldOther.id}))});
}
