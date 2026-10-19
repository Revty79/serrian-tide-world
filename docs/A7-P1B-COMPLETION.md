# A7-P1B completion and review handoff

Approved baseline: `267903f69e5cdff3f2151944b971002ca7d2be7e`. Work is delivered on `main`; exact implementation SHA and hash-linked receipt are in [a7-p1b-delivery.json](evidence/a7-p1b-delivery.json). Ember review and owner hands-on acceptance remain outstanding. Stop here; no sphere migration or new geometry has begun.

## Result and cause

Cylinder paths, intrinsic certified distances, candidate preparation, Smooth neighborhoods and exact dry-run stencils run in a dedicated preparation worker. The main thread remains the sole terrain/history/checkpoint authority. Each ready dab waits for revision validation, visibility validation, the existing atomic commit, and an acknowledgement before the scratch epoch advances. Numerical formulas, precision and work budgets are unchanged.

The old host's 3 ms RAF budget only checked time between synchronous calls. It could neither preempt a long distance/path operation nor prepare more work until a later frame. Large footprints therefore accumulated both geographical calculation cost and repeated frame waits. The worker removes that numerical work from the UI task queue and avoids using display frames as the computation clock. It does not make physical-distance mathematics free. Ordinary small dabs can pay snapshot/worker/acknowledgement overhead; the tables include those results.

A combined backlog/device-loss test also caught scheduler starvation in the prototype Save drain. Repeated high-priority `scheduler.yield()` polling could outrun worker-message delivery. The final drain waits for a shared progress signal, then executes the existing persistence boundary. The dedicated regression and native browser tests cover this failure.

## Verification on frozen source

- Numerical suite: 444 passed, zero failures or skips.
- Accepted-source equivalence: 84 cases, 2,396,072 canonical UInt32 word comparisons; zero mismatches in words or complete history, including signed zero, both cap centers, both shared rims, cuts and a large rim footprint. Exact Undo/Redo also compared.
- Full browser suite: 316 passed, 4 pre-existing intentional skips, 0 failures, 0 flaky cases.
- TypeScript and production bundle succeeded. Built localhost GPU/CPU smoke profiles verify N256 worker loading, exact history, v4 Save/Open and unchanged mixed v1-v4 libraries.
- 220 source/test/script/config files remained byte-identical across all eleven final phases. See [final checks](evidence/a7-p1b-final-checks.json).
- 1052 historical completion/evidence files and 198 pre-existing protected source/config files match the approved baseline. Fresh old-test receipts are archived separately. The eleven-phase master table and Issue #1 are preserved.

New browser coverage exercises all four tools at all three details on hardware WebGL2 and forced CPU display fallback, fast/slow mouse input, native N256 pen/touch/two-finger takeover, cancellation, stale results, recovery, Undo during backlog, release/drain, held Save, GPU loss and disposal. Existing planar, wrapped, spherical globe/net/limb, persistence and native input regressions remain in the full suite.

## Actual painting latency

The same immutable saved terrain is used in every before/after context: the accepted A7-P1A-R nine-stroke fixtures at N128/N256 and an equivalent N64 fixture.

Each cell is **p50 / p95 / maximum milliseconds** from actual DOM pointer down to the first different decoded terrain pixels in a compositor PNG. Twelve held strokes per row, three per brush. Null/unobserved pixel changes are counted separately, never treated as zero. Pointer/footprint overlays are hidden only during pixel measurement. This is a capture experiment with overhead, not photon latency or the legacy next-RAF proxy. Mouse moves use 32 ordinary or 80 large-rim positions with 16 ms host cadence. Native browser delivery and processing can take longer.

Desktop is 1440×900. Mobile is Pixel 7 layout on this desktop computer with page-main-thread 4× throttling. The GPU is the actual reported desktop AMD device, not a phone GPU. Chromium's [page throttling implementation](https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/core/inspector/inspector_emulation_agent.cc) uses a main-thread throttler; worker execution is not claimed to be slowed by the same factor. Physical weaker-device performance remains unverified.

### Ordinary physical-side stroke (83,700 m)

| Display | Profile | N | Before ms | After ms | Unobserved before / after | Queue peak before / after | Main task max before / after ms |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: |
| hardware | desktop | 64 | 38.5 / 42.8 / 42.8 | 76.2 / 122.4 / 122.4 | 0 / 0 | 1 / 2 | 6.9 / 8.1 |
| hardware | desktop | 128 | 40.2 / 49.4 / 49.4 | 90.5 / 133.6 / 133.6 | 0 / 0 | 1 / 3 | 8.2 / 10.6 |
| hardware | desktop | 256 | 54.7 / 66.9 / 66.9 | 80.4 / 118.0 / 118.0 | 0 / 0 | 1 / 2 | 10.7 / 8.8 |
| hardware | mobile | 64 | 62.8 / 92.6 / 92.6 | 73.4 / 122.5 / 122.5 | 0 / 0 | 1 / 1 | 47.1 / 59.1 |
| hardware | mobile | 128 | 64.4 / 92.1 / 92.1 | 75.0 / 99.4 / 99.4 | 0 / 0 | 1 / 1 | 53.3 / 51.5 |
| hardware | mobile | 256 | 84.2 / 123.1 / 123.1 | 105.0 / 130.9 / 130.9 | 0 / 0 | 1 / 1 | 58.0 / 67.8 |
| fallback | desktop | 64 | 70.5 / 81.6 / 81.6 | 120.1 / 200.1 / 200.1 | 0 / 0 | 1 / 3 | 14.4 / 16.3 |
| fallback | desktop | 128 | 67.5 / 80.8 / 80.8 | 136.3 / 166.4 / 166.4 | 0 / 0 | 1 / 2 | 13.8 / 15.8 |
| fallback | desktop | 256 | 83.1 / 96.5 / 96.5 | 104.6 / 141.3 / 141.3 | 0 / 0 | 1 / 2 | 17.3 / 16.3 |
| fallback | mobile | 64 | 136.5 / 200.0 / 200.0 | 188.3 / 217.9 / 217.9 | 0 / 0 | 1 / 1 | 60.9 / 49.2 |
| fallback | mobile | 128 | 136.9 / 146.8 / 146.8 | 202.2 / 224.0 / 224.0 | 0 / 0 | 1 / 1 | 47.5 / 51.5 |
| fallback | mobile | 256 | 159.1 / 236.6 / 236.6 | 204.8 / 287.1 / 287.1 | 0 / 0 | 1 / 1 | 48.1 / 50.9 |

### Large radius near shared rim (377,100 m)

| Display | Profile | N | Before ms | After ms | Unobserved before / after | Queue peak before / after | Main task max before / after ms |
| --- | --- | ---: | --- | --- | ---: | ---: | ---: |
| hardware | desktop | 64 | 64.4 / 138.7 / 138.7 | 104.1 / 151.6 / 151.6 | 0 / 0 | 2 / 4 | 19.2 / 17.4 |
| hardware | desktop | 128 | 154.6 / 190.5 / 190.5 | 115.5 / 173.2 / 173.2 | 0 / 0 | 5 / 4 | 23.2 / 23.8 |
| hardware | desktop | 256 | 485.5 / 571.2 / 571.2 | 222.9 / 266.3 / 266.3 | 0 / 0 | 14 / 6 | 18.6 / 19.0 |
| hardware | mobile | 64 | 135.1 / 156.3 / 156.3 | 99.4 / 112.7 / 112.7 | 0 / 0 | 2 / 1 | 102.8 / 106.8 |
| hardware | mobile | 128 | 358.8 / 403.2 / 403.2 | 112.9 / 123.9 / 123.9 | 0 / 0 | 7 / 1 | 109.7 / 111.6 |
| hardware | mobile | 256 | 1163.7 / 1298.4 / 1298.4 | 257.5 / 296.6 / 296.6 | 0 / 0 | 45 / 4 | 151.3 / 123.9 |
| fallback | desktop | 64 | 105.8 / 114.1 / 114.1 | 86.0 / 113.9 / 113.9 | 0 / 0 | 1 / 2 | 19.9 / 19.0 |
| fallback | desktop | 128 | 190.5 / 208.0 / 208.0 | 115.6 / 273.2 / 273.2 | 0 / 0 | 4 / 5 | 21.0 / 16.8 |
| fallback | desktop | 256 | 536.4 / 571.1 / 571.1 | 247.0 / 281.9 / 281.9 | 0 / 0 | 14 / 6 | 18.1 / 25.7 |
| fallback | mobile | 64 | 198.5 / 218.2 / 218.2 | 188.7 / 207.5 / 207.5 | 0 / 0 | 1 / 1 | 94.2 / 103.3 |
| fallback | mobile | 128 | 394.1 / 544.1 / 544.1 | 215.3 / 254.8 / 254.8 | 0 / 0 | 4 / 1 | 114.7 / 105.2 |
| fallback | mobile | 256 | 1146.2 / 3621.3 / 3621.3 | 323.4 / 1865.9 / 1865.9 | 0 / 0 | 13 / 3 | 134.6 / 111.6 |

Per-brush p50/p95/max, native handler/dispatch costs, frame gaps, release-to-coherent times, accepted/discarded input counts and exact before/after payload hashes are in [the measured summary](evidence/a7-p1b-painting-summary.json). Raw datasets preserve every case, stage window, maximum, input trace, renderer diagnostics, queue sample and heap measurement. N256 first-repetition Chromium traces retain the main and worker timelines.

Identical native-coordinate sequences have 288/288 matching final word hashes in the timing comparison. The independent 84-case accepted-source proof remains the authoritative full-word/full-history numerical comparison. Timing outliers and unchanged-pixel cases should be inspected in raw records before inferring a universal speedup. GPU/CPU rendering and relief code are unchanged from A7-P1A-R.

## Bounds, tradeoffs and shared foundation

- At most one active worker task and one preloaded spare. Painting and preview are exclusive; document disposal terminates both.
- One source epoch and one prepared proposal per active worker. Snapshot bytes are 16,136 / 65,032 / 261,128 at N64/128/256. Canonical storage is never transferred.
- Original UI limits remain: 8,192 candidates, 4,096 distance queries, 65,536 distance boxes, 65,536 prepared patch bytes, 2,048 dabs; original aggregate stroke and history bounds remain intact.
- Transport adds a bounded before-word array: at most 98,304 bytes for indices/before/after combined. Main-side accepted-input accounting covers messages in transit and the worker queue: at most 256 pending positions plus the initial dab, 65,536 accepted over the whole stroke. No queue overwrites or event thinning. Overflow and cancellation report discarded positions explicitly.
- Exact history retains its existing 32-entry / 8 MiB limits. Timing stage rings retain 512 samples plus aggregate maxima/counts/totals; host presentation rings remain bounded. Main-heap receipts exclude worker VMs, total process memory and GPU memory.
- Worker startup failure can use the original cooperative engine before any proposal is committed; its old blocking costs remain a compatibility limitation. Failures after a commit retain the exact undoable prefix and require a new gesture.
- Large certified operations still take time off the UI thread. Atomic history/commit/display handoff and GPU uploads remain main-thread work. CPU display fallback still has the earlier quality/performance limits. Interpolation and relief add no numerical terrain detail.

The shared ordering, revision lease and progress signal live in [surface-work.ts](../src/editor/surface-work.ts). The provider-specific protocol/runtime and authoritative patch validation stay in cylinder modules. The [painting contract and concrete globe/net adoption plan](SURFACE-PAINTING-CONTRACT.md) identify reusable orchestration and visual policies while preserving spherical cube-face ownership, poles, corners, changing visibility, exact v3 persistence, and planar wrapping/edge assistance. No numerical authority or display migration was applied to another shape.

## Evidence and delivery

- [Accepted-source numerical proof](evidence/a7-p1b-golden-equivalence.json)
- [Full desktop/mobile browser results](evidence/a7-p1b-full-browser-results.json)
- [Measured performance and exact comparison](evidence/a7-p1b-painting-summary.json)
- [Source and historical preservation](evidence/a7-p1b-preservation.json)
- [Desktop N256 editing](evidence/a7-p1b-desktop-hardware-n256-editing.png) and [mobile N256 editing](evidence/a7-p1b-mobile-hardware-n256-editing.png)
- [Changed-file inventory and checksums](evidence/a7-p1b-verification.json), [implementation delivery receipt](evidence/a7-p1b-delivery.json)

Queue peaks before the change are the engine FIFO; after the change they conservatively include in-flight messages and the current unfinished endpoint. Preview prelude tasks are reported separately from the native-down-to-drain task distribution. Small stage durations can quantize to zero at browser clock resolution. Profiling is opt-in and normal editing does not collect bulk stage samples.

All work stayed in the standalone repository. No original Serrian Tide website, Worlds, database, Production, hosting, geometry expansion, or server GPU service was changed. Local production-bundle previews are localhost validation only. Await Ember review and owner hands-on acceptance.

The preserved held-checkpoint regression now holds real worker result delivery alongside paused RAF to examine accepted input before any commit. All prior revision, unload-protection, saved-badge and exact checkpoint assertions remain. Pausing presentation alone no longer pauses worker calculation. The new certificate regression independently reproduces and fixes cancellation immediately after publication.

### Stage costs and outliers

Stage CPU times overlap (for example, distance is inside preparation), so do not sum them as a critical path. Native handler timings include the read-only observer. Timestamp-to-capture delay is a DOM metric, not physical device latency. Detailed stage p50/p95/max/count/total and the twelve slowest visible-change cases are retained in the summary.

| Dataset | Realm | Stage | Calls | CPU total ms | Maximum call ms | Sampled p50 / p95 / max ms |
| --- | --- | --- | ---: | ---: | ---: | --- |
| before-final | main | candidatePlan | 1008 | 17.1 | 0.6 | 0.0 / 0.1 / 0.6 |
| before-final | main | candidateSelection | 103488 | 477.3 | 0.8 | 0.0 / 0.0 / 0.8 |
| before-final | main | distance | 36216 | 556.2 | 3.0 | 0.0 / 0.1 / 3.0 |
| before-final | main | footprintPreparation | 1080 | 507.7 | 7.8 | 0.2 / 1.3 / 7.8 |
| before-final | main | reactRender | 858 | 2999.0 | 9.3 | 1.8 / 7.1 / 9.3 |
| before-final | main | overlay | 1296 | 531.2 | 3.5 | 0.2 / 1.4 / 3.5 |
| before-final | main | dabPreparation | 4968 | 1096.0 | 1.9 | 0.2 / 0.6 / 1.9 |
| before-final | main | canonicalCommit | 720 | 33.1 | 1.1 | 0.0 / 0.2 / 1.1 |
| before-final | main | historyCheckpointDisplayHandoff | 720 | 366.5 | 6.5 | 0.3 / 1.6 / 6.5 |
| before-final | main | gpuElevationUpload | 360 | 1139.5 | 33.0 | 1.8 / 8.5 / 33.0 |
| before-final | main | gpuSubmit | 360 | 35.7 | 0.5 | 0.1 / 0.3 / 0.5 |
| before-final | main | path | 4752 | 759.6 | 4.2 | 0.1 / 0.4 / 4.2 |
| before-final | main | spacing | 5328 | 52.8 | 0.8 | 0.0 / 0.1 / 0.8 |
| before-final | main | smoothNeighborhood | 7866 | 145.0 | 2.5 | 0.0 / 0.1 / 2.5 |
| before-final | main | cpuRasterSlice | 5256 | 11445.4 | 12.8 | 0.9 / 7.7 / 12.8 |
| after-final | main | previewSourceSnapshot | 288 | 31.0 | 0.6 | 0.1 / 0.4 / 0.6 |
| after-final | main | reactRender | 961 | 3322.9 | 11.1 | 1.8 / 7.2 / 11.1 |
| after-final | main | overlay | 1296 | 607.7 | 5.6 | 0.3 / 1.5 / 5.6 |
| after-final | main | sourceSnapshot | 144 | 15.9 | 0.7 | 0.1 / 0.4 / 0.7 |
| after-final | main | workerDispatch | 144 | 22.2 | 0.5 | 0.1 / 0.4 / 0.5 |
| after-final | main | canonicalCommit | 720 | 36.3 | 1.0 | 0.0 / 0.2 / 1.0 |
| after-final | main | historyAndCommit | 720 | 117.8 | 2.2 | 0.1 / 0.4 / 2.2 |
| after-final | main | historyCheckpointDisplayHandoff | 720 | 452.5 | 5.0 | 0.5 / 1.7 / 5.0 |
| after-final | main | gpuElevationUpload | 360 | 1139.2 | 20.3 | 1.8 / 9.0 / 20.3 |
| after-final | main | gpuSubmit | 360 | 39.4 | 0.6 | 0.1 / 0.3 / 0.6 |
| after-final | main | cpuRasterSlice | 5256 | 11804.7 | 15.0 | 1.0 / 7.8 / 15.0 |
| after-final | worker | snapshotLoad | 144 | 2635.5 | 39.7 | 15.8 / 32.8 / 39.7 |
| after-final | worker | candidatePlan | 720 | 34.2 | 0.3 | 0.0 / 0.2 / 0.3 |
| after-final | worker | candidateSelection | 74520 | 239.9 | 0.4 | 0.0 / 0.0 / 0.4 |
| after-final | worker | distance | 27288 | 410.9 | 1.0 | 0.0 / 0.1 / 1.0 |
| after-final | worker | dabPreparation | 4968 | 946.9 | 3.2 | 0.1 / 0.5 / 3.2 |
| after-final | worker | scratchAcknowledgement | 720 | 55.3 | 0.6 | 0.0 / 0.3 / 0.6 |
| after-final | worker | path | 4752 | 550.3 | 1.2 | 0.1 / 0.3 / 1.2 |
| after-final | worker | spacing | 5328 | 48.6 | 0.2 | 0.0 / 0.1 / 0.2 |
| after-final | worker | smoothNeighborhood | 5634 | 70.9 | 2.0 | 0.0 / 0.1 / 2.0 |
| after-final | previewWorker | snapshotLoad | 144 | 2691.8 | 40.7 | 16.3 / 35.0 / 40.7 |
| after-final | previewWorker | candidatePlan | 144 | 30.1 | 0.4 | 0.2 / 0.3 / 0.4 |
| after-final | previewWorker | candidateSelection | 13680 | 99.2 | 0.8 | 0.0 / 0.1 / 0.8 |
| after-final | previewWorker | distance | 4320 | 165.7 | 1.5 | 0.0 / 0.1 / 1.5 |
| after-final | previewWorker | footprintPreparation | 912 | 444.4 | 2.8 | 0.2 / 2.0 / 2.8 |
| after-final | previewWorker | smoothNeighborhood | 1080 | 23.3 | 0.5 | 0.0 / 0.1 / 0.5 |
| before-final-stress | main | candidatePlan | 1080 | 20.7 | 0.8 | 0.0 / 0.1 / 0.8 |
| before-final-stress | main | candidateSelection | 1137292 | 4753.9 | 3.8 | 0.0 / 0.0 / 0.4 |
| before-final-stress | main | distance | 699381 | 100749.5 | 12.2 | 0.1 / 0.6 / 12.2 |
| before-final-stress | main | footprintPreparation | 9325 | 27734.7 | 27.9 | 1.0 / 14.4 / 27.9 |
| before-final-stress | main | reactRender | 905 | 3266.2 | 15.7 | 4.2 / 7.1 / 15.7 |
| before-final-stress | main | overlay | 1342 | 3447.6 | 22.3 | 1.4 / 9.7 / 22.3 |
| before-final-stress | main | dabPreparation | 53064 | 87578.1 | 18.9 | 0.5 / 7.0 / 18.9 |
| before-final-stress | main | canonicalCommit | 792 | 93.2 | 2.0 | 0.0 / 0.4 / 2.0 |
| before-final-stress | main | historyCheckpointDisplayHandoff | 792 | 2184.5 | 21.8 | 1.4 / 9.3 / 21.8 |
| before-final-stress | main | path | 11664 | 1484.5 | 4.9 | 0.1 / 0.4 / 4.9 |
| before-final-stress | main | spacing | 12312 | 116.8 | 0.8 | 0.0 / 0.1 / 0.8 |
| before-final-stress | main | gpuElevationUpload | 396 | 1346.8 | 27.5 | 1.9 / 9.3 / 27.5 |
| before-final-stress | main | gpuSubmit | 396 | 41.5 | 1.9 | 0.1 / 0.3 / 1.9 |
| before-final-stress | main | smoothNeighborhood | 159487 | 2217.5 | 7.6 | 0.0 / 0.1 / 1.6 |
| before-final-stress | main | cpuRasterSlice | 5652 | 8338.1 | 13.3 | 0.8 / 5.3 / 13.3 |
| after-final-stress | main | previewSourceSnapshot | 288 | 42.7 | 0.8 | 0.1 / 0.6 / 0.8 |
| after-final-stress | main | reactRender | 961 | 3412.3 | 9.7 | 1.7 / 7.5 / 9.7 |
| after-final-stress | main | overlay | 1368 | 3624.3 | 31.8 | 1.4 / 9.9 / 31.8 |
| after-final-stress | main | sourceSnapshot | 144 | 15.6 | 0.9 | 0.0 / 0.4 / 0.9 |
| after-final-stress | main | workerDispatch | 144 | 25.0 | 0.5 | 0.2 / 0.4 / 0.5 |
| after-final-stress | main | canonicalCommit | 792 | 96.4 | 1.9 | 0.1 / 0.4 / 1.9 |
| after-final-stress | main | historyAndCommit | 792 | 549.2 | 6.9 | 0.4 / 2.6 / 6.9 |
| after-final-stress | main | historyCheckpointDisplayHandoff | 792 | 1752.0 | 18.9 | 1.2 / 7.5 / 18.9 |
| after-final-stress | main | gpuElevationUpload | 396 | 1303.3 | 31.7 | 1.8 / 8.9 / 31.7 |
| after-final-stress | main | gpuSubmit | 396 | 44.6 | 0.7 | 0.1 / 0.3 / 0.7 |
| after-final-stress | main | cpuRasterSlice | 5652 | 8567.5 | 18.1 | 0.8 / 5.7 / 18.1 |
| after-final-stress | worker | snapshotLoad | 144 | 2735.3 | 37.2 | 16.0 / 35.2 / 37.2 |
| after-final-stress | worker | candidatePlan | 792 | 37.8 | 0.4 | 0.0 / 0.2 / 0.4 |
| after-final-stress | worker | candidateSelection | 843864 | 1384.2 | 2.4 | 0.0 / 0.0 / 0.6 |
| after-final-stress | worker | distance | 519864 | 26992.5 | 8.0 | 0.1 / 0.2 / 4.0 |
| after-final-stress | worker | dabPreparation | 53064 | 31275.1 | 10.7 | 0.2 / 2.0 / 10.7 |
| after-final-stress | worker | scratchAcknowledgement | 792 | 110.9 | 0.7 | 0.1 / 0.4 / 0.7 |
| after-final-stress | worker | path | 11664 | 979.2 | 2.1 | 0.1 / 0.2 / 2.1 |
| after-final-stress | worker | spacing | 12312 | 62.8 | 0.2 | 0.0 / 0.0 / 0.2 |
| after-final-stress | worker | smoothNeighborhood | 118440 | 640.2 | 1.3 | 0.0 / 0.1 / 0.5 |
| after-final-stress | previewWorker | snapshotLoad | 144 | 2818.3 | 41.0 | 16.2 / 37.3 / 41.0 |
| after-final-stress | previewWorker | candidatePlan | 144 | 31.3 | 1.2 | 0.2 / 0.3 / 1.2 |
| after-final-stress | previewWorker | candidateSelection | 150960 | 450.4 | 2.9 | 0.0 / 0.0 / 0.4 |
| after-final-stress | previewWorker | distance | 92160 | 6396.6 | 9.0 | 0.1 / 0.3 / 9.0 |
| after-final-stress | previewWorker | footprintPreparation | 9504 | 7804.7 | 15.9 | 0.4 / 2.4 / 15.9 |
| after-final-stress | previewWorker | smoothNeighborhood | 21396 | 185.4 | 0.7 | 0.0 / 0.1 / 0.7 |

The existing displayed-transform protection still stops input that becomes unsafe across a cut, invalid view or device transition. Such interruption reports discarded pending positions and preserves the committed prefix; it is not a promise to retain every position after cancellation. The held-Save/device-loss regression exercises an explicit drain before serialization.

## Additional production and hardware checks

The original complete cylinder workflows, native pen/touch input, held Save and normal creation/reopening were also rerun with hardware D3D11: **8 passed, zero failures or retries**. Source hashes remained unchanged. See [hardware results](evidence/a7-p1b-hardware-input-browser-results.json) and [source check](evidence/a7-p1b-hardware-input-source-check.json). The four built-bundle GPU/CPU desktop/mobile smoke profiles all passed exact Undo/Redo, v4 reopening, identities/dimensions and unchanged mixed v1-v4 libraries, with actual numerical worker prepared/done messages and no page errors.

The supplementary production experiment serves a verbatim accepted-baseline build and the final build. It uses normal `/`, DOM controls and read-only IndexedDB payload hashes, without DEV inspection, stage profiling or Playwright source tracing. It measures native Raise strokes on blank -100 m geography: N64 ordinary physical view and N256 large-rim surface map, three repetitions reset by exact Undo. All **24 matched saved payloads and initial payloads are identical** before/after. These scenes differ from the sculpted four-brush experiment; the results must not replace or be pooled with it. Pixel capture still adds overhead.

| Display | Profile | N / scene | Before p50 / p95 / max ms | After p50 / p95 / max ms | Unobserved before / after |
| --- | --- | --- | --- | --- | ---: |
| hardware | desktop | 64 ordinary | 42.6 / 44.2 / 44.2 | 46.4 / 51.4 / 51.4 | 0 / 0 |
| hardware | desktop | 256 large rim | 488.8 / 489.9 / 489.9 | 162.8 / 163.7 / 163.7 | 0 / 0 |
| hardware | mobile | 64 ordinary | 41.7 / 54.8 / 54.8 | 49.9 / 55.8 / 55.8 | 0 / 0 |
| hardware | mobile | 256 large rim | 1076.5 / 1116.4 / 1116.4 | 216.9 / 239.8 / 239.8 | 0 / 0 |
| fallback | desktop | 64 ordinary | 57.5 / 59.8 / 59.8 | 59.6 / 64.0 / 64.0 | 0 / 0 |
| fallback | desktop | 256 large rim | 476.0 / 523.6 / 523.6 | 181.5 / 183.0 / 183.0 | 0 / 0 |
| fallback | mobile | 64 ordinary | 88.9 / 131.4 / 131.4 | 88.9 / 131.8 / 131.8 | 0 / 0 |
| fallback | mobile | 256 large rim | 1089.6 / 1102.4 / 1102.4 | 240.8 / 274.8 / 274.8 | 0 / 0 |

Only three samples underpin each supplementary cell. [Raw production comparison and exact hashes](evidence/a7-p1b-production-painting-summary.json) are retained. Normal-resolution first-pixel response is not universally faster; worker/snapshot/message scheduling and the display path can cost more than an already cheap small dab. CPU fallback and physical weak-device behavior remain limits. Demanding numerical preparation is moved off the UI thread, without relaxing its geography or budgets. Owner testing remains necessary to judge practical feel.

Across the 12 sculpted ordinary display/profile/detail groups, median first-visible latency fell in 0 and rose in 12; unobserved pixel changes and capture overhead remain explicit in the full table.

Across the 12 sculpted rim display/profile/detail groups, median first-visible latency fell in 11 and rose in 1; unobserved pixel changes and capture overhead remain explicit in the full table.

### Actual elapsed validation times

| Phase | Seconds | Result |
| --- | ---: | --- |
| numerical | 6.73 | exit 0; zero source changes |
| golden | 7.39 | exit 0; zero source changes |
| build | 0.51 | exit 0; zero source changes |
| bundle | 0.54 | exit 0; zero source changes |
| browser | 1234.72 | exit 0; zero source changes |
| production-hardware | 18.31 | exit 0; zero source changes |
| production-fallback | 11.80 | exit 0; zero source changes |
| before-final | 424.71 | exit 0; zero source changes |
| after-final | 476.83 | exit 0; zero source changes |
| before-final-stress | 1161.54 | exit 0; zero source changes |
| after-final-stress | 953.58 | exit 0; zero source changes |
| Additional hardware native/workspace suite | 71.43 | 8 passed |
| production-before | 118.26 | exit 0; 24 exact-reset samples |
| production-after | 68.78 | exit 0; 24 exact-reset samples |

The final bundle contains a 48.65 kB worker, 470.29 kB application JS (149.43 kB gzip), and 19.76 kB CSS (4.81 kB gzip); the build transformed 100 modules.

### Files and review material

- Cylinder host/session/history: `CylinderPreview.tsx`, `cylinder-preview-session.ts`, `cylindrical-history.ts`.
- Worker protocol/runtime/entry, ordered stroke host and patch validator: `cylinder-work-protocol.ts`, `cylinder-work-runtime.ts`, `cylinder-preparation.worker.ts`, `cylinder-worker-stroke.ts`, `cylinder-prepared-patch.ts`.
- Shared ordering/revision/progress and opt-in measurement: `surface-work.ts`, `painting-metrics.ts`.
- Existing numerical files contain timing wrappers and the optional ready-dab barrier; formulas and original limits are preserved in `cylindrical-stroke.ts`, `cylindrical-brush.ts`, `cylindrical-smoothing.ts`, `cylinder-path.ts`, `cylinder-distance.ts`.
- Independent numerical/worker tests, normal-workspace browser tests/observer, accepted-source equivalence driver, and reproducible painting measurement driver provide the new proof. The checkpoint regression retains its assertions with a real worker-delivery barrier.
- README, architecture, master roadmap and painting contract document the completed pass and stop boundary. The [complete path/size/raw SHA256/Git blob inventory](evidence/a7-p1b-verification.json) also lists every delivered evidence artifact.

The [interactive before/after screenshot gallery](evidence/a7-p1b-visual-review.html) contains 24 matched contexts and 48 genuine PNGs. All N256 first-repetition CDP Chromium timing traces for every brush/display/profile/scenario are delivered, together with raw records for every timing stroke. 18 Playwright interaction traces from the new cylinder painting tests are delivered and hash-listed in the preservation receipt. Traces for unchanged historical tests and redundant whole-context Playwright performance traces remain local investigation output; their full JSON test results and the independently recorded CDP timing traces are delivered. No pre-existing evidence was removed.

The timing sequences intentionally accumulate all four tools across three repetitions within a context. Before/after use the same initial saved fixture and the same sequence; every post-stroke hash is compared. Quantile samples are small and clock-resolution zeros are possible. The host was not a physically isolated benchmark appliance. No across-device or universal speedup is claimed.
