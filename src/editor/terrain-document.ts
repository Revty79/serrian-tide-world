import type { Terrain } from '../terrain/model.ts';
import { TerrainHistory } from './terrain-history.ts';

/** Host-owned session. Camera and browser persistence are deliberately separate. */
export class TerrainDocument {
  readonly history: TerrainHistory;
  name: string;
  private checkpoint = 0;
  private checkpointName: string;
  hasSaved: boolean;
  readonly terrain: Terrain;
  constructor(terrain: Terrain, name = 'Untitled world', saved = false) {
    this.terrain = terrain;
    this.history = new TerrainHistory(terrain);
    this.name = name; this.checkpointName = name; this.hasSaved = saved;
  }
  get dirty() { return this.history.stateId !== this.checkpoint || this.name !== this.checkpointName; }
  markSaved() { this.checkpoint = this.history.stateId; this.checkpointName = this.name; this.hasSaved = true; }
}
