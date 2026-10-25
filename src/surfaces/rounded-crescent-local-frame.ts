import {cross3,dot3,unitDirection,type Vec3} from './cube-sphere.ts';
import type {RoundedCrescentGeometry} from './rounded-crescent-globe.ts';

/** The same induced derivatives as roundedLocalChart, expressed in the
 * orthonormal cylindrical frame at each point. Inner products are invariant
 * under this rotation. Reusable scalar storage avoids allocating dozens of
 * vectors per quadrature point; it never replaces the curved metric. */
export function roundedBrushChart(g:RoundedCrescentGeometry,center:Vec3){
 const c=unitDirection(center),e=unitDirection(cross3(c,Math.abs(c[2])<.8?[0,0,1]:[0,1,0])),f=cross3(c,e),p=new Float64Array(3),px=new Float64Array(3),py=new Float64Array(3),pxx=new Float64Array(3),pxy=new Float64Array(3),pyy=new Float64Array(3);
 const frame=(x:number,y:number,out:Float64Array,second=true)=>{
  const s=Math.sqrt(1+x*x+y*y),s3=s*s*s,s5=s3*s*s;
  for(let i=0;i<3;i++){const w=c[i]!+x*e[i]!+y*f[i]!;p[i]=w/s;px[i]=e[i]!/s-w*x/s3;py[i]=f[i]!/s-w*y/s3;if(second){pxx[i]=-(2*e[i]!*x+w)/s3+3*w*x*x/s5;pxy[i]=-(e[i]!*y+f[i]!*x)/s3+3*w*x*y/s5;pyy[i]=-(2*f[i]!*y+w)/s3+3*w*y*y/s5;}}
  const u=p[0]!,v=p[1]!,w=p[2]!,k=g.tipTaper,h=g.tipRoundness,A=g.bodyRadius,B=g.bodyDepth,profile=1-k*u*u,fp=-2*k*u,q=g.halfSpan*(1+h*(3*u*u-1)),r=g.bendRadius+A*profile*v;
  const j0=A*fp*v,j1=r*q,j2=B*fp*w,j3=A*profile,j8=B*profile;
  out[0]=j0*px[0]!+j3*px[1]!;out[1]=j1*px[0]!;out[2]=j2*px[0]!+j8*px[2]!;
  out[3]=j0*py[0]!+j3*py[1]!;out[4]=j1*py[0]!;out[5]=j2*py[0]!+j8*py[2]!;
  if(!second)return;
  const xx0=-2*k*A*v-r*q*q,xx1=2*A*fp*v*q+r*6*g.halfSpan*h*u,xx2=-2*k*B*w,xy0=A*fp,xy1=A*profile*q,xz2=B*fp;
  const combine=(a:Float64Array,b:Float64Array,ab:Float64Array,offset:number)=>{const uu=a[0]!*b[0]!,uv=a[0]!*b[1]!+a[1]!*b[0]!,uw=a[0]!*b[2]!+a[2]!*b[0]!;out[offset]=j0*ab[0]!+j3*ab[1]!+xx0*uu+xy0*uv;out[offset+1]=j1*ab[0]!+xx1*uu+xy1*uv;out[offset+2]=j2*ab[0]!+j8*ab[2]!+xx2*uu+xz2*uw;};
  combine(px,px,pxx,6);combine(px,py,pxy,9);combine(py,py,pyy,12);
 };
 return{center:c,frame,coordinates:(p:Vec3)=>{const d=dot3(c,p);if(d<=.7)throw RangeError('Rounded Crescent route exceeds its qualified local chart.');return[dot3(e,p)/d,dot3(f,p)/d] as const;},direction:(x:number,y:number):Vec3=>{const s=Math.sqrt(1+x*x+y*y);return[(c[0]+x*e[0]+y*f[0])/s,(c[1]+x*e[1]+y*f[1])/s,(c[2]+x*e[2]+y*f[2])/s];}};
}
