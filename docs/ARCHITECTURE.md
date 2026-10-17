# Atlas integration architecture — A0

## Destination

Atlas and the rebuilt Worlds system will become part of the existing Serrian Tide Next.js/TypeScript website and replace its current Worlds/Atlas implementation. Vite is a development harness for this separate checkout. It is not the intended production host or a second long-term website.

No source, schema, authentication, authorization, routing, or data in the existing Serrian Tide application was changed during A0. No old Atlas implementation was copied.

## Existing boundaries

| Layer | Owns | Does not own |
| --- | --- | --- |
| `src/terrain` | Numerical terrain contract, planar sampling, coordinate conversion, single-sample mutation | React, DOM, canvas sizing, users, access rules, database records |
| `src/rendering/elevation-colors.ts` and `elevation-raster.ts` | Numerical elevation colors and RGBA pixels | Browser APIs, React, persistence |
| `src/rendering/canvas-renderer.ts` | DOM canvas drawing and output bitmap size | Mutation of terrain, UI state, authorization |
| `src/components/TerrainCanvas.tsx` | Client lifecycle, responsive painting, display errors | World creation, authentication, data loading, saving, permission decisions |
| `src/App.tsx`, `main.tsx`, `styles.css`, `index.html` | Temporary local development shell and sample-terrain lifetime | Future main-site navigation, shared headers, production bootstrap |

The renderer is only invoked inside a React effect, after a canvas exists. The component declares `'use client'`; it does not read `window` or create terrain during a server render. Its CSS Module has no global body, canvas, or navigation selectors. Rendering can also be invoked directly without React.

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
4. The host must own terrain lifetime and repainting after numerical modifications. `setElevation` is a low-level in-place mutation, not a brush, observable store, or autosave operation. `renderTerrain` can repaint the same data immediately. The React host will need an explicit update trigger when editing is added; A0 only repaints on initial display, a changed terrain prop, and resize.
5. Integration must use the existing application's React/Next.js dependencies, routes, headers, navigation, and permission infrastructure. The Vite entry point and global development-shell stylesheet are not integration assets. Nothing should embed the entire separate development site into the main website.

These are ownership boundaries only. A0 introduces no placeholder auth service, database adapter, World schema, API route, or speculative permission model.

## TypeScript and rendering considerations

The reusable engine is ordinary strict TypeScript with erasable syntax. Explicit `.ts` imports permit the Node 24 test runner to execute it directly; a future Next.js checkout consuming these sources needs TypeScript's `allowImportingTsExtensions` with `noEmit`, or its own equivalent import convention. That compatibility step belongs to the authorized integration pass, not a main-site change now.

The initial renderer repaints the full 512 × 512 raster and scales it to fill the rectangular canvas using nearest-neighbor display sampling. The logical extent is mapped to the displayed rectangle; physical map scale, aspect policies, projections, tiling, GPU rendering, and other world geometries remain undecided. No terrain samples are resampled on viewport changes. Repaint performance should be measured when interactive sculpting is introduced, before adding caching or workers.

The current component's accessible map description describes A0's blank ocean. A future editing pass must update that description when the visible terrain can change.

## Review boundary

Technical A0 verification is recorded in [A0-COMPLETION.md](A0-COMPLETION.md). Ember's independent review and owner acceptance remain pending. This document does not authorize A1, integration, a GitHub push, deployment, or changes to the original application.
