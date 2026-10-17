# Atlas integration architecture — A2

## Destination

Atlas and the rebuilt Worlds system will become part of the existing Serrian Tide Next.js/TypeScript website and replace its current Worlds/Atlas implementation. Vite is a development harness for this separate checkout. It is not the intended production host or a second long-term website.

No source, schema, authentication, authorization, routing, or data in the existing Serrian Tide application was changed during A0, A1, or A2. No old Atlas implementation was copied.

## Existing boundaries

| Layer | Owns | Does not own |
| --- | --- | --- |
| `src/terrain` | Numerical contract, sampling/readout, mutation/reset primitives, four brushes, source snapshots, distance-based strokes | React, DOM, canvas sizing, users, access rules, database records |
| `src/interaction/canvas-sculpting.ts` | DOM pointer capture, coordinates, boundary intersection, cancellation | Numerical falloff, React, World records, persistence |
| `src/rendering/elevation-colors.ts` and `elevation-raster.ts` | Numerical elevation colors and RGBA pixels | Browser APIs, React, persistence |
| `src/rendering/canvas-renderer.ts` | DOM canvas drawing and output bitmap size | Mutation of terrain, UI state, authorization |
| `src/rendering/fit-map.ts` | Pure aspect-preserving fit of a logical map into an available viewport | Resampling, terrain mutation, DOM |
| `src/components/TerrainCanvas.tsx` | Client lifecycle, frame scheduling, sculpting attachment, responsive painting, errors | World creation, authentication, data loading, saving, permission decisions |
| `src/components/BrushToolbar.tsx` | Controlled inputs, tool-specific units, target draft validation, reset intent | Terrain mutation, rendering, host authorization |
| `src/components/ElevationLegend.tsx` | Display legend derived from the numerical color palette | Terrain mutation, biome or climate assumptions |
| `src/App.tsx`, `main.tsx`, `styles.css`, `index.html` | Temporary local development shell and sample-terrain lifetime | Future main-site navigation, shared headers, production bootstrap |

The renderer is only invoked from a layout-effect-scheduled animation frame, after a canvas exists. The reusable interactive components declare `'use client'`; they do not read `window` or create terrain during a server render. Their CSS Modules have no global body, canvas, or navigation selectors. Numerical brushes, fitting, sampling, reset, and rendering can also be used directly without React.

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
4. The host owns terrain lifetime and explicit external mutations. `TerrainCanvas` queues repainting after its own brushes, on initial display, a changed terrain prop, a changed `revision` prop, and resize. After `setElevation` or `resetTerrainToOcean`, a React host can increment `revision` while retaining the existing terrain object and buffer. This also cancels an active stroke. There is no observable store or autosave. Direct use of the engine and renderer remains supported without React.
5. The host supplies an optional `brush` prop to enable local sculpting. Omitting it is read-only and disabling it stops an active stroke. This is a UI boundary, not server authorization. The host must still enforce real permissions and validate any future persisted changes.
6. Integration must use the existing application's React/Next.js dependencies, routes, headers, navigation, and permission infrastructure. The Vite entry point and global development-shell stylesheet are not integration assets. Nothing should embed the entire separate development site into the main website.

These are ownership boundaries only. A0/A1/A2 introduce no placeholder auth service, database adapter, World schema, API route, or speculative permission model.

## TypeScript and rendering considerations

The reusable engine is ordinary strict TypeScript with erasable syntax. Explicit `.ts` imports permit the Node 24 test runner to execute it directly; a future Next.js checkout consuming these sources needs TypeScript's `allowImportingTsExtensions` with `noEmit`, or its own equivalent import convention. That compatibility step belongs to the authorized integration pass, not a main-site change now.

The renderer repaints the full 512 × 512 raster using nearest-neighbor display sampling. Its low-level API receives the already-selected map rectangle. The component uses `fitMap` to select that rectangle from logical dimensions, then positions an actual fitted canvas inside a larger display area. One uniform scale factor is used for both axes. The initial 1 × 1 map therefore stays square; a future non-square map retains its own logical aspect ratio, regardless of its sample-grid resolution.

Fitted margins are DOM space outside the actual editing canvas and have no painting listeners. The preview shares the fitted canvas's coordinate origin and map-unit scale. Pointer conversion uses that canvas's actual CSS bounds, independent of device pixel ratio. Resizing changes only layout and the display bitmap. Both window-size and canvas-bound changes terminate a stroke, including the interval before resize callbacks or a scheduled fit frame arrive.

Frame scheduling retains at most one outstanding animation frame. The retained browser test verifies 60 events in one task produce one repaint and no React commits. Cursor elevation output updates through DOM refs, without a React application render per pointer event. No worker, GPU, or new runtime dependency was added; this is functional scheduling evidence rather than a universal frame-rate benchmark.

Physical scale, projections, tiling, and other world geometries remain undecided. A2's contain-fit policy changes presentation only, not version 1 terrain geometry, sample count, or elevation values.

The canvas is described as an elevation map containing water and land, with the selected tool and pointer instructions. Its readout shows approximate planar position, nearest-sample elevation, and the actual above/at/below sea-level relationship. The legend uses the same color function as the raster. Keyboard-operable toolbar controls are provided; keyboard-only terrain drawing remains unimplemented.

The test-only host under `tests/fixtures` exposes numerical snapshots, React commit counts, and repaint counts for browser tests. It is not imported by the application entry point or included in its production build.

Historical Raise/Lower mathematics are recorded in [A1-COMPLETION.md](A1-COMPLETION.md); Smooth/Flatten, reset, and fitting are recorded in [A2-COMPLETION.md](A2-COMPLETION.md). Pointer support follows the browser's [Pointer Events API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), with optional [coalesced event samples](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents) and repaint scheduling through [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).

## Review boundary

Historical A0/A1 completion reports and screenshots are preserved unchanged. The owner confirmed Ember's A1 source review and authorized A2, then explicitly changed Git delivery to this repository's `main` to avoid more development branches. Local main was fast-forwarded to the approved A1 commit before A2 work. A2 technical review remains pending, and owner testing awaits Ember's approval. The [Phase 1 roadmap](PHASE-1-HEIGHTMAP-ROADMAP.md) records future scope without implementing or authorizing it. No A3, main-site integration, deployment, or original-application changes are authorized by this pass.
