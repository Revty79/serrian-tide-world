import {roundedPixelSampler} from './rounded-crescent-pixels.ts';
import {cutGlobeRasterGrid} from './crescent-cut-globe-raster-grid.ts';
import {cutGlobePixelSampler} from './crescent-cut-globe-pixels.ts';
import {sphereCenterInspection} from './spherical-view.ts';
import { type CubeFace } from '../surfaces/cube-sphere.ts';
import { sphericalLayout, type SphericalView, type Viewport } from './spherical-view.ts';
import { sampleSphereFaceInto,sphereDisplayColorInto, type SphereFieldSnapshot, type SphereAppearance } from './spherical-elevation.ts';
import {sphereCutSampler,type SphereCutRaster} from './sphere-excavation-pixels.ts';
import {rasterEdgeCoverage} from './raster-quality.ts';
import {roundedGridX,roundedGridY,type RoundedRayGrid} from './rounded-crescent-grid.ts';

/** A coherent derived epoch and bounded CPU pixel work, for both projections.
 * The caller presents only the completed buffer and retains its exact view. */
export function* sphericalFieldRaster(field:SphereFieldSnapshot,view:SphericalView,size:Viewport,appearance:SphereAppearance,pixelBudget:number,reusable?:Uint8ClampedArray,excavation?:SphereCutRaster,backing?:Viewport,gridOverride?:RoundedRayGrid,geometryCache=true):Generator<void,{pixels:Uint8ClampedArray;columns:number;rows:number;left:number;top:number;width:number;height:number;revision:number}> {
 if(!Number.isSafeInteger(pixelBudget)||pixelBudget<1||pixelBudget>2000000)throw RangeError('Invalid spherical display pixel budget.');
 const l=sphericalLayout(view,size),globe=view.mode==='globe',inside=sphereCenterInspection(view)||!!view.roundedGlobe&&globe;let left=Math.max(0,inside?0:globe?l.x-l.radius:l.x+(-2+view.pan.x)*l.face),top=Math.max(0,inside?0:globe?l.y-l.radius:l.y+(-1.5+view.pan.y)*l.face),right=Math.min(size.width,inside?size.width:globe?l.x+l.radius:l.x+(2+view.pan.x)*l.face),bottom=Math.min(size.height,inside?size.height:globe?l.y+l.radius:l.y+(1.5+view.pan.y)*l.face),width=Math.max(0,right-left),height=Math.max(0,bottom-top),scale=width*height?Math.min(1.5,Math.sqrt(pixelBudget/(width*height))):1,columns=Math.max(1,Math.floor(width*scale)),rows=Math.max(1,Math.floor(height*scale));
 if(gridOverride){if(!view.roundedGlobe||gridOverride.columns*gridOverride.rows>pixelBudget)throw RangeError('Invalid physical partial raster.');({left,top,width,height,columns,rows}=gridOverride);scale=Math.min(columns/width,rows/height);}else if(view.cutGlobe||view.roundedGlobe){const aligned=cutGlobeRasterGrid({left,top,width,height},size,pixelBudget,backing);({left,top,width,height,scale,columns,rows}=aligned);}
 const pixels=reusable?.length===columns*rows*4?reusable:new Uint8ClampedArray(columns*rows*4);pixels.fill(0);
 const value=new Float64Array(5),center=new Float64Array(6),sample=new Float64Array(6),sum=new Float64Array(6),stepX=width/columns*.25,stepY=height/rows*.25;
 let crosses=false,classification=0;
 const cut=sphereCutSampler(field,excavation,view,size,appearance);
 const rayGrid:RoundedRayGrid={columns,rows,left,top,width,height,...(gridOverride?.density?{density:gridOverride.density}:view.roundedGlobe&&width&&height?{density:{sx:columns/width,sy:rows/height,x0:0,y0:0,ox:left,oy:top}}:{})};
 const folded=roundedPixelSampler(field,view,size,appearance,rayGrid,geometryCache)??cutGlobePixelSampler(field,view,size,appearance,rayGrid);
 const labels=cut||folded?new Uint8Array(columns*rows):undefined;
 function shade(px:number,py:number,out:Float64Array,slot=-1){
  classification=0;if(folded){classification=folded(px,py,out,slot);crosses=!!out[5];return classification;}if(cut?.(px,py,out)){classification=out[4]!;crosses=!!out[5];return classification;}
  let face:CubeFace,u:number,v:number,coverage=1,depth=1;
  if(globe){const x=(px-l.x)/l.radius,y=(l.y-py)/l.radius,r=Math.hypot(x,y);coverage=inside?1:Math.max(0,Math.min(1,(1-r)*l.radius*scale+.5));if(!coverage){out.fill(0);crosses=false;return;}depth=inside?1:Math.sqrt(Math.max(0,1-x*x-y*y));const f=view.frame,xx=inside?-x:x,a=f.right[0]*xx+f.up[0]*y+f.forward[0]*depth,b=f.right[1]*xx+f.up[1]*y+f.forward[1]*depth,c=f.right[2]*xx+f.up[2]*y+f.forward[2]*depth,ax=Math.abs(a),ay=Math.abs(b),az=Math.abs(c);let normal:number,du:number,dv:number;
   if(ax>=ay&&ax>=az){face=a>=0?'px':'nx';normal=ax;du=a>=0?b:-b;dv=c;}else if(ay>=az){face=b>=0?'py':'ny';normal=ay;du=b>=0?-a:a;dv=c;}else{face=c>=0?'pz':'nz';normal=az;du=a;dv=c>=0?b:-b;}u=Math.atan(du/normal);v=Math.atan(dv/normal);
  }else{const gx=(px-l.x)/l.face+2-view.pan.x,gy=(py-l.y)/l.face+1.5-view.pan.y,c=Math.floor(gx),r=Math.floor(gy),s=gx-c,t=gy-r;
   if(r===1&&c>=0&&c<4)face=(['ny','px','py','nx'] as const)[c]!;else if(c===1&&(r===0||r===2))face=r===0?'pz':'nz';else{out.fill(0);crosses=false;return;}
   if(face==='pz'){u=(2*t-1)*Math.PI/4;v=(2*s-1)*Math.PI/4;}else if(face==='nz'){u=(1-2*t)*Math.PI/4;v=(1-2*s)*Math.PI/4;}else{u=(2*s-1)*Math.PI/4;v=(1-2*t)*Math.PI/4;}
  }
  sampleSphereFaceInto(field,face,u,v,value);const h=value[0]!;crosses=!!value[4];
  sphereDisplayColorInto(h,value[1]!,value[2]!,value[3]!,appearance,appearance==='relief'&&globe&&!inside?.74+.26*depth:1,out);
  classification=2+(h>0?1:0);for(let k=0;k<3;k++)out[k]!*=coverage;out[3]=coverage;return classification;
 }
 let count=0;
 for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
  const x=roundedGridX(rayGrid,column+.5),y=roundedGridY(rayGrid,row+.5),centerClass=shade(x,y,center,row*columns+column)??0;if(labels)labels[row*columns+column]=centerClass;
  if(crosses||center[3]!>0&&center[3]!<1){let mixed=false;sum.fill(0);for(const dx of[-stepX,stepX])for(const dy of[-stepY,stepY]){const sampleClass=shade(x+dx,y+dy,sample)??0;mixed||=sampleClass!==centerClass||sample[3]!==center[3];for(let i=0;i<4;i++)sum[i]!+=sample[i]!*.25;}if(mixed)center.set(sum);}
  const offset=(row*columns+column)*4,alpha=center[3]!;if(alpha>0){pixels[offset]=center[0]!/alpha;pixels[offset+1]=center[1]!/alpha;pixels[offset+2]=center[2]!/alpha;pixels[offset+3]=alpha*255;}if(++count%(view.roundedGlobe?128:512)===0)yield;
 }
 if(labels)yield* rasterEdgeCoverage(pixels,labels,columns,rows,(x,y,out)=>shade(roundedGridX(rayGrid,x),roundedGridY(rayGrid,y),out)??0,undefined,undefined,!!view.roundedGlobe,view.roundedGlobe?64:256);
 return{pixels,columns,rows,left,top,width,height,revision:field.sourceRevision};
}
