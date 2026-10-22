import { cylinderLayout, cylinderCenterInspection, type CylinderView, type CylinderViewport } from './cylindrical-view.ts';
import { CylinderDisplayCache } from './cylindrical-raster.ts';
import { surfaceDisplayDimensions, type SurfaceRenderer } from './surface-renderer.ts';
import { dot3 } from '../surfaces/cube-sphere.ts';
import { cylinderDisplayIndex, type CylinderAppearance } from './cylindrical-elevation.ts';

// Display tessellation only: sagitta <= 1-cos(pi/4096) radius units.
// These vertices are reusable reference geometry, never elevation samples.
export const CYLINDER_DISPLAY_SEGMENTS=4096;
const vertex=`#version 300 es
precision highp float;
precision highp int;
layout(location=0) in vec4 point;
uniform vec3 cameraRight,cameraUp,cameraForward,inspectionEye;
uniform vec2 viewport,translation;
uniform float scale,depthExtent;
uniform int mode;
flat out int region;
void main(){region=int(point.w);if(mode==2){vec3 q=point.xyz-inspectionEye;float z=dot(q,cameraForward),near=.00001,far=depthExtent;gl_Position=vec4(vec2(-dot(q,cameraRight),dot(q,cameraUp))*scale*2./viewport,(far+near)/(far-near)*z-2.*far*near/(far-near),z);return;}vec2 p=mode==0?vec2(dot(point.xyz,cameraRight),dot(point.xyz,cameraUp))-translation:point.xy+translation;gl_Position=vec4(p*scale*2./viewport,mode==0?-dot(point.xyz,cameraForward)/depthExtent:0.,1.);}`;
export const CYLINDER_FRAGMENT_SHADER=`#version 300 es
precision highp float;
precision highp int;
uniform sampler2D sideElevations,startElevations,endElevations;
uniform vec3 cameraForward;
uniform vec3 cameraRight,cameraUp,inspectionEye;
uniform vec2 viewport,translation,backingSize;
uniform float scale;
uniform float h,phase,radiusMeters,lengthMeters,seaLevel,heightScale;
uniform int mode,relief;
flat in int region;
out vec4 outColor;
const float PI=3.141592653589793;
float sampleAt(sampler2D data,int row,int col){ivec2 s=textureSize(data,0);return texelFetch(data,ivec2((col%s.x+s.x)%s.x,clamp(row,0,s.y-1)),0).r;}
float tangent(float a,float b,float c){float u=b-a,v=c-b;return ((u>0.&&v>0.)||(u<0.&&v<0.))?2.*u*(v/(u+v)):0.;}
float curve(vec4 v,float t){float m=tangent(v.x,v.y,v.z),n=tangent(v.y,v.z,v.w),q=3.*(v.z-v.y)-2.*m-n,r=2.*(v.y-v.z)+m+n;return v.y+t*(m+t*(q+t*r));}
vec4 rowAt(sampler2D data,int row,int col){return vec4(sampleAt(data,row,col-1),sampleAt(data,row,col),sampleAt(data,row,col+1),sampleAt(data,row,col+2));}
vec2 capGradient(sampler2D data,float angular,float vertical,float row,float col,vec2 s){
 if(row==0.)return vec2(sampleAt(data,1,0)-sampleAt(data,1,int(s.x)/2),sampleAt(data,1,int(s.x)/4)-sampleAt(data,1,int(s.x)*3/4))*(s.y-1.)/(2.*radiusMeters);
 float theta=col/s.x*2.*PI,dr=vertical*(s.y-1.)/radiusMeters,dt=angular*(s.y-1.)/row;
 return vec2(cos(theta)*dr-sin(theta)*dt,sin(theta)*dr+cos(theta)*dt);
}
vec4 gradients(sampler2D data,vec4 prev,vec4 here,vec4 next,int row,int col,vec2 s,bool side){
 vec2 angular=vec2(here.z-here.x,here.w-here.y)*s.x/(4.*PI*radiusMeters),vertical=(next.yz-prev.yz)/((row==0||row==int(s.y)-1)?1.:2.);
 if(side)return vec4(angular.x,vertical.x*(s.y-1.)/lengthMeters,angular.y,vertical.y*(s.y-1.)/lengthMeters);
 return vec4(capGradient(data,angular.x,vertical.x,float(row),float(col),s),capGradient(data,angular.y,vertical.y,float(row),float(col+1),s));
}
vec3 field(sampler2D data,float theta,float radial,float z,bool side){
 vec2 s=vec2(textureSize(data,0));
 float column=mod(theta/(2.*PI)*s.x,s.x),row=clamp(side?(z+h)/(2.*h)*(s.y-1.):radial*(s.y-1.),0.,s.y-1.);
 int col=int(floor(column)),r=int(min(floor(row),s.y-2.));float x=fract(column),y=row-float(r);
 vec4 q0=rowAt(data,r-1,col),q1=rowAt(data,r,col),q2=rowAt(data,r+1,col),q3=rowAt(data,r+2,col);
 float height=curve(vec4(curve(q0,x),curve(q1,x),curve(q2,x),curve(q3,x)),y);
 if(relief==0||height<=seaLevel/heightScale)return vec3(height,0.,0.);
 vec4 g0=gradients(data,q0,q1,q2,r,col,s,side),g1=gradients(data,q1,q2,q3,r+1,col,s,side);
 vec2 gradient=mix(mix(g0.xy,g0.zw,x),mix(g1.xy,g1.zw,x),y);
 return vec3(height,gradient);
}
vec3 elevationColor(float normalized){
 float relative=clamp(normalized,-1.,1.)*heightScale;
 vec3 water=mix(vec3(37.,111.,143.),vec3(12.,45.,72.),clamp(-relative/1000.,0.,1.));
 vec3 land=relative<=2000.?mix(vec3(109.,149.,88.),vec3(183.,160.,121.),clamp(relative/2000.,0.,1.)):mix(vec3(183.,160.,121.),vec3(235.,234.,224.),clamp((relative-2000.)/3000.,0.,1.));
 return (normalized>0.?land:water)/255.;
}
vec3 surfaceField(vec3 p){
 float theta,r,z;
 if(mode==0||mode==2){r=length(p.xy);theta=r==0.?0.:atan(p.y,p.x);z=p.z;}
 else if(region==0){theta=phase+p.x;r=1.;z=p.y;}
 else {float sign=region==1?1.:-1.,center=region==1?-h-1.:h+1.;vec2 local=vec2(p.x,p.y-center);r=length(local);theta=r==0.?0.:phase+atan(local.x,sign*local.y);z=region==1?-h:h;}
 return region==0?field(sideElevations,theta,r,z,true):region==1?field(startElevations,theta,r,z,false):field(endElevations,-theta,r,z,false);
}
vec3 colorAt(vec3 value){
 vec3 rgb=elevationColor(value.x-seaLevel/heightScale);
 if(relief==1&&value.x>seaLevel/heightScale){vec2 g=clamp(value.yz,vec2(-1e6/heightScale),vec2(1e6/heightScale))*heightScale*5.;float light=clamp((1.+.6*g.x-.6*g.y)/length(vec3(g,1.)),.55,1.25);rgb*=light;}
 return rgb;
}
vec3 referenceAt(vec2 fragment){
 // Recover the analytic reference point. Thin display triangles must not
 // determine geographical coordinates through imprecise varyings/derivatives.
 vec2 screen=(fragment/backingSize*viewport-.5*viewport)/scale;
 if(mode==1)return vec3(screen-translation,0.);
 if(mode==2){vec3 ray=normalize(-cameraRight*screen.x+cameraUp*screen.y+cameraForward);if(region!=0){float z=region==1?-h:h;return inspectionEye+ray*((z-inspectionEye.z)/ray.z);}float a=dot(ray.xy,ray.xy),b=dot(inspectionEye.xy,ray.xy),c=dot(inspectionEye.xy,inspectionEye.xy)-1.,root=sqrt(max(0.,b*b-a*c));float distance=b>=0.?-c/max(b+root,1e-20):(-b+root)/max(a,1e-20);return inspectionEye+ray*distance;}
 vec3 origin=cameraRight*(screen.x+translation.x)+cameraUp*(screen.y+translation.y);
 if(region!=0){float z=region==1?-h:h;return origin+cameraForward*((z-origin.z)/cameraForward.z);}
 float a=dot(cameraForward.xy,cameraForward.xy),b=dot(origin.xy,cameraForward.xy),c=dot(origin.xy,origin.xy)-1.;
 return origin+cameraForward*((-b+sqrt(max(0.,b*b-a*c)))/max(a,1e-20));
}
void main(){
 vec3 p=referenceAt(gl_FragCoord.xy),value=surfaceField(p),rgb=colorAt(value);
 // Actual subpixel elevation classifications, never a blur of palette texels.
 // Derivatives only bound the work; four quadrature rays determine coverage.
 if(abs(value.x-seaLevel/heightScale)<fwidth(value.x)){
  vec3 a=surfaceField(referenceAt(gl_FragCoord.xy+vec2(-.25,-.25))),b=surfaceField(referenceAt(gl_FragCoord.xy+vec2(.25,-.25))),c=surfaceField(referenceAt(gl_FragCoord.xy+vec2(-.25,.25))),d=surfaceField(referenceAt(gl_FragCoord.xy+vec2(.25,.25)));
  // A conservative derivative bound may include a wholly land/water pixel.
  // Filter only actual class coverage; keep ordinary ramps/relief unblurred.
  if(any(notEqual(greaterThan(vec4(a.x,b.x,c.x,d.x),vec4(seaLevel/heightScale)),bvec4(value.x>seaLevel/heightScale))))rgb=(colorAt(a)+colorAt(b)+colorAt(c)+colorAt(d))*.25;
 }
 float theta=region==0?(mode==0||mode==2?atan(p.y,p.x):phase+p.x):0.;
 float facing=region==0?dot(vec2(cos(theta),sin(theta)),cameraForward.xy):(region==2?1.:-1.)*cameraForward.z;
 outColor=vec4(rgb*(mode==1||mode==2?1.:.74+.26*max(0.,facing)),1.);
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
 private uniforms=new Map<string,WebGLUniformLocation>();private uploadedRevision=-1;private disposed=false;private heightScale=1;
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
  this.uniforms.clear();for(const name of ['sideElevations','startElevations','endElevations','viewport','translation','backingSize','cameraRight','cameraUp','cameraForward','inspectionEye','scale','depthExtent','h','phase','mode','radiusMeters','lengthMeters','seaLevel','heightScale','relief']){const u=gl.getUniformLocation(this.program!,name);if(u===null)throw Error(`Missing graphics uniform ${name}`);this.uniforms.set(name,u);}
  // R32F is fetched explicitly. Float-linear extensions are not required.
  for(let i=0;i<3;i++){const texture=gl.createTexture();if(!texture)throw Error('Texture allocation failed');this.textures.push(texture);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
  const h=this.cache.terrain.metadata.geometry.lengthMeters/this.cache.terrain.metadata.geometry.radiusMeters/2;
  for(const map of [false,true]){const vao=gl.createVertexArray(),buffer=gl.createBuffer();if(!vao||!buffer){if(vao)gl.deleteVertexArray(vao);if(buffer)gl.deleteBuffer(buffer);throw Error('Mesh allocation failed');}const data=vertices(h,map);this.meshes.push({vao,buffer,count:data.length/4});this.statistics.geometryBytes+=data.byteLength;gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,16,0);}
  if(gl.getError()!==gl.NO_ERROR)throw Error('Graphics resource allocation failed; using CPU fallback.');
  this.statistics.antialias=!!gl.getContextAttributes()?.antialias;this.statistics.reason='';
 }catch(e){this.statistics.reason=String(e);this.release(true);this.canvas.hidden=true;this.canvas.width=0;}}
 present(view:CylinderView,size:CylinderViewport,appearance:CylinderAppearance='elevation'){
  if(!this.available)throw Error('Graphics renderer unavailable');
  const gl=this.gl!,at=performance.now(),dimensions=surfaceDisplayDimensions(size,devicePixelRatio||1),l=cylinderLayout(this.cache.terrain.geometry,view,size);
  if(this.canvas.width!==dimensions.width||this.canvas.height!==dimensions.height){this.canvas.width=dimensions.width;this.canvas.height=dimensions.height;}
  const resized=performance.now();gl.useProgram(this.program!);
  const res=this.cache.terrain.metadata.representation.resolution,a=res.angularSamples,z=res.axialCells,p=res.radialCells;
  if(this.uploadedRevision!==this.cache.sourceRevision){
   const elevations=this.cache.elevationSnapshot();let bytes=0;
   this.heightScale=1;for(const value of elevations)this.heightScale=Math.max(this.heightScale,Math.abs(value));
   for(let region=0;region<3;region++){const rows=(region===0?z:p)+1,data=new Float32Array(a*rows);
    for(let row=0;row<rows;row++)for(let col=0;col<a;col++){
     data[row*a+col]=elevations[cylinderDisplayIndex(this.cache.terrain,region===0?'side':region===1?'cap-start':'cap-end',row,col)]!/this.heightScale;
    }
    gl.activeTexture(gl.TEXTURE0+region);gl.bindTexture(gl.TEXTURE_2D,this.textures[region]!);gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,a,rows,0,gl.RED,gl.FLOAT,data);bytes+=data.byteLength;
   }
   if(gl.getError()!==gl.NO_ERROR)throw Error('Graphics elevation upload failed; using CPU fallback.');
   this.uploadedRevision=this.cache.sourceRevision;this.statistics.textureBytes=bytes;this.statistics.uploads++;
  }
  const uploaded=performance.now(),u=(name:string)=>this.uniforms.get(name)!;
  ['sideElevations','startElevations','endElevations'].forEach((name,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,this.textures[i]!);gl.uniform1i(u(name),i);});
  gl.uniform1f(u('radiusMeters'),this.cache.terrain.metadata.geometry.radiusMeters);gl.uniform1f(u('lengthMeters'),this.cache.terrain.metadata.geometry.lengthMeters);gl.uniform1f(u('seaLevel'),this.cache.terrain.metadata.seaLevel);gl.uniform1f(u('heightScale'),this.heightScale);gl.uniform1i(u('relief'),appearance==='relief'?1:0);
  gl.uniform2f(u('viewport'),size.width,size.height);gl.uniform2f(u('translation'),view.mode==='map'?view.pan.x:dot3(view.target,view.frame.right),view.mode==='map'?view.pan.y:dot3(view.target,view.frame.up));
  gl.uniform2f(u('backingSize'),dimensions.width,dimensions.height);
  gl.uniform3fv(u('inspectionEye'),(view.eyeMeters??[0,0,0]).map(v=>v/this.cache.terrain.metadata.geometry.radiusMeters));gl.uniform3fv(u('cameraRight'),view.frame.right);gl.uniform3fv(u('cameraUp'),view.frame.up);gl.uniform3fv(u('cameraForward'),view.frame.forward);gl.uniform1f(u('scale'),l.scale);gl.uniform1f(u('h'),l.h);gl.uniform1f(u('phase'),view.phase);gl.uniform1f(u('depthExtent'),cylinderCenterInspection(view)?4*l.h+4:Math.hypot(view.frame.forward[0],view.frame.forward[1])+l.h*Math.abs(view.frame.forward[2])+.01);gl.uniform1i(u('mode'),cylinderCenterInspection(view)?2:view.mode==='map'?1:0);
  const mesh=this.meshes[view.mode==='physical'?0:1]!;gl.bindVertexArray(mesh.vao);gl.viewport(0,0,dimensions.width,dimensions.height);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  if(gl.isContextLost())throw Error('Graphics context lost during presentation');this.canvas.hidden=false;this.statistics.presentations++;
  return{revision:this.uploadedRevision,...dimensions,resizeMs:resized-at,uploadMs:uploaded-resized,submitMs:performance.now()-uploaded};
 }
 fail(reason:unknown){this.statistics.reason=String(reason);this.release(true);this.canvas.hidden=true;this.canvas.width=0;}
 private release(remove:boolean){const gl=this.gl;if(gl&&remove){for(const t of this.textures)gl.deleteTexture(t);for(const m of this.meshes){gl.deleteVertexArray(m.vao);gl.deleteBuffer(m.buffer);}if(this.program)gl.deleteProgram(this.program);}this.textures=[];this.meshes=[];this.program=undefined;this.uniforms.clear();this.uploadedRevision=-1;this.statistics.textureBytes=0;this.statistics.geometryBytes=0;}
 dispose(){this.disposed=true;this.canvas.removeEventListener('webglcontextlost',this.lost);this.canvas.removeEventListener('webglcontextrestored',this.restored);this.release(true);this.gl=null;this.canvas.width=0;}
}
