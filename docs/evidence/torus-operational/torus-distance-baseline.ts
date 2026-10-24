import * as I from '../src/surfaces/pyramid-interval.ts';
import type {SurfacePosition} from '../src/surfaces/contracts.ts';
import {torusDelta,type TorusGeometry} from '../src/surfaces/torus.ts';
type B=I.Interval;
type P={c:B[];e:number};
const abs=(a:B)=>Math.max(Math.abs(a[0]),Math.abs(a[1]));
const up=(x:number)=>I.adjacentFloat(x,true);
const zero=()=>I.exact(0);
function constant(x:B,n:number):P{return{c:Array.from({length:n+1},(_,i)=>i?zero():x),e:0};}
const norm=(p:P)=>up(p.c.reduce((s,c)=>up(s+abs(c)),p.e));
function add(a:P,b:P):P{return{c:a.c.map((c,i)=>I.add(c,b.c[i]!)),e:up(a.e+b.e)};}
function scale(a:P,s:B):P{return{c:a.c.map(c=>I.multiply(c,s)),e:up(a.e*abs(s))};}
function mul(a:P,b:P):P{const n=a.c.length-1,c=Array.from({length:n+1},zero);let e=up(a.e*norm(b)+b.e*norm(a)+a.e*b.e);for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){const p=I.multiply(a.c[i]!,b.c[j]!);if(i+j<=n)c[i+j]=I.add(c[i+j]!,p);else e=up(e+abs(p));}return{c,e};}
function derivative(p:P):P{if(p.e)throw Error('Only exact trial polynomials can be differentiated.');return{c:p.c.map((_,i)=>i+1<p.c.length?I.multiply(p.c[i+1]!,I.exact(2*(i+1))):zero()),e:0};}
function integral(p:P):B{let s=zero();for(let i=0;i<p.c.length;i+=2)s=I.add(s,I.divide(p.c[i]!,I.exact(i+1)));return I.add(s,[-p.e,p.e]);}
/** Interval Taylor evaluation: no assumption about host libm sin/cos accuracy. */
export function torusTrigBounds(x:B,cos:boolean):B{let term=cos?I.exact(1):x,sum=term;const xx=I.square(x);for(let k=1;k<=20;k++){term=I.divide(I.neg(I.multiply(term,xx)),I.exact((2*k-(cos?1:0))*(2*k+(cos?0:1))));sum=I.add(sum,term);}const bound=Math.max(1,abs(x));let rem=1;for(let i=1;i<=40;i++)rem*=bound/i;return I.add(sum,[-rem,rem]);}
function sincos(p:P){const n=p.c.length-1;let s=constant(zero(),n),c=constant(I.exact(1),n),power=constant(I.exact(1),n),factorial=1;for(let k=1;k<=12;k++){power=mul(power,p);factorial*=k;const term=scale(power,I.divide(I.exact((Math.floor(k/2)%2)?-1:1),I.exact(factorial)));if(k%2)s=add(s,term);else c=add(c,term);}let rem=1;for(let k=1;k<=13;k++)rem=up(rem*norm(p)/k);s.e=up(s.e+rem);c.e=up(c.e+rem);return{s,c};}
function endpointPolynomial(high:readonly number[],end:B,n:number):P{const p=constant(zero(),n);p.c[0]=I.divide(end,I.exact(2));p.c[1]=p.c[0]!;for(let k=2;k<=n;k++){p.c[k]=I.exact(high[k]??0);const index=k%2;p.c[index]=I.subtract(p.c[index]!,p.c[k]!);}return p;}
function evaluate(c:readonly number[],x:number,order=0){let s=0;for(let k=c.length-1;k>=order;k--){let f=1;for(let j=0;j<order;j++)f*=k-j;s=s*x+c[k]!*f*2**order;}return s;}
function fit(values:readonly number[]){const m=values.length-1,cheb=values.map((_,k)=>{let s=0;for(let j=0;j<=m;j++)s+=(j===0||j===m?.5:1)*values[j]!*Math.cos(k*j*Math.PI/m);return s*2/m*(k===0||k===m?.5:1);}),out=new Array(m+1).fill(0);let a=[1],b=[0,1];for(let k=0;k<=m;k++){const p=k===0?a:b;for(let j=0;j<p.length;j++)out[j]+=cheb[k]!*p[j]!;if(k>=1){const next=new Array(k+2).fill(0);for(let j=0;j<b.length;j++)next[j+1]+=2*b[j]!;for(let j=0;j<a.length;j++)next[j]-=a[j]!;a=b;b=next;}}return out;}
function trial(q:number,v0:number,X:number,Y:number,n:number){let x=new Array(n+1).fill(0),y=x.slice();x[0]=x[1]=X/2;y[0]=y[1]=Y/2;const a0=q+Math.cos(v0),m=n-2;for(let pass=0;pass<10;pass++){const fx=[],fy=[];for(let j=0;j<=m;j++){const t=Math.cos(j*Math.PI/m),v=v0+evaluate(y,t),dx=evaluate(x,t,1),dy=evaluate(y,t,1),a=q+Math.cos(v),sin=Math.sin(v);fx.push(2*sin/a*dx*dy);fy.push(-a*sin/(a0*a0)*dx*dx);}const construct=(f:number[],end:number)=>{const p=new Array(n+1).fill(0),c=fit(f);for(let k=0;k<c.length;k++)p[k+2]=c[k]!/(4*(k+1)*(k+2));p[0]=p[1]=end/2;for(let k=2;k<=n;k++)p[k%2]-=p[k]!;return p;};x=construct(fx,X);y=construct(fy,Y);}return{x,y};}
/** Certified LOCAL solver with a GLOBAL distance receipt. A trial energy gives
 * a length bound L. Every shorter path stays in |v-v0| <= L/r and cannot wind
 * once (L < pi*r). On the convex set containing these paths, the energy Hessian
 * has the explicit positive coercivity m below. Poincare (pi > 3) bounds its
 * energy gap by ||Euler residual||^2/(18*m). Interval polynomial integration
 * encloses both energy and residual. The trial need not be an exact geodesic.
 * This is not a flat metric, mesh chord or unvalidated shooting result. */
export function torusLocalDistance(g:TorusGeometry,first:SurfacePosition,last:SurfacePosition,options:{absoluteToleranceMeters:number;maxBoxes:number}){
 const a=g.normalize(first),b=g.normalize(last),r=g.metadata.minorRadiusMeters,q=I.divide(I.exact(g.metadata.majorRadiusMeters),I.exact(r)),du=torusDelta(b.u-a.u),dv=torusDelta(b.v-a.v),tol=options.absoluteToleranceMeters;
 if(!Number.isFinite(tol)||tol<=0||options.maxBoxes<1||Math.abs(dv)>.7||Math.abs(du)>.4)throw RangeError('Torus certified local distance domain exceeded.');
 if(du===0&&dv===0)return{scope:'global-reference-surface' as const,lowerBoundMeters:0,upperBoundMeters:0,evaluatedBoxes:0};
 const v0=torusDelta(a.v),ci=torusTrigBounds(I.exact(v0),true),si=torusTrigBounds(I.exact(v0),false),a0=(q[0]+q[1])/2+Math.cos(v0),X=I.multiply(I.exact(a0),I.add(I.exact(du),[-2e-15,2e-15])),Y=I.add(I.exact(dv),[-2e-15,2e-15]);let boxes=0;
 for(const n of[6,8,12]){if(++boxes>options.maxBoxes)throw RangeError('Torus distance certificate work budget exceeded.');const approximate=trial((q[0]+q[1])/2,v0,a0*du,dv,n),x=endpointPolynomial(approximate.x,X,n),y=endpointPolynomial(approximate.y,Y,n),dx=derivative(x),dy=derivative(y),ddx=derivative(dx),ddy=derivative(dy),sc=sincos(y),cv=add(scale(sc.c,ci),scale(sc.s,I.neg(si))),sv=add(scale(sc.s,ci),scale(sc.c,si)),bb=scale(add(constant(q,n),cv),I.divide(I.exact(1),I.exact(a0))),by=scale(sv,I.exact(-1/a0)),b2=mul(bb,bb),energy=I.divide(integral(add(mul(b2,mul(dx,dx)),mul(dy,dy))),I.exact(2));
  const L=I.root(I.multiply(energy,I.exact(2)))[1];if(!(L<.9))throw RangeError('Torus trial leaves the certified short-path domain.');
  const amin=I.subtract(I.add(q,ci),I.exact(L))[0],bmin=amin/a0,bmax=(q[1]+ci[1]+L)/a0,B=L/bmin,M1=2*bmax*Math.min(1,abs(si)+L)/a0,M2=2*bmax*Math.max(0,Math.min(1,ci[1]+L))/a0,m=Math.min(bmin*bmin-M1*B/2,1-M2*B*B/8-M1*B/2)-1e-10;
  if(!(m>0))throw RangeError('Torus energy coercivity could not be certified.');
  const rx=add(mul(b2,ddx),scale(mul(mul(bb,by),mul(dx,dy)),I.exact(2))),ry=add(ddy,scale(mul(mul(bb,by),mul(dx,dx)),I.exact(-1))),residual=Math.max(0,integral(add(mul(rx,rx),mul(ry,ry)))[1]),gap=I.divide(I.exact(residual),I.exact(18*m)),lo=I.root([Math.max(0,I.subtract(I.multiply(energy,I.exact(2)),I.multiply(gap,I.exact(2)))[0]),Math.max(0,2*energy[1])])[0],hi=I.root(I.multiply(energy,I.exact(2)))[1],lower=I.multiply(I.exact(lo),I.exact(r))[0],upper=I.multiply(I.exact(hi),I.exact(r))[1];
  if(upper-lower<=tol)return{scope:'global-reference-surface' as const,lowerBoundMeters:Math.max(0,lower),upperBoundMeters:upper,evaluatedBoxes:boxes};
 }
 throw RangeError('Torus distance certificate did not reach the requested tolerance.');
}
