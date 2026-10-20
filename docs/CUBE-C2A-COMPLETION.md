# Cube-C2A completion and review report

The owner supplied Ember's approval of Cube-C1 for development progression: implementation `02078ef941bd0e3c03de3052a9d513d2bc018df4`, delivery `bb0940dd2778f2277c1d9c7c5e4a498bfc48c272`. Cube-C2A implements the separately authorized numerical continuous physical stroke-path foundation on standalone `main`. Independent C2A review and authorization of C2B remain outstanding.

The implementation SHA and exact committed inventory are recorded in the [delivery receipt](CUBE-C2A-DELIVERY.md). **Stop after Cube-C2A.** No C2B execution/history, cube UI, renderer, persistence, hollow cube or other geometry has begun.

## Result and source inventory

The provider reconstructs consecutive accepted positions using unchanged Cube-B certified physical reference-surface routes. It records explicit continuation/tie/retrace/corner decisions, carries exact physical arc spacing across inputs/charts, and emits one initial dab plus regular radius/4 centers. Regular chart coordinates have certified nearest/even rounding witnesses and validate on Cube-A. It never accesses terrain or publishes a patch.

| New file | Responsibility |
| --- | --- |
| `src/surfaces/solid-cube-stroke-path.ts` | Ordered bounded input/output, route selection and continuity, exact carried spacing, physical centers, progress, release/cancel/failure |
| `src/surfaces/cube-stroke-exact.ts` | Rational square-class arcs, exact equivalence/cancellation, outward root intervals, sign decisions and nearest/even center rounding |
| `src/surfaces/solid-cube-stroke-path.test.ts` | Physical face/edge/corner paths, ambiguity, spacing, sampling density, bounds/cancellation and dry-run C1 integration |
| `scripts/cube-stroke-reference.py` | Independent Fraction route verification and 1600-digit Decimal arc sampler; verification only |
| `scripts/verify-solid-cube-strokes.mjs` | Reproducible independent physical paths and C1 emitted-center preparation certificates |
| `scripts/measure-solid-cube-strokes.mjs` | Separate path/route/C1 timings, bounded work, process-memory observations and explicit failure trials |

All six are new. Every existing source/test/driver/configuration/dependency file remains unchanged. Six current canonical documents update scope/acceptance and point to this report and the new [numerical specification](CUBE-STROKE-PATHS.md): README, architecture, master roadmap, World/surface architecture, solid cube foundation and shared visual standard. Historical reports, receipts and evidence remain intact. The delivery inventory classifies documentation, numerical source/tests/drivers and evidence separately.

## Physical continuity and spacing guarantees

The [specification](CUBE-STROKE-PATHS.md) defines the policy and arguments. Each nonzero observed interval queries the complete Cube-B shortest-route family once; physical crossings, chart orientations, meter lengths and exact route witnesses are retained. There is no global route solve per terrain sample or per emitted dab. An active route is reused across all its centers. No spherical/cylindrical approximation, interior shortcut, sample relocation or duplicate authority is introduced.

Unique routes are used directly. Immediate backtracking reverses the same physical tied curve. Other ambiguities use maximum exact continuation alignment after valid pairwise edge folding; an unresolved score tie or absent context uses a visibly recorded canonical policy. Exact corners reset tangent context, and no smooth corner tangent is invented. A sparse observation cannot identify an unobserved detour or uniquely resolve all opposite-face intents; those limitations are explicit.

Global centers occur at ordinal times physical spacing. Lengths and residuals are algebraic values rather than sums of rounded route lengths. Equivalent rational square classes combine exactly without factorization; interval refinement certifies every nontrivial comparison and rounding decision. Exact curve subdivisions therefore preserve ideal centers and canonical rounded positions, subject to the documented resource bounds. Adding a real bend or changing which ambiguous path is specified changes geography. Face crossings do not add initial dabs or reset residuals. Exact endpoints are stamped once if on the spacing grid; there is no extra off-grid release stamp.

Rounded Number positions lie on genuine cube faces. Ideal physical spacing is exact; distances between rounded centers are not claimed to be exactly radius/4. The specification distinguishes certified coordinate rounding, sampling-density equivalence, finite precision/resource failure and genuinely different observed paths.

## Executed numerical and independent verification

[Validation commands, exit codes and wall times](evidence/cube-c2a-validation.json) and the logs record the final frozen source:

- **89 focused tests passed:** 39 new path/arithmetic/integration tests plus all 50 accepted C1 focused regressions; no failures or skips.
- **626 full numerical tests passed:** all terrain, rendering, editor/history, persistence and surface numerical regressions; no failures or skips.
- Typecheck and production build passed. The existing Vite chunk-size warning remains.
- The original Cube-A exhaustive certificate and original Cube-B independent certificate passed unchanged. Cube-A checks 1,966,080 reciprocal neighbor operations. Cube-B independently verifies 301 cases, 837 segments and 412 crossings.
- The accepted C1 Python oracle was rerun unchanged: 1,052 geometry cases, 110 complete single dabs / 2,860 raw Float32 words and 215 selected N128/N256 words.

The new [stroke oracle input](evidence/cube-c2a-stroke-oracle-input.json) and [certificate](evidence/cube-c2a-stroke-oracle-certificate.json) cover **53 specified paths, 142 nonzero certified intervals, 895 centers and 1,684 coordinate-bound checks**. Cases include all six faces, twelve edges, eight corners, reversals, explicit opposite-face ambiguity/continuation, the literal winning four-face 20 m path, near-boundary/subnormal inputs, irrational bends and exact subdivisions at different densities. The original independent Python labelled-square reflection/slab oracle verifies the full Cube-B family and the selected physical curve's lengths/crossings. A separate 1600-digit Decimal sampler checks every emitted center; rational-length examples use exact Fraction sampling. This is independently executed numerical evidence, separate from the finite-family, square-class and spacing-invariance arguments.

An additional [matrix input](evidence/cube-c2a-matrix-oracle-input.json), [certificate](evidence/cube-c2a-matrix-oracle-certificate.json) and [archived driver](evidence/cube-c2a-matrix-driver.mjs.txt) verify **78 further paths, 138 nonzero intervals, 1,848 centers and 3,540 coordinate-bound checks**. These cover all 36 ordered face-center pairs with independently specified literal lengths/counts; all six orientations times four continuation directions using a separately written Cartesian neighbor table; six unresolved alignment ties; and all twelve exact-edge continuation contexts. The same independent Python sampler verifies the selected physical routes and centers. Combined path evidence is **131 specified paths / 280 intervals / 2,743 centers / 5,224 coordinate-bound checks**. This supplementary run checked the 262-file registry before and after and changed no source.

The new [dab input](evidence/cube-c2a-dab-oracle-input.json), [dab certificate](evidence/cube-c2a-dab-oracle-certificate.json) and [source preservation](evidence/cube-c2a-terrain-preservation.json) record **32 complete C1 preparations** at emitted centers, all four tools, N2/N128/N256. Every prepared change matches exactly across pump sizes 17 and 256. The unchanged Python C1 oracle independently checks **634 raw Float32 results**: all 26 canonical words per N2 preparation and selected inside/outside/neighbor-backed words for larger authorities. It does not claim independent exhaustive checking of every larger-grid output word. Full source buffers and revisions remain exact after every preparation; every job is cancelled without a commit. No group of dabs is presented as a whole-stroke transaction.

Focused tests additionally cover input snapshot/identity/alias behavior, ordinary-edge transport, exact corner reset, remaining continuation-score ties, literal 3-4-5 routes, very short/subnormal segments, repeated observations, long segments, exact endpoints, queue/output backpressure, release/empty/cancelled states, hard input/dab/route/aggregate work failures, 128-class exhaustion, integer-range failure, and extreme valid dimensions. Held-stroke UI/history behavior is deliberately outside C2A.

## Measured cost and resource behavior

[Raw timings](evidence/cube-c2a-performance.json) and [summary](evidence/cube-c2a-performance-summary.json) were measured on Windows Node v24.18.0. All three trials per path are retained; no warmup samples are removed. Path construction, separate full Cube-B calls and C1 preparation are different workloads. The provider is measured without terrain work.

| Specified path | Trials | Total path median / max ms | Largest pump ms |
| --- | --- | --- | --- |
| One same-face diagonal | 3 | 10.103 / 16.285 | 2.297 |
| One real edge crossing | 3 | 2.686 / 3.575 | 2.141 |
| Opposite face centers | 3 | 21.036 / 21.513 | 2.668 |
| Opposite corners | 3 | 55.572 / 55.906 | 11.451 |
| Same curve, 129 collinear observations | 3 | 37.122 / 40.374 | 0.642 |
| 65 observations / 64 irrational bending intervals | 3 | 353.978 / 358.805 | 25.003 |

All **18 path trials completed**. The largest observed Node turn gap was 25.054 ms on the bending case. Its center-pump median was 13.150 ms and maximum 25.003 ms, while route pumps were much smaller. Separate direct Cube-B route-call medians/maxima were 0.151/0.180 ms same-face, 0.602/0.650 ms edge, 1.318/1.329 ms opposite centers and 7.843/7.929 ms opposite corners. Separate warmed calls and route pumps are not interchangeable performance estimates.

The **32 C1 trials** use four tools, two centers, two radii and N128/N256, pump size 256 with `setImmediate` yields. Uniform-source Smooth is included and its no-change result contributes to these aggregates; these are not a replacement for the broader accepted C1 performance inventory. The raw field `totalPreparationMs` stops after the full read-only authority copy/equality assertion, so that observed interval includes initialization, yielding and source-verification overhead. It is not an isolated engine CPU-time measurement. Initialization and individual pump timers stop immediately after those calls.

| Authority / radius | Trials | Verified preparation interval median / max ms | Largest dab pump ms |
| --- | --- | --- | --- |
| N128 / 0.04L | 8 | 3.596 / 7.393 | 2.104 |
| N128 / 0.55L | 8 | 190.976 / 293.116 | 1.335 |
| N256 / 0.04L | 8 | 9.039 / 16.530 | 2.079 |
| N256 / 0.55L | 8 | 728.187 / 1,149.849 | 4.784 |

The largest measured preparation buffer was 749,568 bytes, below unchanged C1's 786,432-byte limit. There were no terrain writes. Four additional deliberate input/route/dab/aggregate-budget failures ended failed with zero retained arc terms. Failed route allowance is conservatively charged; partial output never claims a completed gesture. Finite successful examples do not prove unlimited gesture capacity.

These are Node wall times and turn gaps, **not browser frame gaps or physical-mobile performance**. Overall path intervals include bounded host admission, output collection, evidence bookkeeping and yields; direct Cube-B call timers are separate. Raw process heap/RSS includes runtime, evidence retention, authorities and snapshots, not a per-query allocation bound. The full browser regression retains its own existing-editor timing evidence separately. C2A does not claim an overall performance improvement over C1 or universal frame-safe execution.

The new layer caps pending input/output at eight each, accepted inputs at 256, dabs at 4096, algebraic classes at 128, precision at 4096 fractional bits, per-pump admitted exact work at 200,000 and aggregate at 16,000,000. The existing Cube-B bit/candidate/work limits and every C1 numerical/memory/publication limit are unchanged. Exact shapes/temporary work are bounded; JavaScript heap bytes are not asserted as an exact hard allocation cap.

## Browser regressions and preservation

**328 browser tests passed; 4 existing conditional skips; zero failures or flaky tests.** Both configured desktop and Pixel 7 mobile projects ran against the owned strict-port Vite server at `127.0.0.1:5244`. Browser wall time was **1662.853 seconds**. See the [structured result](evidence/cube-c2a-browser-result.json), [complete log](evidence/cube-c2a-browser-regression.txt), [exact configuration](evidence/cube-c2a-browser-config.ts.txt) and [validation driver](evidence/cube-c2a-validation-driver.mjs.txt).

The isolated artifact directory contains **301 files (299 generated evidence files and 2 unchanged accepted geography inputs), 89,917,841 uncompressed bytes**. It is delivered in 3 [archives](evidence/cube-c2a-browser-artifacts.json): [cube-c2a-browser-artifacts-1.zip](evidence/cube-c2a-browser-artifacts-1.zip), [cube-c2a-browser-artifacts-2.zip](evidence/cube-c2a-browser-artifacts-2.zip), [cube-c2a-browser-artifacts-3.zip](evidence/cube-c2a-browser-artifacts-3.zip). Every decompressed entry's size and SHA256 was checked against the manifest; [archive proof](evidence/cube-c2a-browser-archive-proof.json) records exact compressed sizes/hashes. Extract all parts into one directory. Historical evidence paths and the user's existing server were not overwritten.

The browser tests exercise the existing unified sphere/cylinder/planar/wrapped workspace, controls, history, navigation, mixed libraries and v1–v4 persistence. There is no Cube-C2A UI to photograph or interact with. Screenshots and measurements are genuine existing-editor regression evidence, not a cube-editor demonstration or physical-phone acceptance. Successful tests use the existing retain-on-failure trace policy; no generic successful-test trace is invented.

The [skip comparison](evidence/cube-c2a-browser-skip-preservation.json) verifies that skipped test identities match the accepted C1 browser result exactly, rather than treating a changed skip count as successful coverage.

[The source registry](evidence/cube-c2a-tested-source.json) covers **262 source/test/driver/configuration files**. Source remains frozen across every final validation phase, including browser tests. The [preservation proof](evidence/cube-c2a-preservation.json) verifies **2,520 protected baseline Git blobs, including 2,209 historical evidence files**, outside the six explicitly updated current documents. It also checks every prior 256-file C1 final source SHA, accepted P1C production HTML/main JS, exact eleven-phase roadmap table, thirteen-entry geometry priority order, and Issue #1/#2 references. New cube modules have no product/dev/browser-test importers. Working-file SHA256 values describe tested local bytes, including line endings; the implementation inventory also supplies portable committed Git blob identities.

All canonical sample ownership, identities, mathematical semantics, revisions, source-epoch checks, connected Smooth, atomic publication, existing editors/history and v1–v4 codecs remain unchanged. No original website, existing Worlds, shared/production database, Docker, hosting or deployment work was performed. Browser Save/Open checks use isolated local test storage. The existing Worlds integration direction and deferred flat/wrapped visual overhaul remain in the roadmap. Historical evidence is preserved rather than regenerated in place.

## Outstanding limitations and stopping point

- The provider cannot recover unobserved pointer travel. Ambiguity policies are deterministic and context-aware, with explicitly reported unresolved choices.
- Bounded exact arithmetic can terminate on difficult/long input before nominal input/dab caps. C2B must handle this as explicit failure without silent thinning, false completion or invented committed history.
- A pump is synchronous. Full route certification and increasingly complex algebraic center decisions cannot be interrupted halfway through that call. The measured 25 ms pump and wide N256 total preparation cost require deliberate C2B scheduling/worker design and device evidence, without raising numerical budgets.
- C2A does not provide a revision lease, prepared-stroke transaction, asynchronous executor, complete gesture Undo/Redo, cube renderer/editor or Save/Open. C1 preparations in this pass are dry runs, never committed as a fake gesture.
- There is no new selectable cube world, visual acceptance, physical-phone test or production integration claim.

Cube-C2A is delivered for independent review. **Do not begin Cube-C2B or another pass without authorization.**
