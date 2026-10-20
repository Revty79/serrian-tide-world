# Cube-C1 — physical terrain brushes and atomic single dabs

The owner supplied Ember's acceptance of Cube-B for development progression: implementation `9545209ed0f45adfc6be586984f14bd5ed5f5909`, delivery `647e40c91b1ce6304088bc544a38ca4886022933`. Cube-C1 is authorized on standalone `main` only. It remains a numerical review candidate; Ember's Cube-C1 review and owner authorization of Cube-C2 remain outstanding.

The implementation SHA and exact committed inventory are recorded after commit in the [delivery receipt](CUBE-C1-DELIVERY.md). Cube-C1 does not add continuous dragging, a cube editor, rendering, Save/Open or hollow geometry.

## Implementation inventory

| File | Result |
| --- | --- |
| `src/surfaces/cube-brush-distance.ts` | Conservative exact grid bounds; once-per-center compiled unfoldings; cooperative distance-only predicates; certified floor/adjacent ratio roots and outward cubic bounds |
| `src/terrain/solid-cube-brush.ts` | Four physical tools, connected pre-dab Smooth, source-epoch preparation, bounded buffers/work, scalar handoff, cancellation and explicit atomic commit |
| `src/terrain/solid-cube.ts` | Only additive patch exports and fully validated private-authority publication hook; all previous topology/ownership/position/read/write code preserved |
| `src/surfaces/cube-brush-distance.test.ts` | Full faces/edges/corners against Cube-B, discovery completeness, boundary/ULP/subnormal/extreme cases, seed-independent root certification and exact polynomial enclosures |
| `src/terrain/solid-cube-brush.test.ts` | All tools and aliases, literal physical stencils, exact Float32 words, signed targets/zeros, source changes, raw patch validation, cancellation, limits and N128/N256 authority |
| `scripts/cube-dab-reference.py` | Independent reflected-square Fraction geometry, literal Cartesian stencils and raw Float32 word verification; standard library only |
| `scripts/verify-solid-cube-dabs.mjs` | Reproducible small complete-dab and selected larger-grid oracle payload/certificate, full-word dry-run preservation |
| `scripts/measure-solid-cube-dabs.mjs` | Actual N128/N256 preparation/commit timing, candidate/work/buffer statistics, process memory and explicit failure trials |

Seven of these files are new. Only the existing terrain file gains code; its original implementation is preserved byte for byte after removing the two additive C1 regions. Six canonical documents update current acceptance/scope: README, architecture, master roadmap, World/surface architecture, solid cube foundation and shared visual standard. This report and the [numerical specification](CUBE-TERRAIN-DABS.md) are new. No previous brush, history, codec, numerical geometry, browser test, dependency, editor or build configuration changes.

## Physical and numerical guarantees

The [specification and completeness argument](CUBE-TERRAIN-DABS.md) explain why fixed endpoint charts retain the complete Cube-B shortest-route family, including endpoint zero pieces. The evaluator compiles 133 sequences per center, uses at most 28 per target face, checks actual fold orientation and exact ordered portal feasibility, and compares squared lengths on a common dyadic grid. It does not call full path reconstruction per sample. Common-face chords attain the global spatial lower bound; all other chord use is conservative rejection only. Equal-route cases retain the same minimum without inventing a unique direction. Corner endpoints never acquire a smooth tangent plane.

Discovery streams exact conservative face-grid rectangles and resolves every address through Cube-A's owner. Shared vertices are not written twice. Every influence uses the exact global reference squared distance, independently of elevation. Ideal cubic weight error is bounded explicitly; the specified floor-root finite kernel yields deterministic Float32 results. Saturation, zero/full intensity, negative targets and signed zero are defined. Smooth is a lazy inverse-square physical-edge graph filter reading the full connected pre-dab stencil, including neighbors outside the footprint. It is not an exact heat-flow or displaced-relief solver.

Prepared blocks contain unique ordered before/after words, never a second terrain authority. Source revisions are checked throughout preparation, handoff and commit. The publication hook validates all identities, ordinary nonshared typed buffers, extents, values, exact before words, ordering, capacity and epoch before the private write loop. No partially prepared or invalid patch publishes. Revision stays per changed word. A bad later block, duplicate/shared vertex, stale source or cancellation cannot leave partial dab writes.

## Independent certificates and focused tests

The [oracle certificate](evidence/cube-c1-final-oracle-certificate.json), [exact input/witness payload](evidence/cube-c1-final-oracle-input.json) and [driver log](evidence/cube-c1-final-independent.txt) record:

- **1,052 geometry cases**, including all 26 face/edge/corner centers against every N2 sample, exact/adjacent-radius boundaries, near corners, decimal IEEE centers, subnormal perturbations, extreme dimensions and selected N128/N256 inside/outside cases.
- **110 complete four-tool dabs**, with **2,860 raw Float32 words** checked independently, including target variants and intensity-zero cases.
- **215 selected N128/N256 output words** across all four tools, with independent literal physical neighbor-set checks and source stencil words.
- Explicit inside cases with four equal opposite-center routes, six equal opposite-corner routes and the literal winning four-face 20 m route.

The Python program imports the accepted independent Python reflected-square/slab oracle, not TypeScript, fast discovery bounds, runtime frame tables, canonical-neighbor code or patch logic. It certifies exact squared values and adjacent root enclosures with Fraction arithmetic. A 1,600-digit Decimal calculation independently checks ideal cubic bounds. Physical stencils come from literal Cartesian grid adjacency; every output word, dry-run source word, revision and write count is checked. Python adds no runtime/npm-test/type/build dependency. The finite candidate-family proof remains separate from all passing cases.

The **50 focused tests** also exercise canonical alias invariance, exact result comparisons against separately reconstructed references, strength/intensity/target response, full signed targets, constant Smooth, zero influence, underflowed changes, stale epochs during/after preparation, foreign handoff, stale iterators, deliberate work/candidate/scan/read/buffer/change/precision exhaustion, invalid controls, shared arrays, duplicate/unsorted/out-of-range indices, malformed late blocks and getter-side source changes. They verify cancellation and pump-size independence. Both N128 and N256 retain their metadata, ownership counts and exact dry-run buffers.

## Actual performance and resources

[Raw measurements](evidence/cube-c1-final-performance.json) and [group summary](evidence/cube-c1-final-performance-summary.json) record Windows Node v24.18.0. Each N uses all four tools and face/edge/corner/near-corner centers: ordinary R=0.04L has three trials per combination (48 per N), wide R=0.55L has one (16 per N). There are **128 successful measured trials** plus **two deliberate over-limit failures**. The run pumps 256 steps then yields with `setImmediate`; GC is available before trials. No warmup exclusion or physical-phone/browser-frame claim is made.

| Grid / radius group | Trials | Initialization median / maximum (ms) | Preparation wall median / maximum (ms) | Maximum pump (ms) | Maximum commit (ms) | Maximum candidates / work |
| --- | --- | --- | --- | --- | --- | --- |
| N128 ordinary | 48 | 1.6944 / 3.7653 | 2.8386 / 7.0369 | 2.1383 | 0.2757 | 121 / 2,405 |
| N128 wide | 16 | 1.7202 / 2.4642 | 142.2423 / 269.0552 | 2.7188 | 1.8177 | 23,485 / 274,629 |
| N256 ordinary | 48 | 1.8444 / 3.2529 | 4.9923 / 11.0878 | 1.3575 | 0.0763 | 441 / 7,363 |
| N256 wide | 16 | 1.8767 / 2.7660 | 545.5725 / 950.4435 | 1.2810 | 3.0589 | 93,193 / 1,100,234 |

These group statistics mix four tools and four locations; the raw file records each trial. Preparation wall time includes initialization, bounded pumps and yields. Commit is timed separately. Prepared-record enumeration, source hash checks and exact restoration are outside those two operation timings. Ordinary/cold samples, diagnostics and GC effects remain in the actual measurements; these are not comparisons with a previous cube engine.

The largest observed charged work was **1,664,950** (including failure trials), against the 16,000,000-step cap. The observed canonical candidate maximum was **93,193**. Maximum typed preparation payload was **786,432 bytes**, reached by the two over-limit trials. Each failed at 65,536 prepared changes, released the prepared buffers to zero bytes and published **zero writes**; the entire source SHA remained exact. The widest successful N256 trial retained at most 749,568 typed-buffer bytes. The raw file also counts tested sequences/portals, common-face/chord shortcuts, root comparisons/fallbacks and source reads.

Largest recorded group heap-used snapshots after preparation were 16,493,528 / 63,686,928 bytes (N128 ordinary/wide) and 19,835,784 / 77,585,632 bytes (N256). The largest after-prepare RSS among those groups was 260,079,616 bytes. These are whole-process measurements including source authority/snapshot, retained diagnostics, garbage, V8/GC and replay-record effects, not isolated per-dab allocations or maximum heap guarantees. Node yield gaps are not UI frame gaps. The fixed source authorities occupy 393,224 / 1,572,872 Float32 bytes.

**Interactive limitation:** ordinary measurements support a promising bounded foundation on this desktop, but do not certify continuous editing. Wide N256 dabs still take about half to one second of elapsed preparation. Recomputing one such dab per pointer event would not be acceptable. Cube-C2 needs an explicitly reviewed ordered-stroke/scheduling strategy, source/acknowledgement handling, workload limits and device evidence. Plan reuse or further candidate improvements must preserve these exact predicates and epochs. No such stroke adapter is implemented here. Atomic commit remains synchronous, bounded and separately measured (observed maximum 3.0589 ms); no universal frame budget is promised.

## Full regression record

<!-- FINAL-RESULTS -->
| Verification | Actual result | Driver wall time |
| --- | --- | --- |
| Final focused C1 tests | 50 passed, 0 failed/skipped | 4.751 s |
| Final full numerical suite | 587 passed, 0 failed/skipped | 15.557 s |
| Final independent dabs/geometry oracle | 1,052 cases; 110 dabs / 2,860 words; 215 selected larger-grid words; all pass | 16.937 s |
| Final resource run | 128 successful trials, 2 expected unpublished work-limit failures | 13.830 s |
| Fresh accepted Cube-B certificate | 301 cases, 837 segments, 412 crossings; all pass | 7.358 s |
| Fresh Cube-A exhaustive certificate | Ownership/aliases/1,966,080 reciprocal neighbor checks pass | 9.728 s |
| Final typecheck / production build | Both exit 0 | 0.534 / 0.504 s |
| Corrected complete desktop/mobile suite | 328 passed, 4 existing conditional skips, 0 failures/flaky | 1397.943 s |

All eight repeated numerical/certificate/resource/type/build phases pass on the final frozen 256-file registry. The full browser suite has a separately frozen 256-file registry and the explicit two-file bridge below. Its four unchanged conditions skip two native-touch cases on desktop and the opt-in CPU profiler in both projects; native touch executes on mobile, and ordinary performance scenarios execute in both projects.
<!-- END-FINAL-RESULTS -->

[Final numerical phases](evidence/cube-c1-final-validation.json) and [browser/initial phases](evidence/cube-c1-validation.json) contain actual commands, exit codes and wall times. Logs include [focused](evidence/cube-c1-final-focused.txt), [full numerical](evidence/cube-c1-final-numerical-regression.txt), [performance](evidence/cube-c1-final-performance.txt), [Cube-B certificate](evidence/cube-c1-final-cube-b-preservation-certificate.txt), [Cube-A certificate](evidence/cube-c1-final-cube-a-preservation-certificate.txt), [typecheck](evidence/cube-c1-final-typecheck.txt), [production build](evidence/cube-c1-final-build.txt) and [corrected browser run](evidence/cube-c1-browser-regression.txt). The existing build chunk warning remains. The final numerical sources were frozen throughout the eight repeated checks; the earlier browser snapshot is distinguished below.

**Browser infrastructure correction.** The first local harness accidentally selected the preceding Cube-B configuration: its owned server was on 5241, while that configuration navigated to 5238. All 328 failures were `ERR_CONNECTION_REFUSED` before application checks; four existing conditions skipped. The [failed log](evidence/cube-c1-browser-infrastructure-attempt.txt), [structured failed result](evidence/cube-c1-browser-infrastructure-attempt.json) and [recovery proof](evidence/cube-c1-browser-infrastructure-recovery.json) are retained. That configuration also targeted the historical Cube-B JSON reporter path; it was restored from the accepted Git blob and checked against its original delivery SHA-256. The corrected isolated C1 configuration validates both the server port and reporter path before running the complete suite. It uses the same frozen 256 source/configuration files; no application assertion was bypassed or source changed to address this harness error. Historical browser artifacts remain protected.

**Post-browser numerical guard hardening.** Final review identified raw patch hazards from caller array map/species, typed-view accessors, forged element prototypes and disguised shared buffers. The hook now completes descriptor reads without caller methods, then validates actual view/buffer brands and extents through captured intrinsic getters. Two adversarial tests were added. Only `src/terrain/solid-cube.ts` and its brush unit test changed after the browser run. The [source bridge](evidence/cube-c1-source-bridge.json) records both complete browser-era source snapshots, their hashes, the other 254 identical registered files, absence of product/dev/browser-test imports of the numerical cube modules, and final production assets identical to the accepted P1C build. All eight numerical/certificate/resource/type/build phases were repeated successfully. No UI, footprint/kernel, history, codec, dependency or base test configuration changed. The two registries are intentionally distinct, and the browser result is not represented as execution of the later raw numerical guard.

The final [structured browser results](evidence/cube-c1-browser-result.json) and [source freeze](evidence/cube-c1-source-freeze.json) identify the completed run. Browser screenshots/measurements are existing-editor regression evidence, not a new cube UI or physical-phone validation. The native test suite, inputs, history, mixed libraries and v1–v4 persistence are unchanged.


The [archive manifest](evidence/cube-c1-browser-artifacts.json) inventories **301 files / 89,700,468 uncompressed bytes**: 299 generated screenshots/measurements plus two accepted input fixtures. [Archive 1](evidence/cube-c1-browser-artifacts-1.zip), [archive 2](evidence/cube-c1-browser-artifacts-2.zip) and [archive 3](evidence/cube-c1-browser-artifacts-3.zip) are each below 40 MiB. Extract together to retain original filenames. The [decompressed-entry proof](evidence/cube-c1-browser-archive-proof.json) checks every exact size/SHA-256 and all archive hashes. Successful tests do not retain Playwright failure traces; explicitly generated regression screenshots/measurements are included.

Archived drivers identify the [initial validation](evidence/cube-c1-initial-validation-driver.mjs.txt), [corrected browser run](evidence/cube-c1-browser-retry-driver.mjs.txt), [recovery](evidence/cube-c1-browser-recovery-driver.mjs.txt), [isolated config](evidence/cube-c1-browser-config.ts.txt), [post-browser hardening](evidence/cube-c1-atomic-hardening-driver.mjs.txt), [final validation](evidence/cube-c1-final-validation-driver.mjs.txt), [source bridge](evidence/cube-c1-source-bridge-driver.mjs.txt), [preservation](evidence/cube-c1-preservation-driver.mjs.txt), [packaging](evidence/cube-c1-evidence-package-driver.mjs.txt) and [inline archive command](evidence/cube-c1-archive-command.ps1.txt). Earlier source/performance/certificate artifacts retain their original prefix; final numerical artifacts use `cube-c1-final-`.

## Preservation and architectural boundary

[Full-word source preservation](evidence/cube-c1-final-sample-preservation.json) checks 98,306 and 393,218 canonical samples (**491,524 total words**), exact source SHA-256, unchanged revisions and dry-run buffers at N128/N256. No route or candidate computation reads elevation. Source reads are charged only when a brush evaluates an affected value/stencil. The fresh Cube-A certificate rechecks all ownership/aliases and 1,966,080 reciprocal physical-neighbor lengths. The unchanged Cube-B reference driver independently recertifies its original 301 geometry cases; its separate final fresh artifacts have the `cube-c1-final-cube-b-` prefix.

The [browser source registry](evidence/cube-c1-tested-source.json) and [browser freeze](evidence/cube-c1-source-freeze.json) preserve its 256 exact files. The [final numerical registry](evidence/cube-c1-final-tested-source.json), [final freeze](evidence/cube-c1-final-source-freeze.json) and [two-file source bridge](evidence/cube-c1-source-bridge.json) identify the delivered guard and tests. The [preservation inventory](evidence/cube-c1-preservation.json) confirms **2,435 exact protected accepted Git blobs**, including 248 source/config/dev files and 2,135 historical evidence files. It strips only the two additive C1 regions (44 lines) and verifies every original terrain byte, plus accepted production assets, the unchanged eleven-phase table, thirteen-item geometry order and Issues #1/#2. Historical reports, geometry/source/tests and codecs remain intact. The terrain remains one private Float32 authority; no replicated face data or new World records are created.

The modules are independent of the development interface and server services. Future host authentication, permissions, database and existing World records remain with the Next.js Serrian Tide application at the authorized roadmap stage. No original website, existing Worlds/Atlas, database, hosting, Docker, deployment or Production changes occurred.

## Scope and review stop

Cube-C1 implements only four numerical single-dab tools, conservative exact footprint evaluation, cooperative epoch preparation and bounded atomic commit. It does not add C2 strokes/ordered pointer input/gesture history, D rendering, E editor, F normal workspace Save/Open, G/H hollow numerical/editor surfaces or I final acceptance. It exposes no incomplete cube choice. Elevated-relief travel, general shape conversion, generators, cartographic assets, another geometry and integration remain outside this pass.

All eleven master phases and the approved geometry order remain intact. Flat/wrapped visual improvements stay deferred; existing A7-P1C first-visible/weak-device/fallback/physical-phone qualifications remain recorded. Hollow interior/exterior surfaces must later be independently editable under one parent World, with distinct authority/history/persistence/selection.

**Stop after Cube-C1 for Ember's independent review and owner approval. Cube-C2 has not begun.**
