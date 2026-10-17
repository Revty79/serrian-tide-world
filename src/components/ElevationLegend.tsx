import { elevationToColor } from '../rendering/elevation-colors.ts';
import styles from './ElevationLegend.module.css';

export function ElevationLegend({ seaLevel }: { seaLevel: number }) {
  const color = (relative: number) => `rgb(${elevationToColor(seaLevel + relative, seaLevel).join(', ')})`;
  return (
    <div className={styles.legend} aria-label="Elevation color legend">
      <div className={styles.band}>
        <span>Water ≤ {seaLevel.toLocaleString()} m</span>
        <i aria-hidden="true" style={{ background: `linear-gradient(to right, ${color(-1000)}, ${color(0)})` }} />
        <span className={styles.ticks}><span>{(seaLevel - 1000).toLocaleString()} m</span><span>{seaLevel.toLocaleString()} m</span></span>
      </div>
      <div className={styles.band}>
        <span>Land &gt; {seaLevel.toLocaleString()} m</span>
        <i aria-hidden="true" style={{ background: `linear-gradient(to right, ${color(0.001)}, ${color(2000)} 40%, ${color(5000)})` }} />
        <span className={styles.ticks}><span>{seaLevel.toLocaleString()}+</span><span>{(seaLevel + 2000).toLocaleString()} m</span><span>{(seaLevel + 5000).toLocaleString()}+ m</span></span>
      </div>
    </div>
  );
}
