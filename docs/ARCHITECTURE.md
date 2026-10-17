# Atlas integration architecture — A1

## Destination

Atlas and the rebuilt Worlds system will become part of the existing Serrian Tide Next.js/TypeScript website and replace its current Worlds/Atlas implementation. Vite is a development harness for this separate checkout. It is not the intended production host or a second long-term website.

No source, schema, authentication, authorization, routing, or data in the existing Serrian Tide application was changed during A0 or A1. No old Atlas implementation was copied.

## Existing boundaries

| Layer | Owns | Does not own |
| --- | --- | --- |
| `src/terrain` | Numerical terrain contract, planar sampling, coordinate conversion, single-sample mutation, brush falloff and distance-based strokes | React, DOM, canvas sizing, users, access rules, database records |
| `src/interaction/canvas-sculpting.ts` | DOM pointer capture, coordinates, boundary intersection, cancellation | Numerical falloff, React, World records, persistence |
| `src/rendering/elevation-colors.ts` and `elevation-raster.ts` | Numerical elevation colors and RGBA pixels | Browser APIs, React, persistence |
| `src/rendering/canvas-renderer.ts` | DOM canvas drawing and output bitmap size | Mutation of terrain, UI state, authorization |
| `src/components/TerrainCanvas.tsx` | Client lifecycle, frame scheduling, sculpting attachment, responsive painting, errors | World creation, authentication, data loading, saving, permission decisions |
| `src/components/BrushToolbar.tsx` | Controlled brush inputs and their current values | Terrain mutation, rendering, host authorization |
| `src/App.tsx`, `main.tsx`, `styles.css`, `index.html` | Temporary local development shell and sample-terrain lifetime | Future main-site navigation, shared headers, production bootstrap |

The renderer is only invoked from an effect-scheduled animation frame, after a canvas exists. The reusable components declare `'use client'`; they do not read `window` or create terrain during a server render. Their CSS Modules have no global body, canvas, or navigation selectors. Numerical brushes and rendering can also be invoked directly without React.

## Version 1 terrain contract

`Terrain` consists of immutable metadata and a mutable `Float32Array` elevation buffer. It is an in-memory contract, not a completed save-file or database format.

| Field | A0 value / meaning |
| --- | --- |
| `metadata.dataVersion` | `1`; identifies the numerical contract |
| `metadata.id` | Host-supplied terrain identifier; the development example uses `atlas-a0-blank-ocean` |
| `metadata.surface` | `planar`; no spherical assumptions |
| `metadata.dimensions` | Width `1`, height `1`, units `map-units`; independent logical editing extent |
| `metadata.resolution` | `512` columns × `512` rows; independent of display pixels |
| `metadata.elevationUnits` | `meters` |
| `metadata.seaLevel` | `0`; water includes equality |
| `elevations` | Row-major `Float32Array`, initially all `-100`; index = `row * columns + column` |

The terrain ID is not an invented World foreign key. A future host adapter must establish the relationship to the actual World records after reviewing their schema. A stored representation must explicitly define its encoding, version handling, dimensions, and validation; a typed array must not be silently treated as an already-defined JSON save format.

Grid samples include the edges of the logical rectangle. Coordinates begin at the top-left, with x increasing rightward and y downward. `viewportToWorld` accepts CSS-pixel positions relative to the canvas; `worldToGrid` rounds to the nearest sample. Coordinates outside the rectangle fail rather than wrapping.

## Future host responsibilities — design constraints, not implemented features

1. The existing Next.js route and server layer must authenticate the user and enforce the application's actual World visibility and editing permissions before returning terrain or accepting changes. Canvas visibility is not an authorization mechanism.
2. The main application's server/data layer must own database access, World-to-terrain association, storage encoding, validation, and authorized persistence. Database clients and credentials must never enter the terrain engine or client renderer.
3. A client host must construct or obtain validated in-memory terrain and pass it into `TerrainCanvas`. It must deliberately choose a server-to-client data representation when persistence is implemented; A0 does not establish that transport.
4. The host must own terrain lifetime and repainting after external numerical modifications. `TerrainCanvas` now queues a repaint after its own brush changes, on initial display, a changed terrain prop, and resize. `setElevation` remains a low-level mutation without notifications; an outside caller must explicitly repaint or pass a changed terrain object. There is no observable store or autosave. Direct use of `startBrushStroke` and `renderTerrain` is supported without React.
5. The host supplies an optional `brush` prop to enable local sculpting. Omitting it is read-only and disabling it stops an active stroke. This is a UI boundary, not server authorization. The host must still enforce real permissions and validate any future persisted changes.
6. Integration must use the existing application's React/Next.js dependencies, routes, headers, navigation, and permission infrastructure. The Vite entry point and global development-shell stylesheet are not integration assets. Nothing should embed the entire separate development site into the main website.

These are ownership boundaries only. A0/A1 introduce no placeholder auth service, database adapter, World schema, API route, or speculative permission model.

## TypeScript and rendering considerations

The reusable engine is ordinary strict TypeScript with erasable syntax. Explicit `.ts` imports permit the Node 24 test runner to execute it directly; a future Next.js checkout consuming these sources needs TypeScript's `allowImportingTsExtensions` with `noEmit`, or its own equivalent import convention. That compatibility step belongs to the authorized integration pass, not a main-site change now.

The renderer repaints the full 512 × 512 raster and scales it to fill the rectangular canvas using nearest-neighbor display sampling. A1 queues at most one outstanding animation frame, irrespective of pointer-event count. A browser test verifies 60 events in one task produce one repaint and no React commits. No worker, caching layer, GPU, or new runtime dependency was added. This is functional frame-scheduling evidence, not a cross-device performance benchmark.

The logical extent is mapped to the displayed rectangle; physical map scale, aspect policies, projections, tiling, and other world geometries remain undecided. Map-space brushes are round and their displayed preview follows that projection; they can appear elliptical on a non-square canvas. No terrain samples are resampled on viewport changes. Resizing or moving the editing surface ends an active stroke before it can paint using a changed coordinate mapping.

The canvas is now described as an elevation map containing water and land, with the selected tool and pointer instructions. It no longer claims to remain a blank ocean after editing. Keyboard-operable toolbar controls are provided; keyboard-only terrain drawing is not implemented in A1.

The test-only host under `tests/fixtures` exposes numerical snapshots, React commit counts, and repaint counts for browser tests. It is not imported by the application entry point or included in its production build.

Brush mathematics and lifecycle details are recorded in [A1-COMPLETION.md](A1-COMPLETION.md). Pointer support follows the browser's [Pointer Events API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), with optional [coalesced event samples](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents) and repaint scheduling through [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).

## Review boundary

Historical A0 verification is preserved unchanged in [A0-COMPLETION.md](A0-COMPLETION.md), alongside its original screenshots. The owner confirmed Ember's initial A0 source-code review and authorized A1, including a dedicated-branch push for review. A1 review remains pending. Owner hands-on testing is deferred until A2 is completed and reviewed. This document does not authorize A2, integration, merge, deployment, or changes to the original application.
