# Cube-D1 completion and review handoff

Cube-D1 delivers the first real planar physical cube, connected six-face net and read-only N128/N256 development preview. Both views consume one canonical Float32 authority. Hardware WebGL2 and independent Canvas rendering are implemented. The result stops for Ember’s technical review and the owner’s first visual acceptance; neither is claimed by automated checks.

Accepted baseline: `77df76f3a0a12273f9277d201277f13e9985074d`, following C2B2 implementation `d099606144d827d99f4c6c8ba40fe67933fb474e`. The [delivery receipt](CUBE-D1-DELIVERY.md) identifies the exact implementation SHA and committed file/blob inventory. The owner authorized completion and push directly to `main`. No deployment is part of this delivery.

## Owner inspection

Run `npm run dev` and open <http://127.0.0.1:5173/dev/cube-preview.html>, or follow **Development preview: inspect the physical cube (read-only)** from the normal New World dialog. The currently running verification server uses <http://127.0.0.1:5260/dev/cube-preview.html>. The [owner guide and technical specification](SOLID-CUBE-VISUAL-PREVIEW.md) explains orbit, zoom, face presets, the documented net, N128/N256, CPU fallback, lifecycle, buffers and raster tolerances.

Use Overview, Opposite, Edge and Corner, then compare the unfolded map. Follow the folded ridge and coastlines, switch resolution/backend, and inspect the signed elevation readout. Report concrete visual defects or acceptance separately from the technical result. There is no painting, normal cube World option or saved cube format.

## Delivered implementation

| Layer | Files and behavior |
| --- | --- |
| Physical view | `solid-cube-view.ts`: true planar orthographic ray/project geometry, camera frame/rotation, explicit connected net and local orientation |
| Derived geography | `solid-cube-field.ts`: continuous synthetic seed, canonical source snapshot, physical folded-neighbor gradients, real-source N16 first view and full N128/N256 field |
| Hardware presentation | `solid-cube-webgl.ts`: bounded six-layer Float32 texture, numerical interpolation then palette/relief, four subpixel rays, explicit context lifecycle |
| Independent fallback | `solid-cube-canvas.ts`: six numerical color/relief caches mapped to exact planar quads; forced startup calls no WebGL context |
| Read-only controller | `solid-cube-presentation.ts`: revision/generation guards, coalesced jobs/frames, camera-only presentation, context fallback/restoration and disposal |
| Development application | Separate HTML/React entry, scoped CSS, desktop/mobile controls, N128/N256/backend selection and read-only source diagnostics |
| Existing application changes | Only a new-tab preview link in `NewWorldDialog.tsx` and an additional Vite build entry |
| Verification | 35 new numerical display tests, 12 browser cases per desktop/mobile project and actual GPU/CPU pixel/lifecycle fixtures, including actual SwiftShader policy |

No accepted numerical/history provider, App, existing editor, persistence codec or old evidence file is changed. Cube-C2B2 execution is accepted for progression and remains independent of D1 presentation. No new dependency or server rendering service is used.

## Verification

- **963/963 numerical tests passed**, including 35 new display tests.
- **Full browser process: 408 passed, 4 conditional skips, 0 failures, 0 retries**, out of 412 uniquely reconciled cases.
- Subsequent startup/backend-policy corrections changed only the new presentation controller and browser assertions, adding two actual software-adapter cases. **All 24 Cube-D1 cases passed again on the final frozen sources**, including actual pixels, both backends, mobile touch, context recovery and cleanup. Legacy/numerical dependencies were unchanged from the full regression.
- The [current 414-case inventory](evidence/cube-d1-current-browser-inventory.json) reconciles **410 passes and 4 unchanged conditional skips**, with no missing or duplicate IDs: 390 unchanged legacy cases from the successful full process plus all 24 final cube cases. This is a verified union, not a single-process final 414-case run.
- Final typecheck and production multi-entry build passed. The final source registry stayed unchanged throughout the affected browser rerun and subsequent sequential performance collection.
- Four actual pixel matrices contain 156 points each. Largest observed GPU/reference error: **0.5** RGB values; largest qualifying Canvas/reference error: **1**, within the documented 2/8 limits.

[Verified test inventory](evidence/cube-d1-verification.json), [full browser JSON](evidence/cube-d1-browser-result.json.gz), [durable completion journal](evidence/cube-d1-browser-journal.jsonl.gz), [final affected run](evidence/cube-d1-final-browser-result.json), [source freeze](evidence/cube-d1-source-freeze.json). The archived raw logs and final trace index are listed in the evidence manifest.

Actual browser checks cover all six faces, twelve physical edges, eight shared corners, the five uncut net joins, N128/N256, signed heights/zero, native mouse/keyboard/touch/pinch, resizing, exact source words/revisions, forced no-WebGL Canvas, shader/unavailable fallback, context loss/recovery, revision refresh and disposal. The pixel fixture checks 156 geographic points per resolution/project against an independently evaluated CPU ray/subpixel reference. GPU tolerance is 2 RGB channel values; Canvas is 8 away from shoreline coverage and pixels crossing physical joins. The report retains the individual measurements and exceptions rather than treating screenshot appearance as a numerical proof.

## Actual preview screenshots

These are running browser preview screenshots, not numerical fixture pictures. Each row contains the same N256 source geography. The evidence also includes N128 and both backends: 40 full-page screenshots total.

| Profile/backend | Overview/front | Opposite | Edge | Corner | Complete net |
| --- | --- | --- | --- | --- | --- |
| Desktop WebGL2 | [front](evidence/cube-d1-desktop-n256-auto-front.png) | [opposite](evidence/cube-d1-desktop-n256-auto-opposite.png) | [edge](evidence/cube-d1-desktop-n256-auto-edge.png) | [corner](evidence/cube-d1-desktop-n256-auto-corner.png) | [net](evidence/cube-d1-desktop-n256-auto-net.png) |
| Desktop Canvas | [front](evidence/cube-d1-desktop-n256-canvas-front.png) | [opposite](evidence/cube-d1-desktop-n256-canvas-opposite.png) | [edge](evidence/cube-d1-desktop-n256-canvas-edge.png) | [corner](evidence/cube-d1-desktop-n256-canvas-corner.png) | [net](evidence/cube-d1-desktop-n256-canvas-net.png) |
| Mobile WebGL2 | [front](evidence/cube-d1-mobile-n256-auto-front.png) | [opposite](evidence/cube-d1-mobile-n256-auto-opposite.png) | [edge](evidence/cube-d1-mobile-n256-auto-edge.png) | [corner](evidence/cube-d1-mobile-n256-auto-corner.png) | [net](evidence/cube-d1-mobile-n256-auto-net.png) |
| Mobile Canvas | [front](evidence/cube-d1-mobile-n256-canvas-front.png) | [opposite](evidence/cube-d1-mobile-n256-canvas-opposite.png) | [edge](evidence/cube-d1-mobile-n256-canvas-edge.png) | [corner](evidence/cube-d1-mobile-n256-canvas-corner.png) | [net](evidence/cube-d1-mobile-n256-canvas-net.png) |

## Rendering measurements

Host: AMD Ryzen 5 5600G with Radeon Graphics         , 12 logical CPUs, 32127 MiB RAM, Windows 10.0.26300, Node v24.18.0, Chromium 156.0.8078.4. Hardware rendering reports **AMD Radeon RX 6600 through ANGLE/D3D11**. Desktop is 1440×900; the mobile profile uses Pixel 7 emulation plus page-target CDP CPU4x. The desktop GPU is unthrottled. This is not physical-phone acceptance.

There are **24 final hardware/Canvas trials** (three fresh pages per resolution/backend/profile), **4 software-WebGL trials**, and **4 separate revision/lifecycle fixtures**. Trials run sequentially after regression, in fixed order, with browser/driver/module caches not forcibly reset. All samples, including first trials, are retained. These are local Vite development measurements, not randomized causal estimates or production hosting measurements.

| Profile | N | Backend | Navigation first / full median ms | First range ms (trial order) | RAF p95 / max ms | Submit p95 ms |
| --- | ---: | --- | ---: | --- | ---: | ---: |
| desktop | 128 | WebGL2 hardware | 238.4 / 337.2 | 368.5, 238.4, 237.2 | 16.7 / 16.8 | 0.3 |
| desktop | 128 | Canvas2D | 259 / 509 | 259, 260.8, 240.1 | 16.8 / 16.8 | 0.2 |
| desktop | 256 | WebGL2 hardware | 371.3 / 604.3 | 368.9, 389.7, 371.3 | 16.7 / 16.8 | 0.3 |
| desktop | 256 | Canvas2D | 367.2 / 1233.7 | 357.7, 367.2, 376.5 | 16.7 / 16.8 | 0.2 |
| mobile-cpu4x | 128 | WebGL2 hardware | 760.2 / 1108 | 791.6, 760.2, 712.6 | 16.7 / 33.4 | 0.6 |
| mobile-cpu4x | 128 | Canvas2D | 724.1 / 1805.6 | 724.1, 739.4, 721.7 | 16.8 / 33.3 | 0.5 |
| mobile-cpu4x | 256 | WebGL2 hardware | 1311.2 / 2244.4 | 1344.1, 1311.2, 1310.1 | 16.7 / 33.3 | 0.6 |
| mobile-cpu4x | 256 | Canvas2D | 1311.4 / 5012.8 | 1299.2, 1311.4, 1328.3 | 16.8 / 33.4 | 0.5 |

Synchronous graphics initialization originally gated first terrain: the first desktop N128 automatic trial waited 904.3 ms from navigation, including 645.6 ms graphics initialization. The final path first presents actual coarse Canvas terrain and gives it paint opportunities, then initializes WebGL. The corresponding final first trial recorded **368.5 ms to first terrain**, with graphics initialization beginning at component +230.4 ms, after the +213.3 ms first-terrain milestone. First-trial cache conditions are not identical; the enforced ordering, rather than the single timing comparison, proves GL cannot gate first pixels. Raw before/final measurements are preserved. Initial graphics startup can still block the main thread after geography is visible; full-detail latency is reported independently.

| Profile | N | Backend | Seed / hash median ms | GPU initialization median ms | Coarse / full field median ms | CPU atlas preparation median ms |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| desktop | 128 | auto | 51.3 / 0.7 | 5.9 | 6.6 / 92.6 | 6.1 |
| desktop | 128 | canvas | 72.6 / 0.7 | 0 | 6.8 / 82 | 174.3 |
| desktop | 256 | auto | 168.2 / 1.7 | 5.7 | 7.2 / 229.3 | 6.2 |
| desktop | 256 | canvas | 170.2 / 1.8 | 0 | 7.2 / 221 | 641.3 |
| mobile-cpu4x | 128 | auto | 203.2 / 2.8 | 12.8 | 30.2 / 352.8 | 27.3 |
| mobile-cpu4x | 128 | canvas | 205.3 / 2.8 | 0 | 31.8 / 313.4 | 799.7 |
| mobile-cpu4x | 256 | auto | 787 / 6.7 | 12.3 | 32.2 / 934 | 29 |
| mobile-cpu4x | 256 | canvas | 748 / 6.8 | 0 | 34.6 / 971.5 | 2761.6 |

CPU atlas timing is cumulative for that controller. Automatic mode initially retains only the coarse atlas; full fallback preparation is lazy. Source fingerprinting is included in first-visible latency rather than hidden as benchmark setup. Camera samples use 60 browser mouse moves through Playwright, separated by at least 16 ms, on both profiles. Native touch/pinch correctness is tested separately. Independent RAF observations measure scheduling gaps; CPU submit timings exclude the initial draw samples. Camera/net actions caused zero additional texture uploads in every trial.

Additional reduced-performance measurements (one page per condition; SwiftShader positively identified and Automatic correctly selects Canvas):

| Software adapter detected → Canvas profile | N | Navigation first / full ms | RAF p95 / max ms |
| --- | ---: | ---: | ---: |
| desktop | 128 | 256 / 522 | 16.7 / 16.8 |
| desktop | 256 | 366.7 / 1216.3 | 16.8 / 16.8 |
| mobile-cpu4x | 128 | 750.5 / 1866.4 | 16.8 / 33.3 |
| mobile-cpu4x | 256 | 1352.2 / 5106.9 | 16.8 / 33.4 |

[Performance summary](evidence/cube-d1-performance-summary.json), [all final samples](evidence/cube-d1-performance.json.gz), [pre-correction samples](evidence/cube-d1-before-startup-performance.json.gz). Before the policy correction, actual SwiftShader GL navigation produced RAF p95 gaps of 100–166.7 ms and maxima of 100.1–200.1 ms across the four recorded conditions. Automatic now releases GL drawing resources for these software adapters and uses Canvas. Its full CPU-cache preparation can take longer, while coarse first terrain remains visible and camera movement avoids software fragment rendering. These single trials are descriptive, not randomized matched estimates. Low-performance emulation does not reproduce phone GPU, thermal, memory or operating-system constraints.

First visible terrain means an actual opaque center terrain pixel is verified, then two animation-frame callbacks approximate presentation. It is not a physical display measurement. The first view uses the actual-source N16 field; complete means the current full source resolution was presented. Navigation-origin time includes module loading, React startup, seeding and source fingerprinting; component-lifetime values and initialization/preparation costs are separately retained. Camera submit time measures CPU submission, not GPU execution duration. Independent RAF observations include event delivery and scheduling.

| Profile | N | Backend | JS heap observed max MiB | CDP backing observed max MiB | Owned process working-set sum observed max MiB | Owned process private bytes observed max MiB |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| desktop | 128 | auto | 12.4 | 9.6 | 346.7 | 274.3 |
| desktop | 128 | canvas | 10.7 | 9.5 | 365.1 | 330.5 |
| desktop | 256 | auto | 11.8 | 26.5 | 397.7 | 389.9 |
| desktop | 256 | canvas | 10.4 | 26.5 | 403 | 619.5 |
| mobile-cpu4x | 128 | auto | 11.9 | 9.6 | 381.5 | 504.8 |
| mobile-cpu4x | 128 | canvas | 11.4 | 9.5 | 382.2 | 336 |
| mobile-cpu4x | 256 | auto | 12.7 | 26.5 | 410.4 | 414 |
| mobile-cpu4x | 256 | canvas | 11.2 | 26.5 | 418 | 690 |

Memory samples use CDP heap/backing metrics plus Windows processes identified by that browser’s own CDP process inventory. Working-set sums can count shared pages more than once. Private bytes are process commitment, not private resident RAM. These are before/after observed samples, not continuous peaks, total OS memory or GPU VRAM. JS heap is not total rendering memory. Browser/driver caches can remain after canvas/GL disposal; no process-memory reclamation claim follows from zero owned resources. The Canvas starter retains an additional bounded presentation backing store in automatic mode. Payload bounds are in the owner guide and raw snapshots include exact authority/field/atlas/texture/canvas bytes.

| Visible preview profile | N | First fallback draw / full fallback observed ms | Recovered WebGL observed ms |
| --- | ---: | ---: | ---: |
| desktop | 128 | 13.4 / 191.7 | 20.6 |
| desktop | 256 | 20.7 / 678.7 | 24.1 |
| mobile-cpu4x | 128 | 40.8 / 767.6 | 34.9 |
| mobile-cpu4x | 256 | 51.9 / 2817.2 | 43.2 |

These loss/recovery samples use the actual visible owner preview. Polling observes a completed canvas draw or recovered GL presentation; it adds scheduling/automation latency and is not a physical display measurement. A real coarse cache stays available while full CPU detail is prepared. Restoring GL reuploads the current field without changing canonical words or revisions.

| Detached revision fixture | N | GPU refresh prepare/schedule ms | Canvas refresh prepare/schedule ms |
| --- | ---: | ---: | ---: |
| desktop | 128 | 87.3 | 255.5 |
| desktop | 256 | 233.1 | 799.3 |
| mobile-cpu4x | 128 | 290.3 | 956.3 |
| mobile-cpu4x | 256 | 958.8 | 3483 |

Revision fixtures are detached canvases and deliberately make exactly one source-word change before each backend refresh. Values above measure preparation and scheduling; the fixture then verifies the full current revision was drawn after animation frames. They are not owner-visible update-latency measurements. All other words remain exact. Disposal and queued cancellation report zero owned fields, atlas payload, canvas pixels and GL objects. No source writes occur during ordinary viewing, camera, resizing, loss or recovery.

## Preservation and delivery evidence

The [preservation certificate](evidence/cube-d1-preservation.json) retains the complete baseline Git-object registry. **281 protected existing source/test/fixture files** and **2490 historical evidence files** remain unchanged. The only changed pre-existing source/config files are the dialog link and Vite entry; six current documentation files are updated. All accepted Cube-A/B/C1/C2A/C2B1/C2B2 implementations and history-capacity constants remain unchanged. The eleven master phase rows and thirteen geometry priorities are compared exactly with baseline.

| Resolution | Source revision before/after viewing | Canonical SHA256 before/after all views/backends |
| ---: | ---: | --- |
| 128 | 98306 | `498740f83f7a3aa8b90a5b892d2131c926b61c6028f9b8db0e552c384b3ac8d5` |
| 256 | 393218 | `76c7c4b89d6cb14e1fc1b31996e3d3c465d3455a56dd96d188aa05f6680470a8` |

[Classified delivery inventory](evidence/cube-d1-delivery-manifest.json), [hashed evidence manifest](evidence/cube-d1-evidence-manifest.json), [final trace case index](evidence/cube-d1-trace-index.json), [verified trace archives](evidence/cube-d1-trace-archives.json). All 28 final performance trials also preserve complete source SHA256/revision and have no browser page errors.

The eleven master phases, approved geometry priorities, custom irregular worlds, Issues #1/#2 and future independently editable hollow interior/exterior/passage requirements remain in the roadmap. No original Serrian Tide website, existing Worlds, database, Docker, hosting or Production resource was changed. Build output intentionally gains a separate preview entry and the main dialog link; it is not claimed byte-identical to the C2B2 product bundle.

Large raw JSON/logs use standard lossless gzip; decompress to the original basename. The evidence manifest records exact SHA256/bytes. Trace archives contain original Playwright `trace.zip` files indexed by case; extract and open with `npx playwright show-trace path/to/trace.zip`. The measurement and delivery scripts are retained as text with their original working paths and methodology; they are evidence/reproduction aids, not new runtime dependencies. Browser tests can be rerun normally with `npm run test:browser`; use an isolated cwd when preserving accepted historical screenshots.

## Known limits and next bounded checkpoint

CPU filtering/quad antialiasing can differ within one display-raster texel or screen pixel at coastlines, silhouettes and thin physical creases. Geometry is not expanded or distorted to hide those differences. A real physical fold also legitimately changes the one-sided relief normal. N128/N256 are finite-resolution synthetic demonstrations, not authored World acceptance or displaced terrain meshes. Mobile emulation with CPU4x leaves the desktop GPU unthrottled and is not physical-phone testing.

The 65,536-word gesture-history ceiling is unchanged and still requires a separately authorized decision before the full Cube-E editor is complete. D1 has no gesture input. First rendering, source preparation, context recovery and Canvas cache preparation retain measurable latency; no universal frame or device guarantee is claimed.

Recommended next checkpoint: **D2 visual review and targeted rendering refinement**, bounded to concrete owner/Ember findings and repeatable matched screenshots/timings. Agree that small correction list before implementation. Do not automatically begin D2, E, F, hollow cubes, new geometries or website integration. Stop at D1 for independent technical review and first owner visual acceptance.
