export type RgbColor = readonly [red: number, green: number, blue: number];

export const WATER_SHALLOW: RgbColor = [37, 111, 143];
export const WATER_DEEP: RgbColor = [12, 45, 72];
export const LAND_LOW: RgbColor = [109, 149, 88];
const LAND_HIGH: RgbColor = [183, 160, 121];
const LAND_PEAK: RgbColor = [235, 234, 224];

function blend(start: RgbColor, end: RgbColor, amount: number): RgbColor {
  const t = Math.max(0, Math.min(1, amount));
  return [
    Math.round(start[0] + (end[0] - start[0]) * t),
    Math.round(start[1] + (end[1] - start[1]) * t),
    Math.round(start[2] + (end[2] - start[2]) * t),
  ];
}

/** Provisional display palette, not a climate, biome, or physical-world model. */
export function elevationToColor(elevation: number, seaLevel: number): RgbColor {
  if (!Number.isFinite(elevation) || !Number.isFinite(seaLevel)) {
    throw new RangeError('Elevation and sea level must be finite.');
  }
  const relativeHeight = elevation - seaLevel;
  if (relativeHeight <= 0) return blend(WATER_SHALLOW, WATER_DEEP, -relativeHeight / 1_000);
  if (relativeHeight <= 2_000) return blend(LAND_LOW, LAND_HIGH, relativeHeight / 2_000);
  return blend(LAND_HIGH, LAND_PEAK, (relativeHeight - 2_000) / 3_000);
}
