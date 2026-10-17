import { useState } from 'react';
import { TerrainCanvas } from './components/TerrainCanvas.tsx';
import { BrushToolbar, brushFromControls, type BrushControls } from './components/BrushToolbar.tsx';
import { ElevationLegend } from './components/ElevationLegend.tsx';
import { createBlankTerrain } from './terrain/model.ts';
import { resetTerrainToOcean } from './terrain/modifications.ts';

export function App() {
  const [terrain] = useState(() => createBlankTerrain({ id: 'atlas-a0-blank-ocean' }));
  const [controls, setControls] = useState<BrushControls>({ tool: 'raise', radius: 0.06, strength: 200, intensity: 0.5, targetElevation: '0' });
  const [revision, setRevision] = useState(0);
  const reset = () => {
    if (window.confirm('Reset all terrain to the blank ocean at −100 meters? This clears all sculpting. Undo is not available.')) {
      resetTerrainToOcean(terrain);
      setRevision((value) => value + 1);
    }
  };

  return (
    <div className="atlas-app">
      <header className="site-header">
        <span className="wordmark">Serrian Tide</span>
        <span className="workspace-label">World creation</span>
      </header>
      <main>
        <div className="page-heading">
          <h1>Atlas</h1>
          <p>Raise islands. Refine the land. Shape your world.</p>
        </div>
        <BrushToolbar settings={controls} mapSpan={Math.min(terrain.metadata.dimensions.width, terrain.metadata.dimensions.height)} onChange={setControls} onReset={reset} />
        <figure className="map-frame">
          <TerrainCanvas terrain={terrain} brush={brushFromControls(controls)} revision={revision} />
          <figcaption>
            <span className="map-name">Click or drag to sculpt</span>
            <ElevationLegend seaLevel={terrain.metadata.seaLevel} />
          </figcaption>
        </figure>
      </main>
    </div>
  );
}
