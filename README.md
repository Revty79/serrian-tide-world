# Serrian Tide Atlas

Pass A5: seamless horizontal terrain wrapping, continuous recentering, a map-filling workspace and smoother elevation rendering, alongside bounded maps, Undo/Redo and browser-local saving/reopening.

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
- **Navigate:** wheel toward the pointer; use Zoom In/Out; select Pan or hold Space and drag. Two fingers pan and pinch. Zoom is limited to 100–800% of the chosen view mode. Navigation never changes elevation. Single-touch painting waits for movement or release so a second finger can claim navigation without an accidental initial dab.
- **Fill / Fit:** Fill View is the default. Bounded maps fill the screen by cropping with a uniform scale; pan to the clipped portions. Wrapped maps repeat the same terrain horizontally and pan continuously in either direction. Fit Entire Map resets the view to show a complete period/rectangle; bounded margins and wrapped top/bottom margins are not editable. Fill View resets zoom while retaining the working center where bounds allow.
- **Fullscreen:** the small fullscreen button uses the browser's optional Fullscreen API. Use it again or the browser's exit action to leave. Ordinary windowed Fill already covers the workspace.
- **History:** floating Undo/Redo, Ctrl/⌘ Z, Ctrl/⌘ Shift Z, or Ctrl Y. Confirmed Reset Terrain is undoable. A new numerical edit clears Redo. Text fields retain their native Undo behavior.
- **Preserve work:** name the map, use floating Save or Ctrl/⌘ S, select a saved map and Open Map. Save replaces the local record with the same terrain identity. New Blank Map creates a bounded map; New Wrapped Map creates a separate horizontally connected map with bounded top/bottom. New/Open ask before discarding unsaved changes. Reload/closing uses the browser's standard unsaved-change prompt where supported.

Save explicitly before leaving. Saves belong to the **current browser profile and origin on this device**, are not synchronized to Serrian Tide, and can be removed by clearing browser data. Private browsing and browser eviction policies affect their lifetime. There is no autosave, crash recovery, external import/export, server storage, or separate account system. A browser may not fire an unload event when a mobile app is killed.

## Numerical terrain and integration

New maps have 512 columns × 512 rows in a row-major `Float32Array` (262,144 samples, 1 MiB), initially all −100 m. Sea level defaults to 0 m; water includes equality. Bounded maps retain version 1's independent edge samples and save contract. Wrapped maps use explicit version 2 metadata/records, with unique samples per horizontal period and World/surface/patch identities. No conversion occurs. The provisional extent is a neutral 1 × 1 map-unit rectangle, independent of sample resolution and physical-world scale.

Rendering and the camera only read terrain. A uniform scale preserves actual terrain proportions. Periodic copies share one source cache and one numerical buffer. Rendering interpolates elevation before applying the palette and antialiases shoreline coverage; CSS pixelated scaling is removed. This improves presentation without creating new geographic detail. The authoritative resolution, exact sample readout, brushes, history and save bytes are unchanged by display interpolation. Cache sizes are bounded independently of zoom; mobile uses less display supersampling. See the [A5 report](docs/A5-COMPLETION.md) for alignment, performance and rendering limits.

The numerical engine has no React, DOM, Vite, authentication, network or database dependencies. Client components use scoped CSS and an explicit `'use client'` boundary. The host owns terrain lifetime, history callbacks, storage and permissions. The full-screen shell is replaceable; the future Next.js host will use its own authentication, authoritative access checks, database and World records.

## Source map

| Location | Responsibility |
| --- | --- |
| `src/terrain/` | Numerical model, bounded/periodic sampling, topology binding, modification/reset and four brush tools |
| `src/surfaces/` | Pure World/surface identities, shape/provider/projection contracts, bounded/periodic math, lattice neighbors, tangent transport and explicit legacy binding |
| `src/rendering/` | Colors, interpolated presentation cache, repeated canvas drawing, Fill/Fit and pure camera math |
| `src/interaction/` | Pointer lifecycle, stroke boundaries, navigation/brush arbitration |
| `src/editor/` | Bit-exact bounded history and document saved checkpoints |
| `src/persistence/` | Validated/versioned little-endian save representation and separate IndexedDB adapter |
| `src/components/` | Reusable client canvas, controlled brush inputs and elevation legend |
| `src/App.tsx`, `src/styles.css`, `src/main.tsx` | Temporary full-screen development host |
| `tests/` | Desktop/mobile browser proofs and test-only numerical fixture |
| `docs/evidence/` | Actual screenshots; A0–A4 evidence remains historical |

The A4 surface contracts remain independent of React, Canvas, DOM and browser storage. A5 uses their periodic normalization, metric and lattice for the working wrapped editor. Surface identity, topology, numerical terrain, projection and camera remain separate. Globe rotation, movable spherical projection cuts, local editing views and independent hollow interior/exterior selection are future A6/A7 work. A5 implements no globe or complete cylinder.

See [World/surface architecture and capability matrix](docs/WORLD-SURFACE-ARCHITECTURE.md), [integration architecture](docs/ARCHITECTURE.md), [A5 completion and exact changed files](docs/A5-COMPLETION.md), and the [Phase 1 inventory](docs/PHASE-1-HEIGHTMAP-ROADMAP.md). Historical [A0](docs/A0-COMPLETION.md), [A1](docs/A1-COMPLETION.md), [A2](docs/A2-COMPLETION.md), [A3](docs/A3-COMPLETION.md) and [A4](docs/A4-COMPLETION.md) reports are preserved.

The owner confirmed Ember's A4 source/architecture approval and authorized A5 directly on `main`, including the full-screen and rendering supplements. A5 awaits independent review and owner acceptance. Stop after A5: A6 spherical/polar continuity and A7 hollow/cylindrical/other initial geometries require separate authorization. Complete Azgaar-style tools and external interchange follow those foundations; their former pass numbers are superseded. No main-site integration or deployment is included.
