# Cube-B — certified physical cube surface routes

Starting checkpoint: accepted Cube-A receipt `09626c6c5d748909ccd5e45ac65e234fe988f7b0`, implementation `a06685da8e2de257849998483235f4d042c6e6e9`. The owner supplied Ember's source/architecture approval for Cube-A and authorized Cube-B only, on the standalone repository's `main`. Cube-B remains a numerical-only review candidate; independent Cube-B acceptance and authorization of Cube-C remain outstanding.

The exact implementation SHA, committed inventory and evidence identities are recorded in the [delivery receipt](CUBE-B-DELIVERY.md), created after the implementation commit. No cube editor, brush, renderer, persistence or hollow geometry is added.

## Result and exact source inventory

| New file | Responsibility |
| --- | --- |
| `src/surfaces/cube-route-exact.ts` | Bounded IEEE dyadic decoding, exact BigInt rational predicates, work/size limits, explicit certification failures and adjacent-Float64 root enclosures |
| `src/surfaces/solid-cube-routing.ts` | Exhaustive simple-face unfoldings, closed-face/edge/corner endpoint handling, exact global minimum/ties, actual face/XYZ witnesses, checked Cube-A crossings/directions, deterministic alias normalization and reversible route selection |
| `src/surfaces/cube-route-exact.test.ts` | Independently specified roots/IEEE cases, subnormal/large-scale values, exact rational comparison and work/precision/range failures |
| `src/surfaces/solid-cube-routing.test.ts` | Literal same/adjacent/opposite/four-face/edge/corner paths, complete tie behavior, exact reversal, below-ULP discrimination, extreme dimensions, invalid/foreign inputs, limits and unchanged N128/N256 authority |
| `scripts/cube-route-reference.py` | Independent standard-library Fraction oracle using labelled-corner reflection and whole-face slab clipping; no TypeScript/frame/edge-table imports |
| `scripts/verify-solid-cube-routes.mjs` | Reproducible 301-case oracle driver, sample-word preservation, measured query timings, exact-work/bit counters, serialized-result sizes and actual process memory snapshots |

No pre-existing runtime, numerical, browser-test, brush, history, codec, dependency or build configuration is modified. Six canonical documentation files are updated: README, architecture, master roadmap, World/surface architecture, solid cube foundation and shared visual standard. New documentation includes this report and the [route specification/proof](CUBE-SURFACE-ROUTES.md). The complete delivery inventory enumerates every source, document and evidence path.

## Completeness and numerical certification

The [self-contained completeness proof](CUBE-SURFACE-ROUTES.md#1-why-the-candidate-families-are-complete) establishes existence of a minimizer; excludes interior singular corners by a strict cone-sector shortcut; establishes local straightness under unfolding; excludes face revisits by the strictly shorter convex-face chord; and treats edge-running/endpoint aliases. Thus every shortest curve appears among simple sequences of at most six faces. The exact graph recurrence gives at most 28 sequences per ordered face pair and the conservative 252-query bound across endpoint aliases. Passing tests does not establish this theorem; the theorem is given independently.

Every candidate's squared length is compared exactly on a common integer/dyadic grid. Ordered edge feasibility and reconstruction use rational predicates, not epsilons or mesh neighbors. Same-distance curves are grouped only when their physical polylines agree; genuine equal shortest curves remain distinct. Canonical physical endpoint ordering makes the exact selected curves reverse consistently, including their tie order. Runtime witness checks verify face containment, requested endpoints, consecutive XYZ equality and Cube-A edge orientation.

Reported meter lengths are exact or one adjacent Float64 interval, certified by exact squared bit-pattern comparisons. The result also supplies the exact squared length and rational face/XYZ path. It never presents a rounded square root as an exact distance. Work, bit-size, requested precision or finite-output failures return explicit errors, not a partially searched approximation. `boundary='reference-surface-only'` excludes actual elevation-displaced terrain distance. No spherical great-circle, cylindrical solver, interior chord or mesh-edge distance is substituted.

## Independent geometry evidence

[Oracle certificate](evidence/cube-b-oracle-certificate.json), [exact inputs and returned witnesses](evidence/cube-b-oracle-input.json), [driver log](evidence/cube-b-independent.txt) and [focused tests](evidence/cube-b-focused.txt) record **301 independently recomputed cases**, **837 returned segments** and **412 physical crossings**. The oracle counts ties independently by exact initial physical directions and permits nonminimal corner-through candidates in its search, avoiding reliance on the runtime's exclusion predicate or polyline deduplication.

Coverage includes all 36 ordered face-center pairs, all 64 corner pairs, 48 corner-to-face-center cases, 48 directed edge-start/end cases, 80 seeded interior-position cases, literal four-face paths, near-corner and decimal IEEE inputs, a smallest-subnormal route, a below-ULP cut-locus perturbation, four extreme dimensions with center/corner/near-tie queries, and eight sample-address queries across N128/N256.

Independent literal results include the same-face 3–4–5 path; adjacent-center length L; four opposite-center routes of length 2L; six opposite-corner routes of length √5·L; one physical shared-edge route despite aliases; and the exact four-face 20 m example with crossings at `1/12,1/2,11/12`. The specification provides its unfolded coordinates and rational world crossing locations. A +u displacement of `Number.MIN_VALUE` breaks the opposite-center tie exactly even though the output interval remains within one ULP of 20 m. This is geographic precision of the input problem, not invented elevation resolution.

## Regression results

<!-- FINAL-RESULTS -->
| Final phase | Exact result | Driver wall time |
| --- | --- | --- |
| Focused Cube-B tests | 37 passed, 0 failed/skipped | 0.343 s |
| Independent oracle and measured query groups | 301 cases, 837 segments, 412 crossings; all pass | 7.642 s |
| Fresh Cube-A exhaustive certificate | All ownership/physical-neighbor checks pass | 9.804 s |
| Full numerical regressions | 537 passed, 0 failed/skipped | 16.075 s |
| Typecheck | Exit 0 | 0.515 s |
| Production build | Exit 0 | 2.690 s |
| Full desktop/mobile browser suite | 328 passed, 4 existing conditional skips, 0 failures/flaky | 1,630.927 s |

All seven phases exited 0 against the same frozen 249-file source/configuration registry. The four unchanged browser conditions skip desktop-only absence of native touch in two tests and the opt-in CPU profiler in both projects. Native touch cases execute on mobile; the ordinary N128/N256 performance scenarios execute in both projects. This pass does not claim an opt-in CPU profile was captured.
<!-- END-FINAL-RESULTS -->

Actual commands, exit codes and elapsed times are in [validation phases](evidence/cube-b-validation.json). Raw logs cover [all numerical tests](evidence/cube-b-numerical-regression.txt), [Cube-A certificate](evidence/cube-b-cube-a-preservation-certificate.txt), [typecheck](evidence/cube-b-typecheck.txt), [build](evidence/cube-b-build.txt), [browser run](evidence/cube-b-browser-regression.txt) and [structured browser results](evidence/cube-b-browser-result.json). The existing Vite chunk-size warning is retained. The production HTML/main bundle hashes remain accepted output, so new routes are not imported by the product.

The browser run uses the unmodified full suite in an isolated working directory and a separate strict loopback server. Its two accepted saved-geography inputs are exact copies. Generated artifacts retain their original names inside the isolated directory, avoiding replacement of historical evidence. These regressions exercise the existing editors, native input, navigation, source synchronization, worker/fallback behavior, Undo/Redo, Save/Open and mixed v1–v4 libraries; they do not claim a new cube UI or physical-phone validation.

The [archive manifest](evidence/cube-b-browser-artifacts.json) inventories **301 files / 89,960,156 uncompressed bytes**: 299 generated screenshot/measurement artifacts plus two accepted input fixtures. [Archive 1](evidence/cube-b-browser-artifacts-1.zip), [archive 2](evidence/cube-b-browser-artifacts-2.zip) and [archive 3](evidence/cube-b-browser-artifacts-3.zip) are each below 40 MiB. Extract them into one evidence directory to retain original names. The [archive proof](evidence/cube-b-browser-archive-proof.json) verifies every decompressed entry's exact size and SHA-256 and records all archive hashes. The [validation driver](evidence/cube-b-validation-driver.mjs.txt), [isolated configuration](evidence/cube-b-browser-config.ts.txt), [preservation driver](evidence/cube-b-preservation-driver.mjs.txt), [packaging driver](evidence/cube-b-evidence-package-driver.mjs.txt) and [inline archive command](evidence/cube-b-archive-command.ps1.txt) record the actual setup. Normal successful tests do not retain Playwright failure traces; their explicitly generated screenshots and measurements are included.

## Authority and architectural preservation

[Sample preservation](evidence/cube-b-sample-preservation.json) verifies complete before/after buffers: **98,306 / 393,218 vertices**, **393,224 / 1,572,872 bytes**, revisions **2 → 2**, both configuration/representation versions **1**, identical SHA-256 and exact UInt32 contents including signed zero. There are **491,524** preserved sample words across the two test authorities. Routes compose the existing `owner`/`positionAt`; there is no sample-sized route cache, elevation access or write. The fresh Cube-A certificate independently rechecks all face aliases and 1,966,080 directed reciprocal physical-neighbor lengths.

The final [source registry](evidence/cube-b-tested-source.json) and [source freeze](evidence/cube-b-source-freeze.json) identify every source/test/driver/configuration byte used throughout the verification phases. The [preservation audit](evidence/cube-b-preservation.json) confirms **2,396 exact protected accepted Git blobs**, including 243 source/config/dev files and 2,104 historical evidence files. It checks the unchanged master eleven-phase table and thirteen-item geometry priority list, Issues #1/#2 and accepted production asset hashes. No geometry/provider ownership or version change is hidden in this pass.

The numerical modules have no UI, server, paid-service, GPU or database dependency. Python is used only as an independent development oracle with its standard library; the application, numerical npm tests, typecheck and build do not depend on Python. No dependency or deployment is added. Exact rational path objects are not a Save/Open format. The Next.js host continues to own future authentication, permissions and real World associations; no site integration is performed.

## Actual timing and resource measurements

[Raw performance/resource measurements](evidence/cube-b-performance.json) record Windows, Node v24.18.0, ten warmup queries followed by **100 measured queries per group**, with GC available before each group. The independent Python verification completes before the timing groups. These are descriptive desktop Node results, not a browser/mobile performance claim or a comparison with a previous cube routing engine.

<!-- PERFORMANCE-TABLE -->
| Query group | p50 / p95 / maximum (ms) | Last result serialized bytes | Charged work | Peak integer bits |
| --- | --- | --- | --- | --- |
| Same face | 0.2605 / 0.2988 / 0.4863 | 1,808 | 313 | 1,025 |
| Adjacent faces | 1.2262 / 1.4325 / 1.7418 | 2,761 | 1,402 | 1,027 |
| Opposite centers, four ties | 1.4453 / 2.6741 / 3.3696 | 12,409 | 3,266 | 1,029 |
| Four-face route | 0.7074 / 1.0817 / 1.9427 | 4,907 | 1,803 | 1,032 |
| Opposite corners, six ties | 6.3276 / 10.8587 / 12.9227 | 12,714 | 18,974 | 1,027 |
| Extreme scale, below-ULP perturbation | 4.0492 / 6.8245 / 7.8970 | 9,072 | 1,447 | 6,344 |

Across the 301 proof cases the observed maximum charged work was **18,974**, and the observed maximum integer width was **6,344 bits**. These observations do not replace the enforced resource limits. Heap-used snapshots ranged from 12,586,680–12,796,528 bytes before groups and 16,123,688–27,764,656 bytes after groups; RSS ranged from 100,364,288–121,253,888 bytes across snapshots. These are process totals with retained oracle proof material, not memory attributed to one query.
<!-- END-PERFORMANCE-TABLE -->

The raw file includes actual heapUsed/RSS snapshots before and after each group. It retains the 301 proof cases/results, routers, modules and diagnostic data; those snapshots include garbage/GC effects and are **whole verification-process measurements**, not isolated per-query allocation or maximum heap bounds. Serialized-last-result bytes are V8 serialization size, not JS heap or a persisted file schema. Future brush scheduling must measure and bound batches; these individual query timings do not establish interactive frame budgets or physical-phone suitability.

Hard limits are 252 candidate sequences, six faces/five crossings per candidate, at most 252 returned distinct curves, 200,000 charged exact-work units, and 16,384 bits per checked arithmetic value. Optional smaller limits fail explicitly before an answer. Actual peak proof-case work and integer widths are recorded in the table summary. No existing numerical/rendering budget is increased. Static sequence tables contain only the fixed cube topology, not World IDs or geography.

## Limitations, roadmap and stopping point

This provider covers the current physical solid exterior cube and IEEE input positions only. It does not compute elevation-displaced, 3D relief, volume/interior or general-polyhedron routes. It reports one-sided directions rather than a smooth corner tangent; no internal-corner shortest route is invented. Equal minima remain ambiguous. Exact vertices can be rational values not representable by a single Float64; future editing adapters must consume that contract deliberately. There is no distance-only fast path, asynchronous stroke scheduler or new brush footprint. Tight work/precision requests can fail even for valid geometry.

The owner's accepted A7-P1C experience and remaining first-visible latency, weak-device/CPU-fallback and physical-phone concerns are preserved in the master roadmap. No universal latency improvement is claimed or inherited as the standard for cube editing. Cube-A is recorded as approved for development progression. All eleven master phases, Issue #1's measurement/3D/Worlds requirements, the approved geometry order, independent future interior/exterior surfaces, creator-owned assets, vehicle/mobile-structure maps and flexible linked-map hierarchies remain intact. Flat/wrapped visual improvements remain deferred.

No cube brush, editor, renderer, navigation, Save/Open, hollow cube, conversion, procedural generation, illustrated cartography, another geometry or main-site integration is implemented. The original Serrian Tide website, existing/rebuilt Worlds/Atlas, databases, Docker, deployment and Production were untouched. Later solid-cube numerical editing, interactive presentation and persistence require their own bounded authorization; hollow cubes follow with independent interior/exterior elevations/history/persistence/selection.

**Stop after Cube-B and await Ember's independent review and owner approval. Cube-C has not begun.**
