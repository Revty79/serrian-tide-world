# Serrian Tide Atlas

Pass A5.1: navigation and screen-edge sculpting stabilization on the approved A6-B baseline. The bounded/periodic editor now supports controlled scrolling during a single stroke. A6-B's numerical spherical Raise/Lower and exact history remain intact; spherical views follow in later checkpoints.

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
- **Fill / Fit:** Fill View is the default. Bounded maps fill the screen by cropping with a uniform scale; pan to the clipped portions. Wrapped maps repeat the same terrain horizontally and pan continuously in either direction. Fit Entire Map resets the view to show a complete period/rectangle; bounded margins and wrapped top/bottom margins are not editable. Fill View resets zoom while retaining the working center where bounds allow.
- **Repeated geography:** faint vertical guides mark wrapped period boundaries. The same island can be visible more than once, with the same orientation and elevation authority. Editing any copy updates every view. Fit Entire Map centers one complete period between guides; repetition remains visible outside it.
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
| `src/terrain/` | Bounded/periodic brushes; spherical provider, bounded cap search and physical Raise/Lower strokes; shared numerical falloff/saturation |
| `src/surfaces/` | Pure contracts, bounded/periodic math, real cube-sphere geometry/seams/tangent conversion and legacy binding |
| `src/rendering/` | Colors, interpolated presentation cache, repeated canvas drawing, Fill/Fit and pure camera math |
| `src/interaction/` | Pointer lifecycle, stroke boundaries, navigation/brush arbitration |
| `src/editor/` | Existing planar history/document checkpoints; separate spherical history through canonical writes and private snapshots |
| `src/persistence/` | Validated/versioned little-endian save representation and separate IndexedDB adapter |
| `src/components/` | Reusable client canvas, controlled brush inputs and elevation legend |
| `src/App.tsx`, `src/styles.css`, `src/main.tsx` | Temporary full-screen development host |
| `tests/` | Desktop/mobile browser proofs and test-only numerical fixture |
| `scripts/measure-spherical.mjs` | Reproducible numerical allocation, connectivity and seam-write receipt |
| `scripts/measure-spherical-brush.mjs` | N=128/256 sculpting/history benchmark and deterministic signed-zero receipt |
| `docs/evidence/` | Actual screenshots/numerical receipts; prior-pass evidence remains historical |

The A4 surface contracts remain independent of React, Canvas, DOM and browser storage. A5 uses their periodic math. A6-A adds `createSphericalTerrain` in `src/terrain/spherical.ts` and reference geometry in `src/surfaces/cube-sphere.ts`, without importing them into App or changing v1/v2 storage. A radius in meters is required; default resolution is 128 cells per face edge, with 98,306 unique samples (393,224 elevation bytes). Face charts are a numerical representation of a **round** world, not a physical cube. Globe rotation, projection/local editing views, spherical Smooth/Flatten and persistence, and independent hollow surfaces remain future work.

Reproduce the numerical memory/topology receipt with `node --expose-gc scripts/measure-spherical.mjs`. An optional final argument writes its JSON output to an explicit path.

The spherical API is `startSphericalBrushStroke(terrain, physicalPoint, {tool, radiusMeters, strengthMeters}, history?)`. Physical points carry World/surface identity and either a direction or a validated face address. Movement follows shortest great-circle segments with radius/4 meter spacing; near-antipodes require explicit intermediates. `SphericalHistory` retains at most 16 MiB/100 entries by default and never receives the authority buffer. See the [sculpting API and limits](docs/SPHERICAL-SCULPTING.md). Run `node scripts/measure-spherical-brush.mjs` to reproduce its numerical/performance receipt.

See [World/surface architecture](docs/WORLD-SURFACE-ARCHITECTURE.md), [integration architecture](docs/ARCHITECTURE.md), [A6-B completion and exact files](docs/A6-B-COMPLETION.md), and the [complete master roadmap](docs/PHASE-1-HEIGHTMAP-ROADMAP.md). All prior completion reports remain historical receipts.

The owner supplied Ember's A6-B source/numerical approval and authorized this focused A5.1 stabilization directly on `main`. See [A5.1 findings, fixes and browser evidence](docs/A5-1-COMPLETION.md). Stop after A5.1; A6-C and later checkpoints need separate authorization. Spherical Smooth/Flatten, UI/rotation and Save/Open remain later work. Atlas first joins separately rebuilt Worlds (roadmap step 9); that combined system then joins the existing site (step 10), before the final reusable Earth content milestone (step 11). No integration or deployment occurs in this pass.
