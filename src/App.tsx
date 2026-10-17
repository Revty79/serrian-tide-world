import { useState } from 'react';
import { TerrainCanvas } from './components/TerrainCanvas.tsx';
import { BrushToolbar } from './components/BrushToolbar.tsx';
import type { BrushSettings } from './terrain/brush.ts';
import { createBlankTerrain } from './terrain/model.ts';

export function App() {
  const [terrain] = useState(() => createBlankTerrain({ id: 'atlas-a0-blank-ocean' }));
  const [brush, setBrush] = useState<BrushSettings>({ tool: 'raise', radius: 0.06, strength: 200 });

  return (
    <div className="atlas-app">
      <header className="site-header">
        <span className="wordmark">Serrian Tide</span>
        <span className="workspace-label">World creation</span>
      </header>
      <main>
        <div className="page-heading">
          <h1>Atlas</h1>
          <p>Raise islands. Shape the land. Carve it back to sea.</p>
        </div>
        <BrushToolbar settings={brush} mapSpan={Math.min(terrain.metadata.dimensions.width, terrain.metadata.dimensions.height)} onChange={setBrush} />
        <figure className="map-frame">
          <TerrainCanvas terrain={terrain} brush={brush} />
          <figcaption>
            <span className="map-name">Click or drag to sculpt</span>
            <span className="map-legend" aria-label="Elevation legend">
              <span><i className="swatch swatch-water" aria-hidden="true" />Water ≤ 0 m</span>
              <span><i className="swatch swatch-land" aria-hidden="true" />Land &gt; 0 m</span>
            </span>
          </figcaption>
        </figure>
      </main>
    </div>
  );
}
