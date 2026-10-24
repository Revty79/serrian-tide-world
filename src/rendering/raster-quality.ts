import {surfaceDisplayDimensions,type SurfaceDisplaySize} from './surface-renderer.ts';

/** Settled presentation only. Interactive budgets and numerical detail stay
 * independent. Long images are prepared cooperatively behind the current frame. */
export function settledRasterBudget(size:SurfaceDisplaySize,dpr:number,coarsePointer=false){
 const backing=surfaceDisplayDimensions(size,dpr);
 return Math.max(1,Math.min(coarsePointer?650_000:1_500_000,backing.width*backing.height));
}

/** Re-evaluate real subpixel rays only along discrete material/coast boundaries.
 * Samples use premultiplied RGB (0..255) and alpha (0..1). No color blur, sample
 * interpolation or numerical write is involved. The labels are immutable for
 * this pass, so the result is independent of traversal order. */
export function* rasterEdgeCoverage(pixels:Uint8ClampedArray,labels:Uint8Array,columns:number,rows:number,sample:(x:number,y:number,out:Float64Array)=>number,eraseMask?:Uint8ClampedArray):Generator<void>{
 if(pixels.length!==columns*rows*4||labels.length!==columns*rows)throw RangeError('Raster edge buffers disagree.');
 if(eraseMask&&eraseMask.length!==pixels.length)throw RangeError('Coverage mask dimensions disagree.');
 const value=new Float64Array(6),sum=new Float64Array(5);let rays=0,scans=0;
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  const at=y*columns+x,label=labels[at]!;
  if((x>0&&labels[at-1]!==label)||(x+1<columns&&labels[at+1]!==label)||(y>0&&labels[at-columns]!==label)||(y+1<rows&&labels[at+columns]!==label)){
   let mixed=false;sum.fill(0);for(const dx of[-.25,.25])for(const dy of[-.25,.25]){value.fill(0);mixed=sample(x+.5+dx,y+.5+dy,value)!==label||mixed;for(let k=0;k<4;k++)sum[k]!+=value[k]!*.25;if(eraseMask)sum[4]!+=value[4]!*.25;}
   rays+=4;if(mixed){const offset=at*4,alpha=sum[3]!;for(let k=0;k<3;k++)pixels[offset+k]=alpha?sum[k]!/alpha:0;pixels[offset+3]=alpha*255;if(eraseMask)eraseMask[offset+3]=sum[4]!*255;}
  }
  if(++scans>=4096||rays>=256){rays=scans=0;yield;}
 }
}

/** Only analytic physical views need extra subpixel coverage. Retain the
 * existing 1.5x / 3M backing cap and one CSG evaluation per backing pixel;
 * duplicating the large shader kernel causes excessive driver compile stalls. */
export function cutDisplayDimensions(size:SurfaceDisplaySize,dpr:number,physicalCut:boolean){return surfaceDisplayDimensions(size,physicalCut?Math.max(dpr,1.5):dpr);}

/** Preserve the accepted finite backing density within the settled Canvas cap. */
export function settledSurfaceDimensions(size:SurfaceDisplaySize,dpr:number,coarsePointer=false){const backing=surfaceDisplayDimensions(size,dpr),budget=settledRasterBudget(size,dpr,coarsePointer),scale=Math.min(1,Math.sqrt(budget/(backing.width*backing.height)));return{width:Math.max(1,Math.floor(backing.width*scale)),height:Math.max(1,Math.floor(backing.height*scale))};}
