import type {Vec3} from './cube-sphere.ts';
import type {RoundedCrescentGeometry} from './rounded-crescent-globe.ts';
type Range=readonly[number,number];
const mul=(a:Range,b:Range):Range=>{const x=a[0]*b[0],y=a[0]*b[1],z=a[1]*b[0],w=a[1]*b[1];return[Math.min(x,y,z,w),Math.max(x,y,z,w)];};
const divPositive=(a:Range,lo:number,hi:number):Range=>[a[0]/(a[0]<0?lo:hi),a[1]/(a[1]>0?lo:hi)];
/** Enclose the SIGN numerator of d(|F^-1|-1)/dt over an entire conservative
 * ray window. Radius extrema are analytic; angle is monotone on a line not
 * crossing the inverse's branch cut. A nonzero result proves a unique possible
 * entry, permitting direct bracketed Newton instead of repeated small steps.
 * Ambiguous windows retain the general conservative search. */
export function roundedRaySlopeSign(g:RoundedCrescentGeometry,o:Vec3,d:Vec3,lo:number,hi:number):-1|0|1|2{
 const x0=o[0]+lo*d[0],y0=o[1]+lo*d[1],x1=o[0]+hi*d[0],y1=o[1]+hi*d[1],a=d[0]*d[0]+d[1]*d[1],b=o[0]*d[0]+o[1]*d[1],angle0=Math.atan2(y0,x0),angle1=Math.atan2(y1,x1);if(Math.abs(angle1-angle0)>Math.PI)return 0;
 if(angle0>g.halfSpan+1e-12&&angle1>g.halfSpan+1e-12||angle0< -g.halfSpan-1e-12&&angle1< -g.halfSpan-1e-12)return 2;
 const inverse=(angle:number)=>{const beta=g.halfSpan,h=g.tipRoundness;if(Math.abs(angle)>beta)return Math.sign(angle)*(1+(Math.abs(angle)-beta)/(beta*(1+2*h)));let u=angle/beta;for(let j=0;j<6;j++)u-=(beta*(u+h*(u*u*u-u))-angle)/(beta*(1+h*(3*u*u-1)));return u;},ua=inverse(angle0),ub=inverse(angle1),ul=Math.min(ua,ub)-1e-11,uh=Math.max(ua,ub)+1e-11,u2min=ul<=0&&uh>=0?0:Math.min(ul*ul,uh*uh),u2max=Math.max(ul*ul,uh*uh),fmin=1-g.tipTaper*Math.min(1,u2max),fmax=1-g.tipTaper*Math.min(1,u2min),q0=g.halfSpan*(1+g.tipRoundness*(3*Math.min(1,u2min)-1)),q1=g.halfSpan*(1+g.tipRoundness*(3*Math.min(1,u2max)-1)),qmin=Math.min(q0,q1)-1e-12,qmax=Math.max(q0,q1)+1e-12;
 const closest=a?Math.max(lo,Math.min(hi,-b/a)):lo,pad=(g.bendRadius+g.bodyRadius)*1e-12,rmin=Math.hypot(o[0]+closest*d[0],o[1]+closest*d[1])-pad,rmax=Math.max(Math.hypot(x0,y0),Math.hypot(x1,y1))+pad;if(rmin<=0)return 0;
 const z0=o[2]+lo*d[2],z1=o[2]+hi*d[2],radialMinimum=rmin<=g.bendRadius&&rmax>=g.bendRadius?0:Math.min(Math.abs(rmin-g.bendRadius),Math.abs(rmax-g.bendRadius))/(g.bodyRadius*fmax),zMinimum=z0*z1<=0?0:Math.min(Math.abs(z0),Math.abs(z1))/(g.bodyDepth*fmax);if(u2min+radialMinimum*radialMinimum+zMinimum*zMinimum>1+1e-10)return 2;const vmax=Math.max(Math.abs(rmin-g.bendRadius),Math.abs(rmax-g.bendRadius))/(g.bodyRadius*fmin),wmax=Math.max(Math.abs(z0),Math.abs(z1))/(g.bodyDepth*fmin),factor=1+2*g.tipTaper/fmin*(vmax*vmax+wmax*wmax),U:Range=ul>=0?[ul,uh*factor]:uh<=0?[ul*factor,uh]:[ul*factor,uh*factor],cross=o[0]*d[1]-o[1]*d[0],C:Range=[cross-pad,cross+pad],one=divPositive(mul(U,C),rmin*rmin*qmin,rmax*rmax*qmax),two=divPositive(mul([rmin-g.bendRadius,rmax-g.bendRadius],[b+a*lo,b+a*hi]),g.bodyRadius**2*fmin*fmin*rmin,g.bodyRadius**2*fmax*fmax*rmax),three=divPositive([Math.min(z0*d[2],z1*d[2]),Math.max(z0*d[2],z1*d[2])],g.bodyDepth**2*fmin*fmin,g.bodyDepth**2*fmax*fmax),low=one[0]+two[0]+three[0],high=one[1]+two[1]+three[1],error=1e-10*(1+Math.abs(low)+Math.abs(high));
 return high< -error?-1:low>error?1:0;
}
