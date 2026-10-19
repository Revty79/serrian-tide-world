# A7-P1A completion — cylinder rendering and navigation

Approved baseline: `daa5aed2046cf65e96e2507a38291edd55df1594`. Implementation SHA and delivery checkpoint: [delivery metadata](evidence/a7-p1a-delivery.json). This checkpoint stops for Ember's independent review; owner hands-on acceptance remains separate. P1B, hollow spheres and other geometry work have not begun.

Cylinder physical and connected-map views now use reusable browser-GPU geometry, filtered derived colors and camera uniforms. Camera movement no longer depends on finishing a CPU ray-cast raster on the accelerated path. A separate native/DOM pointer marker follows input while exact footprint/terrain work remains pending. Numerical terrain, distances, brush formulas, visibility guards, whole-stroke history and persistence retain their existing authority.

## Implementation

The [architecture document](CYLINDER-RENDERING.md) describes the display lifecycle, resource ownership, color sampling, caps/rims, bounded meshes, pointer semantics and recovery. `SurfaceRenderer<View>` provides a small reusable interface without rewriting other surface renderers. The meshes approximate only the reference display surface; CPU projection, canonical samples and certified distances remain authoritative.

The cylinder already used `image-rendering:auto` and Canvas smoothing. Its remaining graininess came from enlarging approximately 22–40k interactive / 90–160k idle CPU pixels. WebGL2 now renders at the finite native backing size throughout interaction. Three RGBA8 palette textures preserve canonical side/cap ownership and cap orientation, uploading only committed color revisions. They contain derived colors, including shared-rim aliases and repeated center colors, never additional elevation data. Native multisampling handles display silhouettes where supported.

Missing acceleration, identified software graphics, shader/resource/upload failure and context loss use the bounded CPU renderer. Same-mode fallback navigation now completes one in-flight coherent view before taking the latest request, so continuous input does not starve the display. Incompatible mode/size changes still cancel work. Hit testing waits for a coherent applied image. Context recovery rebuilds resources from the caller-owned cache. A post-commit upload failure also invalidates the applied image until fallback is ready; committed terrain and exact history remain intact. Existing explicit input-interruption rules still apply while a displayed target is unavailable: pending input can be cancelled with its count reported, retaining one undoable committed prefix.

The crosshair is a **pointer marker**, not a speculative intrinsic footprint. Exact dots remain B2A dry-run results or the last committed dab. Pending text reflects actual pending numerical/preview work. Existing numerical pump limits have not increased. The toolbar still overlays the spacious workspace; no permanent settings panel or new editing tool was added.

## Final frozen validation

- Numerical: **418/418 passed**, no failures/skips; 5876.2757 ms.
- Complete desktop/mobile browser run: **288 passed, 4 existing intentional skips, 292 total**, no failures/retries/flaky cases; 1093758.9 ms.
- Additional hardware-only existing cylinder workflow/native-input regressions: **8/8 passed**, including pen/touch, all four tools, both rims, exact history and Save/Open. [Hardware results](evidence/a7-p1a-hardware-input-browser-results.json).
- TypeScript and production build passed: 95 modules, 188 ms Vite build.
- 200 runtime/test/config/script files remained byte-identical throughout final checks, complete browser tests and production smokes. Both frozen digests match; the additional hardware checks use these same file hashes.
- Built-production hardware and automatic software-fallback checks both pass on desktop/mobile with all four save formats.

The initial broad-GPU run had two legacy wrapped-Canvas pixel-digest mismatches. No planar source or assertion was changed: hardware launch selection is now scoped to the new cylinder GPU tests, preserving the historical Canvas backend. A six-case desktop/mobile focused rerun passed, followed by the complete frozen rerun reported above. The initial failure receipts remain labelled as initial evidence.

Full raw evidence: [numerical](evidence/a7-p1a-numerical.txt), [browser JSON](evidence/a7-p1a-browser-results.json), [build/typecheck](evidence/a7-p1a-build.txt), [frozen source](evidence/a7-p1a-frozen-source.json), and [verification/inventory](evidence/a7-p1a-verification.json). There were no retries or flaky final cases. Historical skips remain explicitly identified in the raw results.

New unified-workspace cases cover rapid held rotation, pan/zoom/recenter, both caps, movable cuts, physical/map switches, readouts, resize/fullscreen, N128/N256 exact navigation preservation, held pending N256 input, whole-array Undo/Redo, v4 reopening, missing WebGL, shader failure, real context loss/restoration and a failed post-commit palette upload. Existing mouse/pen/native-touch/two-finger, spherical brush settings and v1/v2/v3/v4 mixed-library regressions remain in the complete run. Separate built-production desktop/mobile smokes use normal `/` UI and IndexedDB reads with both the hardware and automatic software-fallback backends, without development inspection imports.

Direct GPU readbacks at N64/N128/N256 are compared with the independent double-precision CPU reference over eight orientations/projections, including both cap centers, grazing angles, zoom and moved map cuts. The subpixel color-envelope test accounts for implementation-selected multisampling; pixel-center errors are retained in the receipts rather than hidden. Camera-only draws reuse textures; committed color changes upload a new revision; disposal releases owned texture/mesh resources. [Desktop proof](evidence/a7-p1a-desktop-gpu-parity.json), [mobile proof](evidence/a7-p1a-mobile-gpu-parity.json).

The real held-input observer independently reconstructs pre-stroke terrain, replays actual geographical pointer positions through the accepted B2B2 engine, and compares every Float32 word. Both profiles report zero word mismatches, zero hidden writes and zero discarded accepted positions in the completed pointer-feedback stroke. Browser assertions restore the complete prior array through one Undo and the complete result through Redo. Navigation and presentation changes preserve the arrays and operation history. Save/Open retains the same v4 identities, geometry and words.

## Repeatable performance method

`node scripts/measure-cylinder-rendering.mjs baseline-hardware` exports the approved baseline into an ignored local directory, without creating a branch or changing the active checkout. `improved-hardware` uses the current source. `improved` exercises automatic software fallback. All load the same deterministic **saved** terrain through normal Atlas Open, for N64/N128/N256. The benchmark records 100 paced native mouse moves, then a native held gesture with 120 RAF-paced DOM pointer moves to expose continuous-camera starvation. The controlled DOM cadence is identified separately from native input. Each case has a fresh browser context and runs serially.

Desktop is 1440×900. Mobile is Pixel 7 emulation, 412×839 CSS pixels, with 4× main-thread CPU throttling. Hardware runs explicitly select the actual **AMD Radeon RX 6600 / ANGLE Direct3D11**. Software runs report **SwiftShader** and automatically select CPU fallback. These are desktop-host measurements, including mobile emulation on that desktop GPU, not physical-phone measurements or universal FPS guarantees.

Metrics distinguish CPU camera work, isolated ray/palette/shading batches, raster steps, Canvas scratch/presentation calls, GPU resource upload/submission, overlay work, frame gaps and numerical work. N128 Chromium traces include native GPU/compositor scheduling; Playwright traces include screenshots and actual interactions. CPU submission time is not GPU completion time. Input-to-following-RAF is a presentation **opportunity proxy**, not photons. Dropped-frame counts are missed 60-Hz RAF opportunities, separately from how often a coherent map image changes. GC/heap inspection occurs after the timing window.

Raw runs: [baseline hardware](evidence/a7-p1a-baseline-hardware-benchmarks.json), [improved hardware](evidence/a7-p1a-improved-hardware-benchmarks.json), [software fallback](evidence/a7-p1a-improved-benchmarks.json), [phase-only summary and trace stages](evidence/a7-p1a-performance-summary.json).

All times below are milliseconds; columns show p50 / p95 / maximum. The continuous workload has 120 RAF-paced camera inputs.

| Backend | Profile/detail | Coherent views | Display interval | Input to CPU submit | Following-RAF opportunity | Missed 60-Hz RAF opportunities |
| --- | --- | ---: | --- | --- | --- | ---: |
| Baseline | desktop N64 | 1 | one final image | 2017.2 / 2017.2 / 2017.2 | not instrumented | 0 |
| Baseline | desktop N128 | 1 | one final image | 2017.2 / 2017.2 / 2017.2 | not instrumented | 0 |
| Baseline | desktop N256 | 1 | one final image | 2016.4 / 2016.4 / 2016.4 | not instrumented | 0 |
| Baseline | mobile N64 | 1 | one final image | 2043.2 / 2043.2 / 2043.2 | not instrumented | 0 |
| Baseline | mobile N128 | 1 | one final image | 2061.1 / 2061.1 / 2061.1 | not instrumented | 1 |
| Baseline | mobile N256 | 1 | one final image | 2043.7 / 2043.7 / 2043.7 | not instrumented | 0 |
| GPU | desktop N64 | 120 | 16.7 / 16.7 / 16.8 | 16.3 / 16.9 / 17.5 | 32.7 / 33.6 / 33.9 | 0 |
| GPU | desktop N128 | 120 | 16.7 / 16.7 / 16.8 | 16.3 / 16.9 / 17.4 | 32.6 / 33.5 / 33.7 | 0 |
| GPU | desktop N256 | 120 | 16.7 / 16.8 / 16.8 | 16.3 / 16.8 / 17.5 | 32.7 / 33.5 / 34.0 | 0 |
| GPU | mobile N64 | 120 | 16.7 / 16.8 / 16.8 | 14.7 / 15.8 / 17.0 | 30.9 / 31.9 / 33.0 | 0 |
| GPU | mobile N128 | 120 | 16.7 / 16.8 / 16.8 | 14.4 / 15.7 / 16.2 | 30.4 / 31.7 / 32.8 | 0 |
| GPU | mobile N256 | 120 | 16.7 / 16.8 / 16.8 | 14.9 / 15.9 / 16.5 | 31.0 / 32.2 / 34.1 | 0 |
| CPU fallback | desktop N64 | 61 | 33.3 / 33.4 / 33.4 | 33.0 / 33.8 / 35.5 | 48.6 / 50.1 / 53.1 | 0 |
| CPU fallback | desktop N128 | 61 | 33.3 / 33.4 / 33.5 | 32.9 / 34.0 / 35.6 | 48.5 / 49.6 / 52.1 | 0 |
| CPU fallback | desktop N256 | 61 | 33.3 / 33.4 / 33.4 | 33.1 / 33.9 / 35.1 | 48.6 / 49.4 / 50.7 | 0 |
| CPU fallback | mobile N64 | 41 | 50.0 / 66.7 / 83.3 | 54.1 / 70.7 / 81.5 | 70.0 / 88.6 / 100.0 | 14 |
| CPU fallback | mobile N128 | 42 | 50.1 / 66.7 / 99.9 | 55.2 / 61.0 / 89.9 | 71.4 / 81.1 / 108.8 | 21 |
| CPU fallback | mobile N256 | 39 | 50.0 / 66.7 / 66.8 | 51.9 / 62.3 / 152.2 | 67.6 / 93.5 / 167.7 | 10 |


The baseline repeatedly cancels unfinished rasters under the fixed continuous input: only one coherent new image finishes after input ends, approximately 2.02–2.06 seconds after the first queued camera input. The accelerated path submits all 120 camera views, at roughly 60 display updates/second, without measured dropped RAF opportunities in these hardware cases. Its following-RAF opportunity is approximately 30–34 ms. CPU fallback now continues presenting during movement; it reaches about 30 display updates/second on desktop and about 20 on 4× mobile emulation. The weaker-device 30-FPS engineering target is **not met** in that fallback case. The recorded fallback camera/opportunity maxima remain below half a second for this workload.

Baseline N128 isolated batches illustrate where time went: 12k ray queries take 3.4 ms desktop / 13.7 ms throttled mobile; 9,756 palette lookups take 3.2 / 11.4 ms; matching shading batches take 1.3 / 4.6 ms. An entire 160k raster takes 31.4 / 128.4 ms in the isolated batch. These are separate microbenchmarks, not an additive accounting of the actual UI. Scratch `putImageData`/`drawImage` calls are generally fractions of a millisecond. Main-thread ray/palette work and cancelled scheduling were the actionable bottlenecks; reducing numerical detail alone would not fix them. Native GPU/compositor trace durations are reported as browser task slices, not shader execution or end-to-end photon time.

## Resolution, clarity and screenshots

The desktop scene now uses **1440×900 = 1,296,000** real backing pixels, during movement and at rest, versus 505×316 = 159,580 idle CPU pixels and approximately 40k during movement. The emulated mobile scene uses **618×1258 = 777,444** backing pixels, versus 210×428 = 89,880 idle CPU pixels and approximately 22k during movement. Scene/overlay backing remains capped at three million pixels each and DPR 1.5. This increases display resolution without changing the 4,034 / 16,258 / 65,282 numerical sample counts.

The [pixel-clarity receipt](evidence/a7-p1a-pixel-clarity.json), reproduced by `node scripts/measure-cylinder-clarity.mjs`, compares real paired screenshots with a native-pixel CPU color reference over identical terrain interiors. At N256, mean absolute 8-bit channel error changes from 0.537 to 0.472 on desktop and 0.449 to 0.369 on mobile; mobile p95 changes from 2 to 1. N64 mean error is essentially unchanged and slightly higher in the GPU captures. This metric does not claim new geographic detail or universal improvement for every pixel. The chief visual gain is native display/silhouette clarity and maintaining that clarity during navigation. Coastlines still reflect the numerical sampling and palette, not professional map artwork.

| Same N256 geography and 100% view | Baseline | Improved |
| --- | --- | --- |
| Desktop physical | [Before](evidence/a7-p1a-baseline-hardware-desktop-n256-physical.png) | [After](evidence/a7-p1a-improved-hardware-desktop-n256-physical.png) |
| Desktop connected map | [Before](evidence/a7-p1a-baseline-hardware-desktop-n256-map.png) | [After](evidence/a7-p1a-improved-hardware-desktop-n256-map.png) |
| Mobile physical | [Before](evidence/a7-p1a-baseline-hardware-mobile-n256-physical.png) | [After](evidence/a7-p1a-improved-hardware-mobile-n256-physical.png) |
| Mobile connected map | [Before](evidence/a7-p1a-baseline-hardware-mobile-n256-map.png) | [After](evidence/a7-p1a-improved-hardware-mobile-n256-map.png) |

N64/N128 screenshot pairs and all matched camera settings are inventoried alongside these captures. Representative N128 performance interaction ZIPs and Chromium compositor traces are delivered for baseline, hardware and software paths on both profiles. All 14 new browser-case ZIPs are also delivered. Additional local investigative/per-detail traces are not represented as delivered evidence. [Pending pointer desktop](evidence/a7-p1a-desktop-pending-pointer.png), [pending pointer mobile](evidence/a7-p1a-mobile-pending-pointer.png), [desktop device-loss recovery](evidence/a7-p1a-desktop-context-restored.png), [mobile recovery](evidence/a7-p1a-mobile-context-restored.png). The [trace inventory](evidence/a7-p1a-verification.json) maps each delivered new-case interaction ZIP to its actual browser case.

The same N256 terrain is also captured at zoom **1.953125** (195.3125%) after idle refinement. Actual IndexedDB payload hashes and both camera settings match in the [zoom-pair receipt](evidence/a7-p1a-zoom-pairs.json). Terrain is unchanged throughout these interactions.

| Zoomed view | Baseline | Improved |
| --- | --- | --- |
| Desktop physical | [Before](evidence/a7-p1a-baseline-desktop-zoomed-physical.png) | [After](evidence/a7-p1a-improved-desktop-zoomed-physical.png) |
| Desktop connected map | [Before](evidence/a7-p1a-baseline-desktop-zoomed-map.png) | [After](evidence/a7-p1a-improved-desktop-zoomed-map.png) |
| Mobile physical | [Before](evidence/a7-p1a-baseline-mobile-zoomed-physical.png) | [After](evidence/a7-p1a-improved-mobile-zoomed-physical.png) |
| Mobile connected map | [Before](evidence/a7-p1a-baseline-mobile-zoomed-map.png) | [After](evidence/a7-p1a-improved-mobile-zoomed-map.png) |

## Memory and remaining brush lag

Geometry resources are fixed at 1,179,744 GPU bytes per cylinder renderer. Derived texture payloads are 17,152 / 67,072 / 265,216 bytes at the three details; the unchanged canonical palette cache is 16,136 / 65,032 / 261,128 bytes. Camera-only navigation does not grow a raster queue or upload another terrain copy. One pending CPU fallback generator, front/spare storage, one coherent color snapshot and finite timing rings retain their existing bounds. On failure/disposal, owned mesh/texture resources are deleted and the unused GPU backing is reduced to zero width.

CDP `Runtime.getHeapUsage` numeric readings are in each raw run. At N256 desktop, post-GC used JS heap is approximately 9.34 MB baseline / 9.41 MB improved; backing storage is separately recorded. These readings are not GPU VRAM or an exact process working set. Native scene/overlay buffers, multisample color/depth/resolve storage, the compositor, canonical authority, history and JS objects remain additional. Higher display resolution costs GPU display memory; the finite backing policy and recoverable allocation failure are deliberate.

The final held N256 workload uses 4× CPU throttling in both profiles, a 160,000 m brush and actual ordered pointer events. Times are observed values, not hard frame guarantees.

| Profile | Numerical pump max | Preview pump max | Overlay max | Host input-to-color timing record p50 / p95 / max |
| --- | ---: | ---: | ---: | --- |
| desktop | 25.0 | 7.0 | 17.2 | 241.5 / 1852.7 / 1852.7 |
| mobile | 11.1 | 7.0 | 8.3 | 206.6 / 1806.1 / 1806.1 |

These host timing records include the intentionally held screenshot interval, release-tail work and the existing timing queue's flush on a subsequent color presentation. Positions that need no new dab can therefore remain in that queue after their current colors are already correct. The 1.8-second maxima are not isolated numerical-work or photon-latency measurements. Numerical/preview/overlay pump maxima and the separate camera measurements above have their narrower meanings.

Expensive certified distance/brush preparation, history handoff and exact dot projection remain synchronous main-thread work. A native cursor can move independently, but the DOM marker, footprint and committed terrain can still wait behind a long task. P1B is still needed for expensive numerical painting/backlogs and should evaluate worker-owned preparation/ordered stroke processing with exact revision/commit/history semantics. No accepted numerical input was silently coarsened or dropped by this renderer change. P1B has **not** been started.

## Changed files and preservation

Eleven source/test/script paths change: `CylinderPreview.tsx/.css` connect the renderer and independent pointer; `cylinder-preview-session.ts` adds only a pending-work getter; `cylindrical-webgl.ts` owns GPU resources; `surface-renderer.ts/.test.ts` define/test backing/lifecycle contracts; `cylinder-rendering.spec.ts` and two new test fixtures verify display/input behavior; two measurement scripts reproduce rendering and screenshot comparisons. README, the current editor guide, the new renderer guide, this report and the roadmap document the checkpoint. The per-path inventory covers the implementation and its delivered evidence; verification and delivery receipts record their linking hashes separately.

189 existing source/config/test/script files outside the three approved integration edits remain normalized-byte-identical to the approved baseline. All 546 historical completion/evidence files are restored and raw-byte-identical to that baseline after fresh regressions. Four freshly observed cylinder editing measurement receipts are archived under the new P1A prefix before restoration. The complete eleven-phase roadmap table is unchanged; Issue #1 is still explicitly linked. No numerical core, history implementation, old codec, v4 codec, schema, dependency or package-lock change was made.

The original Serrian Tide website, Worlds database and Production environment were not modified. Built-production testing served only a local Vite preview. No new geometry, brush, generator, conversion, 3D terrain, artwork service or main-site integration was implemented. The complete eleven-phase sequence and Issue #1 measurement/terrain-intelligence linkage are preserved. Push authorization covers this completed checkpoint on `main`; further passes await review and explicit authorization.
