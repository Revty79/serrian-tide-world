'use client';
import { Profiler, useEffect, useLayoutEffect, useRef, useState, useImperativeHandle, useMemo, type ReactNode, type Ref } from 'react';
import { recordPaintingStage } from '../editor/painting-metrics.ts';
import { CylinderPreviewSession, createCylinderPreviewTerrain } from '../editor/cylinder-preview-session.ts';
import { cylinderBrushFromControls, defaultCylinderControls, type CylinderControls } from '../editor/cylinder-controls.ts';
import { attachSphericalEditing as attachSurfaceEditing } from '../interaction/spherical-editing.ts';
import { cylinderLayout, cylinderCenterInspection, continuousCylinderScreenSegment, initialCylinderView, navigateCylinder, projectCylinder, recenterCylinder, unprojectCylinder, type CylinderView, type CylinderScreenPoint, type CylinderViewport } from '../rendering/cylindrical-view.ts';
import { cylinderRasterSteps, type CylinderRaster, type CylinderStencil } from '../rendering/cylindrical-raster.ts';
import { CylinderWebGLRenderer } from '../rendering/cylindrical-webgl.ts';
import { surfaceDisplayDimensions } from '../rendering/surface-renderer.ts';
import { type CylinderAppearance } from '../rendering/cylindrical-elevation.ts';
import type { CylinderPosition, CylinderRegion } from '../surfaces/cylinder.ts';
import './CylinderPreview.css';

type Inspection = { snapshot(includeWords?: boolean): object; project(p: {patchId: CylinderRegion; u: number; v: number}): CylinderScreenPoint | undefined; sample(index: number): object };
let inspection: Inspection | undefined;
/** Read-only development diagnostics used by actual-preview browser verification. No write hooks. */
export function cylinderPreviewInspection() { if (!import.meta.env.DEV || !inspection) throw new Error('Cylinder preview is not ready.'); return inspection; }

export function CylinderPreview() {
  const [session, setSession] = useState<CylinderPreviewSession>(), [detail, setDetail] = useState(128), [generation, setGeneration] = useState(0), [preparation, setPreparation] = useState(0), [error, setError] = useState('');
  useEffect(() => {
    let active = true, frame = 0; let created: CylinderPreviewSession | undefined;
    const started = performance.now();
    try {
      created = new CylinderPreviewSession(createCylinderPreviewTerrain(detail)); const work = created.cache.prepare();
      const prepare = () => { if (!active) return; try { let done = false; for (let i = 0; i < 8 && !done; i++) done = !!work.next().done; if (done) { setPreparation(performance.now() - started); setSession(created); } else frame = requestAnimationFrame(prepare); } catch (e) { setError(String(e)); } };
      frame = requestAnimationFrame(prepare);
    } catch (e) { setError(String(e)); }
    return () => { active = false; cancelAnimationFrame(frame); created?.dispose(); };
  }, [generation]); // Detail is deliberately committed only by New blank cylinder.
  const replace = () => { if (!session?.modified || confirm('Discard this session-only cylinder terrain and create a blank cylinder? It cannot be saved.')) { setSession(undefined); setError(''); setGeneration(n => n + 1); } };
  if (!session) return <main className="cylinder-preview cylinder-loading" aria-label="Cylinder development preview"><h1>Cylinder development preview</h1><p>Session-only terrain. Saving is unavailable.</p><p role={error ? 'alert' : 'status'}>{error || 'Preparing blank physical cylinder…'}</p><a href="/">Atlas home</a></main>;
  return <CylinderWorkspace key={session.terrain.metadata.terrainId} session={session} preparationMs={preparation} detail={detail} setDetail={setDetail} replace={replace} />;
}

export interface CylinderViewportHandle { finishInteraction(): void; stop(): void; undo(): void; redo(): void;getView?():CylinderView;restoreView?(view:CylinderView):void;editView?():void;viewInside?():void;readPixel?(point:CylinderScreenPoint):number[] }
export interface CylinderWorkspaceView { inspecting?:boolean;tools: ReactNode; toolPicker: ReactNode; navigation: ReactNode; canUndo: boolean; canRedo: boolean; processing: boolean }
export interface CylinderWorkspaceProps {session:CylinderPreviewSession;preparationMs?:number;detail?:number;setDetail?(n:number):void;replace?():void;workspace?(view:CylinderWorkspaceView):ReactNode;handleRef?:Ref<CylinderViewportHandle>;surfaceRole?:'exterior'|'interior';initialView?:CylinderView;onViewChange?:(view:CylinderView)=>void;onWorkspaceView?:(view:CylinderWorkspaceView)=>void;sharedControls?:{value:CylinderControls;change:(value: CylinderControls|((previous:CylinderControls)=>CylinderControls))=>void}}
export function CylinderWorkspace({ session, preparationMs = 0, detail = 128, setDetail = () => {}, replace = () => {}, workspace, handleRef,surfaceRole,initialView,onViewChange,onWorkspaceView,sharedControls }:CylinderWorkspaceProps) {
  const root = useRef<HTMLElement>(null), canvas = useRef<HTMLCanvasElement>(null), gpuCanvas = useRef<HTMLCanvasElement>(null), pointer = useRef<HTMLDivElement>(null), overlay = useRef<HTMLCanvasElement>(null), readout = useRef<HTMLOutputElement>(null), toggle = useRef<HTMLButtonElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const [ownControls, setOwnControls] = useState<CylinderControls>(() => defaultCylinderControls(session.terrain.metadata.geometry.radiusMeters));const controls=sharedControls?.value??ownControls,setControls=sharedControls?.change??setOwnControls, controlsRef = useRef(controls); controlsRef.current = controls;
  const [appearance, setAppearance] = useState<CylinderAppearance>('relief'), appearanceRef = useRef(appearance); appearanceRef.current = appearance;
  const diagnostics = useRef<HTMLOutputElement>(null);
  const [panel, setPanel] = useState(false), [, update] = useState(0), [mode, setMode] = useState<CylinderView['mode']>(initialView?.mode??'physical'), [zoom, setZoom] = useState(1), [selected, setSelected] = useState(false), [fullscreen, setFullscreen] = useState(false), [fullscreenSupported, setFullscreenSupported] = useState(false);
  const[inspecting,setInspecting]=useState(cylinderCenterInspection(initialView??initialCylinderView())),onViewChangeRef=useRef(onViewChange);onViewChangeRef.current=onViewChange;
  const commands = useRef({ stop: () => {}, mode: (_mode: CylinderView['mode']) => {}, zoom: (_factor: number) => {}, reset: () => {}, center: (_region?: CylinderRegion) => {}, undo: () => {}, redo: () => {}, refresh: () => {}, finish: () => {}, display: () => {},getView:():CylinderView=>initialCylinderView(),restore:(_view:CylinderView)=>{},inside:()=>{},pixel:(_point:CylinderScreenPoint):number[]=>[] });
  useImperativeHandle(handleRef, () => ({ finishInteraction: () => commands.current.finish(), stop: () => commands.current.stop(), undo: () => commands.current.undo(), redo: () => commands.current.redo(),getView:()=>commands.current.getView(),restoreView:view=>commands.current.restore(view),editView:()=>commands.current.mode('physical'),viewInside:()=>commands.current.inside(),readPixel:point=>commands.current.pixel(point) }), []);
  const previousPanel = useRef(false);
  useLayoutEffect(() => { if (panel) heading.current?.focus({ preventScroll: true }); else if (previousPanel.current) toggle.current?.focus({ preventScroll: true }); previousPanel.current = panel; }, [panel]);
  useLayoutEffect(() => { commands.current.stop(); commands.current.refresh(); }, [controls]);
  useLayoutEffect(() => { commands.current.display(); }, [appearance]);
  useLayoutEffect(() => {
    session.enableWorkers();
    const node = canvas.current!, surface = overlay.current!, output = readout.current!, owner = root.current!, ctx = node.getContext('2d')!, mark = surface.getContext('2d')!, scratch = document.createElement('canvas'), scratchContext = scratch.getContext('2d')!;
    setFullscreenSupported(!!document.fullscreenEnabled && typeof owner.requestFullscreen === 'function');
    let alive = true, frame = 0, requested = initialView??initialCylinderView(), applied = requested, appliedSize: CylinderViewport = { width: node.clientWidth, height: node.clientHeight }, serial = 0, appliedSerial = -1, pendingSerial = 0, pendingView = requested, pendingSize = appliedSize;
    let raster: ReturnType<typeof cylinderRasterSteps> | undefined, front: CylinderRaster | undefined, spare: Uint8ClampedArray | undefined, displayRevision = -1, redraw = true, hover: CylinderScreenPoint | undefined, selection: CylinderPosition | undefined, interactionUntil = 0, refinement = 0, inputAt = 0, opportunityAt = 0, pointerAt = 0, signature = '', started = performance.now(), lastFrame = 0, interruptionReason = 'Input interruption';
    let savedEditView:CylinderView|undefined;
    let overlayState: { stencil?: CylinderStencil; selection?: CylinderPosition; view: CylinderView; ready: boolean; width: number; height: number } | undefined;
    const metrics = { preparationMs, firstPresentationMs: 0, renders: 0, renderSliceMaxMs: 0, rasterTotalMs: 0, rasterStartedAt: 0, overlayMaxMs: 0, maxFrameGapMs: 0, rasterSnapshotBytes: 0, renderTimes: [] as number[], inputLatencies: [] as number[], brushLatencies: [] as number[], frameGaps: [] as number[], uploadTimes: [] as number[], submitTimes: [] as number[], resizeTimes: [] as number[], cameraTimes: [] as number[], pointerFeedbackLatencies: [] as number[], presentationOpportunityLatencies: [] as number[] };
    const bounded = (a: number[], values: number[]) => { a.push(...values); if (a.length > 120) a.splice(0, a.length - 120); };
    const size = () => ({ width: node.clientWidth, height: node.clientHeight });
    const ready = () => appliedSerial === serial && appliedSize.width === node.clientWidth && appliedSize.height === node.clientHeight;
    const pointAt = (point: CylinderScreenPoint) => ready() ? unprojectCylinder(session.terrain.geometry, point, applied, appliedSize) : undefined;
    const show = (point: CylinderPosition | undefined, select: boolean) => {
      if (!point) { output.textContent = ready() ? 'Outside cylinder geography · cuts and empty areas do not paint' : 'Updating cylinder view…'; return; }
      const { angularSamples: a, axialCells: z, radialCells: p } = session.terrain.metadata.representation.resolution;
      const key = session.terrain.resolve({ ...point, column: Math.round(point.u / (2 * Math.PI) * a), row: Math.round(point.v / (point.patchId === 'side' ? session.terrain.metadata.geometry.lengthMeters : session.terrain.metadata.geometry.radiusMeters) * (point.patchId === 'side' ? z : p)) });
      const height = session.terrain.read(key); output.textContent = `${height.toLocaleString(undefined, { maximumFractionDigits: 2 })} m · ${point.patchId} · sample ${key.index} · angle ${(point.u * 180 / Math.PI).toFixed(2)}°`;
      output.dataset.sample = String(key.index); output.dataset.elevation = String(height); output.dataset.position = JSON.stringify(point);
      if (select) { selection = point; setSelected(true); }
    };
    function guides(view: CylinderView, viewport: CylinderViewport) {
      if (view.mode !== 'map') return;
      const l = cylinderLayout(session.terrain.geometry, view, viewport), x = l.x + view.pan.x * l.scale, y = l.y - view.pan.y * l.scale;
      mark.strokeStyle = '#f0c875'; mark.lineWidth = 1.25; mark.setLineDash([5, 4]); mark.strokeRect(x - Math.PI * l.scale, y - l.h * l.scale, 2 * Math.PI * l.scale, 2 * l.h * l.scale);
      for (const sign of [-1, 1]) { mark.beginPath(); mark.arc(x, y - sign * (l.h + 1) * l.scale, l.scale, 0, 2 * Math.PI); mark.stroke(); }
      mark.setLineDash([]); mark.font = '12px system-ui'; mark.textAlign = 'center'; mark.lineWidth = 4; mark.strokeStyle = '#071924'; mark.fillStyle = '#f4f4e9';
      for (const [label, yy] of [['Side · periodic cut at left/right', y], ['End cap', y - (l.h + 1) * l.scale], ['Start cap', y + (l.h + 1) * l.scale]] as const) { mark.strokeText(label, x, yy); mark.fillText(label, x, yy); }
      for (const sign of [-1, 1]) { mark.strokeStyle = '#f6f7ef'; mark.lineWidth = 2; mark.beginPath(); mark.arc(x, y - sign * l.h * l.scale, 4, 0, 2 * Math.PI); mark.stroke(); }
      const colors = ['#ffdc75', '#92e9d2', '#bbacff', '#ffabb5'];
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2, degrees = ((view.phase + angle) * 180 / Math.PI % 360 + 360) % 360; mark.fillStyle = colors[i]!;
        const xx = x + (i < 2 ? angle : angle - 2 * Math.PI) * l.scale;
        for (const sign of [-1, 1]) { const yy = y - sign * l.h * l.scale; mark.fillRect(xx - 2, yy - 3, 4, 6); mark.fillText(`${Math.round(degrees)}°`, xx, yy - sign * 12); const capX = x + Math.sin(angle) * l.scale, capY = y - sign * (l.h + 1) * l.scale + sign * Math.cos(angle) * l.scale; mark.fillRect(capX - 2, capY - 2, 4, 4); }
      }
    }
    const drawOverlay = () => {
      const stencil = session.painting ? session.lastDab : session.stencil, visible = appliedSerial >= 0 && ready();
      if (overlayState && overlayState.stencil === stencil && overlayState.selection === selection && overlayState.view === applied && overlayState.ready === visible && overlayState.width === surface.width && overlayState.height === surface.height) return;
      overlayState = { stencil, selection, view: applied, ready: visible, width: surface.width, height: surface.height };
      const t = performance.now(); mark.setTransform(surface.width / appliedSize.width, 0, 0, surface.height / appliedSize.height, 0, 0); mark.clearRect(0, 0, appliedSize.width, appliedSize.height);
      if (!visible||cylinderCenterInspection(applied)) return;
      guides(applied, appliedSize);
      if (stencil) {
        mark.fillStyle = session.painting ? '#ffb756d9' : '#fff7b9d9';
        for (const index of stencil.indices) {
          const key = session.terrain.keyAt(index), d = session.terrain.owner(key), aliases = applied.mode === 'map' && d.patchId === 'side' ? session.terrain.aliases(key) : [d];
          for (const address of aliases) { const p = projectCylinder(session.terrain.geometry, session.terrain.positionAt(address), applied, appliedSize); if (p && p.x >= 0 && p.x <= appliedSize.width && p.y >= 0 && p.y <= appliedSize.height) { mark.beginPath(); mark.arc(p.x, p.y, 2.4, 0, 2 * Math.PI); mark.fill(); } }
        }
        const p = projectCylinder(session.terrain.geometry, stencil.center, applied, appliedSize); if (p) { mark.strokeStyle = '#fff3a8'; mark.lineWidth = 1; mark.beginPath(); mark.moveTo(p.x - 5, p.y); mark.lineTo(p.x + 5, p.y); mark.moveTo(p.x, p.y - 5); mark.lineTo(p.x, p.y + 5); mark.stroke(); }
      }
      if (selection) { const p = projectCylinder(session.terrain.geometry, selection, applied, appliedSize); if (p) { mark.strokeStyle = '#fff'; mark.lineWidth = 1.5; mark.beginPath(); mark.arc(p.x, p.y, 7, 0, 2 * Math.PI); mark.stroke(); } }
      const overlayMs = performance.now() - t;
      metrics.overlayMaxMs = Math.max(metrics.overlayMaxMs, overlayMs); recordPaintingStage('overlay', overlayMs);
    };
    const schedule = () => { if (alive && !frame) frame = requestAnimationFrame(paint); };
    const gpu = new CylinderWebGLRenderer(gpuCanvas.current!, session.cache, () => {
      // A lost device never changes numerical work. Block hit tests until a coherent
      // fallback/restored image has actually been submitted with the new transform.
      appliedSerial = -1; displayRevision = -1; raster?.return(undefined as never); raster = undefined; redraw = true; schedule();
    });
    const backing = (viewport: CylinderViewport) => {
      const { width, height } = surfaceDisplayDimensions(viewport, devicePixelRatio || 1);
      if (node.width !== width || node.height !== height) { node.width = width; node.height = height; }
      if (surface.width !== width || surface.height !== height) { surface.width = width; surface.height = height; overlayState = undefined; }
    };
    const presented = () => {
      metrics.renders++; bounded(metrics.brushLatencies, session.presented(displayRevision));
      if (!metrics.firstPresentationMs) metrics.firstPresentationMs = performance.now() - started;
      if (inputAt) { bounded(metrics.inputLatencies, [performance.now() - inputAt]); opportunityAt ||= inputAt; inputAt = 0; }
    };
    function paint() {
      frame = 0; if (!alive||session.closed) return; const frameStart = performance.now();
      // Following-RAF opportunity is a browser presentation proxy, not GPU completion or photons.
      if (opportunityAt) { bounded(metrics.presentationOpportunityLatencies, [frameStart - opportunityAt]); opportunityAt = 0; }
      if (lastFrame) { const gap = frameStart - lastFrame; bounded(metrics.frameGaps, [gap]); metrics.maxFrameGapMs = Math.max(metrics.maxFrameGapMs, gap); } lastFrame = frameStart;
      // Present camera/committed colors BEFORE spending this frame's numerical budget.
      // The DOM pointer marker is updated directly by input, independently of the dry-run stencil.
      if (pointerAt) { bounded(metrics.pointerFeedbackLatencies, [performance.now() - pointerAt]); pointerAt = 0; }
      const brush = cylinderCenterInspection(requested)?undefined:cylinderBrushFromControls(controlsRef.current, session.terrain.metadata.geometry.radiusMeters);
      node.style.cursor = brush ? 'crosshair' : 'grab';if(cylinderCenterInspection(requested))pointer.current!.hidden=true;
      if (gpu.available && (redraw || displayRevision !== session.cache.sourceRevision)) {
        raster?.return(undefined as never); raster = undefined;
        try {
          const viewport = size(), at = performance.now(), receipt = gpu.present(requested, viewport, appearanceRef.current);
          backing(viewport); ctx.clearRect(0, 0, node.width, node.height);
          applied = requested; appliedSize = viewport; appliedSerial = serial; displayRevision = receipt.revision; redraw = false; front = undefined; spare = undefined;
          bounded(metrics.renderTimes, [performance.now() - at]); bounded(metrics.uploadTimes, [receipt.uploadMs]); bounded(metrics.submitTimes, [receipt.submitMs]); bounded(metrics.resizeTimes, [receipt.resizeMs]); recordPaintingStage('gpuElevationUpload', receipt.uploadMs); recordPaintingStage('gpuSubmit', receipt.submitMs); presented();
        } catch (e) { gpu.fail(e); appliedSerial = -1; displayRevision = -1; redraw = true; }
      }
      session.requestPreview(hover && pointAt(hover), brush, applied);
      if (!gpu.available && !raster && (redraw || !front || front.revision !== session.cache.sourceRevision)) {
        pendingView = requested; pendingSize = size(); pendingSerial = serial;
        if (pendingSize.width > 0 && pendingSize.height > 0) {
          const mobile = matchMedia('(pointer: coarse)').matches, interactive = session.painting || performance.now() < interactionUntil, budget = cylinderCenterInspection(requested)?80000:interactive ? mobile ? 22000 : 40000 : mobile ? 90000 : 160000;
          raster = cylinderRasterSteps(session.cache, pendingView, pendingSize, budget, spare, appearanceRef.current); spare = undefined; redraw = false; metrics.rasterStartedAt = performance.now(); metrics.rasterTotalMs = 0;
        }
      }
      for (let work = 0; raster && work < 16 && performance.now() - frameStart < 9; work++) {
        const at = performance.now(), result = raster.next(), elapsed = performance.now() - at; metrics.renderSliceMaxMs = Math.max(metrics.renderSliceMaxMs, elapsed); metrics.rasterTotalMs += elapsed; recordPaintingStage('cpuRasterSlice', elapsed);
        if (result.done) {
          if (front) spare = front.pixels; front = result.value; raster = undefined; applied = pendingView; appliedSize = pendingSize; appliedSerial = pendingSerial;
          backing(appliedSize);
          scratch.width = front.columns; scratch.height = front.rows; scratchContext.putImageData(new ImageData(front.pixels as Uint8ClampedArray<ArrayBuffer>, front.columns, front.rows), 0, 0);
          ctx.setTransform(node.width / appliedSize.width, 0, 0, node.height / appliedSize.height, 0, 0); ctx.clearRect(0, 0, appliedSize.width, appliedSize.height); ctx.imageSmoothingEnabled = true; ctx.drawImage(scratch, 0, 0, appliedSize.width, appliedSize.height);
          displayRevision = front.revision; metrics.rasterSnapshotBytes = front.snapshotBytes; bounded(metrics.renderTimes, [metrics.rasterTotalMs]); presented();
        }
      }
      if (diagnostics.current) {
        const active = gpu.available, width = active ? gpuCanvas.current!.width : front?.columns ?? 0, height = active ? gpuCanvas.current!.height : front?.rows ?? 0;
        const res = session.terrain.metadata.representation.resolution;
        const text = `${active ? 'Hardware WebGL2' : 'CPU fallback'}\n${gpu.statistics.renderer || 'Graphics renderer unavailable'}${active ? '' : `\n${gpu.statistics.reason || 'Preparing CPU display'}`}\nTerrain backing: ${width} × ${height} px\nPresentation backing: ${node.width} × ${node.height} px\nNumerical: ${res.angularSamples} angular / ${res.axialCells} axial / ${res.radialCells} radial · ${session.terrain.sampleCount.toLocaleString()} samples`;
        if (diagnostics.current.textContent !== text) diagnostics.current.textContent = text;
        diagnostics.current.dataset.backend = active ? 'webgl2' : 'cpu';
      }
      drawOverlay(); if (hover) show(pointAt(hover), false);
      const pending = session.locked ? session.painting : session.pump(3), previewPending = session.pumpPreview();
      drawOverlay(); // A completed dry-run stencil must be visible even when no work remains.
      const pendingPresentation = displayRevision !== session.cache.sourceRevision;
      pointer.current!.dataset.pending = String(session.pendingWork || session.previewPending || pendingPresentation || !ready());
      pointer.current!.textContent = session.pendingWork || session.previewPending || pendingPresentation ? 'Pointer · pending work' : 'Pointer';
      const sig = JSON.stringify([session.modified, session.message, session.previewMessage, session.painting, session.processing, session.history.canUndo, session.history.canRedo, ready()]); if (sig !== signature) { signature = sig; update(v => v + 1); }
      node.dataset.renderer = gpu.available ? 'webgl2' : 'cpu'; node.dataset.modified = String(session.modified); node.dataset.ready = String(ready()); node.dataset.mode = applied.mode; node.dataset.inspecting=String(cylinderCenterInspection(applied));node.dataset.eye=JSON.stringify(applied.eyeMeters??null);node.dataset.frame=JSON.stringify(applied.frame); node.dataset.processing = String(session.processing); node.dataset.painting = String(session.painting); node.dataset.revision = String(session.terrain.revision); node.dataset.displayRevision = String(displayRevision); node.dataset.historyEntries = String(session.history.statistics.entries); node.dataset.zoom = String(applied.zoom); node.dataset.previewPending = String(session.previewPending);
      if (pending || previewPending || raster || redraw || opportunityAt || displayRevision !== session.cache.sourceRevision) schedule(); else lastFrame = 0;
    }
    const change = (fn: (view: CylinderView) => CylinderView, interactive = false) => {
      if (session.locked) return;
      session.cancel('Navigation interrupted drawing'); inputAt ||= performance.now();
      const at = performance.now(), next = fn(requested); bounded(metrics.cameraTimes, [performance.now() - at]);
      // CPU fallback completes one coherent in-flight view, then takes the latest
      // request. Cancelling every camera event would starve continuous navigation.
      if (gpu.available || next.mode !== requested.mode) { raster?.return(undefined as never); raster = undefined; }
      requested = next; serial++; node.dataset.ready = 'false'; redraw = true; setMode(requested.mode); setZoom(requested.zoom);setInspecting(cylinderCenterInspection(requested));
      if (interactive) { interactionUntil = performance.now() + 180; clearTimeout(refinement); refinement = window.setTimeout(() => { redraw = true; schedule(); }, 200); }
      schedule();
    };
    const stop = () => { if (session.locked) return; navigation.cancel(); session.cancel('Workspace interruption'); schedule(); };
    const navigation = attachSurfaceEditing(node, {
      paintingEnabled: () => !session.locked && !cylinderCenterInspection(requested) && !!cylinderBrushFromControls(controlsRef.current, session.terrain.metadata.geometry.radiusMeters),
      begin(point) { if(cylinderCenterInspection(requested))return false;const p = pointAt(point), brush = cylinderBrushFromControls(controlsRef.current, session.terrain.metadata.geometry.radiusMeters); if (!p || !brush || session.processing) return false; const accepted = session.begin(p, brush, applied); if (accepted) show(p, true); return accepted; },
      move(point) { const anchor = navigation.anchor, p = pointAt(point); if (!p || anchor && !continuousCylinderScreenSegment(session.terrain.geometry, anchor, point, applied, appliedSize)) { interruptionReason = 'Stroke reached a projection cut, empty area, or large pointer jump; lift and recenter before continuing'; return false; } return session.move(p); },
      release: () => session.release(), stop: () => { session.cancel(interruptionReason); interruptionReason = 'Input interruption'; schedule(); }, hover(point) { hover = point ?? undefined; pointer.current!.hidden = cylinderCenterInspection(requested)||!point || !cylinderBrushFromControls(controlsRef.current, session.terrain.metadata.geometry.radiusMeters); if (point) { pointerAt = performance.now(); pointer.current!.style.transform = `translate(${point.x}px, ${point.y}px)`; } schedule(); },
      inspect(point, select) { show(pointAt(point), select); schedule(); },
      drag(dx, dy) { change(view => navigateCylinder(session.terrain.geometry, view, cylinderCenterInspection(view)?-dx:dx, dy, size()), true); },
      zoom(factor) { change(view => ({ ...view, zoom: Math.max(.6, Math.min(6, view.zoom * factor)) }), true); },
      reset() { change(view => ({...initialCylinderView(view.mode),...(view.interior?{interior:true,interiorView:view.interiorView,eyeMeters:view.eyeMeters}:{})})); },
    });
    commands.current = {pixel:point=>{if(gpu.available)gpu.present(requested,size(),appearanceRef.current);const source=gpu.available?gpuCanvas.current!:node,temp=document.createElement('canvas');temp.width=temp.height=1;const c=temp.getContext('2d')!;c.drawImage(source,point.x/source.clientWidth*source.width,point.y/source.clientHeight*source.height,1,1,0,0,1,1);return Array.from(c.getImageData(0,0,1,1).data);}, getView:()=>structuredClone(requested),restore:view=>{stop();change(()=>view);},inside:()=>{if(session.locked||cylinderCenterInspection(requested))return;navigation.finish();session.release();void session.drainForSave().then(()=>{if(!alive||session.closed||cylinderCenterInspection(requested))return;savedEditView=requested;stop();change(view=>({...view,mode:'physical',interior:true,interiorView:'center',eyeMeters:[0,0,0]}));}).catch(e=>{session.message=String(e);schedule();});},stop, mode: mode => { stop(); change(view => ({ ...(cylinderCenterInspection(view)&&savedEditView?savedEditView:view), mode,...(surfaceRole?{interior:surfaceRole==='interior',interiorView:'edit',eyeMeters:undefined}:{}) })); }, zoom: factor => { stop(); change(view => ({ ...view, zoom: Math.max(.6, Math.min(6, view.zoom * factor)) }), true); }, reset: () => { stop(); change(view => ({...initialCylinderView(view.mode),...(view.interior?{interior:true,interiorView:view.interiorView,eyeMeters:view.eyeMeters}:{})})); }, center: region => {
      stop(); const p = region ? { ...session.terrain.metadata.identity, patchId: region, u: requested.phase, v: region === 'side' ? session.terrain.metadata.geometry.lengthMeters / 2 : 0 } : selection;
      if (p) change(view => recenterCylinder(session.terrain.geometry, view, p));
    }, undo: () => { stop(); session.undo(); schedule(); }, redo: () => { stop(); session.redo(); schedule(); }, refresh: schedule, finish: () => { navigation.finish(); session.release(); schedule(); }, display: () => { raster?.return(undefined as never); raster = undefined; redraw = true; schedule(); } };
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
      snapshot: (includeWords = true) => structuredClone({ ...(includeWords ? { words: [...new Uint32Array(session.terrain.copyElevations().buffer)] } : {}), identity: session.terrain.metadata.identity, metadata: session.terrain.metadata, view: applied, requested, size: appliedSize, ready: ready(), painting: session.painting, processing: session.processing, name: session.name, hasSaved: session.hasSaved, modified: session.modified, checkpointSamples: session.checkpointSamples, locked: session.locked, history: session.history.statistics, operations: session.history.operations, statistics: session.statistics, workDiagnostics: session.workDiagnostics, previewDiagnostics: session.previewDiagnostics, cacheBytes: session.cache.byteLength, displayRevision, revision: session.terrain.revision, rasterBytes: (front?.pixels.byteLength ?? 0) + (spare?.byteLength ?? 0), appearance: appearanceRef.current, renderer: { kind: gpu.available ? 'webgl2' : 'cpu', width: gpu.available ? gpuCanvas.current!.width : front?.columns, height: gpu.available ? gpuCanvas.current!.height : front?.rows, ...gpu.statistics }, metrics, controls: controlsRef.current, stencil: session.stencil && { ...session.stencil, indices: [...session.stencil.indices] }, lastDab: session.lastDab && { ...session.lastDab, indices: [...session.lastDab.indices] }, pendingWork: session.pendingWork, pendingPositions: session.pendingPositions, previewPending: session.previewPending, previewMessage: session.previewMessage, message: session.message }),
      project: p => projectCylinder(session.terrain.geometry, { ...session.terrain.metadata.identity, ...p }, applied, appliedSize),
      sample: index => { const key = session.terrain.keyAt(index), address = session.terrain.owner(key); return { key, address, aliases: session.terrain.aliases(key), position: session.terrain.positionAt(address), screen: projectCylinder(session.terrain.geometry, session.terrain.positionAt(address), applied, appliedSize) }; },
    };
    schedule();
    return () => { onViewChangeRef.current?.(cylinderCenterInspection(requested)?savedEditView??requested:requested);alive = false; inspection = undefined; cancelAnimationFrame(frame); clearTimeout(refinement); raster?.return(undefined as never); raster = undefined; overlayState = undefined; front = undefined; spare = undefined; navigation.dispose(); gpu.dispose(); session.changed = () => {}; session.stopped = () => {};session.releaseViewport(); resize.disconnect(); window.removeEventListener('keydown', key); window.removeEventListener('beforeunload', departure); window.removeEventListener('pagehide', stop); document.removeEventListener('fullscreenchange', fullscreenChanged); node.width = surface.width = scratch.width = 0; };
  }, [session, preparationMs]);
  const tool = (name: CylinderControls['tool'], label: string) => <button key={name} type="button" disabled={session.locked||inspecting} aria-pressed={controls.tool === name} onClick={() => { commands.current.stop(); setControls(c => ({ ...c, tool: name })); }}>{label}</button>;
  const radius = session.terrain.metadata.geometry.radiusMeters, brush = cylinderBrushFromControls(controls, radius);
  const physicalTools = <>      <h2>Physical brush</h2><label>Cylinder brush radius (m)<input type="number" step="any" min={radius * .005} max={radius * 2} value={controls.radius} onChange={e => setControls(c => ({ ...c, radius: e.target.value }))} /></label>
      {(controls.tool === 'raise' || controls.tool === 'lower') && <label>Cylinder strength (m/dab)<input type="number" min="0" step="any" value={controls.strength} onChange={e => setControls(c => ({ ...c, strength: e.target.value }))} /></label>}
      {(controls.tool === 'smooth' || controls.tool === 'flatten') && <label>Cylinder intensity (%)<input type="number" min="0" max="100" step="any" value={controls.intensity} onChange={e => setControls(c => ({ ...c, intensity: e.target.value }))} /></label>}
      {controls.tool === 'flatten' && <label>Cylinder target elevation (m)<input type="number" step="any" value={controls.target} onChange={e => setControls(c => ({ ...c, target: e.target.value }))} /></label>}
      {controls.tool !== 'navigate' && !brush && <p role="alert">Enter valid physical brush settings before drawing.</p>}
      <p>Radius: {(radius * .005).toLocaleString()}–{(radius * 2).toLocaleString()} m. Large or expensive footprints stop safely at interactive limits. Exact-boundary numerical failures retain an undoable prefix.</p>
      <h2>Working surface</h2><p>Physical view protects occluded samples. If a dab reaches hidden terrain, reduce its radius, rotate, or use Surface map. Dots show exact canonical samples changed by a dry-run dab; flat Smooth can have no changes.</p>
      <p>In Surface map, matching angle markers connect the real rims. Only the white tangent join is continuous on screen. Dashed edges are cuts: lift and restart, or select a point and Center selection to move the working meridian.</p>
      <p id="cylinder-help">Mouse, pen or one finger draw. Rotate / Pan, Space-drag, middle-drag or two fingers navigate. Arrows navigate; +/− zoom; Home fits; Enter inspects the center. Ctrl/⌘ Z undoes, Ctrl/⌘ Shift Z redoes. Escape stops and closes tools. Release drains accepted input.</p>
      <h2>Terrain display</h2><label>Cylinder terrain appearance<select aria-label="Cylinder terrain appearance" value={appearance} onChange={e => setAppearance(e.target.value as CylinderAppearance)}><option value="relief">Shaded relief · 5× display</option><option value="elevation">Elevation colors</option></select></label>
      <p>Coasts follow interpolated elevation. Relief uses physical slopes with 5× display exaggeration; it adds no terrain detail or displacement.</p>
      <details className="cylinder-diagnostics"><summary>Display diagnostics</summary><output ref={diagnostics} aria-label="Cylinder display diagnostics">Preparing display…</output></details>
</>;
  const navigation = <><button aria-pressed={mode === 'physical'&&!inspecting} onClick={() => commands.current.mode('physical')}>Physical view</button>{surfaceRole==='interior'&&<button aria-pressed={inspecting} disabled={session.locked||session.processing} onClick={()=>commands.current.inside()}>View from inside</button>}<button aria-pressed={mode === 'map'} onClick={() => commands.current.mode('map')}>Surface map</button><button onClick={() => commands.current.zoom(.8)} aria-label="Zoom out">−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => commands.current.zoom(1.25)} aria-label="Zoom in">+</button><button onClick={() => commands.current.reset()}>Fit cylinder</button><details className="cylinder-regions"><summary>Center region</summary><div onClick={event=>{if(surfaceRole&&event.target instanceof Element&&event.target.closest('button')){const details=event.currentTarget.closest('details');details?.removeAttribute('open');details?.querySelector('summary')?.focus({preventScroll:true});}}}><button onClick={() => commands.current.center('side')}>Side</button><button onClick={() => commands.current.center('cap-start')}>Start cap</button><button onClick={() => commands.current.center('cap-end')}>End cap</button><button disabled={!selected} onClick={() => commands.current.center()}>Center selection</button></div></details>{!workspace && fullscreenSupported && <button aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={() => { commands.current.stop(); void (document.fullscreenElement ? document.exitFullscreen() : root.current!.requestFullscreen()).catch(e => { session.message = `Fullscreen unavailable: ${String(e)}`; commands.current.refresh(); }); }}>⛶</button>}</>;
  const picker = inspecting?<span>View from inside · drag to look · painting paused</span>:<>{tool('navigate', 'Rotate / Pan')}{tool('raise', 'Raise')}{tool('lower', 'Lower')}{tool('smooth', 'Smooth')}{tool('flatten', 'Flatten')}</>;
  const workspaceView=useMemo<CylinderWorkspaceView>(()=>({ inspecting,tools: <>{inspecting&&<p role="status">View from inside is read-only. Choose Physical view or Surface map to edit. Your brush choices are retained.</p>}<fieldset disabled={inspecting}>{physicalTools}</fieldset><p className="hint">Reference radius {radius.toLocaleString()} m · axial length {session.terrain.metadata.geometry.lengthMeters.toLocaleString()} m · {session.terrain.metadata.representation.resolution.angularSamples} angular samples. Elevations color the reference shape without displacing it. Save explicitly through Atlas.</p></>, toolPicker: picker, navigation, canUndo: session.history.canUndo, canRedo: session.history.canRedo, processing: session.processing }),[controls,mode,zoom,selected,appearance,inspecting,session.locked,session.modified,session.painting,session.processing,session.message,session.previewMessage,session.history.canUndo,session.history.canRedo,surfaceRole]);
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
