/** Shared accepted WebGL resource operations. Shape adapters retain their
 * geometry/texture layouts; shader diagnostics, nearest Float32 textures and
 * resource cleanup do not vary with World geometry. */
export function surfaceWebGLContext(canvas:HTMLCanvasElement){const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,depth:true,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:false});if(!gl)throw Error('WebGL2 unavailable; using CPU fallback.');return gl;}
export function surfaceGraphicsInfo(gl:WebGL2RenderingContext){const info=gl.getExtension('WEBGL_debug_renderer_info'),renderer=String(gl.getParameter(info?.UNMASKED_RENDERER_WEBGL??gl.RENDERER));return{renderer,software:/swiftshader|llvmpipe|software|basic render/i.test(renderer),antialias:!!gl.getContextAttributes()?.antialias};}
export function compileSurfaceProgram(gl:WebGL2RenderingContext,vertex:string,fragment:string){
 const compile=(type:number,source:string)=>{const shader=gl.createShader(type);if(!shader)throw Error('Shader allocation failed');gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const reason=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(reason??'Shader compilation failed');}return shader;};
 const shaders:WebGLShader[]=[];let program:WebGLProgram|null=null;
 try{shaders.push(compile(gl.VERTEX_SHADER,vertex));shaders.push(compile(gl.FRAGMENT_SHADER,fragment));program=gl.createProgram();if(!program)throw Error('Program allocation failed');gl.attachShader(program,shaders[0]!);gl.attachShader(program,shaders[1]!);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)??'Program linking failed');return program;}
 catch(error){if(program)gl.deleteProgram(program);throw error;}finally{for(const shader of shaders)gl.deleteShader(shader);}
}
export function createSurfaceTexture(gl:WebGL2RenderingContext){const texture=gl.createTexture();if(!texture)throw Error('Texture allocation failed');gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return texture;}
export function createSurfaceMesh(gl:WebGL2RenderingContext,data:Float32Array){const vao=gl.createVertexArray(),buffer=gl.createBuffer();if(!vao||!buffer){if(vao)gl.deleteVertexArray(vao);if(buffer)gl.deleteBuffer(buffer);throw Error('Mesh allocation failed');}try{gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,16,0);return{vao,buffer,count:data.length/4,byteLength:data.byteLength};}catch(error){gl.deleteVertexArray(vao);gl.deleteBuffer(buffer);throw error;}}

/** Optional nonblocking scheduling for a new geometry program. See the Khronos
 * KHR_parallel_shader_compile contract: status is read only after completion.
 * The accepted synchronous compiler remains available to existing renderers. */
export function beginSurfaceProgramCompilation(gl:WebGL2RenderingContext,vertex:string,fragment:string){
 const parallel=gl.getExtension('KHR_parallel_shader_compile');if(!parallel)throw Error('Background graphics compilation unavailable; using Canvas fallback.');
 const started=performance.now(),shaders:WebGLShader[]=[];let program:WebGLProgram|null=null,complete:WebGLProgram|undefined,closed=false;
 const cancel=()=>{if(closed)return;closed=true;if(!gl.isContextLost()){for(const shader of shaders)gl.deleteShader(shader);if(program)gl.deleteProgram(program);}shaders.length=0;program=null;};
 try{
  for(const[type,source]of[[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]as const){const shader=gl.createShader(type);if(!shader)throw Error('Shader allocation failed');shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);}
  program=gl.createProgram();if(!program)throw Error('Program allocation failed');for(const shader of shaders)gl.attachShader(program,shader);gl.linkProgram(program);
 }catch(error){cancel();throw error;}
 return Object.freeze({cancel,poll():WebGLProgram|undefined{
  if(complete)return complete;if(closed)return;if(gl.isContextLost()){cancel();throw Error('Graphics context lost during background compilation.');}
  if(performance.now()-started>60000){cancel();throw Error('Background graphics compilation timed out; using Canvas fallback.');}
  if(!gl.getProgramParameter(program!,parallel.COMPLETION_STATUS_KHR))return;
  if(!gl.getProgramParameter(program!,gl.LINK_STATUS)){const reason=[gl.getProgramInfoLog(program!),...shaders.map(shader=>gl.getShaderInfoLog(shader))].filter(Boolean).join('\n');cancel();throw Error(reason||'Program linking failed');}
  complete=program!;program=null;for(const shader of shaders)gl.deleteShader(shader);shaders.length=0;closed=true;return complete;
 }});
}
