import {SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,cubeDot,type SolidCubeFace} from '../surfaces/solid-cube.ts';
import {assertCubeDisplayField,cubeDisplaySample,cubeDisplayColor,cubeTaskYield,type CubeDisplayField} from './solid-cube-field.ts';
import {projectCube,CUBE_EXTERIOR_VIEW,type CubeSurfaceView,type CubeCamera,type CubeDisplayMode,type CubeViewport} from './solid-cube-view.ts';
import {cubeBackingSize} from './solid-cube-webgl.ts';

export interface CubeCanvasAtlas {readonly field:CubeDisplayField;readonly faces:ReadonlyMap<SolidCubeFace,HTMLCanvasElement>;readonly bytes:number;readonly orientation?:1|-1;dispose():void}
/** Reconstructed elevation is colored at 2N+1 points, never six independent maps.
 * Camera interaction uses six affine planes and requires no geography preparation. */
export async function prepareCubeCanvasAtlas(field:CubeDisplayField,relief=true,yieldWork=cubeTaskYield,alive=()=>true,previous?:CubeCanvasAtlas,orientation:1|-1=1):Promise<CubeCanvasAtlas>{
 assertCubeDisplayField(field);
 const faces=new Map<SolidCubeFace,HTMLCanvasElement>(),size=2*field.n+1;
 try{for(const face of SOLID_CUBE_FACES){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;faces.set(face,canvas);const context=canvas.getContext('2d');if(!context)throw Error('Canvas2D unavailable');
  let left=0,right=size-1,top=0,bottom=size-1;
  if(previous?.field.n===field.n&&(previous.orientation??1)===orientation){
   const old=previous.faces.get(face);if(old)context.drawImage(old,0,0);
   left=top=size;right=bottom=-1;const s=field.n+1,base=SOLID_CUBE_FACES.indexOf(face)*s*s*4;
   for(let r=0;r<s;r++)for(let c=0;c<s;c++){const at=base+(r*s+c)*4;
    if(!Object.is(field.data[at],previous.field.data[at])||!Object.is(field.data[at+1],previous.field.data[at+1])||!Object.is(field.data[at+2],previous.field.data[at+2])){left=Math.min(left,2*c-2);right=Math.max(right,2*c+2);top=Math.min(top,2*(field.n-r)-2);bottom=Math.max(bottom,2*(field.n-r)+2);}
   }left=Math.max(0,left);right=Math.min(size-1,right);top=Math.max(0,top);bottom=Math.min(size-1,bottom);
  }
  if(right<left||bottom<top)continue;
  const width=right-left+1,image=context.createImageData(width,bottom-top+1);
  for(let r=top;r<=bottom;r++){
   for(let c=left;c<=right;c++){const value=cubeDisplaySample(field,face,2*c/(size-1)-1,1-2*r/(size-1)),color=cubeDisplayColor(face,value.height,value.du,value.dv,relief,orientation),at=((r-top)*width+c-left)*4;image.data[at]=color[0];image.data[at+1]=color[1];image.data[at+2]=color[2];image.data[at+3]=255;}
   if(r%8===7){await yieldWork();if(!alive())throw Error('Cube canvas preparation disposed');}
  }context.putImageData(image,left,top);
 }return Object.freeze({field,faces,orientation,bytes:6*size*size*4,dispose(){for(const canvas of faces.values()){canvas.width=canvas.height=0;}faces.clear();}});
 }catch(e){for(const canvas of faces.values())canvas.width=canvas.height=0;faces.clear();throw e;}
}
/** Stage only affected pixels, then publish all face patches without a yield.
 * Camera frames keep the previous complete atlas while patches are prepared. */
export async function updateCubeCanvasAtlas(field:CubeDisplayField,previous:CubeCanvasAtlas|undefined,alive:()=>boolean,orientation:1|-1=1):Promise<CubeCanvasAtlas>{
 if(!previous||previous.field.n!==field.n||(previous.orientation??1)!==orientation)return prepareCubeCanvasAtlas(field,true,undefined,alive,undefined,orientation);
 if(field.updates?.baseRevision!==previous.field.sourceRevision)return prepareCubeCanvasAtlas(field,true,undefined,alive,previous,orientation);
 assertCubeDisplayField(field);const size=2*field.n+1,patches:{context:CanvasRenderingContext2D;image:ImageData;left:number;top:number}[]=[];let slice=performance.now();
 for(const rect of field.updates.rects){
  const face=SOLID_CUBE_FACES[rect.face]!,left=Math.max(0,2*rect.column-2),right=Math.min(size-1,2*(rect.column+rect.width-1)+2),top=Math.max(0,2*(field.n-rect.row-rect.height+1)-2),bottom=Math.min(size-1,2*(field.n-rect.row)+2),width=right-left+1;
  const context=previous.faces.get(face)?.getContext('2d');if(!context)throw Error('Cube atlas closed');const image=context.createImageData(width,bottom-top+1);
  for(let r=top;r<=bottom;r++){
   for(let c=left;c<=right;c++){const value=cubeDisplaySample(field,face,2*c/(size-1)-1,1-2*r/(size-1)),color=cubeDisplayColor(face,value.height,value.du,value.dv,true,orientation),at=((r-top)*width+c-left)*4;image.data[at]=color[0];image.data[at+1]=color[1];image.data[at+2]=color[2];image.data[at+3]=255;}
   if(r%8===7&&performance.now()-slice>=4){await cubeTaskYield();if(!alive())throw Error('Cube atlas update cancelled');slice=performance.now();}
  }patches.push({context,image,left,top});
 }
 if(!alive())throw Error('Cube atlas update cancelled');for(const patch of patches)patch.context.putImageData(patch.image,patch.left,patch.top);
 return Object.freeze({field,faces:previous.faces,orientation,bytes:previous.bytes,dispose:previous.dispose});
}
export function presentCubeCanvas(canvas:HTMLCanvasElement,atlas:CubeCanvasAtlas,camera:CubeCamera,mode:CubeDisplayMode,size:CubeViewport,surface:CubeSurfaceView=CUBE_EXTERIOR_VIEW){
 const at=performance.now(),dimensions=cubeBackingSize(size,devicePixelRatio||1);if(canvas.width!==dimensions.width||canvas.height!==dimensions.height){canvas.width=dimensions.width;canvas.height=dimensions.height;}
 const context=canvas.getContext('2d');if(!context)throw Error('Canvas2D unavailable');context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,canvas.width,canvas.height);context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
 drawCubeAtlas(context,atlas,camera,mode,size,surface);canvas.hidden=false;return performance.now()-at;
}
/** Accepted atlas projection, also used for untouched terrain inside a cut crop. */
export function drawCubeAtlas(context:CanvasRenderingContext2D,atlas:CubeCanvasAtlas,camera:CubeCamera,mode:CubeDisplayMode,size:CubeViewport,surface:CubeSurfaceView=CUBE_EXTERIOR_VIEW,crop={x:0,y:0,width:size.width,height:size.height}){
 context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';const rx=context.canvas.width/crop.width,ry=context.canvas.height/crop.height;
 const visible=SOLID_CUBE_FACES.filter(face=>mode==='net'||surface.orientation*cubeDot(SOLID_CUBE_FRAMES[face].normal,camera.forward)>1e-10).toSorted((a,b)=>surface.orientation*(cubeDot(SOLID_CUBE_FRAMES[a].normal,camera.forward)-cubeDot(SOLID_CUBE_FRAMES[b].normal,camera.forward)));
 for(const face of visible){const image=atlas.faces.get(face);if(!image)continue;const p=projectCube(face,-1,1,camera,mode,size,surface),u=projectCube(face,1,1,camera,mode,size,surface),v=projectCube(face,-1,-1,camera,mode,size,surface);
  context.setTransform((u.x-p.x)*rx, (u.y-p.y)*ry,(v.x-p.x)*rx,(v.y-p.y)*ry,(p.x-crop.x)*rx,(p.y-crop.y)*ry);
  // Endpoint texels are centered on the exact reference boundaries.
  context.drawImage(image,.5,.5,image.width-1,image.height-1,0,0,1,1);
 }context.setTransform(1,0,0,1,0,0);
}
