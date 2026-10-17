# Serrian Tide Atlas

Pass A3: a full-screen numerical heightmap workspace with four brushes, navigation, Undo/Redo, and browser-local saving/reopening.

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

The map stage occupies the browser viewport. **Atlas / Open tools** reveals a scrollable left panel that overlays the map. It never shrinks or stretches the map. Escape closes the panel and returns focus to its toggle when focus was inside. The panel is nonmodal; Tab can reach the floating actions and canvas. Reduced-motion preferences suppress the slide animation.

- **Raise / Lower:** add or subtract 10–1,000 meters per dab at the center, default 200.
- **Smooth:** blend toward a local 3 × 3 pre-dab neighborhood average.
- **Flatten:** blend toward an explicit positive, zero or negative target in meters. Invalid targets disable this brush until corrected.
- **Radius:** 0.5–20% of the map's shorter logical side, default 6%.
- **Intensity:** Smooth/Flatten blend 1–100% per dab, default 50%.
- **Strokes:** click for one dab or drag with mouse, pen or one finger. Dabs are spaced by a quarter radius; duplicate events and stationary time add nothing. Settings apply to the next stroke. Cancellation retains the completed portion as one undoable operation.
- **Navigate:** wheel toward the pointer; use Zoom In/Out or Fit Map; select Pan or hold Space and drag. Two fingers pan and pinch. Zoom is limited to 100–800%. Navigation never changes elevation. Single-touch painting waits for movement or release so a second finger can claim navigation without an accidental initial dab.
- **History:** floating Undo/Redo, Ctrl/⌘ Z, Ctrl/⌘ Shift Z, or Ctrl Y. Confirmed Reset Terrain is undoable. A new numerical edit clears Redo. Text fields retain their native Undo behavior.
- **Preserve work:** name the map, use floating Save or Ctrl/⌘ S, select a saved map and Open Map. Save replaces the local record with the same terrain identity; New Blank Map creates a new identity and history. New/Open ask before discarding unsaved changes. Reload/closing uses the browser's standard unsaved-change prompt where supported.

Save explicitly before leaving. Saves belong to the **current browser profile and origin on this device**, are not synchronized to Serrian Tide, and can be removed by clearing browser data. Private browsing and browser eviction policies affect their lifetime. There is no autosave, crash recovery, external import/export, server storage, or separate account system in A3. A browser may not fire an unload event when a mobile app is killed.

## Numerical terrain and integration

New maps have 512 columns × 512 rows in a row-major `Float32Array` (262,144 samples, 1 MiB), initially all −100 m. Sea level defaults to 0 m; water includes equality. Version 1 metadata declares identity, planar dimensions, grid resolution, units and sea level. The provisional extent is a neutral 1 × 1 map-unit rectangle, independent of sample resolution and physical-world scale.

Rendering and the camera only read terrain. One aspect-preserving scale applies to both axes; a square map stays square and a non-square map keeps its declared proportions. Fit can leave letterboxing. Camera zoom magnifies the fitted bitmap without allocating a zoom-squared raster. Pointer sampling and previews use the transformed canvas bounds, independently of device pixel ratio. The numerical elevation readout and color legend share the actual sea level and palette.

The numerical engine has no React, DOM, Vite, authentication, network or database dependencies. Client components use scoped CSS and an explicit `'use client'` boundary. The host owns terrain lifetime, history callbacks, storage and permissions. The full-screen shell is replaceable; the future Next.js host will use its own authentication, authoritative access checks, database and World records.

## Source map

| Location | Responsibility |
| --- | --- |
| `src/terrain/` | Numerical model, sampling, modification/reset, four brush tools and interpolation |
| `src/rendering/` | Colors, raster, canvas renderer, contain-fit and pure camera math |
| `src/interaction/` | Pointer lifecycle, stroke boundaries, navigation/brush arbitration |
| `src/editor/` | Bit-exact bounded history and document saved checkpoints |
| `src/persistence/` | Validated/versioned little-endian save representation and separate IndexedDB adapter |
| `src/components/` | Reusable client canvas, controlled brush inputs and elevation legend |
| `src/App.tsx`, `src/styles.css`, `src/main.tsx` | Temporary full-screen development host |
| `tests/` | Desktop/mobile browser proofs and test-only numerical fixture |
| `docs/evidence/` | Actual screenshots; A0–A2 evidence remains historical |

See [architecture](docs/ARCHITECTURE.md), [A3 completion and exact changed files](docs/A3-COMPLETION.md), and the [Phase 1 inventory](docs/PHASE-1-HEIGHTMAP-ROADMAP.md). Historical [A0](docs/A0-COMPLETION.md), [A1](docs/A1-COMPLETION.md) and [A2](docs/A2-COMPLETION.md) reports are preserved.

The owner confirmed Ember's approval of A2 and authorized A3 directly on `main`, including the full-screen overlay interface clarification. A3 awaits independent review and owner acceptance. Stop after A3; no A4, main-site integration or deployment is included.
