import {roundedDirtyRaster} from './rounded-crescent-dirty.ts';
import type {SphericalElevationField} from './spherical-elevation.ts';
import type {SphericalView,Viewport} from './spherical-view.ts';
/** One bounded derived RGBA8 frame, using the existing backing dimensions.
 * Physical dirty bounds rerender the exact same shader at the exact same pixels.
 * An unknown epoch, changed camera, appearance or size always draws a full frame. */
export class RoundedCurrentFrame {
 private texture?:WebGLTexture;private buffer?:WebGLFramebuffer;
 private width=0;private height=0;private key='';private revision=-1;
 readonly statistics={bytes:0,partialFrames:0,fullFrames:0,lastDrawPixels:0};
 private readonly gl:WebGL2RenderingContext;
 constructor(gl:WebGL2RenderingContext){this.gl=gl;}
 present(field:SphericalElevationField,view:SphericalView,size:Viewport,backing:Viewport,appearance:string,draw:()=>void){
  const gl=this.gl,{width,height}=backing;if(width*height>3000000)throw RangeError('Rounded frame exceeds the shared backing limit.');
  if(!this.texture||!this.buffer){const texture=gl.createTexture(),buffer=gl.createFramebuffer();if(!texture||!buffer){if(texture)gl.deleteTexture(texture);if(buffer)gl.deleteFramebuffer(buffer);throw Error('Rounded current-frame allocation failed.');}this.texture=texture;this.buffer=buffer;}
  if(width!==this.width||height!==this.height){gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.bindFramebuffer(gl.FRAMEBUFFER,this.buffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.texture,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Rounded current-frame target unavailable.');this.width=width;this.height=height;this.statistics.bytes=width*height*4;this.key='';this.revision=-1;}
  const key=JSON.stringify([view,size,backing,appearance]),patch=this.key===key&&this.revision>=0&&this.revision!==field.sourceRevision?roundedDirtyRaster(view,size,backing,field,this.revision,{sx:width/size.width,sy:height/size.height,left:0,top:0,columns:width,rows:height,refined:true},80000)?.target:undefined;
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.buffer);gl.disable(gl.SCISSOR_TEST);
  if(patch){const sx=width/size.width,sy=height/size.height,x=Math.max(0,Math.floor(patch.left*sx)),y=Math.max(0,Math.floor((size.height-patch.top-patch.height)*sy)),right=Math.min(width,Math.ceil((patch.left+patch.width)*sx)),top=Math.min(height,Math.ceil((size.height-patch.top)*sy));gl.enable(gl.SCISSOR_TEST);gl.scissor(x,y,right-x,top-y);this.statistics.partialFrames++;this.statistics.lastDrawPixels=(right-x)*(top-y);}else{this.statistics.fullFrames++;this.statistics.lastDrawPixels=width*height;}
  try{draw();}finally{gl.disable(gl.SCISSOR_TEST);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,this.buffer);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);gl.blitFramebuffer(0,0,width,height,0,0,width,height,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
  this.key=key;this.revision=field.sourceRevision;
 }
 copy(){if(!this.buffer||!this.width||this.revision<0)throw Error('Rounded current frame is not ready.');const gl=this.gl;gl.disable(gl.SCISSOR_TEST);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,this.buffer);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);gl.blitFramebuffer(0,0,this.width,this.height,0,0,this.width,this.height,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.FRAMEBUFFER,null); }
 dispose(remove=true){if(remove){if(this.texture)this.gl.deleteTexture(this.texture);if(this.buffer)this.gl.deleteFramebuffer(this.buffer);}this.texture=undefined;this.buffer=undefined;this.width=this.height=0;this.key='';this.revision=-1;this.statistics.bytes=0;}
}
