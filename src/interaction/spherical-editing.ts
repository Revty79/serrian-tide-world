import type { ScreenPoint } from '../rendering/spherical-view.ts';

/** Exclusive gesture arbitration. Touch waits before its first dab so two contacts can claim navigation. */
export function attachSphericalEditing(canvas: HTMLCanvasElement, actions: {
  paintingEnabled(): boolean; begin(point: ScreenPoint): boolean; move(point: ScreenPoint): boolean;
  release(): void; stop(): void; hover(point: ScreenPoint | null): void;
  drag(dx: number, dy: number): void; zoom(factor: number): void; inspect(point: ScreenPoint, select: boolean): void; reset(): void;
}) {
  const pointers = new Map<number, { x: number; y: number; start: ScreenPoint; moved: boolean }>();
  let mode: 'paint' | 'touch' | 'navigate' | 'blocked' | undefined, space = false;
  let anchor: ScreenPoint | null = null, current: ScreenPoint | null = null;
  const local = (x: number, y: number) => { const r = canvas.getBoundingClientRect(); return { x: x - r.left, y: y - r.top }; };
  const stopPaint = () => { actions.stop(); if (mode === 'paint' || mode === 'touch') mode = 'blocked'; anchor = null; };
  const cancel = () => {
    stopPaint(); const ids = [...pointers.keys()]; pointers.clear(); mode = undefined; current = null;
    for (const id of ids) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    canvas.dataset.dragging = 'false'; canvas.dataset.editing = 'false';
  };
  const movePaint = (point: ScreenPoint) => {
    const r = canvas.getBoundingClientRect(), hit = document.elementFromPoint(r.left + point.x, r.top + point.y);
    if (hit !== canvas || !actions.move(point)) { stopPaint(); canvas.dataset.editing = 'false'; return; }
    anchor = point;
  };
  const down = (event: PointerEvent) => {
    if (event.button > 1 || pointers.size >= 2) return;
    event.preventDefault(); canvas.focus({ preventScroll: true }); const point = local(event.clientX, event.clientY);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, start: point, moved: false }); canvas.setPointerCapture(event.pointerId);
    if (pointers.size === 2) { stopPaint(); mode = 'navigate'; for (const p of pointers.values()) p.moved = true; }
    else if (!space && event.button === 0 && actions.paintingEnabled()) {
      mode = event.pointerType === 'touch' ? 'touch' : actions.begin(point) ? 'paint' : 'blocked'; anchor = point; current = point;
    } else mode = 'navigate';
    canvas.dataset.dragging = 'true'; canvas.dataset.editing = String(mode === 'paint'); actions.hover(point);
  };
  const move = (event: PointerEvent) => {
    const point = local(event.clientX, event.clientY), pointer = pointers.get(event.pointerId); actions.hover(point);
    if (!pointer) { if (!pointers.size) actions.inspect(point, false); return; }
    event.preventDefault(); const before = [...pointers.values()].map((p) => ({ ...p })), dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    pointer.x = event.clientX; pointer.y = event.clientY;
    if (Math.hypot(point.x - pointer.start.x, point.y - pointer.start.y) > 5) pointer.moved = true;
    if (mode === 'touch' && pointer.moved) mode = actions.begin(pointer.start) ? 'paint' : 'blocked';
    current = point;
    if (mode === 'paint') movePaint(point);
    else if (mode === 'navigate') {
      if (pointers.size === 2) {
        const after = [...pointers.values()], first = Math.hypot(before[0]!.x - before[1]!.x, before[0]!.y - before[1]!.y), last = Math.hypot(after[0]!.x - after[1]!.x, after[0]!.y - after[1]!.y);
        if (first > 1 && last > 1) actions.zoom(last / first); actions.drag(dx / 2, dy / 2);
      } else actions.drag(dx, dy);
    }
    canvas.dataset.editing = String(mode === 'paint');
  };
  const up = (event: PointerEvent) => {
    const pointer = pointers.get(event.pointerId); if (!pointer) return;
    const point = local(event.clientX, event.clientY);
    if (mode === 'touch' && pointers.size === 1) { if (actions.begin(pointer.start)) actions.release(); }
    else if (mode === 'paint') { movePaint(point); actions.release(); }
    else if (mode === 'navigate' && !pointer.moved && pointers.size === 1) actions.inspect(point, true);
    pointers.delete(event.pointerId); if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (!pointers.size) { mode = undefined; current = null; anchor = null; }
    canvas.dataset.dragging = String(pointers.size > 0); canvas.dataset.editing = 'false';
  };
  const lost = (event: PointerEvent) => { if (pointers.has(event.pointerId)) cancel(); };
  const wheel = (event: WheelEvent) => { event.preventDefault(); stopPaint(); actions.zoom(Math.exp(Math.max(-1, Math.min(1, -event.deltaY * .0015)))); };
  const key = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const delta: Record<string, readonly [number, number]> = { ArrowLeft: [-32, 0], ArrowRight: [32, 0], ArrowUp: [0, -32], ArrowDown: [0, 32] };
    if (delta[event.key]) { event.preventDefault(); stopPaint(); actions.drag(...delta[event.key]!); }
    else if (event.code === 'Space') { event.preventDefault(); stopPaint(); space = true; }
    else if (['+', '=', '-'].includes(event.key)) { event.preventDefault(); stopPaint(); actions.zoom(event.key === '-' ? .8 : 1.25); }
    else if (event.key === 'Home') { event.preventDefault(); stopPaint(); actions.reset(); }
    else if (event.key === 'Escape') cancel();
    else if (event.key === 'Enter') { event.preventDefault(); const r = canvas.getBoundingClientRect(); actions.inspect({ x: r.width / 2, y: r.height / 2 }, true); }
  };
  const keyup = (event: KeyboardEvent) => { if (event.code === 'Space') space = false; };
  const blur = () => { space = false; cancel(); };
  const leave = () => { if (!pointers.size) actions.hover(null); };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('lostpointercapture', lost);
  canvas.addEventListener('pointerleave', leave); canvas.addEventListener('wheel', wheel, { passive: false }); canvas.addEventListener('keydown', key); canvas.addEventListener('blur', blur);
  window.addEventListener('keyup', keyup); window.addEventListener('blur', blur); window.addEventListener('resize', cancel); document.addEventListener('visibilitychange', cancel);
  return { cancel, get drawingPoint() { return mode === 'paint' ? current : null; }, get anchor() { return anchor; },
    assist(dx: number, dy: number) { if (anchor && current && mode === 'paint') { anchor = { x: anchor.x + dx, y: anchor.y + dy }; movePaint(current); } },
    dispose() { cancel(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('lostpointercapture', lost); canvas.removeEventListener('pointerleave', leave); canvas.removeEventListener('wheel', wheel); canvas.removeEventListener('keydown', key); canvas.removeEventListener('blur', blur); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', blur); window.removeEventListener('resize', cancel); document.removeEventListener('visibilitychange', cancel); }
  };
}
