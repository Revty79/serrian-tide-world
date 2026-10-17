# Serrian Tide Atlas

Pass A1: Raise and Lower sculpting on a real numerical heightmap, starting from a blank ocean.

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
    brush.ts                   Reusable smooth dabs and distance-based strokes
    *.test.ts                  Data, sampling, modification, and brush verification
  interaction/
    canvas-sculpting.ts         Browser pointer lifecycle, capture, and cancellation
  rendering/
    elevation-colors.ts        Elevation-to-color mapping
    elevation-raster.ts        Browser-independent RGBA raster generation
    canvas-renderer.ts         Canvas display and device-pixel scaling
    elevation-raster.test.ts   Numerical rendering verification
  components/
    TerrainCanvas.tsx          Embeddable Next.js-compatible client component
    TerrainCanvas.module.css   Component-scoped canvas styling
    BrushToolbar.tsx           Raise/Lower, radius, and strength controls
    BrushToolbar.module.css    Component-scoped toolbar styling
  App.tsx                      Temporary development interface
  main.tsx                     Vite-only browser entry point
  styles.css                   Development-shell styling only
tests/atlas.spec.ts             Desktop and mobile browser verification
tests/sculpting.spec.ts         Actual sculpting and pointer lifecycle verification
tests/fixtures/                 Test-only component host and numerical inspection
docs/ARCHITECTURE.md            Integration boundaries and terrain contract
docs/A0-COMPLETION.md           Historical A0 completion record
docs/A1-COMPLETION.md           A1 mathematics, acceptance evidence, and changed files
docs/evidence/                 Actual desktop and mobile screenshots
```

## Numerical terrain

The initial terrain contains 512 columns × 512 rows, stored row-major in a `Float32Array`: 262,144 samples occupying 1 MiB. Every sample starts at −100 meters. Sea level is 0 meters; elevations at or below sea level render as water, and values above sea level render as land.

Metadata declares contract version 1, terrain ID, planar surface, map dimensions, grid resolution, elevation units, and sea level. The provisional editing extent is a neutral 1 × 1 map-unit rectangle, not a planet or a physical-world scale. The grid includes its edges, with row zero at the top. Sampling uses the nearest sample and rejects out-of-bounds points.

Rendering reads the numbers to generate one RGBA pixel per sample, then scales that raster to the canvas backing bitmap. CSS size and device pixel ratio never resize or rewrite the heightmap. The provisional palette varies with depth and positive height; it makes no biome or climate assumptions.

## Sculpt terrain

Select **Raise** or **Lower**, adjust the sliders, then click or drag across the map. A single click applies one dab. Hovering or holding still adds no elevation. Start another stroke to build up an island into higher terrain, or lower it back underwater.

- **Radius:** 0.5–20% of the map's shorter logical side, default 6%. The engine receives a radius in map units, not pixels. On the initial unit-square map the default is `0.06` map units.
- **Strength:** 10–1,000 meters per dab at its center, default 200. Influence fades smoothly to zero at the radius. The default brings the center of one dab above the initial −100-meter ocean floor.
- **Strokes:** one initial dab, then another every quarter-radius of distance traveled. Duplicate events and stationary time add nothing. Settings are fixed at the start of each stroke; the next stroke uses any updated controls.
- **Edges and interruption:** footprints clip at the map edge. A stroke ends on exiting the map, releasing, cancelling, losing capture/focus, resizing the viewport, or disabling editing. Re-entering the canvas requires a new press. Cancellation keeps edits already applied.

Brush dimensions and strength are independent of browser size and device pixel ratio. The A0 display maps the logical rectangle to the canvas, so a round map-space footprint can appear elliptical on a rectangular screen. Mouse, pen, and one-finger touch use the same brush math; pressure is not used. The canvas handles touch gestures locally while sculpting.

Numerical changes update the same `Float32Array`. Rendering is queued once per animation frame, and pointer movement does not rerender the application. No Smooth/Flatten, Undo/Redo, Save/Load, Zoom/Pan, or additional systems are implemented. Reloading still resets the development example.

## Integration requirement

The terrain/brush engine has no React, DOM, Vite, authentication, network, or database dependencies. Browser pointer handling and rendering are isolated. `TerrainCanvas` has a Next.js `'use client'` boundary, scoped CSS, and explicit `terrain` and optional `brush` props; it does not create its own World or fetch data. Omitting `brush` makes it read-only. `App.tsx` owns the temporary in-memory example and control state.

The future main-application host will own authentication, server-side permissions, World-record identity, and database persistence. Those connections remain unimplemented. See [the architecture notes](docs/ARCHITECTURE.md) for the exact boundaries and migration considerations.

A0 passed Ember's initial source-code review. A1 is prepared on a dedicated branch for the explicitly authorized GitHub push and Ember review, with no merge or deployment. Owner hands-on testing is deferred until A2 has been completed and reviewed. A2 requires separate authorization.
