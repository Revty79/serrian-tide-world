import {pathNorm,pathAngle,pathTrig} from './cylinder-path-math.ts';
import {CylinderDistanceUnsupportedError} from './cylinder-distance.ts';

// Certified annular query core. Separate feasible
// witnesses and global lower bounds; no guessed route becomes an exact metric.
const EPS=Number.EPSILON,ANGLE_PAD=4096*EPS;
export interface AnnularPlanarWitness {readonly direct:boolean;readonly firstTurn:number;readonly lastTurn:number;readonly arcAngle:number}
export interface AnnularBounds {lower:number;upper:number;value:number;guard:number;iterations:number;route:string;phi?:number;k?:number;planar?:AnnularPlanarWitness}
function root(value:number){const r=Math.sqrt(value);if(!Number.isFinite(r)||r<0||Math.abs(r*r-value)>32*EPS*value+8*Number.MIN_VALUE)throw new CylinderDistanceUnsupportedError('precision','Open-cylinder square-root residual exceeds its arithmetic contract.');return r;}
function tangent(radius:number,k:number){return root(Math.max(0,(radius-k)*(radius+k)));}
function beta(radius:number,k:number){if(radius===k)return{value:0,lower:0,upper:0};const value=pathAngle(k,tangent(radius,k));return{value,lower:Math.max(0,value-ANGLE_PAD),upper:Math.min(Math.PI/2,value+ANGLE_PAD)};}
function chord(a:number,b:number,angle:number){const[s]=pathTrig(angle/2);return pathNorm(a-b,2*root(a*b)*s);}
export function createAnnularDistance(innerRadius:number,outerRadius:number,length:number){
 if(![innerRadius,outerRadius,length].every(v=>Number.isFinite(v)&&v>=1&&v<=1e9)||innerRadius>=outerRadius)throw RangeError('Supported positive annular dimensions required.');
 const guard=32768*EPS*Math.max(innerRadius,outerRadius,length),ri=innerRadius;
 const validate=(radius:number,angle:number)=>{if(!Number.isFinite(radius)||radius<ri||radius>outerRadius||!Number.isFinite(angle)||angle<0||angle>Math.PI)throw RangeError('Annular query is outside its physical domain.');};
 const finish=(bounds:Omit<AnnularBounds,'value'|'guard'>,tolerance:number):AnnularBounds=>{
  if(!Number.isFinite(tolerance)||tolerance<=0)throw RangeError('Positive finite distance enclosure width required.');
  const lower=Math.max(0,bounds.lower),upper=bounds.upper;if(!Number.isFinite(upper)||upper<lower||upper-lower>tolerance)throw new CylinderDistanceUnsupportedError('precision',`Open-cylinder feasible upper and independent global lower do not certify the requested width (${upper-lower} > ${tolerance}).`);
  return Object.freeze({...bounds,lower,upper,value:upper,guard});
 };
 const annulus=(a:number,b:number,angle:number)=>{
  validate(a,angle);validate(b,angle);if(a===b&&angle===0)return{lower:0,upper:0,iterations:0,route:'annular-chord'};
  const ba=beta(a,ri),bb=beta(b,ri),low=ba.lower+bb.lower,high=ba.upper+bb.upper,direct=chord(a,b,angle);
  // A chord is feasible iff its angular separation is no greater than the sum
  // of the endpoint tangent angles. The lower-angle construction is always
  // inside the actual annulus, including uncertain tangent transitions.
  const upper=(angle<=low?direct:chord(a,ri,ba.lower)+ri*(angle-low)+chord(ri,b,bb.lower))+guard;
  // Projection of ANY boundary path onto XY remains in this annulus and cannot
  // increase its length. Thus the planar obstacle distance is a GLOBAL lower.
  const lower=(angle>=high?tangent(a,ri)+tangent(b,ri)+ri*(angle-high):direct)-guard;
  return{lower:Math.max(0,lower),upper,iterations:0,route:angle<=low?'annular-chord':'annular-tangent-arc',planar:Object.freeze({direct:angle<=low,firstTurn:ba.lower,lastTurn:bb.lower,arcAngle:Math.max(0,angle-low)})};
 };
 return Object.freeze({guard,
  annulus:(a:number,b:number,angle:number,tolerance=Math.max(outerRadius*1e-6,guard*16))=>finish(annulus(a,b,angle),tolerance),
  innerHelix:(angle:number,axial:number,tolerance=Math.max(outerRadius*1e-6,guard*16))=>{validate(ri,angle);if(!Number.isFinite(axial)||axial<0||axial>length)throw RangeError('Axial separation is outside the inner wall.');const d=pathNorm(ri*angle,axial);return finish({lower:d===0?0:Math.max(0,d-guard),upper:d===0?0:d+guard,iterations:0,route:'inner-helix'},tolerance);},
  innerToRim:(radius:number,angle:number,axial:number,tolerance=Math.max(outerRadius*1e-6,guard*16))=>{
   validate(radius,angle);if(!Number.isFinite(axial)||axial<0||axial>length)throw RangeError('Axial separation is outside the open cylinder.');
   if(axial===0)return finish(annulus(ri,radius,angle),tolerance);
   if(radius===ri){const d=pathNorm(ri*angle,axial);return finish({lower:Math.max(0,d-guard),upper:d+guard,iterations:0,route:'inner-helix'},tolerance);}
   let low=0,high=angle,iterations=0;
   // This search only finds a feasible witness/dual coefficient. Native atan2
   // is never trusted as the bound: checked polynomial inverses below certify
   // an independent lower and a physically contained upper afterwards.
   for(;iterations<64;iterations++){const phi=(low+high)/2;if(phi===low||phi===high)break;const k=ri*(ri*phi/pathNorm(axial,ri*phi)),turn=Math.atan2(tangent(radius,k),k)-Math.atan2(tangent(ri,k),k);if(phi+turn<angle)low=phi;else high=phi;}
   const phi=(low+high)/2,k=Math.min(ri,Math.max(0,ri*(ri*phi/pathNorm(axial,ri*phi)))),leg=annulus(ri,radius,Math.max(0,angle-phi)),upper=pathNorm(axial,ri*phi)+leg.upper+guard;
   const innerTangent=tangent(ri,k),outerTangent=tangent(radius,k),ai=beta(ri,k),ab=beta(radius,k),a=Math.max(0,innerTangent/ri-8192*EPS);
   // Calibration on the universal angular cover:
   // F=k theta + a z + integral_Ri^rho sqrt(1-(k/r)^2)dr.
   // |grad F|<=1 on BOTH walls and both rims. Select sign(k) for the actual
   // winding; |total theta|>=shortAngle, so every physical route obeys this LB.
   const integral=outerTangent-innerTangent-k*(ab.upper-ai.lower),calibration=k*angle+a*axial+integral-guard;
   const universal=pathNorm(radius-ri,ri*angle,axial)-guard,lower=Math.max(0,calibration,universal);
   return finish({lower,upper,iterations,route:'inner-wall-rim-calibration',phi,k,planar:leg.planar},tolerance);
  },
 });
}
