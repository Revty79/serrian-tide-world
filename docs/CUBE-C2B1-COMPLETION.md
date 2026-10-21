# Cube-C2B1 completion and review report

The owner supplied Ember's approval of Cube-C2A for development progression: implementation `dcd8d2378ed5173aca8d0b1c8f6044085bc5619f`, accepted delivery/baseline `d7b3ae7ca462f14eb5ac3f4a043b60c0397d2973`. Cube-C2B1 implements the separately authorized authoritative numerical stroke execution and exact history checkpoint on standalone `main`. Independent C2B1 review and owner approval remain outstanding.

The implementation SHA and exact committed file inventory are recorded in the [delivery receipt](CUBE-C2B1-DELIVERY.md), added immediately after the implementation commit. **Stop after C2B1. No C2B2 work has begun.**

## Result and changed-file inventory

The isolated session consumes accepted C2A physical centers in order, privately prepares unchanged C1 Raise/Lower/Smooth/Flatten dabs on the latest committed source, reserves complete exact gesture history and publishes one validated atomic dab at a time. Normal release drains accepted work. Cancellation, source conflict and resource/preparation/publication failures preserve only the valid committed prefix as one exact undoable operation with the actual termination reason. No partially processed gesture is called complete.

| New file | Responsibility |
| --- | --- |
| `src/editor/solid-cube-session.ts` | Exact authority/revision binding, one stroke owner, immutable settings, input backpressure, ordered staged execution, progress and termination |
| `src/editor/solid-cube-history.ts` | Private C1 jobs, cooperative net-patch reservation, exact Float32 history, bounded retention, atomic whole-gesture Undo/Redo |
| `src/editor/solid-cube-session.test.ts` | 135 correctness/adversarial tests across tools/faces/edges/corners, complete-word composition, failure, bounds and replay |
| `scripts/verify-solid-cube-execution.mjs` | Separate-executor comparison, complete per-dab words, raw large-grid vectors, prefix/fault/history evidence |
| `scripts/cube-execution-reference.py` | Verification-only independent Fraction/finite Float32 small-grid calculations, full chain/history and raw large-vector checks |
| `scripts/measure-solid-cube-execution.mjs` | Separate stage/gesture/replay timings, complete-word replay verification, process/resource observations |

All six are new. No existing source, test, driver, configuration, dependency or historical evidence file changed. Six current canonical documents update acceptance/scope: README, architecture, master roadmap, World/surface architecture, solid cube foundation and shared visual standard. This report and [the numerical specification](CUBE-STROKE-EXECUTION.md) are the two new implementation documents. The classified manifest separates these eight documentation files from numerical files and isolated evidence. The subsequent receipt/inventory adds only two delivery records.

## Numerical guarantees and exact history

The [specification](CUBE-STROKE-EXECUTION.md) defines the authority contract, merge/replay induction, revision conflicts, stage counters and hard bounds. There is one private Cube-A elevation authority. A weak ownership registry excludes concurrent sessions on the same authority. The session captures frozen C1 settings, consumes certified ordinal centers exactly once and never advances to the next preparation before the preceding dab commits.

All accepted geometry/route/spacing/brush mathematics remain byte-identical. Physical edges, singular corners, ambiguity, immediate backtracking and carried spacing are handled by C2A/B. No image shortcut, residual reset, speculative source epoch or dropped accepted input is introduced. `accept(false)` is explicit non-admission and requires a host retry. A no-op dab is executed but changes no word or revision.

History coalesces canonical indices into first-before/latest-after Float32 words, including signed zero. The complete prospective patch is reserved before publication. Subsequent Smooth dabs read updated pre-dab connected neighbors. One atomic replay restores all gesture target words. Exact net-zero gestures add no entry. New changing commits branch Redo; no-op or cancelled uncommitted work preserves it.

Normal execution stops at any unexpected revision. Explicit Undo/Redo can reconcile a disjoint external edit because every target source word is revalidated against the current epoch. An overlapping foreign conflict rejects the entire replay without writes/cursor movement. There is no force-clobber path. The independent fault fixture explicitly restores a conflicting foreign word before separately testing successful replay; that restoration is verification-only, not silent runtime recovery.

## Executed numerical and independent verification

The [validation ledger](evidence/cube-c2b1-validation.json) records commands, exit codes and wall times on the [268-file tested registry](evidence/cube-c2b1-tested-source.json). Hashes were checked before/after each phase; the final [freeze certificate](evidence/cube-c2b1-source-freeze.json) also covers browser completion.

- **224 focused tests passed**, including all 135 new tests, 39 accepted C2A tests and 50 accepted C1 tests; zero failures/skips.
- **761 complete numerical regressions passed**, covering terrain, rendering, editor/history, persistence and surface mathematics; zero failures/skips.
- TypeScript verification and production build passed. The existing Vite chunk-size warning remains; no product bundle imports the new cube execution layer.
- Original Cube-A exhaustive certificate passed unchanged, including 1,966,080 reciprocal neighbor operations. Original Cube-B independent certificate passed unchanged: 301 cases, 837 segments, 412 crossings.
- Accepted C1 independent Python oracle reran unchanged: 1,052 geometry cases, 110 complete dabs / 2,860 Float32 words, 215 selected N128/N256 words.
- Accepted C2A independent path oracle reran unchanged: 53 specified paths, 142 nonzero intervals, 895 centers and 1,684 coordinate-bound checks. Its separate 32-dab C1 integration preparations and exact terrain preservation also passed. Historical supplementary C2A orientation-matrix evidence remains untouched.

The new [execution oracle input](evidence/cube-c2b1-execution-oracle-input.json) and [certificate](evidence/cube-c2b1-execution-oracle-certificate.json) verify **44 small gestures, eight N128/N256 gestures and four fault cases**. Python independently calculated **255 complete small dabs / 6,630 words**, plus **392 complete fault-dab words**, using **7,022 geometry cases**. It checked exact pre-dab chains, source revisions, complete final/Undo/Redo words and exact history maps. It imports the accepted verification-only Fraction/brush oracle, not the new TypeScript session/history.

Coverage includes all six faces, twelve physical edges, eight singular corners, all four tools, the literal four-face 20 m curve and its dense equivalent observations, backtracking/revisits, cancellation, path/work/bookkeeping failures, no-op and signed zero. Focused tests additionally cover pump sizes 1 versus 4096, queue backpressure, disjoint/overlapping conflicts, foreign input, failed atomic publication, lower memory/entry/sample/work limits, Redo branches, net-zero gestures, ownership/disposal and long-gesture arithmetic exhaustion.

For N128/N256 all four tools, a separately implemented sequential executor applies C2A centers directly through accepted C1 jobs. **5,898,288 complete canonical word comparisons** agree after every committed dab; final/Undo/Redo arrays are exact and **3,826 net history words** are verified across small and large gestures. Eight compressed raw little-endian Uint32 vector files carry initial, per-dab actual/reference, final, Undo and Redo words with offsets/counts/hashes in the input. Python decompresses and compares actual vectors rather than trusting counts or hashes alone. The large-grid composition reference reuses accepted C1; it is not a second independent large-grid brush-mathematics implementation.

The [resource/prefix evidence](evidence/cube-c2b1-resource-prefix-evidence.json) records discarded/uncompleted work and exact history for stopped gestures. Four independently checked fault fixtures cover disjoint foreign edits, overlapping foreign edits, publication rejection before native writes and net-history sample exhaustion. All compare complete authorities; disjoint foreign words survive replay and conflicting replay leaves all words/cursor unchanged. Fault-injection wrappers exist only in tests/verifiers.

## Cooperative scheduling and actual timings

Measurements ran on Windows x64, Node v24.18.0, AMD Ryzen 5 5600G, 12 logical CPUs and approximately 31.4 GiB physical memory. These are local Node observations, not browser compositor frames or physical-phone evidence. The [raw data](evidence/cube-c2b1-performance.json), [summary](evidence/cube-c2b1-performance-summary.json) and archived summary driver retain all observations.

There are **72 trials: 68 completed gestures and four explicitly stopped wide N256 prefixes**. All four tools run at N128/N256. Ordinary edge/corner workloads have three repetitions per tool; wide edge/corner and 65-observation bending workloads have one per tool. Cube side is 1024 m; ordinary radius 40.96 m, wide radius 563.2 m and bending radius 128 m. Every trial starts from the same varied source, including signed zero, and verifies complete authority Undo/Redo, including stopped prefixes.

Source initialization/seeding is outside the timer. Begin, each `pump(256)`, stage identity, whole execution, Node turn gaps and Undo/Redo calls are timed separately. Begin across 72 trials measured p50 **2.5382 ms**, p95 **3.4476 ms**, max **6.5074 ms**, including initial path/settings validation and initial C1 job construction. Pump timing stops before diagnostic snapshots. Execution stops before final copies, assertions and replay; it includes host admission, diagnostic recording and `setImmediate` yields. Replay timers stop before complete-word assertions. All trials are retained without warmup exclusions. Quantiles use nearest rank over retained trials or pumps; group sizes differ. No unsupported before/after improvement claim is made.

| Pump stage | Calls | p50 ms | p95 ms | Max ms |
| --- | ---: | ---: | ---: | ---: |
| preparation | 111,120 | 0.1177 | 0.4942 | 3.6440 |
| history | 6,832 | 0.0350 | 0.1284 | 0.6732 |
| publication | 336 | 0.0217 | 0.2737 | 1.0779 |
| path | 1,484 | 0.7823 | 9.2353 | 32.2462 |
| path-certificate | 576 | 0.0022 | 0.0057 | 0.0413 |
| initialize | 268 | 1.5854 | 2.8821 | 3.6604 |
| finish | 68 | 0.0129 | 0.0237 | 0.1948 |

| N | Workload | Completed / trials | Execution p50 ms | Max ms |
| --- | --- | ---: | ---: | ---: |
| 128 | ordinary-edge | 12/12 | 21.7597 | 45.2869 |
| 128 | ordinary-corner | 12/12 | 13.2447 | 17.2090 |
| 128 | wide-edge | 4/4 | 596.4112 | 953.9671 |
| 128 | wide-corner | 4/4 | 386.3905 | 588.6344 |
| 128 | bending-65 | 4/4 | 521.5844 | 629.8973 |
| 256 | ordinary-edge | 12/12 | 51.9604 | 77.5262 |
| 256 | ordinary-corner | 12/12 | 37.0733 | 51.0646 |
| 256 | wide-edge | 0/4 | 1632.2546 | 2567.7490 |
| 256 | wide-corner | 4/4 | 1417.0259 | 2129.6825 |
| 256 | bending-65 | 4/4 | 784.6775 | 1118.6390 |

The largest pump was **32.2462 ms**, in C2A path work; the largest Node turn gap was **33.4274 ms**. The path stage includes route/arithmetic/emission, not just Cube-B route solving. These costs exceed a nominal 16.7 ms frame interval on this desktop. C2B1 establishes cooperative correctness, **not interactive frame-rate acceptance**. No browser paint-latency improvement is claimed.

N256 wide-corner gestures completed in 1.363–2.130 seconds. N256 wide-edge trials stopped in 1.582–2.568 seconds **after one committed dab each**, because the next net gesture union would exceed the unchanged **65,536-word atomic replay/history ceiling**. They are failed prefixes, not successful full strokes; all four preserve one exact Undo/Redo operation. Background work would not remove this numerical capacity limit.

Maximum Undo was **0.8491 ms**, Redo **0.5575 ms**. Maximum retained history was 749,568 typed bytes; history plus reservation draft peaked at 1,536,000 bytes; C1 prepared storage peaked at 749,568 bytes. Observed process RSS peaked at 250,724,352 bytes, heap-used 69,835,280 bytes and ArrayBuffers 6,558,007 bytes after execution. These figures include terrain, verification snapshots, records, VM and garbage, not merely retained engine storage.

## Hard limits, cancellation and outstanding limitations

History defaults to 32 entries / 8 MiB retained typed buffers, at most 65,536 net words per gesture and 16 million cooperative merge steps. Capacity includes chunk tails. During reservation one additional draft of at most 786,432 bytes can coexist with retained history and one C1 prepared patch of at most 786,432 bytes. The logical typed-history/draft/preparation bound is 8 MiB + 2 × 786,432 bytes, excluding authority, path arithmetic, JS overhead and garbage collection. Ended stroke handles retain scalar prefix statistics rather than evicted patch buffers.

The aggregate C1 work allowance is conservatively capped at 16 million work units per stroke. Existing per-dab/C2A ceilings remain unchanged. Lower limits support adversarial testing. Reservations exceeding samples/memory/bookkeeping fail before publication and retain the previous patch; eviction never hides uncommitted work as history.

Cancellation is synchronous at host calls and between bounded pumps. Already committed geography remains and pending work is discarded; native atomic publication cannot be interrupted halfway. C2A route/arithmetic and some initialization remain indivisible bounded work. Long gestures may exhaust 256 accepted inputs, 128 radical classes, exact refinement/bit/work bounds or aggregate C1 work. No reset, rounded-distance substitution or input thinning disguises exhaustion.

Larger atomic history, certified long-gesture continuation, background responsiveness and physical-device acceptance remain future work. C2B1 adds no cube visual workspace, so browser regressions demonstrate preservation of existing editors rather than cube pointer/paint acceptance. No persistence version, library entry or UI choice is exposed.

## Existing desktop/mobile browser preservation

**328 browser tests passed; 4 existing conditional skips; zero failures or flaky tests.** Both configured desktop and Pixel 7 mobile projects ran against the owned strict-port Vite server at `127.0.0.1:5247`. Browser wall time was **1664.623 seconds**. See the [structured result](evidence/cube-c2b1-browser-result.json), [complete log](evidence/cube-c2b1-browser-regression.txt), [exact configuration](evidence/cube-c2b1-browser-config.ts.txt) and [validation driver](evidence/cube-c2b1-validation-driver.mjs.txt).

The isolated artifact directory contains **301 files (299 generated evidence files and 2 unchanged accepted geography inputs), 89,961,124 uncompressed bytes**. It is delivered in 3 [archives](evidence/cube-c2b1-browser-artifacts.json): [cube-c2b1-browser-artifacts-1.zip](evidence/cube-c2b1-browser-artifacts-1.zip), [cube-c2b1-browser-artifacts-2.zip](evidence/cube-c2b1-browser-artifacts-2.zip), [cube-c2b1-browser-artifacts-3.zip](evidence/cube-c2b1-browser-artifacts-3.zip). Every decompressed entry's size and SHA256 was checked against the manifest; [archive proof](evidence/cube-c2b1-browser-archive-proof.json) records exact compressed sizes/hashes. Extract all parts into one directory. Historical evidence paths and the user's existing server were not overwritten.

## Preservation and integration boundaries

The [preservation certificate](evidence/cube-c2b1-preservation.json) checks **2,581 protected baseline Git blobs**, including **2,261 historical evidence files**, unchanged. All **262 prior source/test/config/dependency/driver files** match their accepted native-byte SHA256 registry; six new files bring the registry to 268. Existing Cube-A/B/C1/C2A source is unchanged. Rebuilt production HTML/main-JavaScript hashes match accepted A7-P1C exactly, and no product, dev entry or browser test imports the new modules.

The master eleven-phase table and thirteen-item geometry priority list are exactly unchanged. Issues [#1](https://github.com/Revty79/serrian-tide-world/issues/1) and [#2](https://github.com/Revty79/serrian-tide-world/issues/2), terrain measurement/prominence/slope/3D consistency, linked maps, conversion and the revised **existing Worlds** integration sequence remain explicit. Flat/wrapped visual work stays deferred. A7-P1C's original first-visible/weak-device qualifications remain.

Work stayed in the standalone repository. No original Serrian Tide website, separately rebuilt Worlds, shared/Production database, Docker, hosting, paid service, deployment or server GPU was touched. The later Next.js host retains authority over authentication, permissions, World records and storage.

## Proposed next checkpoint and review gate

[The bounded C2B2 proposal](CUBE-STROKE-EXECUTION.md#proposed-bounded-cube-c2b2-responsiveness-checkpoint) covers measured worker/hybrid placement for costly path/C1 preparation, bounded ordered source-acknowledged transport, cancellation/failure recovery, exact numerical/history preservation and actual device/frame/latency evidence. It does not authorize changes to numerical limits, cube UI, rendering or persistence. Workers alone cannot fix input/radical or atomic history capacity limits.

**C2B1 is technically complete for independent review. Owner approval and new authorization are required before C2B2.** Later Cube-D rendering, E editor, F Save/Open/workspace, G/H independently editable hollow-cube interior/exterior geography under one parent World and I final acceptance remain separate bounded passes.
