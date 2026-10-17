import { fitMap } from './fit-map.ts';
import type { Point, ViewportSize } from '../terrain/sampling.ts';

export interface Camera { readonly zoom: number; readonly centerX: number; readonly centerY: number }
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
export const FIT_CAMERA: Camera = Object.freeze({ zoom: 1, centerX: 0.5, centerY: 0.5 });

/** Camera positions are normalized map coordinates at the center of the stage. */
export function cameraRect(camera: Camera, dimensions: ViewportSize, stage: ViewportSize) {
  const fit = fitMap(dimensions, stage);
  const width = fit.width * camera.zoom;
  const height = fit.height * camera.zoom;
  return { left: stage.width / 2 - camera.centerX * width, top: stage.height / 2 - camera.centerY * height, width, height };
}

export function constrainCamera(camera: Camera, dimensions: ViewportSize, stage: ViewportSize): Camera {
  if (![camera.zoom, camera.centerX, camera.centerY].every(Number.isFinite)) throw new RangeError('Invalid camera.');
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom));
  const rect = cameraRect({ ...camera, zoom }, dimensions, stage);
  const left = Math.max(Math.min(0, stage.width - rect.width), Math.min(Math.max(0, stage.width - rect.width), rect.left));
  const top = Math.max(Math.min(0, stage.height - rect.height), Math.min(Math.max(0, stage.height - rect.height), rect.top));
  return { zoom, centerX: (stage.width / 2 - left) / rect.width, centerY: (stage.height / 2 - top) / rect.height };
}

export function zoomAt(camera: Camera, zoom: number, anchor: Point, dimensions: ViewportSize, stage: ViewportSize): Camera {
  const old = cameraRect(camera, dimensions, stage);
  const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  return constrainCamera({
    zoom: nextZoom,
    centerX: (anchor.x - old.left) / old.width - (anchor.x - stage.width / 2) / (old.width * nextZoom / camera.zoom),
    centerY: (anchor.y - old.top) / old.height - (anchor.y - stage.height / 2) / (old.height * nextZoom / camera.zoom),
  }, dimensions, stage);
}

export function panBy(camera: Camera, delta: Point, dimensions: ViewportSize, stage: ViewportSize): Camera {
  const rect = cameraRect(camera, dimensions, stage);
  return constrainCamera({ zoom: camera.zoom, centerX: camera.centerX - delta.x / rect.width, centerY: camera.centerY - delta.y / rect.height }, dimensions, stage);
}
