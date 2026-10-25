import {CUBE_FACES,type CubeFace,type Vec3} from '../surfaces/cube-sphere.ts';
import {roundedParallelWindows} from '../surfaces/rounded-crescent-parallel.ts';
import {roundedIntervalRayTracer} from '../surfaces/rounded-crescent-ray-interval.ts';
import {roundedAngle,type RoundedCrescentGeometry} from '../surfaces/rounded-crescent-globe.ts';
import {sphericalLayout,type SphericalView,type Viewport} from './spherical-view.ts';
import {sampleSphereFaceInto,sphereDisplayColorInto,type SphereFieldSnapshot,type SphereAppearance} from './spherical-elevation.ts';
import type {RoundedRayGrid} from './rounded-crescent-grid.ts';
interface Cache {key:string;codes:Uint8Array;data:Float64Array;bytes:number}
const entries=new Map<string,Cache>(),MAX=8*1024*1024;let retainedBytes=0;
export const roundedRayCacheBytes=()=>retainedBytes;
function entryFor(key:string,count:number){
 const found=entries.get(key);if(found){entries.delete(key);entries.set(key,found);return found;}
 const bytes=count*49;if(bytes>MAX)return;while(retainedBytes+bytes>MAX){const first=entries.keys().next().value!,old=entries.get(first)!;retainedBytes-=old.bytes;entries.delete(first);}const c={key,codes:new Uint8Array(count),data:new Float64Array(count*6),bytes};entries.set(key,c);retainedBytes+=bytes;return c;
}
function cacheFor(view:SphericalView,size:Viewport,grid?:RoundedRayGrid,focusTiles=4){
 if(!grid||grid.columns*grid.rows>200000&&!grid.density)return;
 if(!grid.density){const key=JSON.stringify([view,size,grid]),count=grid.columns*grid.rows;if(count*49>MAX)return;return(slot:number)=>({cache:entries.get(key)??entryFor(key,count)!,slot});}
 // Geometry-only tiles share the full image's exact absolute sample lattice.
 // Cropped dirty rectangles can change without retracing their overlap. Both
 // tile and ordinary-grid storage obey the same combined eight MiB ceiling.
 const {sx,sy,x0,y0,ox=0,oy=0}=grid.density,key=JSON.stringify([view,size,sx,sy,ox,oy]),large=grid.columns*grid.rows>80000,cx=Math.floor((size.width/2-ox)*sx),cy=Math.floor((size.height/2-oy)*sy),firstTx=Math.round(cx/32-focusTiles/2),firstTy=Math.round(cy/32-focusTiles/2);let lastTx=-Infinity,lastTy=-Infinity,lastKey='';
 // A settled raster already computes these exact rays. Retain only a bounded
 // tile-aligned 128-square focus window to avoid a cold geometry rebuild on the first dab;
 // never retain the complete large image. The combined ceiling stays 8 MiB.
 return(slot:number)=>{const x=x0+slot%grid.columns,y=y0+Math.floor(slot/grid.columns);const tx=Math.floor(x/32),ty=Math.floor(y/32);if(large&&(tx<firstTx||tx>=firstTx+focusTiles||ty<firstTy||ty>=firstTy+focusTiles))return;let found:Cache|undefined;if(tx!==lastTx||ty!==lastTy){lastKey=`${key}:${tx}:${ty}`;lastTx=tx;lastTy=ty;found=entryFor(lastKey,1024);}else found=entries.get(lastKey)??entryFor(lastKey,1024);return{cache:found!,slot:(y%32)*32+x%32};};
}
/** Dirty images repeatedly revisit the same four exact quarter-ray lattices.
 * Retain only their geometry through the SAME combined eight MiB LRU. Each
 * sample still reads the current numerical field and computes its real color.
 * Settled grids retain only an already-computed tile-aligned 192-square focus window.
 * Center and quarter rays still share the SAME eight MiB ceiling; the 16 center and 144 quarter tiles use 8,028,160 bytes at most. No new
 * sampling work is introduced during idle rendering. */
function fractionalCacheFor(view:SphericalView,size:Viewport,grid?:RoundedRayGrid){
 if(!grid)return;const large=grid.columns*grid.rows>80000,density=grid.density??{sx:grid.columns/grid.width,sy:grid.rows/grid.height,x0:0,y0:0,ox:grid.left,oy:grid.top},{sx,sy,x0,y0,ox=0,oy=0}=density,phases=[0,1,2,3].map(phase=>cacheFor(view,size,{...grid,density:{sx,sy,x0,y0,ox:ox+((phase&1)?.25:-.25)/sx,oy:oy+((phase&2)?.25:-.25)/sy}},large?6:4));
 return(px:number,py:number)=>{const x=(px-ox)*sx*4,y=(py-oy)*sy*4,qx=Math.round(x),qy=Math.round(y);if(Math.abs(qx-x)>1e-7||Math.abs(qy-y)>1e-7||!(qx&1)||!(qy&1))return;const c=Math.floor(qx/4)-x0,r=Math.floor(qy/4)-y0;if(c<0||r<0||c>=grid.columns||r>=grid.rows)return;const phase=(qx&2?1:0)+(qy&2?2:0);return phases[phase]?.(r*grid.columns+c);};
}
/** Inverse-transpose differential plus tangent projection; shared height/field,
 * palette and relief are unchanged. Output is gradient xyz, then material normal. */
export function roundedShadeGeometry(g:RoundedCrescentGeometry,p:Vec3,gx:number,gy:number,gz:number,out:Float64Array){
 const u=p[0],f=1-g.tipTaper*u*u,phi=roundedAngle(g,u),c=Math.cos(phi),s=Math.sin(phi),A=g.halfSpan*(1+g.tipRoundness*(3*u*u-1))*(g.bendRadius+g.bodyRadius*f*p[1]),shear=-2*g.tipTaper*u/f;
 const cov=(x:number,y:number,z:number,offset:number)=>{const t=(x-shear*(p[1]*y+p[2]*z))/A,n=y/(g.bodyRadius*f);out[offset]=n*c-t*s;out[offset+1]=n*s+t*c;out[offset+2]=z/(g.bodyDepth*f);};
 cov(p[0],p[1],p[2],3);const length=Math.hypot(out[3]!,out[4]!,out[5]!);for(let i=3;i<6;i++)out[i]!/=length;cov(gx,gy,gz,0);const normal=out[0]!*out[3]!+out[1]!*out[4]!+out[2]!*out[5]!;for(let i=0;i<3;i++)out[i]!-=normal*out[i+3]!;
}
export function roundedPixelSampler(field:SphereFieldSnapshot,view:SphericalView,size:Viewport,appearance:SphereAppearance,grid?:RoundedRayGrid,geometryCache=true){
 const g=view.roundedGlobe;if(!g)return;const E=g.bendRadius+g.bodyRadius,layout=sphericalLayout(view,size),f=view.frame,trace=roundedIntervalRayTracer(g,roundedParallelWindows(g,f.right,f.up,f.forward)),hit=new Float64Array(5),value=new Float64Array(5),geometry=new Float64Array(6),cache=geometryCache?cacheFor(view,size,grid):undefined,fractional=geometryCache?fractionalCacheFor(view,size,grid):undefined,globe=view.mode==='globe';
 return(px:number,py:number,out:Float64Array,slot=-1):number=>{
  let p:Vec3,face:CubeFace,u=0,v=0,nearMiss=Infinity;const cell=slot>=0?cache?.(slot):fractional?.(px,py),entry=cell?.cache,atSlot=cell?.slot??0,code=entry?.codes[atSlot]??0;
  if(code===1){out.fill(0);out[5]=globe&&entry!.data[atSlot*6+5]!<2*Math.hypot(grid?grid.width/grid.columns:1,grid?grid.height/grid.rows:1)*E/(layout.radius*g.minimumStretch)?1:0;return 0;}
  if(code>1){face=CUBE_FACES[code-2]!;const at=atSlot*6;u=entry!.data[at]!;v=entry!.data[at+1]!;p=[entry!.data[at+2]!,entry!.data[at+3]!,entry!.data[at+4]!];nearMiss=entry!.data[at+5]!;}
  else{
   if(globe){const screenX=((px-layout.x)/layout.radius+view.pan.x)*E,screenY=((layout.y-py)/layout.radius+view.pan.y)*E,front=3*E,ox=f.right[0]*screenX+f.up[0]*screenY+f.forward[0]*front,oy=f.right[1]*screenX+f.up[1]*screenY+f.forward[1]*front,oz=f.right[2]*screenX+f.up[2]*screenY+f.forward[2]*front;
    if(!trace(ox,oy,oz,-f.forward[0],-f.forward[1],-f.forward[2],hit)){if(entry){entry.codes[atSlot]=1;entry.data[atSlot*6+5]=hit[4]!;}out.fill(0);out[5]=hit[4]!<2*Math.hypot(grid?grid.width/grid.columns:1,grid?grid.height/grid.rows:1)*E/(layout.radius*g.minimumStretch)?1:0;return 0;}nearMiss=hit[4]!;p=[hit[0]!,hit[1]!,hit[2]!];const[x,y,z]=p,ax=Math.abs(x),ay=Math.abs(y),az=Math.abs(z);let n,du,dv;if(ax>=ay&&ax>=az){face=x>=0?'px':'nx';n=ax;du=x>=0?y:-y;dv=z;}else if(ay>=az){face=y>=0?'py':'ny';n=ay;du=y>=0?-x:x;dv=z;}else{face=z>=0?'pz':'nz';n=az;du=x;dv=z>=0?y:-y;}u=Math.atan(du/n);v=Math.atan(dv/n);
   }else{const x=(px-layout.x)/layout.face+2-view.pan.x,y=(py-layout.y)/layout.face+1.5-view.pan.y,c=Math.floor(x),r=Math.floor(y),s=x-c,t=y-r;if(r===1&&c>=0&&c<4)face=(['ny','px','py','nx'] as const)[c]!;else if(c===1&&(r===0||r===2))face=r===0?'pz':'nz';else{if(entry)entry.codes[atSlot]=1;out.fill(0);return 0;}if(face==='pz'){u=(2*t-1)*Math.PI/4;v=(2*s-1)*Math.PI/4;}else if(face==='nz'){u=(1-2*t)*Math.PI/4;v=(1-2*s)*Math.PI/4;}else{u=(2*s-1)*Math.PI/4;v=(1-2*t)*Math.PI/4;}const tu=Math.tan(u),tv=Math.tan(v),length=Math.hypot(1,tu,tv),raw:Vec3=face==='px'?[1,tu,tv]:face==='nx'?[-1,-tu,tv]:face==='py'?[-tu,1,tv]:face==='ny'?[tu,-1,tv]:face==='pz'?[tu,tv,1]:[tu,-tv,-1];p=raw.map(x=>x/length) as unknown as Vec3;}
   if(entry){entry.codes[atSlot]=CUBE_FACES.indexOf(face)+2;entry.data.set([u,v,...p,nearMiss],atSlot*6);}
  }
  sampleSphereFaceInto(field,face,u,v,value);roundedShadeGeometry(g,p,value[1]!,value[2]!,value[3]!,geometry);const depth=Math.max(0,geometry[3]!*f.forward[0]+geometry[4]!*f.forward[1]+geometry[5]!*f.forward[2]);sphereDisplayColorInto(value[0]!,geometry[0]!,geometry[1]!,geometry[2]!,appearance,globe&&appearance==='relief'?.74+.26*depth:1,out);out[3]=1;out[4]=2+(value[0]!>0?1:0);out[5]=value[4]||globe&&(depth<.35||nearMiss<2*Math.hypot(grid?grid.width/grid.columns:1,grid?grid.height/grid.rows:1)*E/(layout.radius*g.minimumStretch))?1:0;return out[4]!;
 };
}
