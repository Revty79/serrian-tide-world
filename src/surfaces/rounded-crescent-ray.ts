import {roundedRayWindows} from './rounded-crescent-bounds.ts';
import {roundedRaySlopeSign} from './rounded-crescent-ray-monotone.ts';
import {unitDirection,type Vec3} from './cube-sphere.ts';
import {roundedPoint,roundedNormal,type RoundedCrescentGeometry} from './rounded-crescent-globe.ts';

/** Continuous extension of inverse coordinates outside the two pole angles.
 * Only the unit level set is material; the extension supplies a conservative
 * Lipschitz distance step and creates no extra surface or terminal caps. */
export function roundedImplicit(g:RoundedCrescentGeometry,q:Vec3){
 const r=Math.hypot(q[0],q[1]),angle=Math.atan2(q[1],q[0]);let u=angle/g.halfSpan;
 if(Math.abs(angle)>g.halfSpan)u=Math.sign(angle)*(1+(Math.abs(angle)-g.halfSpan)/(g.halfSpan*(1+2*g.tipRoundness)));
 else if(g.tipRoundness!==0)for(let i=0;i<4;i++)u-=(g.halfSpan*(u+g.tipRoundness*(u*u*u-u))-angle)/(g.halfSpan*(1+g.tipRoundness*(3*u*u-1)));
 const f=1-g.tipTaper*Math.min(1,u*u),p:Vec3=[u,(r-g.bendRadius)/(g.bodyRadius*f),q[2]/(g.bodyDepth*f)];return{value:Math.hypot(...p)-1,direction:p};
}
export function roundedRayStretch(g:RoundedCrescentGeometry){const f=1-g.tipTaper,A=g.bodyRadius,B=g.bodyDepth,minAngle=g.halfSpan*(1-2*Math.abs(g.tipRoundness)),r=g.bendRadius-A;return 1/Math.sqrt((1+2*(2*g.tipTaper/(f*f))**2)/(minAngle*r)**2+1/(A*f)**2+1/(B*f)**2);}
/** For H(q)=|F^-1(q)|-1 outside material, |D2 H| is at most
 * L^2 + |D2 F| L^3, L=|DF^-1|. The ambient Hessian has only xx,xy,xz
 * terms. This bound applies inside the angular and annular search domain;
 * steps are clipped to that domain before using its Taylor lower bound. */
export function roundedRayCurvature(g:RoundedCrescentGeometry){const f=1-g.tipTaper,k=g.tipTaper,A=g.bodyRadius,B=g.bodyDepth,E=g.bendRadius+A,q=g.halfSpan*(1+2*Math.abs(g.tipRoundness)),qq=6*g.halfSpan*Math.abs(g.tipRoundness),H=Math.hypot(2*k*A/f+E*q*q,4*k*A*q/f+E*qq,2*k*B/f)+2*A*Math.hypot(2*k,q)+4*k*B,L=1/roundedRayStretch(g);return(L*L+H*L*L*L)*(1+1e-6);}
/** Directional inverse-coordinate derivative bound on the annular/slab domain.
 * H'' <= |p'|^2+|p''| while |p|>=1. Radius and angle derivatives along a
 * straight ray are analytic; f'= -2*k*u*u', f''= -2*k*(u'^2+u*u'').
 * The angular boundary clips every Taylor step before this bound is used. */
export function roundedDirectionalCurvature(g:RoundedCrescentGeometry,o:Vec3,d:Vec3,domains:readonly number[][]){
 const a=d[0]*d[0]+d[1]*d[1],speed=Math.sqrt(a),cross=Math.abs(o[0]*d[1]-o[1]*d[0]),b=o[0]*d[0]+o[1]*d[1];let r=Infinity;for(const [lo,hi] of domains){const t=a?Math.max(lo!,Math.min(hi!,-b/a)):lo!;r=Math.min(r,Math.sqrt((o[0]+d[0]*t)**2+(o[1]+d[1]*t)**2));}r=Math.max(g.bendRadius-g.bodyRadius-1e-10,r-1e-10);
 const f=1-g.tipTaper,q=g.halfSpan*(1-2*Math.abs(g.tipRoundness)),qq=6*g.halfSpan*Math.abs(g.tipRoundness),U=cross/(r*r*q),UU=(2*cross*speed/(r*r*r)+qq*U*U)/q,F=2*g.tipTaper*U,FF=2*g.tipTaper*(U*U+UU),V=1/f,W=1/f,vp=speed/(g.bodyRadius*f)+V*F/f,wp=Math.abs(d[2])/(g.bodyDepth*f)+W*F/f,vpp=a/(r*g.bodyRadius*f)+2*speed*F/(g.bodyRadius*f*f)+V*FF/f+2*V*(F/f)**2,wpp=2*Math.abs(d[2])*F/(g.bodyDepth*f*f)+W*FF/f+2*W*(F/f)**2;
 return (U*U+vp*vp+wp*wp+Math.sqrt(UU*UU+vpp*vpp+wpp*wpp))*(1+1e-6);
}
/** Exact annular-cylinder/slab search domain. In particular, traverse an empty
 * inner cylinder analytically instead of distance-marching away from a nearly
 * tangent bounding cylinder for hundreds of iterations. */
export function roundedRayDomain(g:RoundedCrescentGeometry,o:Vec3,d:Vec3){
 const pad=(g.bendRadius+g.bodyRadius)*1e-12,outer=g.bendRadius+g.bodyRadius+pad,inner=g.bendRadius-g.bodyRadius-pad,B=g.bodyDepth+pad,a=d[0]*d[0]+d[1]*d[1],b=o[0]*d[0]+o[1]*d[1],c=o[0]*o[0]+o[1]*o[1];let lo=-Infinity,hi=Infinity,hole:[number,number]|undefined;
 if(a>1e-28){const disc=b*b-a*(c-outer*outer);if(disc<0)return[];lo=(-b-Math.sqrt(disc))/a;hi=(-b+Math.sqrt(disc))/a;const innerDisc=b*b-a*(c-inner*inner);if(innerDisc>0)hole=[(-b-Math.sqrt(innerDisc))/a,(-b+Math.sqrt(innerDisc))/a];}else if(c>outer*outer||c<inner*inner)return[];
 if(Math.abs(d[2])>1e-28){const x=(-B-o[2])/d[2],y=(B-o[2])/d[2];lo=Math.max(lo,Math.min(x,y));hi=Math.min(hi,Math.max(x,y));}else if(Math.abs(o[2])>B)return[];
 if(lo>hi)return[];if(!hole)return[[lo,hi]];const result:number[][]=[];if(lo<=Math.min(hi,hole[0]))result.push([lo,Math.min(hi,hole[0])]);if(Math.max(lo,hole[1])<=hi)result.push([Math.max(lo,hole[1]),hi]);return result;
}
/** First positive material intersection on the smooth reference boundary.
 * Distances and origins are normalized by scaleMeters, never world squares. */
export function traceRoundedCrescent(g:RoundedCrescentGeometry,origin:Vec3,direction:Vec3){
 const d=unitDirection(direction),out=new Float64Array(4);if(!roundedRayTracer(g)(...origin,...d,out))return;const p:Vec3=[out[0]!,out[1]!,out[2]!];return{distance:out[3]!,direction:p,position:roundedPoint(g,p),normal:roundedNormal(g,p)};
}
type Tracer=(ox:number,oy:number,oz:number,dx:number,dy:number,dz:number,out:Float64Array)=>boolean;
const tracers=new WeakMap<RoundedCrescentGeometry,Tracer>();
/** Allocation-free geometry-only implementation for bounded Canvas grids. */
export function roundedRayTracer(g:RoundedCrescentGeometry,parallelWindows?: (origin:Vec3,direction:Vec3)=>[number,number][]):Tracer{
 const found=!parallelWindows&&tracers.get(g);if(found)return found;
 const R=g.bendRadius,A=g.bodyRadius,B=g.bodyDepth,beta=g.halfSpan,k=g.tipTaper,h=g.tipRoundness,E=R+A,stretch=roundedRayStretch(g),globalM=roundedRayCurvature(g),cb=Math.cos(beta),sb=Math.sin(beta);
 const trace:Tracer=(ox,oy,oz,dx,dy,dz,out)=>{out[4]=Infinity;
  let u=0,v=0,w=0,profile=1,radial=1,angle=0;
  const inverse=(x:number,y:number,z:number)=>{radial=Math.sqrt(x*x+y*y);angle=Math.atan2(y,x);u=angle/beta;if(Math.abs(angle)>beta)u=Math.sign(angle)*(1+(Math.abs(angle)-beta)/(beta*(1+2*h)));else if(h!==0)for(let j=0;j<4;j++)u-=(beta*(u+h*(u*u*u-u))-angle)/(beta*(1+h*(3*u*u-1)));profile=1-k*Math.min(1,u*u);v=(radial-R)/(A*profile);w=z/(B*profile);return Math.sqrt(u*u+v*v+w*w)-1;};
  const result=(time:number)=>{inverse(ox+dx*time,oy+dy*time,oz+dz*time);const n=Math.sqrt(u*u+v*v+w*w);out[0]=u/n;out[1]=v/n;out[2]=w/n;out[3]=time;return true;};
  if(Math.abs(dx)+Math.abs(dy)<1e-14){inverse(ox,oy,0);const square=1-u*u-v*v;if(square<0){out[4]=Math.sqrt(u*u+v*v)-1;return false;}const z=B*profile*Math.sqrt(square)*(dz<0?1:-1),t=(z-oz)/dz;if(t<0)return false;out[0]=u;out[1]=v;out[2]=z/(B*profile);out[3]=t;return true;}
  const along=ox*dx+oy*dy+oz*dz,disc=along*along-ox*ox-oy*oy-oz*oz+E*E;if(disc<0)return false;const origin:Vec3=[ox,oy,oz],ray:Vec3=[dx,dy,dz],domains=roundedRayDomain(g,origin,ray);if(!domains.length)return false;const windows=(parallelWindows??roundedRayWindows.bind(null,g))(origin,ray).flatMap(w=>domains.map(d=>[Math.max(w[0],d[0]!),Math.min(w[1],d[1]!)] as [number,number]).filter(w=>w[0]<=w[1]));if(!windows.length)return false;const M=Math.min(globalM,roundedDirectionalCurvature(g,origin,ray,domains)),newtonM=M+1/(stretch*stretch);let wi=0,knownWindow=-1,t=windows[0]![0],end=windows[0]![1],previous=Math.max(0,-along-Math.sqrt(disc));
  for(let iteration=0;iteration<512;iteration++){if(t>end){if(++wi>=windows.length)return false;t=windows[wi]![0];end=windows[wi]![1];}
   if(knownWindow!==wi){knownWindow=wi;const sign=roundedRaySlopeSign(g,origin,ray,t,end);if(sign===2){t=end+1e-10;continue;}if(sign){let lo=t,hi=end,fl=inverse(ox+dx*lo,oy+dy*lo,oz+dz*lo),fh=inverse(ox+dx*hi,oy+dy*hi,oz+dz*hi);if(sign<0&&fh>0||sign>0&&fl>0){out[4]=Math.min(out[4]??Infinity,fl,fh);t=end+1e-10;continue;}if(sign<0&&fl>=0&&fh<=0){let time=lo+(hi-lo)*fl/(fl-fh||1);for(let j=0;j<32;j++){const x=ox+dx*time,y=oy+dy*time,z=oz+dz*time,value=inverse(x,y,z),norm=1+value,prime=Math.abs(u)<1?beta*(1+h*(3*u*u-1)):beta*(1+2*h),fp=Math.abs(u)<1?-2*k*u:0,gt=(u-fp/profile*(v*v+w*w))/(prime*radial*norm),gn=v/(A*profile*norm),gz=w/(B*profile*norm),slope=(gn*x/radial-gt*y/radial)*dx+(gn*y/radial+gt*x/radial)*dy+gz*dz;if(value===0||Math.abs(value/slope)<2e-10||hi-lo<2e-10)return result(time);if(value>0){lo=time;fl=value;}else{hi=time;fh=value;}const next=time-value/slope;time=Number.isFinite(next)&&next>lo&&next<hi?next:(lo+hi)/2;}return result((lo+hi)/2);}}}
   const x=ox+dx*t,y=oy+dy*t,z=oz+dz*t;
   const value=inverse(x,y,z);
   if(value<=0){let lo=previous,hi=t;for(let j=0;j<30&&hi-lo>2e-10;j++){const m=(lo+hi)/2;if(inverse(ox+dx*m,oy+dy*m,oz+dz*m)>0)lo=m;else hi=m;}t=(lo+hi)/2;inverse(ox+dx*t,oy+dy*t,oz+dz*t);const n=Math.sqrt(u*u+v*v+w*w);out[0]=u/n;out[1]=v/n;out[2]=w/n;out[3]=t;return true;}
   let quadratic=0;
   {const norm=1+value,prime=Math.abs(u)<1?beta*(1+h*(3*u*u-1)):beta*(1+2*h),fp=Math.abs(u)<1?-2*k*u:0,gt=(u-fp/profile*(v*v+w*w))/(prime*radial*norm),gn=v/(A*profile*norm),gz=w/(B*profile*norm),slope=(gn*x/radial-gt*y/radial)*dx+(gn*y/radial+gt*x/radial)*dy+gz*dz,root=Math.sqrt(slope*slope+2*M*value),step=slope>=0?(slope+root)/M:2*value/(root-slope),angular=Math.min(x*cb+y*sb>=0?Math.abs(x*sb-y*cb):radial,x*cb-y*sb>=0?Math.abs(x*sb+y*cb):radial,x<0?Math.abs(y):radial),clearance=Math.min(radial-(R-A),R+A-radial,B-Math.abs(z),angular);
    if(value<2e-11&&slope<0&&value/-slope<2e-10){const n=1+value;out[0]=u/n;out[1]=v/n;out[2]=w/n;out[3]=t;return true;}
    // Newton advances only inside an interval proved strictly decreasing by
    // the Hessian bound. Limiting the step to L*d<1/2 keeps |F^-1|>1/2 even
    // beyond an entry root; newtonM includes that norm-Hessian allowance.
    const newton=slope<0?value/-slope:Infinity;if(newton<clearance*.9&&newton<stretch*.5&&newtonM*newton< -slope*.9){previous=t;t+=newton;continue;}
    if(slope>=0)out[4]=Math.min(out[4]??Infinity,value);quadratic=.9*Math.max(0,Math.min(step,clearance));
   }
   previous=t;t+=Math.max(value*stretch,quadratic,1e-11);
  }return false;
 };
 if(!parallelWindows)tracers.set(g,trace);return trace;
}
const visibilityCaches=new WeakMap<RoundedCrescentGeometry,{forward:Vec3;values:Map<string|number,boolean>}[]>();
const visibilityHit=new Float64Array(4);
/** Visibility depends only on reference geometry and camera, never heights.
 * Two camera epochs, each capped at 8192 point results, survive ordinary dabs
 * and completed pooled workers. An exact direction key avoids geography or
 * tolerance-dependent quantization. */
export function roundedVisible(g:RoundedCrescentGeometry,p:Vec3,forward:Vec3,canonicalCoordinate?:number){
 if(Math.hypot(forward[0],forward[1])<1e-12)return p[2]*forward[2]>=-1e-14;
 let entries=visibilityCaches.get(g);if(!entries){entries=[];visibilityCaches.set(g,entries);}let entry=entries.find(e=>e.forward.every((v,i)=>v===forward[i]));if(!entry){if(entries.length===2)entries.shift();entry={forward:[...forward],values:new Map()};entries.push(entry);}const key=canonicalCoordinate??p.join(','),cached=entry.values.get(key);if(cached!==undefined)return cached;
 const q=roundedPoint(g,p),extent=g.bendRadius+g.bodyRadius,distance=3*extent;
 // On this exact orthographic ray the physical endpoint distance equals the
 // difference of ray parameters. Visibility needs no normal, Hessian or
 // material-point reconstruction from the public rich intersection result.
 const visible=roundedRayTracer(g)(q[0]+forward[0]*distance,q[1]+forward[1]*distance,q[2]+forward[2]*distance,-forward[0],-forward[1],-forward[2],visibilityHit)&&Math.abs(visibilityHit[3]!-distance)<2e-7;
 if(entry.values.size===8192)entry.values.delete(entry.values.keys().next().value!);entry.values.set(key,visible);return visible;
}
