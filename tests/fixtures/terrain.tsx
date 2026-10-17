// Test-only host: no instrumentation or terrain inspection hooks enter the app build.
import { Profiler, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TerrainCanvas } from '../../src/components/TerrainCanvas.tsx';
import type { BrushSettings } from '../../src/terrain/brush.ts';
import { createBlankTerrain } from '../../src/terrain/model.ts';

export const terrain = createBlankTerrain({ id: 'component-browser-fixture' });
const originalBuffer = terrain.elevations;
const originalMetadata = terrain.metadata;
let saved: Float32Array | undefined;
let commits = 0;
let repaints = 0;
let changeBrush: (settings: BrushSettings | undefined) => void;

const nativeDrawImage = CanvasRenderingContext2D.prototype.drawImage;
CanvasRenderingContext2D.prototype.drawImage = function (...args: unknown[]) {
  if (this.canvas.getAttribute('aria-label') === 'Atlas terrain map') repaints += 1;
  return Reflect.apply(nativeDrawImage, this, args);
};

export function setBrush(settings: BrushSettings | undefined) { changeBrush(settings); }
export function snapshot() { saved = terrain.elevations.slice(); }
export function matchesSnapshot() {
  return saved?.every((value, index) => Object.is(value, terrain.elevations[index]))
    && originalBuffer === terrain.elevations && originalMetadata === terrain.metadata;
}
export function statistics() {
  let min = Infinity;
  let max = -Infinity;
  let changed = 0;
  for (const value of terrain.elevations) {
    min = Math.min(min, value);
    max = Math.max(max, value);
    if (value !== -100) changed += 1;
  }
  return { min, max, changed, commits, repaints, count: terrain.elevations.length };
}

function Fixture() {
  const [brush, updateBrush] = useState<BrushSettings | undefined>({ tool: 'raise', radius: 0.06, strength: 200 });
  changeBrush = updateBrush;
  return <>
    <button type="button">Outside the map</button>
    <Profiler id="terrain" onRender={() => { commits += 1; }}>
      <TerrainCanvas terrain={terrain} brush={brush} />
    </Profiler>
  </>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
