# A7-B2B2 completion — continuous cylindrical sculpting and exact history

Authorized baseline: `f424d09a144c2696dbc2aa5f9cc5570a7f82c4c6`, branch `main`. This pass completes the **numerical** cylinder stroke layer. It does not add a cylinder browser editor. Implementation SHA and publication details are recorded in [delivery metadata](evidence/a7-b2b2-delivery.json); [verification and exact changed-file inventory](evidence/a7-b2b2-verification.json) bind this report to the implementation.

## Delivered behavior

- Corrected B2B1 decimal step counting, with bounded endpoint tolerance, one endpoint, no duplicate/beyond-end dabs, residual/error carry, cancellation and preflight count limits.
- Physical ordered stroke sessions joining B1 routes to unchanged B2A Raise, Lower, Smooth and Flatten. One initial dab, frozen settings, no stationary dabs, spacing across rims/caps/centers/angular wraps, prior-direction tie preference and explicit long-transition intent.
- Bounded cooperative preparation and aggregate work limits. Release drains accepted input. Failure/cancellation/disposal discards pending work and preserves one reversible committed prefix. Invalid input, stale sources and resource/precision failures are explicit.
- An exact-instance/revision-bound read-only B2A patch iterator. Sparse history reserves capacity before atomic mutation and records each canonical sample's first-before/final-after Float32 words, including signed zero. Undo/Redo validates all affected words before restoring them. No terrain snapshot per dab.
- Bounded operation memory/entries, branching, no-op behavior, safe eviction and conflict handling. Finished session objects do not keep evicted/cleared history buffers alive.

The [API, mathematical policy, lifecycle and complete budgets](CYLINDRICAL-STROKES.md) define the behavior and limitations. The eleven-phase roadmap remains unchanged, including Issue #1 terrain intelligence and functional linked city/building/interior/floor/dungeon maps before isolated integration with **existing Worlds**. No existing-site, Worlds, database, deployment, format or application-selection change was made.

## Numerical continuity and independent evidence

**48/48 independent runs pass** (six trajectories x four tools x two event densities; 1,536 final sample comparisons). Largest observed center discrepancy **5.05397e-16 m**; largest final elevation discrepancy from independently rounded reference **1.90735e-6 m**, within the explicit bounds. **1534/1,536 reference final words match exactly**; all 48 complete initial/final arrays restore exactly through Undo/Redo, including signed zero.

The full both-rim/cap out-and-back is **19 dabs / one operation** for every tool and density. Angular wrap is 5 dabs, each real cap shortcut 11, and tied/nearly tied alternatives 12. The [independent fixture](evidence/a7-b2b2-independent-stroke-reference.json) contains the ideal physical route/center data and every expected word; the [actual measurement receipt](evidence/a7-b2b2-stroke-measurements.json) contains actual center traces, final/history words and per-run proofs.

The independent standard-library Python reference uses 65-digit Decimal distances and physical pieces, isolated prior reference definitions and Float32 rounding between dabs. It does not call the production TypeScript brush/path implementation. Fixtures cover a full out-and-back through both rims/caps, side angular wrap, each real cap shortcut, tied alternatives and near ties. The raw receipt retains **every initial/final word, history change and actual physical dab center**. Each run has one operation and exact full-authority word comparison after Undo/Redo. Independent numerical error checks use the reported pre-round and conservative Float32/center-position allowances, rather than requiring ideal and production rounding to agree in every last bit.

Separate four-tool tests require bit-identical sparse/dense axial/radial trajectories under pump sizes 1 and 64. Repeated sample modifications, signed zero, stationary holding, decimal endpoints, partial termination, source conflicts, queue/path/dab/error/history limits and replacement are tested. Decimal-specific tests include near multiples, partial/connected traversal, large cumulative coordinates and 1,000 partial traversals yielding 3,000 distinct points. The retained original B2B1 spacing tests pass unchanged.

## Actual timing and memory observations

Environment: AMD Ryzen 5 5600G with Radeon Graphics, win32 10.0.26300, Node v24.18.0. Representative resolution 128/64/32; maximum 1024/512/256 (**1,047,554 samples / 4,190,216 elevation bytes**). R=1,000,000 m, L=1,600,000 m for timing.

| Numerical workload (four tools) | Dabs | Full stroke ms | Largest observed pump ms | Retained history payload |
| --- | --- | --- | --- | --- |
| representative-round-trip | 343 | 69.917-116.710 | 1.067 | 12288-24576 bytes |
| maximum-side | 5 | 0.811-3.373 | 0.378 | 12288-12288 bytes |
| maximum-rim | 21 | 32.359-43.270 | 3.559 | 12288-12288 bytes |
| maximum-center | 5 | 35.122-76.217 | 1.454 | 49152-49152 bytes |

Across the 16 direct dab measurements, total preparation **0.129-16.271 ms**, history preflight + atomic commit **0.028-1.395 ms**, and finish **0.002-0.005 ms**. Full-stroke Undo **0.024-1.082 ms**, Redo **0.022-5.035 ms**. The receipt retains every pump distribution/count and query/box/sample counter; timing includes real outliers.

The **2,000-move / 201-dab** stress stroke takes **62.761 ms**, processes all 2,001 positions including initial, peaks at eight pending inputs and remains one exact reversible operation. At maximum resolution the side/rim/center retained ArrayBuffer deltas equal the declared history payload (**12,288 / 12,288 / 49,152 bytes**), remain equal after Undo/Redo, and fall to **0 additional bytes after clear** while finished session objects remain referenced. In the **100-stroke eviction** workload, all 100 sessions remain referenced; four entries retain 49,152 bytes, 96 are evicted, peak history typed payload is 61,440 bytes while staging, and clear returns the delta to zero.

Five recorded safe stops cover maximum-resolution history reservation (no first write), aggregate query exhaustion, queue exhaustion, external source change and existing B2A exact-boundary precision. Each committed prefix is one exact reversible operation; the unrelated external word is preserved.

The measurements include full stroke costs, individual preparation slices, committing-pump costs, direct history-preflight/atomic-commit costs, finish and exact Undo/Redo. They exclude terrain creation/seeding, proof copies/hashes and explicit GC from timed work. Single-run local observations include caller/clock overhead; they are not controlled speedup measurements, browser frame guarantees or mobile cylinder performance results.

History's 8 MiB default is retained typed payload, with separately bounded JS Maps/objects/arrays. Before eviction, staging can temporarily add at most one 786,432-byte operation to retained old payload; Undo/Redo can add at most 524,288 bytes of transient patch payload. One B2A changed patch is at most 524,288 bytes. Source authority, solver state, neighbor temporaries, caller snapshots and VM memory are additional. Maximum configured unique samples per stroke remains 65,536. The report does not equate observed heap deltas with a working-set bound.

## Complete regression results

- **390/390 numerical tests pass**, zero failures/skips: all 338 baseline tests plus 52 new tests. Recorded total 5704.914 ms.
- **238 browser cases pass; four intentional skips**, total 242; zero failures/retries/flaky cases. Two desktop native-touch skips and two opt-in CPU profiling diagnostics. Full desktop/mobile duration 11.99 minutes.
- **TypeScript and production build pass**: 73 modules, Vite compilation 175 ms; application asset IDs unchanged.
- **160 unaffected source/fixture/test/config/benchmark files** match baseline after EOL normalization; **375 historical completion/evidence files** are byte-identical. B1 mathematics/path geometry and cylindrical authority remain unchanged. Removing only the new handoff method reproduces the complete original B2A source. All **157 runtime/test/configuration files** retain identical before/after browser-run digests.

Fresh existing-workspace evidence: [desktop N256 held limb screenshot](evidence/a7-b2b2-desktop-n256-limb-held.png), [mobile screenshot](evidence/a7-b2b2-mobile-n256-limb-held.png), [desktop sample/visibility proof](evidence/a7-b2b2-desktop-n256-limb-proof.json), [mobile proof](evidence/a7-b2b2-mobile-n256-limb-proof.json), [desktop trace](evidence/a7-b2b2-desktop-n256-regression-trace.zip), [mobile trace](evidence/a7-b2b2-mobile-n256-regression-trace.zip). N128 variants and all raw editing observations are in the exact inventory. All four N128/N256 visibility receipts have zero sample mismatches, zero hidden-hemisphere edits and positive newly exposed terrain.

These are regressions of the **existing bounded/wrapped/spherical workspace**, including limb assistance, contextual tools, persistence and input. No cylinder rendering, touch interaction or cylinder screenshot claim is made. Fresh captures are archived under this pass prefix; the original historical paths are restored to their baseline bytes after the suite.

## Changed-file inventory

Numerical implementation/tests/reproducers (11 files):

- `src/surfaces/cylinder-path-spacing.ts`
- `src/terrain/cylindrical-brush.ts`
- `src/editor/cylindrical-history.ts`
- `src/editor/cylindrical-history.test.ts`
- `src/terrain/cylindrical-stroke.ts`
- `src/terrain/cylindrical-stroke.test.ts`
- `src/terrain/cylindrical-stroke-reference.test.ts`
- `src/terrain/fixtures/cylinder-stroke-reference.json`
- `src/surfaces/cylinder-spacing-decimal.test.ts`
- `scripts/reference-cylinder-strokes.py`
- `scripts/measure-cylinder-strokes.mjs`

Current specification/architecture/roadmap/report (9 files):

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/PHASE-1-HEIGHTMAP-ROADMAP.md`
- `docs/WORLD-SURFACE-ARCHITECTURE.md`
- `docs/CYLINDRICAL-HEIGHTMAP-FOUNDATION.md`
- `docs/CYLINDRICAL-SCULPTING.md`
- `docs/CYLINDER-PHYSICAL-PATHS.md`
- `docs/CYLINDRICAL-STROKES.md`
- `docs/A7-B2B2-COMPLETION.md`

Pass evidence: independent fixture copy, actual numerical/reference/timing/memory receipt, full numerical/build/browser logs, raw browser JSON, frozen-source receipt, 14 screenshots/proofs/editing observations/traces, and verification/delivery metadata. All evidence uses the docs/evidence/a7-b2b2- prefix.

The [machine-readable inventory](evidence/a7-b2b2-verification.json) lists every implementation path, normalized byte count and SHA-256, plus preserved source and historical evidence manifests. Delivery metadata is committed separately so it can name the implementation SHA without a self-referential hash.

## Remaining limits and review boundary

- B2A still safely rejects uncertifiable exact brush-boundary membership or unattainable Float64 precision. The recorded quarter-radius center traversal reproduces the existing precision-floor stop, with exact prefix Undo/Redo. The pass does not weaken its certified arithmetic. Extreme geometry and configured work/error/history limits also produce explicit stops.
- Direction preference does not certify a unique geodesic or solve every arbitrary cut locus. Inputs must describe the intended physical trajectory; long transitions require intermediates or deliberate shortest-surface intent. No silent event dropping or automatic coarsening is used.
- Path construction, individual distance queries, high-valence Smooth, history reservation/commit/finish and Undo/Redo contain bounded synchronous work. Candidate-count pumping alone gives no hard frame-time guarantee. Future cylinder browser/device scheduling still requires evidence.
- Cylinder views, selection, gestures/previews and accessible controls remain A7-C. Cylinder persistence remains A7-D. No existing save data is converted, and the numerical history is session-only.
- Technical completion is submitted for Ember's independent review; owner hands-on acceptance remains separate.

**Stop after A7-B2B2. Do not begin A7-C without authorization.**
