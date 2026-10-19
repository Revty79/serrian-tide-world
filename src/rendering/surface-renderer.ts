/** Display lifecycle only. Surface providers retain projection and numerical authority. */
export interface SurfaceDisplaySize { readonly width:number; readonly height:number }
export interface SurfaceDisplayReceipt {
 readonly revision:number; readonly width:number; readonly height:number;
 readonly resizeMs:number; readonly uploadMs:number; readonly submitMs:number;
}
export interface SurfaceRenderer<View> {
 readonly available:boolean;
 present(view:View,size:SurfaceDisplaySize):SurfaceDisplayReceipt;
 dispose():void;
}
/** Same finite backing-store policy for scene and overlays; never changes geography. */
export function surfaceDisplayDimensions(size:SurfaceDisplaySize,dpr:number) {
 if (![size.width,size.height,dpr].every(v=>Number.isFinite(v)&&v>0)) throw new RangeError('Positive display dimensions required.');
 const scale=Math.min(dpr,1.5,Math.sqrt(3000000/(size.width*size.height)));
 return{width:Math.max(1,Math.floor(size.width*scale)),height:Math.max(1,Math.floor(size.height*scale))};
}
