import {RoundedCurrentFrame} from './rounded-crescent-current-frame.ts';
import {roundedFrontCoverage} from './rounded-crescent-coverage.ts';
import {roundedRepairCoordinates} from './rounded-crescent-repair.ts';
import {roundedFieldClasses} from './rounded-crescent-field-classes.ts';
import {ROUNDED_CRESCENT_GLSL} from './rounded-crescent-glsl.ts';
import {roundedRayStretch,roundedRayCurvature} from '../surfaces/rounded-crescent-ray.ts';
import {CRESCENT_CUT_GLOBE_GLSL} from './crescent-cut-globe-glsl.ts';
import {cutDisplayDimensions} from './raster-quality.ts';
import {sphereCenterInspection} from './spherical-view.ts';
import { CUBE_FACES } from '../surfaces/cube-sphere.ts';
import { type SurfaceRenderer } from './surface-renderer.ts';
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
${CRESCENT_CUT_GLOBE_GLSL}
${HOLLOW_SPHERE_GLSL}
void main(){vec2 pixel=vec2(gl_FragCoord.x/backingSize.x*viewport.x,(1.-gl_FragCoord.y/backingSize.y)*viewport.y);if(foldEnabled==1){pixel=vec2(gl_FragCoord.x,backingSize.y-gl_FragCoord.y)*(viewport/backingSize);outColor=foldPixel(pixel);return;}if(mode==0&&excavationEnabled==1&&sphereCutAffects(pixel)){outColor=sphereCutRay(pixel);return;}vec4 v;float alpha,depth;if(!hit(pixel,v,alpha,depth)){outColor=vec4(0.);return;}
 vec2 step=viewport/backingSize*.25;
 // Four geographical rays only where coast coverage or silhouette requires it.
 if(abs(v.x)<fwidth(v.x)||alpha<1.)outColor=(shade(pixel+vec2(-step.x,-step.y))+shade(pixel+vec2(step.x,-step.y))+shade(pixel+vec2(-step.x,step.y))+shade(pixel+step))*.25;
 else outColor=vec4(color(v,depth)*alpha,alpha);
}`;

/** Persistent analytic reference-sphere presentation. Texture aliases are derived
 * views of shared canonical samples; camera movement uploads no terrain. */
export const ROUNDED_CRESCENT_FRAGMENT_SHADER=SPHERE_FRAGMENT_SHADER.replace(/void main\(\)\{[\s\S]*$/,ROUNDED_CRESCENT_GLSL+'\nvoid main(){vec2 pixel=vec2(gl_FragCoord.x,backingSize.y-gl_FragCoord.y)*(viewport/backingSize);vec4 value=rcPixel(pixel);outColor=rcProbeMode==1?vec4(rcUncertain?1.:0.,0.,0.,1.):value;}');

export class SphereWebGLRenderer implements SurfaceRenderer<SphericalView> {
 private gl:WebGL2RenderingContext|null=null;
 private program?:WebGLProgram;private vao?:WebGLVertexArrayObject;private texture?:WebGLTexture;
 private readonly uniforms=new Map<string,WebGLUniformLocation|null>();private uploadedRevision=-1;private disposed=false;private scale=1;
 private readonly canvas:HTMLCanvasElement;private readonly field:SphericalElevationField;private readonly invalidate:()=>void;
 private excavation?:SphereExcavationDisplay;private oppositeTexture?:WebGLTexture;private oppositeSource?:SphericalElevationField;private oppositeRevision=-1;
 setExcavation(value?:SphereExcavationDisplay){this.excavation=value;}
 readonly statistics={renderer:'',reason:'',losses:0,recoveries:0,uploads:0,uploadBytes:0,textureBytes:0,presentations:0,resources:0};
 private coverageTexture?:WebGLTexture;private coverageKey='';private coverageBytes=0;
 private classSummary?:ReturnType<typeof roundedFieldClasses>;
 private classTexture?:WebGLTexture;private classRevision=-1;private repairTexture?:WebGLTexture;private repairBytes=0;
 readonly roundedStatistics={geometryProbes:0,repairPixels:0,maxRepairPixels:0,probeMaxMs:0,lastProbeMs:0,probeReadbackBytes:0,frameBytes:0,partialFrames:0,fullFrames:0,lastDrawPixels:0};
 private currentFrame?:RoundedCurrentFrame;
 private readonly roundedProgram:boolean;
 constructor(canvas:HTMLCanvasElement,field:SphericalElevationField,invalidate:()=>void,roundedProgram=false){this.roundedProgram=roundedProgram;this.canvas=canvas;this.field=field;this.invalidate=invalidate;canvas.addEventListener('webglcontextlost',this.lost);canvas.addEventListener('webglcontextrestored',this.restored);this.initialize();}
 get available(){return!this.disposed&&!!this.program&&!!this.gl&&!this.gl.isContextLost();}
 private lost=(event:Event)=>{event.preventDefault();this.statistics.losses++;this.statistics.reason='Graphics context lost; bounded CPU display is active.';this.release(false);this.canvas.hidden=true;this.invalidate();};
 private restored=()=>{if(this.disposed)return;this.initialize();if(this.available)this.statistics.recoveries++;this.invalidate();};
 private initialize(){try{
  const gl=this.canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL2 unavailable; bounded CPU display is active.');this.gl=gl;
  const info=gl.getExtension('WEBGL_debug_renderer_info');this.statistics.renderer=String(gl.getParameter(info?.UNMASKED_RENDERER_WEBGL??gl.RENDERER));if(/swiftshader|llvmpipe|software|basic render/i.test(this.statistics.renderer))throw Error('Software graphics detected; bounded CPU display is active.');
  const shaders:WebGLShader[]=[];let program:WebGLProgram|null=null;
  try{for(const[type,source]of[[gl.VERTEX_SHADER,VERTEX],[gl.FRAGMENT_SHADER,this.roundedProgram?ROUNDED_CRESCENT_FRAGMENT_SHADER:SPHERE_FRAGMENT_SHADER]] as const){const shader=gl.createShader(type);if(!shader)throw Error('Shader allocation failed.');shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader)??'Shader compilation failed.');}program=gl.createProgram();if(!program)throw Error('Program allocation failed.');for(const shader of shaders)gl.attachShader(program,shader);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)??'Shader linking failed.');this.program=program;}catch(e){if(program)gl.deleteProgram(program);throw e;}finally{for(const shader of shaders)gl.deleteShader(shader);}
  for(const name of[...(this.roundedProgram?['rcShape','rcProfile','rcCoverage','rcClasses','rcCurvature','rcRepair','rcProbeMode']:[]),'foldEnabled','foldAxis','foldSeparation','foldRegion','elevations','viewport','backingSize','pan','cameraRight','cameraUp','cameraForward','globeRadius','faceSize','heightScale','mode','relief','interior','oppositeElevations','excavationEnabled','cutterCount','selectedInside','innerRatio','eyePosition','primitiveA[0]','primitiveB[0]']){const location=gl.getUniformLocation(this.program!,name);if(location===null&&(!this.roundedProgram||name.startsWith('rc')))throw Error(`Missing sphere display uniform ${name}`);this.uniforms.set(name,location);}
  const vao=gl.createVertexArray(),texture=gl.createTexture();if(!vao||!texture){if(vao)gl.deleteVertexArray(vao);if(texture)gl.deleteTexture(texture);throw Error('Sphere display allocation failed.');}this.vao=vao;this.texture=texture;
  gl.bindTexture(gl.TEXTURE_2D_ARRAY,texture);for(const name of[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D_ARRAY,name,gl.NEAREST);for(const name of[gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D_ARRAY,name,gl.CLAMP_TO_EDGE);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY,1,gl.RGBA32F,this.field.n+1,this.field.n+1,6);if(gl.getError()!==gl.NO_ERROR)throw Error('Sphere display texture allocation failed.');this.statistics.textureBytes=6*(this.field.n+1)**2*16;this.statistics.resources=3;this.statistics.reason='';
 }catch(e){this.statistics.reason=String(e);this.release(true);this.canvas.hidden=true;}}
 present(view:SphericalView,size:Viewport,appearance:SphereAppearance='relief'){
  if(!this.available||this.field.sourceRevision<0)throw Error('Sphere display is not ready.');const gl=this.gl!,at=performance.now(),dimensions=cutDisplayDimensions(size,devicePixelRatio||1,!!this.excavation&&this.excavation.model.primitives.length>0&&view.mode==='globe'&&(!view.interior||sphereCenterInspection(view))),layout=sphericalLayout(view,size);
  if(this.canvas.width!==dimensions.width||this.canvas.height!==dimensions.height){this.canvas.width=dimensions.width;this.canvas.height=dimensions.height;}const resized=performance.now();gl.useProgram(this.program!);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.texture!);
  if(this.uploadedRevision!==this.field.sourceRevision){const regions=(this.roundedProgram?this.field.regionsSince(this.uploadedRevision):undefined)??(this.uploadedRevision===this.field.previousRevision?this.field.regions:CUBE_FACES.map(face=>({face,left:0,top:0,right:this.field.n,bottom:this.field.n})));gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);gl.pixelStorei(gl.UNPACK_ROW_LENGTH,this.field.n+1);gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT,this.field.n+1);
   try{for(const r of regions){gl.pixelStorei(gl.UNPACK_SKIP_PIXELS,r.left);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,r.top);gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,r.left,r.top,CUBE_FACES.indexOf(r.face),r.right-r.left+1,r.bottom-r.top+1,1,gl.RGBA,gl.FLOAT,this.field.data[r.face]);this.statistics.uploadBytes+=(r.right-r.left+1)*(r.bottom-r.top+1)*16;}}finally{gl.pixelStorei(gl.UNPACK_ROW_LENGTH,0);gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT,0);gl.pixelStorei(gl.UNPACK_SKIP_PIXELS,0);gl.pixelStorei(gl.UNPACK_SKIP_ROWS,0);}
   if(gl.getError()!==gl.NO_ERROR)throw Error('Sphere elevation upload failed.');this.uploadedRevision=this.field.sourceRevision;this.scale=this.roundedProgram?1:this.field.heightScale;this.statistics.uploads++;
  }
  let uploaded=performance.now();const u=(name:string)=>this.uniforms.get(name)??null;gl.uniform1i(u('elevations'),0);gl.uniform2f(u('viewport'),size.width,size.height);gl.uniform2f(u('backingSize'),dimensions.width,dimensions.height);gl.uniform2f(u('pan'),view.pan.x,view.pan.y);gl.uniform3fv(u('cameraRight'),view.frame.right);gl.uniform3fv(u('cameraUp'),view.frame.up);gl.uniform3fv(u('cameraForward'),view.frame.forward);gl.uniform1f(u('globeRadius'),layout.radius);gl.uniform1f(u('faceSize'),layout.face);gl.uniform1f(u('heightScale'),this.scale);gl.uniform1i(u('mode'),view.mode==='globe'?0:1);gl.uniform1i(u('relief'),appearance==='relief'?1:0);gl.uniform1i(u('interior'),sphereCenterInspection(view)?1:0);
  const rc=view.roundedGlobe;if(this.roundedProgram){if(!rc)throw Error('Rounded Crescent renderer requires its physical geometry.');gl.uniform1f(u('rcCurvature'),roundedRayCurvature(rc));gl.uniform4f(u('rcShape'),rc?.bendRadius??1,rc?.bodyRadius??.4,rc?.bodyDepth??.4,rc?.halfSpan??2);gl.uniform4f(u('rcProfile'),rc?.tipTaper??0,rc?.tipRoundness??0,rc?rc.bendRadius+rc.bodyRadius:1,rc?roundedRayStretch(rc):.1);}
  gl.uniform1i(u('foldEnabled'),view.cutGlobe?1:0);gl.uniform3fv(u('foldAxis'),view.cutGlobe?.axis??[1,0,0]);gl.uniform1f(u('foldSeparation'),view.cutGlobe?.separationRatio??1);gl.uniform1i(u('foldRegion'),view.mapRegion==='retained'?1:view.mapRegion==='cut'?2:0);
  if(this.roundedProgram){
   if(!this.coverageTexture){this.coverageTexture=gl.createTexture()??undefined;if(!this.coverageTexture)throw Error('Rounded geometry lookup allocation failed.');gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.coverageTexture);for(const p of[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));this.coverageBytes=4;this.statistics.textureBytes+=4;this.statistics.resources++;}
   if(!this.repairTexture){this.repairTexture=gl.createTexture()??undefined;if(!this.repairTexture)throw Error('Rounded precise-ray allocation failed.');gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,this.repairTexture);for(const p of[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.NEAREST);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,1,1,0,gl.RGBA,gl.FLOAT,new Float32Array(4));this.repairBytes=16;this.statistics.textureBytes+=16;this.statistics.resources++;}
   gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.coverageTexture);gl.uniform1i(u('rcCoverage'),2);gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,this.repairTexture);gl.uniform1i(u('rcRepair'),4);gl.uniform1i(u('rcProbeMode'),0);
   const key=JSON.stringify([view,size,dimensions]);if(this.coverageKey!==key){const at=performance.now(),front=view.mode==='globe'&&Math.hypot(view.frame.forward[0],view.frame.forward[1])<1e-12;let lookup:Uint8Array,data:Float32Array|undefined,rw=1,rh=1;
    if(front){const coverage=roundedFrontCoverage(view,size,dimensions);lookup=new Uint8Array(coverage.width*coverage.height*4);for(let i=0;i<coverage.data.length;i++)lookup[i*4+3]=coverage.data[i]!;this.roundedStatistics.repairPixels=coverage.repairPixels;}
    else{const framebuffer=gl.createFramebuffer(),probe=gl.createTexture();if(!framebuffer||!probe)throw Error('Rounded geometry probe allocation failed.');try{gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,probe);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,dimensions.width,dimensions.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,probe,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Rounded geometry probe framebuffer unavailable.');gl.uniform1i(u('rcProbeMode'),1);gl.bindVertexArray(this.vao!);gl.viewport(0,0,dimensions.width,dimensions.height);gl.disable(gl.BLEND);gl.drawArrays(gl.TRIANGLES,0,3);const flags=new Uint8Array(dimensions.width*dimensions.height*4);gl.readPixels(0,0,dimensions.width,dimensions.height,gl.RGBA,gl.UNSIGNED_BYTE,flags);if(gl.getError()!==gl.NO_ERROR)throw Error('Rounded geometry probe failed.');const repair=roundedRepairCoordinates(view,size,dimensions,flags);lookup=repair.lookup;data=repair.data;rw=repair.width;rh=repair.rows;this.roundedStatistics.geometryProbes++;this.roundedStatistics.probeReadbackBytes=flags.byteLength;this.roundedStatistics.repairPixels=repair.count;}finally{gl.uniform1i(u('rcProbeMode'),0);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteFramebuffer(framebuffer);gl.deleteTexture(probe);}}
    gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.coverageTexture);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,dimensions.width,dimensions.height,0,gl.RGBA,gl.UNSIGNED_BYTE,lookup);this.statistics.textureBytes+=lookup.byteLength-this.coverageBytes;this.coverageBytes=lookup.byteLength;
    if(data){gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,this.repairTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,rw,rh,0,gl.RGBA,gl.FLOAT,data);this.statistics.textureBytes+=data.byteLength-this.repairBytes;this.repairBytes=data.byteLength;}
    this.roundedStatistics.maxRepairPixels=Math.max(this.roundedStatistics.maxRepairPixels,this.roundedStatistics.repairPixels);this.roundedStatistics.lastProbeMs=performance.now()-at;this.roundedStatistics.probeMaxMs=Math.max(this.roundedStatistics.probeMaxMs,this.roundedStatistics.lastProbeMs);this.coverageKey=key;
   }
  }
  if(this.roundedProgram){gl.activeTexture(gl.TEXTURE3);if(!this.classTexture){this.classTexture=gl.createTexture()??undefined;if(!this.classTexture)throw Error('Rounded Crescent sign-summary allocation failed.');this.statistics.resources++;gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.classTexture);for(const p of[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D_ARRAY,p,gl.NEAREST);for(const p of[gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D_ARRAY,p,gl.CLAMP_TO_EDGE);this.statistics.textureBytes+=6*Math.ceil(this.field.n/8)**2;}else gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.classTexture);if(this.classRevision!==this.field.sourceRevision){const summary=roundedFieldClasses(this.field,this.classSummary?this.field.regionsSince(this.classRevision):undefined,this.classSummary);this.classSummary=summary;gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.R8,summary.width,summary.width,6,0,gl.RED,gl.UNSIGNED_BYTE,summary.data);this.classRevision=this.field.sourceRevision;this.statistics.uploadBytes+=summary.data.byteLength;}gl.uniform1i(u('rcClasses'),3);}
  const excavation=this.excavation,enabled=!!excavation&&excavation.model.primitives.length>0&&view.mode==='globe'&&(!view.interior||sphereCenterInspection(view));gl.uniform1i(u('excavationEnabled'),enabled?1:0);gl.uniform1i(u('oppositeElevations'),1);
  // Keep sampler units distinct even with subtraction disabled: WebGL validates
  // sampler bindings before dynamic shader branches execute.
  if(enabled){const opposite=excavation.opposite;if(opposite.sourceRevision<0)throw Error('Opposing spherical field is not prepared.');gl.activeTexture(gl.TEXTURE1);if(!this.oppositeTexture){this.oppositeTexture=gl.createTexture()??undefined;if(!this.oppositeTexture)throw Error('Opposing spherical texture allocation failed.');gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.oppositeTexture);for(const p of[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D_ARRAY,p,gl.NEAREST);for(const p of[gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D_ARRAY,p,gl.CLAMP_TO_EDGE);gl.texStorage3D(gl.TEXTURE_2D_ARRAY,1,gl.RGBA32F,opposite.n+1,opposite.n+1,6);this.statistics.textureBytes+=6*(opposite.n+1)**2*16;this.statistics.resources++;}else gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.oppositeTexture);
   if(this.oppositeSource!==opposite||this.oppositeRevision!==opposite.sourceRevision){for(const[face,index]of CUBE_FACES.map((f,i)=>[f,i]as const))gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,index,opposite.n+1,opposite.n+1,1,gl.RGBA,gl.FLOAT,opposite.data[face]);this.oppositeSource=opposite;this.oppositeRevision=opposite.sourceRevision;this.statistics.uploads++;this.statistics.uploadBytes+=6*(opposite.n+1)**2*16;}
   const a=new Float32Array(48*4),b=new Float32Array(48*4);excavation.model.primitives.forEach((p,i)=>{a.set([...p.a,p.radius],i*4);b.set([...p.b,0],i*4);});gl.uniform4fv(u('primitiveA[0]'),a);gl.uniform4fv(u('primitiveB[0]'),b);gl.uniform1i(u('cutterCount'),excavation.model.primitives.length);gl.uniform1i(u('selectedInside'),excavation.role==='interior'?1:0);gl.uniform1f(u('innerRatio'),excavation.model.innerRatio);gl.uniform3fv(u('eyePosition'),(view.eyeMeters??[0,0,0]).map(v=>v/excavation.model.radiusMeters));
  }else{gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D_ARRAY,this.oppositeTexture??this.texture!);}
  uploaded=performance.now();gl.bindVertexArray(this.vao!);gl.viewport(0,0,dimensions.width,dimensions.height);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);const draw=()=>{gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);};if(this.roundedProgram){if(!this.currentFrame){this.currentFrame=new RoundedCurrentFrame(gl);this.statistics.resources+=2;}const previousBytes=this.currentFrame.statistics.bytes;this.currentFrame.present(this.field,view,size,dimensions,appearance,draw);this.statistics.textureBytes+=this.currentFrame.statistics.bytes-previousBytes;const f=this.currentFrame.statistics;Object.assign(this.roundedStatistics,{frameBytes:f.bytes,partialFrames:f.partialFrames,fullFrames:f.fullFrames,lastDrawPixels:f.lastDrawPixels});}else draw();if(gl.isContextLost()||gl.getError()!==gl.NO_ERROR)throw Error('Graphics error during sphere presentation.');this.canvas.hidden=false;this.statistics.presentations++;return{revision:this.uploadedRevision,...dimensions,resizeMs:resized-at,uploadMs:uploaded-resized,submitMs:performance.now()-uploaded};
 }
 copyCurrentRoundedFrame(){if(!this.available||!this.currentFrame)throw Error('Rounded current frame unavailable.');this.currentFrame.copy();}
 fail(reason:unknown){this.statistics.reason=String(reason);this.release(true);this.canvas.hidden=true;}
 private release(remove:boolean){this.currentFrame?.dispose(remove);this.currentFrame=undefined;this.roundedStatistics.frameBytes=0;const gl=this.gl;if(gl&&remove){if(this.program)gl.deleteProgram(this.program);if(this.texture)gl.deleteTexture(this.texture);if(this.oppositeTexture)gl.deleteTexture(this.oppositeTexture);if(this.vao)gl.deleteVertexArray(this.vao);if(this.coverageTexture)gl.deleteTexture(this.coverageTexture);if(this.classTexture)gl.deleteTexture(this.classTexture);if(this.repairTexture)gl.deleteTexture(this.repairTexture);}this.repairTexture=undefined;this.repairBytes=0;this.classTexture=undefined;this.classRevision=-1;this.classSummary=undefined;this.coverageTexture=undefined;this.coverageKey='';this.coverageBytes=0;this.program=undefined;this.texture=undefined;this.oppositeTexture=undefined;this.oppositeSource=undefined;this.oppositeRevision=-1;this.vao=undefined;this.uniforms.clear();this.uploadedRevision=-1;this.statistics.textureBytes=0;this.statistics.resources=0;}
 dispose(){this.disposed=true;this.canvas.removeEventListener('webglcontextlost',this.lost);this.canvas.removeEventListener('webglcontextrestored',this.restored);this.release(true);this.gl=null;this.canvas.width=0;}
}
