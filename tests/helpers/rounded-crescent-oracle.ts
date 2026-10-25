import type {RoundedCrescentGeometry} from '../../src/surfaces/rounded-crescent-globe.ts';
import {cross3,dot3,unitDirection,type Vec3} from '../../src/surfaces/cube-sphere.ts';
/** Independent Cardano inversion and sampled stationary-point bracketing.
 * No production fold, inverse, ray, bounds, normal or gradient determines this
 * reference. This is a converged numerical oracle, not an interval proof. */
export function roundedOracle(g:RoundedCrescentGeometry){
 const R=g.curvatureRatio,A=g.bodyRadiusRatio,B=A*g.depthRatio,beta=g.spanDegrees*Math.PI/360,k=g.tipTaper,h=g.tipRoundness,E=R+A;
 const inverseAngle=(angle:number)=>{const z=angle/beta;if(h===0)return z;const a=(1-h)/h,b=-z/h;if(a>0)return 2*Math.sqrt(a/3)*Math.sinh(Math.asinh(-3*b/(2*a)*Math.sqrt(3/a))/3);return -2*Math.sqrt(-a/3)*Math.sin(Math.asin(Math.max(-1,Math.min(1,3*b/(2*a)*Math.sqrt(-3/a))))/3);};
 const inverse=(x:number,y:number,z:number):Vec3=>{const u=inverseAngle(Math.atan2(y,x)),f=1-k*u*u;return[u,(Math.hypot(x,y)-R)/(A*f),z/(B*f)];};
 const position=(p:Vec3):Vec3=>{const[u,v,w]=p,f=1-k*u*u,a=beta*((1-h)*u+h*u*u*u),r=R+A*f*v;return[r*Math.cos(a),r*Math.sin(a),B*f*w];};
 const trace=(origin:Vec3,ray:Vec3,steps=64):Vec3|undefined=>{
  const at=(t:number)=>{const x=origin[0]+t*ray[0],y=origin[1]+t*ray[1],z=origin[2]+t*ray[2];if(Math.abs(Math.atan2(y,x))>beta)return 1+Math.abs(Math.atan2(y,x))-beta;const p=inverse(x,y,z);return dot3(p,p)-1;};
  if(Math.abs(ray[0])+Math.abs(ray[1])<1e-13){if(Math.abs(Math.atan2(origin[1],origin[0]))>beta)return;const p=inverse(origin[0],origin[1],0),square=1-p[0]*p[0]-p[1]*p[1];return square<0?undefined:[p[0],p[1],Math.sign(-ray[2])*Math.sqrt(square)];}
  if(Math.abs(ray[2])<1e-14&&Math.abs(origin[2])>B)return;
  const along=dot3(origin,ray),disc=along*along-dot3(origin,origin)+E*E;if(disc<0)return;
  let lo=-along-Math.sqrt(disc),hi=-along+Math.sqrt(disc);if(Math.abs(ray[2])>1e-14){const a=(-B-origin[2])/ray[2],b=(B-origin[2])/ray[2];lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}if(lo>hi)return;
  const points=Array.from({length:steps+1},(_,i)=>lo+(hi-lo)*i/steps),values=points.map(at);let previous=points[0]!,previousValue=values[0]!;
  for(let i=1;i<=steps;i++){
   let time=points[i]!,value=values[i]!;
   if(value>0&&i<steps&&value<=values[i-1]!&&value<=values[i+1]!){let left=points[i-1]!,right=points[i+1]!;const ratio=(Math.sqrt(5)-1)/2;let a=right-ratio*(right-left),b=left+ratio*(right-left),av=at(a),bv=at(b);for(let j=0;j<32;j++){if(av<bv){right=b;b=a;bv=av;a=right-ratio*(right-left);av=at(a);}else{left=a;a=b;av=bv;b=left+ratio*(right-left);bv=at(b);}}time=(left+right)/2;value=at(time);}
   if(value<=0){let left=previous,right=time;if(previousValue<=0)right=left;for(let j=0;j<36;j++){const m=(left+right)/2;if(at(m)>0)left=m;else right=m;}const t=(left+right)/2;return unitDirection(inverse(origin[0]+ray[0]*t,origin[1]+ray[1]*t,origin[2]+ray[2]*t));}
   previous=points[i]!;previousValue=values[i]!;
  }
 };
 const shading=(p:Vec3,gradient:Vec3)=>{
  const e=unitDirection(cross3(p,Math.abs(p[2])<.8?[0,0,1]:[0,1,0])),f=cross3(p,e),delta=2e-5;
  const derivative=(t:Vec3)=>{const a=position(unitDirection(p.map((v,i)=>v+delta*t[i]!) as unknown as Vec3)),b=position(unitDirection(p.map((v,i)=>v-delta*t[i]!) as unknown as Vec3));return a.map((v,i)=>(v-b[i]!)/(2*delta)) as unknown as Vec3;},x=derivative(e),y=derivative(f),aa=dot3(x,x),ab=dot3(x,y),bb=dot3(y,y),det=aa*bb-ab*ab,ge=dot3(gradient,e),gf=dot3(gradient,f),vx=(bb*ge-ab*gf)/det,vy=(aa*gf-ab*ge)/det;
  return{normal:unitDirection(cross3(y,x)),gradient:x.map((v,i)=>v*vx+y[i]!*vy) as unknown as Vec3};
 };
 return{inverse,position,trace,shading};
}
