import {OPEN_CYLINDER_VERTEX_SHADER,OPEN_CYLINDER_BASE_FRAGMENT_SHADER,OPEN_CYLINDER_CUT_FRAGMENT_SHADER} from './open-cylinder-glsl.ts';
import {surfaceWebGLContext,surfaceGraphicsInfo,beginSurfaceProgramCompilation,createSurfaceTexture,createSurfaceMesh} from './surface-webgl.ts';
import {CYLINDER_DISPLAY_SEGMENTS} from './cylindrical-webgl.ts';
import {cutDisplayDimensions} from './raster-quality.ts';
import {projectedCutBounds} from './excavation-projection.ts';
import type {SurfaceRenderer} from './surface-renderer.ts';
import type {CylinderViewport} from './cylindrical-view.ts';
import {OpenCylinderDisplayCache} from './open-cylinder-raster.ts';
import {openCylinderDisplayIndex,type CylinderAppearance} from './open-cylinder-elevation.ts';
import {openCylinderViewAdapter,openCylinderReferenceModel,type OpenCylinderView} from './open-cylinder-view.ts';
import type {OpenCylinderGeometry} from '../surfaces/open-cylinder.ts';
import type {CylinderExcavation} from '../surfaces/hollow-cylinder-excavation.ts';
import {dot3} from '../surfaces/cube-sphere.ts';
const BASE_UNIFORMS=['annularCoverage','mapProjection','sideElevations','startElevations','endElevations','oppositeSide','cameraRight','cameraUp','cameraForward','inspectionEye','viewport','translation','backingSize','scale','depthExtent','h','phase','outerRadiusMeters','innerRadiusMeters','lengthMeters','seaLevel','heightScale','innerRatio','ownRatio','mode','relief','invertedProjection','selectedInside'];
const CUT_UNIFORMS=['oppositeStart','oppositeEnd','eyePosition','radiusMeters','oppositeRadius','oppositeLength','outerHalf','innerHalf','excavationEnabled','cutterCount','inspection','primitiveA[0]','primitiveB[0]'];
/** Actual boundary mesh. Neither annulus has a center vertex or disk triangle.
 * Tessellation is display-only and uses the accepted cylindrical sagitta cap. */
function vertices(g:OpenCylinderGeometry,map:boolean|string){
 const {outerRadiusMeters:R,innerRadiusMeters:ri,lengthMeters:L}=g.metadata,T=R-ri,h=L/R/2,ratio=ri/R,S=2*(L+T),data:number[]=[],add=(x:number,y:number,z:number,region:number)=>data.push(x,y,z,region);
 if(typeof map==='string'){
  const upper=map==='upper-annulus',inner=map==='inner-wall',annulus=map.endsWith('annulus'),region=annulus?upper?2:1:inner?3:0;
  if(!annulus){const w=Math.PI*(inner?ratio:1);for(const[x,y]of[[-w,-h],[w,-h],[w,h],[-w,-h],[w,h],[-w,h]])add(x!,y!,0,region);}
  else for(let i=0;i<CYLINDER_DISPLAY_SEGMENTS;i++){const a=i*2*Math.PI/CYLINDER_DISPLAY_SEGMENTS,b=(i+1)*2*Math.PI/CYLINDER_DISPLAY_SEGMENTS;for(const[t,r]of[[a,1],[b,1],[b,ratio],[a,1],[b,ratio],[a,ratio]])add(Math.cos(t!)*r!,Math.sin(t!)*r!,0,region);}
  return new Float32Array(data);
 }
 if(map){for(const[low,high,region]of [[0,L,0],[L,L+T,2],[L+T,2*L+T,3],[2*L+T,S,1]]){const a=(low!-S/2)/R,b=(high!-S/2)/R;for(const[x,y]of[[-Math.PI,a],[Math.PI,a],[Math.PI,b],[-Math.PI,a],[Math.PI,b],[-Math.PI,b]])add(x!,y!,0,region!);}return new Float32Array(data);}
 for(let i=0;i<CYLINDER_DISPLAY_SEGMENTS;i++){
  const a=i*2*Math.PI/CYLINDER_DISPLAY_SEGMENTS,b=(i+1)*2*Math.PI/CYLINDER_DISPLAY_SEGMENTS,x=Math.cos(a),y=Math.sin(a),xx=Math.cos(b),yy=Math.sin(b);
  add(x,y,-h,0);add(xx,yy,-h,0);add(xx,yy,h,0);add(x,y,-h,0);add(xx,yy,h,0);add(x,y,h,0);
  add(x*ratio,y*ratio,-h,3);add(x*ratio,y*ratio,h,3);add(xx*ratio,yy*ratio,h,3);add(x*ratio,y*ratio,-h,3);add(xx*ratio,yy*ratio,h,3);add(xx*ratio,yy*ratio,-h,3);
  add(x,y,h,2);add(xx,yy,h,2);add(xx*ratio,yy*ratio,h,2);add(x,y,h,2);add(xx*ratio,yy*ratio,h,2);add(x*ratio,y*ratio,h,2);
  add(x,y,-h,1);add(xx*ratio,yy*ratio,-h,1);add(xx,yy,-h,1);add(x,y,-h,1);add(x*ratio,y*ratio,-h,1);add(xx*ratio,yy*ratio,-h,1);
 }
 return new Float32Array(data);
}
/** Four-patch geometry adapter over the accepted WebGL resources, terrain
 * reconstruction/color/coast pass, CSG intervals and backing/lifetime policy. */
export class OpenCylinderWebGLRenderer implements SurfaceRenderer<OpenCylinderView>{
 private gl:WebGL2RenderingContext|null=null;private program?:WebGLProgram;private terrainProgram?:WebGLProgram;private cutProgram?:WebGLProgram;
 private textures:WebGLTexture[]=[];private meshes:ReturnType<typeof createSurfaceMesh>[]=[];private uniforms=new Map<string,WebGLUniformLocation>();private uploadedRevision=-1;private heightScale=1;private disposed=false;private model:CylinderExcavation;
 private annularMaps:boolean;private canvas:HTMLCanvasElement;private cache:OpenCylinderDisplayCache;private invalidate:()=>void;
 private compilation?:ReturnType<typeof beginSurfaceProgramCompilation>;private compilationFrame=0;private restorationPending=false;private waiters:{resolve:()=>void;reject:(error:Error)=>void}[]=[];
 readonly statistics={losses:0,recoveries:0,uploads:0,presentations:0,textureBytes:0,geometryBytes:0,antialias:false,baseCompileMs:0,cutCompileMs:0,reason:'',renderer:'',probeErrors:[] as number[]};
 constructor(canvas:HTMLCanvasElement,cache:OpenCylinderDisplayCache,invalidate:()=>void,annularMaps=false){this.annularMaps=annularMaps;this.canvas=canvas;this.cache=cache;this.invalidate=invalidate;this.model=openCylinderReferenceModel(cache.terrain.geometry);canvas.addEventListener('webglcontextlost',this.lost);canvas.addEventListener('webglcontextrestored',this.restored);this.initialize();}
 get available(){return!this.disposed&&!!this.terrainProgram&&(!this.model.primitives.length||!!this.cutProgram)&&!!this.gl&&!this.gl.isContextLost();}
 get preparing(){return!this.available&&!!this.compilation;}
 whenReady():Promise<void>{if(this.available)return Promise.resolve();if(!this.compilation)return Promise.reject(Error(this.statistics.reason||'Graphics renderer unavailable'));return new Promise((resolve,reject)=>this.waiters.push({resolve,reject}));}
 private notifyReady(){if(this.available){if(this.restorationPending){this.statistics.recoveries++;this.restorationPending=false;}for(const waiter of this.waiters)waiter.resolve();this.waiters=[];}else if(!this.compilation){const error=Error(this.statistics.reason||'Graphics renderer unavailable');for(const waiter of this.waiters)waiter.reject(error);this.waiters=[];}}
 setModel(value?:CylinderExcavation){this.model=value??openCylinderReferenceModel(this.cache.terrain.geometry);if(this.model.primitives.length&&this.terrainProgram&&!this.cutProgram&&!this.compilation)this.startCompilation(true);this.notifyReady();}
 private lost=(event:Event)=>{event.preventDefault();this.statistics.losses++;this.statistics.reason='Graphics context lost; using CPU fallback.';this.release(false);this.notifyReady();this.canvas.hidden=true;this.invalidate();};
 private restored=()=>{if(this.disposed)return;this.restorationPending=true;this.initialize();this.invalidate();};
 private useProgram(cut:boolean){const gl=this.gl!,next=cut?this.cutProgram:this.terrainProgram;if(!next)throw Error('Graphics program is still being prepared.');if(this.program!==next){this.program=next;this.uniforms.clear();for(const name of[...BASE_UNIFORMS,...(cut?CUT_UNIFORMS:[])]){const location=gl.getUniformLocation(next,name);if(location===null)throw Error(`Missing Open Cylinder graphics uniform ${name}`);this.uniforms.set(name,location);}}gl.useProgram(next);}
 private startCompilation(cut:boolean){if(this.disposed||this.compilation||!this.gl)return;const started=performance.now();try{
  this.compilation=beginSurfaceProgramCompilation(this.gl,OPEN_CYLINDER_VERTEX_SHADER,cut?OPEN_CYLINDER_CUT_FRAGMENT_SHADER:OPEN_CYLINDER_BASE_FRAGMENT_SHADER);this.statistics.reason='Preparing graphics in the background; Canvas remains active.';
  const poll=()=>{this.compilationFrame=0;if(this.disposed||!this.compilation)return;try{const program=this.compilation.poll();if(!program){this.compilationFrame=requestAnimationFrame(poll);return;}this.compilation=undefined;if(cut){this.cutProgram=program;this.statistics.cutCompileMs=performance.now()-started;}else{this.terrainProgram=program;this.statistics.baseCompileMs=performance.now()-started;}this.statistics.reason='';if(!cut&&this.model.primitives.length)this.startCompilation(true);this.notifyReady();this.invalidate();}catch(error){this.fail(error);this.notifyReady();this.invalidate();}};
  this.compilationFrame=requestAnimationFrame(poll);
 }catch(error){this.fail(error);this.notifyReady();this.invalidate();}}
 private initialize(){try{
  const gl=surfaceWebGLContext(this.canvas);this.gl=gl;const info=surfaceGraphicsInfo(gl);this.statistics.renderer=info.renderer;this.statistics.probeErrors=info.probeErrors;if(info.software)throw Error('Software graphics detected; using bounded CPU fallback.');
  for(let i=0;i<4;i++)this.textures.push(createSurfaceTexture(gl));
  for(const map of[false,true,undefined,...(this.annularMaps?['upper-annulus','lower-annulus','inner-wall','outer-wall']:[])]){const data=map===undefined?new Float32Array([-1,-1,0,0,3,-1,0,0,-1,3,0,0]):vertices(this.cache.terrain.geometry,map),mesh=createSurfaceMesh(gl,data);this.meshes.push(mesh);this.statistics.geometryBytes+=mesh.byteLength;}
  const allocationError=gl.getError();if(allocationError!==gl.NO_ERROR)throw Error(`Graphics resource allocation failed (0x${allocationError.toString(16)}); using CPU fallback.`);this.statistics.antialias=info.antialias;this.startCompilation(false);
 }catch(error){this.statistics.reason=String(error);this.release(true);this.canvas.hidden=true;this.canvas.width=0;}}
 present(view:OpenCylinderView,size:CylinderViewport,appearance:CylinderAppearance='elevation'){
  if(!this.available)throw Error('Graphics renderer unavailable');const gl=this.gl!,at=performance.now(),g=this.cache.terrain.geometry,adapter=openCylinderViewAdapter(g,view,size,this.model),l=adapter.layout,enabled=view.mode==='physical'&&!adapter.fittedInside&&this.model.primitives.length>0,dimensions=cutDisplayDimensions(size,devicePixelRatio||1,enabled||adapter.inspection),{outerRadiusMeters:ro,innerRadiusMeters:ri,lengthMeters:L}=g.metadata,own=view.scope==='interior'?ri:ro;
  if(this.canvas.width!==dimensions.width||this.canvas.height!==dimensions.height){this.canvas.width=dimensions.width;this.canvas.height=dimensions.height;}const resized=performance.now();this.useProgram(enabled);
  if(this.uploadedRevision!==this.cache.sourceRevision){
   const values=this.cache.elevationSnapshot(),r=this.cache.terrain.metadata.representation.resolution,A=r.angularSamples;this.heightScale=1;for(const value of values)this.heightScale=Math.max(this.heightScale,Math.abs(value));let bytes=0;
   for(const[slot,patch]of(['outer-wall','inner-wall','rim-start','rim-end']as const).entries()){
    const rows=(patch.endsWith('wall')?r.axialCells:2*r.radialCells)+1,data=new Float32Array(A*rows);for(let row=0;row<rows;row++)for(let col=0;col<A;col++)data[row*A+col]=values[openCylinderDisplayIndex(this.cache.terrain,patch,row,col)]!/this.heightScale;
    gl.activeTexture(gl.TEXTURE0+slot);gl.bindTexture(gl.TEXTURE_2D,this.textures[slot]!);gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,A,rows,0,gl.RED,gl.FLOAT,data);bytes+=data.byteLength;
   }
   if(gl.getError()!==gl.NO_ERROR)throw Error('Graphics elevation upload failed; using CPU fallback.');this.uploadedRevision=this.cache.sourceRevision;this.statistics.textureBytes=Math.max(this.statistics.textureBytes,bytes);this.statistics.uploads++;
  }
  const uploaded=performance.now(),u=(name:string)=>this.uniforms.get(name)!,bind=(name:string,unit:number,texture:number)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,this.textures[texture]!);gl.uniform1i(u(name),unit);},inside=view.scope==='interior';
  bind('sideElevations',0,inside?1:0);bind('startElevations',1,2);bind('endElevations',2,3);bind('oppositeSide',3,inside?0:1);
  if(enabled){bind('oppositeStart',4,2);bind('oppositeEnd',5,3);const a=new Float32Array(48*4),b=new Float32Array(48*4);this.model.primitives.forEach((p,i)=>{a.set([...p.a,p.radius],4*i);b.set([...p.b,0],4*i);});gl.uniform4fv(u('primitiveA[0]'),a);gl.uniform4fv(u('primitiveB[0]'),b);gl.uniform1i(u('cutterCount'),this.model.primitives.length);gl.uniform1i(u('excavationEnabled'),1);gl.uniform1i(u('inspection'),adapter.inspection?1:0);gl.uniform1f(u('outerHalf'),this.model.outerHalfLength);gl.uniform1f(u('innerHalf'),this.model.innerHalfLength);gl.uniform1f(u('radiusMeters'),own);gl.uniform1f(u('oppositeRadius'),inside?ro:ri);gl.uniform1f(u('oppositeLength'),L);gl.uniform3fv(u('eyePosition'),(view.eyeMeters??[0,0,0]).map(v=>v/ro));}
  gl.uniform1i(u('annularCoverage'),this.annularMaps?1:0);gl.uniform1i(u('mapProjection'),view.mapProjection?['upper-annulus','lower-annulus','inner-wall','outer-wall'].indexOf(view.mapProjection)+1:0);gl.uniform1f(u('outerRadiusMeters'),ro);gl.uniform1f(u('innerRadiusMeters'),ri);gl.uniform1f(u('lengthMeters'),L);gl.uniform1f(u('seaLevel'),this.cache.terrain.metadata.seaLevel);gl.uniform1f(u('heightScale'),this.heightScale);gl.uniform1i(u('relief'),appearance==='relief'?1:0);gl.uniform1i(u('selectedInside'),inside?1:0);gl.uniform1i(u('invertedProjection'),adapter.fittedInside?1:0);gl.uniform1f(u('innerRatio'),ri/ro);gl.uniform1f(u('ownRatio'),adapter.radiusMeters/ro);
  gl.uniform2f(u('viewport'),size.width,size.height);gl.uniform2f(u('translation'),view.mode==='map'?view.pan.x:adapter.tx,view.mode==='map'?view.pan.y:adapter.ty);gl.uniform2f(u('backingSize'),dimensions.width,dimensions.height);gl.uniform3fv(u('inspectionEye'),(view.eyeMeters??[0,0,0]).map(v=>v/adapter.radiusMeters));gl.uniform3fv(u('cameraRight'),view.frame.right);gl.uniform3fv(u('cameraUp'),view.frame.up);gl.uniform3fv(u('cameraForward'),view.frame.forward);gl.uniform1f(u('scale'),l.scale);gl.uniform1f(u('h'),l.h);gl.uniform1f(u('phase'),view.phase);gl.uniform1f(u('depthExtent'),adapter.inspection?4*l.h+4:Math.hypot(view.frame.forward[0],view.frame.forward[1])+l.h*Math.abs(view.frame.forward[2])+.01);gl.uniform1i(u('mode'),enabled?3:adapter.inspection?2:view.mode==='map'?1:0);
  gl.viewport(0,0,dimensions.width,dimensions.height);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  if(enabled&&!adapter.inspection){
   gl.uniform1i(u('excavationEnabled'),0);gl.uniform1i(u('mode'),0);const base=this.meshes[0]!;gl.bindVertexArray(base.vao);gl.drawArrays(gl.TRIANGLES,0,base.count);gl.uniform1i(u('excavationEnabled'),1);gl.uniform1i(u('mode'),3);gl.disable(gl.DEPTH_TEST);
   const ratio=adapter.radiusMeters/ro,bounds=projectedCutBounds(this.model.primitives,size,p=>({x:l.x+(dot3(p,view.frame.right)/ratio-adapter.tx)*l.scale,y:l.y-(dot3(p,view.frame.up)/ratio-adapter.ty)*l.scale}),l.scale/ratio);
   if(bounds.width&&bounds.height){const x=Math.floor(bounds.x/size.width*dimensions.width),y=Math.floor((size.height-bounds.y-bounds.height)/size.height*dimensions.height),right=Math.ceil((bounds.x+bounds.width)/size.width*dimensions.width),top=Math.ceil((size.height-bounds.y)/size.height*dimensions.height);gl.enable(gl.SCISSOR_TEST);try{gl.scissor(x,y,right-x,top-y);const overlay=this.meshes[2]!;gl.bindVertexArray(overlay.vao);gl.drawArrays(gl.TRIANGLES,0,overlay.count);}finally{gl.disable(gl.SCISSOR_TEST);}}
  }else{const mesh=this.meshes[enabled?2:view.mode==='map'?view.mapProjection?3+['upper-annulus','lower-annulus','inner-wall','outer-wall'].indexOf(view.mapProjection):1:0]!;gl.bindVertexArray(mesh.vao);gl.drawArrays(gl.TRIANGLES,0,mesh.count);}
  if(gl.isContextLost())throw Error('Graphics context lost during presentation');this.canvas.hidden=false;this.statistics.presentations++;return{revision:this.uploadedRevision,...dimensions,resizeMs:resized-at,uploadMs:uploaded-resized,submitMs:performance.now()-uploaded};
 }
 fail(reason:unknown){this.statistics.reason=String(reason);this.restorationPending=false;this.release(true);this.canvas.hidden=true;this.canvas.width=0;this.notifyReady();}
 private release(remove:boolean){cancelAnimationFrame(this.compilationFrame);this.compilationFrame=0;this.compilation?.cancel();this.compilation=undefined;const gl=this.gl;if(gl&&remove){for(const t of this.textures)gl.deleteTexture(t);for(const m of this.meshes){gl.deleteVertexArray(m.vao);gl.deleteBuffer(m.buffer);}if(this.terrainProgram)gl.deleteProgram(this.terrainProgram);if(this.cutProgram)gl.deleteProgram(this.cutProgram);}this.textures=[];this.meshes=[];this.program=undefined;this.terrainProgram=undefined;this.cutProgram=undefined;this.uniforms.clear();this.uploadedRevision=-1;this.statistics.textureBytes=0;this.statistics.geometryBytes=0;}
 dispose(){this.disposed=true;this.canvas.removeEventListener('webglcontextlost',this.lost);this.canvas.removeEventListener('webglcontextrestored',this.restored);this.release(true);this.gl=null;this.canvas.width=0;this.notifyReady();}
}
