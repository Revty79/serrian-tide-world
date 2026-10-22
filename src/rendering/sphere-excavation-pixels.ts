import {dot3,unitDirection,type CubeFace,type Vec3} from '../surfaces/cube-sphere.ts';
import {traceSphereExcavation,type SphereExcavation} from '../surfaces/hollow-sphere-excavation.ts';
import {sphereCenterInspection,sphericalLayout,type SphericalView,type Viewport} from './spherical-view.ts';
import {sampleSphereFaceInto,sphereDisplayColor,type SphereAppearance,type SphereFieldSnapshot} from './spherical-elevation.ts';

export interface SphereCutRaster {readonly model:SphereExcavation;readonly opposite:SphereFieldSnapshot;readonly role:'exterior'|'interior'}
/** Only projected cut bounds need analytic subtraction in ordinary editing.
 * All other pixels keep the established fast spherical elevation presentation. */
export function sphereCutSampler(field:SphereFieldSnapshot,cut:SphereCutRaster|undefined,view:SphericalView,size:Viewport,appearance:SphereAppearance){
 if(!cut||!cut.model.primitives.length||view.mode!=='globe'||view.interior&&!sphereCenterInspection(view))return undefined;
 const l=sphericalLayout(view,size),center=sphereCenterInspection(view),f=view.frame,eye=(view.eyeMeters??[0,0,0]).map(v=>v/cut.model.radiusMeters)as unknown as Vec3,value=new Float64Array(5);
 const bounds=cut.model.primitives.map(p=>{const a=dot3(p.a,f.right),b=dot3(p.a,f.up),x=dot3(p.b,f.right)-a,y=dot3(p.b,f.up)-b,c=p.a.map((v,i)=>(v+p.b[i]!)*.5-eye[i]!)as unknown as Vec3;return{a,b,x,y,length2:x*x+y*y,r2:(p.radius+2/l.radius)**2,c,ball2:(Math.hypot(...p.a.map((v,i)=>v-p.b[i]!))*.5+p.radius+2/l.radius)**2};});
 return(px:number,py:number,out:Float64Array)=>{const x=(px-l.x)/l.radius,y=(l.y-py)/l.radius;let d:Vec3|undefined;
  if(center){d=unitDirection(f.right.map((v,i)=>-v*x+f.up[i]!*y+f.forward[i]!)as unknown as Vec3);if(!bounds.some(b=>{const projection=dot3(b.c,d!),norm=dot3(b.c,b.c);return norm<=b.ball2||projection>0&&norm-projection*projection<=b.ball2;}))return false;}
  else if(!bounds.some(b=>{const q=b.length2?Math.max(0,Math.min(1,((x-b.a)*b.x+(y-b.b)*b.y)/b.length2)):0;return(x-b.a-q*b.x)**2+(y-b.b-q*b.y)**2<=b.r2;}))return false;
  const o=center?eye:f.right.map((v,i)=>v*x+f.up[i]!*y+f.forward[i]!*4)as unknown as Vec3;
  const hit=traceSphereExcavation(cut.model,o,d??f.forward.map(v=>-v)as unknown as Vec3);if(!hit){out.fill(0);return true;}
  if(hit.kind==='rock'){const gain=Math.max(.28,Math.min(1.1,.64+.36*dot3(hit.normal,[-.38,-.48,.78])));out.set([164*gain,145*gain,114*gain,1]);return true;}
  const p=hit.point,a=Math.abs(p[0]),b=Math.abs(p[1]),c=Math.abs(p[2]);let face:CubeFace,n:number,u:number,v:number;
  if(a>=b&&a>=c){face=p[0]>=0?'px':'nx';n=a;u=p[0]>=0?p[1]:-p[1];v=p[2];}else if(b>=c){face=p[1]>=0?'py':'ny';n=b;u=p[1]>=0?-p[0]:p[0];v=p[2];}else{face=p[2]>=0?'pz':'nz';n=c;u=p[0];v=p[2]>=0?p[1]:-p[1];}
  sampleSphereFaceInto((hit.kind==='interior')===(cut.role==='interior')?field:cut.opposite,face,Math.atan(u/n),Math.atan(v/n),value);const h=value[0]!,shade=(!center&&appearance==='relief'?.74+.26*Math.max(0,dot3(hit.normal,f.forward)):1)*(hit.kind==='interior'&&!center?.75:1),color=sphereDisplayColor(h,[value[1]!,value[2]!,value[3]!],appearance,shade);
  out.set([...color,1]);return true;
 };
}
