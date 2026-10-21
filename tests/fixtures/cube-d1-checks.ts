import {createCubeDemonstration,prepareCubeDisplayField,cubeDisplaySample,cubeDisplayColor} from '../../src/rendering/solid-cube-field.ts';
import {SolidCubeWebGL} from '../../src/rendering/solid-cube-webgl.ts';
import {prepareCubeCanvasAtlas,presentCubeCanvas} from '../../src/rendering/solid-cube-canvas.ts';
import {cubeCamera,cubeLayout,cubeRayHit,cubeNetHit,projectCube,type CubeCamera,type CubeDisplayMode} from '../../src/rendering/solid-cube-view.ts';
import {SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,SOLID_CUBE_PHYSICAL_EDGES,SOLID_CUBE_CORNERS,cubeDot,type CubeVector,type SolidCubeFace} from '../../src/surfaces/solid-cube.ts';
import {CubePresentation} from '../../src/rendering/solid-cube-presentation.ts';

const digest=async(a:Float32Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a.buffer as ArrayBuffer))).map(n=>n.toString(16).padStart(2,'0')).join('');
const turn=()=>new Promise<void>(r=>requestAnimationFrame(()=>r()));
export async function pixelProof(n:128|256){
 const source=await createCubeDemonstration(n),words=source.copyElevations(),revision=source.revision,field=await prepareCubeDisplayField(source),cpu=document.createElement('canvas'),gpu=document.createElement('canvas');
 const renderer=new SolidCubeWebGL(gpu,()=>{}),atlas=await prepareCubeCanvasAtlas(field),size={width:512,height:512},proofs:unknown[]=[];let gpuMax=0,cpuMax=0,coastSamples=0;
 const check=(camera:CubeCamera,mode:CubeDisplayMode,points:{face:SolidCubeFace;u:number;v:number}[],label:string)=>{
  renderer.present(field,camera,mode,size);presentCubeCanvas(cpu,atlas,camera,mode,size);const pixels=renderer.capture()!,other=cpu.getContext('2d')!.getImageData(0,0,cpu.width,cpu.height).data,layout=cubeLayout(camera,mode,size);
  for(const point of points){const p=projectCube(point.face,point.u,point.v,camera,mode,size),x=Math.max(0,Math.min(gpu.width-1,Math.floor(p.x/size.width*gpu.width))),y=Math.max(0,Math.min(gpu.height-1,Math.floor((size.height-p.y)/size.height*gpu.height))),expected=[0,0,0],heights:number[]=[],faces:string[]=[];
   for(const [dx,dy]of[[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]]){
    const sx=((x+.5+dx!)/gpu.width*size.width-layout.x)/layout.scale,sy=((y+.5+dy!)/gpu.height*size.height-layout.y)/layout.scale,hit=mode==='net'?cubeNetHit(sx+.5,sy):cubeRayHit(sx,sy,camera);if(!hit)throw Error('Proof point outside cube');
    const s=cubeDisplaySample(field,hit.face,hit.u,hit.v),color=cubeDisplayColor(hit.face,s.height,s.du,s.dv);heights.push(s.height);faces.push(hit.face);for(let k=0;k<3;k++)expected[k]!+=color[k]!/4;
   }
   const at=(y*gpu.width+x)*4,ca=((cpu.height-1-y)*cpu.width+x)*4,actual=Array.from(pixels.subarray(at,at+4)),fallback=Array.from(other.subarray(ca,ca+4)),glError=Math.max(...expected.map((v,k)=>Math.abs(v-actual[k]!))),canvasError=Math.max(...expected.map((v,k)=>Math.abs(v-fallback[k]!)));
   // One display-raster texel/one screen pixel around a shoreline may mix classes.
   // Interior checks use the same geographic point and a strict eight-channel-value tolerance.
   const coast=Math.min(...heights)<=0&&Math.max(...heights)>=0||Math.min(...heights.map(Math.abs))<100;
   gpuMax=Math.max(gpuMax,glError);if(!coast&&new Set(faces).size===1)cpuMax=Math.max(cpuMax,canvasError);if(coast)coastSamples++;
   if(glError>2||actual[3]!==255)throw Error(`GPU geographic/color mismatch ${label}: ${glError}`);
   if(!coast&&new Set(faces).size===1&&(canvasError>8||fallback[3]!<254))throw Error(`Canvas geographic/color mismatch ${label}: ${canvasError}`);
   proofs.push({label,point,pixel:{x,y},faces,heights,expected,actual,fallback,glError,canvasError,coast});
  }
 };
 try{
  if(!renderer.available)throw Error('Actual WebGL2 path required for pixel proof: '+renderer.statistics.reason);
  for(const face of SOLID_CUBE_FACES){const points=[[-.6,-.6],[.6,-.6],[0,0],[-.6,.6],[.6,.6]].map(([u,v])=>({face,u:u!,v:v!}));check(cubeCamera(SOLID_CUBE_FRAMES[face].normal),'physical',points,'face '+face);check(cubeCamera(),'net',points,'net '+face);}
  for(const edge of SOLID_CUBE_PHYSICAL_EDGES){const camera=cubeCamera(SOLID_CUBE_FRAMES[edge.face].normal.map((v,k)=>v+SOLID_CUBE_FRAMES[edge.toFace].normal[k]!) as unknown as CubeVector),points=[];
   for(const t of[-.65,0,.65])for(const face of[edge.face,edge.toFace]){const edgeName=face===edge.face?edge.edge:edge.toEdge;points.push({face,u:edgeName.startsWith('u')?(edgeName.endsWith('min')?-.97:.97):t,v:edgeName.startsWith('v')?(edgeName.endsWith('min')?-.97:.97):t});}check(camera,'physical',points,'edge '+edge.edgeId);
  }
  for(const corner of SOLID_CUBE_CORNERS){check(cubeCamera(corner.signs),'physical',corner.faces.map(face=>({face,u:cubeDot(corner.signs,SOLID_CUBE_FRAMES[face].u)*.94,v:cubeDot(corner.signs,SOLID_CUBE_FRAMES[face].v)*.94})),'corner '+corner.cornerId);}
  const final=source.copyElevations(),exactWords=new Uint32Array(words.buffer).every((v,i)=>v===new Uint32Array(final.buffer)[i]);if(!exactWords||source.revision!==revision)throw Error('Viewing mutated canonical source');
  return{n,faces:6,edges:12,corners:8,sampleCount:proofs.length,gpuMax,cpuMax,coastSamples,exactWords,revisionBefore:revision,revisionAfter:source.revision,sourceSha256:await digest(words),finalSha256:await digest(final),renderer:renderer.statistics,proofs};
 }finally{renderer.dispose();atlas.dispose();cpu.width=cpu.height=0;gpu.width=gpu.height=0;}
}
export async function lifecycleProof(n:128|256=128){
 const source=await createCubeDemonstration(n),before=source.copyElevations(),revision=source.revision,cpu=document.createElement('canvas'),gpu=document.createElement('canvas'),scene=new CubePresentation(source,cpu,gpu,()=>{});scene.resize({width:600,height:480});
 await scene.refresh();await turn();await turn();
 const initial=scene.snapshot(),restore=gpu.getContext('webgl2')!.getExtension('WEBGL_lose_context')!;if(!restore)throw Error('Context-loss extension required');const lossStart=performance.now();let firstFallbackMs:number|undefined;restore.loseContext();
 for(let i=0;i<200;i++){await turn();if(scene.snapshot().backend==='Canvas2D fallback'&&firstFallbackMs===undefined)firstFallbackMs=performance.now()-lossStart;if(scene.snapshot().backend==='Canvas2D fallback'&&scene.snapshot().displayedN===n)break;}
 const lost=scene.snapshot(),fullFallbackMs=performance.now()-lossStart;if(lost.gpu.losses!==1||lost.backend!=='Canvas2D fallback'||lost.displayedRevision!==revision)throw Error('Context loss did not preserve a real fallback');const recoveryStart=performance.now();restore.restoreContext();
 for(let i=0;i<200;i++){await turn();if(scene.snapshot().gpu.recoveries===1&&scene.snapshot().backend.startsWith('WebGL2'))break;}
 const recovered=scene.snapshot(),recoveryMs=performance.now()-recoveryStart;if(recovered.gpu.recoveries!==1)throw Error('Context recovery failed');const recoveredWords=source.copyElevations(),exactWordsAcrossRecovery=new Uint32Array(before.buffer).every((v,i)=>v===new Uint32Array(recoveredWords.buffer)[i]);if(!exactWordsAcrossRecovery||source.revision!==revision)throw Error('Context recovery changed source');
 source.write(source.keyAt(17),321);const expected=source.copyElevations();await scene.refresh();await turn();await turn();const updated=scene.snapshot();if(updated.displayedRevision!==source.revision||updated.displayedN!==n)throw Error('Revision refresh did not publish current data');
 const after=source.copyElevations();if(!new Uint32Array(expected.buffer).every((v,i)=>v===new Uint32Array(after.buffer)[i]))throw Error('Refresh changed source words');
 const sourcePreservedBeforeUpdate=before.every((v,i)=>i===17||Object.is(v,after[i])),gpuOnlyOneWrite=source.revision===revision+1;scene.setBackend('canvas');source.write(source.keyAt(27),-765.4321);const cpuExpected=source.copyElevations();await scene.refresh();await turn();await turn();const cpuUpdated=scene.snapshot(),cpuWords=source.copyElevations();if(!new Uint32Array(cpuExpected.buffer).every((v,i)=>v===new Uint32Array(cpuWords.buffer)[i])||cpuUpdated.displayedRevision!==source.revision||cpuUpdated.backend!=='Canvas2D fallback')throw Error('Canvas revision refresh changed source or retained old epoch');scene.dispose();await turn();const disposed=scene.snapshot();if(disposed.fieldBytes||disposed.cpuAtlasBytes||disposed.gpu.resources||disposed.canvasBytes)throw Error('Disposed rendering resources retained');
 const pending=new CubePresentation(source,document.createElement('canvas'),document.createElement('canvas'),()=>{}),job=pending.refresh();pending.dispose();await job;const cancelled=pending.snapshot();if(cancelled.draws||cancelled.fieldBytes||cancelled.gpu.resources)throw Error('Disposed queued preparation published');
 return{initial,lost,recovered,updated,cpuUpdated,disposed,cancelled,sourcePreservedBeforeUpdate,exactWordsAcrossRecovery,firstFallbackMs,fullFallbackMs,recoveryMs,revisionBefore:revision,revisionAfter:source.revision,eachUpdateOnlyOneCanonicalWord:gpuOnlyOneWrite&&source.revision===revision+2};
}
