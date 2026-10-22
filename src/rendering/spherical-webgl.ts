import {sphereCenterInspection} from './spherical-view.ts';
import { CUBE_FACES } from '../surfaces/cube-sphere.ts';
import { surfaceDisplayDimensions, type SurfaceRenderer } from './surface-renderer.ts';
import { sphericalLayout, type SphericalView, type Viewport } from './spherical-view.ts';
import { SphericalElevationField, type SphereAppearance } from './spherical-elevation.ts';
import {HOLLOW_SPHERE_GLSL} from './hollow-sphere-glsl.ts';
import type {SphereExcavation} from '../surfaces/hollow-sphere-excavation.ts';
export interface SphereExcavationDisplay {readonly model:SphereExcavation;readonly oppositeTerrain:import('../terrain/spherical.ts').SphericalTerrain;readonly opposite:SphericalElevationField;readonly role:'exterior'|'interior';readonly revision:number}

const VERTEX=`#version 300 es
void main(){vec2 p=gl_VertexID==0?vec2(-1.,-1.):gl_VertexID==1?vec2(3.,-1.):vec2(-1.,3.);gl_Position=vec4(p,0.,1.);}`;
export const SPHERE_FRAGMENT_SHADER=`#version 300 es
precision highp float;precision highp int;
uniform highp sampler2DArray elevations;
uniform vec2 viewport,backingSize,pan;
uniform vec3 cameraRight,cameraUp,cameraForward;
uniform float globeRadius,faceSize,heightScale;
uniform int mode,relief,interior;
out vec4 outColor;
const float Q=.7853981633974483;
vec4 field(int face,vec2 angles){
 int n=textureSize(elevations,0).x-1;vec2 p=clamp((angles/Q+1.)*float(n)*.5,0.,float(n));ivec2 cell=ivec2(min(floor(p),vec2(n-1)));vec2 f=p-vec2(cell);
 vec4 a=texelFetch(elevations,ivec3(cell,face),0),b=texelFetch(elevations,ivec3(cell+ivec2(1,0),face),0),c=texelFetch(elevations,ivec3(cell+ivec2(0,1),face),0),d=texelFetch(elevations,ivec3(cell+ivec2(1,1),face),0);
 a.x/=heightScale;b.x/=heightScale;c.x/=heightScale;d.x/=heightScale;return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
bool hit(vec2 pixel,out vec4 value,out float coverage,out float depth){
 if(mode==0){vec2 ray=(pixel-viewport*.5)/globeRadius;ray.y=-ray.y;float r=length(ray);coverage=interior==1?1.:clamp((1.-r)*globeRadius*backingSize.y/viewport.y+.5,0.,1.);if(coverage==0.)return false;depth=interior==1?1.:sqrt(max(0.,1.-dot(ray,ray)));vec3 p=normalize(cameraRight*ray.x*(interior==1?-1.:1.)+cameraUp*ray.y+cameraForward*depth),a=abs(p);int face;float normal,u,v;
 if(a.x>=a.y&&a.x>=a.z){face=p.x>=0.?0:1;normal=a.x;u=p.x>=0.?p.y:-p.y;v=p.z;}else if(a.y>=a.z){face=p.y>=0.?2:3;normal=a.y;u=p.y>=0.?-p.x:p.x;v=p.z;}else{face=p.z>=0.?4:5;normal=a.z;u=p.x;v=p.z>=0.?p.y:-p.y;}
 value=field(face,atan(vec2(u,v)/normal));return true;
 }
 vec2 grid=(pixel-viewport*.5)/faceSize+vec2(2.,1.5)-pan;ivec2 slot=ivec2(floor(grid));vec2 p=fract(grid);int face=-1;
 if(slot.y==1){if(slot.x==0)face=3;else if(slot.x==1)face=0;else if(slot.x==2)face=2;else if(slot.x==3)face=1;}else if(slot.x==1&&slot.y==0)face=4;else if(slot.x==1&&slot.y==2)face=5;
 if(face<0)return false;vec2 angles=face==4?(2.*p.yx-1.)*Q:face==5?(1.-2.*p.yx)*Q:vec2(2.*p.x-1.,1.-2.*p.y)*Q;value=field(face,angles);coverage=1.;depth=1.;return true;
}
vec3 palette(float h){
 if(h<=-1000./heightScale)return vec3(12.,45.,72.)/255.;
 if(h<=0.)return mix(vec3(37.,111.,143.),vec3(12.,45.,72.),clamp(-h*heightScale/1000.,0.,1.))/255.;
 if(h<=2000./heightScale)return mix(vec3(109.,149.,88.),vec3(183.,160.,121.),clamp(h*heightScale/2000.,0.,1.))/255.;
 if(h>=5000./heightScale)return vec3(235.,234.,224.)/255.;
 return mix(vec3(183.,160.,121.),vec3(235.,234.,224.),clamp((h*heightScale-2000.)/3000.,0.,1.))/255.;
}
vec3 color(vec4 v,float depth){vec3 rgb=palette(v.x);if(relief==1){if(v.x>0.){vec3 g=clamp(v.yzw*5.,vec3(-1e6),vec3(1e6));rgb*=clamp((1.-dot(g,vec3(-.6,-.6,.5291502622129182)))/length(vec4(1.,g)),.55,1.25);}if(mode==0&&interior==0)rgb*=.74+.26*depth;}return rgb;}
vec4 shade(vec2 pixel){vec4 value;float alpha,depth;if(!hit(pixel,value,alpha,depth))return vec4(0.);return vec4(color(value,depth)*alpha,alpha);}
${HOLLOW_SPHERE_GLSL}
void main(){vec2 pixel=vec2(gl_FragCoord.x/backingSize.x*viewport.x,(1.-gl_FragCoord.y/backingSize.y)*viewport.y);if(mode==0&&excavationEnabled==1){outColor=sphereCutRay(pixel);return;}vec4 v;float alpha,depth;if(!hit(pixel,v,alpha,depth)){outColor=vec4(0.);return;}
 vec2 step=viewport/backingSize*.25;
 // Four geographical rays only where coast coverage or silhouette requires it.
 if(abs(v.x)<fwidth(v.x)||alpha<1.)outColor=(shade(pixel+vec2(-step.x,-step.y))+shade(pixel+vec2(step.x,-step.y))+shade(pixel+vec2(-step.x,step.y))+shade(pixel+step))*.25;
 else outColor=vec4(color(v,depth)*alpha,alpha);
}`;

/** Persistent analytic reference-sphere presentation. Texture aliases are derived
 * views of shared canonical samples; camera movement uploads no terrain. */
export class SphereWebGLRenderer implements SurfaceRenderer<SphericalView> {
 private gl:WebGL2RenderingContext|null=null;
 private program?:WebGLProgram;private vao?:WebGLVertexArrayObject;private texture?:WebGLTexture;
 private readonly uniforms=new Map<string,WebGLUniformLocation>();private uploadedRevision=-1;private disposed=false;private scale=1;
 private readonly canvas:HTMLCanvasElement;private readonly field:SphericalElevationField;private readonly invalidate:()=>void;
 private excavation?:SphereExcavationDisplay;private oppositeTexture?:WebGLTexture;private oppositeSource?:SphericalElevationField;private oppositeRevision=-1;
 setExcavation(value?:SphereExcavationDisplay){this.excavation=value;}
 readonly statistics={renderer:'',reason:'',losses:0,recoveries:0,uploads:0,uploadBytes:0,textureBytes:0,presentations:0,resources:0};
 constructor(canvas:HTMLCanvasElement,field:SphericalElevationField,invalidate:()=>void){this.canvas=canvas;this.field=field;this.invalidate=invalidate;canvas.addEventListener('webglcontextlost',this.lost);canvas.addEventListener('webglcontextrestored',this.restored);this.initialize();}
 get available(){return!this.disposed&&!!this.program&&!!this.gl&&!this.gl.isContextLost();}
 private lost=(event:Event)=>{event.preventDefault();this.statistics.losses++;this.statistics.reason='Graphics context lost; bounded CPU display is active.';this.release(false);this.canvas.hidden=true;this.invalidate();};
 private restored=()=>{if(this.disposed)return;this.initialize();if(this.available)this.statistics.recoveries++;this.invalidate();};
 private initialize(){try{
  const gl=this.canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL2 unavailable; bounded CPU display is active.');this.gl=gl;
  const info=gl.getExtension('WEBGL_debug_renderer_info');this.statistics.renderer=String(gl.getParameter(info?.UNMASKED_RENDERER_WEBGL??gl.RENDERER));if(/swiftshader|llvmpipe|software|basic render/i.test(this.statistics.renderer))throw Error('Software graphics detected; bounded CPU display is active.');
  const shaders:WebGLShader[]=[];let program:WebGLProgram|null=null;
  try{for(const[type,source]of[[gl.VERTEX_SHADER,VERTEX],[gl.FRAGMENT_SHADER,SPHERE_FRAGMENT_SHADER]] as const){const shader=gl.createShader(type);if(!shader)throw Error('Shader allocation failed.');shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)??'Shader compilation failed.');}program=gl.createProgram();if(!program)throw Error('Program allocation failed.');for(const shader of shaders)gl.attachShader(program,shader);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)??'Shader linking failed.');this.program=program;}catch(e){if(program)gl.deleteProgram(program);throw e;}finally{for(const shader of shaders)gl.deleteShader(shader);}
  for(const name of['elevations','viewport','backingSize','pan','cameraRight','cameraUp','cameraForward','globeRadius','faceSize','heightScale','mode','relief','interior','oppositeElevations','excavationEnabled','cutterCount','selectedInside','innerRatio','eyePosition','primitiveA[0]','primitiveB[0]']){const location=gl.getUniformLocation(this.program!,name);if(location===null)throw Error(`Missing sphere display uniform ${name}`);this.uniforms.set(name,location);}
  const vao=gl.createVertexArray(),texture=gl.createTexture();if(!vao||!texture){if(vao)gl.deleteVertexArray(vao);if(texture)gl.deleteTexture(texture);throw Error('Sphere display allocation failed.');}this.vao=vao;this.texture=texture;
  gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);for(const name of[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D_ARRAY,name,gl.NEAREST);for(const name of[gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D_ARRAY,name,gl.CLAMP_TO_EDGE);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY,1,gl.RGBA32F,this.field.n+1,this.field.n+1,6);if(gl.getError()!==gl.NO_ERROR)throw Error('Sphere display texture allocation failed.');this.statistics.textureBytes=6*(this.field.n+1)**2*16;this.statistics.resources=3;this.statistics.reason='';
 }catch(e){this.statistics.reason=String(e);this.release(true);this.canvas.hidden=true;}}
 present(view:SphericalView,size:Viewport,appearance:SphereAppearance='relief'){
  if(!this.available||this.field.sourceRevision<0)throw Error('Sphere display is not ready.');const gl=this.gl!,at=performance.now(),dimensions=surfaceDisplayDimensions(size,devicePixelRatio||1),layout=sphericalLayout(view,size);
  if(this.canvas.width!==dimensions.width||this.canvas.height!==dimensions.height){this.canvas.width=dimensions.width;this.canvas.height=dimensions.height;}const resized=performance.now();gl.useProgram(this.program!);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.texture!);
  if(this.uploadedRevision!==this.field.sourceRevision){const regions=this.uploadedRevision===this.field.previousRevision?this.field.regions:CUBE_FACES.map(face=>({face,left:0,top:0,right:this.field.n,bottom:this.field.n}));gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.pixelStorei(gl.UNPACK_ROW_LENGTH,this.field.n+1);gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT,this.field.n+1);
   try{for(const r of regions){gl.pixelStorei(gl.UNPACK_SKIP_PIXELS,r.left);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,r.top);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,r.left,r.top,CUBE_FACES.indexOf(r.face),r.right-r.left+1,r.bottom-r.top+1,1,gl.RGBA,gl.FLOAT,this.field.data[r.face]);this.statistics.uploadBytes+=(r.right-r.left+1)*(r.bottom-r.top+1)*16;}}finally{gl.pixelStorei(gl.UNPACK_ROW_LENGTH,0);gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT,0);gl.pixelStorei(gl.UNPACK_SKIP_PIXELS,0);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,0);}
   if(gl.getError()!==gl.NO_ERROR)throw Error('Sphere elevation upload failed.');this.uploadedRevision=this.field.sourceRevision;this.scale=this.field.heightScale;this.statistics.uploads++;
  }
  let uploaded=performance.now();const u=(name:string)=>this.uniforms.get(name)!;gl.uniform1i(u('elevations'),0);gl.uniform2f(u('viewport'),size.width,size.height);gl.uniform2f(u('backingSize'),dimensions.width,dimensions.height);gl.uniform2f(u('pan'),view.pan.x,view.pan.y);gl.uniform3fv(u('cameraRight'),view.frame.right);gl.uniform3fv(u('cameraUp'),view.frame.up);gl.uniform3fv(u('cameraForward'),view.frame.forward);gl.uniform1f(u('globeRadius'),layout.radius);gl.uniform1f(u('faceSize'),layout.face);gl.uniform1f(u('heightScale'),this.scale);gl.uniform1i(u('mode'),view.mode==='globe'?0:1);gl.uniform1i(u('relief'),appearance==='relief'?1:0);gl.uniform1i(u('interior'),sphereCenterInspection(view)?1:0);
  const excavation=this.excavation,enabled=!!excavation&&excavation.model.primitives.length>0&&view.mode==='globe'&&(!view.interior||sphereCenterInspection(view));gl.uniform1i(u('excavationEnabled'),enabled?1:0);gl.uniform1i(u('oppositeElevations'),1);
  // Keep sampler units distinct even with subtraction disabled: WebGL validates
  // sampler bindings before dynamic shader branches execute.
  if(enabled){const opposite=excavation.opposite;if(opposite.sourceRevision<0)throw Error('Opposing spherical field is not prepared.');gl.activeTexture(gl.TEXTURE1);if(!this.oppositeTexture){this.oppositeTexture=gl.createTexture()??undefined;if(!this.oppositeTexture)throw Error('Opposing spherical texture allocation failed.');gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.oppositeTexture);for(const p of[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D_ARRAY,p,gl.NEAREST);for(const p of[gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D_ARRAY,p,gl.CLAMP_TO_EDGE);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,1,gl.RGBA32F,opposite.n+1,opposite.n+1,6);this.statistics.textureBytes+=6*(opposite.n+1)**2*16;this.statistics.resources++;}else gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.oppositeTexture);
   if(this.oppositeSource!==opposite||this.oppositeRevision!==opposite.sourceRevision){for(const[face,index]of CUBE_FACES.map((f,i)=>[f,i]as const))gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,index,opposite.n+1,opposite.n+1,1,gl.RGBA,gl.FLOAT,opposite.data[face]);this.oppositeSource=opposite;this.oppositeRevision=opposite.sourceRevision;this.statistics.uploads++;this.statistics.uploadBytes+=6*(opposite.n+1)**2*16;}
   const a=new Float32Array(48*4),b=new Float32Array(48*4);excavation.model.primitives.forEach((p,i)=>{a.set([...p.a,p.radius],i*4);b.set([...p.b,0],i*4);});gl.uniform4fv(u('primitiveA[0]'),a);gl.uniform4fv(u('primitiveB[0]'),b);gl.uniform1i(u('cutterCount'),excavation.model.primitives.length);gl.uniform1i(u('selectedInside'),excavation.role==='interior'?1:0);gl.uniform1f(u('innerRatio'),excavation.model.innerRatio);gl.uniform3fv(u('eyePosition'),(view.eyeMeters??[0,0,0]).map(v=>v/excavation.model.radiusMeters));
  }else{gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.oppositeTexture??this.texture!);}
  uploaded=performance.now();gl.bindVertexArray(this.vao!);gl.viewport(0,0,dimensions.width,dimensions.height);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);if(gl.isContextLost()||gl.getError()!==gl.NO_ERROR)throw Error('Graphics error during sphere presentation.');this.canvas.hidden=false;this.statistics.presentations++;return{revision:this.uploadedRevision,...dimensions,resizeMs:resized-at,uploadMs:uploaded-resized,submitMs:performance.now()-uploaded};
 }
 fail(reason:unknown){this.statistics.reason=String(reason);this.release(true);this.canvas.hidden=true;}
 private release(remove:boolean){const gl=this.gl;if(gl&&remove){if(this.program)gl.deleteProgram(this.program);if(this.texture)gl.deleteTexture(this.texture);if(this.oppositeTexture)gl.deleteTexture(this.oppositeTexture);if(this.vao)gl.deleteVertexArray(this.vao);}this.program=undefined;this.texture=undefined;this.oppositeTexture=undefined;this.oppositeSource=undefined;this.oppositeRevision=-1;this.vao=undefined;this.uniforms.clear();this.uploadedRevision=-1;this.statistics.textureBytes=0;this.statistics.resources=0;}
 dispose(){this.disposed=true;this.canvas.removeEventListener('webglcontextlost',this.lost);this.canvas.removeEventListener('webglcontextrestored',this.restored);this.release(true);this.gl=null;this.canvas.width=0;}
}
