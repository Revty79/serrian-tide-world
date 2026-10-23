import {cubeDot,SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,type CubeVector,type SolidCubeFace} from './solid-cube.ts';
import {segmentPointDistance,type PhysicalPassage} from './passages.ts';
import type {HollowCubeWorld} from '../terrain/hollow-cube.ts';
import {holeCut,type ThroughHole} from './through-hole.ts';

export interface ExcavationPrimitive {readonly a:CubeVector;readonly b:CubeVector;readonly radius:number}
export interface HollowExcavation {readonly halfSideMeters:number;readonly innerRatio:number;readonly primitives:readonly ExcavationPrimitive[]}
export interface PassageEye {readonly position:CubeVector;readonly direction:CubeVector;readonly fov:number}
type Interval=readonly [number,number];
const add=(a:CubeVector,b:CubeVector,t=1):CubeVector=>[a[0]+b[0]*t,a[1]+b[1]*t,a[2]+b[2]*t];
const sub=(a:CubeVector,b:CubeVector):CubeVector=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const unit=(v:CubeVector):CubeVector=>{const n=Math.hypot(...v);return n?[v[0]/n,v[1]/n,v[2]/n]:[0,0,1];};
export function hollowExcavation(world:HollowCubeWorld,passages:readonly PhysicalPassage[],holes:readonly ThroughHole[]=[]):HollowExcavation {
 const halfSideMeters=world.dimensions.outerSideLengthMeters/2,normalize=(p:CubeVector)=>p.map(x=>x/halfSideMeters) as unknown as CubeVector;
 const primitives=[...holes.map(h=>{const c=holeCut(world,h);return{a:normalize(c.a),b:normalize(c.b),radius:c.r/halfSideMeters};}),...passages.flatMap(p=>{const nodes=new Map(p.nodes.map(n=>[n.id,n]));return [...p.nodes.map(n=>({a:normalize(n.position),b:normalize(n.position),radius:n.radiusMeters/halfSideMeters})),...p.segments.map(s=>({a:normalize(nodes.get(s.from)!.position),b:normalize(nodes.get(s.to)!.position),radius:s.radiusMeters/halfSideMeters}))];})];
 return Object.freeze({halfSideMeters,innerRatio:world.dimensions.innerSideLengthMeters/world.dimensions.outerSideLengthMeters,primitives:Object.freeze(primitives)});
}
export function rayBoxInterval(origin:CubeVector,direction:CubeVector,half:number):Interval|undefined {
 let lo=-Infinity,hi=Infinity;for(let i=0;i<3;i++){if(Math.abs(direction[i]!)<1e-14){if(Math.abs(origin[i]!)>half)return;continue;}const a=(-half-origin[i]!)/direction[i]!,b=(half-origin[i]!)/direction[i]!;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(hi<lo)return;}return[lo,hi];
}
function raySphere(o:CubeVector,d:CubeVector,c:CubeVector,r:number):Interval|undefined {const v=sub(o,c),b=cubeDot(v,d),perpendicular=add(v,d,-b),disc=r*r-cubeDot(perpendicular,perpendicular);if(disc<0)return;const q=Math.sqrt(disc);return[-b-q,-b+q];}
/** Analytic convex capsule intersection: clipped cylinder plus both endpoint balls. */
export function rayCapsuleInterval(o:CubeVector,d:CubeVector,p:ExcavationPrimitive):Interval|undefined {
 const axis=sub(p.b,p.a),length=Math.hypot(...axis);if(length===0)return raySphere(o,d,p.a,p.radius);
 const n=unit(axis),v=sub(o,p.a),dv=cubeDot(d,n),vv=cubeDot(v,n),perpD=add(d,n,-dv),perpV=add(v,n,-vv),aa=cubeDot(perpD,perpD),bb=cubeDot(perpD,perpV),cc=cubeDot(perpV,perpV)-p.radius*p.radius;
 let lo=Infinity,hi=-Infinity;const include=(v:Interval|undefined)=>{if(v){lo=Math.min(lo,v[0]);hi=Math.max(hi,v[1]);}};
 include(raySphere(o,d,p.a,p.radius));include(raySphere(o,d,p.b,p.radius));
 let radial:Interval|undefined;if(aa===0){if(cc<=0)radial=[-Infinity,Infinity];}else {const center=-bb/aa,closest=add(perpV,perpD,center),disc=p.radius*p.radius-cubeDot(closest,closest);if(disc>=0){const s=Math.sqrt(disc/aa);radial=[center-s,center+s];}}
 if(radial){let a=-Infinity,b=Infinity;if(dv===0){if(vv<0||vv>length)a=Infinity;}else{a=-vv/dv;b=(length-vv)/dv;if(a>b)[a,b]=[b,a];}const start=Math.max(a,radial[0]),end=Math.min(b,radial[1]);if(start<=end)include([start,end]);}
 return lo<=hi?[lo,hi]:undefined;
}
/** Immutable geometry preparation for the accepted analytic capsule query.
 * The scalar hot loop preserves the original operation order, including both
 * endpoint spheres and the clipped tube, without temporary per-ray vectors.
 * The ordinary rayCapsuleInterval implementation above remains unchanged. */
export function prepareRayCapsuleInterval(input:ExcavationPrimitive){
 const a=[...input.a] as unknown as CubeVector,b=[...input.b] as unknown as CubeVector,r2=input.radius*input.radius,axis=sub(b,a),length=Math.hypot(...axis);
 if(length===0)return(o:CubeVector,d:CubeVector):Interval|undefined=>{const x=o[0]-a[0],y=o[1]-a[1],z=o[2]-a[2],projection=x*d[0]+y*d[1]+z*d[2],px=x+d[0]*(-projection),py=y+d[1]*(-projection),pz=z+d[2]*(-projection),disc=r2-(px*px+py*py+pz*pz);if(disc<0)return;const q=Math.sqrt(disc);return[-projection-q,-projection+q];};
 const n=unit(axis),nx=n[0],ny=n[1],nz=n[2];
 return(o:CubeVector,d:CubeVector):Interval|undefined=>{
  const dx=d[0],dy=d[1],dz=d[2],vx=o[0]-a[0],vy=o[1]-a[1],vz=o[2]-a[2],dv=dx*nx+dy*ny+dz*nz,vv=vx*nx+vy*ny+vz*nz,pdx=dx+nx*(-dv),pdy=dy+ny*(-dv),pdz=dz+nz*(-dv),pvx=vx+nx*(-vv),pvy=vy+ny*(-vv),pvz=vz+nz*(-vv),aa=pdx*pdx+pdy*pdy+pdz*pdz,bb=pdx*pvx+pdy*pvy+pdz*pvz,cc=pvx*pvx+pvy*pvy+pvz*pvz-r2;
  let lo=Infinity,hi=-Infinity;
  for(let end=0;end<2;end++){const c=end?b:a,x=o[0]-c[0],y=o[1]-c[1],z=o[2]-c[2],projection=x*dx+y*dy+z*dz,px=x+dx*(-projection),py=y+dy*(-projection),pz=z+dz*(-projection),disc=r2-(px*px+py*py+pz*pz);if(disc<0)continue;const q=Math.sqrt(disc);lo=Math.min(lo,-projection-q);hi=Math.max(hi,-projection+q);}
  let radial=false,radialLo=-Infinity,radialHi=Infinity;if(aa===0){if(cc<=0)radial=true;}else{const center=-bb/aa,cx=pvx+pdx*center,cy=pvy+pdy*center,cz=pvz+pdz*center,disc=r2-(cx*cx+cy*cy+cz*cz);if(disc>=0){const q=Math.sqrt(disc/aa);radialLo=center-q;radialHi=center+q;radial=true;}}
  if(radial){let start=-Infinity,end=Infinity;if(dv===0){if(vv<0||vv>length)start=Infinity;}else{start=-vv/dv;end=(length-vv)/dv;if(start>end)[start,end]=[end,start];}const first=Math.max(start,radialLo),last=Math.min(end,radialHi);if(first<=last){lo=Math.min(lo,first);hi=Math.max(hi,last);}}
  return lo<=hi?[lo,hi]:undefined;
 };
}
export interface ExcavationHit {readonly distance:number;readonly point:CubeVector;readonly normal:CubeVector;readonly kind:'exterior'|'interior'|'rock';readonly face?:SolidCubeFace;readonly u?:number;readonly v?:number}
/** Reference shell DIFFERENCE (inner cavity UNION connected excavation). CPU,
 * GPU, protection and inspection all use these exact sphere/capsule primitives. */
export function traceHollowExcavation(model:HollowExcavation,origin:CubeVector,direction:CubeVector,interiorCutaway=false):ExcavationHit|undefined {
 const d=unit(direction),outer=rayBoxInterval(origin,d,1);if(!outer||outer[1]<=0)return;const inner=rayBoxInterval(origin,d,model.innerRatio);
 let cursor=Math.max(0,outer[0]),which=-2;const free:{interval:Interval;primitive:number}[]=[];if(inner)free.push({interval:inner,primitive:-1});model.primitives.forEach((p,i)=>{const interval=rayCapsuleInterval(origin,d,p);if(interval)free.push({interval,primitive:i});});
 if(interiorCutaway){if(!inner||inner[1]<cursor)return;cursor=inner[1];which=-1;}
 free.sort((a,b)=>a.interval[0]-b.interval[0]);for(const item of free){if(item.interval[0]>cursor+1e-10)break;if(item.interval[1]>cursor){cursor=item.interval[1];which=item.primitive;}}
 if(cursor>=outer[1]-1e-10)return;const point=add(origin,d,cursor);let normal:CubeVector,kind:ExcavationHit['kind'];
 if(which>=0){const p=model.primitives[which]!,axis=sub(p.b,p.a),length2=cubeDot(axis,axis),t=length2?Math.max(0,Math.min(1,cubeDot(sub(point,p.a),axis)/length2)):0;normal=unit(sub(add(p.a,axis,t),point));kind='rock';}
 else{kind=which===-1?'interior':'exterior';const half=kind==='interior'?model.innerRatio:1;let axis=0;for(let k=1;k<3;k++)if(Math.abs(Math.abs(point[k]!)-half)<Math.abs(Math.abs(point[axis]!)-half))axis=k;const sign=Math.sign(point[axis]!)*(kind==='interior'?-1:1);normal=axis===0?[sign,0,0]:axis===1?[0,sign,0]:[0,0,sign];}
 if(kind==='rock')return{distance:cursor,point,normal,kind};const face=SOLID_CUBE_FACES.find(f=>cubeDot(SOLID_CUBE_FRAMES[f].normal,normal)*(kind==='interior'?-1:1)>.9)!,frame=SOLID_CUBE_FRAMES[face],half=kind==='interior'?model.innerRatio:1;
 return{distance:cursor,point,normal,kind,face,u:cubeDot(point,frame.u)/half,v:cubeDot(point,frame.v)/half};
}
export function hollowFreeVolume(model:HollowExcavation,positionMeters:CubeVector,marginMeters=0){const p=positionMeters.map(v=>v/model.halfSideMeters) as unknown as CubeVector,m=marginMeters/model.halfSideMeters;
 if(p.some(v=>Math.abs(v)>1+m)||p.every(v=>Math.abs(v)<model.innerRatio-m))return true;
 return model.primitives.some(v=>v.radius>m&&segmentPointDistance(p,v.a,v.b)<v.radius-m);
}
export const excavationVector={add,sub,unit};
