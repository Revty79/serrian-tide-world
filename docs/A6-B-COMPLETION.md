# Pass A6-B — Spherical terrain sculpting and numerical history

Date: October 17, 2026. Repository: `Revty79/serrian-tide-world`, branch `main`.

Approved A6-A baseline: `3d210140f53e1e1d4f2ef72edf92debcfe0d2efa`. The owner supplied Ember's independent source/numerical/architecture approval with no blocking corrections and explicitly authorized A6-B and direct-to-main delivery. A6-B's independent review and acceptance remain pending.

## Delivered behavior

A spherical Raise/Lower stroke accepts identity-bearing physical directions or valid face positions, uses radius in meters and strength in meters per dab, crosses multiple faces/edges/corners on great-circle segments and finishes as one bit-exact Undo/Redo operation. All influence uses reference-sphere geodesic distance. Shared vertices remain one canonical authority. No spherical UI, rotation/projection controls, Smooth/Flatten, browser save format, backend or original-site change is included.

The [sculpting API specification](SPHERICAL-SCULPTING.md) documents lifecycle, mathematical derivation, numeric thresholds, candidate ownership, preparation/validation, history limits and future boundaries. [Numerical/performance evidence](evidence/a6-b-sculpting-receipt.json) is reproducible with `node scripts/measure-spherical-brush.mjs [output.json]`.

## Brush, path and ownership

`startSphericalBrushStroke(terrain, physicalPoint, {tool, radiusMeters, strengthMeters}, history?)` creates one initial dab, snapshots settings, then places dabs every radius/4 meters along shortest great-circle arcs. Residual distance carries across events, face cuts and corners. Duplicate/stationary input adds no dabs; elapsed time has no effect. `end()` preserves completed work and is idempotent. Passing `SphericalHistory` automatically brackets the whole stroke; standalone numerical use may omit history.

The shared A5 smooth radial falloff `(1−t)²(1+2t)` and finite Float32 saturation were extracted with identical expression/order. Planar/periodic brush behavior is covered by unchanged tests. Spherical strength/radius are physical units; no screen pixels, flat face-circle influence, Earth radius/orientation, map-unit conversion or per-face elevation copies are used.

The spherical-cap search bounds each axis component analytically, bounds each face's positive gnomonic ratios, projects those conservative intervals into lattice rectangles and pads outward for roundoff. Each candidate still receives an exact geodesic test. Only a node's canonical owner emits it; no per-dab global deduplication Set or full-surface scan is needed for a small cap. Very large caps legitimately cover many/all samples. The independent oracle checks 29 centers × eight cap radii at N=16 against all actual nodes, including zero/near-zero, all-cut special cases, hemispheres and π.

Each dab validates every affected elevation and stages only changed canonical indices/values in 4,096-element typed chunks before its first write. A corrupt read aborts that dab without partial writes. A later failure ends the stroke while retaining previously completed dabs as one history entry. Writes exclusively call the provider's canonical write API; terrain metadata, ownership, radius and identities remain unchanged.

Near-identical segments within 64 epsilon retain the previous anchor without adding dabs. Within 1e−8 radians of antipodal, a segment is rejected before modification and the caller must supply an intermediate physical point; no path/axis is invented. Invalid endpoints/settings/identities also reject before modification. Minimum angular radius is 1e−12 radians; maximum is π. A segment exceeding 65,536 dabs is refused before processing. These precision/work policies are documented API limits, not new UI controls.

## Exact spherical history

`SphericalHistory` has the same default retained budget as A3: **16 MiB and 100 entries**, total across Undo+Redo for one sphere. It stores the smaller of sparse canonical indices/before/after words (`12×changed+64`) and a contiguous before/after span (`8×span+64`). Oldest Undo entries are evicted to satisfy both limits. A new actual tracked edit clears Redo; no-op commits preserve it. Signed zero and all elevation bits restore exactly through canonical writes, into the same private authority.

History uses private read-only snapshots, never a mutable authority view. One pending snapshot is 4S bytes; commit adds another 4S-byte copy and an entry at most 8S+64, where S is unique sample count. Full-surface operations must fit: constructor budget is at least twice the elevation payload plus 64 bytes. At maximum supported N=512 this full-operation entry is **12,582,992 bytes**, so the default retains one complete operation. Entry bookkeeping allowance is approximate; snapshots, preparation and JavaScript/GC overhead are additional to retained budget. The specification gives the conservative roughly 46 MiB live typed-payload bound at N=512 with a full prior history. No six duplicate authoritative arrays are created.

The spherical provider now exposes an actual-write revision counter; same-bit writes do not increment it and +0/−0 transitions do. Before a new history operation or Undo/Redo, an unexpected revision clears stale history and throws while leaving current terrain intact. Active-history conflicts and concurrent engine strokes on the same provider instance are refused. End a stroke before Undo/Redo or clear, and do not interleave unrelated writes during a pending operation. This session history is separate from future living historical terrain/timelines.

## Numerical receipts and measured performance

The deterministic Lower fixture uses N=16, sphere radius 1,000,000 m, brush radius 300,000 m, strength 43.7 m/dab and initial signed zero at every fifth canonical index. It follows the receipt's six physical positions across several faces and corners:

- 73 dabs; 8,408 candidate checks; 2,430 actual writes; one history entry.
- Initial SHA-256: `512bf56581047acd0243eee73551080a234f649679c051d78b670d367e532df6`.
- Edited SHA-256: `fa447005bf97280c34474f34d882eb876c3baed1e85ea41d65e4f9ce12fc8f5b`.
- Undo reproduces the initial bytes and Redo reproduces the edited bytes exactly, including signed zero.

The separate event-frequency receipt covers all 12 adjacent-face paths, each split into 31 dense subsegments plus duplicate events versus one sparse endpoint: **zero differing Float32 values, largest measured difference 0 m**. Unit tests assert the full bit arrays equal. General arbitrary physical paths retain normal double/Float32 rounding limits; changing the physical polyline changes the route.

Representative Raise benchmark: sphere radius 1,000,000 m, brush radius 80,000 m, strength 200 m/dab, same six-point multi-face/corner path, **272 dabs** per trial. One warmup precedes three trials per N on local Node v24.18.0 / Windows x64. Timings include the initial dab, all movement and history commit, excluding digest computation. The final receipt was collected separately from the browser/test processes.

| N | Unique authority | Total candidate checks | Unique changed nodes | Median sculpt + commit | Peak prepared payload | Pending snapshot | Retained history |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 128 | 98,306 / 393,224 bytes | 93,173 | 6,666 | 93.71 ms | 32,768 bytes | 393,224 bytes | 80,056 bytes |
| 256 | 393,218 / 1,572,872 bytes | 297,750 | 26,443 | 279.47 ms | 32,768 bytes | 1,572,872 bytes | 317,380 bytes |

Full scans for those 272 dabs would perform 26,739,232 and 106,955,296 sample checks respectively; this is a count comparison, not a timed benchmark of a second implementation. The actual search averages about 343 and 1,095 candidates per dab. Across dabs, intentional overlaps revisit physical samples; within each dab they are unique. The receipt includes all raw timings, affected/written visit counts and exact edited digests, with one history entry and successful exact Undo/Redo in every run.

The last recorded runs measured Undo/Redo at about 0.26/0.26 ms for N=128 and 1.16/1.09 ms for N=256. Timings are observations, not guarantees or mobile/globe-rendering evidence. Peak prepared bytes come from allocated typed-array byteLengths; retained bytes include the 64-byte entry allowance. These are payload accounts, not process RSS/heap peaks. The future UI/rendering and spherical Smooth/Flatten need their own budgets and benchmarks.

## Verification and preservation

- `npm.cmd test`: **129 passed**, no failed/skipped numerical cases; 17 new tests supplement all 112 previous tests.
- `npm.cmd run test:browser`: **115 passed, 1 retained intentional desktop native-touch skip**, 116 existing desktop/mobile cases; mobile native touch, pen/pinch, all tools, navigation, fullscreen, history and Save/Open continue passing.
- `npm.cmd run build`: TypeScript and production build passed.
- Numerical/benchmark receipt script: passed; repeated benchmark digests and exact Undo/Redo verified.
- `git diff --check`: passed; prior completion reports/evidence, UI/interaction/rendering source, planar history, v1/v2 codecs, IndexedDB adapter/schema and package files remain unchanged.

Coverage includes both tools at all six face centers; all twelve edge footprints; all eight corner footprints; arbitrary/near poles; bit-identical results from equivalent face addresses; large/full caps; one write per canonical sample per dab; geodesic/spacing/residual behavior; exact multi-face history/signed zero; partial failure; no-hit/saturation no-ops; invalid settings/identities/nonfinite reads; separate terrain/history ownership; budget/eviction; and untracked-write protection. Small-cap checks at N=128/256 inspect less than one percent of samples in the dedicated fixture. Brute-force elevation comparisons use the documented Float32 tolerance; equivalent-address and event-frequency fixtures additionally assert exact bits.

The A5 workspace is preserved. Only `brush.ts`'s two existing numerical expressions move to the shared helper; no UI, pointer behavior, camera, renderer, document state, history or saved-map workflow is replaced. No real saved planar/periodic record is reinterpreted, migrated, deleted or rewritten by the spherical layer. There is no spherical browser persistence or shape option. Prior screenshots are historical, and no misleading spherical UI screenshot is supplied.

## Exact file inventory

Modified:

```text
README.md
docs/ARCHITECTURE.md
docs/PHASE-1-HEIGHTMAP-ROADMAP.md
docs/SPHERICAL-HEIGHTMAP-FOUNDATION.md
docs/WORLD-SURFACE-ARCHITECTURE.md
src/terrain/brush.ts
src/terrain/spherical.ts
```

Added:

```text
docs/A6-B-COMPLETION.md
docs/SPHERICAL-SCULPTING.md
docs/evidence/a6-b-sculpting-receipt.json
scripts/measure-spherical-brush.mjs
src/editor/spherical-history.test.ts
src/editor/spherical-history.ts
src/surfaces/great-circle.ts
src/terrain/brush-math.ts
src/terrain/spherical-brush.test.ts
src/terrain/spherical-brush.ts
src/terrain/spherical-cap.ts
```

No deletions or new dependencies. The exact commit SHA is reported after verified direct-to-main push; this report is part of that commit.

## Next checkpoints and acceptance boundary

The master roadmap preserves all owner-approved geometry/Atlas/Worlds goals and now identifies the remaining spherical checkpoints: reviewed Smooth/Flatten, interactive spherical views/rotation/projection integration, then separately approved spherical Save/Open/recovery. Their exact briefs/letter labels require authorization. The numerical provider and tools remain modular for eventual authenticated Next.js integration; no original-site or shared database change or deployment occurred.

A6-B is technically verified and ready for independent review/owner acceptance. It is not an interactive globe editor or complete spherical tool suite. **Stop after A6-B. Do not begin A6-C without authorization.**
