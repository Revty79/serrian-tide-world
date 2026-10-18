# A6-D1 — Interactive spherical views, rotation and projection foundation

October 17, 2026. Repository `Revty79/serrian-tide-world`, branch `main`. Approved baseline: `3e5cdeee82627c2cd293940e7397dcebfbc35455`. The owner supplied Ember's A6-C source/numerical-evidence approval and authorized this read-only view checkpoint with direct-to-main delivery. A6-D1 independent review and owner acceptance remain pending; earlier owner hands-on focused-layout acceptance remains separate.

## Delivered workspace

**Open tools → explicit Sphere reference radius (m) → N=128 or N=256 → Open spherical preview.** Radius has no Earth default. Preview terrain is clearly labeled session-only, deterministic synthetic test geography, with no spherical sculpting, GUI history or saving. It uses the actual A6-A authority: 98,306 / 393,218 unique Float32 values at N=128/256, shared across all six charts. Ephemeral development IDs do not create real World records.

The current bounded/wrapped document and canvas remain mounted behind an inert overlay. Opening the preview finishes an active stroke but never silently discards/replaces unsaved work. **Return to map** restores access and focus, including the original camera, unsaved state and pending Redo. The old save codecs, IndexedDB store, brushes, navigation and spherical numerical/history modules are unchanged.

The globe is a real front-hemisphere orthographic projection of the spherical reference geometry. Drag to rotate, pinch/wheel or use buttons to zoom, tap/click to inspect/select, and **Center selection** to bring that physical location to the center. The net uses six correctly oriented spherical charts with five joined folds and seven paired visual cuts. Solid and dashed amber edges distinguish these; gaps cannot be selected. View switching retains one terrain authority. The overlay View controls panel supplies six reference directions and instructions. Canvas keyboard controls are arrows, +/−, Enter for center inspection and Home for reset. Fullscreen is optional and user-triggered.

## Mathematics and limitations

[SPHERICAL-VIEWS.md](SPHERICAL-VIEWS.md) specifies the pure contracts, equations, exact net orientations, tolerances, memory accounting and next-checkpoint obligations. Camera axes are independent of stored geography. Forward projection returns visible physical occurrences; the inverse returns one physical direction or null at gaps, offscreen locations and outside the globe. Canonical nearest-sample inspection is independent of projection and resolves equivalent edge/corner addresses deterministically.

The globe uses an orthonormal right/up/forward camera frame and positive square-root disk inverse, so the far side is occluded. It renders a uniform reference sphere with view lighting; numerical height controls color and readout, without terrain extrusion. The net is an equiangular gnomonic spherical-chart cutout arranged as `pz` above `ny px py nx`, with `nz` below `px`. The cap charts require the rotations documented in the specification. It is a valid connected representation, not an isometric flattening or physical cube world. No periodic rectangular repetition is imported.

Ordinary round trips are checked below 1e−10 direction-vector error; named face/edge/corner/recenter cases below 2e−12. Exact rotated limbs allow 1e−7 because orthographic inversion is ill-conditioned at the silhouette. Native pointer positions also have CSS-pixel quantization; on a small net several numerical samples can fit within one pixel. Readouts report the actual input's canonical sample; zoom/recenter for closer inspection. Display interpolation does not create additional terrain resolution. The current cache contract assumes a fixed numerical provider after initialization; A6-D2 must add revision-aware invalidation.

## Verification

- **158 numerical tests pass:** all 153 A6-C baseline cases plus five new mathematical/rendering cases. Internal loops cover six interiors, all twelve edges at multiple parameters, all eight corners, arbitrary/near poles, 500 seeded rotated round trips and 100 rotated-limb checks. Net orientation, five joins/seven cuts, invalid gaps, texture boundary equality, canonical readout identity, buffer reuse and unchanged numerical bits/revision are checked.
- **165 browser tests pass with one existing intentional desktop touch skip**, across 166 final desktop/mobile cases. All eight original browser specs remain unchanged. Seven new cases per project cover actual App entry/return, bounded and wrapped unsaved document/camera/Redo preservation, every face/edge/corner in both views, physical recenter/readouts, native touch/pinch, mouse/keyboard, cancellation, net pan, Fullscreen and invalid gaps.
- Actual App N=256 preparation validates radius and resolution, supports cancelling/reopening initialization, and yields between batches. Responsive tests cover 3440×1440, 900×900 and 412×839 in addition to standard 1440×900 desktop/Pixel 7 profiles. Center selection stays physically aligned, and the visible canvas respects its 3,000,000 backing-pixel cap.
- The final browser suite retains A0–A5.2 brushes, edge assistance/phase rebasing, Focus Editing and connected previews, Pan/zoom/fullscreen, exact history, A3 v1 fixture compatibility and v1/v2 local Save/Open checks. Preview resolution uses explicit buttons, keeping the original saved-map dropdown and compatibility assertions intact.
- `npm.cmd run build` passes, including TypeScript, with 57 modules. No dependency or server service was added. The pure projection/cache/fixture layers have no React/DOM/database imports. Browser-specific component/input work is isolated behind explicit client boundaries.
- **80 baseline source/test/script files match**, excluding only the authorized App entry changes; 79 are byte-identical and the pre-existing Windows CRLF spec matches after Git line-ending normalization. All numerical providers/tools/history, planar/wrapped runtime, original browser tests and save formats are preserved. Historical evidence regenerated by old tests is restored to its approved baseline bytes.

The [verification receipt](evidence/a6-d1-verification.json) records commands, final counts, preservation hashes and benchmark summaries. The complete suite uses the existing configuration with an ignored dedicated-loopback override at port 5176, no server reuse, the same two projects/two workers and zero retries. Standard reproduction is `npm.cmd test`, `npm.cmd run test:browser`, `npm.cmd run build`; run only the new evidence with `npm.cmd run test:browser -- tests/spherical-preview.spec.ts`. No concept artwork is used.

## Actual screenshots

These are captures of the running App and the same N=128 numerical fixture, viewed in three directions and the net:

| View | Desktop | Mobile |
| --- | --- | --- |
| +X, feature crossing px/py | [Globe](evidence/a6-d1-desktop-globe-px.png) | [Globe](evidence/a6-d1-mobile-globe-px.png) |
| −X, corner-crossing feature | [Globe](evidence/a6-d1-desktop-globe-nx.png) | [Globe](evidence/a6-d1-mobile-globe-nx.png) |
| +Z, cap and seam geography | [Globe](evidence/a6-d1-desktop-globe-pz.png) | [Globe](evidence/a6-d1-mobile-globe-pz.png) |
| Complete six-face cutout | [Net](evidence/a6-d1-desktop-net.png) | [Net](evidence/a6-d1-mobile-net.png) |

## Rendering/performance evidence

The browser measures 16 rotation steps, four zoom actions, six projection switches and a 100-pointer-event burst at each N. Desktop is Chromium at 1440×900; mobile is the Pixel 7 Chromium profile at 412×839 **with 4× CPU throttling during navigation measurements**, running on this Windows machine. This is emulation, not a physical-phone hardware claim. Initial fixture setup is outside throttled navigation; actual App preparation is measured separately with scheduled batches.

| Profile | N | Rotation median / p95 (ms) | Zoom median (ms) | Switch median (ms) | All-action p95 (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Desktop | 128 | 22.25 / 26.10 | 53.60 | 26.85 | 55.10 |
| Desktop | 256 | 24.15 / 27.00 | 57.65 | 31.95 | 66.90 |
| Mobile, 4x CPU | 128 | 39.25 / 53.50 | 127.65 | 77.20 | 160.90 |
| Mobile, 4x CPU | 256 | 45.05 / 54.00 | 158.30 | 79.65 | 163.50 |

Raw timing/action samples, counted payloads, browser version and timestamps are in [desktop N128](evidence/a6-d1-desktop-n128-performance.json), [desktop N256](evidence/a6-d1-desktop-n256-performance.json), [mobile N128](evidence/a6-d1-mobile-n128-performance.json), [mobile N256](evidence/a6-d1-mobile-n256-performance.json). [Desktop](evidence/a6-d1-desktop-product-preparation.json) and [mobile](evidence/a6-d1-mobile-product-preparation.json) record actual N=256 App preparation wall time, including yields/cancellation verification.

Each fixture retains exactly one authority (393,224 / 1,572,872 B). Derived six-face RGBA payloads use 1,585,176 / 6,316,056 B, with a second display copy in Canvas2D textures. Setup uses one temporary authority snapshot and one face index lattice at a time. Navigation performs **zero full elevation copies** and only inspection reads, reusing the same caches across rotation, zoom and view switching. A burst of 100 pointer events coalesces to at most two paints; an idle refinement may add a later paint. Source revision, metadata and every Float32 bit remain unchanged.

Globe rasters are capped at 180k navigation/420k settled pixels on desktop, 70k/220k on coarse-pointer profiles. The visible canvas caps at DPR 1.5 and 3 million pixels (12 MB RGBA backing payload). One scratch canvas and one same-size reusable output buffer add at most about 3.36 MB at settled desktop quality. RGBA texture plus texture-canvas payload is about 3.17 / 12.63 MB for N=128/256. Combined steady spherical authority, textures, visible canvas and scratch/output payload is conservatively below about 20 / 30 MB at these limits, excluding the preserved planar document/history, browser/internal graphics buffers, JS objects, temporary ImageData copies and deferred GC. These are explicit payload estimates, not measured process RSS or a physical-device memory ceiling.

Navigation uses a lighter raster and refines after 180 ms without updates. It stays independent of numerical N after cache construction; switching to N=256 increases setup/cache memory, not per-event numerical reconstruction. CPU rendering does not promise 60 fps on weaker devices. Settled redraws/view switches are more expensive than drag frames. The fixture host's synchronous setup timing is not the product's frame-yielding setup policy. A6-D2 must measure numerical dabs, dirty-cache updates and rendering together; no improvement to A6-C Smooth is claimed here.

## Exact changed files

| Files | Responsibility |
| --- | --- |
| `src/App.tsx` | Explicit-radius/session-only entry, resolution buttons, inert preserved editor and shortcut boundary |
| `src/components/SphericalPreview.tsx` | Session fixture lifetime, scheduled initialization, cancellation and return |
| `src/components/SphericalViewport.tsx` | Read-only globe/net canvas, caches, scheduling, selection, controls and fullscreen |
| `src/components/SphericalPreview.module.css` | Scoped responsive overlay workspace and controls |
| `src/interaction/spherical-navigation.ts` | Separate mouse/pen/touch/pinch/keyboard navigation lifecycle |
| `src/rendering/spherical-view.ts` | Pure camera, projection/inverse, net layout/fold classification and canonical inspection |
| `src/rendering/spherical-raster.ts` | Derived RGBA cache and bounded CPU globe raster |
| `src/rendering/spherical-view.test.ts` | Five mathematical/rendering regression cases |
| `src/terrain/spherical-preview-fixture.ts` | Explicit deterministic seam/corner test geography |
| `tests/fixtures/sphere.html`, `tests/fixtures/sphere.tsx` | Test-only shared viewport host and exact-bit/performance probes |
| `tests/spherical-preview.spec.ts` | Seven cases in each browser project; screenshots and timing receipts |
| `README.md` | Preview usage, current scope and evidence links |
| `docs/ARCHITECTURE.md`, `docs/WORLD-SURFACE-ARCHITECTURE.md` | Layer ownership, current capabilities and future provider boundaries |
| `docs/PHASE-1-HEIGHTMAP-ROADMAP.md` | A6-C approval, A6-D1 status and explicit D2 authorization gate; complete inventory preserved |
| `docs/SPHERICAL-SCULPTING.md` | Current D1 viewing note and remaining D2 editing requirements; numerical policy unchanged |
| `docs/SPHERICAL-VIEWS.md` | Projection, navigation, memory/tolerance contracts and D2 obligations |
| `docs/A6-D1-COMPLETION.md` | This report |
| `docs/evidence/a6-d1-{desktop,mobile}-globe-{px,nx,pz}.png` | Six actual directional screenshots, individually linked above |
| `docs/evidence/a6-d1-{desktop,mobile}-net.png` | Two actual complete-net screenshots |
| `docs/evidence/a6-d1-{desktop,mobile}-n{128,256}-performance.json` | Four actual browser performance receipts |
| `docs/evidence/a6-d1-{desktop,mobile}-product-preparation.json` | Two scheduled product initialization receipts |
| `docs/evidence/a6-d1-verification.json` | Final verification and exact changed-file manifest |

## Remaining boundary and delivery

A6-D2 must explicitly integrate navigation/painting arbitration, geodesic projected brush previews, continuous face transitions and appropriate edge assistance, exact one-operation GUI history and bounded revision-aware rendering updates. It must address the A6-C Smooth performance concern with measured, independently checked changes rather than assuming the view cache solves numerical editing cost. These requirements are documented only.

Spherical persistence follows separately. No spherical sculpting gestures, browser sphere Save/Open, physical cube/pyramid/cylinder/hollow editors, rivers/erosion, generator, living history, illustrated cartography, true terrain extrusion or Worlds integration is included. The full roadmap and [Issue #1](https://github.com/Revty79/serrian-tide-world/issues/1) remain intact. Step 9 joins Atlas to separately rebuilt Worlds and develops combined functionality; Step 10 integrates the completed system into Serrian Tide; Step 11 supplies the final reusable historical/modern Earth foundation. Existing Next.js authentication, authoritative permissions, database and World-record ownership remain future host responsibilities.

Delivered directly on `main`. The final handoff supplies the verified full commit SHA; this report's containing commit is identified with `git log -1 --format=%H -- docs/A6-D1-COMPLETION.md`. No deployment, original website or database write occurs. **STOP after A6-D1 for review. Do not begin A6-D2 without authorization.**
