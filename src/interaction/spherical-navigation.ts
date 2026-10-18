import type { ScreenPoint } from '../rendering/spherical-view.ts';

/** Navigation only. No terrain mutation, brush state, periodic phase or edge scrolling. */
export function attachSphericalNavigation(canvas: HTMLCanvasElement, actions: {
  drag(dx: number, dy: number): void; zoom(factor: number): void;
  inspect(point: ScreenPoint, select: boolean): void; reset(): void;
}) {
  const pointers = new Map<number, { x: number; y: number; startX: number; startY: number; moved: boolean }>();
  const local = (x: number, y: number) => { const r = canvas.getBoundingClientRect(); return { x: x - r.left, y: y - r.top }; };
  const cancel = () => {
    const ids = [...pointers.keys()]; pointers.clear();
    for (const id of ids) if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    canvas.dataset.dragging = 'false';
  };
  const down = (event: PointerEvent) => {
    if (event.button !== 0 || pointers.size >= 2) return;
    event.preventDefault(); canvas.focus({ preventScroll: true });
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false });
    if (pointers.size === 2) for (const p of pointers.values()) p.moved = true;
    canvas.setPointerCapture(event.pointerId); canvas.dataset.dragging = 'true';
  };
  const move = (event: PointerEvent) => {
    const pointer = pointers.get(event.pointerId);
    if (!pointer) { if (pointers.size === 0) actions.inspect(local(event.clientX, event.clientY), false); return; }
    event.preventDefault(); const before = [...pointers.values()].map((p) => ({ ...p }));
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    pointer.x = event.clientX; pointer.y = event.clientY;
    if (Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) > 5) pointer.moved = true;
    if (pointers.size === 2) {
      const after = [...pointers.values()], first = Math.hypot(before[0]!.x - before[1]!.x, before[0]!.y - before[1]!.y), last = Math.hypot(after[0]!.x - after[1]!.x, after[0]!.y - after[1]!.y);
      if (first > 1 && last > 1) actions.zoom(last / first);
      actions.drag(dx / 2, dy / 2);
    } else actions.drag(dx, dy);
  };
  const up = (event: PointerEvent) => {
    const pointer = pointers.get(event.pointerId); if (!pointer) return;
    const select = !pointer.moved && pointers.size === 1;
    pointers.delete(event.pointerId); if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    canvas.dataset.dragging = String(pointers.size > 0);
    if (select) actions.inspect(local(event.clientX, event.clientY), true);
  };
  const wheel = (event: WheelEvent) => { event.preventDefault(); actions.zoom(Math.exp(Math.max(-1, Math.min(1, -event.deltaY * .0015)))); };
  const key = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const deltas: Record<string, readonly [number, number]> = { ArrowLeft: [-32, 0], ArrowRight: [32, 0], ArrowUp: [0, -32], ArrowDown: [0, 32] };
    const delta = deltas[event.key];
    if (delta) { event.preventDefault(); actions.drag(...delta); }
    else if (event.key === '+' || event.key === '=') { event.preventDefault(); actions.zoom(1.25); }
    else if (event.key === '-') { event.preventDefault(); actions.zoom(.8); }
    else if (event.key === 'Home') { event.preventDefault(); actions.reset(); }
    else if (event.key === 'Escape') cancel();
    else if (event.key === 'Enter') { event.preventDefault(); const r = canvas.getBoundingClientRect(); actions.inspect({ x: r.width / 2, y: r.height / 2 }, true); }
  };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('lostpointercapture', cancel);
  canvas.addEventListener('wheel', wheel, { passive: false }); canvas.addEventListener('keydown', key); canvas.addEventListener('blur', cancel);
  window.addEventListener('blur', cancel); window.addEventListener('resize', cancel); document.addEventListener('visibilitychange', cancel);
  return { cancel, dispose() {
    cancel(); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('lostpointercapture', cancel); canvas.removeEventListener('wheel', wheel);
    canvas.removeEventListener('keydown', key); canvas.removeEventListener('blur', cancel); window.removeEventListener('blur', cancel); window.removeEventListener('resize', cancel); document.removeEventListener('visibilitychange', cancel);
  } };
}
