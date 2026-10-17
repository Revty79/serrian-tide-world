import type { ViewportSize } from '../terrain/sampling.ts';

/** Contain the logical planar rectangle, centered, without changing any terrain. */
export function fitMap(dimensions: ViewportSize, available: ViewportSize) {
  if (![dimensions.width, dimensions.height, available.width, available.height]
    .every((value) => Number.isFinite(value) && value > 0)) {
    throw new RangeError('Map and available dimensions must be finite and positive.');
  }
  const scale = Math.min(available.width / dimensions.width, available.height / dimensions.height);
  const width = dimensions.width * scale;
  const height = dimensions.height * scale;
  return { left: (available.width - width) / 2, top: (available.height - height) / 2, width, height };
}
