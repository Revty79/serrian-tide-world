import {useEffect,useImperativeHandle,useRef,useState,type Ref,type ReactNode} from 'react';
import {CubeEditorSession} from '../editor/cube-editor-session.ts';
import {createSolidCubeTerrain} from '../terrain/solid-cube.ts';
import type {CubeBrushSettings} from '../terrain/solid-cube-brush.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import {DEFAULT_ADDITIVE_STRENGTH_METERS} from '../editor/brush-defaults.ts';
import {pointerSamples} from '../interaction/pointer-samples.ts';
import {CubePresentation,type CubeBackend} from '../rendering/solid-cube-presentation.ts';
import {cubeCamera,cubeLayout,cubeRayHit,cubeNetHit,projectCube,rotateCube,type CubeDisplayMode} from '../rendering/solid-cube-view.ts';
import {cubeFootprint,type CubeFootprintLine} from '../rendering/solid-cube-footprint.ts';
import {SOLID_CUBE_FACES,SOLID_CUBE_FRAMES,cubeDot,type SolidCubeFace,type CubeVector} from '../surfaces/solid-cube.ts';
import type {SphericalViewportHandle,SphericalWorkspaceView} from './SphericalViewport.tsx';
import './CubeDevelopmentPreview.css';
import './CubeEditor.css';

type Point={x:number;y:number};type Tool='raise'|'lower'|'smooth'|'flatten'|'navigate';
const labels={px:'+X',nx:'−X',py:'+Y',ny:'−Y',pz:'+Z',nz:'−Z'};
declare global {interface Window {__cubeEditor?:{snapshot:()=>unknown;words:()=>number[];project:(face:SolidCubeFace,u:number,v:number)=>Point;hash:()=>Promise<string>}}}
export function CubeEditor({session,workspace,handleRef}:{session:CubeEditorSession;workspace?:(view:SphericalWorkspaceView)=>ReactNode;handleRef?:Ref<SphericalViewportHandle>}){
 const source=session.terrain,n=source.metadata.representation.cellsPerEdge,length=source.metadata.geometry.sideLengthMeters;
 const viewport=useRef<HTMLDivElement>(null),cpu=useRef<HTMLCanvasElement>(null),gpu=useRef<HTMLCanvasElement>(null),overlay=useRef<SVGSVGElement>(null),cursor=useRef<SVGCircleElement>(null),contour=useRef<SVGPathElement>(null),readout=useRef<HTMLOutputElement>(null);
 const scene=useRef<CubePresentation|undefined>(undefined),[,update]=useState(0),[ready,setReady]=useState(false),[tool,setTool]=useState<Tool>('raise'),[radius,setRadius]=useState(length*.045),[strength,setStrength]=useState(DEFAULT_ADDITIVE_STRENGTH_METERS),[intensity,setIntensity]=useState(.45),[target,setTarget]=useState(0),[mode,setMode]=useState<CubeDisplayMode>('physical'),[backend,setBackend]=useState<CubeBackend>(new URLSearchParams(location.search).get('backend')==='canvas'?'canvas':'auto');
 const controls=useRef({tool,radius,strength,intensity,target});controls.current={tool,radius,strength,intensity,target};
 const commands=useRef({finish(){},cancel(){},zoom(_factor:number){},view(_direction?:CubeVector,_mode?:CubeDisplayMode){}});
 useImperativeHandle(handleRef,()=>({finishInteraction:()=>commands.current.finish(),stop:()=>commands.current.cancel(),undo:()=>{commands.current.cancel();void session.replay();},redo:()=>{commands.current.cancel();void session.replay(true);}}),[session]);
 useEffect(()=>{
  setReady(false);
  let alive=true,space=false,active:'none'|'paint'|'navigate'|'touch-pending'='none',paintId=-1,pendingTimer=0,hoverSerial=0,hoverTimer=0,lastPoint:Point|undefined,hover:Point|undefined,lines:CubeFootprintLine[]=[],touchIntent:Point[]=[],pen=false,uiFrame=0,lastUi=0,signature='',footprintKey='',lastOutline='',footprintBusy=false,lastFootprintAt=0,latestFootprint:SurfacePosition|undefined;
  const interaction={cursorEvents:0,cursorMaxMs:0,footprintRequests:0,footprintCompleted:0,footprintCancelled:0,footprintMaxMs:0,footprintMs:[] as number[]};
  const pointers=new Map<number,Point>(),element=viewport.current!,size=()=>({width:element.clientWidth,height:element.clientHeight});
  const changed=()=>{if(!alive||uiFrame)return;uiFrame=requestAnimationFrame(()=>{uiFrame=0;if(!alive)return;const now=performance.now(),key=JSON.stringify([session.modified,session.processing,session.error,session.needsRecovery,session.history.canUndo,session.history.canRedo,current.metrics.error]);if(key!==signature||session.processing&&now-lastUi>=100){signature=key;lastUi=now;update(v=>v+1);}drawFootprint();});};session.changed=changed;
  const current=new CubePresentation(source,cpu.current!,gpu.current!,changed,{editor:true,backend,verifyPixels:new URLSearchParams(location.search).get('verifyPixels')==='1'});scene.current=current;current.resize(size());
  session.published=publication=>current.queuePublication(publication);
  const pick=(point:Point)=>{const l=cubeLayout(current.camera,current.mode,size()),x=(point.x-l.x)/l.scale,y=(l.y-point.y)/l.scale,hit=current.mode==='net'?cubeNetHit(x+.5,y):cubeRayHit(x,y,current.camera);return hit?{...source.metadata.identity,patchId:hit.face,u:hit.u*length/2,v:hit.v*length/2}:undefined;};
  const local=(event:PointerEvent)=>{const r=element.getBoundingClientRect();return{x:event.clientX-r.left,y:event.clientY-r.top};};
  function drawFootprint(){if(!contour.current)return;const commands:string[]=[];
   for(const line of lines){if(current.mode==='physical'&&cubeDot(SOLID_CUBE_FRAMES[line.face].normal,current.camera.forward)<=0)continue;const a=projectCube(line.face,line.u,line.v,current.camera,current.mode,size()),b=projectCube(line.face,line.u2,line.v2,current.camera,current.mode,size());commands.push(`M${a.x},${a.y}L${b.x},${b.y}`);}
   const value=commands.join('');if(value!==lastOutline){lastOutline=value;contour.current.setAttribute('d',value);}}
  const requestFootprint=()=>{if(!alive||footprintBusy||hoverTimer||!latestFootprint)return;hoverTimer=window.setTimeout(()=>{hoverTimer=0;if(!latestFootprint||!alive)return;const hit=latestFootprint,serial=hoverSerial,radius=controls.current.radius,started=performance.now();lastFootprintAt=started;footprintBusy=true;interaction.footprintRequests++;
   void cubeFootprint(source,hit,radius,()=>alive&&serial===hoverSerial).then(result=>{if(alive&&serial===hoverSerial){lines=result;interaction.footprintCompleted++;drawFootprint();}else interaction.footprintCancelled++;}).catch(()=>{if(alive&&serial===hoverSerial&&readout.current)readout.current.textContent='Brush outline unavailable here. Terrain drawing remains available.';}).finally(()=>{footprintBusy=false;const ms=performance.now()-started;interaction.footprintMaxMs=Math.max(interaction.footprintMaxMs,ms);if(interaction.footprintMs.length===240)interaction.footprintMs.shift();interaction.footprintMs.push(ms);if(alive&&serial!==hoverSerial)requestFootprint();});
  },Math.max(0,40-(performance.now()-lastFootprintAt)));};
  const inspect=(point:Point)=>{const started=performance.now();hover=point;const hit=pick(point);if(cursor.current){cursor.current.style.display=hit?'':'none';cursor.current.setAttribute('cx',String(point.x));cursor.current.setAttribute('cy',String(point.y));}interaction.cursorEvents++;interaction.cursorMaxMs=Math.max(interaction.cursorMaxMs,performance.now()-started);
   if(hit){const column=Math.round((hit.u/length+.5)*n),row=Math.round((hit.v/length+.5)*n),height=source.read(source.resolve({...hit,column,row}));if(readout.current)readout.current.textContent=`${labels[hit.patchId as SolidCubeFace]} · ${height.toLocaleString(undefined,{maximumFractionDigits:1})} m · ${(controls.current.radius/1000).toFixed(1)} km brush`;}
   const key=hit?JSON.stringify([hit.patchId,hit.u,hit.v,controls.current.radius]):'';if(key===footprintKey)return;footprintKey=key;
   ++hoverSerial;latestFootprint=hit;if(!hit){clearTimeout(hoverTimer);hoverTimer=0;lines=[];drawFootprint();return;}requestFootprint();
  };
  const paintSettings=():CubeBrushSettings=>{const c=controls.current;return c.tool==='smooth'?{version:1,tool:'smooth',radiusMeters:c.radius,intensity:c.intensity}:c.tool==='flatten'?{version:1,tool:'flatten',radiusMeters:c.radius,intensity:c.intensity,targetElevation:c.target}:{version:1,tool:c.tool==='lower'?'lower':'raise',radiusMeters:c.radius,strengthMeters:c.strength};};
  const startPaint=(point:Point,inputTime=performance.now())=>{const hit=pick(point);if(!hit||!session.begin(hit,paintSettings(),{},inputTime))return false;lastPoint=point;return true;};
  const finish=()=>{clearTimeout(pendingTimer);if(active==='touch-pending')touchIntent=[];active='none';lastPoint=undefined;session.release();};
  const cancel=()=>{clearTimeout(pendingTimer);touchIntent=[];active='none';lastPoint=undefined;session.cancel();};
  const feed=(point:Point,terminal=false,inputTime=performance.now())=>{
   if(!lastPoint||!session.painting)return;const distance=Math.hypot(point.x-lastPoint.x,point.y-lastPoint.y);if(!terminal&&distance<3)return;
   const hit=pick(point);if(!hit){finish();return;}
   // A straight screen segment must remain on the connected rendered surface.
   // Gaps in the net and its cut edges end the gesture; no teleport across cuts.
   let previous=pick(lastPoint);for(let i=1;i<=Math.ceil(distance/2);i++){
    const t=i/Math.ceil(distance/2),sample=pick({x:lastPoint.x+(point.x-lastPoint.x)*t,y:lastPoint.y+(point.y-lastPoint.y)*t});
    if(!sample){finish();return;}
    if(current.mode==='net'&&previous&&sample.patchId!==previous.patchId){const a=source.geometry.referencePosition(previous),b=source.geometry.referencePosition(sample);if(Math.hypot(...a.map((v,k)=>v-b[k]!))>length*.08){finish();return;}}previous=sample;
   }
   if(distance>0)session.accept(hit,inputTime);lastPoint=point;
  };
  const navigate=(before:Point,after:Point)=>{if(current.mode==='net')current.setView({...current.camera,netX:Math.max(-size().width*3,Math.min(size().width*3,(current.camera.netX??0)+after.x-before.x)),netY:Math.max(-size().height*3,Math.min(size().height*3,(current.camera.netY??0)+after.y-before.y))});else current.setView(rotateCube(current.camera,(before.x-after.x)/180,(after.y-before.y)/180));};
  const zoom=(factor:number)=>{finish();const camera=current.camera;if(current.mode==='net')current.setView({...camera,netZoom:Math.max(.65,Math.min(6,(camera.netZoom??1)*factor))});else current.setView({...camera,zoom:Math.max(.65,Math.min(3,camera.zoom*factor))});if(hover)inspect(hover);};
  const down=(event:PointerEvent)=>{
   if(event.button!==0&&event.button!==1&&event.button!==2||session.locked||!readyRef)return;if(event.pointerType==='touch'&&pen)return;
   event.preventDefault();element.focus();const point=local(event);pointers.set(event.pointerId,point);element.setPointerCapture(event.pointerId);inspect(point);
   if(pointers.size>1){clearTimeout(pendingTimer);if(active==='paint')session.cancel();active='navigate';touchIntent=[];return;}
   pen=event.pointerType==='pen';paintId=event.pointerId;
   if(space||controls.current.tool==='navigate'||event.button!==0){active='navigate';return;}
   if(event.pointerType==='touch'){active='touch-pending';touchIntent=[point];pendingTimer=window.setTimeout(()=>{if(active==='touch-pending'){active=startPaint(touchIntent[0]!)?'paint':'none';for(const p of touchIntent.slice(1))feed(p);touchIntent=[];}},110);}
   else active=startPaint(point,event.timeStamp)?'paint':'none';
  };
  const move=(event:PointerEvent)=>{const point=local(event),old=pointers.get(event.pointerId);inspect(point);if(!old)return;
   const before=[...pointers.values()];pointers.set(event.pointerId,point);const after=[...pointers.values()];
   if(active==='navigate'){if(before.length===2){const a=Math.hypot(before[0]!.x-before[1]!.x,before[0]!.y-before[1]!.y),b=Math.hypot(after[0]!.x-after[1]!.x,after[0]!.y-after[1]!.y);if(a>4){const camera=current.camera;if(current.mode==='net')current.setView({...camera,netZoom:Math.max(.65,Math.min(6,(camera.netZoom??1)*b/a))});else current.setView({...camera,zoom:Math.max(.65,Math.min(3,camera.zoom*b/a))});}navigate({x:(before[0]!.x+before[1]!.x)/2,y:(before[0]!.y+before[1]!.y)/2},{x:(after[0]!.x+after[1]!.x)/2,y:(after[0]!.y+after[1]!.y)/2});}else navigate(old,point);}
   else if(event.pointerId===paintId&&active==='paint')for(const sample of pointerSamples(event))feed(local(sample),false,sample.timeStamp);
   else if(active==='touch-pending'&&touchIntent.length<128)touchIntent.push(point);
  };
  const up=(event:PointerEvent)=>{if(!pointers.has(event.pointerId))return;const point=local(event);
   if(active==='touch-pending'){clearTimeout(pendingTimer);if(startPaint(touchIntent[0]??point)){for(const p of touchIntent.slice(1))feed(p);feed(point,true);}touchIntent=[];session.release();active='none';}
   else if(active==='paint'&&event.pointerId===paintId){feed(point,true,event.timeStamp);finish();}
   pointers.delete(event.pointerId);if(!pointers.size){active='none';pen=false;}if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);
  };
  const lost=(event:PointerEvent)=>{if(pointers.has(event.pointerId)){pointers.delete(event.pointerId);cancel();pen=false;}};
  const wheel=(event:WheelEvent)=>{event.preventDefault();zoom(Math.exp(-Math.max(-200,Math.min(200,event.deltaY))*.002));};
  const key=(event:KeyboardEvent)=>{if(event.target instanceof HTMLInputElement||event.target instanceof HTMLSelectElement)return;if(event.code==='Space'){event.preventDefault();finish();space=true;}if(event.key==='Escape')finish();if(!workspace&&(event.ctrlKey||event.metaKey)&&['z','y'].includes(event.key.toLowerCase())){event.preventDefault();cancel();void session.replay(event.shiftKey||event.key.toLowerCase()==='y');}};
  const keyup=(event:KeyboardEvent)=>{if(event.code==='Space')space=false;};const blur=()=>{pointers.clear();space=false;cancel();};
  let readyRef=false;
  session.visualize=async()=>{await current.refresh('interactive');if(!alive)return;const preparedAt=performance.now();
   await new Promise<void>(resolve=>requestAnimationFrame(()=>{current.present();resolve();}));
   if(current.metrics.error)throw Error('Terrain is retained, but display refresh failed. Retry by changing Rendering.');return{revision:current.metrics.displayedRevision,preparedAt};
  };
  void current.refresh().then(async()=>{
   // First Canvas pixels precede driver initialization. Keep the visible loading
   // state until that one-time work finishes, rather than freezing a first stroke.
   while(alive&&!current.metrics.error&&(current.metrics.firstVisibleMs===undefined||backend==='auto'&&current.metrics.gpuInitializationStartedMs<0))await new Promise<void>(r=>requestAnimationFrame(()=>r()));
   if(alive){readyRef=!current.metrics.error;setReady(true);}
  });
  const observer=new ResizeObserver(()=>{current.resize(size());drawFootprint();});observer.observe(element);
  commands.current={finish,cancel,zoom,view:(direction,nextMode)=>{finish();const selected=nextMode??current.mode;current.setView(direction?cubeCamera(direction):cubeCamera(),selected);setMode(selected);if(hover)inspect(hover);}};
  window.__cubeEditor={snapshot:()=>({editor:session.snapshot(),display:current.snapshot(),interaction:structuredClone(interaction)}),words:()=>Array.from(new Uint32Array(source.copyElevations().buffer)),hash:async()=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',source.copyElevations().buffer as ArrayBuffer))).map(v=>v.toString(16).padStart(2,'0')).join(''),project:(face,u,v)=>{const r=element.getBoundingClientRect(),p=projectCube(face,u,v,current.camera,current.mode,size());return{x:p.x+r.left,y:p.y+r.top};}};
  element.addEventListener('pointerdown',down);element.addEventListener('pointermove',move);element.addEventListener('pointerup',up);element.addEventListener('pointercancel',lost);element.addEventListener('lostpointercapture',lost);element.addEventListener('wheel',wheel,{passive:false});element.addEventListener('contextmenu',preventContext);window.addEventListener('keydown',key);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
  return()=>{alive=false;hoverSerial++;cancelAnimationFrame(uiFrame);clearTimeout(pendingTimer);clearTimeout(hoverTimer);observer.disconnect();session.release();session.changed=()=>{};session.published=()=>{};session.visualize=async()=>{};current.dispose();scene.current=undefined;delete window.__cubeEditor;element.removeEventListener('pointerdown',down);element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',lost);element.removeEventListener('lostpointercapture',lost);element.removeEventListener('wheel',wheel);element.removeEventListener('contextmenu',preventContext);window.removeEventListener('keydown',key);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);};
  // The editor owns the source lifetime; controls are read from a current ref.
 },[session]);
 useEffect(()=>{scene.current?.setBackend(backend);},[backend]);
 const choose=(next:Tool)=>{commands.current.finish();setTool(next);};
 const tools=<div className="cube-brush-settings"><label>Brush radius (m)<input aria-label="Brush radius (m)" type="range" min={length/n*2} max={length*.3} step={length/n/4} value={radius} onChange={e=>{commands.current.finish();setRadius(Number(e.target.value));}}/><output>{Math.round(radius).toLocaleString()} m</output></label>
  {(tool==='raise'||tool==='lower')?<label>Strength (m per dab)<input aria-label="Brush strength (m)" type="number" min="1" max="10000" value={strength} onChange={e=>{commands.current.finish();setStrength(Math.max(1,Math.min(10000,Number(e.target.value))));}}/></label>:<label>Intensity<input aria-label="Brush intensity" type="range" min="0" max="1" step=".01" value={intensity} onChange={e=>{commands.current.finish();setIntensity(Number(e.target.value));}}/></label>}
  {tool==='flatten'&&<label>Target elevation (m)<input aria-label="Flatten elevation (m)" type="number" value={target} onChange={e=>{commands.current.finish();setTarget(Math.max(-100000,Math.min(100000,Number(e.target.value))));}}/></label>}
  <p className="hint">Drag to sculpt. Navigate or Space + drag to orbit / pan. Wheel or two fingers to zoom. Unfolded cut edges end a stroke; rotate the cube to paint across them.</p>
  <label>Rendering<select aria-label="Cube renderer" value={backend} onChange={e=>{commands.current.finish();setBackend(e.target.value as CubeBackend);}}><option value="auto">Automatic</option><option value="canvas">Canvas fallback</option></select></label>
 </div>;
 const picker=<>{(['navigate','raise','lower','smooth','flatten'] as const).map(t=><button key={t} aria-pressed={tool===t} onClick={()=>choose(t)}>{t[0]!.toUpperCase()+t.slice(1)}</button>)}</>;
 const navigation=<><button aria-pressed={mode==='physical'} onClick={()=>commands.current.view(undefined,'physical')}>3D cube</button><button aria-pressed={mode==='net'} onClick={()=>commands.current.view(undefined,'net')}>Unfolded map</button><button aria-label="Zoom out" onClick={()=>commands.current.zoom(1/1.2)}>−</button><button aria-label="Zoom in" onClick={()=>commands.current.zoom(1.2)}>+</button><button onClick={()=>commands.current.view()}>Recenter</button></>;
 const history=<><button disabled={session.processing||!session.history.canUndo} onClick={()=>void session.replay()}>Undo</button><button disabled={session.processing||!session.history.canRedo} onClick={()=>void session.replay(true)}>Redo</button></>;
 const displayFailure=scene.current?.metrics.error&&!scene.current.metrics.error.startsWith('Terrain changed;')?scene.current.metrics.error:'';
 return <section className={`cube-editor ${workspace?'cube-integrated':'cube-development'}`} data-ready={ready} data-processing={session.processing}>
  {workspace?workspace({tools,toolPicker:picker,navigation,canUndo:session.history.canUndo,canRedo:session.history.canRedo,processing:session.processing}):<aside className="cube-sidebar"><a className="cube-brand" href="/">SERRIAN TIDE <span>ATLAS</span></a><h1>Sculpt a world.</h1><p>Solid cube · N{n}</p><section className="cube-editor-picker">{picker}</section>{tools}<section className="cube-editor-nav">{navigation}</section><section>{history}</section><p className="hint">Cube-E working session. Save/Open arrives in Cube-F. Keep this tab open to retain this drawing.</p></aside>}
  <div className="cube-stage"><header><span>{session.name} · N{n}</span><div className="cube-face-buttons"><button onClick={()=>commands.current.view([1,1,1],'physical')}>Corner</button>{SOLID_CUBE_FACES.map(face=><button key={face} aria-label={`View ${labels[face]} face`} onClick={()=>commands.current.view(SOLID_CUBE_FRAMES[face].normal,'physical')}>{labels[face]}</button>)}</div></header>
   <div ref={viewport} className={`cube-viewport ${tool==='navigate'?'':'cube-paint-mode'}`} role="application" aria-label="Solid cube terrain editor" tabIndex={0}>
    <canvas ref={cpu} className="cube-canvas" aria-label="Cube Canvas2D terrain"/><canvas ref={gpu} className="cube-canvas" aria-label="Cube WebGL2 terrain"/>
    <svg ref={overlay} className="cube-brush-overlay" aria-hidden="true"><path ref={contour}/><circle ref={cursor} r="3" style={{display:'none'}}/></svg>
    {!ready&&!displayFailure&&<div className="cube-loading" role="status"><span/>Preparing your cube…</div>}
   </div>
   <footer><output ref={readout}>Move over terrain to inspect</output><span role="status" aria-label="Cube drawing status">{session.processing?`${session.status} · ${session.core.stroke?.statistics.committedDabs??session.core.lastStroke?.statistics.committedDabs??0} dabs · ${session.pendingPoints} queued · ${session.core.stroke?.statistics.acceptedInputs??session.core.lastStroke?.statistics.acceptedInputs??0}/${session.gestureInputLimit} points${(session.core.stroke?.statistics.acceptedInputs??0)>=session.gestureInputLimit*.75?' · Release soon to start a new stroke':''}`:session.status}</span></footer>
  </div>
  {(session.error||displayFailure)&&<div className="cube-edit-error" role="alert"><p>{session.error||`Display unavailable: ${displayFailure}. Your numerical geography is retained. You can use New World or Open Map from Atlas tools.`}</p>{session.needsRecovery&&<><button disabled={session.processing||!session.history.canUndo} onClick={()=>void session.replay()}>Undo stopped stroke</button><button disabled={session.processing} onClick={()=>session.keepPartial()}>Keep partial result</button></>}</div>}
 </section>;
}
function preventContext(event:Event){event.preventDefault();}
export function CubeEditorDevelopment(){
 const query=new URLSearchParams(location.search),[session,setSession]=useState<CubeEditorSession>();
 useEffect(()=>{const terrain=createSolidCubeTerrain({terrainId:crypto.randomUUID(),cellsPerEdge:query.get('n')==='256'?256:128,geometry:{identity:{worldId:crypto.randomUUID(),surfaceId:crypto.randomUUID()},provider:'physical-solid-cube',version:1,configuration:'solid',role:'exterior',sideLengthMeters:1_000_000}}),editor=new CubeEditorSession(terrain,'Untitled cube');setSession(editor);return()=>editor.dispose();},[]);
 return session?<CubeEditor session={session}/>:<p>Preparing cube…</p>;
}
