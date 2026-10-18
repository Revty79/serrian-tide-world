/** Shared numerical kernels. No topology, input lifecycle or display assumptions. */
export const FLOAT32_MAX = 3.4028234663852886e38;
export const radialFalloff = (distance: number): number => Math.max(0, Math.min(1, (1 - distance) ** 2 * (1 + 2 * distance)));
export const saturatedElevation = (value: number): number => Math.fround(Math.max(-FLOAT32_MAX, Math.min(FLOAT32_MAX, value)));
