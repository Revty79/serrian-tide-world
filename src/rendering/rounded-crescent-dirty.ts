import {roundedPatchBounds} from '../surfaces/rounded-crescent-bounds.ts';
import {QUARTER_PI} from '../surfaces/cube-sphere.ts';
import {netFaceCoordinates,netFaceRect,sphericalLayout,type SphericalView,type Viewport} from './spherical-view.ts';
import type {SphericalElevationField} from './spherical-elevation.ts';
export interface RoundedRasterDensity {readonly sx:number;readonly sy:number;readonly refined:boolean;readonly left:number;readonly top:number;readonly columns:number;readonly rows:number}
export interface RoundedPatchRect {readonly left:number;readonly top:number;readonly width:number;readonly height:number}
/** Conservative full reconstruction/gradient footprint, projected from actual
 * smooth geometry. Retain the applied raster's sampling density and filtering
 * phase; never substitute a lower resolution to make editing faster. */
export function roundedDirtyRaster(view:SphericalView,size:Viewport,backing:Viewport,field:SphericalElevationField,fromRevision:number,density:RoundedRasterDensity,budget:number){
 const g=view.roundedGlobe,regions=field.regionsSince(fromRevision);if(!g||!regions?.length)return;
 const n=field.n,l=sphericalLayout(view,size),E=g.bendRadius+g.bodyRadius;let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 const include=(x:number,y:number)=>{left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);};
 for(const r of regions){const u0=(2*Math.max(0,r.left-2)/n-1)*QUARTER_PI,u1=(2*Math.min(n,r.right+2)/n-1)*QUARTER_PI,v0=(2*Math.max(0,r.top-2)/n-1)*QUARTER_PI,v1=(2*Math.min(n,r.bottom+2)/n-1)*QUARTER_PI;
  if(view.mode==='net'){const rect=netFaceRect(r.face,view,size);for(const u of[u0,u1])for(const v of[v0,v1]){const p=netFaceCoordinates(r.face,u,v);include(rect.x+p.x*rect.side,rect.y+p.y*rect.side);}}
  else{const b=roundedPatchBounds(g,r.face,[u0,u1],[v0,v1]);for(const x of[b.low[0],b.high[0]])for(const y of[b.low[1],b.high[1]])for(const z of[b.low[2],b.high[2]])include(l.x+l.radius*((x*view.frame.right[0]+y*view.frame.right[1]+z*view.frame.right[2])/E-view.pan.x),l.y-l.radius*((x*view.frame.up[0]+y*view.frame.up[1]+z*view.frame.up[2])/E-view.pan.y));}
 }
 const {sx,sy,left:ox,top:oy}=density,bx=backing.width/size.width,by=backing.height/size.height;
 const x0=Math.max(0,Math.floor((left-4/sx)*bx)/bx),x1=Math.min(size.width,Math.ceil((right+4/sx)*bx)/bx),y0=Math.max(0,Math.floor((top-4/sy)*by)/by),y1=Math.min(size.height,Math.ceil((bottom+4/sy)*by)/by);if(x1<=x0||y1<=y0)return;
 const ix0=Math.max(0,Math.floor((x0-ox)*sx)-4),ix1=Math.min(density.columns,Math.ceil((x1-ox)*sx)+4),iy0=Math.max(0,Math.floor((y0-oy)*sy)-4),iy1=Math.min(density.rows,Math.ceil((y1-oy)*sy)+4),columns=ix1-ix0,rows=iy1-iy0;if(columns<=0||rows<=0||columns*rows>budget)return;
 return{target:{left:x0,top:y0,width:x1-x0,height:y1-y0},grid:{left:ox+ix0/sx,top:oy+iy0/sy,width:columns/sx,height:rows/sy,columns,rows,density:{sx,sy,x0:ix0,y0:iy0,ox,oy}}};
}
