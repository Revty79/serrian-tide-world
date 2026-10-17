import { useState } from 'react';
import { TerrainCanvas } from './components/TerrainCanvas.tsx';
import { createBlankTerrain } from './terrain/model.ts';

export function App() {
  const [terrain] = useState(() => createBlankTerrain({ id: 'atlas-a0-blank-ocean' }));

  return (
    <div className="atlas-app">
      <header className="site-header">
        <span className="wordmark">Serrian Tide</span>
        <span className="workspace-label">World creation</span>
      </header>
      <main>
        <div className="page-heading">
          <h1>Atlas</h1>
          <p>Your world begins beneath the sea.</p>
        </div>
        <figure className="map-frame">
          <TerrainCanvas terrain={terrain} />
          <figcaption>
            <span className="map-name">Blank ocean</span>
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
