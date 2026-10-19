import { cylinderLayout, type CylinderView, type CylinderViewport } from './cylindrical-view.ts';
import { CylinderDisplayCache } from './cylindrical-raster.ts';
import { surfaceDisplayDimensions, type SurfaceRenderer } from './surface-renderer.ts';
import { dot3 } from '../surfaces/cube-sphere.ts';

// Display tessellation only: sagitta <= 1-cos(pi/4096) radius units.
// These vertices are reusable reference geometry, never elevation samples.
export const CYLINDER_DISPLAY_SEGMENTS=4096;
const vertex=`#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec4 point;
uniform vec3 cameraRight,cameraUp,cameraForward;
uniform vec2 viewport,translation;
uniform float scale,depthExtent;
uniform int mode;
out vec3 position;
flat out int region;
void main(){position=point.xyz;region=int(point.w);vec2 p=mode==0?vec2(dot(point.xyz,cameraRight),dot(point.xyz,cameraUp))-translation:point.xy+translation;gl_Position=vec4(p*scale*2./viewport,mode==0?-dot(point.xyz,cameraForward)/depthExtent:0.,1.);}`;
export const CYLINDER_FRAGMENT_SHADER=`#version 300 es
precision highp float;
precision highp int;
uniform sampler2D sideColors,startColors,endColors;
uniform vec3 cameraForward;
uniform float h,phase;
uniform int mode;
in vec3 position;
flat in int region;
out vec4 outColor;
const float PI=3.141592653589793;
void main(){
 float theta,r,z;
 if(mode==0){theta=atan(position.y,position.x);r=length(position.xy);z=position.z;}
 else if(region==0){theta=phase+position.x;r=1.;z=position.y;}
 else {float sign=region==1?1.:-1.,center=region==1?-h-1.:h+1.;vec2 p=vec2(position.x,position.y-center);r=length(p);theta=r==0.?0.:phase+atan(p.x,sign*p.y);z=region==1?-h:h;}
 vec2 dimensions=vec2(textureSize(sideColors,0));vec3 rgb;
 if(region==0)rgb=texture(sideColors,vec2(theta/(2.*PI)+.5/dimensions.x,((z+h)/(2.*h)*(dimensions.y-1.)+.5)/dimensions.y)).rgb;
 else {dimensions=vec2(textureSize(startColors,0));vec2 uv=vec2((region==2?-theta:theta)/(2.*PI)+.5/dimensions.x,(clamp(r,0.,1.)*(dimensions.y-1.)+.5)/dimensions.y);rgb=region==1?texture(startColors,uv).rgb:texture(endColors,uv).rgb;}
 float facing=region==0?dot(vec2(cos(theta),sin(theta)),cameraForward.xy):(region==2?1.:-1.)*cameraForward.z;
 outColor=vec4(rgb*(mode==1?1.:.74+.26*max(0.,facing)),1.);
}`;
function vertices(h:number,map:boolean){
 const data:number[]=[],add=(x:number,y:number,z:number,region:number)=>data.push(x,y,z,region);
 if(map){for(const p of [[-Math.PI,-h],[Math.PI,-h],[Math.PI,h],[-Math.PI,-h],[Math.PI,h],[-Math.PI,h]])add(p[0]!,p[1]!,0,0);}
 for(let i=0;i<CYLINDER_DISPLAY_SEGMENTS;i++){
  const a=i*2*Math.PI/CYLINDER_DISPLAY_SEGMENTS,b=(i+1)*2*Math.PI/CYLINDER_DISPLAY_SEGMENTS,x=Math.cos(a),y=Math.sin(a),xx=Math.cos(b),yy=Math.sin(b);
  if(!map){add(x,y,-h,0);add(xx,yy,-h,0);add(xx,yy,h,0);add(x,y,-h,0);add(xx,yy,h,0);add(x,y,h,0);}
  for(const [region,sign] of [[1,-1],[2,1]] as const){if(map){const center=sign*(h+1);add(0,center,0,region);add(x,y+center,0,region);add(xx,yy+center,0,region);}else{add(0,0,sign*h,region);add(x,y,sign*h,region);add(xx,yy,sign*h,region);}}
 }
 return new Float32Array(data);
}
/** Browser-GPU resources; caller-owned terrain/cache survive failure and device loss. */
export class CylinderWebGLRenderer implements SurfaceRenderer<CylinderView>{
 private gl:WebGL2RenderingContext|null=null;private program?:WebGLProgram;
 private textures:WebGLTexture[]=[];private meshes:{vao:WebGLVertexArrayObject;buffer:WebGLBuffer;count:number}[]=[];
 private uniforms=new Map<string,WebGLUniformLocation>();private uploadedRevision=-1;private disposed=false;
 private canvas:HTMLCanvasElement;private cache:CylinderDisplayCache;private invalidate:()=>void;
 readonly statistics={losses:0,recoveries:0,uploads:0,presentations:0,textureBytes:0,geometryBytes:0,antialias:false,reason:'',renderer:''};
 constructor(canvas:HTMLCanvasElement,cache:CylinderDisplayCache,invalidate:()=>void){this.canvas=canvas;this.cache=cache;this.invalidate=invalidate;canvas.addEventListener('webglcontextlost',this.lost);canvas.addEventListener('webglcontextrestored',this.restored);this.initialize();}
 get available(){return !this.disposed&&!!this.program&&!!this.gl&&!this.gl.isContextLost();}
 private lost=(event:Event)=>{event.preventDefault();this.statistics.losses++;this.statistics.reason='Graphics context lost; using CPU fallback.';this.release(false);this.canvas.hidden=true;this.invalidate();};
 private restored=()=>{if(this.disposed)return;this.initialize();if(this.available)this.statistics.recoveries++;this.invalidate();};
 private initialize(){try{
  const gl=this.canvas.getContext('webgl2',{alpha:true,antialias:true,depth:true,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL2 unavailable; using CPU fallback.');this.gl=gl;
  const info=gl.getExtension('WEBGL_debug_renderer_info');this.statistics.renderer=String(gl.getParameter(info?.UNMASKED_RENDERER_WEBGL??gl.RENDERER));
  if(/swiftshader|llvmpipe|software|basic render/i.test(this.statistics.renderer))throw Error('Software graphics detected; using bounded CPU fallback.');
  const compile=(type:number,source:string)=>{const shader=gl.createShader(type);if(!shader)throw Error('Shader allocation failed');gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const reason=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(reason??'Shader compilation failed');}return shader;};
  const shaders:WebGLShader[]=[];let program:WebGLProgram|null=null;
  try{shaders.push(compile(gl.VERTEX_SHADER,vertex));shaders.push(compile(gl.FRAGMENT_SHADER,CYLINDER_FRAGMENT_SHADER));program=gl.createProgram();if(!program)throw Error('Program allocation failed');gl.attachShader(program,shaders[0]!);gl.attachShader(program,shaders[1]!);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)??'Program linking failed');this.program=program;}
  catch(e){if(program)gl.deleteProgram(program);throw e;}finally{for(const shader of shaders)gl.deleteShader(shader);}
  this.uniforms.clear();for(const name of ['sideColors','startColors','endColors','viewport','translation','cameraRight','cameraUp','cameraForward','scale','depthExtent','h','phase','mode']){const u=gl.getUniformLocation(this.program!,name);if(u===null)throw Error(`Missing graphics uniform ${name}`);this.uniforms.set(name,u);}
  for(let i=0;i<3;i++){const texture=gl.createTexture();if(!texture)throw Error('Texture allocation failed');this.textures.push(texture);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
  const h=this.cache.terrain.metadata.geometry.lengthMeters/this.cache.terrain.metadata.geometry.radiusMeters/2;
  for(const map of [false,true]){const vao=gl.createVertexArray(),buffer=gl.createBuffer();if(!vao||!buffer){if(vao)gl.deleteVertexArray(vao);if(buffer)gl.deleteBuffer(buffer);throw Error('Mesh allocation failed');}const data=vertices(h,map);this.meshes.push({vao,buffer,count:data.length/4});this.statistics.geometryBytes+=data.byteLength;gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,16,0);}
  if(gl.getError()!==gl.NO_ERROR)throw Error('Graphics resource allocation failed; using CPU fallback.');
  this.statistics.antialias=!!gl.getContextAttributes()?.antialias;this.statistics.reason='';
 }catch(e){this.statistics.reason=String(e);this.release(true);this.canvas.hidden=true;this.canvas.width=0;}}
 present(view:CylinderView,size:CylinderViewport){
  if(!this.available)throw Error('Graphics renderer unavailable');
  const gl=this.gl!,at=performance.now(),dimensions=surfaceDisplayDimensions(size,devicePixelRatio||1),l=cylinderLayout(this.cache.terrain.geometry,view,size);
  if(this.canvas.width!==dimensions.width||this.canvas.height!==dimensions.height){this.canvas.width=dimensions.width;this.canvas.height=dimensions.height;}
  const resized=performance.now();gl.useProgram(this.program!);
  const res=this.cache.terrain.metadata.representation.resolution,a=res.angularSamples,z=res.axialCells,p=res.radialCells;
  if(this.uploadedRevision!==this.cache.sourceRevision){
   const colors=this.cache.snapshot();let bytes=0;
   for(let region=0;region<3;region++){const rows=(region===0?z:p)+1,data=new Uint8Array(a*rows*4);
    for(let row=0;row<rows;row++)for(let col=0;col<a;col++){
     const index=region===0?row*a+col:row===p?(region===2?z*a+(a-col)%a:col):a*(z+1)+(region===2?1+a*(p-1):0)+(row===0?0:1+(row-1)*a+col),color=colors[index]!,offset=(row*a+col)*4;
     data[offset]=color&255;data[offset+1]=color>>>8&255;data[offset+2]=color>>>16&255;data[offset+3]=255;
    }
    gl.activeTexture(gl.TEXTURE0+region);gl.bindTexture(gl.TEXTURE_2D,this.textures[region]!);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,a,rows,0,gl.RGBA,gl.UNSIGNED_BYTE,data);bytes+=data.byteLength;
   }
   if(gl.getError()!==gl.NO_ERROR)throw Error('Graphics palette upload failed; using CPU fallback.');
   this.uploadedRevision=this.cache.sourceRevision;this.statistics.textureBytes=bytes;this.statistics.uploads++;
  }
  const uploaded=performance.now(),u=(name:string)=>this.uniforms.get(name)!;
  ['sideColors','startColors','endColors'].forEach((name,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,this.textures[i]!);gl.uniform1i(u(name),i);});
  gl.uniform2f(u('viewport'),size.width,size.height);gl.uniform2f(u('translation'),view.mode==='map'?view.pan.x:dot3(view.target,view.frame.right),view.mode==='map'?view.pan.y:dot3(view.target,view.frame.up));
  gl.uniform3fv(u('cameraRight'),view.frame.right);gl.uniform3fv(u('cameraUp'),view.frame.up);gl.uniform3fv(u('cameraForward'),view.frame.forward);gl.uniform1f(u('scale'),l.scale);gl.uniform1f(u('h'),l.h);gl.uniform1f(u('phase'),view.phase);gl.uniform1f(u('depthExtent'),Math.hypot(view.frame.forward[0],view.frame.forward[1])+l.h*Math.abs(view.frame.forward[2])+.01);gl.uniform1i(u('mode'),view.mode==='map'?1:0);
  const mesh=this.meshes[view.mode==='physical'?0:1]!;gl.bindVertexArray(mesh.vao);gl.viewport(0,0,dimensions.width,dimensions.height);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  if(gl.isContextLost())throw Error('Graphics context lost during presentation');this.canvas.hidden=false;this.statistics.presentations++;
  return{revision:this.uploadedRevision,...dimensions,resizeMs:resized-at,uploadMs:uploaded-resized,submitMs:performance.now()-uploaded};
 }
 fail(reason:unknown){this.statistics.reason=String(reason);this.release(true);this.canvas.hidden=true;this.canvas.width=0;}
 private release(remove:boolean){const gl=this.gl;if(gl&&remove){for(const t of this.textures)gl.deleteTexture(t);for(const m of this.meshes){gl.deleteVertexArray(m.vao);gl.deleteBuffer(m.buffer);}if(this.program)gl.deleteProgram(this.program);}this.textures=[];this.meshes=[];this.program=undefined;this.uniforms.clear();this.uploadedRevision=-1;this.statistics.textureBytes=0;this.statistics.geometryBytes=0;}
 dispose(){this.disposed=true;this.canvas.removeEventListener('webglcontextlost',this.lost);this.canvas.removeEventListener('webglcontextrestored',this.restored);this.release(true);this.gl=null;this.canvas.width=0;}
}
