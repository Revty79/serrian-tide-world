# A6-P1 — N=256 spherical editing performance hardening

Repository `Revty79/serrian-tide-world`, branch `main`. Approved baseline: **`e7862418b010b276dfbb8c736d421f36f901480a`**. The owner explicitly authorized this bounded implementation, roadmap correction, verification and direct push. The implementation SHA is recorded in [delivery metadata](evidence/a6-p1-delivery.json). Ember's independent review and owner hands-on acceptance remain separate. **Stop after P1; do not begin the next geometry phase automatically.**

## Result and optimization decision

P1 reduces CPU globe raster work while producing the original RGBA bytes at the original quality and pixel budgets. The terrain engines, surface geometry, numerical tools, physical brush distances, D2-R input/visibility scheduling, history, persistence codecs, IDs and database adapter are unchanged. No server GPU, service, dependency or permanent interface panel was introduced.

Profiling preceded product changes. In a real N=256 mobile-emulation editing profile, globe raster rendering accounted for **3,407.7 ms** of sampled self time. Nearest matching ancestor attribution separately found **351.0 ms** in cap candidate enumeration, **342.2 ms** in Smooth neighborhoods, **230.5 ms** in other numerical brush work, **533.2 ms** in incremental textures, **82.2 ms** in previews and **124.7 ms** in history. Sampling attribution includes nested geometry and allocation costs and is approximate. Browser/test/idle costs are recorded separately. Initial display-cache preparation was measured outside this editing profile.

This justified targeting the raster first. The numerical paths already retain exact pre-dab semantics and bounded work. P1 leaves their formulas and caches intact rather than changing computation order or physical precision. Incremental updates report zero unnecessary full texture rebuilds in the new workload.

The renderer now reuses **camera-local** x/y/z and byte alpha for identical viewport/layout/quality. These values are independent of camera orientation, numerical resolution, World identity and terrain revision. Camera rotation still projects every requested ray against the actual frame and current textures. Fixed cube-face bases are evaluated as signed-axis permutations; atan, bilinear interpolation, shading, horizon coverage and antialiasing retain their original arithmetic/results. It does not reduce pixel counts, blur geography or approximate brush distances.

The shared ray cache retains at most **two entries / 8 MiB** of typed payload, evicts before allocating another entry and constructs only on demand. Larger public raster requests use the uncached path. It contains no world directions, elevations or copied texture pixels and runs no background loop. Geometry edits always sample the latest existing RGBA textures. Viewport/zoom/quality changes use an exact layout key; camera and terrain changes cannot reuse stale world-dependent data.

## Controlled comparison

All comparisons use the same Windows host, AMD Ryzen 5 5600G, Node 24.18.0, Playwright 1.64.1 and Chromium 156.0.8078.4 (revision 1248). Desktop is 1440×900; Pixel 7 emulation is 412×839 with **4× CPU throttling**. Each controlled run uses one worker, zero retries and traces enabled. There are three repeats per scenario/resolution/profile, followed by a separate three-repeat N=256 mobile confirmation against an exact Git export of the approved baseline. The final confirmation includes the final cache allocation/eviction ordering. Full regression evidence uses two workers and is not substituted for controlled performance evidence.

Every scenario starts with identical seeded numerical terrain. It performs a fixed sparse stroke, a 48-step dense stroke, Smooth refinement, Flatten refinement, a 1,800 ms held limb stroke or manual globe rotation. Save/Undo/Save checks exact restoration after every edit. Every round reopens the saved terrain, exercising fresh display preparation and subsequent editing. All paired fixed-input saved payload hashes match the approved code. Time-bound limb strokes can reveal different amounts of geography when frame throughput changes; their actual dab/step counts are reported separately. Exact physical correctness is established by the retained D2-R independent geometry and canonical replay tests, not by demanding equal output from different timed camera trajectories.

Medians average the middle pair for even counts. p95 uses the observed lower order statistic at `floor((n−1) × 0.95)`. Observation counts and three-repeat variability are retained; small samples, especially nine-observation sparse-input latency summaries, are not population percentile estimates.

The [full comparison](evidence/a6-p1-performance-comparison.json) includes raw distributions, every trial median, numerical/texture work, preparation, input presentation, host/version details, heap observations and CPU attribution. Raw initial datasets use `a6-p1-before-*` and `a6-p1-after-*`; final confirmation datasets are [baseline](evidence/a6-p1-before-confirm-mobile-n256.json) and [candidate](evidence/a6-p1-after-confirm-mobile-n256.json). An initial N128 baseline collection was interrupted by a local Vite reload while the comparison copy was being exported; that measurement was discarded and rerun before product edits. Export is completed before starting the reproduction server.

### Final N=256 mobile confirmation

| Scenario | Paint median ms, before → after | Paint p95 ms | Frame-gap median / p95 ms | Input-presentation p95 ms |
| --- | --- | --- | --- | --- |
| sparse | 42.6 → 35.5 | 141.3 → 85.1 | 50.0 / 83.3 → 33.4 / 66.7 | 761.2 → 639.3 |
| dense | 25.1 → 16.8 | 42.4 → 33.1 | 16.7 / 49.9 → 16.7 / 33.4 | 93.9 → 68.5 |
| smooth | 50.7 → 43.9 | 55.4 → 49.9 | 50.0 / 83.4 → 16.7 / 66.7 | 1319.7 → 1138.0 |
| flatten | 48.4 → 33.8 | 129.1 → 97.4 | 49.9 / 83.4 → 33.3 / 83.4 | 783.1 → 615.7 |
| limb | 24.9 → 17.2 | 43.4 → 33.2 | 33.3 / 50.0 → 16.7 / 50.0 | 109.3 → 84.6 |
| rotation | 40.7 → 25.3 | 44.2 → 29.6 | 16.7 / 50.0 → 16.7 / 33.4 | — → — |

Limb-paint trial medians were **25.1 / 25.0 / 24.8 ms** before and **17.45 / 17.1 / 17.2 ms** after. Every candidate median is below every baseline median. This is a repeatable improvement in the identified bottleneck, with a **30.9% reduction** in pooled median full viewport paint time. Rotation median paint time fell **38.0%**, from 40.7 to 25.25 ms. These paint tasks include numerical pumping, texture patches, previews and raster presentation; they are not renderer-only microseconds or browser compositor frame times.

For held drawing, frame-gap median fell **33.3 → 16.7 ms**, maximum **150 → 100 ms**, while **p95 remained 50 ms**. Input-to-presentation p95 fell **109.3 → 84.6 ms**. No universal 60 FPS or physical-phone guarantee follows from this result.

| Initial controlled profile | N | Limb-paint median ms, before → after | Rotation-paint median ms |
| --- | --- | --- | --- |
| desktop | 128 | 11.0 → 6.3 | 21.8 → 11.8 |
| desktop | 256 | 11.8 → 7.8 | 22.4 → 13.0 |
| mobile (4× CPU) | 128 | 22.1 → 14.3 | 37.2 → 21.9 |
| mobile (4× CPU) | 256 | 25.0 → 17.6 | 41.0 → 25.3 |

The initial N128 comparisons also improve rendering with identical fixed-input payloads. The fixed-work [raster benchmark](evidence/a6-p1-raster-microbench.json) runs six alternating AB/BA rounds against the frozen original renderer, using exactly 25 camera positions, identical textures and identical raster budgets per trial. Warm-up/cold-construction samples remain visible; it independently isolates raster CPU work from browser input and scheduling. Total CPU-profile self time is not treated as a fixed-work speed comparison because faster time-bound limb drawing can render more frames.

A separate [final-code N128 mobile confirmation](evidence/a6-p1-after-final-mobile-n128.json) repeated all six scenarios three times using the delivered runner. Limb-paint median was **22.1 → 14.0 ms**, rotation **37.2 → 21.5 ms**; sparse/dense Raise, Smooth and Flatten also had lower paint medians. All fixed-input payloads matched their baseline pairs. The [runner conditions/source check](evidence/a6-p1-after-final-conditions.json) confirms unchanged runtime/test sources.

## Numerical work, preparation and remaining latency

Numerical pump and incremental-texture timings remain in the comparison. In the final confirmation, Smooth's median numerical pump total is **394.7 → 410.3 ms** and median texture total **132.8 → 134.1 ms** per fixed stroke. Its complete stroke wall time is **1,738.2 → 1,731.8 ms**, effectively unchanged. P1 does not claim to accelerate that numerical kernel. The source is unchanged and exact output is preserved.

The maximum cumulative session atomic-step/begin measurement was **98.9 ms before / 94.7 ms after** in this larger-radius Smooth workload. This counter includes initial brush/history setup and complete generator steps; it is not an isolated arithmetic-kernel timer. These values are from the new matching workload, not directly comparable with D2-R's 0.08R/held-stroke 40.3 ms reference. Atomic dabs, pre-dab snapshots and history copies can still exceed the nominal 6/16 ms scheduling slice. Original maximum eight dabs/frame, 2,048 accepted queued points, segment work limit and history budgets remain. Backpressure continues to pause limb rotation until accepted work catches up.

Initial N256 mobile display-cache preparation measured **561.0 → 576.9 ms** in the final confirmation. Three reopen measurements were **516.9 / 487.4 / 481.9 ms** before and **491.8 / 469.9 / 469.4 ms** after. The construction code is unchanged; these variations are not claimed as a preparation optimization. The older F1 ~912 ms reference used a different recorded environment/workload and is not used to calculate a P1 gain.

Sparse physical jumps can still produce substantial queued latency: final confirmation input-to-presentation p95 is **761.2 → 639.3 ms** for Raise and **1,319.7 → 1,138.0 ms** for Smooth. Retaining all accepted geography is intentional; drawing faster must not skip input or coarsen physical spacing. More numerical/worker/GPU design would need a separately reviewed change. This checkpoint establishes the demonstrated raster improvement, not the elimination of every N256 stall.

## Memory and rendering implications

Authority remains **393,224 bytes at N128 / 1,572,872 at N256**. The existing six RGBA/index caches remain **1,984,560 / 7,901,232 bytes**. The new camera-local ray cache is additional: final mobile confirmation retained **2,304,866 bytes** in edit/settled modes and **2,618,641 bytes** with navigation/settled modes. Its module-wide maximum is 8 MiB and two entries, shared across terrain resolutions. The authority and original textures are not duplicated. Canvas images/backing stores, scratch pixels, history, JS objects and garbage-collection transients remain additional; this is not process RSS accounting.

A separate [actual-workspace retained-memory probe](evidence/a6-p1-memory.json) performs the same N256 edit, three reopen cycles and navigation in sequential baseline/candidate mobile contexts, with two explicit post-work garbage collections outside timing measurements. Post-GC backing storage was 14.30 → 16.80 MiB; used JS heap 8.77 → 8.81 MiB. Both contexts saved the same terrain payload hash. Raw readings, exact authority/cache/raster bytes and traces are retained; this is not a physical-device or process-RSS measurement.

The raw non-normalized CDP readings in the comparison are also retained. For example, end-of-work backing storage was 44.35 MB before and 59.56 MB after, while used JS heap was approximately 11.72 / 11.75 MB. Garbage-collection timing and detached temporary buffers make those observations unsuitable as a retained-memory or leak claim. The separate probe distinguishes that observation from the explicit retained cache budget. No forced garbage collection occurs during timed editing comparisons.

The [frozen renderer oracle](../tests/fixtures/spherical-raster-reference.ts) is copied from the approved baseline with import paths adjusted only. New tests compare every returned RGBA byte and raster dimension across 256 viewport/zoom/orientation/texture combinations, quality changes, texture refinement, camera rotations, cropped limbs and oversized uncached requests. This preserves existing coastline appearance, seam continuity, proportions, interpolation and brush alignment. Display interpolation creates no new geographic detail or higher-resolution/tiled terrain.

## Verification and browser evidence

- **190/190 numerical tests pass**, no failures/skips; recorded test duration 3,771.20 ms.
- **238 browser cases pass; four intentional skips**, total 242, zero failures/retries/flaky cases. Two are retained desktop native-touch skips; two are opt-in CPU profiling diagnostics. All 236 pre-existing D2-R cases remain. Final duration 12.20 minutes.
- **TypeScript and production build pass**, 73 modules, recorded Vite compilation 219 ms.
- **128 unaffected source/fixture/configuration/benchmark files** match the approved baseline after EOL normalization; **220 historical completion/evidence files** are byte-identical. Frozen full-run digests cover 131 runtime/test/configuration files.

The [verification receipt](evidence/a6-p1-verification.json) contains the complete changed-file inventory and hashes, protected baseline sources, preserved historical receipts and every browser result. [Full browser JSON](evidence/a6-p1-browser-results.json), [numerical transcript](evidence/a6-p1-numerical.txt) and [production build transcript](evidence/a6-p1-build.txt) provide exact results. Runtime/test source digests confirm a frozen full run.

All previous A0–A6-D2-R assertions remain. The new repeated workload checks exact saved restoration, dense/sparse input, sustained assisted strokes, Smooth/Flatten refinement, manual rotation, reopened editing, zero full texture rebuilds and N128/N256 operation on desktop/mobile. Retained D2-R cases verify native mouse/pen/touch, changing-hemisphere clipping, no hidden-side writes, geodesic spacing, face seams/corners/poles, preview/settings response, one-operation exact Undo/Redo and Save/Open. Existing mixed v1/v2/v3 libraries, signed-zero payloads, failures, cancellation, fullscreen and contextual/overlay UI remain covered. No existing numerical assertion or threshold was relaxed.

| Actual workspace capture | Desktop | Mobile |
| --- | --- | --- |
| N256 after repeated editing and reopen | [Capture](evidence/a6-p1-after-desktop-n256.png) | [Capture](evidence/a6-p1-after-mobile-n256.png) |
| N128 after repeated editing and reopen | [Capture](evidence/a6-p1-after-desktop-n128.png) | [Capture](evidence/a6-p1-after-mobile-n128.png) |
| Current N256 held assisted stroke | [Capture](evidence/a6-p1-desktop-n256-limb-held.png) | [Capture](evidence/a6-p1-mobile-n256-limb-held.png) |

Current interaction traces: [desktop N256 repeated workload](evidence/a6-p1-desktop-n256-trace.zip), [mobile N256 repeated workload](evidence/a6-p1-mobile-n256-trace.zip). The copied current D2-R proof JSON under `a6-p1-*-n*-limb-proof.json` records canonical comparisons, newly exposed edits and zero final-hidden changes for those short monotonic strokes. Original D2-R receipts/screenshots remain byte-identical historical evidence. Captures are genuine browser output and are visually inspected; no map/style/interface redesign is implied by performance hardening.

## Reproduction

Use Node 24 with the existing locked dependencies and installed Playwright Chromium:

```powershell
npm.cmd test
npm.cmd run test:browser
npm.cmd run build
node scripts/measure-spherical-workspace.mjs --label reference-rerun --baseline e7862418b010b276dfbb8c736d421f36f901480a
node scripts/measure-spherical-workspace.mjs --label candidate-rerun
node scripts/measure-spherical-raster.mjs .local/raster-rerun.json
```

The controlled runner exports source inside ignored `.local`, creates no branch/worktree, starts one strict local Vite server on port 5189 and uses one browser worker, trace on and three repetitions. `--project mobile --grep 'editing N256'` narrows a confirmation run; `--cpu-profile` adds the diagnostic CPU profile. Use fresh labels to preserve recorded evidence. The complete final regression run uses a fresh server on port 5185 and two workers. Controlled timings and concurrent regression timings remain distinct.

## Changed files and roadmap

Product changes are limited to `src/rendering/spherical-raster.ts` (bounded rays and exact signed-axis projection) and the existing viewport's cache-byte diagnostic in `src/components/SphericalViewport.tsx`. New verification files are `src/rendering/spherical-raster-cache.test.ts`, `tests/fixtures/spherical-raster-reference.ts`, `tests/fixtures/spherical-performance.ts`, `tests/spherical-performance.spec.ts` and the two reproducible benchmark scripts. README and current architecture, surface, spherical and unified-workspace documentation now point to the corrected roadmap and P1 evidence. Exact paths/hashes are in the receipt.

The [master roadmap](PHASE-1-HEIGHTMAP-ROADMAP.md) now records all eleven owner-approved phases. It explicitly supersedes the separate replacement-Worlds plan. Fully functional interconnected Atlas maps—including settlement→city/town, building→interior/floors and dungeon→underground levels with reciprocal navigation—precede Phase 7 integration into existing Worlds in isolated development. Stable map/surface/feature/location/connection identities and appropriate anchors/scale/level relationships are planned early without inventing a competing lore database or implementing a persisted linkage schema now. Phases 8–9 develop bidirectional existing records and existing living-history/alternate-timeline connections. Phase 10 requires complete acceptance/compatibility/permissions verification before separately authorized production rollout; reusable modern/historical Earth remains Phase 11.

All unconventional geometries, non-destructive conversions, Heightmap Studio, professional editable cartography, measurements/terrain intelligence, true 3D and affordable GPU-free hosting remain mandatory future requirements. No such runtime feature, original-site change, database write/migration, integration, paid infrastructure or deployment is included. **Submit P1 for Ember's independent technical review and stop.**
