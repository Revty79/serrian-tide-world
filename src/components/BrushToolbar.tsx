'use client';

import { useId } from 'react';
import type { BrushSettings, BrushTool } from '../terrain/brush.ts';
import styles from './BrushToolbar.module.css';

export interface BrushControls {
  tool: BrushTool;
  radius: number;
  strength: number;
  intensity: number;
  targetElevation: string;
}

/** UI drafts stay separate from validated numerical brush settings. */
export function brushFromControls(controls: BrushControls): BrushSettings | undefined {
  const { tool, radius, strength, intensity } = controls;
  if (tool === 'raise' || tool === 'lower') return { tool, radius, strength };
  if (tool === 'smooth') return { tool, radius, intensity };
  const targetElevation = Number(controls.targetElevation);
  if (controls.targetElevation.trim() === '' || !Number.isFinite(targetElevation)
    || !Number.isFinite(Math.fround(targetElevation))) return undefined;
  return { tool, radius, intensity, targetElevation };
}

interface BrushToolbarProps {
  settings: BrushControls;
  mapSpan: number;
  onChange: (settings: BrushControls) => void;
  onReset: () => void;
  hideToolPicker?: boolean;
}

export function BrushToolbar({ settings, mapSpan, onChange, onReset, hideToolPicker = false }: BrushToolbarProps) {
  const radiusId = useId();
  const strengthId = useId();
  const targetId = useId();
  const blending = settings.tool === 'smooth' || settings.tool === 'flatten';
  const invalidTarget = settings.tool === 'flatten' && !brushFromControls(settings);
  const radiusPercent = Math.round(settings.radius / mapSpan * 1_000) / 10;
  return (
    <div className={styles.toolbar} aria-label="Terrain brush controls">
      {!hideToolPicker && <div className={styles.tools} role="group" aria-label="Terrain tool">
        {(['raise', 'lower', 'smooth', 'flatten'] as const).map((tool) => (
          <button key={tool} type="button" aria-pressed={settings.tool === tool}
            onClick={() => onChange({ ...settings, tool })}>
            {tool.charAt(0).toUpperCase() + tool.slice(1)}
          </button>
        ))}
      </div>}
      <div className={styles.control}>
        <label htmlFor={radiusId}>Radius <output htmlFor={radiusId}>{radiusPercent}% of map</output></label>
        <input id={radiusId} type="range" min="0.5" max="20" step="0.5" value={radiusPercent}
          aria-valuetext={`${radiusPercent}% of the map's shorter side`}
          onChange={(event) => onChange({ ...settings, radius: Number(event.target.value) / 100 * mapSpan })} />
      </div>
      <div className={styles.control}>
        <label htmlFor={strengthId}>{blending ? 'Intensity' : 'Strength'}
          <output htmlFor={strengthId}>{blending ? `${Math.round(settings.intensity * 100)}% / dab` : `${settings.strength} m / dab`}</output>
        </label>
        {blending ? <input id={strengthId} type="range" min="1" max="100" step="1" value={Math.round(settings.intensity * 100)}
          aria-valuetext={`${Math.round(settings.intensity * 100)}% toward ${settings.tool === 'smooth' ? 'the local average' : 'the target elevation'} per dab at the brush center`}
          onChange={(event) => onChange({ ...settings, intensity: Number(event.target.value) / 100 })} />
          : <input id={strengthId} type="range" min="10" max="1000" step="10" value={settings.strength}
            aria-valuetext={`${settings.strength} meters per dab at the brush center`}
            onChange={(event) => onChange({ ...settings, strength: Number(event.target.value) })} />}
      </div>
      {settings.tool === 'flatten' && <div className={`${styles.control} ${styles.target}`}>
        <label htmlFor={targetId}>Target elevation (m)</label>
        <input id={targetId} type="number" step="any" value={settings.targetElevation} aria-invalid={!!invalidTarget}
          aria-describedby={invalidTarget ? `${targetId}-error` : undefined}
          onChange={(event) => onChange({ ...settings, targetElevation: event.target.value })} />
        {invalidTarget && <p id={`${targetId}-error`} role="alert">Enter a finite elevation to enable Flatten.</p>}
      </div>}
      <button className={styles.reset} type="button" onClick={onReset}>Reset Terrain</button>
    </div>
  );
}
