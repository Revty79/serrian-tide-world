import * as I from './pyramid-interval.ts';
type B=I.Interval;
/** A polynomial with an L1 coefficient enclosure and a uniform function tail.
 * All coefficients are IEEE doubles. gamma(k) bounds k rounded operations;
 * EPSILON is twice unit roundoff, and the subnormal absolute term is included.
 * Multiplication puts discarded coefficients and coefficient roundoff into the
 * uniform tail. Only tail-free trial polynomials may be differentiated. */
export type TorusPolynomial={c:number[];ce:number;e:number};
const up=(x:number)=>I.adjacentFloat(x,true);
const abs=(a:B)=>Math.max(Math.abs(a[0]),Math.abs(a[1]));
const sum=(a:readonly number[])=>a.reduce((s,x)=>up(s+Math.abs(x)),0);
const gamma=(bound:number,k:number)=>up(k*Number.EPSILON/(1-k*Number.EPSILON)*bound+k*Number.MIN_VALUE);
const midpoint=(x:B)=>{const m=x[0]+(x[1]-x[0])/2;return{m,error:up(Math.max(Math.abs(m-x[0]),Math.abs(x[1]-m)))};};
export const polynomialNorm=(p:TorusPolynomial)=>up(up(sum(p.c)+p.ce)+p.e);
export function polynomialConstant(x:B,n:number):TorusPolynomial{const {m,error}=midpoint(x);return{c:Array.from({length:n+1},(_,i)=>i?0:m),ce:error,e:0};}
export function polynomialAdd(a:TorusPolynomial,b:TorusPolynomial):TorusPolynomial{return{c:a.c.map((x,i)=>x+b.c[i]!),ce:up(up(a.ce+b.ce)+gamma(up(sum(a.c)+sum(b.c)),2)),e:up(a.e+b.e)};}
export function polynomialScale(a:TorusPolynomial,s:B):TorusPolynomial{const {m,error}=midpoint(s),norm=sum(a.c),ce=up(up(Math.abs(m)*a.ce)+up(error*up(norm+a.ce)));return{c:a.c.map(x=>x*m),ce:up(ce+gamma(up(norm*abs(s)),2)),e:up(a.e*abs(s))};}
export function polynomialMultiply(a:TorusPolynomial,b:TorusPolynomial):TorusPolynomial{const n=a.c.length-1,c=new Array<number>(n+1).fill(0),an=sum(a.c),bn=sum(b.c);let discarded=0;for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){const p=a.c[i]!*b.c[j]!;if(i+j<=n)c[i+j]!+=p;else discarded=up(discarded+Math.abs(p));}
 const coefficientError=up(up(up(a.ce*bn)+up(b.ce*an))+up(a.ce*b.ce)),tail=up(up(up(a.e*polynomialNorm(b))+up(b.e*polynomialNorm(a)))+up(a.e*b.e));
 return{c,ce:0,e:up(up(up(discarded+coefficientError)+tail)+gamma(up(an*bn),4*(n+1)**2))};
}
export function polynomialDerivative(p:TorusPolynomial):TorusPolynomial{if(p.e)throw Error('Only tail-free trial polynomials can be differentiated.');const n=p.c.length-1,c=p.c.map((_,i)=>i<n?p.c[i+1]!*2*(i+1):0);return{c,ce:up(up(2*n*p.ce)+gamma(up(2*n*sum(p.c)),3)),e:0};}
/** Mean integral on [-1,1], equivalently the integral in t=(xi+1)/2. */
export function polynomialIntegral(p:TorusPolynomial):B{let result=0;for(let i=0;i<p.c.length;i+=2)result+=p.c[i]!/(i+1);const error=up(up(p.ce+p.e)+gamma(sum(p.c),2*p.c.length+2));return I.add(I.exact(result),[-error,error]);}
export function polynomialEndpoints(high:readonly number[],end:B,n:number):TorusPolynomial{const {m,error}=midpoint(end),c=new Array<number>(n+1).fill(0);c[0]=c[1]=m/2;for(let k=2;k<=n;k++){c[k]=high[k]??0;c[k%2]!-=c[k]!;}return{c,ce:up(error+gamma(up(Math.abs(m)+sum(high)),4*(n+1))),e:0};}
