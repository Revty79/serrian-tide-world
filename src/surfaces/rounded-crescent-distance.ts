import {roundedRefinedRoute} from './rounded-crescent-variational-route.ts';
import {cross3,dot3,unitDirection,type Vec3} from './cube-sphere.ts';
import {roundedDifferential,type RoundedCrescentGeometry} from './rounded-crescent-globe.ts';
import {roundedBrushChart} from './rounded-crescent-local-frame.ts';

type V2=readonly[number,number];type State=readonly[number,number,number,number];
/** Regular gnomonic coordinates centered at the query, including both physical
 * terminal poles and every numerical cube seam. These are not flat distances. */
export function roundedLocalChart(g:RoundedCrescentGeometry,center:Vec3){
 const c=unitDirection(center),e=unitDirection(cross3(c,Math.abs(c[2])<.8?[0,0,1]:[0,1,0])),f=cross3(c,e);
 const direction=(x:number,y:number):Vec3=>{const s=Math.hypot(1,x,y);return c.map((v,i)=>(v+x*e[i]!+y*f[i]!)/s) as unknown as Vec3;};
 const coordinates=(p:Vec3):V2=>{const d=dot3(c,p);if(d<=.7)throw RangeError('Rounded Crescent route exceeds its qualified local chart.');return[dot3(e,p)/d,dot3(f,p)/d];};
 const frame=(x:number,y:number)=>{
  const s=Math.hypot(1,x,y),s3=s**3,s5=s**5,w=c.map((v,i)=>v+x*e[i]!+y*f[i]!) as unknown as Vec3,p=w.map(v=>v/s) as unknown as Vec3,D=roundedDifferential(g,p);
  const px=e.map((v,i)=>v/s-w[i]!*x/s3) as unknown as Vec3,py=f.map((v,i)=>v/s-w[i]!*y/s3) as unknown as Vec3;
  const pxx=e.map((v,i)=>-(2*v*x+w[i]!)/s3+3*w[i]!*x*x/s5) as unknown as Vec3,pxy=e.map((v,i)=>-(v*y+f[i]!*x)/s3+3*w[i]!*x*y/s5) as unknown as Vec3,pyy=f.map((v,i)=>-(2*v*y+w[i]!)/s3+3*w[i]!*y*y/s5) as unknown as Vec3;
  const Jx=D.apply(px),Jy=D.apply(py),combine=(a:Vec3,b:Vec3):Vec3=>a.map((v,i)=>v+b[i]!) as unknown as Vec3;
  return{Jx,Jy,Hxx:combine(D.apply(pxx),D.second(px,px)),Hxy:combine(D.apply(pxy),D.second(px,py)),Hyy:combine(D.apply(pyy),D.second(py,py))};
 };
 const derivative=(q:State):State=>{
  const[x,y,vx,vy]=q,{Jx,Jy,Hxx,Hxy,Hyy}=frame(x,y),acc=Hxx.map((v,i)=>v*vx*vx+2*Hxy[i]!*vx*vy+Hyy[i]!*vy*vy) as unknown as Vec3;
  const aa=dot3(Jx,Jx),ab=dot3(Jx,Jy),bb=dot3(Jy,Jy),det=aa*bb-ab*ab,rx=dot3(Jx,acc),ry=dot3(Jy,acc);
  if(!(det>0))throw RangeError('Rounded Crescent route lost its physical metric.');
  return[vx,vy,(ab*ry-bb*rx)/det,(ab*rx-aa*ry)/det];
 };
 const integrate=(velocity:V2,steps:number,time=1):State=>{
  let q:State=[0,0,...velocity];const h=time/steps;
  const add=(a:State,b:State,t:number)=>a.map((v,i)=>v+t*b[i]!) as unknown as State;
  for(let i=0;i<steps;i++){const a=derivative(q),b=derivative(add(q,a,h/2)),c=derivative(add(q,b,h/2)),d=derivative(add(q,c,h));q=q.map((v,k)=>v+h/6*(a[k]!+2*b[k]!+2*c[k]!+d[k]!)) as unknown as State;if(!q.every(Number.isFinite)||Math.hypot(q[0],q[1])>.9)throw RangeError('Rounded Crescent route left its bounded physical chart.');}
  return q;
 };
 return{center:c,direction,coordinates,frame,integrate};
}
/** Bounded numerical geodesic shooting in the ACTUAL induced metric. RK4 and
 * endpoint shooting refine together; convergence estimates are numerical, not
 * certified interval enclosures. Callers retain the global stretch lower bound
 * for candidate/topology rejection. Independent refined routes qualify this
 * local footprint before browser acceptance. Never pass this result off as a
 * ConnectedDabAdapter certified global-distance receipt. */
export function roundedGeodesic(g:RoundedCrescentGeometry,first:Vec3,last:Vec3,options:{steps?:number;tolerance?:number}={}){
 const chart=roundedLocalChart(g,first),target=chart.coordinates(unitDirection(last));
 if(Math.hypot(...target)<1e-15)return{lengthMeters:0,errorEstimateMeters:0,endpointResidual:0,evaluations:0,at:(_fraction:number)=>chart.center};
 const tolerance=options.tolerance??2e-7;let velocity:V2=target,previous=NaN,error=Infinity,residual=Infinity,evaluations=0,finalSteps=options.steps??8,length=0;
 const metric=chart.frame(0,0);
 for(let steps=options.steps??8;steps<=128;steps*=2){
  for(let iteration=0;iteration<7;iteration++){
   const q=chart.integrate(velocity,steps);evaluations++;const rx=q[0]-target[0],ry=q[1]-target[1];residual=Math.hypot(rx,ry);if(residual<2e-12)break;
   const h=Math.max(1e-7,Math.hypot(...velocity)*1e-4),qx=chart.integrate([velocity[0]+h,velocity[1]],steps),qy=chart.integrate([velocity[0],velocity[1]+h],steps);evaluations+=2;
   const a=(qx[0]-q[0])/h,b=(qy[0]-q[0])/h,c=(qx[1]-q[1])/h,d=(qy[1]-q[1])/h,det=a*d-b*c;
   if(Math.abs(det)<1e-10)throw RangeError('Rounded Crescent route shooting is singular.');
   velocity=[velocity[0]-(d*rx-b*ry)/det,velocity[1]-(a*ry-c*rx)/det];
  }
  if(residual>1e-9)throw RangeError('Rounded Crescent route did not reach its accepted physical endpoint.');
  const tangent=metric.Jx.map((v,i)=>v*velocity[0]+metric.Jy[i]!*velocity[1]) as unknown as Vec3;length=Math.hypot(...tangent)*g.scaleMeters;finalSteps=steps;
  error=Math.abs(length-previous);if(Number.isFinite(previous)&&error<=tolerance*Math.max(length,g.scaleMeters*1e-7))break;previous=length;
 }
 if(!Number.isFinite(error)||error>tolerance*Math.max(length,g.scaleMeters*1e-7))throw RangeError('Rounded Crescent route exceeded its numerical refinement budget.');
 const initial=velocity;
 return{lengthMeters:length,errorEstimateMeters:error,endpointResidual:residual,evaluations,at:(fraction:number):Vec3=>{if(!Number.isFinite(fraction)||fraction<0||fraction>1)throw RangeError('Invalid Rounded Crescent path fraction.');if(fraction===0)return chart.center;if(fraction===1)return unitDirection(last);const q=chart.integrate(initial,Math.max(2,Math.ceil(finalSteps*fraction)),fraction);return chart.direction(q[0],q[1]);}};
}

const GAUSS=[[-.8611363115940526,.3478548451374538],[-.3399810435848563,.6521451548625461],[.3399810435848563,.6521451548625461],[.8611363115940526,.3478548451374538]] as const;
/** Fast bounded variational approximation for the qualified ordinary brush
 * footprint. Its curve always lies on the real smooth surface. Four-point
 * Gaussian quadrature and optimized quadratic controls are checked against the
 * refined geodesic solver; this is explicitly a numerical approximation. */
export function roundedBrushRoute(g:RoundedCrescentGeometry,first:Vec3,last:Vec3,iterations=2){return roundedBrushRoutes(g,first)(last,iterations);}
export function roundedBrushRoutes(g:RoundedCrescentGeometry,first:Vec3){
 const chart=roundedBrushChart(g,first),F=new Float64Array(15);chart.frame(0,0,F,false);
 const dot=(a:number,b:number)=>F[a]!*F[b]!+F[a+1]!*F[b+1]!+F[a+2]!*F[b+2]!,aa=dot(0,0),ab=dot(0,3),bb=dot(3,3),det=aa*bb-ab*ab;
 return(last:Vec3,iterations=2)=>{
 const b=chart.coordinates(unitDirection(last));chart.frame(b[0]/2,b[1]/2,F);
 const ma=dot(0,0),mb=dot(0,3),mc=dot(3,3),md=ma*mc-mb*mb;
 let rx=0,ry=0;for(let i=0;i<3;i++){const H=F[6+i]!*b[0]*b[0]+2*F[9+i]!*b[0]*b[1]+F[12+i]!*b[1]*b[1];rx+=F[i]!*H;ry+=F[3+i]!*H;}
 let wx=(mc*rx-mb*ry)/(8*md),wy=(ma*ry-mb*rx)/(8*md),energy=0,length=0,gradientNorm=0;
 const evaluate=(cx:number,cy:number,gradient:boolean,lengthGradient=false)=>{let E=0,L=0,gx=0,gy=0,gzx=0,gzy=0,gqx=0,gqy=0;
  for(const[node,weight]of GAUSS){const t=(1+node)/2,B=4*t*(1-t),dB=4*(1-2*t),vx=b[0]+dB*cx,vy=b[1]+dB*cy,ww=weight/2;chart.frame(t*b[0]+B*cx,t*b[1]+B*cy,F,gradient);
   const v0=F[0]!*vx+F[3]!*vy,v1=F[1]!*vx+F[4]!*vy,v2=F[2]!*vx+F[5]!*vy,norm=lengthGradient?Math.max(1e-30,Math.sqrt(v0*v0+v1*v1+v2*v2)):1,C=8*t*(1-t)*(2*t-1),dC=8*(-6*t*t+6*t-1),D=16*(5*t**4-10*t**3+6*t*t-t),dD=16*(20*t**3-30*t*t+12*t-1);let square=0;for(let i=0;i<3;i++){const v=F[i]!*vx+F[3+i]!*vy;square+=v*v;if(gradient){gx+=ww/norm*v*(B*(F[6+i]!*vx+F[9+i]!*vy)+dB*F[i]!);gy+=ww/norm*v*(B*(F[9+i]!*vx+F[12+i]!*vy)+dB*F[3+i]!);if(lengthGradient){gzx+=ww/norm*v*(C*(F[6+i]!*vx+F[9+i]!*vy)+dC*F[i]!);gzy+=ww/norm*v*(C*(F[9+i]!*vx+F[12+i]!*vy)+dC*F[3+i]!);gqx+=ww/norm*v*(D*(F[6+i]!*vx+F[9+i]!*vy)+dD*F[i]!);gqy+=ww/norm*v*(D*(F[9+i]!*vx+F[12+i]!*vy)+dD*F[3+i]!);}}}E+=ww*square/2;L+=ww*Math.sqrt(square);
  }return{energy:E,length:L,gx,gy,gzx,gzy,gqx,gqy};
 };
 if(iterations===0){const v=evaluate(wx,wy,false);energy=v.energy;length=v.length;}
 for(let pass=0;pass<iterations;pass++){
  const v=evaluate(wx,wy,true);energy=v.energy;length=v.length;const dx=3/16*(bb*v.gx-ab*v.gy)/det,dy=3/16*(aa*v.gy-ab*v.gx)/det;gradientNorm=Math.hypot(dx,dy);
  if(gradientNorm<Math.max(1e-12,Math.hypot(...b)*1e-7))break;
  let scale=1;for(let line=0;line<5;line++){const trial=evaluate(wx-dx*scale,wy-dy*scale,false);if(trial.energy<=energy){wx-=dx*scale;wy-=dy*scale;energy=trial.energy;length=trial.length;break;}scale/=2;}
 }
 if(iterations>0){
  // Length variation ignores changes that only reparameterize the same path.
  // Energy residual alone unnecessarily refines those harmless speed changes.
  const v=evaluate(wx,wy,true,true),residual=(3/16*(bb*v.gx*v.gx-2*ab*v.gx*v.gy+aa*v.gy*v.gy)+5/64*(bb*v.gzx*v.gzx-2*ab*v.gzx*v.gzy+aa*v.gzy*v.gzy)+7/256*(bb*v.gqx*v.gqx-2*ab*v.gqx*v.gqy+aa*v.gqy*v.gqy))/det;
  if(residual>1e-4)return roundedRefinedRoute(g,chart,first,b,[wx,wy]);
 }
 const atParameter=(t:number)=>chart.direction(t*b[0]+4*t*(1-t)*wx,t*b[1]+4*t*(1-t)*wy);
 return{lengthMeters:length*g.scaleMeters,gradientNorm,atParameter,
  /** Parameter speed is not presumed uniform physical distance. */
  arcTable(){const count=16,distances=[0],points=[first];for(let i=1;i<=count;i++){const lo=(i-1)/count,hi=i/count;let L=0;for(const[node,weight]of GAUSS){const t=lo+(hi-lo)*(1+node)/2,B=4*t*(1-t),dB=4*(1-2*t),vx=b[0]+dB*wx,vy=b[1]+dB*wy;chart.frame(t*b[0]+B*wx,t*b[1]+B*wy,F,false);L+=weight/2*(hi-lo)*Math.hypot(F[0]!*vx+F[3]!*vy,F[1]!*vx+F[4]!*vy,F[2]!*vx+F[5]!*vy);}distances.push(distances.at(-1)!+L*g.scaleMeters);points.push(atParameter(hi));}return{distances,points,at:(fraction:number)=>{const distance=fraction*distances.at(-1)!;let i=0;while(i<count-1&&distances[i+1]!<distance)i++;const t=(i+(distance-distances[i]!)/(distances[i+1]!-distances[i]!||1))/count;return atParameter(Math.max(0,Math.min(1,t)));}};}
 };
 };
}
