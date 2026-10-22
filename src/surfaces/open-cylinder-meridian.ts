import type {SurfacePosition} from './contracts.ts';
import type {OpenCylinderGeometry} from './open-cylinder.ts';
import {CylinderDistanceUnsupportedError} from './cylinder-distance.ts';
const word=new DataView(new ArrayBuffer(8));
function outward(value:number,up:boolean){if(value===0)return up?Number.MIN_VALUE:-Number.MIN_VALUE;word.setFloat64(0,value,true);const bits=word.getBigUint64(0,true);word.setBigUint64(0,bits+((value>0)===up?1n:-1n),true);return word.getFloat64(0,true);}
/** Error-free TwoSum residuals. Ordinary exact binary meridian distances remain
 * exact, including a sample exactly on a zero-influence brush boundary. */
function sumInterval(terms:readonly number[]){let value=0,error=0;for(const x of terms){const next=value+x,z=next-value,residual=(value-(next-z))+(x-z);value=next;error+=Math.abs(residual);}if(error===0)return{value,lower:value,upper:value};const pad=error*(1+64*Number.EPSILON)+64*Number.MIN_VALUE;return{value,lower:outward(value-pad,false),upper:outward(value+pad,true)};}
/** Projection onto the cyclic meridian never increases path length. At equal
 * angle its shorter arc is feasible, so this is the global intrinsic distance.
 * Prefix expressions use original dimensions, not rounded cached coordinates. */
export function openCylinderMeridianDistance(g:OpenCylinderGeometry,first:SurfacePosition,last:SurfacePosition,tolerance:number){
 if(!Number.isFinite(tolerance)||tolerance<=0)throw RangeError('Positive finite meridian enclosure width required.');
 const {outerRadiusMeters:ro,innerRadiusMeters:ri,lengthMeters:L}=g.metadata;
 const terms=(input:SurfacePosition)=>{const aliases=g.aliases(input),p=aliases.find(p=>p.patchId.endsWith('wall'))??aliases[0]!;switch(p.patchId){case'outer-wall':return[p.v];case'rim-end':return[L,p.v];case'inner-wall':return[L,ro,-ri,p.v];case'rim-start':return[L,L,ro,-ri,p.v];}};
 const a=terms(first),b=terms(last);let shared=0;while(shared<Math.min(a.length,b.length)&&a[shared]===b[shared])shared++;
 // Identical physical prefixes cancel exactly. Summing both large prefixes
 // first needlessly destroys the sign of a few-ULP pointer-up displacement.
 const difference=[...b.slice(shared),...a.slice(shared).map(v=>-v)],delta=sumInterval(difference),period=[L,L,ro,ro,-ri,-ri],positive=delta.value>=0;
 if(delta.lower<0&&delta.upper>0){const upper=Math.max(-delta.lower,delta.upper);if(upper>tolerance)throw new CylinderDistanceUnsupportedError('precision','Open-cylinder meridian ordering is below arithmetic resolution.');return Object.freeze({lower:0,upper,value:upper,forward:delta,backward:delta,directions:Object.freeze([] as (1|-1)[])});}
 const forward=sumInterval(positive?difference:[...period,...difference]),backward=sumInterval(positive?[...period,...difference.map(v=>-v)]:difference.map(v=>-v));
 const lower=Math.max(0,Math.min(forward.lower,backward.lower)),upper=Math.max(0,Math.min(forward.upper,backward.upper));
 if(upper-lower>tolerance)throw new CylinderDistanceUnsupportedError('precision','Open-cylinder meridian sum cannot certify the requested arithmetic width.');
 const directions=Object.freeze(([1,-1]as const).filter(direction=>(direction===1?forward.upper:backward.upper)-lower<=tolerance));
 return Object.freeze({lower,upper,value:upper,forward,backward,directions});
}
