import type {Vec3} from './cube-sphere.ts';
import type {TorusGeometry} from './torus.ts';
/** Real stationary points of the depressed quartic. Centering the ray at its
 * closest point to the World center avoids far-eye coefficient cancellation. */
function cubic(p:number,q:number){const D=q*q/4+p*p*p/27;if(D>=0){const s=Math.sqrt(D),a=Math.cbrt(-q/2+s),b=Math.cbrt(-q/2-s);return D===0?[a+b,-(a+b)/2]:[a+b];}const radius=2*Math.sqrt(-p/3),angle=Math.acos(Math.max(-1,Math.min(1,3*q/p/radius)))/3;return[0,1,2].map(k=>radius*Math.cos(angle-k*2*Math.PI/3));}
/** Actual nearest positive ray/torus intersection. Stationary points partition
 * the quartic into monotone intervals; signed-distance bisection then selects
 * its first real material boundary, including the inner opening and tangencies.
 * No mesh, filled center disk or fixed-step ray-marching miss is involved. */
export function torusRay(g:TorusGeometry,origin:Vec3,direction:Vec3){
 const s=g.scaleMeters,R=g.metadata.majorRadiusMeters/s,r=g.metadata.minorRadiusMeters/s,o=origin.map(x=>x/s) as unknown as Vec3,length=Math.hypot(...direction);if(!(length>0))throw RangeError('Torus ray direction must be nonzero.');const d=direction.map(x=>x/length) as unknown as Vec3,b=o[0]*d[0]+o[1]*d[1]+o[2]*d[2],h=o.map((x,k)=>x-b*d[k]!) as unknown as Vec3,h2=h[0]**2+h[1]**2+h[2]**2,disc=1-h2;if(disc<0)return;const root=Math.sqrt(disc),start=Math.max(-root,b),end=root;if(start>end)return;
 const k=h2+R*R-r*r,A=2*k-4*R*R*(d[0]**2+d[1]**2),B=-8*R*R*(h[0]*d[0]+h[1]*d[1]),knots=[start,...cubic(A/2,B/4).filter(x=>x>start&&x<end).sort((a,b)=>a-b),end],sd=(w:number)=>Math.hypot(Math.hypot(h[0]+w*d[0],h[1]+w*d[1])-R,h[2]+w*d[2])-r;
 for(let i=0;i<knots.length;i++){let a=knots[i]!,fa=sd(a);if(Math.abs(fa)<1e-13){const point=h.map((x,k)=>(x+a*d[k]!)*s) as unknown as Vec3;return{position:g.positionAtReference(point),point,distanceMeters:(a-b)*s,iterations:0};}if(i+1>=knots.length)break;let z=knots[i+1]!,fz=sd(z);if(fa*fz>0)continue;for(let j=0;j<44;j++){const m=(a+z)/2,f=sd(m);if(fa*f<=0){z=m;fz=f;}else{a=m;fa=f;}}const w=(a+z)/2,point=h.map((x,k)=>(x+w*d[k]!)*s) as unknown as Vec3;return{position:g.positionAtReference(point),point,distanceMeters:(w-b)*s,iterations:44};}
}
