<!-- Current interface: A7-P1B. Historical completion reports describe their original checkpoints. -->
# Serrian Tide Atlas

Pass A7-P1B: Cylinder preparation now uses ordered, revision-acknowledged worker tasks with authoritative main-thread commits/history and event-driven Save draining. A7-P1A-R elevation-first coastlines, physical-gradient relief, elevation colors and GPU/CPU display behavior remain intact. See [completion and measured evidence](docs/A7-P1B-COMPLETION.md), the [shared painting contract / sphere adoption plan](docs/SURFACE-PAINTING-CONTRACT.md), and the [previous matched visual review](docs/evidence/a7-p1ar-visual-review.html). Stop for Ember review and owner hands-on acceptance before migration to another shape or new geometry.

This repository is a standalone **development workspace**. Atlas will eventually join the **existing** Serrian Tide Worlds section in isolated development, preserving existing information, organization, data and functionality wherever practical. The owner superseded the earlier separate-Worlds-rebuild plan. Functional interconnected Atlas maps must precede website integration; the [eleven-phase roadmap](docs/PHASE-1-HEIGHTMAP-ROADMAP.md) governs the sequence. The original website remains untouched in this pass.

## Run and verify

Use Node.js 24.x and npm. In PowerShell:

```powershell
cd D:\serrian-tide-world
npm.cmd ci
npm.cmd run dev
```

Open <http://127.0.0.1:5173/>. The server binds to loopback only; stop it with Ctrl+C. On other shells, use `npm` in place of `npm.cmd`.

```powershell
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:browser
npm.cmd run build
```

`npm.cmd run check` runs the numerical tests, browser tests and build. Browser tests start a local dev server if needed. `npm.cmd run preview` serves an existing build locally without deploying it.

## Use the workspace

The map stage occupies the browser viewport. **Atlas / Open tools** reveals a scrollable left panel that overlays the map. It never shrinks or stretches the map. Escape ends drawing and closes the panel, returning focus to its toggle when focus was inside. The panel is nonmodal; Tab can reach the floating actions and canvas. Reduced-motion preferences suppress the slide animation.

- **Raise / Lower:** add or subtract 10–1,000 meters per dab at the center, default 200.
- **Smooth:** blend toward a local 3 × 3 pre-dab neighborhood average.
- **Flatten:** blend toward an explicit positive, zero or negative target in meters. Invalid targets disable this brush until corrected.
- **Radius:** 0.5–20% of the map's shorter logical side, default 6%.
- **Intensity:** Smooth/Flatten blend 1–100% per dab, default 50%.
- **Strokes:** click for one dab or drag with mouse, pen or one finger. Dabs are spaced by a quarter radius; duplicate events and stationary time add nothing. Settings apply to the next stroke. Cancellation retains the completed portion as one undoable operation.
- **Navigate:** wheel toward the pointer; use Zoom In/Out; select Pan or hold Space and drag. Two fingers pan and pinch. Zoom is limited to 100–800% of the chosen view mode. Navigation never changes elevation. Single-touch painting waits for movement or release so a second finger can claim navigation without an accidental initial dab.
- **Continue drawing at the screen edge:** enabled by default; switch off **Scroll while drawing at screen edges** in tools if preferred. During an active stroke, hold within 48 CSS pixels of an unobstructed edge for 200 ms. The view scrolls beneath the brush, preserving its distance spacing and one Undo entry. Release, Escape, cancellation, loss of capture/focus, tool changes or entering an overlaid control stop drawing. Hovering never scrolls. Bounded terrain stops at its real edges; zoom in to create horizontal room on a wide screen. Captured pointers just beyond the viewport stay clamped to its edge; losing browser focus ends the stroke.
- **Focus Editing:** the default for new/opened wrapped maps. At 100%, a centered working cycle targets 82% of typical desktop width, with 9% adjoining previews on each side. A uniform scale preserves proportions; pan vertically to reveal cropped latitude. The lightly shaded previews remain editable and share the same terrain. Panning moves the geographic cut beneath the centered working window. Zoom can crop beyond that window; Focus Editing resets its zoom to 100%.
- **Fill / Fit:** bounded maps still default to Fill View. For wrapped maps, Fill View restores the original full-height presentation with broader horizontal context. Fit Entire Map shows the complete period/rectangle without cropping and resets the center; real margins are not editable. Focus and Fill reset zoom while retaining the working center where bounds allow. Square/tall focus views retain full-height coverage, so a whole period may extend beyond a narrow viewport; Fit shows it all. Extremely wide views cap focused vertical magnification at 2× full height rather than cropping almost all latitude.
- **Repeated geography:** the side previews and working area show connected parts of the same height field, with the same orientation and authority. Editing any visible copy updates every view. Focus boundaries are view cuts that move over geography while panning. Full-height/ Fit guides mark canonical period boundaries; surrounding repetitions remain legitimate.
- **Fullscreen:** the small fullscreen button uses the browser's optional Fullscreen API. Use it again or the browser's exit action to leave. Ordinary windowed Fill already covers the workspace.
- **History:** floating Undo/Redo, Ctrl/⌘ Z, Ctrl/⌘ Shift Z, or Ctrl Y. Confirmed Reset Terrain is undoable. A new numerical edit clears Redo. Text fields retain their native Undo behavior.
- **Preserve work:** name the map, use floating Save or Ctrl/⌘ S, select a saved map and Open Map. Save replaces the local record with the same terrain identity. New World / Map opens a shape selector for bounded flat, horizontally wrapped flat, or spherical worlds. Horizontal periodic wrapping has bounded top/bottom; it is not a complete physical cylinder. New/Open ask before discarding unsaved changes. Reload/closing uses the browser's standard unsaved-change prompt where supported.

Save explicitly before leaving. Saves belong to the **current browser profile and origin on this device**, are not synchronized to Serrian Tide, and can be removed by clearing browser data. Private browsing and browser eviction policies affect their lifetime. There is no autosave, crash recovery, external import/export, server storage, or separate account system. A browser may not fire an unload event when a mobile app is killed.

## Spherical workspace

Atlas opens with **New World / Map**, before allocating any terrain. Choose bounded flat, horizontally wrapped flat, or spherical world. Spheres require an explicit **Sphere reference radius (m)** and N=128 or N=256. Each starts as blank ocean at −100 m. **Browse saved maps** opens the shared mixed library. All shapes use the same full-viewport shell, name, Save/Open, history, tools and status. Contextual controls retain the appropriate units and navigation; Globe and Six-face Net are views of one spherical authority. The old development preview/Return to map launchers are absent from the product.

Creating or opening a world replaces the one active document only after preparation succeeds and unsaved changes are resolved. Canceling or failing retains the current terrain, camera and history. There is no hidden planar editor behind a sphere. Preparation can be canceled. New/Open never convert geography or change existing record identities.
Select a brush to draw with mouse, pen or one finger. **Open tools** contains physical meter radius, m/dab strength, percentage intensity and meter Flatten target. The development UI radius range is 0.005–0.2 × reference radius. Geodesic previews follow the real footprint, including chart splits and visible-hemisphere clipping. Select **Rotate / Pan**, hold Space, use the middle mouse button, or use two fingers to navigate. Wheel/pinch and zoom buttons change display scale. Canvas arrows navigate, +/− zoom, Enter selects the center and Home resets. **Center selection** brings the selected physical position to the globe center. Floating Undo/Redo and standard shortcuts restore exact sample bits across views; text fields keep native Undo.

Solid net folds join geography; dashed amber edges are visual cuts into the same surface. Crossing a genuine join continues a stroke. Entering a gap, crossing a disconnected cut or taking an ambiguous diagonal corner shortcut ends it; lift and restart. Optional net screen-edge assistance pans connected terrain after a 200 ms dwell. D2-R globe assistance rotates after holding an active brush near the actual limb for 240 ms; contextual settings can disable it. Fullscreen and the overlay panel preserve terrain.

Name every shape using **Map name** in the common tools, then **Save** or Ctrl/⌘ S. Save drains accepted queued spherical input before taking its snapshot. **Saved maps → Open Map** opens v1 bounded, v2 wrapped and v3 spherical worlds in the same workspace. The library identifies typed records; older untyped catalog rows honestly retain their Planar (legacy) label without rewriting data. Reopening starts fresh Undo/Redo/camera state. Failed writes retain edits and the previous committed record; errors never replace the saved/modified indicator. IDs, radius, finite Float32 words and legacy formats stay unchanged. Browser-local/profile/origin/device limits apply to all shapes.
The browser patches revision-keyed textures and schedules complete numerical dabs in bounded frame slices, with a lighter globe raster while painting. Display interpolation adds no geographic detail. Save/Open and texture preparation yield main-thread work with visible progress. See [v3 format, atomicity and limits](docs/SPHERICAL-PERSISTENCE.md), [E screenshots/performance/exact files](docs/A6-E-COMPLETION.md), [editing architecture](docs/SPHERICAL-EDITING.md) and [projection mathematics](docs/SPHERICAL-VIEWS.md).

## Numerical terrain and integration

New maps in the existing editor have 512 columns × 512 rows in a row-major `Float32Array` (262,144 samples, 1 MiB), initially all −100 m. Sea level defaults to 0 m; water includes equality. Bounded maps retain version 1's independent edge samples and save contract. Wrapped maps use explicit version 2 metadata/records, with unique samples per horizontal period and World/surface/patch identities. No conversion occurs. The provisional extent is a neutral 1 × 1 map-unit rectangle, independent of sample resolution and physical-world scale.

Rendering and the camera only read terrain. A uniform scale preserves actual terrain proportions. Periodic copies share one source cache and one numerical buffer. Rendering interpolates elevation before applying the palette and antialiases shoreline coverage; CSS pixelated scaling is removed. This improves presentation without creating new geographic detail. The authoritative resolution, exact sample readout, brushes, history and save bytes are unchanged by display interpolation. Cache sizes are bounded independently of zoom; mobile uses less display supersampling. See the [A5 report](docs/A5-COMPLETION.md) for alignment, performance and rendering limits.

The numerical engine has no React, DOM, Vite, authentication, network or database dependencies. Client components use scoped CSS and an explicit `'use client'` boundary. The host owns terrain lifetime, history callbacks, storage and permissions. The full-screen shell is replaceable; the future Next.js host will use its own authentication, authoritative access checks, database and World records.

## Source map

| Location | Responsibility |
| --- | --- |
| `src/terrain/` | Bounded/periodic brushes; spherical provider, bounded cap search and all four physical spherical tools; shared numerical falloff/saturation |
| `src/surfaces/` | Pure contracts, bounded/periodic math, real cube-sphere geometry/seams/tangent conversion and legacy binding |
| `src/rendering/` | Colors, interpolated presentation cache, repeated canvas drawing, periodic Focus policy, Fill/Fit and pure camera math |
| `src/interaction/` | Pointer lifecycle, stroke boundaries, navigation/brush arbitration |
| `src/editor/` | Existing planar history/document checkpoints; separate spherical history through canonical writes and private snapshots |
| `src/persistence/` | Separate v1/v2/v3 validated little-endian formats, cooperative sphere validation/restore and one IndexedDB adapter |
| `src/components/` | Reusable client canvas, controlled brush inputs and elevation legend |
| `SphericalPreview`, `SphericalViewport`, `SphericalSession` | Separate disposable host, embeddable globe/net viewport, and tracked numerical editing/history/display session |
| `src/App.tsx`, `src/styles.css`, `src/main.tsx` | Temporary full-screen development host |
| `tests/` | Desktop/mobile browser proofs and test-only numerical fixture |
| `scripts/measure-spherical.mjs` | Reproducible numerical allocation, connectivity and seam-write receipt |
| `scripts/measure-spherical-brush.mjs` | Preserved A6-B Raise/Lower benchmark and signed-zero receipt |
| `scripts/measure-spherical-tools.mjs` | A6-C N=128/256 Smooth/Flatten performance, bounded payloads and exact history |
| `docs/evidence/` | Actual screenshots/numerical receipts; prior-pass evidence remains historical |

The A4 surface contracts remain independent of React, Canvas, DOM and browser storage. A5 uses their periodic math. A6-A/B/C supply the numerical sphere and four physical tools; D2 connects browser editing, and E adds a separate v3 codec without changing v1/v2 interpretation. A radius in meters is required; default resolution N=128 has 98,306 unique samples (393,224 elevation bytes). Face charts represent a **round** world, not a physical cube. Independent hollow surfaces remain future work.

Reproduce the numerical memory/topology receipt with `node --expose-gc scripts/measure-spherical.mjs`. An optional final argument writes its JSON output to an explicit path.

The spherical API is `startSphericalBrushStroke(terrain, physicalPoint, settings, history?)`. Settings share physical `radiusMeters`; Raise/Lower use positive `strengthMeters`, Smooth uses blend `intensity` (0…1), and Flatten uses `intensity` plus positive/negative/zero `targetElevation` meters relative to the defined sea-level datum. Physical points carry World/surface identity and either a direction or a validated face address. Movement follows shortest great-circle segments with radius/4 meter spacing; near-antipodes require explicit intermediates. `SphericalHistory` retains at most 16 MiB/100 entries by default and never receives the authority buffer. See the [sculpting API and limits](docs/SPHERICAL-SCULPTING.md). Run `node scripts/measure-spherical-brush.mjs` for the preserved A6-B reference and `node scripts/measure-spherical-tools.mjs` for A6-C performance/history evidence.

See [World/surface architecture](docs/WORLD-SURFACE-ARCHITECTURE.md), [integration architecture](docs/ARCHITECTURE.md), [A6-C completion and exact files](docs/A6-C-COMPLETION.md), and the [complete master roadmap](docs/PHASE-1-HEIGHTMAP-ROADMAP.md). All prior completion reports remain historical receipts.

The owner authorized A7-D directly on main from `cf9fb1ba6e18d07fcf1d1834d5232f5866c5cf95`. Physical capped cylinders now join the normal **New World / Map** selector at **/**, using explicit meter dimensions, tested 64/128/256 detail, the accepted physical/connected views and four tools, exact history, versioned v4 local Save/Open and genuine saved checkpoints. See [A7-D completion](docs/A7-D-COMPLETION.md) for the implementation inventory, integrated screenshots/traces, full regression evidence, measurements and limits, and [v4 persistence](docs/CYLINDRICAL-PERSISTENCE.md) for the storage/lifecycle contract. **Stop after A7-D for Ember's independent review and owner hands-on acceptance. Do not automatically begin another geometry phase.** No original-site, Worlds database or production deployment change.

## Unified workspace checkpoint

[A6-F1 architecture and evidence](docs/UNIFIED-WORKSPACE.md) records the document/view boundary and safe switching. [Issue #2](https://github.com/Revty79/serrian-tide-world/issues/2) also records future explicit, previewable, non-destructive map-to-shape conversion. Conversion is not implemented. [A6-D2-R completion](docs/A6-D2-R-COMPLETION.md) supplies continuity proofs, exact results, screenshots, traces and performance measurements. Hold near the actual globe limb for 240 ms to rotate; disable this assistance in contextual Physical brush settings. Release drains accepted work; cancellation retains applied work. Drawing outside the globe stops. The live Serrian Tide website is untouched.

## Cylinder development preview (A7-C)

Run `npm.cmd run dev`, then open **http://127.0.0.1:5173/dev/cylinder.html**. This separate development entry starts blank physical terrain at -100 m. Use **Physical view / Surface map**, the collapsible **Cylinder tools**, and **Center region**. Both views use the same authority and exact Undo/Redo. The [owner instructions](docs/A7-C-COMPLETION.md) explain real rim joins/cuts, physical visibility protection and supported detail. **Session-only: this preview cannot save, and closing/reloading loses its terrain.** This diagnostic route remains session-only. To create and save cylinders normally, open **http://127.0.0.1:5173/** and choose **New World / Map → Physical capped cylinder**. The normal application now supports all four implemented shapes through shared controls and the mixed library.
