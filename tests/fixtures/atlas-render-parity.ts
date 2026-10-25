import {cylinderParityScene} from './cylinder-hollow-parity.ts';
import {CylinderWebGLRenderer} from '../../src/rendering/cylindrical-webgl.ts';
import {cylinderRasterSteps} from '../../src/rendering/cylindrical-raster.ts';
import {createSphericalTerrain} from '../../src/terrain/spherical.ts';
import {startSphericalBrushStroke} from '../../src/terrain/spherical-brush.ts';
import {CUBE_FACES,type CubeFace} from '../../src/surfaces/cube-sphere.ts';
import {buildSphericalFaceTexture,makeSphericalDisplayCache,type FaceTexture} from '../../src/rendering/spherical-raster.ts';
import {SphericalElevationField} from '../../src/rendering/spherical-elevation.ts';
import {sphericalFieldRaster} from '../../src/rendering/spherical-field-raster.ts';
import {INITIAL_SPHERICAL_VIEW} from '../../src/rendering/spherical-view.ts';
import {SphereWebGLRenderer} from '../../src/rendering/spherical-webgl.ts';
import {createSolidCubeTerrain} from '../../src/terrain/solid-cube.ts';
import {prepareSolidCubeDab} from '../../src/terrain/solid-cube-brush.ts';
import {prepareCubeDisplayField} from '../../src/rendering/solid-cube-field.ts';
import {prepareCubeCanvasAtlas,presentCubeCanvas} from '../../src/rendering/solid-cube-canvas.ts';
import {presentHollowCanvas,disposeHollowCanvas} from '../../src/rendering/hollow-cube-canvas.ts';
import {SolidCubeWebGL} from '../../src/rendering/solid-cube-webgl.ts';
import {cubeCamera,CUBE_EXTERIOR_VIEW} from '../../src/rendering/solid-cube-view.ts';

const size={width:640,height:480},finish=<T>(work:Generator<void,T>)=>{let r=work.next();while(!r.done)r=work.next();return r.value;};
const digest=async(values:Float32Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',values.slice().buffer))].map(v=>v.toString(16).padStart(2,'0')).join('');
function node(label:string){const box=document.createElement('figure'),caption=document.createElement('figcaption'),canvas=document.createElement('canvas');caption.textContent=label;canvas.style.cssText='width:640px;height:480px;background:#0b1821';box.style.margin='0';box.append(caption,canvas);document.querySelector('#parity')!.append(box);return canvas;}
function cpu(canvas:HTMLCanvasElement,pixels:Uint8ClampedArray,width:number,height:number,left=0,top=0,displayWidth=width,displayHeight=height){canvas.width=size.width;canvas.height=size.height;const scratch=document.createElement('canvas');scratch.width=width;scratch.height=height;scratch.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(pixels),width,height),0,0);canvas.getContext('2d')!.drawImage(scratch,left,top,displayWidth,displayHeight);}
function pixels(canvas:HTMLCanvasElement,backend:string){if(backend==='canvas')return canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data;const gl=canvas.getContext('webgl2')!,raw=new Uint8Array(canvas.width*canvas.height*4),out=new Uint8ClampedArray(raw.length);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);for(let y=0;y<canvas.height;y++)out.set(raw.subarray((canvas.height-y-1)*canvas.width*4,(canvas.height-y)*canvas.width*4),y*canvas.width*4);return out;}
function compare(a:Uint8ClampedArray,b:Uint8ClampedArray,width:number,height:number){
 const p=(data:Uint8ClampedArray,i:number,c:number)=>c===3?data[i+3]!:data[i+c]!*data[i+3]!/255;let checked=0,stableChecked=0,stableMax=0,envelopeMax=0,envelopeViolations=0,totalError=0;
 for(let y=3;y<height-3;y+=2)for(let x=3;x<width-3;x+=2){const at=(y*width+x)*4;if(!a[at+3]&&!b[at+3])continue;checked++;let opaque=a[at+3]===255&&b[at+3]===255,variation=0,err=0,bad=false;
  for(let c=0;c<4;c++){let lo=Infinity,hi=-Infinity;for(const dy of[-2,0,2])for(const dx of[-2,0,2]){const i=((y+dy)*width+x+dx)*4,v=p(a,i,c);lo=Math.min(lo,v);hi=Math.max(hi,v);opaque&&=a[i+3]===255;}
   const v=p(b,at,c),error=Math.max(lo-v,v-hi,0);envelopeMax=Math.max(envelopeMax,error);bad||=error>3;variation=Math.max(variation,hi-lo);err=Math.max(err,Math.abs(p(a,at,c)-v));
  }if(bad)envelopeViolations++;totalError+=err;if(opaque&&variation<=12){stableChecked++;stableMax=Math.max(stableMax,err);}
 }return{checked,stableChecked,stableMax,envelopeMax,envelopeViolations,meanError:totalError/checked};
}
export async function renderParity(shape:'cylinder'|'sphere'|'cube',n:number,initialElevation:number,backend:'canvas'|'webgl'){
 const started=performance.now();
 if(!document.querySelector('#parity')){const main=document.createElement('main');main.id='parity';main.style.cssText='display:grid;grid-template-columns:640px 640px;gap:16px;color:#eef5f2;font:16px system-ui';document.querySelector('#root')?.setAttribute('style','display:none');document.body.style.cssText='background:#071924;margin:16px';document.body.append(main);}
 const solid=node(`${shape} N${n}, initial ${initialElevation} m: accepted solid ${backend}`),hollow=node(`Identical heights and camera: hollow ${backend}`);let before='',renderer='',dispose=()=>{};let afterWords:Float32Array;
 if(shape==='cylinder'){
  const s=cylinderParityScene(n,initialElevation);before=await digest(s.terrain.copyElevations());
  if(backend==='canvas'){for(const [canvas,cut]of[[solid,undefined],[hollow,s.cut]]as const){const r=finish(cylinderRasterSteps(s.cache,s.view,size,307200,undefined,'relief',cut));cpu(canvas,r.pixels,r.columns,r.rows);}}
  else{const a=new CylinderWebGLRenderer(solid,s.cache,()=>{}),b=new CylinderWebGLRenderer(hollow,s.cache,()=>{});if(!a.available||!b.available)throw Error(a.statistics.reason||b.statistics.reason);b.setExcavation(s.cut);
   // Cut views use at least 1.5x backing. Qualify both accepted programs at
   // that same density rather than comparing different-sized images.
   const descriptor=Object.getOwnPropertyDescriptor(window,'devicePixelRatio');Object.defineProperty(window,'devicePixelRatio',{configurable:true,value:Math.max(1.5,devicePixelRatio)});
   try{a.present(s.view,size,'relief');b.present(s.view,size,'relief');}finally{if(descriptor)Object.defineProperty(window,'devicePixelRatio',descriptor);else Reflect.deleteProperty(window,'devicePixelRatio');}renderer=b.statistics.renderer;dispose=()=>{a.dispose();b.dispose();};}
  afterWords=s.terrain.copyElevations();const graphicsDispose=dispose;dispose=()=>{graphicsDispose();s.cache.dispose();};
 }else if(shape==='sphere'){
  const t=createSphericalTerrain({terrainId:'parity-heights',identity:{worldId:'parity',surfaceId:'outside'},radiusMeters:1000000,cellsPerEdge:n,initialElevation});startSphericalBrushStroke(t,{...t.metadata.identity,direction:[1,0,0]},{tool:'raise',radiusMeters:140000,strengthMeters:2000}).end();
  const heights=t.copyElevations(),faces=Object.fromEntries(CUBE_FACES.map(f=>[f,buildSphericalFaceTexture(t,heights,f,true)]))as Record<CubeFace,FaceTexture>,cache=makeSphericalDisplayCache(faces,t.revision),field=new SphericalElevationField(t,cache);finish(field.prepare('all'));before=await digest(heights);
  const cut={model:{radiusMeters:1000000,innerRatio:.8,primitives:[{a:[-1,0,0]as const,b:[-.7,0,0]as const,radius:.03}]},opposite:field,role:'exterior'as const};
  if(backend==='canvas'){for(const [canvas,c]of[[solid,undefined],[hollow,cut]]as const){const r=finish(sphericalFieldRaster(field,INITIAL_SPHERICAL_VIEW,size,'relief',307200,undefined,c));cpu(canvas,r.pixels,r.columns,r.rows,r.left,r.top,r.width,r.height);}}
  else{const a=new SphereWebGLRenderer(solid,field,()=>{}),b=new SphereWebGLRenderer(hollow,field,()=>{});if(!a.available||!b.available)throw Error(a.statistics.reason||b.statistics.reason);b.setExcavation({...cut,opposite:field,oppositeTerrain:t,revision:1});a.present(INITIAL_SPHERICAL_VIEW,size);b.present(INITIAL_SPHERICAL_VIEW,size);renderer=b.statistics.renderer;dispose=()=>{a.dispose();b.dispose();};}
  afterWords=t.copyElevations();
 }else{
  const t=createSolidCubeTerrain({terrainId:'parity-heights',geometry:{identity:{worldId:'parity',surfaceId:'outside'},provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters:1000000},cellsPerEdge:n,initialElevation}),dab=prepareSolidCubeDab(t,{...t.metadata.identity,patchId:'px',u:0,v:0},{version:1,tool:'raise',radiusMeters:140000,strengthMeters:2000});while(dab.status==='preparing')dab.pump(4096);dab.commit();
  const field=await prepareCubeDisplayField(t),camera=cubeCamera([1,0,0]),cut={halfSideMeters:500000,innerRatio:.8,primitives:[{a:[-1,0,0]as const,b:[-.7,0,0]as const,radius:.03}]};before=await digest(t.copyElevations());
  if(backend==='canvas'){const atlas=await prepareCubeCanvasAtlas(field);presentCubeCanvas(solid,atlas,camera,'physical',size);presentHollowCanvas(hollow,cut,{exterior:field,interior:field},atlas,camera,size,CUBE_EXTERIOR_VIEW,undefined,()=>{},()=>false);dispose=()=>{disposeHollowCanvas(hollow);atlas.dispose();};}
  else{const a=new SolidCubeWebGL(solid,()=>{}),b=new SolidCubeWebGL(hollow,()=>{},false,true);if(!a.available||!b.available)throw Error(a.statistics.reason||b.statistics.reason);a.present(field,camera,'physical',size);b.present(field,camera,'physical',size,true,CUBE_EXTERIOR_VIEW,cut,field);renderer=b.statistics.renderer;dispose=()=>{a.dispose();b.dispose();};}
  afterWords=t.copyElevations();
 }
 // Read the non-preserved GPU buffers in the same task as presentation. An
 // awaited hash can let Chrome composite and discard them before readPixels.
 // Snapshot terrain words synchronously above, then hash after pixel capture.
 const a=pixels(solid,backend),b=pixels(hollow,backend),after=await digest(afterWords);if(solid.width!==hollow.width||solid.height!==hollow.height)throw Error('Parity comparison requires identical backing dimensions');const result={shape,n,initialElevation,backend,sourceHash:before,finalHash:after,width:solid.width,height:solid.height,renderer,...compare(a,b,solid.width,solid.height),fixtureMs:performance.now()-started};
 // Freeze exact read-back pixels before disposing the live graphics resources.
 for(const [canvas,data]of[[solid,a],[hollow,b]]as const){const snapshot=document.createElement('canvas');snapshot.width=canvas.width;snapshot.height=canvas.height;snapshot.style.cssText=canvas.style.cssText;snapshot.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(data),canvas.width,canvas.height),0,0);canvas.replaceWith(snapshot);}dispose();return result;
}
