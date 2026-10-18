import type { Point, ViewportSize } from '../terrain/sampling.ts';

/** CSS pixels/second. View motion, never terrain displacement or brush strength. */
export function edgePanVelocity(point: Point, stage: ViewportSize): Point {
  const band = Math.min(48, stage.width / 4, stage.height / 4);
  const axis = (value: number, extent: number) => {
    if (value < band) return (1 - Math.max(0, value) / band) ** 2;
    if (value > extent - band) return -((1 - Math.max(0, extent - value) / band) ** 2);
    return 0;
  };
  const x = axis(point.x, stage.width), y = axis(point.y, stage.height);
  const scale = 360 / Math.max(1, Math.hypot(x, y));
  return { x: x * scale, y: y * scale };
}

/** Keep a stroke's unwrapped coordinates continuous when the camera phase wraps. */
export function periodicStrokeOffset(previousLeft: number, nextLeft: number, requestedX: number, period: number, worldWidth: number) {
  return Math.round((nextLeft - previousLeft - requestedX) / period) * worldWidth;
}
