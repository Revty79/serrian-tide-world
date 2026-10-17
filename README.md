# Serrian Tide Atlas

Pass A0: a blank ocean generated from a real numerical heightmap.

This repository is a standalone **development workspace**, not a permanent separate website. The finished Atlas and rebuilt Worlds system will be integrated into the existing Serrian Tide Next.js application, replacing its current Worlds/Atlas implementation. A0 does not modify or integrate with that application.

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
    *.test.ts                  Data, sampling, and modification verification
  rendering/
    elevation-colors.ts        Elevation-to-color mapping
    elevation-raster.ts        Browser-independent RGBA raster generation
    canvas-renderer.ts         Canvas display and device-pixel scaling
    elevation-raster.test.ts   Numerical rendering verification
  components/
    TerrainCanvas.tsx          Embeddable Next.js-compatible client component
    TerrainCanvas.module.css   Component-scoped canvas styling
  App.tsx                      Temporary development interface
  main.tsx                     Vite-only browser entry point
  styles.css                   Development-shell styling only
tests/atlas.spec.ts             Desktop and mobile browser verification
docs/ARCHITECTURE.md            Integration boundaries and terrain contract
docs/A0-COMPLETION.md           Acceptance evidence and complete file inventory
docs/evidence/                 Actual desktop and mobile screenshots
```

## Numerical terrain

The initial terrain contains 512 columns × 512 rows, stored row-major in a `Float32Array`: 262,144 samples occupying 1 MiB. Every sample starts at −100 meters. Sea level is 0 meters; elevations at or below sea level render as water, and values above sea level render as land.

Metadata declares contract version 1, terrain ID, planar surface, map dimensions, grid resolution, elevation units, and sea level. The provisional editing extent is a neutral 1 × 1 map-unit rectangle, not a planet or a physical-world scale. The grid includes its edges, with row zero at the top. Sampling uses the nearest sample and rejects out-of-bounds points.

Rendering reads the numbers to generate one RGBA pixel per sample, then scales that raster to the canvas backing bitmap. CSS size and device pixel ratio never resize or rewrite the heightmap. The provisional palette varies with depth and positive height; it makes no biome or climate assumptions.

## Integration requirement

The terrain engine has no React, DOM, Vite, authentication, network, or database dependencies. The renderer's browser access is isolated. `TerrainCanvas` has a Next.js `'use client'` boundary, scoped CSS, and an explicit `terrain` prop; it does not create its own World or fetch data. `App.tsx` owns the temporary in-memory example.

The future main-application host will own authentication, server-side permissions, World-record identity, and database persistence. Those connections remain unimplemented in A0. See [the architecture notes](docs/ARCHITECTURE.md) for the exact boundaries and migration considerations.

There are no brushes, save/load interfaces, procedural generation, Worlds integration, backend services, or deployment configuration. Reloading resets the development example. A0 ends here, pending Ember's independent review.

The existing Git remote is retained, but the npm package is private and no publication, push, deployment, or next pass is authorized by A0.
