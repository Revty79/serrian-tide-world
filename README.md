# Serrian Tide Atlas

Pass A2: Raise, Lower, Smooth, and Flatten on a real numerical heightmap, starting from a blank ocean.

This repository is a standalone **development workspace**, not a permanent separate website. The finished Atlas and rebuilt Worlds system will be integrated into the existing Serrian Tide Next.js application, replacing its current Worlds/Atlas implementation. Neither A0 nor A1 modifies or integrates with that application.

## Run locally

Use Node.js 24.x and npm. In PowerShell:

```powershell
cd D:\serrian-tide-world
npm.cmd ci
npm.cmd run dev
```

Open <http://127.0.0.1:5173/>. On other shells, `npm` works in place of `npm.cmd`. The server binds to loopback only. Stop it with Ctrl+C.

## Check the project

```powershell
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:browser
npm.cmd run build
```

`npm.cmd run check` runs all three checks after Chromium is installed. Browser tests start the development server if one is not already running. `npm.cmd run preview` serves an existing build locally; it does not deploy anything.

## Structure and technologies

React 19.3, TypeScript 7.0, Vite 8.3, the browser's Canvas 2D API, Node's built-in numerical test runner, and Playwright for browser verification. Only React and React DOM are runtime dependencies.

```text
src/
  terrain/
    model.ts                   Versioned numerical data and blank terrain factory
    sampling.ts                Grid, planar, and viewport coordinate conversion
    modifications.ts           Single-sample numerical mutation primitive
    brush.ts                   Four numerical brushes and distance-based strokes
    *.test.ts                  Data, sampling, modification, and brush verification
  interaction/
    canvas-sculpting.ts         Browser pointer lifecycle, capture, and cancellation
  rendering/
    elevation-colors.ts        Elevation-to-color mapping
    elevation-raster.ts        Browser-independent RGBA raster generation
    canvas-renderer.ts         Canvas display and device-pixel scaling
    fit-map.ts                 Aspect-preserving map fitting
    elevation-raster.test.ts   Numerical rendering verification
  components/
    TerrainCanvas.tsx          Embeddable Next.js-compatible client component
    TerrainCanvas.module.css   Component-scoped canvas styling
    BrushToolbar.tsx           Four tools, radius, strength/intensity, target, reset
    BrushToolbar.module.css    Component-scoped toolbar styling
    ElevationLegend.tsx        Color bands derived from the terrain palette
    ElevationLegend.module.css Component-scoped legend styling
  App.tsx                      Temporary development interface
  main.tsx                     Vite-only browser entry point
  styles.css                   Development-shell styling only
tests/atlas.spec.ts             Desktop and mobile browser verification
tests/sculpting.spec.ts         Actual sculpting and pointer lifecycle verification
tests/refinement.spec.ts        Smooth/Flatten, readout, reset, aspect, and evidence
tests/fixtures/                 Test-only component host and numerical inspection
docs/ARCHITECTURE.md            Integration boundaries and terrain contract
docs/A0-COMPLETION.md           Historical A0 completion record
docs/A1-COMPLETION.md           A1 mathematics, acceptance evidence, and changed files
docs/A2-COMPLETION.md           A2 behavior, verification, limitations, and changed files
docs/PHASE-1-HEIGHTMAP-ROADMAP.md Implemented versus planned Phase 1 inventory
docs/evidence/                 Actual desktop and mobile screenshots
```

## Numerical terrain

The initial terrain contains 512 columns × 512 rows, stored row-major in a `Float32Array`: 262,144 samples occupying 1 MiB. Every sample starts at −100 meters. Sea level is 0 meters; elevations at or below sea level render as water, and values above sea level render as land.

Metadata declares contract version 1, terrain ID, planar surface, map dimensions, grid resolution, elevation units, and sea level. The provisional editing extent is a neutral 1 × 1 map-unit rectangle, not a planet or a physical-world scale. The grid includes its edges, with row zero at the top. Sampling uses the nearest sample and rejects out-of-bounds points.

Rendering reads the numbers to generate one RGBA pixel per sample, then scales that raster to the canvas backing bitmap. CSS size and device pixel ratio never resize or rewrite the heightmap. The provisional palette varies with depth and positive height; it makes no biome or climate assumptions.

## Sculpt terrain

Select **Raise**, **Lower**, **Smooth**, or **Flatten**, adjust the controls, then click or drag across the map. A single click applies one dab. Hovering or holding still adds no elevation. Start another stroke to build up an island into higher terrain, lower it back underwater, or refine its shape.

- **Radius:** 0.5–20% of the map's shorter logical side, default 6%. The engine receives a radius in map units, not pixels. On the initial unit-square map the default is `0.06` map units.
- **Strength:** 10–1,000 meters per dab at its center, default 200. Influence fades smoothly to zero at the radius. The default brings the center of one dab above the initial −100-meter ocean floor.
- **Intensity:** Smooth and Flatten use 1–100% per dab, default 50%. Smooth blends toward the local 3 × 3 sample average; Flatten blends toward the entered target elevation in meters. Smooth reads a fixed pre-dab source snapshot, eliminating directional scan bias. Repeated passes progressively refine the terrain.
- **Target:** Flatten accepts positive, zero, or negative finite meter values. An empty or out-of-range target disables Flatten until corrected. Tool switches retain the stored controls and do not reset terrain.
- **Strokes:** one initial dab, then another every quarter-radius of distance traveled. Duplicate events and stationary time add nothing. Settings are fixed at the start of each stroke; the next stroke uses any updated controls.
- **Edges and interruption:** footprints clip at the map edge. A stroke ends on exiting the map, releasing, cancelling, losing capture/focus, resizing the viewport, or disabling editing. Re-entering the canvas requires a new press. Cancellation keeps edits already applied.

Brush dimensions and strength are independent of browser size and device pixel ratio. A2 fits the logical map rectangle inside the available display area while preserving aspect ratio. The initial square map and round brushes stay square and round on wide or tall screens. Fitted margins are outside the canvas and never accept terrain edits. Mouse, pen, and one-finger touch use the same brush math; pressure is not used.

Hover over the map for approximate planar X/Y position and numerical elevation, with an above/at/below sea-level indication. The legend's depth and height bands use the same color function as the canvas. **Reset Terrain** asks for explicit confirmation and restores every sample to −100 m while keeping terrain identity, metadata, and the existing buffer.

Numerical changes update the same `Float32Array`. Rendering is queued once per animation frame, and pointer movement does not rerender the application. No Undo/Redo, Save/Load, Zoom/Pan, generation, or simulations are implemented. Reloading still resets the development example.

## Integration requirement

The terrain/brush engine has no React, DOM, Vite, authentication, network, or database dependencies. Browser pointer handling and rendering are isolated. `TerrainCanvas` has a Next.js `'use client'` boundary, scoped CSS, and explicit `terrain`, optional `brush`, and optional mutation `revision` props; it does not create its own World or fetch data. Omitting `brush` makes it read-only. `App.tsx` owns the temporary in-memory example, confirmation, reset, and control state.

The future main-application host will own authentication, server-side permissions, World-record identity, and database persistence. Those connections remain unimplemented. See [the architecture notes](docs/ARCHITECTURE.md) for the exact boundaries and migration considerations.

A0/A1 passed Ember's source review, per the owner. A2 is ready for Ember's independent review. The owner's later instruction directs delivery to this repository's `main`, with no additional A2 branch and no deployment. Owner hands-on testing is deferred until Ember approves A2 technical readiness. See the [Phase 1 roadmap](docs/PHASE-1-HEIGHTMAP-ROADMAP.md) for planned capabilities; it does not authorize A3 or later work.
