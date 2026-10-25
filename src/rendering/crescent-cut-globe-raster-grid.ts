import type {Viewport} from './spherical-view.ts';
/** Match actual backing-pixel centers when the visible crop fits the existing
 * budget. Rendering an intermediate dense bitmap and resampling its nonlinear
 * relief colors blurs steep terrain. If the crop does not fit, retain the
 * accepted bounded interactive/coarse density rather than lowering it. */
export function cutGlobeRasterGrid(bounds:{left:number;top:number;width:number;height:number},size:Viewport,budget:number,backing:Viewport={width:Math.floor(size.width),height:Math.floor(size.height)}){
 const {left,top,width,height}=bounds,scale=width*height?Math.min(1.5,Math.sqrt(budget/(width*height))):1;
 const fallback={left,top,width,height,scale,columns:Math.max(1,Math.floor(width*scale)),rows:Math.max(1,Math.floor(height*scale))};
 if(!width||!height)return fallback;
 const sx=backing.width/size.width,sy=backing.height/size.height,x=Math.floor(left*sx),y=Math.floor(top*sy),right=Math.ceil((left+width)*sx),bottom=Math.ceil((top+height)*sy),columns=right-x,rows=bottom-y;
 if(columns*rows>budget)return fallback;
 return{left:x/sx,top:y/sy,width:columns/sx,height:rows/sy,columns,rows,scale:Math.min(sx,sy)};
}
