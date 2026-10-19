// Saved geography made with real B2B2 Raise strokes, outside the active editor.
// The same serialized v4 record is opened through Atlas in every before/after context.
import { CylinderPreviewSession, createCylinderPreviewTerrain } from '../../src/editor/cylinder-preview-session.ts';
import { initialCylinderView } from '../../src/rendering/cylindrical-view.ts';
import { encodeCylindricalHeightmap, type SavedCylindricalHeightmap } from '../../src/persistence/cylindrical-format.ts';
import { LocalMapStore } from '../../src/persistence/local-map-store.ts';

export type VisualFixture = { record: Omit<SavedCylindricalHeightmap, 'elevations'> & { elevations: number[] }; sculpture: object; payloadSha256: string };
const hash = async (b: ArrayBuffer) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', b))].map(v => v.toString(16).padStart(2, '0')).join('');
export async function sculpted(n: number): Promise<VisualFixture> {
  const session = new CylinderPreviewSession(createCylinderPreviewTerrain(n));
  for (const _ of session.cache.prepare()) void _;
  const t = session.terrain, view = initialCylinderView('map');
  const strokes = [
    { patchId: 'side', u: -.16, v: 800000, endU: .16, endV: 880000, strength: 1800 },
    { patchId: 'side', u: .58, v: 620000, endU: .68, endV: 640000, strength: 2300 },
    { patchId: 'side', u: 0, v: 20000, endU: 0, endV: 50000, strength: 3000 },
    { patchId: 'side', u: 0, v: 1580000, endU: 0, endV: 1550000, strength: 3000 },
    { patchId: 'side', u: Math.PI - .03, v: 720000, endU: Math.PI + .05, endV: 810000, strength: 3200 },
    { patchId: 'cap-start', u: 0, v: 0, endU: .4, endV: 90000, strength: 2200 },
    { patchId: 'cap-end', u: 0, v: 0, endU: .4, endV: 90000, strength: 2500 },
    { patchId: 'cap-start', u: 1.3, v: 600000, endU: 1.5, endV: 640000, strength: 2800 },
    { patchId: 'cap-end', u: 2, v: 600000, endU: 2.2, endV: 640000, strength: 2800 },
  ] as const;
  for (const stroke of strokes) {
    const pos = (u: number, v: number) => ({ ...t.metadata.identity, patchId: stroke.patchId, u, v });
    if (!session.begin(pos(stroke.u, stroke.v), { version: 1, tool: 'raise', radiusMeters: 140000, strengthMeters: stroke.strength }, view)) throw Error('Fixture stroke rejected');
    session.move(pos(stroke.endU, stroke.endV)); session.release();
    let calls = 0; while (session.painting) { if (++calls > 100000) throw Error('Fixture work guard'); session.pump(10); }
    if (session.statistics.failures) throw Error(session.message);
  }
  const record = await encodeCylindricalHeightmap(t, `Sculpted cylinder N${n}`), sculpture = { strokes, statistics: session.statistics, history: session.history.statistics, maxElevation: Math.max(...t.copyElevations()), minElevation: Math.min(...t.copyElevations()) };
  const result = { record: { ...record, elevations: [...new Uint8Array(record.elevations)] }, sculpture, payloadSha256: await hash(record.elevations) };
  session.dispose(); return result;
}
export async function install(fixture: VisualFixture) {
  const record = { ...fixture.record, elevations: Uint8Array.from(fixture.record.elevations).buffer };
  if (await hash(record.elevations) !== fixture.payloadSha256) throw Error('Fixture payload mismatch');
  await new LocalMapStore().save(record); return record.id;
}
