import {cutGlobeRayGrid,type CutGlobeRayGrid} from './crescent-cut-globe-ray-cache.ts';
import {CUBE_FACES} from '../surfaces/cube-sphere.ts';
import {type CubeFace} from '../surfaces/cube-sphere.ts';
import {sphericalLayout,type SphericalView,type Viewport} from './spherical-view.ts';
import {sampleSphereFaceInto,sphereDisplayColorInto,type SphereFieldSnapshot,type SphereAppearance} from './spherical-elevation.ts';

/** Allocation-free inverse geometry adapter; reconstruction and color remain Sphere's. */
export function cutGlobePixelSampler(field:SphereFieldSnapshot,view:SphericalView,size:Viewport,appearance:SphereAppearance,grid?:CutGlobeRayGrid){
 const g=view.cutGlobe;if(!g)return undefined;const cached=cutGlobeRayGrid(view,size,grid);const l=sphericalLayout(view,size),[ax,ay,az]=g.axis,d=g.separationRatio,h=d/2,f=view.frame,value=new Float64Array(5),globe=view.mode==='globe';
 return (px:number,py:number,out:Float64Array,slot=-1):number=>{
  let x=0,y=0,z=0,cut=false,depth=1;let face:CubeFace,u=0,v=0;
  const code=slot>=0?cached?.codes[slot]??0:0;if(code===13){out.fill(0);return 0;}if(code){face=CUBE_FACES[(code-1)%6]!;cut=code>6;u=cached!.coordinates[slot*3]!;v=cached!.coordinates[slot*3+1]!;depth=cached!.coordinates[slot*3+2]!;}else{
  if(globe){const sx=(px-l.x)/l.radius,sy=(l.y-py)/l.radius,ox=f.right[0]*sx+f.up[0]*sy+f.forward[0]*4,oy=f.right[1]*sx+f.up[1]*sy+f.forward[1]*4,oz=f.right[2]*sx+f.up[2]*sy+f.forward[2]*4,rx=-f.forward[0],ry=-f.forward[1],rz=-f.forward[2];let nearest=Infinity;
   for(let bank=0;bank<2;bank++){const offset=bank?d:0,cx=ox-offset*ax,cy=oy-offset*ay,cz=oz-offset*az,b=-(cx*rx+cy*ry+cz*rz),ex=cx+b*rx,ey=cy+b*ry,ez=cz+b*rz,disc=1-ex*ex-ey*ey-ez*ez;if(disc<0)continue;const root=Math.sqrt(disc);
    for(let side=-1;side<=1;side+=2){const t=b+side*root;if(t<0||t>=nearest)continue;const qx=ox+t*rx,qy=oy+t*ry,qz=oz+t*rz;if(qx*ax+qy*ay+qz*az>h+1e-12)continue;nearest=t;x=qx;y=qy;z=qz;cut=!!bank;}
   }if(!Number.isFinite(nearest)){if(cached&&slot>=0)cached.codes[slot]=13;out.fill(0);return 0;}
   const nx=cut?d*ax-x:x,ny=cut?d*ay-y:y,nz=cut?d*az-z:z;depth=Math.max(0,nx*f.forward[0]+ny*f.forward[1]+nz*f.forward[2]);
   if(cut){const shift=d-2*(x*ax+y*ay+z*az);x+=shift*ax;y+=shift*ay;z+=shift*az;}
   const xx=Math.abs(x),yy=Math.abs(y),zz=Math.abs(z);let n:number,du:number,dv:number;
   if(xx>=yy&&xx>=zz){face=x>=0?'px':'nx';n=xx;du=x>=0?y:-y;dv=z;}else if(yy>=zz){face=y>=0?'py':'ny';n=yy;du=y>=0?-x:x;dv=z;}else{face=z>=0?'pz':'nz';n=zz;du=x;dv=z>=0?y:-y;}u=Math.atan(du/n);v=Math.atan(dv/n);
  }else{const gx=(px-l.x)/l.face+2-view.pan.x,gy=(py-l.y)/l.face+1.5-view.pan.y,c=Math.floor(gx),r=Math.floor(gy),s=gx-c,t=gy-r;
   if(r===1&&c>=0&&c<4)face=(['ny','px','py','nx'] as const)[c]!;else if(c===1&&(r===0||r===2))face=r===0?'pz':'nz';else{if(cached&&slot>=0)cached.codes[slot]=13;out.fill(0);return 0;}
   if(face==='pz'){u=(2*t-1)*Math.PI/4;v=(2*s-1)*Math.PI/4;}else if(face==='nz'){u=(1-2*t)*Math.PI/4;v=(1-2*s)*Math.PI/4;}else{u=(2*s-1)*Math.PI/4;v=(1-2*t)*Math.PI/4;}
   const tu=Math.tan(u),tv=Math.tan(v),length=Math.hypot(1,tu,tv);[x,y,z]=face==='px'?[1,tu,tv]:face==='nx'?[-1,-tu,tv]:face==='py'?[-tu,1,tv]:face==='ny'?[tu,-1,tv]:face==='pz'?[tu,tv,1]:[tu,-tv,-1];x/=length;y/=length;z/=length;cut=x*ax+y*ay+z*az>h;
   if(view.mapRegion&&view.mapRegion!=='all'&&(cut?'cut':'retained')!==view.mapRegion){if(cached&&slot>=0)cached.codes[slot]=13;out.fill(0);return 0;}
  }
  if(cached&&slot>=0){cached.codes[slot]=CUBE_FACES.indexOf(face)+1+(cut?6:0);cached.coordinates[slot*3]=u;cached.coordinates[slot*3+1]=v;cached.coordinates[slot*3+2]=depth;}
  }
  sampleSphereFaceInto(field,face,u,v,value);let gx=value[1]!,gy=value[2]!,gz=value[3]!;if(cut){const t=2*(gx*ax+gy*ay+gz*az);gx-=t*ax;gy-=t*ay;gz-=t*az;}
  sphereDisplayColorInto(value[0]!,gx,gy,gz,appearance,appearance==='relief'&&globe?.74+.26*depth:1,out);out[3]=1;const classification=(cut?4:2)+(value[0]!>0?1:0);out[4]=classification;out[5]=value[4]!;return classification;
 };
}
