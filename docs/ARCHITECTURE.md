# Atlas integration architecture — A4

## Destination and ownership

Atlas and the rebuilt Worlds system will replace the existing implementation inside Serrian Tide's Next.js/TypeScript application. Vite is a local development harness. No source, schema, authentication, routing or data in the original website was modified.

| Layer | Owns | Excludes |
| --- | --- | --- |
| `src/terrain` | Versioned numerical model, sampling, mutation/reset, four brushes, deterministic distance-spaced strokes | React, DOM, users, persistence, World records |
| `src/surfaces` | Pure surface identity/catalog, geometry/topology/metric/projection contracts, bounded/periodic examples, lattice neighbors, tangent transport and explicit legacy adapter | React, DOM, Canvas, persistence, working spherical/wrapped editor |
| `src/rendering/camera.ts`, `fit-map.ts` | Pure contain-fit, camera constraints, pointer-anchored zoom, pan | Elevation mutation, resampling, storage |
| Other `src/rendering` files | Elevation colors, RGBA raster and isolated DOM canvas drawing | Editing, authorization, document identity |
| `src/interaction` | Pointer capture, transformed coordinates, cancellation, touch/Space/Pan/wheel arbitration and stroke boundaries | Falloff math, database, React, history representation |
| `src/editor` | Terrain-only bit-exact Undo/Redo and saved document checkpoint/name | DOM, browser storage, authentication, camera |
| `src/persistence/terrain-format.ts` | Versioned validated save codec and checksum | React, IndexedDB, future database client |
| `src/persistence/local-map-store.ts` | Replaceable browser-local IndexedDB adapter | Terrain math, accounts, World foreign keys, server transport |
| `TerrainCanvas` | Client lifecycle, scoped layout, camera, frame scheduling, preview/readout, callback/imperative boundary | World creation, persistence, history policy, permissions |
| `BrushToolbar`, `ElevationLegend` | Controlled brush drafts and palette legend | Terrain lifetime, database, access rules |
| `App.tsx`, `styles.css`, `main.tsx` | Temporary full-screen host, overlay panel, document lifetime, actions, save/open/discard UI | Main-site navigation or integration |

The terrain ID is host supplied. The development host creates UUIDs for new maps; it does not invent a World record or foreign key. Future server integration must bind real World records deliberately, authenticate users, filter reads, authorize writes server-side, validate payloads and handle concurrent saves. Local Save has no such server responsibilities and confers no authority.

A4 separates parent World identity, physical shape, editable surface identity, terrain representation, topology, projection and camera. Its opt-in modules do not alter the current App or v1 terrain/save contracts. See [WORLD-SURFACE-ARCHITECTURE.md](WORLD-SURFACE-ARCHITECTURE.md) for the implemented-versus-planned matrix, proposed cube-sphere/shared-node model, hollow-surface directions, movable seam plan and A5–A7 acceptance checkpoints. A descriptor for a future shape does not make that configuration editable.

## Reusable canvas contract

`TerrainCanvas` is a Next.js-compatible client component with scoped CSS. The host passes validated `terrain`, optional `brush` (omit for read-only), optional `pan`, mutation `revision`, optional `fullscreen`, `onStrokeBegin`, `onStrokeEnd`, and `onZoom`. The React 19 ref exposes `finishInteraction()`, `zoom(factor)` and `fit()`. Finish before external mutations or persistence so partial strokes are included. A changed `revision` also terminates an interaction and queues repainting. Disabling a brush or selecting Pan terminates active sculpting. Terrain replacement resets the camera to Fit.

Stroke callbacks bracket the initial dab and every termination, including partial cancellation/errors. The end callback is captured for the document that began that stroke. Hosts can attach a history implementation without putting it inside the numerical engine. Settings changes during a stroke retain the engine's original settings snapshot. Opening/closing the overlay alone does not terminate a stroke, resize the canvas, replace terrain or reattach its listeners.

The host must still enforce actual access rules; omitting a brush is only a client interaction boundary. Components access browser APIs in effects after mount. The format module is browser-independent and uses standard Web Crypto; IndexedDB opens lazily. No Vite environment APIs enter reusable layers. Integration should consume the engine/components and supply the main host's own document/storage adapter, not embed the development website or its global stylesheet.

Sources use strict erasable TypeScript and explicit `.ts` imports for Node 24's test runner. A consuming Next.js checkout needs compatible React types and `allowImportingTsExtensions` with `noEmit` or an equivalent import convention. That future compatibility step does not authorize edits to the original website now.

## Numerical contract

`Terrain` has immutable version 1 metadata and a mutable row-major `Float32Array`. Metadata declares `id`, `surface: planar`, logical `dimensions` in `map-units`, sample `resolution`, `elevationUnits: meters`, and finite `seaLevel`. New maps are 512², neutral extent 1 × 1, sea level 0 m, every sample −100 m. Samples include both edges, x grows rightward and y downward. Nearest-grid sampling rejects out-of-bounds points. Engine operations preserve identity, metadata and the buffer.

The camera does not change this contract. Future geometries, physical scale, projections, tiling and historical canon remain separate decisions. Palette shading is elevation presentation, with no biome/climate assumptions.

## Full-screen workspace and camera

The host fills its viewport. The left toolbar is a scrollable nonmodal overlay, initially collapsed; the toggle, history/save and navigation controls float above the map. Mobile panel width leaves a reachable right edge. Navigation stacks vertically outside an open panel on narrow screens. Focus enters the panel heading when opened; Escape or the close toggle returns it to the opener if it was inside. Hidden controls leave the tab order. No focus trap prevents reaching the map or actions. Reduced-motion preferences suppress the entrance animation. Keyboard-only terrain drawing remains unimplemented.

Camera state is `{ zoom, centerX, centerY }`: the map coordinate under the center of the stage, normalized by logical extent. Fit is zoom 1 and center (0.5, 0.5); maximum zoom is 8. Start with `fitMap`'s contain rectangle and multiply both dimensions by the same zoom. For each axis, translation is bounded between `min(0, stage − map)` and `max(0, stage − map)`: a smaller map stays wholly visible; a larger map continues covering the stage. Pointer anchors remain fixed except where those edge constraints intervene. The center may lie in a letterbox margin. Fit explicitly recenters; pan keeps zoom unchanged.

The component places a fitted-size viewport with CSS transform-origin (0, 0), uniform scale and camera translation. The backing bitmap remains at fitted CSS size × DPR. Zoom/pan frames only update CSS; edits or fit-size/DPR changes redraw the raster. This avoids zoom-squared backing allocations. At most one animation frame is pending. The retained regression verifies 60 pointer events in one task produce one paint and no React commits. This is scheduling evidence, not a frame-rate guarantee.

Pointer-to-world conversion uses the actual transformed canvas bounds. The preview uses untransformed local sizes and is scaled once by its parent. The surface clips offscreen pixels; contain-fit margins never accept brush dabs. Changes in window size or canvas bounds terminate active strokes before a different coordinate space can be used. Both mouse/pen and native touch share the same numerical brush engine.

Space + drag and explicit Pan claim the pointer before sculpting. A first touch defers its dab until movement of 3 CSS pixels or release; a second finger can claim pinch/pan without painting. When a second finger follows an already deliberate stroke, that partial stroke finishes as one history operation. Navigation stays latched until all fingers lift, so the remaining finger cannot start a stray stroke. Cancellation, blur, pagehide, resize and visibility changes end interactions. Wheel zoom is scoped to the actual canvas.

## History and saved checkpoints

History stores exact 32-bit elevation words, including signed zero. Each complete/partially cancelled stroke and confirmed Reset contributes at most one entry; no-op operations add none and leave Redo intact. A new real edit clears Redo. Undo/Redo write into the existing buffer without replacing metadata or identity.

Each entry chooses the smaller of changed indices + before/after words (12 bytes per changed sample) or one contiguous span + before/after words (8 bytes per covered sample), plus a 64-byte accounting allowance. Retained Undo + Redo is limited to **16 MiB and 100 entries**; oldest Undo entries are evicted first. Undoing/redoing moves an entry between stacks without duplicating it. One transient before-stroke Uint32 snapshot is used to construct the delta: 1 MiB for the default grid, at most 4 MiB for the accepted save limit. Commit clears it. The constructor requires a budget large enough for a full-grid operation. Managed-object overhead is approximate; the stated budget accounts typed-array payloads and an entry allowance, not total browser process memory.

Unique state IDs track the saved checkpoint even if history entries are evicted. Returning to a saved state via Undo/Redo clears the numerical dirty flag. Name changes also mark the document dirty. Camera, toolbar visibility, control settings and navigation do not. A new untouched blank map is “Not saved yet” and does not need a discard prompt; edits or a changed name do. Loaded maps start a fresh history; history/camera are session state and are not persisted.

## Version 1 local representation

`serrian-tide-heightmap`, format version `1`, has these fields:

| Field | Representation |
| --- | --- |
| `format`, `formatVersion` | Fixed identifier and explicit integer version |
| `id`, `name`, `savedAt` | Same terrain identity; trimmed nonempty name up to 120 characters; UTC ISO timestamp |
| `metadata` | Validated v1 numerical metadata, including grid, extent, units and sea level |
| `elevationEncoding` | `float32-le-row-major` |
| `elevations` | ArrayBuffer, exactly `columns × rows × 4` bytes, explicit little-endian Float32 words |
| `checksum` | SHA-256 hex over canonical validated header JSON bytes followed by elevation bytes |

Validation rejects unsupported versions/units/surface, missing or inconsistent identity, blank/oversized names, invalid dimensions/date, wrong payload length, checksum mismatch and nonfinite elevations. Identity is bounded to 128 characters. Each axis is 2–4096 integer samples, total at most **1,048,576** (4 MiB of elevations). Header dimensions are positive finite numbers and sea level finite. Validate resource bounds before payload hashing/allocation. Decode returns a new terrain only after successful validation; existing work is never its mutation target. The checksum detects accidental corruption, including finite-to-finite sample changes; it is not an authorization/signature mechanism.

IndexedDB database `serrian-tide-atlas`, schema version 1, contains `heightmaps` (keyPath `id`, full records) and `catalog` (keyPath `id`, small `{id,name,savedAt}` summaries). Save validates before starting one atomic readwrite transaction across both stores, then reports success only after `transaction.oncomplete`. Listing reads summaries without loading full maps. Open loads the record and validates it before any discard prompt or document replacement. Blocked/open/quota/transaction failures surface in the UI; they never falsely mark work saved. Connections close after operations and on version changes.

The development host locks editing/name/document actions during async storage operations and finalizes an active stroke before encoding. Successful saves establish the checkpoint and update selection. New Map uses a fresh ID and never overwrites another map. Open/New explicitly guard unsaved work; corrupt Open keeps the map, name, history and camera intact. Browser departure uses the standard `beforeunload` warning where supported. Mobile process termination can bypass it, so explicit Save remains necessary. Browser-local data is profile/origin/device specific, can be cleared/evicted and is not synchronized. No autosave, session crash recovery, external file interchange, cloud adapter or invented accounts were added. Interchange remains a subsequent pass under the owner's revised roadmap; A7 now concerns additional geometries.

The adapter follows the browser's [IndexedDB transaction lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB). Gesture arbitration uses [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures). Checksums use [Web Crypto digest](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest); departure warnings have the documented [beforeunload limitations](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event).

## Review and scope

A0–A3 completion reports/screenshots are historical and unchanged. The owner supplied Ember's A3 source/visual approval and authorized A4 directly on main. A4 adds only the pure surface architecture/examples and compatibility verification, with no runtime editor or save-schema changes. It does not authorize A5, original-site integration, server/Production writes or deployment. See [A4 completion](A4-COMPLETION.md) for evidence and review limitations.
