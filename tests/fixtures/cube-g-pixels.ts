import {SolidCubeWebGL} from '../../src/rendering/solid-cube-webgl.ts';
import {prepareCubeCanvasAtlas,presentCubeCanvas} from '../../src/rendering/solid-cube-canvas.ts';
import {cubeCamera,projectCube} from '../../src/rendering/solid-cube-view.ts';
import {SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,type CubeVector} from '../../src/surfaces/solid-cube.ts';
export async function verifyHollowPixels(){
 const size={width:600,height:600},n=2,data=new Float32Array(6*9*4),field={n,data,bytes:data.byteLength,sourceRevision:0,sourceCells:n},canvas=document.createElement('canvas'),gpuCanvas=document.createElement('canvas'),gl=new SolidCubeWebGL(gpuCanvas,()=>{}),results=[];
 try{for(const orientation of [1,-1] as const){const surface={orientation,physicalScale:orientation===1?1:.8},atlas=await prepareCubeCanvasAtlas(field,true,undefined,()=>true,undefined,orientation);
  try{for(const mode of ['physical','net'] as const)for(const face of SOLID_CUBE_FACES){const camera=cubeCamera(SOLID_CUBE_FRAMES[face].normal.map(v=>v*orientation) as unknown as CubeVector),p=projectCube(face,0,0,camera,mode,size,surface),normal=SOLID_CUBE_FRAMES[face].normal.map(v=>v*orientation),shade=Math.max(.58,Math.min(1.16,.88+.3*(normal[0]!*(-.38)+normal[1]!*(-.48)+normal[2]!*.78))),expected=[37,111,143].map(v=>Math.round(v*shade));
   presentCubeCanvas(canvas,atlas,camera,mode,size,surface);const cpu=Array.from(canvas.getContext('2d')!.getImageData(Math.floor(p.x*canvas.width/size.width),Math.floor(p.y*canvas.height/size.height),1,1).data);let gpu:number[]|undefined;
   if(gl.available){gl.present(field,camera,mode,size,true,surface);gpu=gl.readPixel(Math.floor(p.x*gpuCanvas.width/size.width),Math.floor((size.height-p.y)*gpuCanvas.height/size.height));}
   results.push({orientation,mode,face,expected,cpu,gpu});
  }}finally{atlas.dispose();}
 }return{renderer:gl.statistics.renderer,software:gl.statistics.software,results};}finally{gl.dispose();canvas.width=canvas.height=gpuCanvas.width=gpuCanvas.height=0;}
}
