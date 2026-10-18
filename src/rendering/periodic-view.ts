import { fitMap } from './fit-map.ts';
import type { ViewportSize } from '../terrain/sampling.ts';

/** Presentation policy for the current flat, horizontally periodic provider only. */
export function focusedPeriodicSize(dimensions: ViewportSize, stage: ViewportSize) {
  fitMap(dimensions, stage); // Same positive, finite extent validation as other views.
  const fullHeightWidth = stage.height * dimensions.width / dimensions.height;
  // Keep full-height coverage on tall views; cap vertical magnification at 2x
  // on exceptionally wide views rather than cropping almost all their latitude.
  const width = Math.max(fullHeightWidth, Math.min(stage.width * .82, fullHeightWidth * 2));
  return { left: 0, top: 0, width, height: width * dimensions.height / dimensions.width };
}

/** A movable geographic cut beneath a centered, one-period working window. */
export function periodicContextFrame(periodWidth: number, stageWidth: number) {
  const left = (stageWidth - periodWidth) / 2;
  return { left, right: left + periodWidth, previewWidth: Math.max(0, left) };
}
