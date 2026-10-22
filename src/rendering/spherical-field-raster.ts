import {sphereCenterInspection} from './spherical-view.ts';
import { type CubeFace } from '../surfaces/cube-sphere.ts';
import { sphericalLayout, type SphericalView, type Viewport } from './spherical-view.ts';
import { sampleSphereFaceInto, type SphereFieldSnapshot, type SphereAppearance } from './spherical-elevation.ts';
import {sphereCutSampler,type SphereCutRaster} from './sphere-excavation-pixels.ts';

/** A coherent derived epoch and bounded CPU pixel work, for both projections.
 * The caller presents only the completed buffer and retains its exact view. */
export function* sphericalFieldRaster(field:SphereFieldSnapshot,view:SphericalView,size:Viewport,appearance:SphereAppearance,pixelBudget:number,reusable?:Uint8ClampedArray,excavation?:SphereCutRaster):Generator<void,{pixels:Uint8ClampedArray;columns:number;rows:number;left:number;top:number;width:number;height:number;revision:number}> {
 if(!Number.isSafeInteger(pixelBudget)||pixelBudget<1||pixelBudget>2000000)throw RangeError('Invalid spherical display pixel budget.');
 const l=sphericalLayout(view,size),globe=view.mode==='globe',inside=sphereCenterInspection(view),left=Math.max(0,inside?0:globe?l.x-l.radius:l.x+(-2+view.pan.x)*l.face),top=Math.max(0,inside?0:globe?l.y-l.radius:l.y+(-1.5+view.pan.y)*l.face),right=Math.min(size.width,inside?size.width:globe?l.x+l.radius:l.x+(2+view.pan.x)*l.face),bottom=Math.min(size.height,inside?size.height:globe?l.y+l.radius:l.y+(1.5+view.pan.y)*l.face),width=Math.max(0,right-left),height=Math.max(0,bottom-top),scale=width*height?Math.min(1.5,Math.sqrt(pixelBudget/(width*height))):1,columns=Math.max(1,Math.floor(width*scale)),rows=Math.max(1,Math.floor(height*scale));
 const pixels=reusable?.length===columns*rows*4?reusable:new Uint8ClampedArray(columns*rows*4);pixels.fill(0);
 const value=new Float64Array(5),center=new Float64Array(4),sample=new Float64Array(4),sum=new Float64Array(4),stepX=width/columns*.25,stepY=height/rows*.25;
 let crosses=false;
 const cut=sphereCutSampler(field,excavation,view,size,appearance);
 function shade(px:number,py:number,out:Float64Array){
  if(cut?.(px,py,out)){crosses=false;return;}
  let face:CubeFace,u:number,v:number,coverage=1,depth=1;
  if(globe){const x=(px-l.x)/l.radius,y=(l.y-py)/l.radius,r=Math.hypot(x,y);coverage=inside?1:Math.max(0,Math.min(1,(1-r)*l.radius*scale+.5));if(!coverage){out.fill(0);crosses=false;return;}depth=inside?1:Math.sqrt(Math.max(0,1-x*x-y*y));const f=view.frame,xx=inside?-x:x,a=f.right[0]*xx+f.up[0]*y+f.forward[0]*depth,b=f.right[1]*xx+f.up[1]*y+f.forward[1]*depth,c=f.right[2]*xx+f.up[2]*y+f.forward[2]*depth,ax=Math.abs(a),ay=Math.abs(b),az=Math.abs(c);let normal:number,du:number,dv:number;
   if(ax>=ay&&ax>=az){face=a>=0?'px':'nx';normal=ax;du=a>=0?b:-b;dv=c;}else if(ay>=az){face=b>=0?'py':'ny';normal=ay;du=b>=0?-a:a;dv=c;}else{face=c>=0?'pz':'nz';normal=az;du=a;dv=c>=0?b:-b;}u=Math.atan(du/normal);v=Math.atan(dv/normal);
  }else{const gx=(px-l.x)/l.face+2-view.pan.x,gy=(py-l.y)/l.face+1.5-view.pan.y,c=Math.floor(gx),r=Math.floor(gy),s=gx-c,t=gy-r;
   if(r===1&&c>=0&&c<4)face=(['ny','px','py','nx'] as const)[c]!;else if(c===1&&(r===0||r===2))face=r===0?'pz':'nz';else{out.fill(0);crosses=false;return;}
   if(face==='pz'){u=(2*t-1)*Math.PI/4;v=(2*s-1)*Math.PI/4;}else if(face==='nz'){u=(1-2*t)*Math.PI/4;v=(1-2*s)*Math.PI/4;}else{u=(2*s-1)*Math.PI/4;v=(1-2*t)*Math.PI/4;}
  }
  sampleSphereFaceInto(field,face,u,v,value);const h=value[0]!;crosses=!!value[4];let t:number,r:number,g:number,b:number;
  if(h<=0){t=Math.max(0,Math.min(1,-h/1000));r=Math.round(37-25*t);g=Math.round(111-66*t);b=Math.round(143-71*t);}else if(h<=2000){t=h/2000;r=Math.round(109+74*t);g=Math.round(149+11*t);b=Math.round(88+33*t);}else{t=Math.min(1,(h-2000)/3000);r=Math.round(183+52*t);g=Math.round(160+74*t);b=Math.round(121+103*t);}
  let gain=1;if(appearance==='relief'){if(h>0){const x=Math.max(-1e6,Math.min(1e6,value[1]!*5)),y=Math.max(-1e6,Math.min(1e6,value[2]!*5)),z=Math.max(-1e6,Math.min(1e6,value[3]!*5));gain=Math.max(.55,Math.min(1.25,(1+.6*x+.6*y-.5291502622129182*z)/Math.hypot(1,x,y,z)));}if(globe&&!inside)gain*=.74+.26*depth;}
  out[0]=Math.min(255,r*gain)*coverage;out[1]=Math.min(255,g*gain)*coverage;out[2]=Math.min(255,b*gain)*coverage;out[3]=coverage;
 }
 let count=0;
 for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
  const x=left+(column+.5)*width/columns,y=top+(row+.5)*height/rows;shade(x,y,center);
  if(crosses||center[3]!>0&&center[3]!<1){const land=value[0]!>0;let mixed=false;sum.fill(0);for(const dx of[-stepX,stepX])for(const dy of[-stepY,stepY]){shade(x+dx,y+dy,sample);mixed||=(value[0]!>0)!==land||sample[3]!==center[3];for(let i=0;i<4;i++)sum[i]!+=sample[i]!*.25;}if(mixed)center.set(sum);}
  const offset=(row*columns+column)*4,alpha=center[3]!;if(alpha>0){pixels[offset]=center[0]!/alpha;pixels[offset+1]=center[1]!/alpha;pixels[offset+2]=center[2]!/alpha;pixels[offset+3]=alpha*255;}if(++count%512===0)yield;
 }
 return{pixels,columns,rows,left,top,width,height,revision:field.sourceRevision};
}
