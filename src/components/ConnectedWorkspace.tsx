 'use client';
import {cross3,unitDirection,type Vec3} from '../surfaces/cube-sphere.ts';
import {settledRasterBudget} from '../rendering/raster-quality.ts';
import type {SurfacePosition} from '../surfaces/contracts.ts';
import {Profiler,useLayoutEffect,useRef,useState,useImperativeHandle,useMemo,type ReactNode,type Ref} from 'react';
import {recordPaintingStage,recordPaintingEvent} from '../editor/painting-metrics.ts';
import type {ConnectedPreviewSession} from '../editor/connected-preview-session.ts';
import type {ConnectedStencil} from '../editor/connected-session-contracts.ts';
import type {CylinderControls} from '../editor/cylinder-controls.ts';
import {attachSphericalEditing as attachSurfaceEditing} from '../interaction/spherical-editing.ts';
import {cylinderCenterInspection,type CylinderView,type CylinderScreenPoint,type CylinderViewport} from '../rendering/cylindrical-view.ts';
import type {CoherentTerrainRaster,TerrainRasterUpdate} from '../rendering/coherent-terrain-raster.ts';
import {rasterRegions} from '../rendering/coherent-terrain-raster.ts';
import {surfaceDisplayDimensions} from '../rendering/surface-renderer.ts';
import type {CylinderAppearance} from '../rendering/cylindrical-elevation.ts';
import type {ConnectedWorkspaceAdapter,WorkspaceTerrain} from './connected-workspace-contracts.ts';
import './CylinderPreview.css';
type Inspection={snapshot(includeWords?:boolean):object;project(p:{patchId:string;u:number;v:number}):CylinderScreenPoint|undefined;sample(index:number):object};
let inspection:Inspection|undefined;
export function connectedWorkspaceInspection(){if(!import.meta.env.DEV||!inspection)throw Error('Physical preview is not ready.');return inspection;}
export interface ConnectedViewportHandle<V extends CylinderView=CylinderView> { finishInteraction(): void; stop(): void; undo(): void; redo(): void;getView?():V;restoreView?(view:V):void;editView?():void;returnToEditing?():void;viewInside?():void;readPixel?(point:CylinderScreenPoint):number[];focusPosition?(p:SurfacePosition):void;preparePick?():void;setInspectionEye?(eye:Vec3,forward?:Vec3):void }
export interface ConnectedWorkspaceView { inspecting?:boolean;tools: ReactNode; toolPicker: ReactNode; navigation: ReactNode; canUndo: boolean; canRedo: boolean; processing: boolean }
export interface ConnectedWorkspaceProps<T extends WorkspaceTerrain,V extends CylinderView,Scene>{session:ConnectedPreviewSession<T,V>;adapter:ConnectedWorkspaceAdapter<T,V,Scene>;preparationMs?:number;detail?:number;setDetail?(n:number):void;replace?():void;workspace?(view:ConnectedWorkspaceView):ReactNode;handleRef?:Ref<ConnectedViewportHandle<V>>;excavation?:Scene;annotations?:readonly{id:string;position:SurfacePosition;label:string}[];onPick?:(p:SurfacePosition)=>void;mapControls?:ReactNode;readOnly?:boolean;previewRadius?:number;surfaceRole?:'exterior'|'interior';initialView?:V;onViewChange?:(view:V)=>void;onWorkspaceView?:(view:ConnectedWorkspaceView)=>void;sharedControls?:{value:CylinderControls;change:(value:CylinderControls|((previous:CylinderControls)=>CylinderControls))=>void}}
export function ConnectedWorkspace<T extends WorkspaceTerrain,V extends CylinderView,Scene>({session,adapter,preparationMs=0,detail=128,setDetail=()=>{},replace=()=>{},workspace,handleRef,surfaceRole,initialView,onViewChange,onWorkspaceView,sharedControls,excavation,annotations,onPick,mapControls,previewRadius,readOnly}:ConnectedWorkspaceProps<T,V,Scene>){
  const root = useRef<HTMLElement>(null), canvas = useRef<HTMLCanvasElement>(null), gpuCanvas = useRef<HTMLCanvasElement>(null), pointer = useRef<HTMLDivElement>(null), overlay = useRef<HTMLCanvasElement>(null), readout = useRef<HTMLOutputElement>(null), toggle = useRef<HTMLButtonElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const [ownControls, setOwnControls] = useState<CylinderControls>(() => adapter.defaultControls());const controls=sharedControls?.value??ownControls,setControls=sharedControls?.change??setOwnControls, controlsRef = useRef(controls); controlsRef.current = controls;
  const [appearance, setAppearance] = useState<CylinderAppearance>('relief'), appearanceRef = useRef(appearance); appearanceRef.current = appearance;
  const cutRef=useRef(excavation),annotationsRef=useRef(annotations),pickRef=useRef(onPick),radiusRef=useRef(previewRadius),readOnlyRef=useRef(readOnly);readOnlyRef.current=readOnly;radiusRef.current=previewRadius;cutRef.current=excavation;annotationsRef.current=annotations;pickRef.current=onPick;
  const diagnostics = useRef<HTMLOutputElement>(null);
  const [panel, setPanel] = useState(false), [, update] = useState(0), [mode, setMode] = useState<CylinderView['mode']>(initialView?.mode??'physical'), [zoom, setZoom] = useState(1), [selected, setSelected] = useState(false), [fullscreen, setFullscreen] = useState(false), [fullscreenSupported, setFullscreenSupported] = useState(false);
  const[inspecting,setInspecting]=useState(cylinderCenterInspection(initialView??adapter.initial())),onViewChangeRef=useRef(onViewChange);onViewChangeRef.current=onViewChange;
  const commands = useRef({ stop: () => {}, mode: (_mode: CylinderView['mode']) => {}, zoom: (_factor: number) => {}, reset: () => {}, center: (_region?: string) => {}, undo: () => {}, redo: () => {}, refresh: () => {}, finish: () => {}, display: () => {},getView:():V=>adapter.initial(),restore:(_view:V)=>{},inside:()=>{},editing:()=>{},focus:(_p:SurfacePosition)=>{},pick:()=>{},eye:(_eye:Vec3,_forward?:Vec3)=>{},pixel:(_point:CylinderScreenPoint):number[]=>[] });
  useImperativeHandle(handleRef, () => ({ finishInteraction: () => commands.current.finish(), stop: () => commands.current.stop(), undo: () => commands.current.undo(), redo: () => commands.current.redo(),getView:()=>commands.current.getView(),restoreView:view=>commands.current.restore(view),editView:()=>commands.current.mode('physical'),returnToEditing:()=>commands.current.editing(),viewInside:()=>commands.current.inside(),readPixel:point=>commands.current.pixel(point),focusPosition:p=>commands.current.focus(p),preparePick:()=>commands.current.pick(),setInspectionEye:(eye,forward)=>commands.current.eye(eye,forward) }), []);
  const previousPanel = useRef(false);
  useLayoutEffect(() => { if (panel) heading.current?.focus({ preventScroll: true }); else if (previousPanel.current) toggle.current?.focus({ preventScroll: true }); previousPanel.current = panel; }, [panel]);
  useLayoutEffect(() => { commands.current.stop(); commands.current.refresh(); }, [controls]);
  useLayoutEffect(() => { commands.current.display(); }, [appearance,excavation,annotations,onPick,previewRadius,readOnly]);
  useLayoutEffect(() => {
    session.enableWorkers();
    const node = canvas.current!, surface = overlay.current!, output = readout.current!, owner = root.current!, ctx = node.getContext('2d')!, mark = surface.getContext('2d')!, scratch = document.createElement('canvas'), scratchContext = scratch.getContext('2d')!;
    setFullscreenSupported(!!document.fullscreenEnabled && typeof owner.requestFullscreen === 'function');
    let alive = true, frame = 0, requested = initialView??adapter.initial(), applied = requested, appliedSize: CylinderViewport = { width: node.clientWidth, height: node.clientHeight }, serial = 0, appliedSerial = -1, pendingSerial = 0, pendingView = requested, pendingSize = appliedSize;
    let raster: Generator<void,CoherentTerrainRaster> | undefined, front: CoherentTerrainRaster | undefined, spare: Uint8ClampedArray | undefined, displayRevision = -1, redraw = true, hover: CylinderScreenPoint | undefined, selection: SurfacePosition | undefined, interactionUntil = 0, refinement = 0, inputAt = 0, opportunityAt = 0, pointerAt = 0, signature = '', started = performance.now(), lastFrame = 0, interruptionReason = 'Input interruption';
    let savedEditView:V|undefined,pendingRefinement=false,displayScene='',pendingScene='',displayConfiguration='',pendingConfiguration='';
    let overlayState: { stencil?: ConnectedStencil; selection?: SurfacePosition; view: V; ready: boolean; width: number; height: number } | undefined;
    const metrics = { preparationMs, firstPresentationMs: 0, renders: 0, renderSliceMaxMs: 0, rasterTotalMs: 0, rasterStartedAt: 0, overlayMaxMs: 0, maxFrameGapMs: 0, rasterSnapshotBytes: 0, renderTimes: [] as number[], inputLatencies: [] as number[], brushLatencies: [] as number[], frameGaps: [] as number[], uploadTimes: [] as number[], submitTimes: [] as number[], resizeTimes: [] as number[], cameraTimes: [] as number[], pointerFeedbackLatencies: [] as number[], presentationOpportunityLatencies: [] as number[] };
    const bounded = (a: number[], values: number[]) => { a.push(...values); if (a.length > 120) a.splice(0, a.length - 120); };
    const size = () => ({ width: node.clientWidth, height: node.clientHeight });
    const ready = () => appliedSerial === serial && appliedSize.width === node.clientWidth && appliedSize.height === node.clientHeight;
    const pointAt=(point:CylinderScreenPoint)=>ready()?adapter.pointAt(session.cache,applied,appliedSize,point,cutRef.current):undefined;
    const show=(point:SurfacePosition|undefined,select:boolean)=>{
      if(!point){output.textContent=ready()?'Outside cylinder geography · cuts and empty areas do not paint':'Updating cylinder view…';return;}
      const {index,height}=adapter.readout(point);output.textContent=adapter.readoutText?.(point,index,height)??`${height.toLocaleString(undefined,{maximumFractionDigits:2})} m · ${point.patchId} · sample ${index} · angle ${(point.u*180/Math.PI).toFixed(2)}°`;
      output.dataset.sample=String(index);output.dataset.elevation=String(height);output.dataset.position=JSON.stringify(point);if(select){selection=point;setSelected(true);}
    };
    const showPointer=(point:CylinderScreenPoint,select:boolean)=>{const message=ready()?adapter.pointerMessage?.(session.cache,applied,appliedSize,point,cutRef.current):undefined;if(message){output.textContent=message;delete output.dataset.sample;delete output.dataset.elevation;delete output.dataset.position;return;}show(pointAt(point),select);};
    const drawOverlay = () => {
      const stencil = session.painting ? session.lastDab : session.stencil, visible = appliedSerial >= 0 && ready();
      if (!pickRef.current&&overlayState && overlayState.stencil === stencil && overlayState.selection === selection && overlayState.view === applied && overlayState.ready === visible && overlayState.width === surface.width && overlayState.height === surface.height) return;
      overlayState = { stencil, selection, view: applied, ready: visible, width: surface.width, height: surface.height };
      const t = performance.now(); mark.setTransform(surface.width / appliedSize.width, 0, 0, surface.height / appliedSize.height, 0, 0); mark.clearRect(0, 0, appliedSize.width, appliedSize.height);
      if (!visible||cylinderCenterInspection(applied)||readOnlyRef.current) return;
      adapter.guides(mark,applied,appliedSize);
      if(applied.mode==='map'||applied.interior&&!cylinderCenterInspection(applied))for(const a of annotationsRef.current??[]){const p=adapter.project(a.position,applied,appliedSize);if(p){mark.strokeStyle='#ffd46a';mark.lineWidth=2;mark.beginPath();mark.arc(p.x,p.y,7,0,2*Math.PI);mark.stroke();mark.font='12px system-ui';mark.fillStyle='#fff5d8';mark.fillText(a.label,p.x,p.y-11);}}
      const radius=radiusRef.current,anchor=hover&&pickRef.current?pointAt(hover):undefined;node.dataset.previewRadius=anchor&&radius?String(radius):'';
      if(anchor&&radius&&Number.isFinite(radius)&&radius>0)adapter.aperture(mark,anchor,radius,applied,appliedSize);
      if (stencil) {
        mark.fillStyle = session.painting ? '#ffb756d9' : '#fff7b9d9';
        for (const index of stencil.indices) {
          for(const position of adapter.samplePositions(index,applied)){const p=adapter.project(position,applied,appliedSize);if(p&&p.x>=0&&p.x<=appliedSize.width&&p.y>=0&&p.y<=appliedSize.height){mark.beginPath();mark.arc(p.x,p.y,2.4,0,2*Math.PI);mark.fill();}}

        }
        const p = adapter.project( stencil.center, applied, appliedSize); if (p) { mark.strokeStyle = '#fff3a8'; mark.lineWidth = 1; mark.beginPath(); mark.moveTo(p.x - 5, p.y); mark.lineTo(p.x + 5, p.y); mark.moveTo(p.x, p.y - 5); mark.lineTo(p.x, p.y + 5); mark.stroke(); }
      }
      if (selection) { const p = adapter.project( selection, applied, appliedSize); if (p) { mark.strokeStyle = '#fff'; mark.lineWidth = 1.5; mark.beginPath(); mark.arc(p.x, p.y, 7, 0, 2 * Math.PI); mark.stroke(); } }
      const overlayMs = performance.now() - t;
      metrics.overlayMaxMs = Math.max(metrics.overlayMaxMs, overlayMs); recordPaintingStage('overlay', overlayMs);
    };
    const schedule = () => { if (alive && !frame) frame = requestAnimationFrame(paint); };
    const gpu = adapter.gpu(gpuCanvas.current!, session.cache, () => {
      // A lost device never changes numerical work. Block hit tests until a coherent
      // fallback/restored image has actually been submitted with the new transform.
      appliedSerial = -1; displayRevision = -1; raster?.return(undefined as never); raster = undefined; redraw = true; schedule();
    },node);
    const backing = (viewport: CylinderViewport) => {
      const { width, height } = surfaceDisplayDimensions(viewport, devicePixelRatio || 1);
      if (node.width !== width || node.height !== height) { node.width = width; node.height = height; }
      if (surface.width !== width || surface.height !== height) { surface.width = width; surface.height = height; overlayState = undefined; }
    };
    const presented = () => {
      recordPaintingEvent('submitted',{revision:displayRevision});
      metrics.renders++; bounded(metrics.brushLatencies, session.presented(displayRevision));
      if (!metrics.firstPresentationMs) metrics.firstPresentationMs = performance.now() - started;
      if (inputAt) { bounded(metrics.inputLatencies, [performance.now() - inputAt]); opportunityAt ||= inputAt; inputAt = 0; }
    };
    function paint() {
      frame = 0; if (!alive||session.closed) return; const frameStart = performance.now();
      // Scene preparation can be asynchronous. Start it before testing readiness;
      // the coherent Canvas path remains active while the GPU program compiles.
      gpu.setScene(cutRef.current);
      // Following-RAF opportunity is a browser presentation proxy, not GPU completion or photons.
      if (opportunityAt) { bounded(metrics.presentationOpportunityLatencies, [frameStart - opportunityAt]); opportunityAt = 0; }
      if (lastFrame) { const gap = frameStart - lastFrame; bounded(metrics.frameGaps, [gap]); metrics.maxFrameGapMs = Math.max(metrics.maxFrameGapMs, gap); } lastFrame = frameStart;
      // Present camera/committed colors BEFORE spending this frame's numerical budget.
      // The DOM pointer marker is updated directly by input, independently of the dry-run stencil.
      if (pointerAt) { bounded(metrics.pointerFeedbackLatencies, [performance.now() - pointerAt]); pointerAt = 0; }
      const brush = cylinderCenterInspection(requested)||readOnlyRef.current?undefined:adapter.brush(controlsRef.current);
      node.style.cursor = brush ? 'crosshair' : 'grab';if(cylinderCenterInspection(requested)||readOnlyRef.current)pointer.current!.hidden=true;
      if (gpu.available && (redraw || displayRevision !== session.cache.sourceRevision)) {
        raster?.return(undefined as never); raster = undefined;
        try {
          const viewport = size(), at = performance.now(); backing(viewport); const receipt = (gpu.setScene(cutRef.current),gpu.present(requested, viewport, appearanceRef.current));
          if(gpu.backend!=='cpu')ctx.clearRect(0, 0, node.width, node.height);
          applied = requested; appliedSize = viewport; appliedSerial = serial; displayRevision = receipt.revision; redraw = false; front = undefined; spare = undefined;
          bounded(metrics.renderTimes, [performance.now() - at]); bounded(metrics.uploadTimes, [receipt.uploadMs]); bounded(metrics.submitTimes, [receipt.submitMs]); bounded(metrics.resizeTimes, [receipt.resizeMs]); recordPaintingStage('gpuElevationUpload', receipt.uploadMs); recordPaintingStage('gpuSubmit', receipt.submitMs); presented();
        } catch (e) { gpu.fail(e); appliedSerial = -1; displayRevision = -1; redraw = true; }
      }
      session.requestPreview(hover && pointAt(hover), brush, applied);
      // A settled image is expendable when input arrives. Its preparation must
      // not stand in front of a brush publication or a new camera pose.
      const configuration=[adapter.sceneStamp(cutRef.current),appearanceRef.current].join(':'),sceneStamp=[configuration,session.cache.sourceRevision].join(':');
      if(raster&&pendingRefinement&&(session.painting||session.processing||pendingSerial!==serial||pendingScene!==sceneStamp)){raster.return(undefined as never);raster=undefined;redraw=true;}
      const mobile=matchMedia('(pointer: coarse)').matches,settledBudget=settledRasterBudget(size(),devicePixelRatio||1,mobile),canRefine=!session.painting&&!session.processing&&performance.now()>=interactionUntil&&ready()&&front?.revision===session.cache.sourceRevision&&displayScene===sceneStamp,needsRefinement=canRefine&&front!.columns*front!.rows<settledBudget*.99;
      if(!gpu.available&&!raster&&ready()&&front?.revision===session.cache.sourceRevision&&displayScene===sceneStamp&&!needsRefinement)redraw=false;
      if (!gpu.available && !raster && (!ready() || !front || front.revision !== session.cache.sourceRevision||displayScene!==sceneStamp||needsRefinement)) {
        pendingView = requested; pendingSize = size(); pendingSerial = serial;pendingScene=sceneStamp;pendingConfiguration=configuration;
        if (pendingSize.width > 0 && pendingSize.height > 0) {
          const interactive = session.painting || session.processing || performance.now() < interactionUntil;
          pendingRefinement=!!canRefine;
          const budget=pendingRefinement?settledBudget:adapter.cutView(requested,cutRef.current)||cylinderCenterInspection(requested)?80000:interactive ? mobile ? 22000 : 40000 : mobile ? 90000 : 160000;
          let update:TerrainRasterUpdate|undefined;
          if(front&&front.columns*front.rows>=settledBudget*.98&&appliedSerial===serial&&displayConfiguration===configuration&&!adapter.cutView(requested,cutRef.current)&&!cylinderCenterInspection(requested)){
            const changes=session.displayDabsSince(front.revision),region=changes&&adapter.dirtyRegion?.(changes,pendingView,pendingSize,front.columns,front.rows);
            if(region&&rasterRegions(region).reduce((sum,r)=>sum+(r.right-r.left)*(r.bottom-r.top),0)<front.columns*front.rows*.5)update={base:front,region};
          }
          raster = adapter.raster(session.cache, pendingView, pendingSize, budget, spare, appearanceRef.current,cutRef.current,update); spare = undefined; redraw = false; metrics.rasterStartedAt = performance.now(); metrics.rasterTotalMs = 0;
        }
      }
      // Cut work yields after 256 base rays rather than the old 1,024. Preserve
      // its former 16k-ray ceiling without changing the 9 ms display-frame cap.
      const rasterSteps=adapter.cutView(pendingView,cutRef.current)?64:16;
      for (let work = 0; raster && work < rasterSteps && performance.now() - frameStart < 9; work++) {
        const at = performance.now(), result = raster.next(), elapsed = performance.now() - at; metrics.renderSliceMaxMs = Math.max(metrics.renderSliceMaxMs, elapsed); metrics.rasterTotalMs += elapsed; recordPaintingStage('cpuRasterSlice', elapsed);
        if (result.done) {
          if (front) spare = front.pixels; front = result.value; raster = undefined; applied = pendingView; appliedSize = pendingSize; appliedSerial = pendingSerial;
          backing(appliedSize);
          scratch.width = front.columns; scratch.height = front.rows; scratchContext.putImageData(new ImageData(front.pixels as Uint8ClampedArray<ArrayBuffer>, front.columns, front.rows), 0, 0);
          ctx.setTransform(node.width / appliedSize.width, 0, 0, node.height / appliedSize.height, 0, 0); ctx.clearRect(0, 0, appliedSize.width, appliedSize.height); ctx.imageSmoothingEnabled = true;ctx.imageSmoothingQuality='high'; ctx.drawImage(scratch, 0, 0, appliedSize.width, appliedSize.height);
          displayScene=pendingScene;displayConfiguration=pendingConfiguration;if(!pendingRefinement)schedule();displayRevision = front.revision; metrics.rasterSnapshotBytes = front.snapshotBytes; bounded(metrics.renderTimes, [metrics.rasterTotalMs]); presented();
        }
      }
      if (diagnostics.current) {
        const active = gpu.available, width = active ? (gpu.displayCanvas??gpuCanvas.current!).width : front?.columns ?? 0, height = active ? (gpu.displayCanvas??gpuCanvas.current!).height : front?.rows ?? 0;
        const res = session.terrain.metadata.representation.resolution,numerical=adapter.numericalDescription??(res?`${res.angularSamples} angular / ${res.axialCells} axial / ${res.radialCells} radial`:'');
        const text = `${active&&gpu.backend!=='cpu' ? 'Hardware WebGL2' : 'CPU fallback'}\n${gpu.statistics.renderer || 'Graphics renderer unavailable'}${active ? '' : `\n${gpu.statistics.reason || 'Preparing CPU display'}`}\nTerrain backing: ${width} × ${height} px\nPresentation backing: ${node.width} × ${node.height} px\nNumerical: ${numerical} · ${session.terrain.sampleCount.toLocaleString()} samples`;
        if (diagnostics.current.textContent !== text) diagnostics.current.textContent = text;
        diagnostics.current.dataset.backend = active ? gpu.backend??'webgl2' : 'cpu';
      }
      drawOverlay(); if (hover) showPointer(hover, false);
      const pending = session.locked ? session.painting : session.pump(3), previewPending = session.pumpPreview();
      drawOverlay(); // A completed dry-run stencil must be visible even when no work remains.
      const pendingPresentation = displayRevision !== session.cache.sourceRevision;
      pointer.current!.dataset.pending = String(session.pendingWork || session.previewPending || pendingPresentation || !ready());
      pointer.current!.textContent = session.pendingWork?'Terrain pending':pendingPresentation?'Display pending':session.previewPending?'Footprint preview':'Pointer';
      const sig = JSON.stringify([session.modified, session.message, session.previewMessage, session.painting, session.processing, session.history.canUndo, session.history.canRedo, ready()]); if (sig !== signature) { signature = sig; update(v => v + 1); }
      node.dataset.renderer = gpu.available ? gpu.backend??'webgl2' : 'cpu'; node.dataset.modified = String(session.modified); node.dataset.ready = String(ready()); node.dataset.mode = applied.mode; node.dataset.inspecting=String(cylinderCenterInspection(applied));node.dataset.eye=JSON.stringify(applied.eyeMeters??null);node.dataset.frame=JSON.stringify(applied.frame); node.dataset.processing = String(session.processing); node.dataset.painting = String(session.painting); node.dataset.revision = String(session.terrain.revision); node.dataset.displayRevision = String(displayRevision); node.dataset.historyEntries = String(session.history.statistics.entries); node.dataset.zoom = String(applied.zoom); node.dataset.previewPending = String(session.previewPending);
      if (pending || previewPending || raster || redraw || opportunityAt || displayRevision !== session.cache.sourceRevision||!gpu.available&&(needsRefinement||displayScene!==sceneStamp)) schedule(); else lastFrame = 0;
    }
    const change = (fn: (view: V) => V, interactive = false) => {
      if (session.locked) return;
      session.cancel('Navigation interrupted drawing'); inputAt ||= performance.now();
      const at = performance.now(), next = adapter.normalizeView(fn(requested)); bounded(metrics.cameraTimes, [performance.now() - at]);
      // CPU fallback completes one coherent in-flight view, then takes the latest
      // request. Cancelling every camera event would starve continuous navigation.
      if (gpu.available || next.mode !== requested.mode) { raster?.return(undefined as never); raster = undefined; }
      requested = next; serial++; node.dataset.ready = 'false'; redraw = true; setMode(requested.mode); setZoom(requested.zoom);setInspecting(cylinderCenterInspection(requested));
      if (interactive) { interactionUntil = performance.now() + 180; clearTimeout(refinement); refinement = window.setTimeout(() => { redraw = true; schedule(); }, 200); }
      schedule();
    };
    const stop = () => { if (session.locked) return; navigation.cancel(); session.cancel('Workspace interruption'); schedule(); };
    const navigation = attachSurfaceEditing(node, {
      paintingEnabled: () => !readOnlyRef.current && !pickRef.current && !session.locked && !cylinderCenterInspection(requested) && !!adapter.brush(controlsRef.current),
      begin(point) { if(readOnlyRef.current||pickRef.current||cylinderCenterInspection(requested))return false;const p = pointAt(point), brush = adapter.brush(controlsRef.current); if (!p || !brush || session.processing) return false; const accepted = session.begin(p, brush, applied); if (accepted) show(p, true); return accepted; },
      move(point) { const anchor = navigation.anchor, p = pointAt(point); if (!p || anchor && !adapter.continuous(anchor,point,applied,appliedSize,cutRef.current)) { interruptionReason = 'Stroke reached a projection cut, empty area, or large pointer jump; lift and recenter before continuing'; return false; } return session.move(p); },
      release: () => session.release(), stop: () => { session.cancel(interruptionReason); interruptionReason = 'Input interruption'; schedule(); }, hover(point) { hover = point ?? undefined; pointer.current!.hidden = cylinderCenterInspection(requested)||!point || !adapter.brush(controlsRef.current); if (point) { pointerAt = performance.now(); pointer.current!.style.transform = `translate(${point.x}px, ${point.y}px)`; } schedule(); },
      inspect(point, select) { const p=pointAt(point);showPointer(point,select);if(select&&pickRef.current&&!cylinderCenterInspection(requested)){if(p)pickRef.current(p);else{session.message='Choose ground on the selected side; this pixel shows an opening, rock, or the opposite bank.';schedule();}}schedule(); },
      drag(dx, dy) { change(view => adapter.navigate( view, cylinderCenterInspection(view)?-dx:dx, dy, size()), true); },
      zoom(factor) { change(view => ({ ...view, zoom: Math.max(.6, Math.min(6, view.zoom * factor)) }), true); },
      reset() { change(view => ({...adapter.initial(view.mode),...(view.interior?{interior:true,interiorView:view.interiorView,eyeMeters:view.eyeMeters}:{})})); },
    });
    commands.current = {editing:()=>{stop();if(cylinderCenterInspection(requested)&&savedEditView)change(()=>savedEditView!);else commands.current.mode('physical');},eye:(eye,forward)=>{if(!adapter.validateEye(eye,cutRef.current))throw RangeError('Inspection eye is outside the actual cylindrical free volume.');const wasInside=cylinderCenterInspection(requested);if(!wasInside)savedEditView=requested;let frame=requested.frame;if(forward){const f=unitDirection(forward),right=unitDirection(cross3(Math.abs(f[2])>.9?[0,1,0]:[0,0,1],f));frame={forward:f,right,up:unitDirection(cross3(f,right))};}if(gpu.available||!wasInside){raster?.return(undefined as never);raster=undefined;}requested=adapter.normalizeView({...requested,frame,mode:'physical',interior:true,interiorView:'center',eyeMeters:eye});serial++;node.dataset.ready='false';redraw=true;setMode('physical');setInspecting(true);schedule();},focus:p=>{stop();change(view=>adapter.recenter({...view,mode:'physical',interiorView:'edit',eyeMeters:undefined},p));},pick:()=>{stop();if(cylinderCenterInspection(requested))commands.current.mode('physical');},pixel:point=>{gpu.setScene(cutRef.current);if(gpu.available)gpu.present(requested,size(),appearanceRef.current);const source=gpu.available?gpu.displayCanvas??gpuCanvas.current!:node,temp=document.createElement('canvas');temp.width=temp.height=1;const c=temp.getContext('2d')!;c.drawImage(source,point.x/source.clientWidth*source.width,point.y/source.clientHeight*source.height,1,1,0,0,1,1);return Array.from(c.getImageData(0,0,1,1).data);}, getView:()=>structuredClone(requested),restore:view=>{stop();change(()=>view);},inside:()=>{if(session.locked||cylinderCenterInspection(requested))return;navigation.finish();session.release();void session.drainForSave().then(()=>{if(!alive||session.closed||cylinderCenterInspection(requested))return;savedEditView=requested;stop();change(view=>({...view,mode:'physical',interior:true,interiorView:'center',eyeMeters:adapter.inspectionEye??[0,0,0]}));}).catch(e=>{session.message=String(e);schedule();});},stop, mode: mode => { stop(); change(view => ({ ...(cylinderCenterInspection(view)&&savedEditView?savedEditView:view), mode,...(surfaceRole?{interior:surfaceRole==='interior',interiorView:'edit',eyeMeters:undefined}:{}) })); }, zoom: factor => { stop(); change(view => ({ ...view, zoom: Math.max(.6, Math.min(6, view.zoom * factor)) }), true); }, reset: () => { stop(); change(view => ({...adapter.initial(view.mode),...(view.interior?{interior:true,interiorView:view.interiorView,eyeMeters:view.eyeMeters}:{})})); }, center: region => {
      stop(); const p = region ? adapter.region(requested,region) : selection;
      if (p) change(view => adapter.recenter( view, p));
    }, undo: () => { if(cylinderCenterInspection(requested)||readOnlyRef.current)return;stop(); session.undo(); schedule(); }, redo: () => { if(cylinderCenterInspection(requested)||readOnlyRef.current)return;stop(); session.redo(); schedule(); }, refresh: schedule, finish: () => { navigation.finish(); session.release(); schedule(); }, display: () => { appliedSerial=-1;overlayState=undefined;raster?.return(undefined as never); raster = undefined; redraw = true; schedule(); } };
    session.changed = schedule; session.stopped = () => navigation.cancel();
    const resize = new ResizeObserver(() => { stop(); raster?.return(undefined as never); raster = undefined; serial++; node.dataset.ready = 'false'; redraw = true; ctx.clearRect(0, 0, node.width, node.height); mark.clearRect(0, 0, surface.width, surface.height); schedule(); }); resize.observe(owner);
    const textInput = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest('input,textarea,select,[contenteditable="true"]');
    const key = (event: KeyboardEvent) => {
      if (workspace) return;
      if (event.key === 'Escape') { stop(); setPanel(false); }
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === 's') { event.preventDefault(); session.message = 'Cylinder preview is session-only. Saving is unavailable until A7-D.'; schedule(); }
      if (!textInput(event.target) && ['z', 'y'].includes(event.key.toLowerCase())) { event.preventDefault(); if (event.shiftKey || event.key.toLowerCase() === 'y') commands.current.redo(); else commands.current.undo(); }
    };
    const departure = (event: BeforeUnloadEvent) => { if (!workspace && (session.modified || session.painting)) { stop(); event.preventDefault(); event.returnValue = ''; } };
    const fullscreenChanged = () => { stop(); setFullscreen(!!document.fullscreenElement); };
    window.addEventListener('keydown', key); window.addEventListener('beforeunload', departure); window.addEventListener('pagehide', stop); document.addEventListener('fullscreenchange', fullscreenChanged);
    inspection = {
      snapshot: (includeWords = true) => structuredClone({ ...(includeWords ? { words: [...new Uint32Array(session.terrain.copyElevations().buffer)] } : {}), identity: session.terrain.metadata.identity, metadata: session.terrain.metadata, view: applied, requested, size: appliedSize, ready: ready(), painting: session.painting, processing: session.processing, name: session.name, hasSaved: session.hasSaved, modified: session.modified, checkpointSamples: session.checkpointSamples, locked: session.locked, history: session.history.statistics, operations: session.history.operations, statistics: session.statistics, workDiagnostics: session.workDiagnostics, previewDiagnostics: session.previewDiagnostics, cacheBytes: session.cache.byteLength, cacheOwnedArrayBufferBytes:(session.cache as unknown as{ownedArrayBufferBytes?:number}).ownedArrayBufferBytes??session.cache.byteLength, displayRevision, revision: session.terrain.revision, rasterBytes: (front?.pixels.byteLength ?? 0) + (spare?.byteLength ?? 0), appearance: appearanceRef.current, renderer: { kind: gpu.available ? gpu.backend??'webgl2' : 'cpu', width: gpu.available ? (gpu.displayCanvas??gpuCanvas.current!).width : front?.columns, height: gpu.available ? (gpu.displayCanvas??gpuCanvas.current!).height : front?.rows, ...gpu.statistics }, metrics, controls: controlsRef.current, stencil: session.stencil && { ...session.stencil, indices: [...session.stencil.indices] }, lastDab: session.lastDab && { ...session.lastDab, indices: [...session.lastDab.indices] }, pendingWork: session.pendingWork, pendingPositions: session.pendingPositions, previewPending: session.previewPending, previewMessage: session.previewMessage, message: session.message }),
      project: p => adapter.project( { ...session.terrain.metadata.identity, ...p }, applied, appliedSize),
      sample:index=>{const sample=adapter.sample(index);const position=adapter.samplePositions(index,applied)[0]!;return{...sample,screen:adapter.project(position,applied,appliedSize)};},
    };
    schedule();
    return () => { onViewChangeRef.current?.(cylinderCenterInspection(requested)?savedEditView??requested:requested);alive = false; inspection = undefined; cancelAnimationFrame(frame); clearTimeout(refinement); raster?.return(undefined as never); raster = undefined; overlayState = undefined; front = undefined; spare = undefined; navigation.dispose(); gpu.dispose(); session.changed = () => {}; session.stopped = () => {};session.releaseViewport(); resize.disconnect(); window.removeEventListener('keydown', key); window.removeEventListener('beforeunload', departure); window.removeEventListener('pagehide', stop); document.removeEventListener('fullscreenchange', fullscreenChanged); node.width = surface.width = scratch.width = 0; };
  }, [session, preparationMs]);
  const tool = (name: CylinderControls['tool'], label: string) => <button key={name} type="button" disabled={session.locked||inspecting||readOnly} aria-pressed={controls.tool === name} onClick={() => { commands.current.stop(); setControls(c => ({ ...c, tool: name })); }}>{label}</button>;
  const radius = adapter.radiusMeters, brush = adapter.brush(controls);
  const physicalTools = <>      <h2>Physical brush</h2><label>{adapter.label??'Cylinder'} brush radius (m)<input type="number" step="any" min={adapter.minBrushRadius} max={adapter.maxBrushRadius} value={controls.radius} onChange={e => setControls(c => ({ ...c, radius: e.target.value }))} /></label>
      {(controls.tool === 'raise' || controls.tool === 'lower') && <label>{adapter.label??'Cylinder'} strength (m/dab)<input type="number" min="0" step="any" value={controls.strength} onChange={e => setControls(c => ({ ...c, strength: e.target.value }))} /></label>}
      {(controls.tool === 'smooth' || controls.tool === 'flatten') && <label>{adapter.label??'Cylinder'} intensity (%)<input type="number" min="0" max="100" step="any" value={controls.intensity} onChange={e => setControls(c => ({ ...c, intensity: e.target.value }))} /></label>}
      {controls.tool === 'flatten' && <label>{adapter.label??'Cylinder'} target elevation (m)<input type="number" step="any" value={controls.target} onChange={e => setControls(c => ({ ...c, target: e.target.value }))} /></label>}
      {controls.tool !== 'navigate' && !brush && <p role="alert">Enter valid physical brush settings before drawing.</p>}
      <p>Radius: {adapter.minBrushRadius.toLocaleString()}–{adapter.maxBrushRadius.toLocaleString()} m. Large or expensive footprints stop safely at interactive limits. Exact-boundary numerical failures retain an undoable prefix.</p>
      <h2>Working surface</h2><p>Physical view protects occluded samples. If a dab reaches hidden terrain, reduce its radius, rotate, or use Surface map. Dots show exact canonical samples changed by a dry-run dab; flat Smooth can have no changes.</p>
      <p>{adapter.mapHelp??'In Surface map, matching angle markers connect the real rims. Only the white tangent join is continuous on screen. Dashed edges are cuts: lift and restart, or select a point and Center selection to move the working meridian.'}</p>
      <p id="cylinder-help">Mouse, pen or one finger draw. Rotate / Pan, Space-drag, middle-drag or two fingers navigate. Arrows navigate; +/− zoom; Home fits; Enter inspects the center. Ctrl/⌘ Z undoes, Ctrl/⌘ Shift Z redoes. Escape stops and closes tools. Release drains accepted input.</p>
      <h2>Terrain display</h2><label>{adapter.label??'Cylinder'} terrain appearance<select aria-label={(adapter.label??'Cylinder')+' terrain appearance'} value={appearance} onChange={e => setAppearance(e.target.value as CylinderAppearance)}><option value="relief">Shaded relief · 5× display</option><option value="elevation">Elevation colors</option></select></label>
      <p>Coasts follow interpolated elevation. Relief uses physical slopes with 5× display exaggeration; it adds no terrain detail or displacement.</p>
      <details className="cylinder-diagnostics"><summary>Display diagnostics</summary><output ref={diagnostics} aria-label="Cylinder display diagnostics">Preparing display…</output></details>
</>;
  const navigation = <><button aria-pressed={mode === 'physical'&&!inspecting} onClick={() => commands.current.mode('physical')}>Physical view</button>{surfaceRole==='interior'&&<button aria-pressed={inspecting} disabled={session.locked||session.processing} onClick={()=>commands.current.inside()}>View from inside</button>}<button aria-pressed={mode === 'map'} onClick={() => commands.current.mode('map')}>Surface map</button><button onClick={() => commands.current.zoom(.8)} aria-label="Zoom out">−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => commands.current.zoom(1.25)} aria-label="Zoom in">+</button><button onClick={() => commands.current.reset()}>Fit {adapter.label?.toLowerCase()??'cylinder'}</button><details className="cylinder-regions"><summary>Center region</summary><div onClick={event=>{if(surfaceRole&&event.target instanceof Element&&event.target.closest('button')){const details=event.currentTarget.closest('details');details?.removeAttribute('open');details?.querySelector('summary')?.focus({preventScroll:true});}}}>{adapter.regions.map(region=><button key={region.id} onClick={()=>commands.current.center(region.id)}>{region.label}</button>)}<button disabled={!selected} onClick={() => commands.current.center()}>Center selection</button></div></details>{!workspace && fullscreenSupported && <button aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={() => { commands.current.stop(); void (document.fullscreenElement ? document.exitFullscreen() : root.current!.requestFullscreen()).catch(e => { session.message = `Fullscreen unavailable: ${String(e)}`; commands.current.refresh(); }); }}>⛶</button>}</>;
  const picker = inspecting?<span>View from inside · drag to look · painting paused</span>:<>{tool('navigate', 'Rotate / Pan')}{tool('raise', 'Raise')}{tool('lower', 'Lower')}{tool('smooth', 'Smooth')}{tool('flatten', 'Flatten')}</>;
  const workspaceView=useMemo<ConnectedWorkspaceView>(()=>({ inspecting,tools: <>{inspecting&&<p role="status">View from inside is read-only. Choose Physical view or Surface map to edit. Your brush choices are retained.</p>}<fieldset disabled={inspecting}>{physicalTools}</fieldset><p className="hint">{adapter.description??<>Reference radius {radius.toLocaleString()} m · axial length {adapter.lengthMeters.toLocaleString()} m · {session.terrain.metadata.representation.resolution?.angularSamples} angular samples. Elevations color the reference shape without displacing it. Save explicitly through Atlas.</>}</p></>, toolPicker: picker, navigation:<>{navigation}{!inspecting&&mapControls}</>, canUndo: session.history.canUndo, canRedo: session.history.canRedo, processing: session.processing }),[controls,mode,zoom,selected,appearance,inspecting,session.locked,session.modified,session.painting,session.processing,session.message,session.previewMessage,session.history.canUndo,session.history.canRedo,surfaceRole,mapControls]);
  useLayoutEffect(()=>{onWorkspaceView?.(workspaceView);},[workspaceView,onWorkspaceView]);
  const Container = workspace ? 'section' : 'main';
  return <Profiler id="cylinder-workspace" onRender={(_id, _phase, actualDuration) => recordPaintingStage('reactRender', actualDuration)}><Container ref={root} data-surface-role={surfaceRole} data-inspecting={inspecting} className={workspace ? 'cylinder-preview cylinder-integrated' : 'cylinder-preview'} aria-label={workspace ? 'Cylindrical surface view' : 'Cylinder development preview'}>
    <canvas ref={gpuCanvas} className="cylinder-gpu" aria-hidden="true" />
    <canvas ref={canvas} className="cylinder-canvas" tabIndex={0} role="img" aria-label="Interactive physical cylinder terrain" aria-describedby={workspace ? 'cylinder-help' : 'cylinder-help cylinder-session-notice'} />
    <canvas ref={overlay} className="cylinder-overlay" aria-hidden="true" />
    <div ref={pointer} className="cylinder-pointer" hidden aria-hidden="true">Pointer</div>
    {workspace ? workspace(workspaceView) : <>
    <button ref={toggle} className="cylinder-toggle" aria-expanded={panel} aria-controls="cylinder-tools" onClick={() => setPanel(!panel)}>{panel ? '× Close tools' : '☰ Cylinder tools'}</button>
    <p id="cylinder-session-notice" className="cylinder-notice">Development preview · session only · cannot save</p>
    <div className="cylinder-history" role="group" aria-label="Cylinder history"><button disabled={!session.history.canUndo} onClick={() => commands.current.undo()}>Undo</button><button disabled={!session.history.canRedo} onClick={() => commands.current.redo()}>Redo</button></div>
    <div className="cylinder-picker" role="group" aria-label="Cylinder terrain tool">{tool('navigate', 'Rotate / Pan')}{tool('raise', 'Raise')}{tool('lower', 'Lower')}{tool('smooth', 'Smooth')}{tool('flatten', 'Flatten')}</div>
    <aside id="cylinder-tools" className="cylinder-panel" hidden={!panel} aria-label="Cylinder tools">
      <h1 ref={heading} tabIndex={-1}>Cylinder tools</h1><p><strong>Session-only development preview.</strong> Reloading or closing loses this terrain. Save/Open is not implemented.</p>
      {physicalTools}
      <label htmlFor="cylinder-detail">Preview detail</label><select id="cylinder-detail" value={detail} onChange={e => setDetail(Number(e.target.value))}><option value={64}>Lightweight · 64 / 32 / 16</option><option value={128}>Standard · 128 / 64 / 32</option><option value={256}>Higher · 256 / 128 / 64</option></select><button onClick={replace}>New blank cylinder</button><p>R = 1,000,000 m · L = 1,600,000 m. Reference shape only; elevations do not displace the shape.</p><a href="/">Return to Atlas home</a>
    </aside>
    <nav className="cylinder-navigation" aria-label="Cylinder navigation">{navigation}</nav>
    </>}
    <div className="cylinder-feedback"><p role="status" aria-label="Cylinder work status">{session.message}</p><p aria-label="Cylinder footprint status">{inspecting?'Read-only cavity inspection.':session.previewMessage || (session.painting ? 'Dots show the last committed physical dab.' : 'Point at terrain to inspect its exact numerical footprint.')}</p><output ref={readout} aria-label="Cylinder elevation readout">Inspect the physical surface or switch to Surface map.</output></div>
  </Container></Profiler>;
}
