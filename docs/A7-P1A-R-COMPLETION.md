# A7-P1A-R — Cylinder visual quality correction

Implemented on approved baseline `9a639bfa802c349fc8ee3033c5b7669599b4974e`, with final-source automated verification complete. **Stop for Ember review and owner visual acceptance.** P1B and other geometries have not begun. The exact implementation SHA is recorded in [the delivery receipt](evidence/a7-p1ar-delivery.json); the complete changed-file inventory and hashes are in [verification](evidence/a7-p1ar-verification.json).

## Result

The cylinder now reconstructs elevation before sea-level classification and color. Shape-preserving cubic interpolation removes the broad classified-color transition and reduces grid-shaped color changes. Four subpixel elevation classifications cover coast pixels. Optional physical-gradient relief uses a clearly labeled 5× display exaggeration; plain Elevation colors remains available. No elevation words, terrain ownership, distance/path/brush algorithms, numerical budgets, history operations or save formats changed.

The tools show the actual backend, graphics renderer, fallback reason, terrain raster backing, presentation backing and numerical resolution. Ordinary installed Chrome was launched headed **without graphics flags**, against the ordinary Vite development server and normal Atlas `/` workspace. It used the AMD Radeon RX 6600 through ANGLE/D3D11. Default headless Chromium identified SwiftShader and exercised the genuine CPU fallback. Deterministic API/shader failure cases are separate regression tests.

## Visual review

Open the [offline comparison page](evidence/a7-p1ar-visual-review.html), or inspect the [camera/backend/image-hash receipts](evidence/a7-p1ar-visual-pairs.json). It has 88 validated comparison states and 152 hash-verified map screenshots, plus eight diagnostics screenshots. Every before/after context opens the identical serialized v4 record, and checks complete word arrays, metadata, empty history and matching camera/zoom. The fixture geography comes from nine real B2B2 Raise strokes, including islands, mountain gradients, both cap centers, both rims and the angular cut; it is not renderer-only noise.

| Example | Before | Corrected relief | Corrected plain elevation |
| --- | --- | --- | --- |
| Desktop N128 hardware coast | [PNG](evidence/a7-p1ar-baseline-hardware-desktop-n128-coast.png) | [PNG](evidence/a7-p1ar-corrected-hardware-desktop-n128-coast.png) | [PNG](evidence/a7-p1ar-corrected-hardware-desktop-n128-elevation-coast.png) |
| Desktop N256 hardware coast | [PNG](evidence/a7-p1ar-baseline-hardware-desktop-n256-coast.png) | [PNG](evidence/a7-p1ar-corrected-hardware-desktop-n256-coast.png) | [PNG](evidence/a7-p1ar-corrected-hardware-desktop-n256-elevation-coast.png) |
| Mobile N128 hardware map | [PNG](evidence/a7-p1ar-baseline-hardware-mobile-n128-map.png) | [PNG](evidence/a7-p1ar-corrected-hardware-mobile-n128-map.png) | [PNG](evidence/a7-p1ar-corrected-hardware-mobile-n128-elevation-map.png) |
| Mobile N256 CPU coast | [PNG](evidence/a7-p1ar-baseline-fallback-mobile-n256-coast.png) | [PNG](evidence/a7-p1ar-corrected-fallback-mobile-n256-coast.png) | [PNG](evidence/a7-p1ar-corrected-fallback-mobile-n256-elevation-coast.png) |

Both cap centers, both oblique shared rims, the cut, physical views and connected maps are selectable in the comparison page. Images are genuine browser captures, not retouched. Mobile means an actual browser capture at the emulated mobile viewport, not a physical-phone photograph. The visible improvement is a localized sea contour and continuous color/lighting gradients; the coarse shapes of the sampled islands remain. Plain-color pairs isolate the pipeline correction from shading.

A diagnostic of broad palette mixing measures intermediate ordinary palette colors on an interior-side crop of these real PNGs. It removes analytic reference facing shade and excludes controls/rims/silhouettes. Water red is at most 37 and land red at least 109; the conservative interval (40,106) identifies class-mixed coverage. Band widths below are CSS pixels, including device-scale conversion. This is not a complete perceptual score or an error metric against the old renderer. [Method and all counts](evidence/a7-p1ar-coastline-coverage.json).

| Context | Mixed-band width p95, before → after | Mixed pixels, before → after |
| --- | --- | --- |
| hardware / desktop / N128 | 83.00 → 3.00 | 21650 → 765 |
| hardware / desktop / N256 | 39.00 → 3.00 | 12188 → 767 |
| hardware / mobile / N128 | 33.51 → 4.95 | 32336 → 4147 |
| hardware / mobile / N256 | 17.52 → 4.95 | 18343 → 4065 |
| fallback / desktop / N128 | 82.00 → 21.00 | 21726 → 5052 |
| fallback / desktop / N256 | 39.00 → 19.00 | 12678 → 4931 |
| fallback / mobile / N128 | 33.13 → 14.09 | 32990 → 11921 |
| fallback / mobile / N256 | 20.56 → 12.95 | 20480 → 11546 |

## Numerical detail and presentation

[Renderer architecture](CYLINDER-RENDERING.md) records the kernel, gradient estimates, physical units, center/rim ownership, resource policy and future detail path. At default R=1,000,000 m / L=1,600,000 m:

| N | Canonical samples | Side angular / rim arc | Side axial | Both caps' radial spacing | Both caps' first-ring angular arc |
| --- | ---: | ---: | ---: | ---: | ---: |
| 64 | 4,034 | 98,174.77 m | 50,000 m | 62,500 m | 6,135.92 m |
| 128 | 16,258 | 49,087.39 m | 25,000 m | 31,250 m | 1,533.98 m |
| 256 | 65,282 | 24,543.69 m | 12,500 m | 15,625 m | 383.50 m |

Cap angular spacing is 2πr/N at radius r, collapsing toward the one center; chord spacing is 2r sin(π/N). Broad stair-stepping/color contamination came from the palette pipeline. Remaining coarse outlines and absent small ridges reflect sparse real samples and the actual brush falloff. Display interpolation and relief cannot add missing geography. Doubling N would cost approximately four times the samples/payload/texture/full-cache work and roughly four times the samples in a fixed-meter brush footprint, plus intrinsic distance/refinement costs. No automatic detail increase occurs. Higher/adaptive/tiled authoritative terrain needs a separate surface/ownership/history/persistence/resource design.

## Performance

Final raw datasets use the separate `a7-p1ar-perf-*` namespace. Each includes N64/128/256, desktop 1440×900 and Pixel 7 viewport 412×839, with fourfold mobile CPU throttling on this desktop GPU. The ordinary Chrome screenshot/compositor launches and explicitly hardware-selected benchmark launches are distinguished in their receipts. Results are single matched runs, not statistical evidence of a speedup.

The persistent 4,096-segment meshes, camera uniforms, texture reuse, independent pointer feedback and existing numerical budgets remain. Camera/appearance changes do not upload unchanged terrain. R32F texture payloads remain 17,152 / 67,072 / 265,216 bytes; geometry remains 1,179,744 bytes. Temporary epoch snapshots and small sampler scratch/tables are bounded. GC JavaScript heap measurements below are not total process memory or VRAM. Native depth/MSAA/compositor storage is additional and backing pixels remain capped.

The RAF-paced phase consists of 120 DOM pointer moves through the real arbiter during a native held navigation gesture. It is separate from native paced Playwright input. Captured monitor intervals include release/coherent-tail/refinement where present. CPU submit and following-RAF opportunity are proxies, not photons or GPU execution time. Initial upload CPU time is taken before navigation, so it is not erased by the bounded timing rings. [Summary](evidence/a7-p1ar-performance-summary.json) links values derived from all final raw datasets. Representative N128 Playwright and Chromium traces are delivered; N64/N256 raw timing data and screenshots are delivered, with their investigative trace ZIPs retained locally.

| Backend / profile / N | RAF-paced coherent intervals p50/p95 ms, before → after | Native paced interval p50 ms, before → after | Corrected RAF gap max ms | Initial GPU upload CPU max ms | GC JS heap MiB, before → after |
| --- | --- | --- | --- | --- | --- |
| hardware / desktop / N64 | 16.7 / 16.8 → 16.7 / 16.7 | 33.4 → 33.4 | 16.8 | 3.700 | 8.919 → 9.042 |
| hardware / desktop / N128 | 16.7 / 16.7 → 16.7 / 16.7 | 33.4 → 33.4 | 16.8 | 2.800 | 9.047 → 9.168 |
| hardware / desktop / N256 | 16.7 / 16.8 → 16.7 / 16.7 | 33.4 → 33.3 | 16.8 | 7.700 | 8.981 → 9.106 |
| hardware / mobile / N64 | 16.7 / 16.8 → 16.7 / 16.7 | 50.0 → 50.0 | 16.8 | 3.700 | 9.000 → 9.126 |
| hardware / mobile / N128 | 16.7 / 16.7 → 16.7 / 16.8 | 50.0 → 50.0 | 16.8 | 8.800 | 9.071 → 9.193 |
| hardware / mobile / N256 | 16.7 / 16.8 → 16.7 / 16.8 | 50.0 → 50.0 | 16.8 | 18.100 | 8.999 → 9.124 |
| fallback / desktop / N64 | 33.3 / 33.4 → 33.3 / 33.4 | 50.0 → 50.0 | 16.8 | n/a | 9.063 → 9.239 |
| fallback / desktop / N128 | 33.3 / 33.4 → 33.3 / 33.4 | 50.0 → 50.0 | 16.8 | n/a | 9.194 → 9.309 |
| fallback / desktop / N256 | 33.3 / 33.4 → 33.3 / 33.4 | 50.0 → 50.0 | 16.8 | n/a | 9.129 → 9.243 |
| fallback / mobile / N64 | 50.0 / 66.7 → 66.7 / 83.3 | 116.7 → 133.3 | 33.4 | n/a | 9.152 → 9.273 |
| fallback / mobile / N128 | 50.0 / 66.7 → 66.7 / 83.4 | 133.3 → 133.3 | 33.4 | n/a | 9.224 → 9.335 |
| fallback / mobile / N256 | 50.0 / 66.8 → 66.6 / 66.7 | 116.7 → 133.3 | 33.4 | n/a | 9.151 → 9.291 |

Hardware navigation must be assessed from the matched measurements above; no numerical-brush speedup is claimed. The CPU fallback's richer interpolation costs more, especially under mobile throttling. It remains bounded and editable, but does not match GPU throughput or sharpness. An allocation-heavy prototype was replaced with reusable sampler storage before final verification.

A separate experiment observes the first changed **decoded terrain-pixel crop** in compositor PNGs after eight real keyboard camera inputs per profile, excluding UI/status text. CDP frame-swap and host receipt timestamps are retained, with a 64-frame ring, eight sample receipts, two images and a 2,048-event guard. Capture overhead is separate from the throughput benchmark. These are observed compositor frame swaps, not display photons. [Raw receipts and traces](evidence/a7-p1ar-compositor-presentation.json).

| Backend / profile | Inputs | Input → observed terrain frame swap p50 ms | p95 ms | Max ms |
| --- | ---: | ---: | ---: | ---: |
| hardware / desktop | 8 | 14.2 | 16.7 | 16.7 |
| hardware / mobile | 8 | 11.5 | 28.9 | 28.9 |
| fallback / desktop | 8 | 14.4 | 44.8 | 44.8 |
| fallback / mobile | 8 | 108.7 | 157.4 | 157.4 |

## Verification

- **426/426 numerical tests**, zero failures/skips; 6110.649 ms. Eight new checks cover all canonical samples at three resolutions, elevation-first sea classification, rims/cuts/centers, physical slope scaling, read-only epochs/unusual Float32 words and bounded/no-overshoot reconstruction. [Raw output](evidence/a7-p1ar-numerical.txt).
- **298 browser passes + four existing intentional skips**, zero unexpected/flaky/retried cases; 1048.148 s. Desktop/mobile include all prior shapes, brushes, input/navigation, globe/net/limb editing, exact history, mixed libraries, v1–v4 persistence and failure paths. [Full results](evidence/a7-p1ar-full-browser-results.json).
- **8/8 additional hardware-native input executions**, 65.148 s, covering the existing complete cylinder workflows, pen/native touch/two-finger navigation and held-stroke Save. [Results](evidence/a7-p1ar-hardware-input-browser-results.json).
- New ordinary-workspace N128/N256 hardware/fallback cases preserve complete saved words through appearance changes, exact preview-index changes, one-operation Undo/Redo and v4 reopening. Independent GPU readback uses double-precision geometry/elevation/physical-gradient reference calculations, keeping the existing ≤2-channel subpixel-envelope bound and zero incorrect background coverage. Odd-backed views additionally verify exact center pixels on both caps. Fragment geography is reconstructed analytically from the camera instead of thin-triangle varyings. Both ordinary colors and relief are tested, without rewriting canonical words. [Elevation parity](evidence/a7-p1ar-regression-a7-p1a-desktop-gpu-parity.json), [relief parity](evidence/a7-p1ar-desktop-relief-parity.json), [N256 editing proof](evidence/a7-p1ar-desktop-hardware-n256-editing.json).
- Actual context loss/recovery, unavailable/shader failure and post-commit upload failure retain the existing coherent-transform and exact-history behavior. A missing displayed target can still stop pending input and retain one undoable committed prefix under the established interruption policy.
- TypeScript and production build pass. Built localhost-only production smoke passes on hardware and software fallback, desktop/mobile, including exact cylinder Undo/Redo/Open and an unchanged mixed v1/v2/v3/v4 library. This is not a Production deployment. [Build](evidence/a7-p1ar-build.txt), [hardware smoke](evidence/a7-p1ar-hardware-production-smoke.json), [fallback smoke](evidence/a7-p1ar-software-production-smoke.json).
- All 207 frozen runtime/test/config/script files remain identical before/after final checks. 195 pre-existing source/config/script files outside the five intended integration/reference changes match the approved baseline. All 687 historical completion/evidence files are restored and verified against their exact Git blob bytes; fresh relevant legacy receipts and 32 final browser traces are archived with this pass. The eleven-phase roadmap table and Issue #1 remain unchanged. [Frozen-source receipt](evidence/a7-p1ar-final-checks.json).

| Final verification phase | Exit | Elapsed |
| --- | ---: | ---: |
| compositor | 0 | 32.762 s |
| baseline-hardware | 0 | 68.104 s |
| corrected-hardware | 0 | 70.338 s |
| baseline-fallback | 0 | 101.429 s |
| corrected-fallback | 0 | 100.562 s |
| numerical | 0 | 6.565 s |
| build | 0 | 2.264 s |
| full-browser | 0 | 1049.478 s |
| hardware-native | 0 | 66.939 s |
| hardware-production | 0 | 15.957 s |
| fallback-production | 0 | 10.069 s |

## Changed files

Runtime: `src/rendering/cylindrical-elevation.ts` (new), `cylindrical-raster.ts`, `cylindrical-webgl.ts`, `src/components/CylinderPreview.tsx` and its CSS. Verification: the new numerical elevation test, new unified browser test, new saved-sculpture fixture and the updated independent GPU-reference fixture. Three new public measurement scripts cover matched visuals, performance and compositor presentation. README, the current rendering guide and roadmap document the correction and review boundary. The complete per-path Git blob/SHA-256 inventory, evidence and historical preservation hashes are in the verification manifest.

## Limits and review boundary

Relief is a sample-derived display estimate with 5× exaggeration, not additional detail or displaced 3D terrain. Appearance is view state and does not change v4. GPU arithmetic has ordinary display precision; exact numerical readouts/history/save words remain authoritative. CPU fallback remains softer/slower, and physical mobile GPU behavior is not established by desktop emulation. Existing synchronous numerical work can still delay DOM pointer updates; this pass does not implement P1B.

No live Serrian Tide website, existing Worlds, shared database or Production deployment was touched. All work stays in the standalone Atlas repository, with authorized delivery directly to main. **Stop for Ember review and owner visual acceptance. Do not begin P1B or another geometry.**
