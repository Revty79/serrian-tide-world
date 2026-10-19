# Continuous cylindrical sculpting and exact history — A7-B2B2

Current integration: A7-D exposes the accepted numerical engine in the normal Atlas workspace at `/`, with explicit v4 Save/Open, shared document/library controls and exact saved checkpoints. See [current persistence and lifecycle](CYLINDRICAL-PERSISTENCE.md) and [A7-D completion](A7-D-COMPLETION.md). The kernel API and mathematics documented below remain unchanged.

This pure TypeScript numerical layer connects [B1 distances](CYLINDER-GLOBAL-DISTANCE.md), [B2A atomic dabs](CYLINDRICAL-SCULPTING.md) and [B2B1 physical paths](CYLINDER-PHYSICAL-PATHS.md). It has no React, DOM, screen coordinates, storage, authentication or database dependencies. A7-C now uses this unchanged engine in a [session-only development editor](CYLINDRICAL-EDITING.md), with physical/connected views and actual input. The A7-D production entry reuses this original engine through the shared cylinder document/view provider; the diagnostic entry remains session-only.

## Numerical session

```ts
const history = createCylindricalHistory(terrain);
const stroke = beginCylindricalStroke(terrain, history, firstPhysicalPosition,
  {version: 1, tool: 'raise', radiusMeters: 1000, strengthMeters: 50});
stroke.move(nextPhysicalPosition); // ordered, validated and copied
stroke.release();                 // stop accepting input; drain accepted work
while (stroke.status === 'draining') stroke.pump(64);
history.undo();                   // exact initial Float32 words
history.redo();                   // exact final Float32 words
```

The host must schedule pumps cooperatively; the synchronous loop above illustrates the numerical API, not browser scheduling. A pump accepts 1–512 candidate steps, default 64. It performs at most one of: a bounded B2A preparation slice and at most one atomic dab commit; creation of the next dab; completion of the current spacing traversal; or one bounded physical-path reconstruction. There is no unlimited loop over queued segments or dabs inside a pump.

Settings are validated and frozen by B2A before editing. Options, nested dab limits and initial direction are copied/validated. The one initial dab is prepared once. Stationary time and repeated identical positions add no dabs. Releasing does not force a new endpoint dab. The same meter residual runs through every accepted segment and all side/disk pieces. Every dab still uses B2A's canonical candidates, interval-certified influence, unchanged pre-dab source epoch and exact original four-tool arithmetic. No screen interpolation, through-solid chord, duplicate rim authority or sample resampling is used.

Status is `drawing`, `draining`, `complete`, `cancelled`, `failed` or `disposed`. Diagnostics expose accepted/processed/discarded positions, path work, committed dabs, writes, query/candidate work, spacing error/residual and the last committed physical center. Failed-query allowances are conservative charged limits, separately labeled from actual successful box counts. An incompletely traversed input segment can have committed dabs; its endpoint counts as discarded on termination.

## Trajectory and ambiguous routes

Each accepted position is identity-checked, normalized and queued in order; no accepted intermediate point is coalesced away. Within each transition B2B1 selects a certified feasible approximate shortest path. Its prior incoming physical tangent/sheet becomes the next route preference. An optional initial direction controls the first tie. Rims use real one-sided fold geometry; disk centers use physical chords, not polar angle interpolation.

The default `local` transition requires reconstructed upper length at most `min(4 × brushRadius, πR/4)`. Larger transitions fail explicitly. A caller must supply physical intermediate points that describe its trajectory, or deliberately use `move(point, 'shortest-surface')` to request the bounded shortest-route policy. This explicit intent permits tested cap shortcuts; it does not lift numerical/work/history limits. A large `localTransitionMeters` override is also an explicit caller policy. Invalid intents or foreign positions fail the gesture safely.

B2B1 does not certify uniqueness or enumerate every minimizing geodesic. At exact/near ties, previous direction selects among available certified alternatives under the existing shortest-excess limit; it does not provide global continuity through arbitrary cut loci. Two endpoints alone cannot recover a creator's intended winding or arbitrary route. Event subdivision equivalence applies to the **same physical trajectory**, not to inserting points on a different geodesic. Independent fixtures cover tied and nearly tied cap choices, physical intermediate points, angular wrapping, both rims in both directions and center fans.

## Corrected spacing and bounded uncertainty

The mandatory B2B1 correction replaces the unqualified floor step count. Let `E` be incoming residual uncertainty plus

```text
64 ε × max(spacing, |from|, |to|, span, MIN_VALUE) + 64 MIN_VALUE
```

for a nonzero traversal. Zero traversal adds no new roundoff. If the nearest positive integer multiple differs from `residual + span` by at most E, that adjacent endpoint step is offered once; otherwise use the floor count. Spacing must exceed 4E, so distinct neighboring multiples cannot both qualify. Count budgets are checked before iteration. The final step snaps to the physical endpoint only within E, and must strictly advance beyond the preceding point. There is never a second beyond-end step. Near-zero/out-of-range residual roundoff is normalized within E; residual remains in `[0,spacing)`. A zero traversal preserves its residual and emits nothing. Cancellation returns only the traversed prefix.

The stroke carries this bound plus every path's declared length error into the next sampler. It does not reset uncertainty at event boundaries. `maxSpacingErrorMeters` defaults to spacing/64 and must be positive and below spacing/4. A transition that would exceed it fails before applying its dabs. Path length/work limits and accepted-point limits also bound accumulation. The result is nominal Float64 spacing with explicit accumulated uncertainty, not unlimited exact real-number spacing.

Targeted tests cover 0.3/0.1 and other decimal multiples; near multiples inside/outside the allowance; partial ranges and connected residuals; zero movement with a nearly full residual; cancellation and point limits; a large `from=10^12` cumulative coordinate; and 1,000 partial ranges producing 3,000 distinct points. Whole-stroke tests also prove no missing axial decimal endpoint.

## Identity-bound atomic handoff

B2A adds only `preparedChanges(expectedTerrain)`, a bounded read-only generator available on a ready job. It requires the exact authority object and original revision, checks state/revision during iteration and on completion, and yields frozen `{index,before,after}` values. It never exposes mutable prepared arrays or writes terrain. Cancellation, foreign identity, premature access or a stale source rejects it. Original preparation/commit arithmetic and numerical budgets are unchanged.

History gathers this bounded patch, reserves all sample/chunk/history capacity and stages original-before/latest-after words **before** calling the original atomic B2A commit. New Map slots and typed chunks are allocated before authority mutation. On preflight/commit failure staged history changes are rolled back; the pending dab makes no partial authority writes. Only after successful commit are Redo records discarded and old completed operations evicted as needed. Capacity is reserved so finishing a stroke needs no terrain-sized allocation.

Each canonical sample has one private slot per stroke, retaining its first-before and final-after Float32 words. Float32 storage and Uint32 aliases preserve signed zero exactly. Repeated dabs update only final-after. A completed or interrupted changed prefix is one history operation. Net no-op operations add none; dabs that make no changes preserve Redo. A first actual edit branches Redo immediately, even if a later edit were to restore the original net values. Eviction/branching is intentional and cannot later be undone by canceling the new gesture.

Undo/Redo validates all affected current words against the recorded after/before state, constructs a sorted sparse patch and applies it atomically at the captured current revision. Unrelated external edits survive; an overlapping external edit causes an explicit conflict without partially restoring terrain, moving the cursor or silently dropping history. Only touched final changes are restored. Undo/Redo/clear are unavailable while a stroke operation is active. History requires the exact authority object; constructing a replacement requires disposing/ending the prior session first.

## Release, failure and cancellation

| Event | Defined behavior |
| --- | --- |
| Release | Stop accepting input, drain accepted positions in order, finish one operation; no forced endpoint dab |
| Cancel/dispose during preparation | Discard uncommitted job, remaining route and queued positions; retain committed prefix as one undoable operation |
| Cancel before first commit | No terrain mutation or history entry |
| New session while active | Reject; explicit prior disposal leaves its committed prefix in the shared history |
| External authority revision | Next move/release/pump fails before further writes, even for an unrelated edit; recorded prefix remains conflict-safe |
| Invalid/foreign position or intent | Fail explicitly, discard pending work, retain committed prefix |
| Queue/count, path/precision, spacing, dab/aggregate or history exhaustion | Fail with diagnostic; no silent dropping/coarsening, no partial pending dab; retained prefix remains reversible |
| Later calls after termination | No background work; pumps do nothing, input is rejected, cancel/dispose are safe |

The A7-C development adapter translates capture loss, navigation, gesture changes and workspace interruption to this lifecycle. It uses the same history transaction, adds precommit visibility/derived-color staging and retains a reversible prefix. See its separate browser evidence; the numerical kernel remains unchanged.

## Fixed resources and non-preemptible work

| Resource | Hard maximum (caller may lower) |
| --- | --- |
| Pending physical points | 256 |
| Accepted points including initial | 65,536 |
| Dabs in one stroke | 16,384 |
| Global dab distance calls across stroke | 262,144 |
| Dab distance boxes across stroke, charging failed allowances | 1,048,576 |
| Dab candidates across stroke | 1,048,576 (B2A may report the first over-budget rejected candidate) |
| Path boxes across stroke | 262,144; per path at most 32,768 |
| Unique history samples in one stroke | 65,536 |
| Retained completed + active history typed payload | 8 MiB / 32 completed entries |

History uses 1,024-slot chunks: Uint32 indices, Float32 before and Float32 after, **12,288 bytes** each; word aliases share buffers. A stroke needs at most 64 chunks / **786,432 bytes**. It never takes a full-field snapshot per dab. The retained byte budget covers typed payload, not total heap. Bounded Maps, entry/chunk arrays, handoff objects, sort indices and VM overhead are additional. Before post-commit eviction, staging can transiently retain the old budget plus one new operation (at most 8 MiB + 786,432 bytes). Undo/Redo adds at most 524,288 bytes of transient patch payload. B2A's unchanged changed-patch cap is 524,288 bytes; solver/neighbor temporaries and the authority are separate. The numeric history byte budget can be lower than one 12,288-byte chunk, in which case a changed dab fails before mutation.

Successful path construction, individual B1 queries, one Smooth center's at-most-1,024 neighbors, history handoff/reservation/Map work, model patch validation/commit and Undo/Redo are synchronous. `finish` can scan at most 65,536 slots. Count-bounded pumping is not a hard frame-time guarantee. Node timing is not browser/mobile responsiveness, and no increase to B1/B2A numerical budgets was made.

## Reproduce and review

```powershell
python scripts/reference-cylinder-strokes.py
node --expose-gc scripts/measure-cylinder-strokes.mjs
npm.cmd test
npm.cmd run test:browser
npm.cmd run build
```

The Python standard-library reference uses 65-digit Decimal physical trajectories and independently retained distance/smoothing definitions, with Float32 rounding between dabs. Six route cases × four tools × sparse/dense inputs give **48 actual runs**, with center traces, independent elevation comparisons and exact before/final/history words. The fixture's final-word comparison is judged using the recorded B2A/center/Float32 error allowance; it does not falsely require every rounded word to match the ideal. Separate four-tool radial/axial subdivision tests do require bit-identical sparse/dense results.

The measurement receipt separates timed preparation, committing pumps, full strokes, history reservation/atomic commit, finish and exact Undo/Redo. It measures representative and maximum-resolution side/rim/center cases, 2,000 accepted moves, safe stops, 100 retained finished sessions with bounded eviction, and ArrayBuffer collection after clear. Source creation, seeding, proof copies/hashes and forced GC are excluded from timed stroke/dab costs. Measurements are single-run observations, not controlled speedup claims.

Known retained B2A limitation: exact brush-boundary ambiguity can exhaust interval refinement or fall below the Float64 precision floor. A recorded default quarter-radius center traversal triggers this safe stop; the pending dab is untouched and prior dabs remain exactly reversible. This pass does not relax certified membership, blur numerical data or change B2A arithmetic to conceal it. Extreme geometry/path precision and configured budgets can also stop a stroke explicitly. No cylinder UI screenshot or mobile performance claim is made.

See [completion report](A7-B2B2-COMPLETION.md) and [raw measurements](evidence/a7-b2b2-stroke-measurements.json). All earlier saved formats, workspace behavior and historical evidence remain preserved. The [eleven-phase roadmap](PHASE-1-HEIGHTMAP-ROADMAP.md), including Issue #1 and functional linked maps before integration with existing Worlds, remains unchanged. The eventual Next.js host retains authentication, permissions, database and World-record ownership.

**Stop after A7-D for Ember's independent review and owner hands-on acceptance. Do not automatically begin another geometry phase.**
