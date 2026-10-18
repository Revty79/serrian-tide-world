# Pass A5 — Seamless terrain wrapping and continuous navigation

Date: October 17, 2026. Repository: `Revty79/serrian-tide-world`, branch `main`.

Approved A4 baseline: `d01a4163dcfff4f1c07ccc2cd818071bfaebb5c5`. The owner supplied Ember's A4 source/architecture approval and explicitly authorized A5, direct delivery to main, the map-filling/fullscreen supplement and the recentering/rendering supplement.

## Delivered behavior

A creator can choose **New Wrapped Map**, raise terrain across its horizontal seam, drag that same land into the center, continue with Raise/Lower/Smooth/Flatten, Undo/Redo, Save, close the page and Open the map with identical Float32 data and surface identity. Horizontal panning has no map-edge stop. Top and bottom remain real boundaries. Visible repetitions reference one numerical authority.

The map fills the window by default. Bounded Fill preserves aspect by cropping, with panning to the clipped terrain. Wrapped Fill displays one vertical extent and enough horizontal repetitions to cover the stage. **Fit Entire Map** is a separate action; its margins are real non-map areas. The left tools remain an overlay, with keyboard focus/escape handling and floating actions. Native browser fullscreen is optional and independent of Fill.

Elevation-before-palette interpolation replaces the editor's nearest-neighbor display, with local shoreline coverage antialiasing and normal Canvas/CSS smoothing. This changes presentation only. The numerical grid stays 512 × 512 by default; no geographic detail is invented. Both supplements are included in A5, so no separate layout/rendering checkpoint is left unfinished before A6.

This is a horizontally periodic **planar** editing surface. A globe, physical cylinder, caps, hollow editor and other future shapes are not implemented.

## Numerical topology and brush mathematics

For width `W`, height `H`, `C` columns and `R` rows:

```text
canonical u = u mod W, adjusted into [0, W)
sample u(c) = c / C × W                  c = 0 … C−1
sample v(r) = r / (R−1) × H              r = 0 … R−1
du = min(abs(u1−u2), W−abs(u1−u2))        after canonicalization
distance = hypot(du, v1−v2)
```

The last column is at `W × (C−1)/C`, not at `W`. There is no second editable endpoint at the seam. The authoritative sample key remains row-major `row × C + column`, with one Float32 value per physical sample. Horizontal neighbor lookup wraps modulo C; vertical neighbors clip. The wrapped terrain factory and sampling use A4's rectangular topology, metric and lattice, cached by terrain identity. New maps retain −100 m everywhere, sea level 0 m, and neutral map units. There is no implicit physical-size conversion.

The shared brush kernel enumerates candidate physical columns once. If a footprint spans an entire period it enumerates all columns exactly once, rather than collecting duplicated visual tiles. It then tests the shortest-wrap metric against the radius. Smooth snapshots the candidate neighborhood and wrapped halo before each dab; its 3 × 3 neighborhood resolves real connected samples, deduplicating horizontal neighbors even on a two-column grid. It never reads its own partially updated dab. Top/bottom retain smaller bounded neighborhoods.

Existing falloff is `f(t) = (1−t)²(1+2t)` for normalized distance `0 ≤ t < 1`. Raise/Lower add/subtract `strength × f`; Flatten and Smooth blend with `intensity × f` toward their explicit target/local snapshot average. Values round to Float32 with the existing finite saturation. All four tools share this kernel and the existing parameter validation.

A stroke holds unwrapped horizontal path coordinates. Dab spacing remains radius/4 along the input polyline, carrying residual distance between events; duplicate events, elapsed stationary time and release add no strength. Each dab canonicalizes only for physical influence. This preserves winding through a seam without taking an unintended long or short path. Repeated travel over the same geography may intentionally affect it in later dabs; a single dab never applies once per visible copy.

Version 1 remains endpoint-inclusive on both axes, using `c/(C−1) × W`. Its two edge columns may differ and are never reinterpreted as a periodic lattice. New Wrapped Map creates a new ID/buffer/history and explicit surface identity; no bounded-to-wrapped conversion exists.

## View, navigation and input

The pure camera still stores `{zoom, centerX, centerY}` in normalized map coordinates. Fit uses contain scale. Bounded Fill uses `max(stageWidth/W, stageHeight/H)`. Wrapped Fill uses `stageHeight/H`, then repeats horizontally. The same geographic scale applies to both axes. Zoom is 1–8 relative to the chosen mode. Fill resets zoom while retaining the current working center where boundary constraints allow; Fit resets to center (0.5, 0.5).

Periodic centerX is reduced modulo one after every pan. Large pixel displacement is reduced by the rendered period before addition, retaining useful fractional phase instead of accumulating huge offsets. A phase jump by one period is visually equivalent. Vertical translation stays constrained. Tests cover 10,000 pans, billion-period displacements and pointer-anchored zoom across rebasing. No camera operation rotates, shifts, rewrites or resamples elevation arrays, identities or saved data.

The periodic renderer draws one cached source with a transformed `repeat-x` CanvasPattern into a stage-sized DPR bitmap. A display sample is centered at the corresponding map coordinate, with horizontal period `rect.width`; vertical source endpoint spacing is `rect.height/(source.height−1)`. The half-pixel pattern translation aligns source sample centers. Only the actual vertical map interval is painted/hit-testable. The bounded renderer retains a contain-sized bitmap and uniform CSS scale, including Fill/zoom, avoiding zoom-squared backing allocations.

Rendering records the **applied** rectangle. Pointer inversion, hover and preview use that painted rectangle rather than a pending camera state. x is unwrapped for a captured stroke and canonicalized for sampling; preview circles repeat across visible instances. Internal canonical cuts do not end a stroke. Real vertical edges or leaving the visible stage clip/end it. A change of painted bounds ends active sculpting before another transform is applied. Navigation claims input before brushes; switching tools, Pan, cancellation, capture loss, resize, visibility loss and page departure safely terminate partial strokes. The existing touch deferral/two-finger navigation latch remains intact.

For programmatically created extreme aspect ratios, if a preview would require more than 1,024 rings or unsafe integer copy indices, the preview is hidden to avoid unbounded DOM work. The map/readout remain responsive and the authoritative buffer remains unchanged; ordinary supported workspace layouts show all rings. These degenerate subpixel periods are not a useful editing scale and are not exposed by the new-map UI.

Optional fullscreen is requested on the workspace from an explicit button click. The App observes `fullscreenchange`, supports browser-controlled exit, hides the action where unsupported, and catches request/exit failures without replacing terrain. Enter/exit finishes active input first; existing Undo remains available. Fill covers the workspace even without browser fullscreen.

The implementation uses the documented [CanvasPattern transform](https://developer.mozilla.org/en-US/docs/Web/API/CanvasPattern/setTransform) and [Fullscreen request lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen).

## Smoother presentation and performance

The previous editor classified the native 512² raster and enlarged it with nearest-neighbor drawing/CSS `image-rendering: pixelated`. The new path bilinearly interpolates **height first**, then applies the existing elevation palette and actual sea level. Periodic interpolation includes the last-to-first cell; bounded interpolation clamps to its endpoints. Coast-crossing cells estimate area coverage using the local bilinear height gradient integrated over one display pixel. Only that boundary coverage blends land/water colors. There is no image-wide blur or numerical smoothing operation.

Shoreline coverage is a local linear approximation, not exact contour geometry; saddle cells and highly magnified native-grid features retain finite-resolution limits. Canvas filtering handles remaining display scaling with `imageSmoothingEnabled`; CSS uses `auto`. The exact nearest-sample readout can therefore differ from an interpolated boundary pixel's apparent color. Brush location/footprint, save bytes and Undo use the numerical grid, never the display cache. [Canvas smoothing API](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled)

For the default wrapped grid, the desktop presentation cache is 1024 × 1023 (1,047,552 pixels, about 4 MiB RGBA); coarse-pointer/mobile is 768 × 767 (589,056 pixels, about 2.25 MiB). Temporary image arrays, source canvas, stage DPR bitmap and browser/GPU overhead are additional memory. Supersampling is capped at 4× per axis and decreases as the source grid grows; it never drops original samples to meet the mobile supersampling budget. Accepted authoritative grids remain capped at 1,048,576 samples by the save codec. Zoom and visible repetition do not increase numerical storage or source-cache resolution.

Wrapped pan/zoom repaints only the pattern. Edits invalidate the source once per scheduled frame, not once per event/copy. Bounded navigation uses its existing CSS transform. The existing browser scheduling test still proves 60 events in one task schedule one repaint and no React commits. No new dependency, worker, server or tiled terrain system was added.

[Measured rendering receipt](evidence/a5-rendering-performance.json): Chromium under 4× CDP CPU throttling, four pans then one dab, with no terrain changes during navigation:

| Profile | Source rebuilds during pan | Rebuilds for dab | Cached pixels | Input through next frame |
| --- | --- | --- | --- | --- |
| Desktop | 0 | 1 | 1,047,552 | 385.2 ms |
| Pixel 7 emulation | 0 | 1 | 589,056 | 409.5 ms |

These are automated input-to-frame wall times including automation overhead, not isolated raster timings or a frame-rate guarantee. The mobile result uses touch/DPR emulation on the development machine, not physical weak-device hardware. All four seam-tool browser checks also exercise an alternating land/water source. Real-device performance acceptance remains for the owner; A6 must establish its own multi-patch budget. The guard against pathological preview allocation is verified in both profiles.

Interpolation does **not** add islands, samples or geographic detail. Genuinely higher-resolution or tiled authority needs explicit resolution changes, ownership/halo rules, brush/history behavior, memory/invalidation budgets and persistence/version design in a future authorized pass. No such conversion or terrain resampling occurs in A5.

## Persistence, compatibility and recovery

Wrapped saves retain `format: serrian-tide-heightmap`, with explicit `formatVersion: 2` and metadata `dataVersion: 2`. Added metadata declares `topology: horizontal-periodic`, `sampleOwnership: unique-u-inclusive-v` and `{worldId,surfaceId,patchId}`. Existing dimensions, resolution, units, sea level and terrain ID remain explicit. The development UUIDs are local identities, not invented database World records.

The payload remains exact `float32-le-row-major` bytes, including signed zero. SHA-256 covers the canonical validated header, including topology/ownership/identity, followed by the payload. Validation rejects unsupported versions/ownership/units, missing identities, invalid dimensions/dates/names, unsafe lattice precision, wrong counts/byte lengths, checksum mismatches and nonfinite elevations before replacing active work. The bounds remain 2–4096 samples per axis and at most 1,048,576 total. Common encoding/checksum helpers preserve the original v1 canonical key ordering and bytes; the frozen A3 checksum fixture still passes.

`encodeMap`/`decodeMap` dispatch by explicit version. The original v1 codec remains available. IndexedDB stays **schema version 1**, with the original `heightmaps` and `catalog` stores and unchanged summary shape. No upgrade or migration runs. Save validates before opening an atomic two-store transaction, checks the existing record inside that transaction, and rejects same-ID replacement across formats or v2 surface identities. It reports success only at transaction completion. Actual browser tests keep a v1 record unchanged while saving/reopening/editing a v2 record and reject corrupt v2 Open without damaging the dirty active map/history.

Undo/Redo and Reset keep their A3 exact bit-word implementation, 16 MiB/100-entry history budget and single terrain-buffer identity. A complete or partially cancelled seam stroke is one operation. Reset/Undo/Redo are tested bit-for-bit on wrapped terrain. Camera, rendering and display-mode changes create no terrain history and never mark data dirty. Histories/camera remain session-only and are not saved.

Rollback to A4 leaves all v1 records readable with their original meaning; A4 safely refuses v2 as unsupported. Returning to A5 is required to open v2. No original bounded record has been converted or overwritten, so its old authority needs no restoration. Browser-local data can still be cleared or evicted; explicit Save, storage failure handling and unsaved-change guards remain the existing preservation mechanism, not autosave or a backup/export facility.

## Future geometry and host integration

Repositioning the working surface is a firm requirement for all future supported shapes. Keep fixed geographic coordinates in the authority and put rotation, movable projection cuts and local spherical editing centers in projection-specific view state. A6 must implement/prove consistent projection, inverse hit testing and projected intrinsic brush footprints across faces/poles. A7 must independently select hollow exterior/interior surface identity and preserve separate terrain/history while moving either view. Periodic phase is one concrete flat adapter, not globe rotation. A4's generic `MapProjection<ViewState>` remains a contract; A5 does not pretend it supplies a universal curved projection.

The pure numerical/surface layers remain independent of React, DOM, storage and authentication. The reusable canvas remains a client component with scoped CSS, callbacks and a small imperative boundary. The temporary Vite App owns document creation/local storage/UI. Eventual Serrian Tide Next.js integration must supply actual World records, authentication, server-side permissions, database persistence and concurrency rules. No original-website file or database, deployment or server infrastructure was changed.

## Verification and evidence

Final checks:

- `npm.cmd test`: **93 passed**, no skipped numerical cases.
- `npm.cmd run test:browser`: **115 passed, 1 intentional skip** across 116 desktop/mobile cases. The retained skip is the desktop duplicate of the native single-touch test; the mobile native-touch case passes. Native pen and seam-crossing touch run on both profiles, and native pinch navigation remains covered.
- Focused cache/CPU and subpixel-preview checks: **4 passed**; the JSON receipt above records actual measurements.
- `npm.cmd run build`: typecheck and production bundle passed.
- `git diff --check`: passed. A0–A4 reports/screenshots, frozen A3 save, history engine, A4 surface source and package/lock files have no changes from the approved baseline.

Viewport checks include 1440 × 900 wide desktop, 3440 × 1440 ultrawide bounded Fill, 2560 × 900 repeated view, 900 × 900 square, and 412 × 839 tall/mobile. Tests verify coverage/alpha at both horizontal edges, uniform proportions, cropped-area navigation, noneditable Fit margins, repeated sample ownership, camera-only digest stability, exact numerical readout after zoom, cursor footprint, seam cancellation/tool changes, v1/v2 preservation and fullscreen success/exit/failure. Browser errors are captured and asserted empty. Resize tests wait for the painted transform before using coordinates.

Actual screenshots (no mockups; mobile images retain the emulated device DPR):

| Evidence | Desktop | Mobile |
| --- | --- | --- |
| Default bounded Fill, no unused sidebars | [Desktop](evidence/a5-desktop-bounded-fill.png) | [Mobile](evidence/a5-mobile-bounded-fill.png) |
| Seam-crossing island and repeated footprint | [Desktop](evidence/a5-desktop-seam.png) | [Mobile](evidence/a5-mobile-seam.png) |
| Same saved island recentered solely by panning | [Desktop](evidence/a5-desktop-recentered.png) | [Mobile](evidence/a5-mobile-recentered.png) |
| Continued tools, Fill and zoomed elevation display | [Desktop](evidence/a5-desktop-zoomed-rendering.png) | [Mobile](evidence/a5-mobile-zoomed-rendering.png) |

Seam/recenter screenshots deliberately use Fit to expose one canonical period and its repetitions. The tall/mobile Fit screenshots therefore show intentional top/bottom margins; default Fill/zoom screenshots show actual map coverage. Desktop seam evidence shows two views of the same crossing island; these are not two stored islands. The automated Save digest is identical before/after the recenter screenshot. Final screenshots were visually inspected for proportions, coast appearance, cursor alignment and lack of cracks/sidebars in Fill.

To reproduce the owner workflow: open tools, choose New Wrapped Map, increase radius/strength, close tools, select Fit Entire Map and raise near a horizontal period boundary. Hold Space and drag the land to the center. Sculpt with all four tools; Undo/Redo; Save. Reload, select its saved name and Open Map; continue sculpting. Use Fill View for the map-filling workspace and optional fullscreen. Existing bounded saved maps remain separately selectable.

## Exact file inventory

Modified:

```text
README.md
docs/ARCHITECTURE.md
docs/PHASE-1-HEIGHTMAP-ROADMAP.md
docs/WORLD-SURFACE-ARCHITECTURE.md
src/App.tsx
src/components/TerrainCanvas.module.css
src/components/TerrainCanvas.tsx
src/interaction/canvas-sculpting.ts
src/persistence/local-map-store.ts
src/persistence/terrain-format.ts
src/rendering/camera.ts
src/rendering/canvas-renderer.ts
src/styles.css
src/terrain/brush.ts
src/terrain/model.ts
src/terrain/sampling.ts
tests/atlas.spec.ts
tests/fixtures/terrain.tsx
tests/refinement.spec.ts
tests/sculpting.spec.ts
tests/surface-compatibility.spec.ts
tests/workspace.spec.ts
```

Added:

```text
docs/A5-COMPLETION.md
docs/evidence/a5-desktop-bounded-fill.png
docs/evidence/a5-desktop-recentered.png
docs/evidence/a5-desktop-seam.png
docs/evidence/a5-desktop-zoomed-rendering.png
docs/evidence/a5-mobile-bounded-fill.png
docs/evidence/a5-mobile-recentered.png
docs/evidence/a5-mobile-seam.png
docs/evidence/a5-mobile-zoomed-rendering.png
docs/evidence/a5-rendering-performance.json
src/persistence/heightmap-payload.ts
src/persistence/map-format.ts
src/persistence/wrapped-format.test.ts
src/persistence/wrapped-format.ts
src/rendering/display-raster.test.ts
src/rendering/display-raster.ts
src/rendering/wrapping-camera.test.ts
src/terrain/topology.ts
src/terrain/wrapping.test.ts
tests/wrapping.spec.ts
```

Existing browser tests explicitly select Fit for their prior bounded-frame assertions; historical screenshot destinations are preserved rather than overwritten. No files are deleted, no dependencies added and no numerical/history tests weakened to accommodate wrapping.

## Acceptance boundary

A5 is ready for Ember's independent source/visual review and owner acceptance; automated verification is not a substitute for either. Real-device acceptance, other browser engines, extreme aspect/zoom performance and genuine higher-resolution terrain remain limits. Browser fullscreen support varies. There is no autosave, external import/export, server persistence, illustrated map, simulation or historical timeline.

Delivery is directly to main, with the exact commit SHA reported to the owner after push verification. **Stop after A5. A6/A7 and main-site integration require separate authorization.**
