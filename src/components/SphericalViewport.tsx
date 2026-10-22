import {traceSphereExcavation,sphereFreeVolume} from '../surfaces/hollow-sphere-excavation.ts';
'use client';

import { useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { dot3, unitDirection, CUBE_FACES, FACE_BASES, FACE_EDGES, QUARTER_PI, type Vec3 } from '../surfaces/cube-sphere.ts';
import type { SphericalTerrain } from '../terrain/spherical.ts';
import { attachSphericalNavigation } from '../interaction/spherical-navigation.ts';
import { attachSphericalEditing } from '../interaction/spherical-editing.ts';
import type { SphericalSession } from '../editor/spherical-session.ts';
import { sphericalBrushPreview } from '../rendering/spherical-brush-preview.ts';
import { continuousNetSegment } from '../rendering/spherical-gesture-path.ts';
import { edgePanVelocity } from '../rendering/edge-pan.ts';
import { advanceGlobeLimb, globeLimbZone, LIMB_DWELL_MS } from '../rendering/spherical-limb-assist.ts';
import type { SphericalBrushVisibility } from '../terrain/spherical-brush.ts';
import { isTextInput } from '../interaction/canvas-navigation.ts';
import { SphericalBrushControls, defaultSphericalControls, sphericalBrushFromControls,type SphericalControlState } from './SphericalBrushControls.tsx';
import { type SphericalDisplayCache } from '../rendering/spherical-raster.ts';
import { SphereWebGLRenderer,type SphereExcavationDisplay } from '../rendering/spherical-webgl.ts';
import { sphericalFieldRaster } from '../rendering/spherical-field-raster.ts';
import { type SphereAppearance, type SphereFieldSnapshot } from '../rendering/spherical-elevation.ts';
import { prepareSphericalField } from '../editor/prepare-spherical-field.ts';
import { surfaceDisplayDimensions } from '../rendering/surface-renderer.ts';
import { yieldPersistence } from '../persistence/cooperative-work.ts';
import { INITIAL_SPHERICAL_VIEW, sphereCenterInspection, inspectSphere, netEdgeIsJoined, netFaceCoordinates, netFaceRect, panSphereNet, projectSphere, recenterSphere, rotateSphere, sphericalLayout, unprojectSphere, zoomSphere, type ScreenPoint, type SphericalView } from '../rendering/spherical-view.ts';
import styles from './SphericalPreview.module.css';
import { SphericalStorageControls, type SphericalPersistenceUi } from './SphericalStorageControls.tsx';

export interface SphericalViewportHandle { finishInteraction(): void; stop(): void; undo(): void; redo(): void; editView?():void;preparePick?():void;focusDirection?(direction:Vec3):void;readPixel?(point:ScreenPoint):number[];getView?():SphericalView;restoreView?(view:SphericalView):void;setInspectionEye?(eye:Vec3,forward?:Vec3):void }
export interface SphericalWorkspaceView { inspecting?:boolean;tools: ReactNode; toolPicker: ReactNode; navigation: ReactNode; canUndo: boolean; canRedo: boolean; processing: boolean }
export interface SphericalViewportProps { readonly terrain: SphericalTerrain; readonly cache: SphericalDisplayCache; readonly onClose: () => void; readonly preparationMs?: number; readonly maxPreparationTaskMs?: number; readonly editor?: SphericalSession; readonly persistence?: SphericalPersistenceUi; readonly workspace?: (view: SphericalWorkspaceView) => ReactNode; readonly handleRef?: Ref<SphericalViewportHandle>;readonly onWorkspaceView?:(view:SphericalWorkspaceView)=>void;readonly mapControls?:ReactNode;readonly excavation?:SphereExcavationDisplay;readonly onPick?:(direction:Vec3)=>void;readonly previewRadius?:number;readonly annotations?:readonly {id:string;direction:Vec3;label:string;referenceViewsOnly?:boolean}[];readonly surfaceRole?:'exterior'|'interior';readonly initialView?:SphericalView;readonly onViewChange?:(view:SphericalView)=>void;readonly sharedControls?:{value:SphericalControlState;change:(value:SphericalControlState)=>void} }
export function SphericalViewport({ terrain, cache, onClose, preparationMs = 0, maxPreparationTaskMs = 0, editor, persistence, workspace, handleRef,surfaceRole,initialView,onViewChange,sharedControls,excavation,onPick,previewRadius,annotations=[],mapControls,onWorkspaceView }: SphericalViewportProps) {
  const persistenceRef = useRef(persistence); persistenceRef.current = persistence;
  const canvasRef = useRef<HTMLCanvasElement>(null), rootRef = useRef<HTMLElement>(null), readoutRef = useRef<HTMLOutputElement>(null);
  const gpuRef = useRef<HTMLCanvasElement>(null), selectionMarkers = useRef<SVGGElement>(null), pendingRef = useRef<HTMLDivElement>(null);
  const diagnosticsRef = useRef<HTMLOutputElement>(null);
  const [appearance, setAppearance] = useState<SphereAppearance>('relief'), appearanceRef = useRef(appearance); appearanceRef.current = appearance;
  const viewRef = useRef<SphericalView>(initialView??(surfaceRole==='interior'?{...INITIAL_SPHERICAL_VIEW,interior:true}:INITIAL_SPHERICAL_VIEW)), selectedRef = useRef<Vec3 | null>(null);
  const onViewChangeRef=useRef(onViewChange);onViewChangeRef.current=onViewChange;
  const previewRef = useRef<SVGPathElement>(null),annotationGroup=useRef<SVGGElement>(null),excavationRef=useRef(excavation),pickRef=useRef(onPick),radiusRef=useRef(previewRadius),annotationRef=useRef(annotations);excavationRef.current=excavation;pickRef.current=onPick;radiusRef.current=previewRadius;annotationRef.current=annotations;
  const commands = useRef({ change(_fn: (view: SphericalView) => SphericalView) {}, inspect(_point: ScreenPoint, _select: boolean) {}, reset() {}, stop() {}, undo() {}, redo() {}, repaint() {}, prepareSave() {},pixel(_point:ScreenPoint):number[]{return[];}, inspection(_eye:Vec3,_forward?:Vec3){} });
  useImperativeHandle(handleRef, () => ({ finishInteraction: () => commands.current.prepareSave(), stop: () => commands.current.stop(), undo: () => commands.current.undo(), redo: () => commands.current.redo(),editView:()=>commands.current.change(view=>({...view,mode:'globe',interior:surfaceRole==='interior',interiorView:'edit',eyeMeters:undefined})),focusDirection:direction=>commands.current.change(view=>({...recenterSphere(view,direction),mode:'globe',interior:surfaceRole==='interior',interiorView:'edit',eyeMeters:undefined})),preparePick:()=>{if(sphereCenterInspection(viewRef.current))commands.current.change(view=>({...view,mode:'globe',interior:surfaceRole==='interior',interiorView:'edit',eyeMeters:undefined}));},readPixel:point=>commands.current.pixel(point),getView:()=>structuredClone(viewRef.current),restoreView:view=>commands.current.change(()=>view),setInspectionEye:(eye,forward)=>commands.current.inspection(eye,forward) }), []);
  const [ownControls, setOwnControls] = useState(() => defaultSphericalControls(terrain.metadata.geometry.radiusMeters));
  const controls=sharedControls?.value??ownControls,setControls=sharedControls?.change??setOwnControls;
  const controlsRef = useRef(controls); controlsRef.current = controls;
  const [inspecting,setInspecting]=useState(sphereCenterInspection(viewRef.current));
  const [editorState, setEditorState] = useState({ modified: false, canUndo: false, canRedo: false, busy: false });
  const [panel, setPanel] = useState(false), [mode, setMode] = useState<'globe' | 'net'>(viewRef.current.mode), [zoom, setZoom] = useState(viewRef.current.zoom), [hasSelection, setHasSelection] = useState(false);
  const [fullscreen, setFullscreen] = useState(false), [fullscreenSupported, setFullscreenSupported] = useState(false), [error, setError] = useState('');
  const toggleRef = useRef<HTMLButtonElement>(null), panelRef = useRef<HTMLElement>(null);
  // Focus during the panel commit; a delayed RAF can steal focus from subsequent typing.
  useLayoutEffect(() => { if (panel) panelRef.current?.querySelector<HTMLElement>('input, button')?.focus(); }, [panel]);
  useLayoutEffect(() => { commands.current.repaint(); }, [controls, appearance,excavation,annotations,onPick,previewRadius]);
  useLayoutEffect(() => {
    const canvas = canvasRef.current!, output = readoutRef.current!, root = rootRef.current!, context = canvas.getContext('2d')!;
    setFullscreenSupported(!!document.fullscreenEnabled && typeof root.requestFullscreen === 'function'); setFullscreen(!!document.fullscreenElement);
    const scratch = document.createElement('canvas'), scratchContext = scratch.getContext('2d')!;
    let frame = 0, active = true, raster: Uint8ClampedArray | undefined, pendingInspection: { direction: Vec3 | null; select: boolean } | undefined;
    let initialized = false, gpu: SphereWebGLRenderer | undefined, serial = 0, appliedSerial = -1, applied: SphericalView | undefined, appliedSize = { width: 0, height: 0 }, displayRevision = -1, lastSceneKey = '', assistedCamera = false;
    let cpuJob: ReturnType<typeof sphericalFieldRaster> | undefined, cpuView: SphericalView | undefined, cpuSize = { width: 0, height: 0 }, cpuSerial = -1, cpuKey = '', cpuEpoch: SphereFieldSnapshot | undefined, cpuQuality = '', appliedQuality = '';
    const cpu = { images: 0, slices: 0, computeMs: 0, maxSliceMs: 0, snapshotBytes: 0 };
    canvas.dataset.ready = 'false'; delete canvas.dataset.mode;
    let paints = 0, requests = 0, dirty = true, interactiveUntil = 0, refinementTimer = 0, inputAt = 0, hover: ScreenPoint | null = null;
    let edgeSince = 0, edgeTime = 0, editingNavigation: ReturnType<typeof attachSphericalEditing> | undefined;
    let limbSince = 0, limbTime = 0, limbSteps = 0, limbRadians = 0;
    let assistedVisibility: SphericalBrushVisibility | undefined, acceptedLimb = false;
    let pendingAssistance: { serial: number; dx: number; dy: number; visibility?: SphericalBrushVisibility; angle?: number } | undefined;
    let selectionKey = '',annotationKey='';let oppositeEpoch:SphereFieldSnapshot|undefined,oppositeSource:SphereExcavationDisplay['opposite']|undefined;
    let strokeDisplayEpoch = cache.sourceRevision;
    const renderTimes: number[] = [], inputLatencies: number[] = [], brushLatencies: number[] = [];
    const size = () => ({ width: canvas.clientWidth, height: canvas.clientHeight });
    const poseCurrent = () => !!applied && appliedSerial === serial && appliedSize.width === canvas.clientWidth && appliedSize.height === canvas.clientHeight;
    const backing = () => { const dimensions = surfaceDisplayDimensions(size(), devicePixelRatio || 1); if (canvas.width !== dimensions.width || canvas.height !== dimensions.height) { canvas.width = dimensions.width; canvas.height = dimensions.height; } context.setTransform(dimensions.width / canvas.clientWidth, 0, 0, dimensions.height / canvas.clientHeight, 0, 0); return dimensions; };
    const physicalHit=(direction:Vec3,view:SphericalView)=>{const cut=excavationRef.current,center=sphereCenterInspection(view);if(!cut?.model.primitives.length||view.mode!=='globe'||view.interior&&!center)return null;const f=view.frame,x=dot3(direction,f.right),y=dot3(direction,f.up),o=center?(view.eyeMeters??[0,0,0]).map(v=>v/cut.model.radiusMeters)as unknown as Vec3:f.right.map((v,i)=>v*x+f.up[i]!*y+f.forward[i]!*4)as unknown as Vec3;return{cut,hit:traceSphereExcavation(cut.model,o,center?direction:f.forward.map(v=>-v)as unknown as Vec3)};};
    const showInspection = (direction: Vec3 | null, select: boolean) => {
      output.setAttribute('aria-live', select ? 'polite' : 'off');
      if (!direction) {
        output.textContent = 'Outside spherical surface · gaps and the far side cannot be selected'; delete output.dataset.sample; delete output.dataset.elevation; delete output.dataset.direction;
        if (select) { selectedRef.current = null; setHasSelection(false); } return;
      }
      const physical=applied&&physicalHit(direction,applied);if(physical){const hit=physical.hit;if(!hit||hit.kind==='rock'){output.textContent=hit?'Rock bore wall - physical reference-shell cut':'Open space through the reference shell';delete output.dataset.sample;delete output.dataset.elevation;delete output.dataset.direction;if(select){selectedRef.current=null;setHasSelection(false);}return;}const d=unitDirection(hit.point);if(hit.kind!==(surfaceRole??'exterior')){const sample=inspectSphere(physical.cut.oppositeTerrain,d);output.textContent=`${hit.kind==='interior'?'Inside':'Outside'} through opening - ${sample.elevation.toLocaleString()} m - switch sides to edit`;output.dataset.sample=String(sample.key.index);output.dataset.elevation=String(sample.elevation);output.dataset.direction=JSON.stringify(d);if(select){selectedRef.current=null;setHasSelection(false);}return;}direction=d;}
      const sample = inspectSphere(terrain, direction);
      output.textContent = `${surfaceRole?surfaceRole==='interior'?'Inside · ':'Outside · ':''}${sample.elevation.toLocaleString(undefined, { maximumFractionDigits: 2 })} m · ${sample.position.patchId} · sample ${sample.key.index} · direction ${sample.direction.map((v) => v.toFixed(4)).join(', ')}`;
      output.dataset.sample = String(sample.key.index); output.dataset.elevation = String(sample.elevation); output.dataset.direction = JSON.stringify(sample.direction);
      if (select) { selectedRef.current = sample.direction; setHasSelection(true); }
    };
    const paint = () => {
      frame = 0; if (!active) return;
      const start = performance.now(), viewport = size(); let view = viewRef.current;
      if (!initialized || viewport.width === 0 || viewport.height === 0) return;
      if (editor) {
        // Catch up accepted input without dropping points. Keep ordinary feedback light;
        // a released/backlogged stroke gets one bounded 16 ms slice (still <=8 atomic dabs).
        const pending = editor.locked ? editor.painting : editor.pump(editor.processing || editor.pendingPoints > 1 ? 16 : 6), regions = editor.updateDisplay();
        if (editor.displayPending) schedule(false);
        if (regions.length) { dirty = true; if (hover && applied) pendingInspection = { direction: unprojectSphere(terrain, hover, applied, appliedSize), select: false }; }
        setEditorState((old) => { const next = { modified: editor.modified, canUndo: editor.history.canUndo, canRedo: editor.history.canRedo, busy: editor.processing }; return Object.keys(next).every((key) => old[key as keyof typeof old] === next[key as keyof typeof next]) ? old : next; });
        canvas.dataset.modified = String(editor.modified); canvas.dataset.historyEntries = String(editor.history.length); canvas.dataset.processing = String(editor.processing); canvas.dataset.textureRevision = String(cache.sourceRevision); canvas.dataset.editStatistics = JSON.stringify(editor.statistics);
        if (pending) schedule();
        const point = editingNavigation?.drawingPoint;
        const velocity = point && controlsRef.current.edgeAssist && view.mode === 'net' ? edgePanVelocity(point, viewport) : { x: 0, y: 0 };
        if (point && editor.painting && !editor.locked && !editor.backlogged && (velocity.x || velocity.y)) {
          const now = performance.now(); if (!edgeSince) edgeSince = now;
          if (now - edgeSince >= 200 && poseCurrent()) {
            const dt = Math.min(32, edgeTime ? now - edgeTime : 16) / 1000, before = viewRef.current;
            const next = panSphereNet(before, velocity.x * dt * .5, velocity.y * dt * .5, viewport), side = sphericalLayout(before, viewport).face;
            const dx = (next.pan.x - before.pan.x) * side, dy = (next.pan.y - before.pan.y) * side;
            viewRef.current = next; if (dx || dy) serial++;
            view = next;
            if (dx || dy) { pendingAssistance = { serial, dx, dy }; dirty = true; canvas.dataset.edgeAssisting = 'true'; }
          }
          edgeTime = now; schedule();
        } else { edgeSince = 0; edgeTime = 0; canvas.dataset.edgeAssisting = 'false'; }
        const activeBrush = sphericalBrushFromControls(controlsRef.current, terrain.metadata.geometry.radiusMeters);
        const limb = point && editor.painting && !editor.locked && controlsRef.current.limbAssist && activeBrush && globeLimbZone(view, point, viewport);
        canvas.dataset.limbAssisting = 'false'; canvas.dataset.limbPaused = String(!!limb && editor.backlogged);
        if (limb && point && activeBrush) {
          const now = performance.now(); if (!limbSince) limbSince = now;
          const bounds = canvas.getBoundingClientRect();
          if (document.elementFromPoint(bounds.left + point.x, bounds.top + point.y) !== canvas) { editingNavigation?.cancel(); limbSince = 0; }
          else {
            if (now - limbSince >= LIMB_DWELL_MS && !editor.backlogged && poseCurrent()) {
              const before = viewRef.current, step = advanceGlobeLimb(before, point, viewport, limbTime ? now - limbTime : 16, activeBrush.radiusMeters / terrain.metadata.geometry.radiusMeters);
              if (step) {
                viewRef.current = step.view; view = step.view; serial++;
                pendingAssistance = { serial, dx: 0, dy: 0, visibility: { hemisphere: step.fromHemisphere, endHemisphere: step.toHemisphere }, angle: step.angle };
                dirty = true;
              }
            }
            // O(1) dwell/backpressure checks; stationary dwell does not rasterize again.
            limbTime = now; schedule(false);
          }
        } else { limbSince = 0; limbTime = 0; }
        canvas.dataset.limbSteps = String(limbSteps); canvas.dataset.limbRadians = String(limbRadians);
      }
      const field = cache.elevationField!, mobile = matchMedia('(pointer: coarse)').matches, interactive = performance.now() < interactiveUntil;
      // A pending worker is not new visible geography. Retain the current CPU
      // image/quality until a new coherent field exists; avoid a pre-commit LOD
      // repaint that could be mistaken for actual brush feedback.
      const quality = editor?.painting ? field.sourceRevision > strokeDisplayEpoch ? 'editing' : appliedQuality || 'settled' : interactive ? 'navigation' : 'settled';
      let budget = quality === 'editing' ? mobile ? 35_000 : 80_000 : quality === 'navigation' ? mobile ? 70_000 : 180_000 : mobile ? 220_000 : 420_000;
      const cut=excavationRef.current;if(cut?.model.primitives.length&&sphereCenterInspection(view))budget=Math.min(budget,80000);
      const sceneKey = [cut?.revision??0,cut?.opposite.sourceRevision??0,serial, viewport.width, viewport.height, field.sourceRevision, appearanceRef.current, gpu?.available ? 'gpu' : quality].join(':');
      const wantsFrame = dirty || sceneKey !== lastSceneKey; dirty = false; let rendered = false;
      if (gpu?.available && wantsFrame && sceneKey !== lastSceneKey) {
        try { cpuJob?.return(undefined as never); cpuJob = undefined; cpuEpoch = undefined; cpu.snapshotBytes = 0; gpu.setExcavation(cut);const receipt = gpu.present(view, viewport, appearanceRef.current); backing(); context.clearRect(0, 0, viewport.width, viewport.height); applied = view; appliedSize = viewport; appliedSerial = serial; displayRevision = receipt.revision; lastSceneKey = sceneKey; rendered = true; }
        catch (cause) { gpu.fail(cause); lastSceneKey = ''; appliedSerial = -1; schedule(); }
      }
      if (!gpu?.available && (sceneKey !== lastSceneKey || cpuJob)) {
        if (cpuJob && cpuSerial !== serial && !(cpuView&&sphereCenterInspection(cpuView)&&sphereCenterInspection(view)&&cpuView.eyeMeters&&view.eyeMeters&&cpuSize.width===viewport.width&&cpuSize.height===viewport.height)) { cpuJob.return(undefined as never); cpuJob = undefined; }
        if (!cpuJob) { if (!cpuEpoch || cpuEpoch.sourceRevision !== field.sourceRevision) { cpuEpoch = field.snapshot(); cpu.snapshotBytes = Object.values(cpuEpoch.data).reduce((sum,data)=>sum+data.byteLength,0); } cpuView = view; cpuSize = viewport; cpuSerial = serial; cpuKey = sceneKey; cpuQuality = quality; if(cut&&cut.model.primitives.length&&view.mode==='globe'&&(!view.interior||sphereCenterInspection(view))&&(oppositeSource!==cut.opposite||oppositeEpoch?.sourceRevision!==cut.opposite.sourceRevision)){oppositeSource=cut.opposite;oppositeEpoch=cut.opposite.snapshot();}cpuJob = sphericalFieldRaster(cpuEpoch, view, viewport, appearanceRef.current, budget, raster,cut&&oppositeEpoch?{model:cut.model,opposite:oppositeEpoch,role:cut.role}:undefined);cpu.snapshotBytes=Object.values(cpuEpoch.data).reduce((sum,data)=>sum+data.byteLength,0)+(oppositeEpoch?Object.values(oppositeEpoch.data).reduce((sum,data)=>sum+data.byteLength,0):0); }
        const at = performance.now(); let result = cpuJob.next(); while (!result.done && performance.now() - at < 6) result = cpuJob.next(); const elapsed = performance.now() - at; cpu.computeMs += elapsed; cpu.maxSliceMs = Math.max(cpu.maxSliceMs, elapsed); cpu.slices++;
        if (result.done) { const image = result.value; raster = image.pixels; backing(); context.clearRect(0, 0, viewport.width, viewport.height); context.imageSmoothingEnabled = true; if (scratch.width !== image.columns || scratch.height !== image.rows) { scratch.width = image.columns; scratch.height = image.rows; } scratchContext.putImageData(new ImageData(raster as Uint8ClampedArray<ArrayBuffer>, image.columns, image.rows), 0, 0); if (image.width && image.height) context.drawImage(scratch, image.left, image.top, image.width, image.height); applied = cpuView; appliedSize = cpuSize; appliedSerial = cpuSerial; displayRevision = image.revision; lastSceneKey = cpuKey; cpuJob = undefined; cpu.images++; rendered = true; if (lastSceneKey !== sceneKey) schedule(false); }
        else schedule(false);
      }
      if (rendered && applied?.mode === 'net') {
        for (const face of CUBE_FACES) {
          const r = netFaceRect(face, applied, appliedSize);
          for (const edge of FACE_EDGES) {
            const endpoints = [-QUARTER_PI, QUARTER_PI].map((along) => {
              const p = { ...terrain.metadata.identity, patchId: face, u: edge.startsWith('u') ? (edge.endsWith('min') ? -1 : 1) * QUARTER_PI : along, v: edge.startsWith('v') ? (edge.endsWith('min') ? -1 : 1) * QUARTER_PI : along };
              const local = netFaceCoordinates(face, p.u, p.v); return { x: r.x + local.x * r.side, y: r.y + local.y * r.side, direction: terrain.geometry.direction(p) };
            });
            const joined = netEdgeIsJoined(terrain, face, edge);
            context.strokeStyle = joined ? '#e2f3edb0' : '#ffca7b'; context.lineWidth = joined ? 1 : 1.5; context.setLineDash(joined ? [] : [5, 4]);
            context.beginPath(); context.moveTo(endpoints[0]!.x, endpoints[0]!.y); context.lineTo(endpoints[1]!.x, endpoints[1]!.y); context.stroke();
          }
          context.setLineDash([]); context.fillStyle = '#0b1b2dc9'; context.fillRect(r.x + 5, r.y + 5, 28, 22); context.fillStyle = '#fff'; context.font = '12px ui-monospace, monospace'; context.fillText(face, r.x + 10, r.y + 20);
        }
      }
      // The physical assisted endpoint is accepted only once its camera pose is
      // actually displayed. A release during CPU reconstruction still uses the
      // old displayed pose and cannot jump ahead into unpresented geography.
      if (rendered && pendingAssistance?.serial === appliedSerial) {
        const step = pendingAssistance; pendingAssistance = undefined;
        if (editor?.painting && editingNavigation?.drawingPoint) {
          assistedVisibility = step.visibility; acceptedLimb = false; assistedCamera = true;
          try { editingNavigation.assist(step.dx, step.dy); } finally { assistedVisibility = undefined; assistedCamera = false; }
          if (step.angle && acceptedLimb) { limbSteps++; limbRadians += step.angle; canvas.dataset.limbAssisting = 'true'; }
        }
        canvas.dataset.limbSteps = String(limbSteps); canvas.dataset.limbRadians = String(limbRadians);
      }
      if (pendingInspection) { showInspection(pendingInspection.direction, pendingInspection.select); pendingInspection = undefined; }
      if (applied) { const brush = sphereCenterInspection(applied)?null:sphericalBrushFromControls(controlsRef.current, terrain.metadata.geometry.radiusMeters), pointed = hover && poseCurrent() ? unprojectSphere(terrain, hover, applied, appliedSize) : null,physical=pointed&&physicalHit(pointed,applied),center=physical&&physical.hit?.kind!==(surfaceRole??'exterior')?null:pointed, previewRadius= sphereCenterInspection(applied)?undefined:radiusRef.current??brush?.radiusMeters,segments = center && previewRadius ? sphericalBrushPreview(terrain, center, previewRadius, applied, appliedSize) : []; previewRef.current?.setAttribute('d', segments.map(s=>s.points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ')).join(' ')); canvas.dataset.previewCenter = center && previewRadius ? JSON.stringify(center) : ''; canvas.dataset.previewRadius = previewRadius ? String(previewRadius) : ''; const markers = selectedRef.current ? projectSphere(terrain, selectedRef.current, applied, appliedSize) : []; const key = JSON.stringify(markers); if (key !== selectionKey) { selectionKey = key; selectionMarkers.current?.replaceChildren(...markers.map(p => { const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); circle.setAttribute('cx', String(p.x)); circle.setAttribute('cy', String(p.y)); circle.setAttribute('r', '7'); return circle; })); } }
      if(applied){const points=annotationRef.current.filter(a=>!a.referenceViewsOnly||applied!.mode==='net'||applied!.interior&&!sphereCenterInspection(applied!)).flatMap(a=>projectSphere(terrain,a.direction,applied!,appliedSize).map(p=>({...p,...a}))),key=JSON.stringify(points);if(key!==annotationKey){annotationKey=key;const children:SVGElement[]=[];for(const p of points){const circle=document.createElementNS('http://www.w3.org/2000/svg','circle'),label=document.createElementNS('http://www.w3.org/2000/svg','text');circle.setAttribute('cx',String(p.x));circle.setAttribute('cy',String(p.y));circle.setAttribute('r','6');label.setAttribute('x',String(p.x+9));label.setAttribute('y',String(p.y-8));label.setAttribute('font-size','12');label.textContent=p.label;children.push(circle,label);}annotationGroup.current?.replaceChildren(...children);}}
      const pending = !poseCurrent() || sceneKey !== lastSceneKey || !!editor && (editor.backlogged || editor.displayPending || displayRevision !== terrain.revision); if (pendingRef.current) { pendingRef.current.hidden = !hover || !pending; pendingRef.current.dataset.pending = String(pending); pendingRef.current.textContent = editor?.backlogged ? 'Preparing terrain' : 'Updating terrain'; if (hover) pendingRef.current.style.transform = `translate(${hover.x + 12}px,${hover.y + 12}px)`; }
      canvas.dataset.displayPending = String(pending);
      if (rendered) { renderTimes.push(performance.now() - start); if (renderTimes.length > 120) renderTimes.shift(); paints++; }
      if (applied) { canvas.dataset.mode = applied.mode; canvas.dataset.eye = JSON.stringify(applied.eyeMeters??null); canvas.dataset.frame = JSON.stringify(applied.frame); canvas.dataset.zoom = String(applied.zoom); canvas.dataset.pan = JSON.stringify(applied.pan); }
      if (rendered && !gpu?.available) appliedQuality = cpuQuality;
      canvas.dataset.ready = String(!!applied); canvas.dataset.viewPending = String(!poseCurrent()); canvas.dataset.displayRevision = String(displayRevision); canvas.dataset.renderer = gpu?.available ? 'webgl2' : 'cpu'; canvas.dataset.quality = gpu?.available ? 'native' : appliedQuality;
      canvas.dataset.renders = String(paints); canvas.dataset.requests = String(requests); canvas.dataset.renderTimes = JSON.stringify(renderTimes); canvas.dataset.rasterBytes = String(raster?.byteLength ?? 0);
      canvas.dataset.rayCacheBytes = '0'; canvas.dataset.cacheBytes = String(cache.byteLength); canvas.dataset.displayDiagnostics = JSON.stringify({ gpu: gpu?.statistics, cpu, fieldBytes: field.byteLength, fieldRevision: field.sourceRevision, displayRevision, pending, appearance: appearanceRef.current, timingBounds: editor?.presentationTimingBounds });
      if (diagnosticsRef.current) diagnosticsRef.current.textContent = `${gpu?.available ? 'Hardware WebGL2' : 'Bounded CPU'} · ${gpu?.statistics.renderer ?? 'No GPU'} · terrain ${terrain.revision}, displayed ${displayRevision} · derived display ${(cache.byteLength / 1048576).toFixed(1)} MiB${gpu?.statistics.reason ? ` · ${gpu.statistics.reason}` : ''}`;
      canvas.dataset.revision = String(terrain.revision);
      if (inputAt && rendered && poseCurrent()) { inputLatencies.push(performance.now() - inputAt); if (inputLatencies.length > 120) inputLatencies.shift(); canvas.dataset.inputLatencies = JSON.stringify(inputLatencies); inputAt = 0; }
      if (editor && displayRevision === terrain.revision) { brushLatencies.push(...editor.presentedLatencies(performance.now())); if (brushLatencies.length > 120) brushLatencies.splice(0, brushLatencies.length - 120); } canvas.dataset.brushLatencies = JSON.stringify(brushLatencies);
    };
    const schedule = (redraw = true) => { dirty ||= redraw; requests++; if (!frame) frame = requestAnimationFrame(paint); };
    const change = (fn: (view: SphericalView) => SphericalView, interactive = false) => {
      inputAt ||= performance.now();
      const next = fn(viewRef.current);
      if (JSON.stringify(next) === JSON.stringify(viewRef.current)) { schedule(false); return; }
      pendingAssistance = undefined; viewRef.current = next; serial++; canvas.dataset.viewPending = 'true'; setMode(viewRef.current.mode); setZoom(viewRef.current.zoom); setInspecting(sphereCenterInspection(viewRef.current));
      if (interactive) { interactiveUntil = performance.now() + 160; clearTimeout(refinementTimer); refinementTimer = window.setTimeout(() => schedule(), 180); }
      schedule();
    };
    const reset = () => change((view) => ({ ...INITIAL_SPHERICAL_VIEW, mode: view.mode,...(view.interior?{interior:true,interiorView:view.interiorView,eyeMeters:view.eyeMeters}:{}) }));
    const inspect = (point: ScreenPoint, select: boolean) => { if (!poseCurrent()) return;const direction=unprojectSphere(terrain,point,applied!,appliedSize);pendingInspection={direction,select};if(select&&direction&&pickRef.current&&!sphereCenterInspection(applied!)){const physical=physicalHit(direction,applied!);if(physical&&physical.hit?.kind!==(surfaceRole??'exterior'))setError('Choose level ground on the selected side. This pixel shows an opening, rock wall, or opposite surface.');else pickRef.current(direction);}schedule(select); };
    const navigationActions = {
      drag(dx, dy) { change((view) => view.mode === 'globe' ? rotateSphere(view, (sphereCenterInspection(view)?-dx:dx) / sphericalLayout(view, size()).radius, dy / sphericalLayout(view, size()).radius) : panSphereNet(view, dx, dy, size()), true); },
      zoom: (factor) => change((view) => zoomSphere(view, factor), true), inspect, reset,
    } satisfies Parameters<typeof attachSphericalNavigation>[1];
    const navigation = editor ? editingNavigation = attachSphericalEditing(canvas, {
      ...navigationActions, paintingEnabled: () => initialized && !pickRef.current && !sphereCenterInspection(viewRef.current) && !!sphericalBrushFromControls(controlsRef.current, terrain.metadata.geometry.radiusMeters),
      begin(point) {
        if (pickRef.current || sphereCenterInspection(viewRef.current) || !poseCurrent()) return false;
        const direction = unprojectSphere(terrain, point, applied!, appliedSize), brush = sphericalBrushFromControls(controlsRef.current, terrain.metadata.geometry.radiusMeters);
        if (!direction || !brush || editor.processing) return false;const physical=physicalHit(direction,applied!);if(physical&&physical.hit?.kind!==(surfaceRole??'exterior'))return false;
        try { strokeDisplayEpoch = cache.elevationField!.sourceRevision; const result = editor.begin(direction, brush, applied!.mode === 'globe' ? applied!.frame.forward : undefined); if (result) inspect(point, true); return result; }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'Stroke could not start.'); return false; }
      },
      move(point) {
        if (!assistedCamera && !poseCurrent() && !pendingAssistance) return false;
        const physicalView = assistedCamera ? viewRef.current : applied!, physicalSize = assistedCamera ? size() : appliedSize;
        const direction = unprojectSphere(terrain, point, physicalView, physicalSize), anchor = editingNavigation?.anchor;
        if (!direction || physicalView.mode === 'net' && anchor && !continuousNetSegment(terrain, anchor, point, physicalView, physicalSize)) return false;
        const visibility = assistedVisibility ?? (physicalView.mode === 'globe' ? { hemisphere: physicalView.frame.forward } : undefined);
        editor.move(direction, visibility);
        if (assistedVisibility && editor.painting) {
          acceptedLimb = true;
          // Latest segment only: constant-size geometry diagnostics, never terrain copies.
          canvas.dataset.limbStep = JSON.stringify({ serial: limbSteps + 1, at: performance.now(), direction, visibility });
        }
        return true;
      }, release: () => editor.release(), stop: () => editor.cancel(), hover(point) { hover = point; schedule(false); },
    }) : attachSphericalNavigation(canvas, navigationActions);
    if (editor) { editor.changed = () => schedule(); editor.error = setError; }
    const stop = () => { if (editor?.locked) return; navigation.cancel(); editor?.cancel(); hover = null; schedule(); };
    commands.current = { inspection:(eye,forward)=>{const cut=excavationRef.current;if(!cut||!sphereFreeVolume(cut.model,eye,cut.model.radiusMeters*1e-8))throw RangeError('Inspection eye is outside the actual free volume.');change(view=>({...(forward?recenterSphere(view,forward):view),mode:'globe',interior:true,interiorView:'center',eyeMeters:eye}));}, change: (fn) => { stop(); change(fn); }, inspect, reset: () => { stop(); reset(); }, stop,
      undo: () => { stop(); try { editor?.undo(); } catch (cause) { setError(String(cause)); } }, redo: () => { stop(); try { editor?.redo(); } catch (cause) { setError(String(cause)); } }, repaint: () => schedule(false),
      prepareSave: () => { editingNavigation?.finish(); editor?.release(); schedule(); },pixel(point){if(gpu?.available){gpu.setExcavation(excavationRef.current);gpu.present(viewRef.current,size(),appearanceRef.current);}const source=gpu?.available?gpuRef.current!:canvas,temp=document.createElement('canvas');temp.width=temp.height=1;const ctx=temp.getContext('2d')!;ctx.drawImage(source,point.x/source.clientWidth*source.width,point.y/source.clientHeight*source.height,1,1,0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data);} };
    let observedSize = size();
    const observer = new ResizeObserver(() => { const next = size(); if (next.width === observedSize.width && next.height === observedSize.height) return; observedSize = next; pendingAssistance = undefined; navigation.cancel(); serial++; canvas.dataset.viewPending = 'true'; schedule(); }); observer.observe(root);
    const key = (event: KeyboardEvent) => {
      if (workspace) return; // The Atlas document host owns shared shortcuts and focus.
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (persistenceRef.current) { commands.current.prepareSave(); persistenceRef.current.save(); } else setError('Spherical preview is session-only. Saving is not available in this checkpoint.'); }
      if (editor && (event.ctrlKey || event.metaKey) && !isTextInput(event.target) && ['z', 'y'].includes(event.key.toLowerCase())) { event.preventDefault(); if (event.shiftKey || event.key.toLowerCase() === 'y') commands.current.redo(); else commands.current.undo(); }
      if (event.key === 'Escape') { navigation.cancel(); setPanel(false); if (panelRef.current?.contains(document.activeElement)) toggleRef.current?.focus(); }
    };
    window.addEventListener('keydown', key);
    const fullscreenChange = () => { setFullscreen(!!document.fullscreenElement); navigation.cancel(); schedule(); };
    document.addEventListener('fullscreenchange', fullscreenChange);
    const beforeUnload = (event: BeforeUnloadEvent) => { if (!workspace && editor) { stop(); if (editor.modified || editor.locked) { event.preventDefault(); event.returnValue = ''; } } };
    window.addEventListener('beforeunload', beforeUnload);
    const activate = () => { if (!active) return; const field = cache.elevationField!; editor?.useElevationField(field); if (editor && typeof Worker !== 'undefined') editor.enableBackground(matchMedia('(pointer: coarse)').matches); gpu = new SphereWebGLRenderer(gpuRef.current!, field, () => { lastSceneKey = ''; appliedSerial = -1; canvas.dataset.viewPending = 'true'; schedule(); }); initialized = true; schedule(); };
    if (cache.elevationField) activate(); else void prepareSphericalField(terrain, cache, { yield: async () => { await yieldPersistence(); if (!active) throw new Error('Spherical display preparation cancelled.'); } }).then(activate).catch(cause => { if (active) setError(String(cause)); });
    canvas.focus({ preventScroll: true });
    return () => { onViewChangeRef.current?.(viewRef.current);active = false; cancelAnimationFrame(frame); clearTimeout(refinementTimer); cpuJob?.return(undefined as never); gpu?.dispose(); navigation.dispose(); observer.disconnect(); window.removeEventListener('keydown', key); window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('fullscreenchange', fullscreenChange); if (editor) { editor.changed = () => {}; editor.error = () => {}; editor.disableBackground(); editor.releaseDisplay(); } };
  }, [terrain, cache, editor]);
  const change = (fn: (view: SphericalView) => SphericalView) => commands.current.change(fn);
  const full = async () => {
    commands.current.stop();
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await rootRef.current?.requestFullscreen(); }
    catch { setError('Fullscreen could not be changed. Continue in this window; terrain is preserved.'); }
  };
  const requestClose = () => { if (editor?.locked) return; commands.current.stop(); if (editor?.modified && !window.confirm(persistence ? 'Discard unsaved spherical changes? Save first to keep this sphere. Your planar map is preserved.' : 'Discard modified session-only spherical terrain? Spherical saving is not available yet. Your planar map is preserved.')) return; onClose(); };
  const saveSphere = () => { if (editor?.locked) return; commands.current.prepareSave(); persistence?.save(); };
  const displayTools = <><h2>Terrain display</h2><label>Spherical terrain appearance<select aria-label="Spherical terrain appearance" value={appearance} onChange={e => setAppearance(e.target.value as SphereAppearance)}><option value="relief">Shaded relief · 5× display</option><option value="elevation">Elevation colors</option></select></label><p>Coasts follow numerical elevation. Relief shows physical slopes with 5× display exaggeration; it adds no geographic detail or displacement.</p><details><summary>Display diagnostics</summary><output ref={diagnosticsRef} aria-label="Spherical display diagnostics">Preparing display…</output></details></>;
  const workspaceView=useMemo<SphericalWorkspaceView>(()=>({ inspecting,canUndo: editorState.canUndo, canRedo: editorState.canRedo, processing: editorState.busy,
      toolPicker: inspecting?<span>View from inside · drag to look · painting paused</span>:(['navigate', 'raise', 'lower', 'smooth', 'flatten'] as const).map((tool) => <button key={tool} disabled={editor?.locked} aria-pressed={controls.tool === tool} onClick={() => { commands.current.stop(); setControls({ ...controls, tool }); }}>{tool === 'navigate' ? 'Rotate / Pan' : tool.charAt(0).toUpperCase() + tool.slice(1)}</button>),
      tools: <>{inspecting&&<p role="status">View from inside is read-only. Choose Globe or Six-face net to edit. Your brush choices are retained.</p>}<p id="sphere-help" className="hint">Reference radius: {terrain.metadata.geometry.radiusMeters.toLocaleString()} m · N={terrain.metadata.representation.cellsPerEdge}. Globe and Net edit the same spherical samples. Space + drag or two fingers to navigate. Arrow keys, +/−, Enter and Home work on the canvas.</p><fieldset disabled={inspecting}><SphericalBrushControls value={controls} radius={terrain.metadata.geometry.radiusMeters} onChange={(value) => { commands.current.stop(); setControls(value); }} /></fieldset>{displayTools}<p className="hint">Solid net lines join faces. Dashed amber cuts lead to adjoining geography. These charts describe a round sphere, not a physical cube.</p><div className={styles.faces}>{CUBE_FACES.map((face) => <button key={face} onClick={() => change((view) => ({ ...recenterSphere(view, FACE_BASES[face].normal), mode: 'globe' }))}>View {face}</button>)}</div></>,
      navigation: <><button aria-pressed={mode === 'globe'&&!inspecting} onClick={() => change((view) => ({ ...view, mode: 'globe',interior:surfaceRole==='interior',interiorView:'edit',eyeMeters:undefined }))}>Globe</button>{surfaceRole==='interior'&&<button aria-pressed={inspecting} onClick={()=>change(view=>({...view,mode:'globe',interiorView:'center',eyeMeters:undefined}))}>View from inside</button>}<button aria-pressed={mode === 'net'} onClick={() => change((view) => ({ ...view, mode: 'net' }))}>Six-face net</button><button aria-label="Zoom Out" disabled={zoom <= 1} onClick={() => change((view) => zoomSphere(view, .8))}>−</button><output aria-label="Map zoom">{Math.round(zoom * 100)}%</output><button aria-label="Zoom In" disabled={zoom >= 4} onClick={() => change((view) => zoomSphere(view, 1.25))}>+</button><button onClick={() => commands.current.reset()}>Reset View</button><button disabled={!hasSelection} onClick={() => change((view) => ({ ...recenterSphere(view, selectedRef.current!), mode: 'globe' }))}>Center selection</button></>
    }),[editorState,controls,appearance,mode,zoom,hasSelection,inspecting,editor?.locked,surfaceRole,terrain]);
  useLayoutEffect(()=>{onWorkspaceView?.(workspaceView);},[workspaceView,onWorkspaceView]);
  return <section ref={rootRef} data-surface-role={surfaceRole} data-inspecting={inspecting} className={`${styles.workspace} ${workspace ? styles.embedded : ''}`} aria-label={workspace ? 'Spherical surface view' : 'Spherical development preview'}>
    <canvas ref={canvasRef} className={styles.canvas} tabIndex={0} role="img" aria-label={workspace ? 'Atlas spherical terrain map' : 'Spherical terrain preview'} aria-describedby="sphere-help" data-samples={terrain.sampleCount} data-authority-bytes={terrain.elevationByteLength} data-cache-bytes={cache.byteLength} data-preparation-ms={preparationMs} data-preparation-max-task-ms={maxPreparationTaskMs} data-radius={terrain.metadata.geometry.radiusMeters} data-resolution={terrain.metadata.representation.cellsPerEdge} />
    <canvas ref={gpuRef} className={`${styles.gpu} sphere-gpu`} aria-hidden="true" hidden />
    <svg className={styles.brushPreview} aria-hidden="true"><path ref={previewRef} fill="none" stroke="#fff0b0" strokeWidth="1.5" /><g ref={selectionMarkers} fill="none" stroke="white" strokeWidth="2" /><g ref={annotationGroup} fill="#fff0b0" stroke="#071924" strokeWidth=".5" /></svg>
    <div className="cube-map-controls" hidden={!mapControls||inspecting} onPointerDownCapture={e=>e.stopPropagation()} onPointerMoveCapture={e=>e.stopPropagation()} onPointerUpCapture={e=>e.stopPropagation()} onWheelCapture={e=>e.stopPropagation()}>{mapControls}</div>
    <div ref={pendingRef} className={`${styles.pending} sphere-pending-pointer`} aria-hidden="true" hidden />
    {workspace ? workspace(workspaceView) : <>
    <header className={styles.header}><button disabled={persistence?.busy} onClick={requestClose}>Return to map</button><span>{editor ? 'Spherical editor' : 'Spherical preview'} <small>{persistence ? persistence.name : editor ? 'Blank sphere · session-only editing' : 'Session-only · viewing and inspection'}</small></span></header>
    <button ref={toggleRef} className={styles.toggle} aria-expanded={panel} aria-controls="sphere-controls" onClick={() => { commands.current.stop(); setPanel(!panel); }}>View controls</button>
    <aside ref={panelRef} id="sphere-controls" hidden={!panel} className={styles.panel} aria-label="Spherical view controls">
      <h2>Inspect this sphere</h2><p>Reference radius: {terrain.metadata.geometry.radiusMeters.toLocaleString()} m<br />{terrain.sampleCount.toLocaleString()} unique samples · N={terrain.metadata.representation.cellsPerEdge}</p>
      <p>{editor ? 'Blank ocean starts at −100 m with sea level 0. All views edit the same physical samples.' : 'Deterministic test geography crosses shared chart edges and corners. No Earth geography or scale is assumed.'}</p>
      <p id="sphere-help">{editor ? 'Select Raise, Lower, Smooth or Flatten to draw. Select Rotate / Pan, hold Space, or use two fingers to navigate. ' : ''}Drag to rotate the globe or pan the net. Pinch or wheel to zoom. Tap/click to select. On the focused canvas: arrow keys navigate, +/− zoom, Enter inspects the center, Home resets.</p>
      {editor && <fieldset disabled={inspecting}><SphericalBrushControls value={controls} radius={terrain.metadata.geometry.radiusMeters} onChange={(value) => { commands.current.stop(); setControls(value); }} /></fieldset>}
      {displayTools}
      {persistence && <SphericalStorageControls value={persistence} open={() => { commands.current.prepareSave(); persistence.open(persistence.selected); }} />}
      <p>Solid lines join faces. Dashed amber edges are visual cuts into adjoining geography, not world boundaries. Face labels name numerical charts of a round sphere.</p>
      <div className={styles.faces}>{CUBE_FACES.map((face) => <button key={face} onClick={() => change((view) => ({ ...recenterSphere(view, FACE_BASES[face].normal), mode: 'globe' }))}>View {face}</button>)}</div>
      <p>{persistence ? 'Save explicitly to this browser. Globe brushes are clipped to the visible hemisphere. Your planar map stays in place.' : editor ? 'Edits are session-only and cannot yet be saved or reopened. Globe brushes are clipped to the visible hemisphere. Your planar map stays in place.' : 'Preview terrain cannot be sculpted, saved or reopened. Your planar map remains in place behind this preview.'}</p>
      <button onClick={() => { setPanel(false); toggleRef.current?.focus(); }}>Close view controls</button>
    </aside>
    <div className={styles.views} role="group" aria-label="Spherical projection">
      <button aria-pressed={mode === 'globe'&&!inspecting} onClick={() => change((view) => ({ ...view, mode: 'globe',interior:surfaceRole==='interior',interiorView:'edit',eyeMeters:undefined }))}>Globe</button>
      <button aria-pressed={mode === 'net'} onClick={() => change((view) => ({ ...view, mode: 'net' }))}>Six-face net</button>
    </div>
    {editor && <><div className={styles.editorHud}><div className={styles.editingTools} role="group" aria-label="Spherical tools">{(['navigate', 'raise', 'lower', 'smooth', 'flatten'] as const).map((tool) => <button key={tool} disabled={persistence?.busy} aria-pressed={controls.tool === tool} onClick={() => { commands.current.stop(); setControls({ ...controls, tool }); }}>{tool === 'navigate' ? 'Rotate / Pan' : tool.charAt(0).toUpperCase() + tool.slice(1)}</button>)}</div>
      <p className={styles.editStatus} role="status" aria-label="Spherical work status" data-state={persistence?.phase}>{persistence?.busy || persistence?.phase === 'failed' ? persistence.message : editorState.busy ? 'Finishing numerical stroke…' : editorState.modified ? persistence ? 'Unsaved spherical changes' : 'Unsaved spherical changes · session-only' : persistence ? editor.hasSaved ? 'Saved on this device' : 'Unmodified blank ocean · not saved yet' : 'Unmodified blank ocean · session-only'}</p></div>
      {persistence && <button className={styles.saveButton} disabled={persistence.busy} onClick={saveSphere}>Save Sphere</button>}
      <div className={styles.history}><button aria-label="Spherical Undo" disabled={!editorState.canUndo || editorState.busy || persistence?.busy} onClick={() => commands.current.undo()}>Undo</button><button aria-label="Spherical Redo" disabled={!editorState.canRedo || editorState.busy || persistence?.busy} onClick={() => commands.current.redo()}>Redo</button></div>
      </>}
    <nav className={styles.navigation} aria-label="Spherical navigation">
      <button aria-label="Spherical Zoom Out" disabled={zoom <= 1} onClick={() => change((view) => zoomSphere(view, .8))}>−</button>
      <output aria-label="Spherical zoom">{Math.round(zoom * 100)}%</output>
      <button aria-label="Spherical Zoom In" disabled={zoom >= 4} onClick={() => change((view) => zoomSphere(view, 1.25))}>+</button>
      <button onClick={() => commands.current.reset()}>Reset View</button>
      <button disabled={!hasSelection} onClick={() => change((view) => ({ ...recenterSphere(view, selectedRef.current!), mode: 'globe' }))}>Center selection</button>
      {fullscreenSupported && <button aria-label={fullscreen ? 'Exit Spherical Fullscreen' : 'Spherical Fullscreen'} onClick={() => void full()}>⛶</button>}
    </nav>
    </>}
    <output ref={readoutRef} className={styles.readout} aria-label="Spherical elevation" aria-live="off">Tap/click terrain to select a physical location. Elevations are meters relative to sea level 0.</output>
    {!workspace && <p className={styles.notice}>{persistence ? 'Browser-local sphere · Save explicitly · No autosave' : editor ? 'Session-only sphere · Save/Open follows in A6-E' : 'Development fixture · no sculpting or saving'}</p>}
    {persistence?.error && <div className={styles.error} role="alert">{persistence.error}</div>}
    {error && <div className={styles.error} role="alert">{error}<button onClick={() => setError('')}>Dismiss preview message</button></div>}
  </section>;
}
