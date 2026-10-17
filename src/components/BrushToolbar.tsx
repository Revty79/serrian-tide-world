'use client';

import { useId } from 'react';
import type { BrushSettings } from '../terrain/brush.ts';
import styles from './BrushToolbar.module.css';

interface BrushToolbarProps {
  settings: BrushSettings;
  mapSpan: number;
  onChange: (settings: BrushSettings) => void;
}

export function BrushToolbar({ settings, mapSpan, onChange }: BrushToolbarProps) {
  const radiusId = useId();
  const strengthId = useId();
  const radiusPercent = Math.round(settings.radius / mapSpan * 1_000) / 10;
  return (
    <div className={styles.toolbar} aria-label="Terrain brush controls">
      <div className={styles.tools} role="group" aria-label="Terrain tool">
        <button type="button" aria-pressed={settings.tool === 'raise'} onClick={() => onChange({ ...settings, tool: 'raise' })}>
          <span aria-hidden="true">↗</span> Raise
        </button>
        <button type="button" aria-pressed={settings.tool === 'lower'} onClick={() => onChange({ ...settings, tool: 'lower' })}>
          <span aria-hidden="true">↘</span> Lower
        </button>
      </div>
      <div className={styles.control}>
        <label htmlFor={radiusId}>Radius <output htmlFor={radiusId}>{radiusPercent}% of map</output></label>
        <input id={radiusId} type="range" min="0.5" max="20" step="0.5" value={radiusPercent}
          aria-valuetext={`${radiusPercent}% of the map's shorter side`}
          onChange={(event) => onChange({ ...settings, radius: Number(event.target.value) / 100 * mapSpan })} />
      </div>
      <div className={styles.control}>
        <label htmlFor={strengthId}>Strength <output htmlFor={strengthId}>{settings.strength} m / dab</output></label>
        <input id={strengthId} type="range" min="10" max="1000" step="10" value={settings.strength}
          aria-valuetext={`${settings.strength} meters per dab at the brush center`}
          onChange={(event) => onChange({ ...settings, strength: Number(event.target.value) })} />
      </div>
    </div>
  );
}
