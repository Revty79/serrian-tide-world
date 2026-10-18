# A7-A completion — physical cylinder numerical foundation

Approved baseline: `e42bb8b2e1b360cebc18443be863eb705cd54781`, branch `main`. The owner explicitly authorized implementation and direct main publication. Exact implementation SHA and publication metadata are in [the delivery receipt](evidence/a7-a-delivery.json); [the verification receipt](evidence/a7-a-verification.json) lists every implementation file, byte count and SHA-256. This report is a technical delivery for Ember's independent review. Neither Ember approval nor owner hands-on acceptance is claimed.

## Result and design decisions

A7-A adds a genuine closed solid-cylinder exterior: one curved side and two actual circular disks joined at their physical rims. It does not relabel the flat wrapped map. A separate pure provider owns **one private Float32 elevation buffer**, including both rims once and each disk center once. All blank values are −100 m; datum/sea level is 0 m. World/surface/terrain identities and versioned geometry/representation metadata remain separate from viewing state.

The [complete geometry specification](CYLINDRICAL-HEIGHTMAP-FOUNDATION.md) provides physical formulas, orientation tables, canonical indices, ownership/connectivity proof, dimensions/precision/resource validation, tangent-fold derivation, future layouts and editing requirements. Key decisions:

- Use a +Z reference axis, not a gravity/geographic convention. Side u is angular radians and v axial meters. Disk v is radial meters; the end cap reverses its angular orientation so all regular chart bases face outward.
- Use matching angular counts on all three regions. The side owns both rim rings, cap interiors own their interior rings, and each cap owns one center. Integer aliasing provides exact ownership without fuzzy 3D welding or duplicated terrain.
- Use a polar disk lattice with a single center fan. This exposes its real center valence and varying spacing/area; it does not pretend to be a uniform rectangular smoothing stencil.
- At each sharp rim, provide a reciprocal 90-degree fold isometry between **different one-sided tangent planes**. The center's polar tangent is explicitly singular; a Cartesian disk tangent remains available.
- Expose only analytically justified **region-restricted** measurements. Reject general global geodesics explicitly, even for two side addresses, because a cap shortcut can be shorter. Do not force this partial provider into the global `SurfaceMetric`/advance interface with incorrect semantics.
- Keep cylinder out of App/AtlasDocument, New World selection, all views, input/history and save codecs until functional physical editing/views/persistence are reviewed in a later pass.

## Canonical and independent numerical proof

For angular samples A, axial cells Z and radial cells P, the unique sample count is `A(Z+2P−1)+2`. Every rim address aliases its side owner; all angular center addresses alias one cap center. `copyElevations` and `snapshot` detach their Float32 storage and retain source identity/immutable metadata. Writes round with `Math.fround`, reject nonfinite/Float32-overflow input before mutation, detect signed zero, and increment revision only for changed words.

New cylinder tests use explicit Cartesian coordinate/index fixtures, not just mutual function comparisons. Exhaustive small/odd-resolution tests cover every chart address, angular wrap, shared rim in both directions, center alias, unique count and reciprocal neighbor. An independent symbolic welded cell complex builds quads/fans and physical joins without using provider ownership logic. It checks that every directed edge has exactly one reversed partner, compares all graph neighbors, proves connectivity and `V−E+F=2`. The maximum-resolution test resolves every one of **1,047,554** owners back to its own index. Separate tests cover physical metrics, normal orientation, reciprocal fold direction/norm preservation, singular centers, all invalid parameter classes, key isolation, detached mutable caller options, snapshots and exact Float32 values.

## Verification

- **216/216 numerical tests pass**, zero failures/skips: all 190 existing tests plus 26 new cylinder tests. Recorded total duration 4568.19 ms.
- **238 browser cases pass; four intentional skips**, total 242, zero failures, retries or flaky cases. Two retained desktop native-touch skips and two opt-in CPU profiling diagnostics. Full desktop/mobile duration 14.18 minutes.
- **TypeScript and production build pass**; 73 modules, Vite compilation 165 ms.
- **136 existing source/fixture/configuration/benchmark files** match the approved baseline after EOL normalization; **280 historical completion/evidence files** are byte-identical. Source remained frozen across the full browser run (135 runtime/test/configuration files).

Reproduction:

```powershell
npm.cmd test
npm.cmd run build
node --expose-gc scripts/verify-cylinder-foundation.mjs
npm.cmd run test:browser
```

The full browser run uses the unchanged Playwright desktop Chromium and Pixel 7 projects, two workers, zero retries and a fresh strict-port Vite server at 5190; the configured tests otherwise match the standard suite. A source digest before/after guards against runtime/test changes during the run. The [full JSON report](evidence/a7-a-browser-results.json), [numerical log](evidence/a7-a-numerical.txt), [build output](evidence/a7-a-build.txt) and [frozen-source receipt](evidence/a7-a-frozen-source.json) retain actual results.

Execution note: after all 242 cases had reported their outcomes, Windows server teardown stalled before the final JSON was written. The exact temporary `npm run dev -- --port 5190 --strictPort` process tree was identified and closed; neither the Playwright runner nor any test was terminated or retried. Playwright then wrote its full report and exited **0**, with identical before/after source digests. The reported **14.18-minute** duration includes that teardown wait. This was a test-server cleanup issue, not a failed case or a product change.

Browser evidence concerns the **existing bounded/wrapped/spherical workspace**, including v1/v2/v3, Save/Open, exact Undo/Redo, contextual controls, touch/pen/mouse, screen-edge drawing, limb assistance, responsive views and P1 rendering. It is not cylinder editing/usability evidence. This pass has no cylinder renderer and makes no cylinder screenshot claim. Representative actual regression captures/proofs and traces are listed below; prior historical evidence is restored byte-for-byte after the suite writes its normal filenames.

- [Desktop N256 actual held limb](evidence/a7-a-desktop-n256-limb-held.png), [mobile N256 actual held limb](evidence/a7-a-mobile-n256-limb-held.png). These are existing spherical workspace regressions, not cylinder renders.
- [Desktop N256 exact numerical replay/visibility proof](evidence/a7-a-desktop-n256-limb-proof.json), [mobile proof](evidence/a7-a-mobile-n256-limb-proof.json); corresponding N128 receipts/captures are in the inventory. All four report zero sample mismatches, zero hidden-hemisphere samples and positive newly exposed terrain.
- [Desktop repeated N256 editing trace](evidence/a7-a-desktop-n256-regression-trace.zip), [mobile trace](evidence/a7-a-mobile-n256-regression-trace.zip), plus actual N128/N256 editing measurements under the new A7-A evidence prefix. They are regression observations, not a controlled before/after performance comparison.
- [Complete browser log](evidence/a7-a-browser.txt) and full JSON report include every original case and skip.

## Precision and memory

R and L must be positive finite, with finite derived metrics; identities, configuration and resolutions are validated before terrain allocation. Geometry is Float64 reference math; elevations are finite Float32 with their inherent magnitude-dependent precision. Resolution limits are A=4…1024, Z=2…512, P=2…256. Spacings that underflow the supported normal Float64 precision range are rejected. This is analytic geometry at numerical precision, not arbitrary-precision geography.

Maximum authority payload is **4,190,216 bytes**. There are no retained per-sample alias, position or adjacency tables. Each caller-held copy/snapshot adds its own authority-sized buffer; the provider does not budget arbitrary caller copies. The [isolated Node allocation receipt](evidence/a7-a-cylinder-allocation.json) records actual ArrayBuffer deltas exactly equal to the single authority size at three resolutions, and double that size with a snapshot. It also checks every blank word against independent IEEE754 `c2c80000`. These are typed-payload measurements, excluding JS object/closure overhead, browser backing storage, renderer/history resources and garbage collection; they are not mobile responsiveness claims.

Existing numerical, history and rendering budgets are unchanged. The cylinder provider is not imported into the product graph, so there is no new product allocation or per-frame work. The unchanged production build still contains 73 modules. No performance improvement is claimed or required in this numerical-only pass.

## Changed-file inventory

The machine-readable receipt provides exact paths/hashes. The implementation is limited to:

- `src/surfaces/cylinder.ts`, `cylinder.test.ts`: versioned reference geometry, charts, metrics, fold transitions and independent geometry tests.
- `src/terrain/cylindrical.ts`, `cylindrical.test.ts`: private canonical authority, keys, rim/center aliases, connected graph, snapshots and independent ownership/mesh tests.
- `scripts/verify-cylinder-foundation.mjs`: reproducible allocation/blank-word receipt.
- `docs/CYLINDRICAL-HEIGHTMAP-FOUNDATION.md` and this report: mathematical and review specification.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/WORLD-SURFACE-ARCHITECTURE.md`, `docs/PHASE-1-HEIGHTMAP-ROADMAP.md`: current checkpoint and integration boundaries; fix the obsolete README statement that limb assistance is disabled. Preserve the complete geometry inventory, Issue #1 and the current eleven-phase sequence targeting **existing Worlds**.
- New `docs/evidence/a7-a-*` results, representative existing-workspace captures/traces, verification and delivery receipts. All pre-existing completion reports/evidence and source/fixture/config/benchmark files are preserved.

## A7-B boundary, limitations and unresolved questions

Global shortest paths crossing rims and side-to-side cap shortcuts remain **unsupported**. Before physical brushes can work across connected regions, a separately authorized numerical phase must rigorously solve/certify these paths, cap shortcuts, competing angular lifts, sharp-rim stationary/boundary cases and numerical/device budgets. No 3D chord or screen shortcut is presented as the answer. Smooth needs reviewed distance/area/stencil treatment at center fans and rims. The local fold alone is insufficient for finite strokes.

Future views must show the side and both disks with their actual connections, useful combined/local views and independent camera recentering. Navigation cannot relocate/resample numerical geography. Raise/Lower/Smooth/Flatten need consistent physical distance, previews and exact whole-stroke history across joins. Cylinder persistence requires an explicitly versioned validated atomic format and resource bounds while preserving existing v1/v2/v3; no codec migration occurs now. Extreme finite elevations are storage values, not a guarantee of valid displaced mesh geometry: sharp-rim relief/normal construction and self-intersection constraints require later design.

Only solid capped exterior cylinders are implemented. Open/hollow/interior/domed/other connected variants, all other required geometries and non-destructive conversions remain future. No rendered cylinder, cylinder editing, cylinder save format, procedural generator, cartography, linked-map runtime, 3D renderer, lore database, server GPU/paid infrastructure or website integration is added.

The roadmap retains circular/triangular/custom planes, physical capped/open/hollow cylinders, independent hollow sphere surfaces, physical cubes/pyramids/tetrahedra/polyhedra, torus/rings/custom providers and explicit previewable non-destructive conversions. Linked settlements→town/city, buildings→interiors/floors, dungeons/underground and reciprocal navigation must be functional before Phase 7 integration into existing Worlds. The existing Next.js host remains responsible for actual World records, authentication, permissions and database. No original Serrian Tide website, live Worlds implementation or separately rebuilt Worlds checkout is touched.

**Stop after A7-A for Ember's independent review. A7-B and any later pass require authorization.**
