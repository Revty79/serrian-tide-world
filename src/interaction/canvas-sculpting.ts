import { startBrushStroke, type BrushSettings, type BrushStroke } from '../terrain/brush.ts';
import type { Terrain } from '../terrain/model.ts';
import { isWrapped } from '../terrain/topology.ts';
import { inspectElevation, viewportToWorld, type ElevationSample, type Point } from '../terrain/sampling.ts';

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
  onPreview?: (event: PointerEvent, settings: Readonly<BrushSettings> | undefined) => void;
}

/** DOM pointer lifecycle only. Numerical stroke interpolation lives in the engine. */
export function attachCanvasSculpting(canvas: HTMLCanvasElement, options: SculptingOptions) {
  const { terrain, cursor, getBrush, onChange, onError } = options;
  const view = canvas.ownerDocument.defaultView!;
  let active: { pointerId: number; stroke: BrushStroke; lastPoint: Point; bounds: DOMRect; windowWidth: number; windowHeight: number } | null = null;
  let pendingTouch: PointerEvent | null = null;
  const bounds = () => options.getMapBounds?.() ?? canvas.getBoundingClientRect();
  const hitBounds = () => {
    const rect = bounds();
    if (!isWrapped(terrain)) return rect;
    const stage = canvas.getBoundingClientRect();
    return { left: stage.left, right: stage.right, top: Math.max(stage.top, rect.top), bottom: Math.min(stage.bottom, rect.bottom), width: stage.width, height: Math.max(0, Math.min(stage.bottom, rect.bottom) - Math.max(stage.top, rect.top)) };
  };

  const pointFromEvent = (event: PointerEvent) => {
    const rect = bounds();
    if (isWrapped(terrain)) return { x: (event.clientX - rect.left) / rect.width * terrain.metadata.dimensions.width, y: Math.max(0, Math.min(terrain.metadata.dimensions.height, (event.clientY - rect.top) / rect.height * terrain.metadata.dimensions.height)) };
    return viewportToWorld(terrain, {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
    }, rect);
  };

  const hideCursor = () => { cursor.hidden = true; };
  const publishSample = (event: PointerEvent) => {
    const rect = hitBounds();
    const inside = rect.width > 0 && rect.height > 0
      && event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
    options.onSample?.(inside ? inspectElevation(terrain, pointFromEvent(event)) : null);
  };
  const leave = () => { hideCursor(); options.onSample?.(null); };
  const showCursor = (event: PointerEvent) => {
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
    const previous = active;
    active = null;
    pendingTouch = null;
    previous?.stroke.end();
    if (previous) options.onStrokeEnd?.();
    if (previous && canvas.hasPointerCapture(previous.pointerId)) {
      canvas.releasePointerCapture(previous.pointerId);
    }
    hideCursor();
    options.onSample?.(null);
  };

  const fail = (error: unknown) => { stop(); onError(error); };
  const advance = (event: PointerEvent): boolean => {
    if (!active) return false;
    if (!getBrush()) { stop(); return false; }
    const rect = bounds();
    const original = active.bounds;
    // Layout can change before the browser delivers resize/observer callbacks.
    if (view.innerWidth !== active.windowWidth || view.innerHeight !== active.windowHeight
      || rect.width !== original.width || rect.height !== original.height
      || rect.left !== original.left || rect.top !== original.top) {
      stop();
      return false;
    }
    const { width, height } = terrain.metadata.dimensions;
    const target = {
      x: (event.clientX - rect.left) / rect.width * width,
      y: (event.clientY - rect.top) / rect.height * height,
    };
    const from = active.lastPoint;
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    // Intersect the actual segment with the map boundary. Simply clamping each
    // event would bend an exiting stroke differently at different event rates.
    let t = 1;
    const hit = hitBounds();
    const minX = isWrapped(terrain) ? (hit.left - rect.left) / rect.width * width : 0;
    const maxX = isWrapped(terrain) ? (hit.right - rect.left) / rect.width * width : width;
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
          lastPoint: point, bounds: bounds(),
          windowWidth: view.innerWidth, windowHeight: view.innerHeight,
        };
      } catch (error) {
        options.onStrokeEnd?.();
        canvas.releasePointerCapture(event.pointerId);
        throw error;
      }
      showCursor(event);
      onChange();
      publishSample(event);
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
    showCursor(event);
    try {
      if (!active) { publishSample(event); return; }
      if ((event.buttons & 1) === 0) { stop(); publishSample(event); return; }
      event.preventDefault();
      let changed = false;
      // Include the dispatched event as well; duplicates carry zero distance.
      const events = [...(event.getCoalescedEvents?.() ?? []), event];
      for (const sample of events) {
        if (!active) break;
        changed = advance(sample) || changed;
      }
      if (changed) onChange();
      publishSample(event);
    } catch (error) { fail(error); }
  };

  const up = (event: PointerEvent) => {
    if (pendingTouch?.pointerId === event.pointerId) { const first = pendingTouch; pendingTouch = null; begin(first); }
    if (active?.pointerId !== event.pointerId) return;
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

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('lostpointercapture', cancel);
  view.addEventListener('pointerup', up);
  view.addEventListener('blur', stop);
  view.addEventListener('pagehide', stop);
  view.addEventListener('resize', stop);
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
    canvas.ownerDocument.removeEventListener('visibilitychange', visibility);
  } };
}
