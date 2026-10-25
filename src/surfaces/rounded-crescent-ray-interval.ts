import type {Vec3} from './cube-sphere.ts';
import type {RoundedCrescentGeometry} from './rounded-crescent-globe.ts';
import {roundedRayDomain,roundedRayTracer} from './rounded-crescent-ray.ts';
/** Squared inverse norm has no singularity inside material. Bounds on its
 * exact second directional derivative certify empty intervals and monotone
 * brackets; uncertain intervals subdivide from front to back. */
export function roundedIntervalRayTracer(g:RoundedCrescentGeometry,windows:(o:Vec3,d:Vec3)=>[number,number][]){
 const R=g.bendRadius,A=g.bodyRadius,B=g.bodyDepth,k=g.tipTaper,beta=g.halfSpan,h=g.tipRoundness,fallback=roundedRayTracer(g);
 return(ox:number,oy:number,oz:number,dx:number,dy:number,dz:number,out:Float64Array)=>{
  if(Math.abs(dx)+Math.abs(dy)<1e-14)return fallback(ox,oy,oz,dx,dy,dz,out);
  const o:Vec3=[ox,oy,oz],d:Vec3=[dx,dy,dz];out[4]=Infinity;const candidates=windows(o,d);if(!candidates.length)return false;const domains=roundedRayDomain(g,o,d);if(!domains.length)return false;
  const a=dx*dx+dy*dy,b=ox*dx+oy*dy,cross=ox*dy-oy*dx,speed=Math.sqrt(a),angular=(angle:number)=>{let u=angle/beta;if(h)for(let j=0;j<5;j++)u-=(beta*(u+h*(u*u*u-u))-angle)/(beta*(1+h*(3*u*u-1)));return u;};
  let u=0,v=0,w=0,slope=0,count=0,root=Infinity,minimum=Infinity,minimumAway=Infinity;
  const value=(t:number)=>{const x=ox+dx*t,y=oy+dy*t,z=oz+dz*t,r=Math.sqrt(x*x+y*y);u=angular(Math.atan2(y,x));const f=1-k*u*u,prime=beta*(1+h*(3*u*u-1)),up=cross/(r*r*prime),fp=-2*k*u*up;v=(r-R)/(A*f);w=z/(B*f);const vp=(b+a*t)/(r*A*f)-v*fp/f,wp=dz/(B*f)-w*fp/f;slope=2*(u*up+v*vp+w*wp);return u*u+v*v+w*w-1;};
  const bound=(lo:number,hi:number)=>{const x0=ox+dx*lo,y0=oy+dy*lo,x1=ox+dx*hi,y1=oy+dy*hi,t=Math.max(lo,Math.min(hi,-b/a)),rmin=Math.max(R-A-1e-10,Math.sqrt((ox+dx*t)**2+(oy+dy*t)**2)-1e-10),rmax=Math.max(Math.sqrt(x0*x0+y0*y0),Math.sqrt(x1*x1+y1*y1))+1e-10,ua=angular(Math.atan2(y0,x0)),ub=angular(Math.atan2(y1,x1)),umax=Math.min(1,Math.max(Math.abs(ua),Math.abs(ub))+1e-10),umin=ua*ub<=0?0:Math.max(0,Math.min(Math.abs(ua),Math.abs(ub))-1e-10),f=1-k*umax*umax,q=beta*Math.min(1+h*(3*umin*umin-1),1+h*(3*umax*umax-1)),qq=6*beta*Math.abs(h)*umax,U=Math.abs(cross)/(rmin*rmin*q),UU=(2*Math.abs(cross)*speed/(rmin*rmin*rmin)+qq*U*U)/q,F=2*k*umax*U,FF=2*k*(U*U+umax*UU),V=Math.max(Math.abs(rmin-R),Math.abs(rmax-R))/(A*f),W=Math.max(Math.abs(oz+dz*lo),Math.abs(oz+dz*hi))/(B*f),vp=speed/(A*f)+V*F/f,wp=Math.abs(dz)/(B*f)+W*F/f,vpp=a/(rmin*A*f)+2*speed*F/(A*f*f)+V*FF/f+2*V*(F/f)**2,wpp=2*Math.abs(dz)*F/(B*f*f)+W*FF/f+2*W*(F/f)**2;
   return 2*(U*U+vp*vp+wp*wp+Math.sqrt(umax*umax+V*V+W*W)*Math.sqrt(UU*UU+vpp*vpp+wpp*wpp))*(1+1e-6)+1e-9;};
  const solve=(lo:number,hi:number,fl:number,fh:number)=>{let t=lo+(hi-lo)*fl/(fl-fh||1);for(let j=0;j<36;j++){const f=value(t);if(Math.abs(f/slope)<2e-11||hi-lo<2e-11){root=t;return true;}if(f>0){lo=t;fl=f;}else{hi=t;fh=f;}const next=t-f/slope;t=Number.isFinite(next)&&next>lo&&next<hi?next:(lo+hi)/2;}root=(lo+hi)/2;return true;};
  const search=(lo:number,hi:number,fl:number,fh:number,M:number,depth:number):boolean=>{if(++count>512)return false;const mid=(lo+hi)/2,half=(hi-lo)/2,fm=value(mid),sm=slope,lower=fm-M*half*half/2-Math.abs(sm)*half-1e-11;if(lower>0){const distance=Math.sqrt(1+lower)-1;minimum=Math.min(minimum,distance);if(sm>=0)minimumAway=Math.min(minimumAway,distance);return false;}
   if(sm+M*half< -1e-10||sm-M*half>1e-10){if(fl>0&&fh>0){const distance=Math.sqrt(1+Math.min(fl,fh))-1;minimum=Math.min(minimum,distance);if(sm>=0)minimumAway=Math.min(minimumAway,distance);return false;}if(fl>=0&&fh<=0)return solve(lo,hi,fl,fh);}
   if(depth>=28||hi-lo<2e-11){if(fl>=0&&fm<=0)return solve(lo,mid,fl,fm);if(fm>=0&&fh<=0)return solve(mid,hi,fm,fh);return false;}
   return search(lo,mid,fl,fm,M,depth+1)||search(mid,hi,fm,fh,M,depth+1);
  };
  for(const candidate of candidates)for(const domain of domains){const lo=Math.max(candidate[0],domain[0]!),hi=Math.min(candidate[1],domain[1]!);if(lo>hi)continue;const cuts=[lo,hi];for(const angle of[-beta,beta,Math.PI]){const sn=Math.sin(angle),cs=Math.cos(angle),den=dx*sn-dy*cs;if(Math.abs(den)>1e-15){const t=-(ox*sn-oy*cs)/den;if(t>lo&&t<hi)cuts.push(t);}}cuts.sort((a,b)=>a-b);for(let i=0;i+1<cuts.length;i++){const l=cuts[i]!,r=cuts[i+1]!,mid=(l+r)/2;if(Math.abs(Math.atan2(oy+dy*mid,ox+dx*mid))>beta+1e-12)continue;const fl=value(l),fh=value(r);if(search(l,r,fl,fh,bound(l,r),0)){value(root);const n=Math.sqrt(u*u+v*v+w*w);out[0]=u/n;out[1]=v/n;out[2]=w/n;out[3]=root;out[4]=minimumAway;return true;}if(count>512)return fallback(ox,oy,oz,dx,dy,dz,out);}}
  out[4]=minimum;return false;
 };
}
