'use client';
import {useEffect,useRef,useState} from 'react';
import {CubePresentation,type CubeBackend} from '../rendering/solid-cube-presentation.ts';
import {createCubeDemonstration} from '../rendering/solid-cube-field.ts';
import {CUBE_FACE_LABELS,CUBE_NET,cubeCamera,cubeLayout,cubeRayHit,cubeNetHit,projectCube,rotateCube,type CubeDisplayMode} from '../rendering/solid-cube-view.ts';
import {SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,type CubeVector,type SolidCubeFace} from '../surfaces/solid-cube.ts';
import type {SolidCubeTerrain} from '../terrain/solid-cube.ts';
import './CubeDevelopmentPreview.css';

declare global {interface Window {__cubeD1?:{snapshot:()=>ReturnType<CubePresentation['snapshot']>|undefined;verifySource:()=>Promise<{before:string;after:string;revisionBefore:number;revisionAfter:number;exact:boolean}>;probe:(face:SolidCubeFace,u:number,v:number)=>ReturnType<CubePresentation['sample']>}}}
const fingerprint=async(source:SolidCubeTerrain)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',source.copyElevations().buffer as ArrayBuffer))).map(x=>x.toString(16).padStart(2,'0')).join('');
const viewpoints:readonly (readonly [string,CubeVector])[]=[['Overview',[1.35,-1.8,1.25]],['Opposite',[-1.35,1.8,-1.25]],['Edge',[1,1,0]],['Corner',[1,1,1]]];
export function CubeDevelopmentPreview(){
 const query=new URLSearchParams(location.search),[n,setN]=useState<128|256>(query.get('n')==='256'?256:128),[backend,setBackend]=useState<CubeBackend>(query.get('backend')==='canvas'?'canvas':'auto'),[mode,setMode]=useState<CubeDisplayMode>('physical');
 const scene=useRef<CubePresentation|undefined>(undefined),terrain=useRef<SolidCubeTerrain|undefined>(undefined),cpu=useRef<HTMLCanvasElement>(null),gpu=useRef<HTMLCanvasElement>(null),viewport=useRef<HTMLDivElement>(null),readout=useRef<HTMLOutputElement>(null);
 const [snapshot,setSnapshot]=useState<ReturnType<CubePresentation['snapshot']>>(),[error,setError]=useState(''),baseline=useRef({hash:'',revision:0}),pointers=useRef(new Map<number,{x:number;y:number}>());
 const backendRef=useRef(backend),modeRef=useRef(mode);backendRef.current=backend;modeRef.current=mode;
 useEffect(()=>{
  let alive=true;const started=performance.now();setSnapshot(undefined);setError('');terrain.current=undefined;
  void(async()=>{try{
   const source=await createCubeDemonstration(n,undefined,()=>alive);if(!alive)return;const seeded=performance.now();terrain.current=source;const hash=await fingerprint(source);if(!alive)return;baseline.current={hash,revision:source.revision};
   const current=new CubePresentation(source,cpu.current!,gpu.current!,()=>{if(alive)setSnapshot(current.snapshot());},{backend:backendRef.current,failShader:query.get('fail')==='shader',started,seedMs:seeded-started,identityVerificationMs:performance.now()-seeded});scene.current=current;current.mode=modeRef.current;
   const box=viewport.current!.getBoundingClientRect();current.resize(box);await current.refresh();
  }catch(e){if(alive)setError(String(e));}})();
  return()=>{alive=false;scene.current?.dispose();scene.current=undefined;terrain.current=undefined;};
  // Resolution owns the demonstration lifetime; other controls retain its authority.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[n]);
 useEffect(()=>{scene.current?.setBackend(backend);},[backend]);
 useEffect(()=>{const observer=new ResizeObserver(entries=>{const box=entries[0]?.contentRect;if(box)scene.current?.resize(box);});observer.observe(viewport.current!);return()=>observer.disconnect();},[]);
 useEffect(()=>{const element=viewport.current!;const wheel=(event:WheelEvent)=>{event.preventDefault();const current=scene.current;if(current?.mode==='physical')current.setView({...current.camera,zoom:Math.max(.65,Math.min(3,current.camera.zoom*Math.exp(-Math.max(-200,Math.min(200,event.deltaY))*.002)))});};element.addEventListener('wheel',wheel,{passive:false});return()=>element.removeEventListener('wheel',wheel);},[]);
 useEffect(()=>{window.__cubeD1={snapshot:()=>scene.current?.snapshot(),probe:(face,u,v)=>scene.current?.sample(face,u,v),verifySource:async()=>{const source=terrain.current;if(!source)throw Error('Cube not ready');const after=await fingerprint(source),before=baseline.current;return{before:before.hash,after,revisionBefore:before.revision,revisionAfter:source.revision,exact:after===before.hash&&before.revision===source.revision};}};return()=>{delete window.__cubeD1;};},[]);
 const view=(direction:CubeVector)=>{const current=scene.current;if(current){current.setView(cubeCamera(direction,current.camera.zoom),mode);}};
 const selectMode=(value:CubeDisplayMode)=>{setMode(value);const current=scene.current;if(current)current.setView(current.camera,value);};
 const zoom=(factor:number)=>{const current=scene.current;if(current)current.setView({...current.camera,zoom:Math.max(.65,Math.min(3,current.camera.zoom*factor))});};
 const inspect=(x:number,y:number)=>{const current=scene.current;if(!current)return;const size=viewport.current!.getBoundingClientRect(),l=cubeLayout(current.camera,mode,size),sx=(x-size.left-l.x)/l.scale,sy=(l.y-(y-size.top))/l.scale,hit=mode==='net'?cubeNetHit(sx+.5,sy):cubeRayHit(sx,sy,current.camera),sample=hit&&current.sample(hit.face,hit.u,hit.v);if(readout.current)readout.current.textContent=hit&&sample?`${CUBE_FACE_LABELS[hit.face]} · ${Math.round(sample.height).toLocaleString()} m · U ${(hit.u*500_000).toFixed(0)} / V ${(hit.v*500_000).toFixed(0)} m`:'Move over terrain to inspect elevation';};
 const point=(event:React.PointerEvent<HTMLDivElement>)=>({x:event.clientX,y:event.clientY});
 const labels=snapshot&&mode==='net'?SOLID_CUBE_FACES.map(face=>{const p=projectCube(face,0,0,snapshot.camera,mode,snapshot.viewport);return<span key={face} className="cube-face-label" style={{left:p.x,top:p.y}}>{CUBE_FACE_LABELS[face]}<small>U {CUBE_NET[face].u[0]===1?'→':CUBE_NET[face].u[0]===-1?'←':CUBE_NET[face].u[1]===1?'↑':'↓'} · V {CUBE_NET[face].v[0]===1?'→':CUBE_NET[face].v[0]===-1?'←':CUBE_NET[face].v[1]===1?'↑':'↓'}</small></span>;}):null;
 return <main className="cube-development" data-ready={snapshot?.completeMs!==undefined} data-backend={snapshot?.backend??'preparing'}>
  <aside className="cube-sidebar"><a className="cube-brand" href="/" target="_blank" rel="noopener">SERRIAN TIDE <span>ATLAS</span></a><div className="cube-eyebrow">DEVELOPMENT / CUBE-D1</div><h1>A world,<br/>on six planes.</h1><p className="cube-intro">A physical cube. One continuous geography.<br/>An invitation to look around.</p><p className="cube-readonly">Read-only demonstration</p>
   <section aria-label="Viewing mode"><h2>Explore the surface</h2><div className="cube-segment"><button aria-pressed={mode==='physical'} onClick={()=>selectMode('physical')}>3D cube</button><button aria-pressed={mode==='net'} onClick={()=>selectMode('net')}>Unfolded map</button></div><p className="cube-hint">{mode==='physical'?'Drag to orbit. Scroll or pinch to zoom. Arrow keys rotate; Home recenters.':'Six connected panels, unfolded along five physical edges. The remaining edges meet when folded.'}</p></section>
   <section><h2>Viewpoints</h2><div className="cube-presets">{viewpoints.map(([label,direction])=><button key={label} disabled={mode==='net'} onClick={()=>view(direction)}>{label}</button>)}</div><div className="cube-face-buttons">{SOLID_CUBE_FACES.map(face=><button key={face} aria-label={`View ${CUBE_FACE_LABELS[face]} face`} disabled={mode==='net'} onClick={()=>view(SOLID_CUBE_FRAMES[face].normal)}>{CUBE_FACE_LABELS[face]}</button>)}</div></section>
   <section className="cube-options"><label>Numerical detail<select aria-label="Cube resolution" value={n} onChange={e=>setN(Number(e.target.value) as 128|256)}><option value="128">N128 · 98,306 shared vertices</option><option value="256">N256 · 393,218 shared vertices</option></select></label><label>Rendering<select aria-label="Cube renderer" value={backend} onChange={e=>setBackend(e.target.value as CubeBackend)}><option value="auto">Automatic · WebGL2 preferred</option><option value="canvas">Canvas fallback · no WebGL drawing</option></select></label></section>
   <div className="cube-legend"><h2>Elevation above sea level</h2><div className="cube-ramp"/><div><span>−2,700 m</span><span>0</span><span>4,800 m</span></div><p>Color and relief show numerical elevation. The reference faces remain flat.</p></div>
   <details className="cube-diagnostics"><summary>Preview details</summary><p>One exterior surface · 1,000 km per edge. Synthetic coastlines, folded mountain ridges and valleys. No painting, saves or conversion.</p><p>{snapshot?.backend??'Preparing demonstration'}{snapshot?.gpu.software?' · software graphics':''}<br/>First terrain: {snapshot?.firstVisibleMs?.toFixed(0)??'…'} ms · full detail: {snapshot?.completeMs?.toFixed(0)??'…'} ms</p></details>
  </aside>
  <div className="cube-stage"><header><span>CUBE-D1 / READ-ONLY</span><span>{mode==='physical'?'Exterior / orbital view':'Exterior / connected net'}</span></header>
   <div className="cube-viewport" ref={viewport} role="application" aria-label="Read-only physical cube preview" tabIndex={0}
    onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,point(e));}}
    onPointerMove={e=>{const current=scene.current,old=pointers.current.get(e.pointerId);if(!current||!old){inspect(e.clientX,e.clientY);return;}const before=[...pointers.current.values()];pointers.current.set(e.pointerId,point(e));const after=[...pointers.current.values()];if(before.length===2){const a=Math.hypot(before[0]!.x-before[1]!.x,before[0]!.y-before[1]!.y),b=Math.hypot(after[0]!.x-after[1]!.x,after[0]!.y-after[1]!.y);if(a>4)zoom(b/a);}else if(mode==='physical')current.setView(rotateCube(current.camera,(e.clientX-old.x)/180,(e.clientY-old.y)/180));}}
    onPointerUp={e=>pointers.current.delete(e.pointerId)} onPointerCancel={e=>pointers.current.delete(e.pointerId)} onLostPointerCapture={e=>pointers.current.delete(e.pointerId)}
    onKeyDown={e=>{const current=scene.current;if(!current)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','=','-'].includes(e.key)){e.preventDefault();if(e.key==='Home')current.setView(cubeCamera());else if(['+','=','-'].includes(e.key))zoom(e.key==='-'?1/1.2:1.2);else if(mode==='physical')current.setView(rotateCube(current.camera,e.key==='ArrowLeft'?-.16:e.key==='ArrowRight'?.16:0,e.key==='ArrowUp'?-.16:e.key==='ArrowDown'?.16:0));}}}>
    <canvas ref={cpu} className="cube-canvas" aria-label="Cube Canvas2D terrain"/><canvas ref={gpu} className="cube-canvas" aria-label="Cube WebGL2 terrain"/>{labels}
    {!snapshot?.firstVisibleMs&&<div className="cube-loading" role="status"><span/>Preparing your first view…</div>}
    <div className="cube-canvas-controls"><button aria-label="Zoom out" disabled={mode==='net'} onClick={()=>zoom(1/1.2)}>−</button><button aria-label="Zoom in" disabled={mode==='net'} onClick={()=>zoom(1.2)}>+</button><button onClick={()=>scene.current?.setView(cubeCamera(),mode)}>Recenter</button></div>
   </div>
   <footer><output ref={readout}>Move over terrain to inspect elevation</output><span role="status">{error||snapshot?.error||(!snapshot?'Preparing geography':snapshot.completeMs!==undefined?`N${n} · ${snapshot.backend}`:`Terrain visible · refining N${n}`)}</span></footer>
  </div>
 </main>;
}
