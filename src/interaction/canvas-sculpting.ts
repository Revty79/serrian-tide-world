import { startBrushStroke, type BrushSettings, type BrushStroke } from '../terrain/brush.ts';
import type { Terrain } from '../terrain/model.ts';
import { isWrapped } from '../terrain/topology.ts';
import { inspectElevation, viewportToWorld, type ElevationSample, type Point } from '../terrain/sampling.ts';
import { edgePanVelocity } from '../rendering/edge-pan.ts';
import {pointerSamples} from './pointer-samples.ts';

type PointerPosition = Pick<PointerEvent, 'clientX' | 'clientY'>;

interface SculptingOptions {
  terrain: Terrain;
  getBrush: () => BrushSettings | undefined;
  cursor: HTMLElement;
  onChange: () => void;
  onError: (error: unknown) => void;
  onSample?: (sample: ElevationSample | null) => void;
  onStrokeBegin?: () => void;
  onStrokeEnd?: () => void;
  getMapBounds?: () => DOMRect;
  getStageBounds?: () => DOMRect;
  edgePanEnabled?: () => boolean;
  /** Synchronously apply and paint a translation; return the periodic winding correction. */
  panView?: (delta: Point) => { offsetX: number } | null;
  onPreview?: (event: PointerPosition, settings: Readonly<BrushSettings> | undefined) => void;
}

/** DOM pointer lifecycle only. Numerical stroke interpolation lives in the engine. */
export function attachCanvasSculpting(canvas: HTMLCanvasElement, options: SculptingOptions) {
  const { terrain, cursor, getBrush, onChange, onError } = options;
  const view = canvas.ownerDocument.defaultView!;
  let active: { pointerId: number; stroke: BrushStroke; lastPoint: Point; bounds: DOMRect; stage: DOMRect; windowWidth: number; windowHeight: number; latest: PointerEvent; offsetX: number } | null = null;
  let pendingTouch: PointerEvent | null = null;
  let assistFrame: number | null = null, edgeSince: number | null = null, lastTime: number | null = null;
  const bounds = () => options.getMapBounds?.() ?? canvas.getBoundingClientRect();
  const stageBounds = () => options.getStageBounds?.() ?? canvas.getBoundingClientRect();
  const viewMatches = (rect: DOMRect) => {
    if (!active) return false;
    const stage = stageBounds();
    return view.innerWidth === active.windowWidth && view.innerHeight === active.windowHeight
      && rect.width === active.bounds.width && rect.height === active.bounds.height
      && rect.left === active.bounds.left && rect.top === active.bounds.top
      && stage.width === active.stage.width && stage.height === active.stage.height
      && stage.left === active.stage.left && stage.top === active.stage.top;
  };
  const assisted = () => !!options.edgePanEnabled?.() && !!options.panView;
  const effective = (event: PointerPosition): PointerPosition => {
    if (!assisted()) return event;
    const stage = stageBounds();
    return { clientX: Math.max(stage.left, Math.min(stage.right, event.clientX)), clientY: Math.max(stage.top, Math.min(stage.bottom, event.clientY)) };
  };
  const overMap = (event: PointerPosition) => {
    const stage = stageBounds();
    return canvas.ownerDocument.elementFromPoint(Math.max(stage.left, Math.min(stage.right - 1, event.clientX)), Math.max(stage.top, Math.min(stage.bottom - 1, event.clientY))) === canvas;
  };
  const hitBounds = () => {
    const rect = bounds();
    if (!isWrapped(terrain)) return rect;
    const stage = canvas.getBoundingClientRect();
    return { left: stage.left, right: stage.right, top: Math.max(stage.top, rect.top), bottom: Math.min(stage.bottom, rect.bottom), width: stage.width, height: Math.max(0, Math.min(stage.bottom, rect.bottom) - Math.max(stage.top, rect.top)) };
  };

  const pointFromEvent = (event: PointerPosition) => {
    const rect = bounds();
    if (isWrapped(terrain)) return { x: (event.clientX - rect.left) / rect.width * terrain.metadata.dimensions.width, y: Math.max(0, Math.min(terrain.metadata.dimensions.height, (event.clientY - rect.top) / rect.height * terrain.metadata.dimensions.height)) };
    return viewportToWorld(terrain, {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
    }, rect);
  };

  const hideCursor = () => { cursor.hidden = true; };
  const publishSample = (event: PointerPosition) => {
    const rect = hitBounds();
    const inside = rect.width > 0 && rect.height > 0
      && event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
    options.onSample?.(inside ? inspectElevation(terrain, pointFromEvent(event)) : null);
  };
  const leave = () => { hideCursor(); options.onSample?.(null); };
  const showCursor = (event: PointerPosition) => {
    const settings = active?.stroke.settings ?? getBrush();
    if (options.onPreview) { options.onPreview(event, settings); return; }
    if (!settings) { hideCursor(); return; }
    const rect = bounds();
    const { width, height } = terrain.metadata.dimensions;
    cursor.style.left = `${Math.max(0, Math.min(rect.width, event.clientX - rect.left)) / rect.width * canvas.offsetWidth}px`;
    cursor.style.top = `${Math.max(0, Math.min(rect.height, event.clientY - rect.top)) / rect.height * canvas.offsetHeight}px`;
    cursor.style.width = `${2 * settings.radius / width * canvas.offsetWidth}px`;
    cursor.style.height = `${2 * settings.radius / height * canvas.offsetHeight}px`;
    cursor.hidden = false;
  };

  const stop = () => {
    const previous = active, pointerId = previous?.pointerId ?? pendingTouch?.pointerId;
    active = null;
    pendingTouch = null;
    if (assistFrame !== null) view.cancelAnimationFrame(assistFrame);
    assistFrame = edgeSince = lastTime = null;
    previous?.stroke.end();
    if (previous) options.onStrokeEnd?.();
    if (pointerId !== undefined && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
    hideCursor();
    options.onSample?.(null);
  };

  const fail = (error: unknown) => { stop(); onError(error); };
  const advance = (input: PointerPosition): boolean => {
    if (!active) return false;
    if (!getBrush()) { stop(); return false; }
    const rect = bounds();
    // Layout can change before the browser delivers resize/observer callbacks.
    if (!viewMatches(rect)) {
      stop();
      return false;
    }
    const { width, height } = terrain.metadata.dimensions;
    const event = effective(input);
    const target = {
      x: (event.clientX - rect.left) / rect.width * width + active.offsetX,
      y: (event.clientY - rect.top) / rect.height * height,
    };
    const from = active.lastPoint;
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    // Intersect the actual segment with the map boundary. Simply clamping each
    // event would bend an exiting stroke differently at different event rates.
    let t = 1;
    const hit = hitBounds();
    const minX = isWrapped(terrain) ? (hit.left - rect.left) / rect.width * width + active.offsetX : 0;
    const maxX = isWrapped(terrain) ? (hit.right - rect.left) / rect.width * width + active.offsetX : width;
    if (target.x < minX) t = Math.min(t, (minX - from.x) / dx);
    if (target.x > maxX) t = Math.min(t, (maxX - from.x) / dx);
    if (target.y < 0) t = Math.min(t, -from.y / dy);
    if (target.y > height) t = Math.min(t, (height - from.y) / dy);
    const endpoint = {
      x: Math.max(minX, Math.min(maxX, from.x + dx * t)),
      y: Math.max(0, Math.min(height, from.y + dy * t)),
    };
    const changed = active.stroke.moveTo(endpoint);
    active.lastPoint = endpoint;
    // Ending at exit prevents painting artificial lines along the border while
    // the captured pointer is outside. Re-entering requires a new press.
    if (t < 1) stop();
    return changed;
  };
  const assist = (time: number) => {
    assistFrame = null;
    if (!active || !assisted()) return;
    try {
      if (!getBrush() || !canvas.hasPointerCapture(active.pointerId) || !viewMatches(bounds()) || !overMap(active.latest)) { stop(); return; }
      const stage = stageBounds(), event = active.latest;
      const velocity = edgePanVelocity({ x: event.clientX - stage.left, y: event.clientY - stage.top }, stage);
      if (!velocity.x && !velocity.y) { edgeSince = lastTime = null; return; }
      edgeSince ??= time;
      const elapsed = Math.min(32, Math.max(0, time - (lastTime ?? time))) / 1000;
      lastTime = time;
      // A short dwell avoids scrolling when a stroke merely passes near an edge.
      if (time - edgeSince >= 200 && elapsed > 0) {
        const motion = options.panView!({ x: velocity.x * elapsed, y: velocity.y * elapsed });
        if (!motion || !active) { edgeSince = lastTime = null; return; }
        active.offsetX += motion.offsetX;
        active.bounds = bounds();
        if (advance(event)) onChange();
        showCursor(effective(event)); publishSample(effective(event));
      }
      if (active) assistFrame = view.requestAnimationFrame(assist);
    } catch (error) { fail(error); }
  };
  const scheduleAssist = () => {
    if (active && assisted() && assistFrame === null) assistFrame = view.requestAnimationFrame(assist);
  };
  const begin = (event: PointerEvent) => {
    const settings = getBrush();
    if (active || !settings || !event.isPrimary || event.button !== 0) return;
    const hit = hitBounds();
    if (event.clientX < hit.left || event.clientX > hit.right || event.clientY < hit.top || event.clientY > hit.bottom) return;
    event.preventDefault();
    try {
      const point = pointFromEvent(event);
      canvas.setPointerCapture(event.pointerId);
      try {
        options.onStrokeBegin?.();
        active = {
          pointerId: event.pointerId, stroke: startBrushStroke(terrain, point, settings),
          lastPoint: point, bounds: bounds(), stage: stageBounds(),
          windowWidth: view.innerWidth, windowHeight: view.innerHeight,
          latest: event, offsetX: 0,
        };
      } catch (error) {
        options.onStrokeEnd?.();
        canvas.releasePointerCapture(event.pointerId);
        throw error;
      }
      showCursor(event);
      onChange();
      publishSample(event);
      scheduleAssist();
    } catch (error) { fail(error); }
  };
  const down = (event: PointerEvent) => {
    if (event.pointerType === 'touch' && event.isPrimary && event.button === 0 && getBrush() && !active) {
      // Let a second finger claim navigation before the first dab is applied.
      pendingTouch = event;
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    } else begin(event);
  };

  const move = (event: PointerEvent) => {
    if (pendingTouch?.pointerId === event.pointerId && Math.hypot(event.clientX - pendingTouch.clientX, event.clientY - pendingTouch.clientY) >= 3) {
      const first = pendingTouch; pendingTouch = null; begin(first);
    }
    if (active && active.pointerId !== event.pointerId) return;
    if (active && assisted() && !overMap(event)) { stop(); return; }
    showCursor(active ? effective(event) : event);
    try {
      if (!active) { publishSample(event); return; }
      if ((event.buttons & 1) === 0) { stop(); publishSample(event); return; }
      event.preventDefault();
      active.latest = event;
      let changed = false;
      // Include the dispatched event as well; duplicates carry zero distance.
      const events = pointerSamples(event);
      for (const sample of events) {
        if (!active) break;
        changed = advance(sample) || changed;
      }
      if (changed) onChange();
      publishSample(effective(event));
      scheduleAssist();
    } catch (error) { fail(error); }
  };

  const up = (event: PointerEvent) => {
    if (pendingTouch?.pointerId === event.pointerId) { const first = pendingTouch; pendingTouch = null; begin(first); }
    if (active?.pointerId !== event.pointerId) return;
    if (assisted() && !overMap(event)) { stop(); return; }
    try {
      if (advance(event)) onChange();
    } catch (error) { onError(error); }
    stop();
    if (event.pointerType !== 'touch') {
      try { publishSample(event); } catch (error) { onError(error); }
    }
  };
  const cancel = (event: PointerEvent) => {
    if (active?.pointerId === event.pointerId || pendingTouch?.pointerId === event.pointerId) stop();
  };
  const visibility = () => { if (canvas.ownerDocument.hidden) stop(); };
  const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') stop(); };

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('lostpointercapture', cancel);
  view.addEventListener('pointerup', up);
  view.addEventListener('blur', stop);
  view.addEventListener('pagehide', stop);
  view.addEventListener('resize', stop);
  view.addEventListener('keydown', keydown);
  canvas.ownerDocument.addEventListener('visibilitychange', visibility);

  return { finish: stop, dispose: () => {
    stop();
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerleave', leave);
    canvas.removeEventListener('pointercancel', cancel);
    canvas.removeEventListener('lostpointercapture', cancel);
    view.removeEventListener('pointerup', up);
    view.removeEventListener('blur', stop);
    view.removeEventListener('pagehide', stop);
    view.removeEventListener('resize', stop);
    view.removeEventListener('keydown', keydown);
    canvas.ownerDocument.removeEventListener('visibilitychange', visibility);
  } };
}
