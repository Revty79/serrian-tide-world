# A7-B1 completion — global physical cylinder distance foundation

Approved baseline: `dc55500bf201be40648190fba13a2ab29fabe948`, branch `main`. The owner authorized A7-B1 and direct main publication. [Delivery metadata](evidence/a7-b1-delivery.json) records the exact implementation SHA; [verification](evidence/a7-b1-verification.json) records every changed implementation path, byte count and SHA-256. Independent review and owner acceptance remain separate. No A7-B2 work is included or authorized by this report.

## Delivered behavior

The physical solid capped exterior cylinder now has `geometry.globalDistance(a,b,options?)`. It returns a global intrinsic reference-surface **lower/upper enclosure in meters**, an explicit absolute error bound, tolerance, feasible route family/angles and bounded-work statistics. It considers the side, both actual disks, their connected rims, angular wrapping and cap centers. No elevation values, samples, identities, views or numerical terrain metadata are rewritten by a distance query.

The [mathematical specification](CYLINDER-GLOBAL-DISTANCE.md) proves complete route families using disk chord shortcuts, Minkowski/planar triangle inequalities and angular monotonicity. It reduces the continuous problem to analytic cases, one-dimensional cap-shortcut/side-cap objectives, or a two-dimensional opposite-cap triangle. Side-only lengths compete with both cap choices. Additional windings and extra cap visits cannot improve on these families. The proof includes boundary and degenerate pieces rather than assuming a regular stationary geodesic.

Branch-and-bound uses analytically justified affine minorants from `D''>=−R`, convex side lengths and feasible continuous routes. It terminates only when the global enclosure meets tolerance. There is no adjacent-sample graph approximation, texture distance, projected shortcut or general 3D chord substituted for the surface metric. Existing `sameRegionDistance` retains its restricted interpretation; its cross-chart failure now directs callers to `globalDistance`.

## Mesh correction

The current foundation document now states:

```text
V = A(Z+2P−1)+2
E = A(2Z+4P−1)
F = A(Z+2P)
V−E+F = 2
```

Each cap has P−1 quad bands, including its final interior-ring→rim band, plus a center fan. The old written E/F each missed 2A; their errors canceled in Euler. Independent symbolic mesh tests now assert **actual** vertex, undirected-edge and face counts separately at A=4,7,9,32, including odd A. For A=9,Z=5,P=4 the actual counts are **110 vertices, 225 edges, 117 faces**. The canonical terrain implementation, ownership formula and Float32 layout are unchanged. Historical A7-A completion/evidence stays unchanged as a historical receipt; the current specification supplies the correction.

## Accuracy and independent reference evidence

Successful results expose `lowerBoundMeters`, `upperBoundMeters`, `value=upper`, `absoluteErrorBoundMeters=upper−lower` and `requestedToleranceMeters`. The interval is under the documented checked Float64 arithmetic contract. It is not a claim of exact real arithmetic or uniquely selected paths.

The kernel normalizes per route, uses fixed Taylor/Horner half-angle polynomials (truncation <3×10⁻²⁷), scaled norms and residual-checked square roots. Each lower/upper calculation includes a conservative 2048ε·scale allowance and a subnormal floor. The edge lower-bound minimizer uses a convex-conjugate value so an ill-conditioned stationary argument cannot corrupt a lower bound. A test deliberately substitutes an inaccurate square root and verifies explicit rejection. Requests below the precision floor, nonfinite/unrepresentable enclosures and exhausted work budgets return **no successful partial value**.

The independent [65-digit reference receipt](evidence/a7-b1-high-precision-reference.json) is reproducible using Python's standard library only. It uses different optimization: derivative bracketing/bisection, four impact-parameter branches and constrained high-precision stationary systems. The difficult short-cylinder and almost-rim fixtures include thin interior optima that coarse angle seeds miss. That reference search is not itself a completeness proof; its computed candidates must lie inside the independently justified production global interval. All 12 do.

| Independent reference | Upper endpoint m | Error vs rounded Decimal reference m | Returned interval width m | Boxes |
| --- | --- | --- | --- | --- |
| side-shortcut | 2.05000000000045 | 4.547e-13 | 3.771e-11 | 35 |
| side-start-interior-minimum | 2.49537917034082 | 1.336e-12 | 4.591e-11 | 57 |
| side-end-interior-minimum | 2.46115961131979 | 6.466e-13 | 4.467e-11 | 43 |
| side-direct | 1.34164078650048 | 6.102e-13 | 1.220e-12 | 0 |
| side-cap-interior | 2.21895608205206 | 6.715e-13 | 7.154e-11 | 73 |
| side-cap-near-rim | 2.03686136013643 | 5.156e-13 | 6.560e-11 | 39 |
| side-cap-near-center | 1.71942257780000 | 4.545e-13 | 6.210e-11 | 51 |
| opposite-interior | 3.40316343035443 | 3.815e-12 | 9.293e-11 | 541 |
| opposite-squat | 2.09780551876457 | 1.181e-11 | 4.973e-11 | 259 |
| opposite-long | 100.735865520358 | 1.012e-10 | 9.823e-10 | 405 |
| opposite-near-rims | 2.01987606487328 | 7.656e-12 | 9.970e-11 | 1055 |
| opposite-symmetric-tie | 2.50000000000045 | 4.547e-13 | 6.374e-11 | 101 |

The deterministic 1,500-query Node workload (seed 17; L/R sampled from 10⁻⁶…10⁶, including exact/nearly rim radii and antipodal angles) had **zero failures**. Query median **0.1723 ms**, p95 **1.0914 ms**, maximum **15.4211 ms**; whole measurement loop 520.69 ms. Maximum observed work: **4735 boxes**, **520 queued boxes**, **42631 feasible objective evaluations**. Hardware/runtime are recorded in the receipt; this is one Node desktop workload, not a controlled improvement comparison or a mobile brush/frame-time claim.

Post-GC retained ArrayBuffer delta was **0 bytes**. Observed heap before/after GC was 10624688/10737896 bytes, sampled peak 15613936 bytes; these include caller/measurement/VM state and temporary objects. They are observations, not an exact retained solver-cache or working-set estimate.

Further independent checks cover exact analytic disk/axial/radial/center cases, real cap shortcuts, every sampled odd-A rim connection, reversed queries, wrapping, ties/near ties, scale factors 10⁻¹⁰⁰…10¹⁰⁰, aspect ratios 10⁻⁹…10⁹ and deterministic symmetry/triangle inequalities within returned interval error. Direct Cartesian rim-grid candidates at 16…256 subdivisions converge from above; that convergence is distinguished from an exact continuous metric. Cylinder queries preserve all Float32 words (including signed zero), metadata, identity, revision, normals and sharp-rim folds.

## Verification and preserved workspace

- **252/252 numerical tests pass**, zero failures/skips. Baseline 216 cases remain, with the intended unsupported-global expectation replaced by an analytic bounded result, 33 new distance tests and three additional independent mesh-count variants. Recorded total 4643.30 ms.
- **238 browser cases pass; four intentional skips**, total 242, zero failures/retries/flaky cases. Two retained desktop native-touch skips and two opt-in CPU profiling diagnostics. Final full desktop/mobile duration 11.79 minutes.
- **TypeScript and production build pass**, 73 modules, Vite compilation 168 ms; asset IDs match the baseline.
- **138 unaffected source/fixture/config/benchmark files** match the baseline after EOL normalization; **303 historical completion/evidence files** are byte-identical. The final browser run's 138 runtime/test/configuration sources have identical before/after digests.

Reproduce:

```powershell
python scripts/reference-cylinder-distance.py
node --expose-gc scripts/measure-cylinder-distance.mjs
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
```

The final browser verification uses the unchanged desktop Chromium and Pixel 7 projects, two workers, zero retries and a fresh strict-port Vite server on 5191. An external test helper owns that direct server process; Playwright's report finalizes before server cleanup, avoiding the Windows teardown stall recorded in A7-A. All runtime/test/configuration source remains frozen across this final run. An earlier partial browser run was intentionally discarded before the final square-root guard change; it contributes no pass counts or final evidence.

[Full browser JSON](evidence/a7-b1-browser-results.json), [browser log](evidence/a7-b1-browser.txt), [numerical log](evidence/a7-b1-numerical.txt), [typecheck/build output](evidence/a7-b1-build.txt), [source digests](evidence/a7-b1-frozen-source.json) and the verification receipt retain actual results. Existing workspace tests cover all earlier bounded/wrapped/sphere tools, native inputs, assisted strokes, exact history, v1/v2/v3, mixed library, Save/Open, storage failure and responsive/fullscreen behavior. They are **existing workspace regression evidence**, not cylinder editing/browser usability evidence. No cylinder renderer exists in B1.

- [Desktop N256 held limb capture](evidence/a7-b1-desktop-n256-limb-held.png), [mobile N256 capture](evidence/a7-b1-mobile-n256-limb-held.png): actual existing spherical workspace.
- [Desktop N256 exact sample/visibility proof](evidence/a7-b1-desktop-n256-limb-proof.json), [mobile proof](evidence/a7-b1-mobile-n256-limb-proof.json), plus N128 receipts/captures in the inventory. All four show zero mismatches, no hidden-hemisphere painting and positive newly exposed geography.
- [Desktop repeated N256 trace](evidence/a7-b1-desktop-n256-regression-trace.zip), [mobile trace](evidence/a7-b1-mobile-n256-regression-trace.zip); full original-case results and raw N128/N256 editing observations are preserved under the A7-B1 prefix. No cylinder-rendering claim is attached to them.

## Work and memory bounds

Each query allows at most 32,768 evaluated boxes and 16,384 live queued boxes. The caller can lower `maxBoxes`, never increase it. Every box has fixed-size state and a fixed number of envelope/feasible evaluations; there is no unlimited per-frame loop, terrain-sized table, sample allocation or retained per-query cache. At most 13 feasible objective evaluations are offered per evaluated box, plus constant special cases. This is a bounded synchronous numerical query, not yet a weaker-device brush scheduling solution.

The [Node measurement receipt](evidence/a7-b1-distance-measurements.json) records raw environment, cold reference-query times, warmed deterministic workload times, enclosure errors, actual queue/evaluation counts and memory observations. Heap readings include VM/measurement/caller state and garbage-collection transients. They do not establish an exact per-object working-set size, a process-memory reduction or mobile frame-time performance. The retained numerical authority still has A7-A's one-buffer limit of 4,190,216 bytes; the distance kernel never accesses it. No existing memory or numerical/rendering budget is increased.

## Exact changed-file inventory

The machine-readable verification receipt supplies the complete path/hash inventory. Changes are limited to:

- `src/surfaces/cylinder-distance.ts`: complete continuous route families, bounded solver, arithmetic checks, result/error interface and hard limits.
- `src/surfaces/cylinder.ts`: delegates its formerly unsupported global query to the new module; reference positions/normals/folds and restricted metric arithmetic are preserved.
- `src/surfaces/cylinder-distance.test.ts` and `src/surfaces/fixtures/cylinder-distance-reference.json`: independent references, invariants, query isolation, precision/budget/range/input guards.
- `src/surfaces/cylinder.test.ts`: replaces the old “global unsupported” expectation with a bounded exact-analytic fixture.
- `src/terrain/cylindrical.test.ts`: strengthens actual independent V/E/F assertions without modifying authority code.
- `scripts/reference-cylinder-distance.py`, `scripts/measure-cylinder-distance.mjs`: independent reproducible reference and measurement receipts.
- `docs/CYLINDER-GLOBAL-DISTANCE.md`, corrected `docs/CYLINDRICAL-HEIGHTMAP-FOUNDATION.md`, this completion report, README/current architecture/roadmap updates and new `docs/evidence/a7-b1-*` results.

No existing bounded/wrapped/spherical numerical representation, cylinder authority, product entry/component, renderer/input/history, persistence format, package configuration or deployment configuration changes. The production asset IDs remain the same as A7-A; the new numerical module is absent from the product graph. Historical evidence/report hashes and all unaffected source/fixture/configuration/benchmark hashes are verified before publication.

## Supported mathematics and explicit limits

All physical endpoint-region combinations on the supported solid capped exterior have complete candidate coverage: same cap, side-only, either-cap side shortcuts, side/cap and opposite caps, including centers/rims and wrapped/tied representations. The numerical optimizer returns success only with the requested enclosure.

Remaining **unsupported calculations** are requests below the attainable Float64 floor, distances without finite representable enclosures, work/queue exhaustion and elementary arithmetic that fails the checked residual contract. These fail explicitly; they are not unresolved route classes reported as reliable values. Returned class lists are conservative and potentially overinclusive; `bestAngles` are unsigned family parameters, not a unique reconstructed geodesic. Elevated relief distance, new/open/hollow/domed geometries and independent interior surfaces remain outside this provider.

A7-B2 must still define physical path reconstruction/selection at cut loci and ties, continuous stroke spacing, interval-aware brush-boundary policy, bounded unique sample candidates, cross-rim four-tool operations, center/rim Smooth weights, exact whole-stroke history, matching projected previews and weaker-device scheduling. An interval overlapping the influence boundary must be refined or handled under an explicitly reviewed error policy before writes. No interactive cylinder brush, history, view, shape selector choice, save format or conversion is implemented here.

The complete eleven-phase roadmap is retained: all required geometries/conversions, measurements/Issue #1, professional illustrated **fully interconnected** Atlas maps (settlement/city, buildings/interiors/floors, dungeons/underground, reciprocal navigation) before integration into **existing Worlds**, then bidirectional records, existing living-history/timelines, acceptance/permissions, and modern/historical Earth. No original Serrian Tide website, Worlds information system, database, server, production/deployment configuration, paid infrastructure or GPU requirement is touched.

**Stop after A7-B1 for independent review. Do not begin A7-B2 automatically.**
