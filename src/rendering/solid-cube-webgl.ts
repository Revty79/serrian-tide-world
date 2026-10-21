import type {CubeDisplayField} from './solid-cube-field.ts';
import {CUBE_DISPLAY_LIMITS,assertCubeDisplayField} from './solid-cube-field.ts';
import {cubeLayout,type CubeCamera,type CubeDisplayMode,type CubeViewport} from './solid-cube-view.ts';
const vertex=`#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0.,1.);}`;
export const SOLID_CUBE_FRAGMENT=`#version 300 es
precision highp float;
precision highp int;
precision highp sampler2DArray;
uniform sampler2DArray elevations;
uniform vec2 viewport,backingSize,viewCenter;
uniform vec3 cameraRight,cameraUp,cameraForward;
uniform float scale;
uniform int mode,relief;
out vec4 outColor;
const vec3 normals[6]=vec3[6](vec3(1,0,0),vec3(-1,0,0),vec3(0,1,0),vec3(0,-1,0),vec3(0,0,1),vec3(0,0,-1));
const vec3 us[6]=vec3[6](vec3(0,1,0),vec3(0,-1,0),vec3(-1,0,0),vec3(1,0,0),vec3(1,0,0),vec3(1,0,0));
const vec3 vs[6]=vec3[6](vec3(0,0,1),vec3(0,0,1),vec3(0,0,1),vec3(0,0,1),vec3(0,1,0),vec3(0,-1,0));
const vec2 centers[6]=vec2[6](vec2(1,0),vec2(-1,0),vec2(0,1),vec2(0,-1),vec2(0,0),vec2(2,0));
const vec2 nu[6]=vec2[6](vec2(0,1),vec2(0,-1),vec2(-1,0),vec2(1,0),vec2(1,0),vec2(-1,0));
const vec2 nv[6]=vec2[6](vec2(-1,0),vec2(1,0),vec2(0,-1),vec2(0,1),vec2(0,1),vec2(0,-1));
vec3 fieldAt(int face,vec2 uv){int n=textureSize(elevations,0).x-1;vec2 q=clamp((uv+1.)*.5,0.,1.)*float(n);ivec2 p=min(ivec2(floor(q)),ivec2(n-1));vec2 f=q-vec2(p);
 return mix(mix(texelFetch(elevations,ivec3(p,face),0).xyz,texelFetch(elevations,ivec3(p+ivec2(1,0),face),0).xyz,f.x),mix(texelFetch(elevations,ivec3(p+ivec2(0,1),face),0).xyz,texelFetch(elevations,ivec3(p+ivec2(1,1),face),0).xyz,f.x),f.y);}
vec3 colorAt(int face,vec3 value){float h=value.x;vec3 rgb;
 if(h<=0.)rgb=mix(vec3(37,111,143),vec3(12,45,72),clamp(-h/1000.,0.,1.));
 else if(h<=2000.)rgb=mix(vec3(109,149,88),vec3(183,160,121),h/2000.);
 else rgb=mix(vec3(183,160,121),vec3(235,234,224),clamp((h-2000.)/3000.,0.,1.));
 rgb=floor(rgb+.5);float factor=h>0.&&relief==1?6.:0.,magnitude=max(1.,max(abs(value.y),abs(value.z)));vec3 normal=normals[face]/magnitude-factor*((value.y/magnitude)*us[face]+(value.z/magnitude)*vs[face]);
 float shade=clamp(.88+.30*dot(normalize(normal),vec3(-.38,-.48,.78)),.58,1.16);return clamp(floor(rgb*shade+.5),0.,255.)/255.;}
vec4 ray(vec2 pixel){vec2 s=(pixel/backingSize*viewport-viewCenter)/scale;int face=-1;vec2 uv=vec2(0);
 if(mode==1){vec2 p=s+vec2(.5,0);for(int i=0;i<6;i++){vec2 d=p-centers[i],q=2.*vec2(dot(d,nu[i]),dot(d,nv[i]));if(max(abs(q.x),abs(q.y))<=1.){face=i;uv=q;break;}}}
 else{vec3 origin=cameraRight*s.x+cameraUp*s.y;float best=-1.e20;for(int i=0;i<6;i++){float facing=dot(normals[i],cameraForward);if(facing<=1.e-7)continue;float t=(1.-dot(normals[i],origin))/facing;vec3 p=origin+t*cameraForward;if(max(max(abs(p.x),abs(p.y)),abs(p.z))>1.000001||t<=best)continue;face=i;uv=clamp(vec2(dot(p,us[i]),dot(p,vs[i])),-1.,1.);best=t;}}
 if(face<0)return vec4(0);return vec4(colorAt(face,fieldAt(face,uv)),1.);}
void main(){outColor=(ray(gl_FragCoord.xy+vec2(-.25,-.25))+ray(gl_FragCoord.xy+vec2(.25,-.25))+ray(gl_FragCoord.xy+vec2(-.25,.25))+ray(gl_FragCoord.xy+vec2(.25,.25)))*.25;}`;
export function cubeBackingSize(size:CubeViewport,dpr=1){const ratio=Math.min(1.5,Math.max(.5,dpr)),factor=Math.min(ratio,Math.sqrt(CUBE_DISPLAY_LIMITS.maxCanvasPixels/(size.width*size.height)));return{width:Math.max(1,Math.floor(size.width*factor)),height:Math.max(1,Math.floor(size.height*factor))};}
/** Three bounded GL objects; no numerical writes, tessellation or displaced vertices. */
export class SolidCubeWebGL {
 readonly canvas:HTMLCanvasElement;private invalidate:()=>void;private failShader:boolean;
 private gl:WebGL2RenderingContext|null=null;private program?:WebGLProgram;private texture?:WebGLTexture;private vao?:WebGLVertexArrayObject;
 private uniforms=new Map<string,WebGLUniformLocation>();private uploaded?:CubeDisplayField;private disposed=false;
 readonly statistics={reason:'',renderer:'',software:false,losses:0,recoveries:0,uploads:0,uploadBytes:0,textureBytes:0,resources:0,presentations:0};
 constructor(canvas:HTMLCanvasElement,invalidate:()=>void,failShader=false){this.canvas=canvas;this.invalidate=invalidate;this.failShader=failShader;canvas.addEventListener('webglcontextlost',this.lost);canvas.addEventListener('webglcontextrestored',this.restored);this.initialize();}
 get available(){return !this.disposed&&!!this.program&&!!this.gl&&!this.gl.isContextLost();}
 private lost=(e:Event)=>{e.preventDefault();this.statistics.losses++;this.statistics.reason='Graphics context lost; canvas fallback is active.';this.release(false);this.canvas.hidden=true;this.invalidate();};
 private restored=()=>{if(this.disposed)return;this.initialize();if(this.available)this.statistics.recoveries++;this.invalidate();};
 private initialize(){try{
  const gl=this.canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL2 unavailable; canvas fallback is active.');this.gl=gl;
  const info=gl.getExtension('WEBGL_debug_renderer_info');this.statistics.renderer=String(gl.getParameter(info?.UNMASKED_RENDERER_WEBGL??gl.RENDERER));this.statistics.software=/swiftshader|llvmpipe|software|basic render/i.test(this.statistics.renderer);
  if(gl.getParameter(gl.MAX_TEXTURE_SIZE)<257||gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS)<6)throw Error('Cube texture limits unavailable');
  const shaders:WebGLShader[]=[];let program:WebGLProgram|null=null;
  try{for(const [type,code]of[[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,this.failShader?'invalid shader':SOLID_CUBE_FRAGMENT]] as const){const s=gl.createShader(type);if(!s)throw Error('Cube shader allocation failed');shaders.push(s);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)??'Cube shader failed');}
   program=gl.createProgram();if(!program)throw Error('Cube program allocation failed');for(const s of shaders)gl.attachShader(program,s);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)??'Cube link failed');this.program=program;
  }catch(e){if(program)gl.deleteProgram(program);throw e;}finally{for(const s of shaders)gl.deleteShader(s);}
  for(const name of['elevations','viewport','backingSize','viewCenter','cameraRight','cameraUp','cameraForward','scale','mode','relief']){const u=gl.getUniformLocation(this.program!,name);if(u===null)throw Error('Missing cube uniform '+name);this.uniforms.set(name,u);}
  this.texture=gl.createTexture()??undefined;this.vao=gl.createVertexArray()??undefined;if(!this.texture||!this.vao)throw Error('Cube texture allocation failed');
  gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.texture);for(const p of[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D_ARRAY,p,gl.NEAREST);for(const p of[gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D_ARRAY,p,gl.CLAMP_TO_EDGE);
  this.statistics.resources=3;this.statistics.reason='';
 }catch(e){this.statistics.reason=String(e);this.release(true);this.canvas.hidden=true;}}
 present(field:CubeDisplayField,camera:CubeCamera,mode:CubeDisplayMode,size:CubeViewport,relief=true){
  assertCubeDisplayField(field);if(!this.available)throw Error('Cube GL unavailable');const at=performance.now(),gl=this.gl!,dimensions=cubeBackingSize(size,devicePixelRatio||1),layout=cubeLayout(camera,mode,size);
  if(this.canvas.width!==dimensions.width||this.canvas.height!==dimensions.height){this.canvas.width=dimensions.width;this.canvas.height=dimensions.height;}
  gl.useProgram(this.program!);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.texture!);
  if(this.uploaded!==field){
   if(field.updates&&this.uploaded?.n===field.n&&this.uploaded.sourceRevision===field.updates.baseRevision){const side=field.n+1;for(const r of field.updates.rects){const patch=new Float32Array(r.width*r.height*4);for(let y=0;y<r.height;y++){const start=((r.face*side+r.row+y)*side+r.column)*4;patch.set(field.data.subarray(start,start+r.width*4),y*r.width*4);}gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,r.column,r.row,r.face,r.width,r.height,1,gl.RGBA,gl.FLOAT,patch);this.statistics.uploadBytes+=patch.byteLength;}}
   else {gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA32F,field.n+1,field.n+1,6,0,gl.RGBA,gl.FLOAT,field.data);this.statistics.uploadBytes+=field.bytes;}
   if(gl.getError()!==gl.NO_ERROR)throw Error('Cube texture upload failed');this.uploaded=field;this.statistics.uploads++;this.statistics.textureBytes=field.bytes;
  }
  const u=(n:string)=>this.uniforms.get(n)!;gl.uniform1i(u('elevations'),0);gl.uniform2f(u('viewport'),size.width,size.height);gl.uniform2f(u('backingSize'),dimensions.width,dimensions.height);gl.uniform3fv(u('cameraRight'),camera.right);gl.uniform3fv(u('cameraUp'),camera.up);gl.uniform3fv(u('cameraForward'),camera.forward);gl.uniform1f(u('scale'),layout.scale);gl.uniform1i(u('mode'),mode==='net'?1:0);gl.uniform1i(u('relief'),relief?1:0);
  gl.uniform2f(u('viewCenter'),layout.x,size.height-layout.y);
  gl.bindVertexArray(this.vao!);gl.viewport(0,0,dimensions.width,dimensions.height);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);
  if(gl.isContextLost()||gl.getError()!==gl.NO_ERROR)throw Error('Cube GL presentation failed');this.canvas.hidden=false;this.statistics.presentations++;return performance.now()-at;
 }
 readPixel(x:number,y:number){const pixel=new Uint8Array(4);this.gl?.readPixels(x,y,1,1,this.gl.RGBA,this.gl.UNSIGNED_BYTE,pixel);return Array.from(pixel);}
 capture(){const gl=this.gl;if(!gl)return undefined;const pixels=new Uint8Array(this.canvas.width*this.canvas.height*4);gl.readPixels(0,0,this.canvas.width,this.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;}
 lose(){const extension=this.gl?.getExtension('WEBGL_lose_context');extension?.loseContext();return()=>extension?.restoreContext();}
 fail(e:unknown){this.statistics.reason=String(e);this.release(true);this.canvas.hidden=true;}
 private release(remove:boolean){if(this.gl&&remove){if(this.program)this.gl.deleteProgram(this.program);if(this.texture)this.gl.deleteTexture(this.texture);if(this.vao)this.gl.deleteVertexArray(this.vao);}this.program=undefined;this.texture=undefined;this.vao=undefined;this.uniforms.clear();this.uploaded=undefined;this.statistics.resources=0;this.statistics.textureBytes=0;}
 dispose(){this.disposed=true;this.canvas.removeEventListener('webglcontextlost',this.lost);this.canvas.removeEventListener('webglcontextrestored',this.restored);this.release(true);this.gl=null;this.canvas.width=0;}
}
