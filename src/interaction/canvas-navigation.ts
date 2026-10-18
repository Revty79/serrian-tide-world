import type { Point } from '../terrain/sampling.ts';

export function isTextInput(target: EventTarget | null) {
  return target instanceof HTMLElement && (!!target.closest('input, textarea, select, [contenteditable="true"]'));
}

interface NavigationOptions {
  isPan: () => boolean;
  finishStroke: () => void;
  pan: (delta: Point) => void;
  zoom: (factor: number, point: Point) => void;
}

/** Arbitration happens on the stage before a pointer can reach the brush canvas. */
export function attachCanvasNavigation(stage: HTMLElement, canvas: HTMLCanvasElement, options: NavigationOptions) {
  const view = stage.ownerDocument.defaultView!;
  const pointers = new Map<number, Point>();
  let space = false;
  let mode: 'pan' | 'pinch' | null = null;
  let panId: number | null = null;
  let previous: Point | null = null;
  let pinch: { midpoint: Point; distance: number } | null = null;
  const position = (e: PointerEvent) => ({ x: e.clientX, y: e.clientY });
  const local = (p: Point) => { const rect = stage.getBoundingClientRect(); return { x: p.x - rect.left, y: p.y - rect.top }; };
  const pinchState = () => {
    const [a, b] = [...pointers.values()];
    if (!a || !b) return null;
    return { midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, distance: Math.hypot(a.x - b.x, a.y - b.y) };
  };
  const consume = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
  const finishGesture = () => {
    const ids = [...pointers.keys()];
    if (panId !== null) ids.push(panId);
    pointers.clear(); mode = null; panId = null; previous = null; pinch = null;
    for (const id of ids) if (stage.hasPointerCapture(id)) stage.releasePointerCapture(id);
  };
  const finish = () => { space = false; finishGesture(); };
  const down = (e: PointerEvent) => {
    if (e.button !== 0) return;
    // A mouse press also transfers keyboard focus from the last toolbar action.
    // This prevents a held Space from activating that button on release.
    canvas.focus({ preventScroll: true });
    if (e.pointerType === 'touch') pointers.set(e.pointerId, position(e));
    if (pointers.size >= 2 || mode === 'pinch') {
      options.finishStroke(); mode = 'pinch'; pinch = pinchState(); stage.setPointerCapture(e.pointerId); consume(e); return;
    }
    if (options.isPan() || space) {
      options.finishStroke(); mode = 'pan'; panId = e.pointerId; previous = position(e); stage.setPointerCapture(e.pointerId); consume(e);
    }
  };
  const move = (e: PointerEvent) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, position(e));
    if (mode === 'pinch') {
      const next = pinchState();
      if (next && pinch) {
        options.pan({ x: next.midpoint.x - pinch.midpoint.x, y: next.midpoint.y - pinch.midpoint.y });
        if (pinch.distance > 0 && next.distance > 0) options.zoom(next.distance / pinch.distance, local(next.midpoint));
      }
      pinch = next; consume(e);
    } else if (mode === 'pan' && e.pointerId === panId) {
      if (previous) options.pan({ x: e.clientX - previous.x, y: e.clientY - previous.y });
      previous = position(e); consume(e);
    }
  };
  const up = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (mode === 'pinch') { pinch = pinchState(); consume(e); if (!pointers.size) finishGesture(); }
    else if (mode === 'pan' && e.pointerId === panId) { consume(e); finishGesture(); }
  };
  const cancel = (e: PointerEvent) => { if (pointers.has(e.pointerId) || e.pointerId === panId) finish(); };
  const lostCapture = (e: PointerEvent) => { if (e.target === stage) cancel(e); };
  const wheel = (e: WheelEvent) => {
    if (e.target !== canvas) return;
    options.finishStroke();
    options.zoom(Math.exp(-Math.max(-300, Math.min(300, e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? view.innerHeight : 1))) * 0.002), local({ x: e.clientX, y: e.clientY }));
    consume(e);
  };
  const keydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { options.finishStroke(); finish(); return; }
    if (e.code === 'Space' && !isTextInput(e.target)) {
      if (!space) options.finishStroke(); space = true;
      // Preserve native keyboard activation when a button is used without dragging.
      if (!(e.target instanceof HTMLElement && e.target.closest('button'))) e.preventDefault();
    }
  };
  const keyup = (e: KeyboardEvent) => { if (e.code === 'Space') space = false; };
  const visibility = () => { if (stage.ownerDocument.hidden) finish(); };
  stage.addEventListener('pointerdown', down, true);
  stage.addEventListener('pointermove', move, true);
  // Capture on window also handles releases outside the stage.
  view.addEventListener('pointerup', up, true);
  view.addEventListener('pointercancel', cancel, true);
  stage.addEventListener('lostpointercapture', lostCapture);
  stage.addEventListener('wheel', wheel, { passive: false });
  view.addEventListener('keydown', keydown);
  view.addEventListener('keyup', keyup);
  view.addEventListener('blur', finish);
  view.addEventListener('resize', finish);
  view.addEventListener('pagehide', finish);
  stage.ownerDocument.addEventListener('visibilitychange', visibility);
  return { blocked: () => mode !== null || space || options.isPan(), finish, dispose: () => {
    finish();
    stage.removeEventListener('pointerdown', down, true); stage.removeEventListener('pointermove', move, true);
    view.removeEventListener('pointerup', up, true); view.removeEventListener('pointercancel', cancel, true);
    stage.removeEventListener('lostpointercapture', lostCapture);
    stage.removeEventListener('wheel', wheel); view.removeEventListener('keydown', keydown); view.removeEventListener('keyup', keyup);
    view.removeEventListener('blur', finish); view.removeEventListener('resize', finish); view.removeEventListener('pagehide', finish);
    stage.ownerDocument.removeEventListener('visibilitychange', visibility);
  } };
}
