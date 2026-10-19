import type { CylindricalTerrain } from '../terrain/cylindrical.ts';
import { CylinderPreviewSession } from './cylinder-preview-session.ts';
import { workStep, type PersistenceWork } from '../persistence/cooperative-work.ts';

/** Preparation is disposable until the host atomically replaces its active document. */
export async function prepareCylinderSession(terrain: CylindricalTerrain, name: string, saved: boolean, work: PersistenceWork = {}) {
  const started = performance.now(), editor = new CylinderPreviewSession(terrain, name, saved, true), steps = editor.cache.prepare();
  try {
    let done = false;
    while (!done) { const start = performance.now(); do { done = !!steps.next().done; } while (!done && performance.now() - start < 5); await workStep(work, 'Preparing cylinder display', done ? 1 : 0); }
    return { terrain, editor, preparationMs: performance.now() - started };
  } catch (cause) { steps.return(undefined); editor.dispose(); throw cause; }
}
