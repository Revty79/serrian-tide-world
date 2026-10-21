import {SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,cubeDot,type SolidCubeFace} from '../surfaces/solid-cube.ts';
import {assertCubeDisplayField,cubeDisplaySample,cubeDisplayColor,cubeTaskYield,type CubeDisplayField} from './solid-cube-field.ts';
import {projectCube,type CubeCamera,type CubeDisplayMode,type CubeViewport} from './solid-cube-view.ts';
import {cubeBackingSize} from './solid-cube-webgl.ts';

export interface CubeCanvasAtlas {readonly field:CubeDisplayField;readonly faces:ReadonlyMap<SolidCubeFace,HTMLCanvasElement>;readonly bytes:number;dispose():void}
/** Reconstructed elevation is colored at 2N+1 points, never six independent maps.
 * Camera interaction uses six affine planes and requires no geography preparation. */
export async function prepareCubeCanvasAtlas(field:CubeDisplayField,relief=true,yieldWork=cubeTaskYield,alive=()=>true):Promise<CubeCanvasAtlas>{
 assertCubeDisplayField(field);
 const faces=new Map<SolidCubeFace,HTMLCanvasElement>(),size=2*field.n+1;
 try{for(const face of SOLID_CUBE_FACES){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;faces.set(face,canvas);const context=canvas.getContext('2d');if(!context)throw Error('Canvas2D unavailable');const image=context.createImageData(size,size);
  for(let r=0;r<size;r++){
   for(let c=0;c<size;c++){const value=cubeDisplaySample(field,face,2*c/(size-1)-1,1-2*r/(size-1)),color=cubeDisplayColor(face,value.height,value.du,value.dv,relief),at=(r*size+c)*4;image.data[at]=color[0];image.data[at+1]=color[1];image.data[at+2]=color[2];image.data[at+3]=255;}
   if(r%8===7){await yieldWork();if(!alive())throw Error('Cube canvas preparation disposed');}
  }context.putImageData(image,0,0);
 }return Object.freeze({field,faces,bytes:6*size*size*4,dispose(){for(const canvas of faces.values()){canvas.width=canvas.height=0;}faces.clear();}});
 }catch(e){for(const canvas of faces.values())canvas.width=canvas.height=0;faces.clear();throw e;}
}
export function presentCubeCanvas(canvas:HTMLCanvasElement,atlas:CubeCanvasAtlas,camera:CubeCamera,mode:CubeDisplayMode,size:CubeViewport){
 const at=performance.now(),dimensions=cubeBackingSize(size,devicePixelRatio||1);if(canvas.width!==dimensions.width||canvas.height!==dimensions.height){canvas.width=dimensions.width;canvas.height=dimensions.height;}
 const context=canvas.getContext('2d');if(!context)throw Error('Canvas2D unavailable');context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,canvas.width,canvas.height);context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
 const rx=canvas.width/size.width,ry=canvas.height/size.height;
 const visible=SOLID_CUBE_FACES.filter(face=>mode==='net'||cubeDot(SOLID_CUBE_FRAMES[face].normal,camera.forward)>1e-10).toSorted((a,b)=>cubeDot(SOLID_CUBE_FRAMES[a].normal,camera.forward)-cubeDot(SOLID_CUBE_FRAMES[b].normal,camera.forward));
 for(const face of visible){const image=atlas.faces.get(face);if(!image)continue;const p=projectCube(face,-1,1,camera,mode,size),u=projectCube(face,1,1,camera,mode,size),v=projectCube(face,-1,-1,camera,mode,size);
  context.setTransform((u.x-p.x)*rx, (u.y-p.y)*ry,(v.x-p.x)*rx,(v.y-p.y)*ry,p.x*rx,p.y*ry);
  // Endpoint texels are centered on the exact reference boundaries.
  context.drawImage(image,.5,.5,image.width-1,image.height-1,0,0,1,1);
 }context.setTransform(1,0,0,1,0,0);canvas.hidden=false;return performance.now()-at;
}
