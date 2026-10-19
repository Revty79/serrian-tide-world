// Deterministic SAVED test geography; loaded by the normal v4 Open workflow.
// No mutation of the active editor and no renderer-only invented geography.
import { createCylinderPreviewTerrain } from '../../src/editor/cylinder-preview-session.ts';
import { encodeCylindricalHeightmap } from '../../src/persistence/cylindrical-format.ts';
import { LocalMapStore } from '../../src/persistence/local-map-store.ts';
import { CylinderDisplayCache, cylinderInterpolatedColor, cylinderRasterSteps } from '../../src/rendering/cylindrical-raster.ts';
import { cylinderLayout, cylinderRayHit, initialCylinderView } from '../../src/rendering/cylindrical-view.ts';
import { snapshot } from './cylinder-observer.ts';

export async function seed(n:number) {
 const terrain=createCylinderPreviewTerrain(n);
 for(const k of terrain.samples()){
  const p=terrain.geometry.referencePosition(terrain.positionAt(terrain.owner(k))),r=terrain.metadata.geometry.radiusMeters;
  terrain.write(k,Math.sin(p[0]/r*4+p[2]/r*3)*1800+Math.cos(p[1]/r*5-p[2]/r)*1300-400);
 }
 await new LocalMapStore().save(await encodeCylindricalHeightmap(terrain,`Render benchmark ${n}`));
 return terrain.metadata.terrainId;
}
export function micro(n:number) {
 const t=createCylinderPreviewTerrain(n),c=new CylinderDisplayCache(t);for(const _ of c.prepare())void _;
 const v=initialCylinderView(),size={width:1440,height:900},times:Record<string,number>={};let at=performance.now();
 for(let i=0;i<4000;i++)cylinderLayout(t.geometry,v,size);times.camera4000=performance.now()-at;
 const hits=[];at=performance.now();for(let i=0;i<12000;i++){const hit=cylinderRayHit((i%120)/50-1.2,Math.floor(i/120)/50-1,v.frame,.8);if(hit)hits.push(hit);}times.rays12000=performance.now()-at;
 const colors=c.snapshot();at=performance.now();for(const hit of hits)cylinderInterpolatedColor(colors,t,hit);times.paletteHits=performance.now()-at;
 let shadeSink=0;at=performance.now();for(const hit of hits){const f=hit.region==='side'?Math.cos(hit.theta)*v.frame.forward[0]+Math.sin(hit.theta)*v.frame.forward[1]:(hit.region==='cap-end'?1:-1)*v.frame.forward[2],shade=.74+.26*Math.max(0,f);shadeSink+=(171+205+239)*shade;}times.shadingHits=performance.now()-at;
 for(const budget of [22000,40000,90000,160000]){at=performance.now();const work=cylinderRasterSteps(c,v,size,budget);let steps=0,result=work.next();while(!result.done){steps++;result=work.next();}times[`raster${budget}`]=performance.now()-at;times[`steps${budget}`]=steps;}
 c.dispose();return{n,times,hits:hits.length,shadeSink};
}
let stop=()=>({});
export function monitor(){
 const gaps:number[]=[],lags:number[]=[],ready:boolean[]=[],presentations:number[]=[],pointer:number[]=[],stages:Record<string,number[]>={};let running=true,last=performance.now(),id=0,previous=-1,input=0;
 const canvas=document.querySelector<HTMLCanvasElement>('.cylinder-canvas')!;
 const event=()=>{input=performance.now();};canvas.addEventListener('pointermove',event);
 const proto=CanvasRenderingContext2D.prototype,methods=['putImageData','drawImage','clearRect'] as const,originals=methods.map(k=>proto[k]);
 methods.forEach((k,i)=>{(proto[k] as unknown)=function(this:CanvasRenderingContext2D,...args:unknown[]){const at=performance.now();try{return Reflect.apply(originals[i]!,this,args);}finally{(stages[k]??=[]).push(performance.now()-at);}};});
 const tick=(now:number)=>{if(!running)return;gaps.push(now-last);last=now;try{const s=snapshot(false);ready.push(s.ready);lags.push(JSON.stringify(s.requested)!==JSON.stringify(s.view)?1:0);if(s.metrics.renders!==previous){if(previous>=0)presentations.push(now);previous=s.metrics.renders;}if(input){pointer.push(performance.now()-input);input=0;}}catch{}id=requestAnimationFrame(tick);};id=requestAnimationFrame(tick);
 stop=()=>{running=false;cancelAnimationFrame(id);canvas.removeEventListener('pointermove',event);methods.forEach((k,i)=>{(proto[k] as unknown)=originals[i];});return{gaps,lags,ready,presentations,pointer,stages,state:snapshot(false)};};
}
export function finishMonitor(){return stop();}
