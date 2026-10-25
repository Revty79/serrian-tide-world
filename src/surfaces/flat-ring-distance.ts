import type {SurfacePosition} from './contracts.ts';
import type {OpenCylinderGeometry} from './open-cylinder.ts';
import {openCylinderDistance} from './open-cylinder-distance.ts';
import {cylinderAngle,createCylinderGeometry} from './cylinder.ts';
import {pathAngle,pathNorm,pathTrig} from './cylinder-path-math.ts';
import {CylinderDistanceUnsupportedError,type CylinderDistanceOptions} from './cylinder-distance.ts';

interface Segment {length:number;low:number;high:number}
/** Global dual certificate on the cyclic meridian. For 0<=k<=Ri, integrate
 * sqrt(1-k²/r(m)²) along each of the two meridian arcs. A periodic potential
 * can attain the smaller integral while keeping |grad(kθ+F(m))|<=1 everywhere.
 * Thus k*shortAngle+min(Ia,Ib) bounds ALL paths, including every winding and
 * nonmonotone route. Upper witnesses are actual monotone paths plus a circle
 * at their minimum radius. A witness is accepted only when the bounds close.
 * This extends the accepted local annular metric without using a graph metric. */
export function flatRingDistance(g:OpenCylinderGeometry,first:SurfacePosition,last:SurfacePosition,options:CylinderDistanceOptions={}){
 const a=g.normalize(first),b=g.normalize(last),p=g.physical(a),q=g.physical(b),{outerRadiusMeters:R,innerRadiusMeters:r,lengthMeters:H}=g.metadata,S=g.meridianLengthMeters,W=R-r,
  angle=Math.abs(cylinderAngle(q.theta-p.theta)),guard=524288*Number.EPSILON*Math.max(R,H),tolerance=options.absoluteToleranceMeters??R*1e-6;
 if(!Number.isFinite(tolerance)||tolerance<16*guard||!Number.isInteger(options.maxBoxes??32768)||(options.maxBoxes??32768)<1||(options.maxBoxes??32768)>32768)throw new CylinderDistanceUnsupportedError('precision','Flat Ring query is below the qualified arithmetic floor or work budget.');
 if(angle===0||p.z===q.z&&(p.z===0||p.z===H)||p.radius===r&&q.radius===r||p.radius===r&&(q.z===0||q.z===H)||q.radius===r&&(p.z===0||p.z===H))return openCylinderDistance(g,a,b,options);
 const ma=g.meridianAt(a)%S,mb=g.meridianAt(b)%S;
 const radius=(m:number)=>m<=H?R:m<=H+W?R-(m-H):m<=2*H+W?r:r+(m-2*H-W);
 function arc(start:number,end:number){if(end<start)end+=S;const cuts=[start,end];for(const offset of[0,S])for(const m of[0,H,H+W,2*H+W,S])if(m+offset>start&&m+offset<end)cuts.push(m+offset);cuts.sort((x,y)=>x-y);const result:Segment[]=[];for(let i=1;i<cuts.length;i++){const x=cuts[i-1]!,y=cuts[i]!,rx=radius(x%S),ry=radius(y===S?S:y%S);result.push({length:y-x,low:Math.min(rx,ry),high:Math.max(rx,ry)});}return result;}
 const arcs=[arc(ma,mb),arc(mb,ma)],root=(x:number,k:number)=>Math.sqrt(Math.max(0,(x-k)*(x+k))),beta=(x:number,k:number)=>pathAngle(k,root(x,k));
 function integral(segments:Segment[],k:number){let I=0,theta=0,length=0,min=R;for(const s of segments){min=Math.min(min,s.low);if(s.low===s.high){const v=root(s.low,k);if(v===0)return{I,theta:Infinity,length:Infinity,min};I+=s.length*v/s.low;theta+=k*s.length/(s.low*v);length+=s.length*s.low/v;}else{const low=root(s.low,k),high=root(s.high,k),turn=beta(s.high,k)-beta(s.low,k);I+=high-low-k*turn;theta+=turn;length+=high-low;}}return{I,theta,length,min};}
 let lower=0,upper=Infinity,iterations=0,evaluatedBoxes=0;
 for(const segments of arcs){let lo=0,hi=r*(1-8*Number.EPSILON);for(let i=0;i<56;i++){const k=(lo+hi)/2;if(integral(segments,k).theta<=angle)lo=k;else hi=k;iterations++;}const v=integral(segments,lo);upper=Math.min(upper,v.length+v.min*Math.max(0,angle-v.theta)+guard);for(const k of[lo,hi])lower=Math.max(lower,k*angle+Math.min(...arcs.map(s=>integral(s,k).I))-guard);}
 // A closed-cylinder relaxation is also admissible when both endpoints lie on
 // the outer wall/caps AND its complete feasible witness misses the real hole.
 if(upper-lower>tolerance&&p.radius!==r&&q.radius!==r){try{
  const closed=createCylinderGeometry({identity:g.identity,provider:'physical-closed-cylinder',version:1,configuration:'solid-capped',role:'exterior',radiusMeters:R,lengthMeters:H});
  const endpoint=(v:typeof p)=>({...g.identity,patchId:v.radius===R?'side':v.z===0?'cap-start':'cap-end',u:v.radius===R||v.z===0?v.theta:-v.theta,v:v.radius===R?v.z:v.radius});
  const result=closed.globalDistance(endpoint(p),endpoint(q),{absoluteToleranceMeters:tolerance/4,maxBoxes:options.maxBoxes??32768,includeFeasibleRoutes:true});
  evaluatedBoxes+=result.evaluatedBoxes;
  // Validate the original solver's feasible route parameters directly. This
  // does not need an arclength sampler (whose negligible final pieces can be
  // below cumulative-distance resolution at exact chart boundaries).
  const xy=(rho:number,theta:number)=>{const [s,c]=pathTrig(theta);return[rho*c,rho*s] as const;};
  const chordValid=(ra:number,ta:number,rb:number,tb:number)=>{const a=xy(ra,ta),b=xy(rb,tb),dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy,t=den===0?0:Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/den));return pathNorm(a[0]+t*dx,a[1]+t*dy)-guard>=r;};
  for(const f of result.feasibleRoutes??[]){let x=p,y=q;if(x.radius!==R&&y.radius===R||x.z===H&&y.z===0)[x,y]=[y,x];const delta=cylinderAngle(y.theta-x.theta),sign=delta<0?-1:1,terminal=x.theta+delta,[u,v]=f.angles;let valid=false;
   switch(f.routeClass){case'same-cap':valid=chordValid(x.radius,x.theta,y.radius,y.theta);break;case'side':valid=true;break;
    case'side-to-cap':valid=chordValid(R,terminal-sign*u,y.radius,y.theta);break;
    case'opposite-caps':valid=chordValid(x.radius,x.theta,R,x.theta+sign*u)&&chordValid(R,terminal-sign*v,y.radius,y.theta);break;
    case'via-start-cap':case'via-end-cap':{const z=f.routeClass==='via-start-cap'?0:H,h0=Math.abs(x.z-z),h1=Math.abs(y.z-z),entry=x.theta+(delta-sign*u)*h0/(h0+h1);valid=chordValid(R,entry,R,entry+sign*u);break;}}
   if(valid)upper=Math.min(upper,f.upperBoundMeters+guard);
  }
  lower=Math.max(lower,Math.min(result.lowerBoundMeters,(p.radius-r)+(q.radius-r))-guard);
 }catch(error){if(!(error instanceof CylinderDistanceUnsupportedError))throw error;}}
 lower=Math.max(0,lower);if(!Number.isFinite(upper)||upper-lower>tolerance)throw new CylinderDistanceUnsupportedError('range',`Flat Ring global certificate remains unresolved (${upper-lower} m).`);
 return Object.freeze({scope:'global-reference-surface' as const,lowerBoundMeters:lower,upperBoundMeters:upper,evaluatedBoxes,iterations,bestRoute:'cyclic-meridian-calibration',value:upper});
}
