import { fitMap } from './fit-map.ts';
import type { Point, ViewportSize } from '../terrain/sampling.ts';

export interface Camera { readonly zoom: number; readonly centerX: number; readonly centerY: number }
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
export const FIT_CAMERA: Camera = Object.freeze({ zoom: 1, centerX: 0.5, centerY: 0.5 });
export interface ViewOptions { readonly mode?: 'fit' | 'fill'; readonly periodicU?: boolean }
export function baseMapSize(dimensions: ViewportSize, stage: ViewportSize, options: ViewOptions = {}) {
  const fitted = fitMap(dimensions, stage);
  if (options.mode !== 'fill') return fitted;
  const scale = options.periodicU ? stage.height / dimensions.height : Math.max(stage.width / dimensions.width, stage.height / dimensions.height);
  return { left: 0, top: 0, width: dimensions.width * scale, height: dimensions.height * scale };
}
const phase = (value: number) => { const next = value % 1; return next < 0 ? next + 1 : next === 0 ? 0 : next; };

/** Camera positions are normalized map coordinates at the center of the stage. */
export function cameraRect(camera: Camera, dimensions: ViewportSize, stage: ViewportSize, options: ViewOptions = {}) {
  const fit = baseMapSize(dimensions, stage, options);
  const width = fit.width * camera.zoom;
  const height = fit.height * camera.zoom;
  return { left: stage.width / 2 - camera.centerX * width, top: stage.height / 2 - camera.centerY * height, width, height };
}

export function constrainCamera(camera: Camera, dimensions: ViewportSize, stage: ViewportSize, options: ViewOptions = {}): Camera {
  if (![camera.zoom, camera.centerX, camera.centerY].every(Number.isFinite)) throw new RangeError('Invalid camera.');
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom));
  const rect = cameraRect({ ...camera, zoom }, dimensions, stage, options);
  const left = Math.max(Math.min(0, stage.width - rect.width), Math.min(Math.max(0, stage.width - rect.width), rect.left));
  const top = Math.max(Math.min(0, stage.height - rect.height), Math.min(Math.max(0, stage.height - rect.height), rect.top));
  return { zoom, centerX: options.periodicU ? phase(camera.centerX) : (stage.width / 2 - left) / rect.width, centerY: (stage.height / 2 - top) / rect.height };
}

export function zoomAt(camera: Camera, zoom: number, anchor: Point, dimensions: ViewportSize, stage: ViewportSize, options: ViewOptions = {}): Camera {
  const old = cameraRect(camera, dimensions, stage, options);
  const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  return constrainCamera({
    zoom: nextZoom,
    centerX: (anchor.x - old.left) / old.width - (anchor.x - stage.width / 2) / (old.width * nextZoom / camera.zoom),
    centerY: (anchor.y - old.top) / old.height - (anchor.y - stage.height / 2) / (old.height * nextZoom / camera.zoom),
  }, dimensions, stage, options);
}

export function panBy(camera: Camera, delta: Point, dimensions: ViewportSize, stage: ViewportSize, options: ViewOptions = {}): Camera {
  const rect = cameraRect(camera, dimensions, stage, options);
  return constrainCamera({ zoom: camera.zoom, centerX: camera.centerX - (options.periodicU ? delta.x / rect.width % 1 : delta.x / rect.width), centerY: camera.centerY - delta.y / rect.height }, dimensions, stage, options);
}
