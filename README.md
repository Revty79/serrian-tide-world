# Serrian Tide Atlas

Pass A6-C: numerical spherical Smooth and explicit-target Flatten join Raise/Lower on one continuous cube-sphere authority, with geodesic footprints, connected distance-aware neighborhoods and exact history. The A5.2 focused wrapped editor remains unchanged; spherical views require A6-D authorization.

This repository is a standalone **development workspace**. Atlas and the rebuilt Worlds system will ultimately replace the current Worlds/Atlas implementation inside the existing Serrian Tide Next.js/TypeScript website. The original website remains untouched.

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
- **Preserve work:** name the map, use floating Save or Ctrl/⌘ S, select a saved map and Open Map. Save replaces the local record with the same terrain identity. New Blank Map creates a bounded map; New Wrapped Map creates a separate horizontally connected map with bounded top/bottom. New/Open ask before discarding unsaved changes. Reload/closing uses the browser's standard unsaved-change prompt where supported.

Save explicitly before leaving. Saves belong to the **current browser profile and origin on this device**, are not synchronized to Serrian Tide, and can be removed by clearing browser data. Private browsing and browser eviction policies affect their lifetime. There is no autosave, crash recovery, external import/export, server storage, or separate account system. A browser may not fire an unload event when a mobile app is killed.

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
| `src/persistence/` | Validated/versioned little-endian save representation and separate IndexedDB adapter |
| `src/components/` | Reusable client canvas, controlled brush inputs and elevation legend |
| `src/App.tsx`, `src/styles.css`, `src/main.tsx` | Temporary full-screen development host |
| `tests/` | Desktop/mobile browser proofs and test-only numerical fixture |
| `scripts/measure-spherical.mjs` | Reproducible numerical allocation, connectivity and seam-write receipt |
| `scripts/measure-spherical-brush.mjs` | Preserved A6-B Raise/Lower benchmark and signed-zero receipt |
| `scripts/measure-spherical-tools.mjs` | A6-C N=128/256 Smooth/Flatten performance, bounded payloads and exact history |
| `docs/evidence/` | Actual screenshots/numerical receipts; prior-pass evidence remains historical |

The A4 surface contracts remain independent of React, Canvas, DOM and browser storage. A5 uses their periodic math. A6-A adds `createSphericalTerrain` in `src/terrain/spherical.ts` and reference geometry in `src/surfaces/cube-sphere.ts`, without importing them into App or changing v1/v2 storage. A radius in meters is required; default resolution is 128 cells per face edge, with 98,306 unique samples (393,224 elevation bytes). Face charts are a numerical representation of a **round** world, not a physical cube. A6-C adds distance-weighted connected Smooth and datum-relative Flatten. Globe rotation, projection/local editing views, spherical persistence and independent hollow surfaces remain future work.

Reproduce the numerical memory/topology receipt with `node --expose-gc scripts/measure-spherical.mjs`. An optional final argument writes its JSON output to an explicit path.

The spherical API is `startSphericalBrushStroke(terrain, physicalPoint, settings, history?)`. Settings share physical `radiusMeters`; Raise/Lower use positive `strengthMeters`, Smooth uses blend `intensity` (0…1), and Flatten uses `intensity` plus positive/negative/zero `targetElevation` meters relative to the defined sea-level datum. Physical points carry World/surface identity and either a direction or a validated face address. Movement follows shortest great-circle segments with radius/4 meter spacing; near-antipodes require explicit intermediates. `SphericalHistory` retains at most 16 MiB/100 entries by default and never receives the authority buffer. See the [sculpting API and limits](docs/SPHERICAL-SCULPTING.md). Run `node scripts/measure-spherical-brush.mjs` for the preserved A6-B reference and `node scripts/measure-spherical-tools.mjs` for A6-C performance/history evidence.

See [World/surface architecture](docs/WORLD-SURFACE-ARCHITECTURE.md), [integration architecture](docs/ARCHITECTURE.md), [A6-C completion and exact files](docs/A6-C-COMPLETION.md), and the [complete master roadmap](docs/PHASE-1-HEIGHTMAP-ROADMAP.md). All prior completion reports remain historical receipts.

The owner supplied Ember's A5.2 source, test and visual-evidence approval at `7033fe5f5013db9bac6d74792db2a642182006e2` and authorized A6-C directly on `main`. Owner hands-on focused-layout acceptance remains separate and outstanding. See [A5.2 layout and screenshots](docs/A5-2-COMPLETION.md) and [A6-C numerical completion](docs/A6-C-COMPLETION.md). Stop after A6-C for review; A6-D and later checkpoints need separate authorization. Future view providers must choose connected layouts appropriate to their geometry; rectangular side previews are specific to the current periodic plane. The master roadmap explicitly records [Issue #1](https://github.com/Revty79/serrian-tide-world/issues/1) for terrain measurement, prominence, slope, 3D consistency and Worlds linkage. Atlas first joins separately rebuilt Worlds (step 9); that combined system then joins Serrian Tide (step 10), before the reusable historical/modern Earth foundation (step 11). No integration or deployment occurs in this pass.
