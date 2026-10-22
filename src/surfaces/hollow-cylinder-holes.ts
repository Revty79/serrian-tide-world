import type {ThroughHole} from './through-hole.ts';
import type {HollowCylinderWorld} from '../terrain/hollow-cylinder.ts';
import type {SurfacePosition} from './contracts.ts';
import type {Vec3} from './cube-sphere.ts';
import {passageId} from './passages.ts';
export type CylinderThroughHole=Omit<ThroughHole,'geometry'>&{readonly geometry:'circular-cylinder-normal'};
const exact=(v:unknown,keys:string[])=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==keys.toSorted().join(','))throw RangeError('Unsupported cylinder hole fields.');};
export function cylinderHoleRadiusBounds(w:HollowCylinderWorld){return{min:Math.max(w.dimensions.outerRadiusMeters,w.dimensions.outerLengthMeters)*1e-5,max:Math.min(w.dimensions.innerRadiusMeters*.1,w.dimensions.minimumThicknessMeters*.25)};}
export function normalizeCylinderAnchor(w:HollowCylinderWorld,p:SurfacePosition){exact(p,['worldId','surfaceId','patchId','u','v']);return w.select(p).geometry.normalize(p);}
/** Axis-normal apertures must fit wholly on both reference surfaces. Side
 * anchors use physical centered z, not the other bank's different chart v. */
export function cylinderHoleAt(w:HollowCylinderWorld,position:SurfacePosition,radiusMeters:number,id:string=crypto.randomUUID()):CylinderThroughHole{
 const p=normalizeCylinderAnchor(w,position),g=w.select(p).geometry,q=g.referencePosition(p),{outerLengthMeters:lo,innerLengthMeters:li}=w.dimensions;
 const mouths=(['exterior','interior']as const).map(role=>{const own=w.surfaces[role].geometry,l=role==='exterior'?lo:li,theta=Math.atan2(q[1],q[0]);const kernel={...own.identity,patchId:p.patchId,u:p.patchId==='cap-end'?-theta:theta,v:p.patchId==='side'?q[2]+l/2:Math.hypot(q[0],q[1])};return{id:crypto.randomUUID(),position:own.fromReferenceChart(kernel)};});
 return validateCylinderHole(w,{kind:'through-hole',version:1,id,worldId:w.definition.id,geometry:'circular-cylinder-normal',radiusMeters,mouths});
}
export function validateCylinderHole(w:HollowCylinderWorld,input:CylinderThroughHole):CylinderThroughHole{
 exact(input,['kind','version','id','worldId','geometry','radiusMeters','mouths']);passageId(input.id);
 if(input.kind!=='through-hole'||input.version!==1||input.geometry!=='circular-cylinder-normal'||input.worldId!==w.definition.id)throw RangeError('Unsupported cylinder hole or parent World.');
 const{min,max}=cylinderHoleRadiusBounds(w),r=input.radiusMeters,d=w.dimensions,tol=Math.max(d.outerRadiusMeters,d.outerLengthMeters)*1e-12;
 if(!Number.isFinite(r)||r<min||r>max||d.minimumThicknessMeters<Math.max(d.outerRadiusMeters,d.outerLengthMeters)*1e-4)throw RangeError(`Hole radius must be ${min} to ${max} m; wall and end thickness must support reference-shell precision.`);
 if(!Array.isArray(input.mouths)||input.mouths.length!==2||Object.keys(input.mouths).join(',')!=='0,1')throw RangeError('A cylinder hole requires exactly two corresponding mouths.');
 const mouths=input.mouths.map(m=>{exact(m,['id','position']);passageId(m.id);return Object.freeze({id:m.id,position:Object.freeze(normalizeCylinderAnchor(w,m.position))});}),a=mouths[0]!,b=mouths[1]!,ga=w.select(a.position).geometry,gb=w.select(b.position).geometry,qa=ga.referencePosition(a.position),qb=gb.referencePosition(b.position);
 if(a.id===b.id||ga.role===gb.role||a.position.patchId!==b.position.patchId)throw RangeError('Hole mouths need distinct identities on corresponding opposite surfaces.');
 if(a.position.patchId==='side'){
  if(Math.abs(qa[2]-qb[2])>tol||Math.hypot(qa[0]/ga.radiusMeters-qb[0]/gb.radiusMeters,qa[1]/ga.radiusMeters-qb[1]/gb.radiusMeters)>128*Number.EPSILON||Math.abs(qa[2])+r>=d.innerLengthMeters/2-tol)throw RangeError('A radial wall hole must align at the same angle and centered z, clear of both cavity rims.');
 }else if(Math.hypot(qa[0]-qb[0],qa[1]-qb[1])>tol||Math.hypot(qa[0],qa[1])+r>=d.innerRadiusMeters-tol)throw RangeError('An axial cap hole must align at the same physical XY, clear of the cavity cap rim.');
 return Object.freeze({kind:'through-hole',version:1,id:input.id,worldId:input.worldId,geometry:'circular-cylinder-normal',radiusMeters:r,mouths:Object.freeze(mouths)});
}
export const resizeCylinderHole=(w:HollowCylinderWorld,h:CylinderThroughHole,radiusMeters:number)=>validateCylinderHole(w,{...h,radiusMeters});
export function moveCylinderHole(w:HollowCylinderWorld,h:CylinderThroughHole,p:SurfacePosition){const next=cylinderHoleAt(w,p,h.radiusMeters,h.id);return validateCylinderHole(w,{...next,mouths:next.mouths.map(m=>({...m,id:h.mouths.find(a=>w.select(a.position).role===w.select(m.position).role)!.id}))});}
export function cylinderHoleCut(w:HollowCylinderWorld,h:CylinderThroughHole){const outer=h.mouths.find(m=>w.select(m.position).role==='exterior')!,inner=h.mouths.find(m=>w.select(m.position).role==='interior')!,a=w.surfaces.exterior.geometry.referencePosition(outer.position),b=w.surfaces.interior.geometry.referencePosition(inner.position),n=w.surfaces.exterior.geometry.normal(outer.position),r=h.radiusMeters;return{a:a.map((v,i)=>v+2*r*n[i]!)as unknown as Vec3,b:b.map((v,i)=>v-2*r*n[i]!)as unknown as Vec3,r};}
