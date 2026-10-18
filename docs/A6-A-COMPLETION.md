# Pass A6-A — Spherical heightmap foundation and cube-face continuity

Date: October 17, 2026. Repository: `Revty79/serrian-tide-world`, branch `main`.

Approved A5 baseline: `3dadcccf67fe90e7b17aa845b44838f82248a829`. The owner supplied Ember's A5 source/visual approval and authorized only the A6-A numerical foundation, roadmap update and direct-to-main delivery. Independent review/acceptance of A6-A is pending.

## Implemented result

`createSphericalTerrain` creates an actual numerical spherical heightmap with one private Float32 authority, six equiangular cube-sphere face views, shared canonical edge/corner nodes, a required radius in meters, initial elevations −100 m and sea level zero. World/surface/terrain identity and fixed face IDs are explicit. There is no Earth radius/orientation default. The cube is a chart construction for a round sphere, distinct from a future physical cube-shaped World.

The provider resolves addresses/aliases, reads/writes exact canonical values, enumerates unique nodes and reciprocal neighbors, traverses cardinal graph directions, converts chart positions/directions/reference positions, locates containing faces, measures spherical geodesics and changes tangent basis across seams. No sphere choice, renderer, projection/rotation UI, complete brush, history adapter, browser save format or backend was added.

The [provider specification](SPHERICAL-HEIGHTMAP-FOUNDATION.md) contains the public API, all six face bases, all 24 directed seam connections, exact ownership/index layout, mathematical formulas, corner rules, measured memory and future storage preparation.

## Ownership, topology and physical geometry

For N cells along an edge, each chart has `(N+1)²` logical vertex addresses. One buffer stores `6(N−1)²` face-interior values, `12(N−1)` edge-interior values and eight corners: **6N²+2 unique samples**. Integer cube-surface coordinates resolve equivalent addresses without floating-vector equality. Canonical keys include World/surface/terrain IDs, representation version, resolution and index; wrong identities/resolutions or invalid indices are rejected before writes. Snapshots are independent copies. Finite Float32 validation includes signed-zero preservation.

Face mapping is `n = normalize(Normal + tan(a)U + tan(b)V)`, with fixed right-handed bases and angular coordinates in radians. Reference position is `R n`. Inverse mapping uses dominant face normals and atan2, with a documented 64-epsilon roundoff tolerance at cuts. All twelve physical edges have reciprocal face/orientation mappings; eight corners have three equivalent chart views of the same node. Geographic poles are ordinary directions, not special grid rows.

Reference geodesic distance is `R atan2(|n1 cross n2|, n1 dot n2)`. Robust direction normalization handles very large/subnormal vectors; nonfinite/zero inputs, out-of-domain chart coordinates, foreign identities and overflowing radii fail. Analytical chart Jacobians and the destination Gram matrix convert tangent components at a shared physical point; no constant planar rotation is substituted for the curved basis.

The edge-neighbor graph has degree four at regular nodes and three at corners. Cell-touching neighborhoods have degree eight/six respectively. Neighbor sets union incident charts and deduplicate keys. All supported cardinal steps return valid targets and an explicit reverse direction; corner edge choices are deliberate. A seam result describes the change of basis at the boundary point, not geodesic transport to the next sample. Graph adjacency, cell neighborhoods and pointwise basis conversion do not claim a completed spherical Smooth stencil, geodesic stroke integrator or finite-path parallel transport.

Unique-key iteration, physical directions, face containment, neighborhoods and the metric form the future footprint boundary. Later tools can test reference-surface distances without projected-pixel distortion. Accelerated footprint enumeration and actual brush influence/path/weighting remain separately reviewable work.

## Exact deterministic evidence

[Numerical receipt](evidence/a6-a-numerical-receipt.json), reproducible with:

```powershell
node --expose-gc scripts/measure-spherical.mjs
```

An optional output path saves the JSON. This script imports only the pure numerical modules, never App, IndexedDB or codecs.

For N=8 and explicitly chosen radius 1,250,000 m:

| Result | Observed value |
| --- | --- |
| Unique samples | 386 |
| Face interiors / edge interiors / corners | 294 / 84 / 8 |
| Directed / undirected face seams | 24 / 12 |
| Connected graph edges / quadrilateral cells | 768 / 384 |
| Incident cells per graph edge | Exactly 2, with no open boundary |
| Euler characteristic V−E+F | 2 |
| Shared boundary/corner values modified | 92; exact values visible through every incident face |
| Largest measured unit-length error in this fixture | 0 at reported double precision |
| Largest reference-radius error | 2.3283064365386963e−10 m |
| Elevation digest after coordinate queries | Unchanged |

The deterministic modified-elevation SHA-256 (explicit little-endian Float32 bytes) is:

```text
48e36ee86be99dbcd01dbe31ba2376324a64a81a41290e749778e4a7640b490c
```

The fixture writes `Float32(123.25 + canonicalIndex/8)` to the 92 shared nodes and leaves all others −100. This demonstrates real shared elevation access rather than copying a face boundary after an edit. Unit tests additionally exercise exact signed-zero writes through a corner's three aliases. At the fixture radius, quarter/half-circumference distances are `Rπ/2` and `Rπ`; tests compare to those analytical values within 1e−9 m, plus near-zero and near-antipodal cases.

Tests exhaust all chart addresses at N=2,3,8,16, including odd resolution. At N=8, every supported cardinal step over all six charts is checked for graph membership and reciprocal canonical identity; this includes **216 outgoing seam steps**. All 24 directed seam mappings are tested at five along-edge angles, including both endpoints. Tangent vectors agree in Cartesian physical space, reverse transforms restore components, and three-chart corner cycles restore the original heading. Independent finite differences check the analytical mapping derivatives. Graph connectivity and two-cell edge incidence supplement local seam tests.

## Memory and initial resolution

The default is N=128: 98,306 samples, **393,224 elevation bytes** (about 384 KiB). N is restricted to integers 2…512 for this numerical checkpoint. There are no persistent six-face elevation copies, per-node objects, neighbor tables or render buffers.

Actual live ArrayBuffer allocation deltas measured under Node v24.18.0, Windows x64, match buffer byteLength exactly:

| N | Samples | Elevation bytes / measured delta |
| --- | --- | --- |
| 16 | 1,538 | 6,152 |
| 64 | 24,578 | 98,312 |
| 128 | 98,306 | 393,224 |
| 256 | 393,218 | 1,572,872 |
| 512 | 1,572,866 | 6,291,464 |

GC separates measurement cases. The receipt also records one-run construction timings, not a performance guarantee. Object/closure overhead, explicit snapshots, transient enumeration objects and future UI/history/rendering/storage buffers are excluded. Browser/mobile spherical editing performance has not been measured because that experience does not exist in A6-A. Later checkpoints need their own aggregate budgets and benchmarks.

## Preservation and future storage

App, all existing UI/interaction/rendering/brush/history source, planar model, v1/v2 codecs, IndexedDB adapter/schema, package files and prior reports/screenshots remain unchanged from the approved A5 baseline. The new provider is not imported into the application bundle; the production build retains the same 44-module UI bundle. Existing browser tests use their existing planar/periodic workflows and pass without altered assertions. The frozen A3 v1 checksum fixture and v2 identity/bit-preservation tests continue passing. No real browser save is read, rewritten, migrated or deleted by the spherical code or numerical receipt script.

The new in-memory representation version is not authorization for another save envelope. Future persistence preparation in the provider specification covers parent World/surface/terrain identity, physical sphere radius/frame, representation/version/N/face IDs, unique Float32 ownership/order/endianness, integrity/resource checks, explicit historical revision/branch compatibility, and tested upgrade/backup/rollback policy while preserving v1/v2 readers/records. No schema, codec, backend or database migration is implemented.

The provider remains TypeScript without React/DOM/browser globals. The future authenticated Next.js host owns real World associations, server-side permissions, storage and concurrency. Fixed authority remains independent of globe rotation, movable projection cuts and local editing views. No original Serrian Tide website or shared database was changed, and no deployment occurred.

## Roadmap preservation

The [complete master roadmap](PHASE-1-HEIGHTMAP-ROADMAP.md) and [world-surface architecture](WORLD-SURFACE-ARCHITECTURE.md) now explicitly preserve every supplied future requirement:

- Sphere, cylinder, independently editable hollow interiors/exteriors, true cube, pyramid, tetrahedral/other polyhedral, torus/ring, flat square/rectangle/circle/triangle and custom connected/multi-face worlds.
- Independent interior/exterior terrain where supported; shared corner/seam topology; surface-aware brushes without projection-induced geographic distortion; continuous working-surface navigation, globe rotation and movable map seams; shape selection before generation.
- Complete Azgaar-style authoring, living historical terrain/alternate timelines, Worlds categories for civilizations/races/populations/history, editable illustrated 2D map generation with terrain stamps, military topographic styles, linked world/region/city/building/dungeon maps, and eventual existing-site integration.

These remain future requirements with no speculative runtime implementation. Exact supported configurations, ring/pyramid/polyhedral parameters, historical revision semantics and later checkpoint boundaries still need approval. A6-A does not authorize A6-B or imply every future shape must be completed in A7.

## Validation

- `npm.cmd test`: **112 passed**, zero skipped/failed; includes all 93 A0–A5 tests and 19 new spherical cases.
- `npm.cmd run test:browser`: **115 passed, 1 retained intentional desktop touch skip**, across 116 existing desktop/mobile cases. Native mobile touch, pen, pinch, all four tools, Fill/Fit/fullscreen, seam recentering, history and v1/v2 Save/Open remain covered.
- `npm.cmd run build`: TypeScript checking and production build passed.
- `node --expose-gc scripts/measure-spherical.mjs docs/evidence/a6-a-numerical-receipt.json`: passed, with actual allocation and deterministic topology/write evidence above.
- `git diff --check`: passed. Baseline source/codec/history/evidence preservation verified by path comparison.

These are numerical foundation and existing-editor regression proofs. They are not a spherical visual-editing demo or owner acceptance. No misleading globe screenshot or unsupported UI choice is added.

## Exact affected files

Modified:

```text
README.md
docs/ARCHITECTURE.md
docs/PHASE-1-HEIGHTMAP-ROADMAP.md
docs/WORLD-SURFACE-ARCHITECTURE.md
```

Added:

```text
docs/A6-A-COMPLETION.md
docs/SPHERICAL-HEIGHTMAP-FOUNDATION.md
docs/evidence/a6-a-numerical-receipt.json
scripts/measure-spherical.mjs
src/surfaces/cube-sphere.test.ts
src/surfaces/cube-sphere.ts
src/terrain/spherical.test.ts
src/terrain/spherical.ts
```

No files deleted or dependencies added. The exact delivery commit SHA is reported after direct-to-main push verification; this report is part of that commit.

**Stop after A6-A. Independent review and acceptance are pending. Do not begin A6-B without authorization.**
