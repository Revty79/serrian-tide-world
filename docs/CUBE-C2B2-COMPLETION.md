# Cube-C2B2 completion and review report

The owner supplied Ember's approval of Cube-C2B1 for development progression: implementation `48048844039a8d85aa9d9997bac104140ea64f68`, accepted delivery/baseline `701062a9c257a1546dbde566e8571ed88f979456`. Cube-C2B2 implements the separately authorized responsive numerical execution checkpoint on standalone `main`. Independent C2B2 review and owner direction remain outstanding.

The implementation SHA and exact committed inventory are recorded in the [delivery receipt](CUBE-C2B2-DELIVERY.md), added after the implementation commit. **Stop after C2B2. Cube-D and history-capacity work have not begun.**

## Result and implementation inventory

The optional adapter preserves one authoritative terrain and exact gesture-history lifecycle. Short paths stay cooperative; longer paths use two bounded pure-path workers. The host fully validates physical witnesses, compares complete accepted-C2A replicas and computes every C1 footprint/before/after word locally. Workers receive no elevation arrays and cannot publish terrain or advance an unacknowledged source epoch. Failure and cancellation preserve the exact committed prefix as one operation.

| File | Responsibility |
| --- | --- |
| `src/editor/solid-cube-session.ts` (modified) | Trusted path factory, health check and canonical acknowledgement; original cooperative constructor retained |
| `src/editor/solid-cube-responsive-session.ts` | Same authority/history facade, normal-task/event scheduling, bounded reusable pool and disposal |
| `src/editor/cube-worker-path.ts` | Measured selection, exact checkpoint handoff, ordered transport, full validation and safe fallback/failure |
| `src/editor/cube-path-work-protocol.ts` | Task/generation/configuration/epoch/ordinal/ACK contract and transport bounds |
| `src/editor/cube-path-work-runtime.ts` | Pure unchanged-C2A replay and one acknowledged live step; no terrain/history |
| `src/editor/cube-path.worker.ts` | Actual module-worker realm and bounded normal-task scheduling |
| `src/editor/cube-path-certificate.ts` | Independent exact physical witness and nearest/even rounding-cell checks |
| `src/editor/cube-work-value.ts` | Bounded cooperative exact comparison and immutable owned cloning |
| `src/editor/cube-responsive.test.ts` | 167 exactness, geometry, protocol, capacity, failure and lifecycle tests |
| `scripts/verify-cube-responsive.mjs` | Worker executor against the accepted independent Python/finite Float32 reference |
| `tests/fixtures/cube-node-worker.ts` | Deterministic message-turn correctness fixture; not timing evidence |
| `tests/fixtures/cube-execution.ts`, `dev/cube-work.html` | Matched actual browser processing/stage/frame measurement fixture, without rendering |
| `tests/fixtures/cube-warm.ts` | Separate same-session cold/warm experiment; original cold fixture unchanged |
| `tests/fixtures/cube-worker-exercise.ts`, `tests/fixtures/cube-fault.worker.ts`, `tests/cube-responsive.spec.ts` | Native worker publication/history comparisons, actual crash/error observations and interaction traces |
| `tests/fixtures/cube-preparation-probe.ts`, `tests/fixtures/cube-preparation-probe.worker.ts`, `dev/cube-preparation.html` | Evaluated but unadopted verified C1 worker prototype |

This is **one modified existing source and nineteen added source/test/driver/fixture files**. No accepted geometry, C1, C2A, history, persistence, existing test, dependency or production entry changed. Six current canonical documents update acceptance/scope; this report and [the responsive specification](CUBE-RESPONSIVE-EXECUTION.md) are new. The classified delivery manifest separates all eight documentation files and isolated evidence from numerical files. The subsequent receipt/inventory adds only two delivery records.

## Numerical and protocol guarantees

[The specification](CUBE-RESPONSIVE-EXECUTION.md) defines the authority contract and equivalence induction. Handoff replays only exact pure path actions, checking full prior events/statistics before any new worker result is adopted. It never replays committed geography. Both workers execute unchanged C2A; full result comparison includes route/tie policy, exact carried spacing, rational physical witnesses, ordinal centers, rounding bounds and work counters. Independent host checks bind the result to physical endpoints, connected faces/folds and exact nearest/even rounding cells.

The paired programs are redundancy, **not two independently designed mathematical solvers or protection against arbitrary Byzantine worker programs**. Their accepted formulas and separate independent references remain the mathematical basis. The host independently computes all numerical terrain changes through unchanged C1 and validates every canonical source word through unchanged atomic publication/history. No worker-supplied elevation proposal is trusted.

ACKs reflect actual committed dab count, changed-word count and canonical revision. No-op dabs do not advance revision. One outstanding physical step per role, at most two stored bodies and eight pending inputs include in-transit work. Before adoption, startup/construction failure can resume the original frozen local path in exact order. After adoption, faults fail explicitly and retain the committed prefix. Release drains accepted input; cancellation/disposal stops pending work. Complete strokes can reuse two workers with new task/source bindings; failed/cancelled workers are terminated.

## Executed correctness and preservation checks

**391 focused tests passed** (167 new plus 224 accepted). **928 complete numerical regression tests passed**, with zero failures, cancellations or skips. Typecheck and production build passed. [The validation ledger](evidence/cube-c2b2-validation.json) records exact commands, exit codes and elapsed times.

The independent forced-worker executor passed **44 small gestures, eight large gestures and four fault cases**. The small reference independently calculated **255 dabs / 6,630 Float32 words**; the large executor compared **5,898,288 complete canonical words**, plus **3,826 history words** and **392 independently checked fault words**, across **7,022 geometry cases**. Full raw N128/N256 vectors are delivered. The original native executor was rerun against the same reference. Every committed word/revision and complete history are compared, including signed zero, no-op Redo, branching, ambiguity, reverse paths, every physical edge/corner and literal sparse/dense four-face routes.

The unchanged C2A reference passed 53 cases, 142 certified paths, 895 centers and 1,684 rounding bounds plus 32 C1 dry runs. C1 passed 1,052 geometry cases, 110 dabs / 2,860 independently calculated words and 215 selected large checks. Cube-B passed 301 cases, 837 segments and 412 crossings. Cube-A verified 1,966,080 reciprocal neighbors. These are separately executed reference checks; they are not inferred from matching replicas.

The [final 287-file registry](evidence/cube-c2b2-tested-source.json), [earlier numerical-phase registry](evidence/cube-c2b2-pre-browser-tested-source.json) and [freeze certificate](evidence/cube-c2b2-source-freeze.json) distinguish one browser-runner correction: Playwright requires the trace option at file scope. The initial broad-browser attempt executed zero tests; its log is retained, the option was moved, and typecheck/browser execution resumed. That run was interrupted before completion; its [partial log](evidence/cube-c2b2-browser-interrupted-log.txt) is preserved and the entire desktop/mobile suite was restarted under the [resumption record](evidence/cube-c2b2-browser-resumption.json). A later chat interruption terminated that restart after 297 recorded completions. The remaining 93 cases ran separately; the delivered aggregate matches every collected test identity exactly once, and all 58 actual native trace attachments were recovered. No successful full-suite process exit is inferred for either interrupted segment. All numerical/runtime/fixture hashes stayed identical; only that browser-spec option moved. Performance phases verify the final registry before and after each sequential run.

The [preservation certificate](evidence/cube-c2b2-preservation.json) verifies **2,652 protected tracked files**, including **2,324 historical evidence files**, against accepted Git blobs. All **267 unchanged accepted source files** match their prior hashes. The only existing source edit is the session scheduling hook. Production page/main-bundle hashes match accepted P1C; no cube code enters the product bundle. All eleven master phases, thirteen geometry priorities and Issues #1/#2 remain intact. Existing v1–v4 saves, sphere/cylinder/flat/wrapped numerical behavior, UI and mixed libraries are preserved. No main website, Worlds, database, hosting, Docker or Production work occurred.

## Actual browser-worker evidence

**386 browser tests passed; four unchanged conditional skips; zero failures or flaky tests.** The exact 390-test collected inventory is covered across interrupted and resumed segments on desktop and Pixel 7 mobile. The final 93-case segment exited successfully; 297 prior completions are preserved from actual reporter lines and all native attachments from actual traces. This is an explicit aggregate, not a claimed successful single-process full-suite exit. Tests used the owned strict-port server `127.0.0.1:5255`. [Structured result](evidence/cube-c2b2-browser-aggregate-result.json), [interrupted full-run log](evidence/cube-c2b2-browser-second-interrupted-log.txt), [remaining-case log](evidence/cube-c2b2-browser-remainder.txt), [standard remaining-case result](evidence/cube-c2b2-browser-remainder-result.json), [collected inventory](evidence/cube-c2b2-browser-collected-tests.json), [recovered completions](evidence/cube-c2b2-browser-recovered-completions.json), [per-test journal](evidence/cube-c2b2-browser-remainder-journal.jsonl), [trace-attachment recovery](evidence/cube-c2b2-native-trace-recovery.json.gz), [configuration](evidence/cube-c2b2-browser-config.ts.txt), [skip preservation](evidence/cube-c2b2-browser-skip-preservation.json).

The 58 new native-worker cases include six cases with observed native worker crashes. [Full actual wire/interaction proofs](evidence/cube-c2b2-native-worker-proofs.json.gz), [summary and exact compression hashes](evidence/cube-c2b2-native-worker-summary.json), and genuine [desktop](evidence/cube-c2b2-native-desktop.png) / [mobile](evidence/cube-c2b2-native-mobile.png) fixture screenshots are delivered. The artifact set contains 361 files (359 generated and two unchanged accepted inputs), 94,369,387 uncompressed bytes, including native-worker Playwright traces. [Archive manifest](evidence/cube-c2b2-browser-artifacts.json), [verified decompressed-entry proof](evidence/cube-c2b2-browser-archive-proof.json); extract all 3 parts into one directory: [cube-c2b2-browser-artifacts-1.zip](evidence/cube-c2b2-browser-artifacts-1.zip), [cube-c2b2-browser-artifacts-2.zip](evidence/cube-c2b2-browser-artifacts-2.zip), [cube-c2b2-browser-artifacts-3.zip](evidence/cube-c2b2-browser-artifacts-3.zip). Historical evidence and the user's existing server were not overwritten.

Native tests compare every canonical word and source epoch after each publication at N128/N256 for all four tools. Additional cases cover construction failure, observed startup timeout, disabled/unavailable workers, stale/corrupted/duplicate/reordered messages, external edits, cancellation while queued/starting/waiting/preparing/collecting/reserved/just published, repeated strokes/Undo/branching and disposal. Crash cases throw in a real worker realm and wait for the native ErrorEvent before checking that pending C1 work cannot paint. Test shims use the actual production runtime, not fake numerical implementations. Mouse/pen/touch and existing editor regressions run in the broader unchanged-workspace suite; there is no new cube input UI to claim as accepted.

Screenshots show the **isolated numerical fixture**, not cube terrain rendering. Wire traces record actual task/generation/source ACKs, ordered physical route/dab results and native errors. Playwright traces retain the real page/worker interaction. These prove processing/lifecycle behavior, not visible cube-pixel latency or owner hands-on acceptance.

## Measured selection and performance

The matched many-bend workloads show a concrete reduction in main-thread path blocking: N128 mobile maximum 80.3 to 7.9 ms, N256 mobile 76.9 to 10.5 ms; desktop maxima fell from 19.4 to 2.2 ms and 16.1 to 1.2 ms. Desktop median total drain increased (N128 362.3 to 710.4 ms; N256 615.0 to 837.3 ms), while the emulated mobile medians decreased. The initial dab remains local; N128 mobile median first authoritative change stayed 48.3 ms. Across the separate task traces, mobile maximum task duration fell from 82.78 to 48.30 ms, so this is still not a universal frame-time guarantee. These are sequential workload observations under the qualifications below.

[The matched summary](evidence/cube-c2b2-performance-summary.json) verifies exact source/final word hashes, every committed center/revision, complete history and full-word Undo/Redo for **416 default pairs, 64 representative forced-worker pairs and 144 repeated-session pairs**. Default retains the same 368 complete / 48 explicitly failed-prefix outcomes as B1. The 64 forced trials cover ordinary-edge, wide-edge, many-bend and ambiguous-reverse at both resolutions/all tools/profiles. Repeated-session runs retain all three trials: 48 cold and 96 warm per mode, one session at a time. Ordinary/wide short paths stay cooperative in auto; many-bend paths actually acquire/reuse workers. No warmup was silently discarded.

Raw matrix files are exact verified gzip streams: [baseline](evidence/cube-c2b2-baseline-performance.json.gz), [final auto](evidence/cube-c2b2-final-auto-performance.json.gz), [forced](evidence/cube-c2b2-final-worker-performance.json.gz), [warm B1 control](evidence/cube-c2b2-warm-baseline-performance.json.gz), [warm auto](evidence/cube-c2b2-warm-final-performance.json.gz). [Compression proof](evidence/cube-c2b2-final-compression.json), [environment and qualifications](evidence/cube-c2b2-performance-environment.json), [sequential run ledger](evidence/cube-c2b2-performance-validation.json), [final source freeze](evidence/cube-c2b2-performance-source-freeze.json). The warm B1 control uses the exact accepted Core via the archived measurement-only transform; it was collected after implementation, while the primary 416-trial baseline predates all accepted source edits.

The table pools four tools × two trials per group. Times are **p50 / p95 / maximum milliseconds**. Outcome counts are complete/failed prefix; N256 wide-edge rows are failures, not full strokes. Pump/frame sample counts and every stage appear in the summary. Path pump counts differ between schedulers, so their quantiles are scheduler-work distributions, not equal-count route-query comparisons.

| Profile | N | Workload | Mode | Trials (complete/failed) | First authoritative change | Drain | Main path pump | Frame gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| desktop | 128 | ordinary-edge | B1 | 8 (8/0) | 4.30 / 5.50 / 5.50 | 21.10 / 27.30 / 27.30 | 0.30 / 1.40 / 1.50 | 15.90 / 16.40 / 16.40 |
| desktop | 128 | ordinary-edge | auto | 8 (8/0) | 3.00 / 8.70 / 8.70 | 17.70 / 38.00 / 38.00 | 0.30 / 1.10 / 1.80 | 16.00 / 16.60 / 16.60 |
| desktop | 128 | wide-edge | B1 | 8 (8/0) | 259.10 / 438.00 / 438.00 | 696.30 / 1101.80 / 1101.80 | 0.30 / 1.60 / 1.90 | 16.70 / 16.70 / 16.80 |
| desktop | 128 | wide-edge | auto | 8 (8/0) | 265.10 / 474.30 / 474.30 | 650.40 / 985.40 / 985.40 | 0.20 / 1.60 / 1.70 | 16.70 / 16.70 / 16.80 |
| desktop | 128 | bending-65 | B1 | 8 (8/0) | 10.40 / 19.90 / 19.90 | 362.30 / 478.70 / 478.70 | 0.60 / 7.80 / 19.40 | 16.70 / 16.70 / 16.80 |
| desktop | 128 | bending-65 | auto | 8 (8/0) | 9.20 / 19.20 / 19.20 | 710.40 / 937.00 / 937.00 | 0.00 / 0.10 / 2.20 | 16.70 / 16.70 / 16.80 |
| desktop | 256 | ordinary-edge | B1 | 8 (8/0) | 8.90 / 12.70 / 12.70 | 38.40 / 62.70 / 62.70 | 0.30 / 1.50 / 1.60 | 16.60 / 16.70 / 16.70 |
| desktop | 256 | ordinary-edge | auto | 8 (8/0) | 8.00 / 17.00 / 17.00 | 32.00 / 48.90 / 48.90 | 0.30 / 1.40 / 2.20 | 16.10 / 16.70 / 16.70 |
| desktop | 256 | wide-edge | B1 | 8 (0/8) | 844.30 / 1311.60 / 1311.60 | 1556.50 / 2346.10 / 2346.10 | 0.40 / 1.80 / 1.80 | 16.70 / 16.70 / 16.80 |
| desktop | 256 | wide-edge | auto | 8 (0/8) | 704.20 / 1023.60 / 1023.60 | 1326.30 / 1982.70 / 1982.70 | 0.40 / 1.90 / 1.90 | 16.70 / 16.70 / 16.80 |
| desktop | 256 | bending-65 | B1 | 8 (8/0) | 32.90 / 68.80 / 68.80 | 615.00 / 881.60 / 881.60 | 0.50 / 8.00 / 16.10 | 16.70 / 16.80 / 16.80 |
| desktop | 256 | bending-65 | auto | 8 (8/0) | 22.40 / 35.90 / 35.90 | 837.30 / 1057.80 / 1057.80 | 0.00 / 0.10 / 1.20 | 16.70 / 16.70 / 16.80 |
| mobile CDP4x | 128 | ordinary-edge | B1 | 8 (8/0) | 18.40 / 37.90 / 37.90 | 94.90 / 152.60 / 152.60 | 1.40 / 6.10 / 7.60 | 16.70 / 16.80 / 16.80 |
| mobile CDP4x | 128 | ordinary-edge | auto | 8 (8/0) | 17.60 / 40.40 / 40.40 | 97.30 / 168.50 / 168.50 | 1.40 / 5.10 / 7.30 | 16.60 / 16.80 / 16.80 |
| mobile CDP4x | 128 | wide-edge | B1 | 8 (8/0) | 1250.50 / 2206.50 / 2206.50 | 3492.40 / 5885.20 / 5885.20 | 1.10 / 6.50 / 7.00 | 16.70 / 16.80 / 16.80 |
| mobile CDP4x | 128 | wide-edge | auto | 8 (8/0) | 1179.40 / 1951.50 / 1951.50 | 3348.30 / 5423.60 / 5423.60 | 1.20 / 5.30 / 6.10 | 16.70 / 16.70 / 16.80 |
| mobile CDP4x | 128 | bending-65 | B1 | 8 (8/0) | 48.30 / 128.10 / 128.10 | 1711.70 / 2253.30 / 2253.30 | 2.70 / 38.60 / 80.30 | 16.70 / 33.30 / 66.80 |
| mobile CDP4x | 128 | bending-65 | auto | 8 (8/0) | 48.30 / 83.10 / 83.10 | 1237.90 / 1767.80 / 1767.80 | 0.00 / 0.50 / 7.90 | 16.70 / 16.70 / 16.80 |
| mobile CDP4x | 256 | ordinary-edge | B1 | 8 (8/0) | 57.10 / 81.60 / 81.60 | 232.70 / 329.20 / 329.20 | 1.40 / 6.70 / 7.70 | 16.70 / 16.70 / 16.80 |
| mobile CDP4x | 256 | ordinary-edge | auto | 8 (8/0) | 58.30 / 97.00 / 97.00 | 242.00 / 405.10 / 405.10 | 1.60 / 6.60 / 7.10 | 16.70 / 16.70 / 16.80 |
| mobile CDP4x | 256 | wide-edge | B1 | 8 (0/8) | 4783.20 / 7479.70 / 7479.70 | 9491.40 / 14900.10 / 14900.10 | 1.50 / 6.90 / 6.90 | 16.70 / 16.80 / 16.80 |
| mobile CDP4x | 256 | wide-edge | auto | 8 (0/8) | 4801.90 / 7435.60 / 7435.60 | 9598.20 / 14742.80 / 14742.80 | 3.80 / 8.40 / 8.40 | 16.70 / 16.70 / 16.80 |
| mobile CDP4x | 256 | bending-65 | B1 | 8 (8/0) | 178.60 / 369.90 / 369.90 | 2905.40 / 4714.90 / 4714.90 | 2.60 / 38.70 / 76.90 | 16.70 / 16.80 / 66.80 |
| mobile CDP4x | 256 | bending-65 | auto | 8 (8/0) | 181.20 / 364.10 / 364.10 | 2438.70 / 4259.50 / 4259.50 | 0.00 / 0.50 / 10.50 | 16.70 / 16.70 / 16.80 |

Same-session many-bend cold/warm detail (four tools, one cold and two warm each). Cold means a new numerical session/pool within the running browser; browser/module caches were not forcibly cleared per trial:

| Profile | N | Session | Mode | Trials | Drain p50/p95/max | Main path pump p50/p95/max | Worker-attached trials |
| --- | --- | --- | --- | --- | --- | --- | --- |
| desktop | 128 | cold | B1 | 4 | 366.40 / 503.90 / 503.90 | 0.60 / 8.10 / 19.60 | 0 |
| desktop | 128 | cold | auto | 4 | 877.90 / 953.90 / 953.90 | 0.00 / 0.10 / 1.80 | 4 |
| desktop | 128 | warm | B1 | 8 | 347.20 / 463.40 / 463.40 | 0.60 / 8.10 / 19.30 | 0 |
| desktop | 128 | warm | auto | 8 | 447.10 / 555.80 / 555.80 | 0.00 / 0.10 / 1.70 | 8 |
| desktop | 256 | cold | B1 | 4 | 635.20 / 948.50 / 948.50 | 0.60 / 8.30 / 16.70 | 0 |
| desktop | 256 | cold | auto | 4 | 1072.50 / 1465.10 / 1465.10 | 0.00 / 0.10 / 1.60 | 4 |
| desktop | 256 | warm | B1 | 8 | 643.60 / 961.20 / 961.20 | 0.60 / 8.20 / 18.40 | 0 |
| desktop | 256 | warm | auto | 8 | 705.10 / 987.50 / 987.50 | 0.00 / 0.10 / 1.80 | 8 |
| mobile | 128 | cold | B1 | 4 | 1741.50 / 2218.40 / 2218.40 | 2.60 / 38.20 / 78.20 | 0 |
| mobile | 128 | cold | auto | 4 | 1398.60 / 1745.50 / 1745.50 | 0.00 / 0.60 / 9.60 | 4 |
| mobile | 128 | warm | B1 | 8 | 1694.10 / 2117.70 / 2117.70 | 2.70 / 39.80 / 79.70 | 0 |
| mobile | 128 | warm | auto | 8 | 1110.30 / 1546.50 / 1546.50 | 0.00 / 0.60 / 9.70 | 8 |
| mobile | 256 | cold | B1 | 4 | 2995.30 / 4677.20 / 4677.20 | 2.80 / 39.00 / 77.50 | 0 |
| mobile | 256 | cold | auto | 4 | 2451.10 / 4223.20 / 4223.20 | 0.10 / 0.60 / 8.70 | 4 |
| mobile | 256 | warm | B1 | 8 | 2946.20 / 4591.40 / 4591.40 | 2.60 / 38.50 / 78.20 | 0 |
| mobile | 256 | warm | auto | 8 | 2341.70 / 4190.80 / 4190.80 | 0.00 / 0.50 / 10.90 | 8 |

Actual CDP toplevel task traces use 24 representative trials per profile/mode. Full task durations and the execution-only overlap are separate; source seeding/assertions can share a task crossing a mark. Trace overhead is present and these trials are separate from the main matrix.

| Profile | Mode | Trials | Task samples | Full task p50/p95/max | Execution overlap p50/p95/max |
| --- | --- | --- | --- | --- | --- |
| desktop | baseline | 24 | 125,476 | 0.07 / 0.39 / 16.03 | 0.07 / 0.39 / 16.03 |
| mobile | baseline | 24 | 153,774 | 0.03 / 1.60 / 82.78 | 0.03 / 1.60 / 82.78 |
| desktop | final | 24 | 140,726 | 0.05 / 0.25 / 9.38 | 0.05 / 0.25 / 9.21 |
| mobile | final | 24 | 169,955 | 0.03 / 1.59 / 48.30 | 0.03 / 1.59 / 48.30 |

Raw traces and summaries: [B1 desktop](evidence/cube-c2b2-baseline-trace-desktop.json.gz), [B1 mobile](evidence/cube-c2b2-baseline-trace-mobile.json.gz), [auto desktop](evidence/cube-c2b2-final-trace-desktop.json.gz), [auto mobile](evidence/cube-c2b2-final-trace-mobile.json.gz). Exact compressed/raw hashes are recorded alongside each trace summary. The initial dab always stays local; worker startup can delay subsequent ordered path progress even when the first numerical change has already committed. C1/atomic costs remain; a lower path maximum does not mean every main-thread task or complete stroke became faster.

The baseline was collected before modifying accepted implementation files. The [baseline source/freeze](evidence/cube-c2b2-baseline-freeze.json) covers all 268 accepted sources plus measurement harness/configuration hashes. Its 416 trials include two rounds, N128/N256, all four tools, six faces, ordinary/wide edges/corners, multi-face, 65-bend and ambiguous immediate-reversal workloads. All raw samples are retained in exact verified compressed form. The original reported 32.25 ms synchronous path step was a different Node experiment; it is not an apples-to-apples comparator for this browser baseline.

Auto's eight-certified-interval threshold follows measured path cost: the first eight many-bend intervals had maximum **2.2 ms desktop / 9.6 ms page-target CDP4x**; the first twelve reached **19.6 ms** on that mobile-emulated profile. Later path pumps reached **19.4 / 80.3 ms**. These measured bounds inform selection; they are not universal frame guarantees. Forced mode exists to test offload on shorter paths without claiming it is the faster default.

The separate C1 worker evaluation ran **64 trials / 32 pairs**, three single dabs per trial, all tools, both resolutions/radii and desktop/CDP4x. All final words and per-dab revisions matched. The verified worker prototype was slower in **31/32 pairs**, with the sole faster result being N256 mobile wide Smooth. It used one fresh private snapshot per three dabs (393,224 bytes N128 / 1,572,872 N256), full host recomputation and ACK before worker-source advancement. Typical startup was hundreds of milliseconds; source loading was only a portion. Fixed cooperative-then-worker order and one pair per condition limit inference. [The prototype evaluation](evidence/cube-c2b2-preparation-summary.json) is retained; this does not rule out other future designs. The adopted engine instead copies **zero terrain buffers** to path workers.

Reported frame gaps and tasks measure scheduling. First authoritative commit measures actual numerical change; it is separate from total drain and from future first-visible terrain-pixel latency. Worker startup/readiness, replay work, transport/queue residuals, acceptance ACKs, host witness validation, C1 preparation, history reservation and atomic publication are reported separately. Transport residuals include queue scheduling and serialization; they are not isolated hardware-wire latency. Main page heap is not total worker RSS. Page-target CDP4x does not guarantee matching worker throttling and is not physical-phone testing. Trials are sequential and no unrelated test suite runs during controlled performance collection; no randomized or physical-device causal claim is made.

## Explicit history-capacity and responsiveness limits

**The 65,536-word gesture-history ceiling is unchanged.** The required N256 wide-edge examples fail after one committed dab for all four brushes. Exact native/worker cap tests compare complete canonical words, source revisions, full history and prefix Undo/Redo. In the expanded baseline matrix, N256 wide-edge, four-face-long and ambiguous-reverse produce **48 failed-prefix trials**, from four tools × two rounds × two profiles × three scenarios. These are explicit failures, not completed gestures. Worker scheduling cannot make their history union fit. No implicit operation splitting, thinning or quantization occurs.

Route offload adds worker/module startup, exact path replay, two redundant computations, messages and host validation. C1 preparation remains on the main thread with unchanged budgets; atomic publication/history replay remains indivisible. Wide brushes can retain substantial total preparation time. Background work can reduce path blocking while increasing total drain. Neither a path policy nor a good average proves all future cube strokes frame-safe, and no visual response standard has been accepted yet.

## Proposed next checkpoint and stopping point

Ember should independently review the published numerical/protocol equivalence, actual task/frame costs and retained evidence. The owner can then decide whether to authorize a **separate large-stroke/history-capacity design and measurement checkpoint before normal hands-on cube painting**. Compare bounded exact larger unions, exact chunk/compression or snapshots, and explicit creator-visible limits while preserving one held gesture, signed-zero words, atomic conflicts and weaker-device memory/replay costs. This report proposes evaluation; it changes no capacity.

Cube-D rendering remains separately gated, followed by the approved editor, persistence/workspace and hollow-cube checkpoints. The current result is a numerical engine for those later consumers. **Stop after Cube-C2B2 and await independent review and owner authorization.**

Large JSON evidence is delivered as exact verified gzip streams; see the [compression catalogue](evidence/cube-c2b2-evidence-compression.json). Decompress to the original JSON names before replaying archived analysis scripts.
