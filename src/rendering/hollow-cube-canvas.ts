import {cubeDisplayColor,cubeDisplaySample,type CubeDisplayField} from './solid-cube-field.ts';
import {cubeLayout,type CubeCamera,type CubeSurfaceView,type CubeViewport} from './solid-cube-view.ts';
import {presentCubeCanvas,type CubeCanvasAtlas} from './solid-cube-canvas.ts';
import {traceHollowExcavation,type HollowExcavation,type PassageEye,excavationVector} from '../surfaces/hollow-cube-csg.ts';
import {cubeDot,SOLID_CUBE_FACES,type CubeVector} from '../surfaces/solid-cube.ts';
import {cubeBackingSize} from './solid-cube-webgl.ts';

interface Cache {model:HollowExcavation;view:string;rect:{x:number;y:number;width:number;height:number};canvas:HTMLCanvasElement;kind:Int8Array;u:Float32Array;v:Float32Array;shade:Float32Array}
const caches=new WeakMap<HTMLCanvasElement,Cache>();
export function hollowCanvasCacheBytes(canvas:HTMLCanvasElement){const c=caches.get(canvas);return c?c.kind.byteLength+c.u.byteLength+c.v.byteLength+c.shade.byteLength+c.canvas.width*c.canvas.height*4:0;}
export function disposeHollowCanvas(canvas:HTMLCanvasElement){const c=caches.get(canvas);if(c)c.canvas.width=c.canvas.height=0;caches.delete(canvas);}
/** Existing six affine terrain planes remain the base. Only the projected
 * excavation region is ray-cast; cached hit geometry survives terrain updates.
 * Perspective inspection uses a bounded 24k-pixel version of the SAME CSG. */
export function presentHollowCanvas(canvas:HTMLCanvasElement,model:HollowExcavation,fields:{exterior:CubeDisplayField;interior:CubeDisplayField},atlas:CubeCanvasAtlas,camera:CubeCamera,size:CubeViewport,surface:CubeSurfaceView,eye?:PassageEye){
 const started=performance.now();if(!eye)presentCubeCanvas(canvas,atlas,camera,'physical',size,surface);else {const backing=cubeBackingSize(size,devicePixelRatio||1);if(canvas.width!==backing.width||canvas.height!==backing.height){canvas.width=backing.width;canvas.height=backing.height;}}
 const context=canvas.getContext('2d')!,layout=cubeLayout(camera,'physical',size,{...surface,physicalScale:1}),view=JSON.stringify([camera,size,surface,eye]);
 if(!eye&&surface.orientation===-1){context.globalCompositeOperation='source-atop';context.fillStyle='rgba(0,0,0,.25)';context.fillRect(0,0,canvas.width,canvas.height);context.globalCompositeOperation='source-over';}
 let cache=caches.get(canvas);
 if(!cache||cache.model!==model||cache.view!==view){
  let left=0,top=0,right=size.width,bottom=size.height;
  if(!eye){left=top=Infinity;right=bottom=-Infinity;for(const p of model.primitives)for(const q of [p.a,p.b]){const x=layout.x+cubeDot(q,camera.right)*layout.scale,y=layout.y-cubeDot(q,camera.up)*layout.scale,r=p.radius*layout.scale+3;left=Math.min(left,x-r);right=Math.max(right,x+r);top=Math.min(top,y-r);bottom=Math.max(bottom,y+r);}left=Math.max(0,Math.floor(left));right=Math.min(size.width,Math.ceil(right));top=Math.max(0,Math.floor(top));bottom=Math.min(size.height,Math.ceil(bottom));}
  const rect={x:left,y:top,width:Math.max(1,right-left),height:Math.max(1,bottom-top)},factor=Math.min(1,Math.sqrt(24000/(rect.width*rect.height))),width=Math.max(1,Math.ceil(rect.width*factor)),height=Math.max(1,Math.ceil(rect.height*factor)),patch=cache?.canvas??document.createElement('canvas');patch.width=width;patch.height=height;
  cache={model,view,rect,canvas:patch,kind:new Int8Array(width*height),u:new Float32Array(width*height),v:new Float32Array(width*height),shade:new Float32Array(width*height)};
  const {add,unit}=excavationVector,base=eye?eye.position.map(v=>v/model.halfSideMeters) as unknown as CubeVector:camera.forward.map(v=>v*4) as unknown as CubeVector;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const sx=rect.x+(x+.5)/width*rect.width,sy=rect.y+(y+.5)/height*rect.height;let o:CubeVector,d:CubeVector;
   if(eye){o=base;const f=Math.tan(eye.fov/2)/camera.zoom,a=(sx-size.width/2)/(size.height/2)*f,b=(size.height/2-sy)/(size.height/2)*f;d=unit(add(add(camera.forward.map(v=>-v) as unknown as CubeVector,camera.right,a),camera.up,b));}
   else{o=add(add(base,camera.right,(sx-layout.x)/layout.scale),camera.up,(layout.y-sy)/layout.scale);d=camera.forward.map(v=>-v) as unknown as CubeVector;}
   const hit=traceHollowExcavation(model,o,d,!eye&&surface.orientation===-1);if(!hit)continue;const i=y*width+x;
   if(hit.kind==='rock'){cache.kind[i]=1;cache.shade[i]=Math.max(.28,Math.min(1.1,.64+.36*cubeDot(hit.normal,[-.38,-.48,.78])));}
   else {cache.kind[i]=(hit.kind==='interior'?8:2)+SOLID_CUBE_FACES.indexOf(hit.face!);cache.u[i]=hit.u!;cache.v[i]=hit.v!;}
  }caches.set(canvas,cache);
 }
 const patch=cache.canvas,ctx=patch.getContext('2d')!,image=ctx.createImageData(patch.width,patch.height);
 for(let i=0;i<cache.kind.length;i++){const kind=cache.kind[i]!;if(!kind)continue;let rgb:readonly number[];if(kind===1){const shade=cache.shade[i]!;rgb=[164*shade,145*shade,114*shade];}else{const inside=kind>=8,face=SOLID_CUBE_FACES[kind-(inside?8:2)]!,value=cubeDisplaySample(inside?fields.interior:fields.exterior,face,cache.u[i]!,cache.v[i]!);rgb=cubeDisplayColor(face,value.height,value.du,value.dv,true,inside?-1:1).map(v=>v*(inside?.75:1));}const at=i*4;image.data[at]=rgb[0]!;image.data[at+1]=rgb[1]!;image.data[at+2]=rgb[2]!;image.data[at+3]=255;}
 ctx.putImageData(image,0,0);const rx=canvas.width/size.width,ry=canvas.height/size.height,r=cache.rect;
 if(eye)context.clearRect(0,0,canvas.width,canvas.height);context.clearRect(r.x*rx,r.y*ry,r.width*rx,r.height*ry);context.imageSmoothingEnabled=true;context.drawImage(patch,r.x*rx,r.y*ry,r.width*rx,r.height*ry);canvas.hidden=false;return performance.now()-started;
}
