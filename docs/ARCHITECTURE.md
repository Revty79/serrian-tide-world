# Atlas integration architecture — A5

## Destination and ownership

Atlas and the rebuilt Worlds system will replace the existing implementation inside Serrian Tide's Next.js/TypeScript application. Vite is a local development harness. No source, schema, authentication, routing or data in the original website was modified.

| Layer | Owns | Excludes |
| --- | --- | --- |
| `src/terrain` | Versioned numerical model, sampling, mutation/reset, four brushes, deterministic distance-spaced strokes | React, DOM, users, persistence, World records |
| `src/surfaces` | Pure surface identity/catalog, geometry/topology/metric/projection contracts, bounded/periodic mathematics, lattice neighbors, tangent transport and explicit legacy adapter | React, DOM, Canvas, persistence, spherical editor |
| `src/rendering/camera.ts`, `fit-map.ts` | Pure Fill/Fit, bounded constraints, periodic phase, pointer-anchored zoom, pan | Elevation mutation, resampling, storage |
| Other `src/rendering` files | Elevation colors, interpolated presentation cache, shoreline coverage and isolated bounded/repeated canvas drawing | Editing, authorization, document identity |
| `src/interaction` | Pointer capture, transformed coordinates, cancellation, touch/Space/Pan/wheel arbitration and stroke boundaries | Falloff math, database, React, history representation |
| `src/editor` | Terrain-only bit-exact Undo/Redo and saved document checkpoint/name | DOM, browser storage, authentication, camera |
| `src/persistence/*format.ts`, `heightmap-payload.ts` | Validated v1/v2 codecs, dispatch, exact elevation payload and checksum | React, IndexedDB, future database client |
| `src/persistence/local-map-store.ts` | Replaceable browser-local IndexedDB adapter | Terrain math, accounts, World foreign keys, server transport |
| `TerrainCanvas` | Client lifecycle, scoped layout, camera, frame scheduling, preview/readout, callback/imperative boundary | World creation, persistence, history policy, permissions |
| `BrushToolbar`, `ElevationLegend` | Controlled brush drafts and palette legend | Terrain lifetime, database, access rules |
| `App.tsx`, `styles.css`, `main.tsx` | Temporary full-screen host, overlay panel, document lifetime, actions, save/open/discard UI | Main-site navigation or integration |

The terrain ID is host supplied. The development host creates UUIDs for new maps; it does not invent a World record or foreign key. Future server integration must bind real World records deliberately, authenticate users, filter reads, authorize writes server-side, validate payloads and handle concurrent saves. Local Save has no such server responsibilities and confers no authority.

A4 separates parent World identity, physical shape, editable surface identity, terrain representation, topology, projection and camera. A5 binds its periodic rectangular topology, lattice and metric to a new explicit v2 terrain type. The v1 interpretation and canonical save encoding are preserved. See [WORLD-SURFACE-ARCHITECTURE.md](WORLD-SURFACE-ARCHITECTURE.md) for the capability matrix and future geometry strategy, and [A5 completion](A5-COMPLETION.md) for implemented math and evidence. A descriptor for a future shape does not make that configuration editable.

## Reusable canvas contract

`TerrainCanvas` is a Next.js-compatible client component with scoped CSS. The host passes validated `terrain`, optional `brush` (omit for read-only), optional `pan`, mutation `revision`, optional `fullscreen` layout, optional `initialView: 'fit' | 'fill'`, stroke callbacks and `onZoom`. The React 19 ref exposes `finishInteraction()`, `zoom(factor)`, `fit()` and `fill()`. Finish before external mutations or persistence so partial strokes are included. A changed `revision` terminates an interaction and queues repainting. Disabling a brush, switching tools or selecting Pan terminates active sculpting. Terrain replacement resets the camera using `initialView` (Fit by default for embedding; the development App explicitly selects Fill).

Stroke callbacks bracket the initial dab and every termination, including partial cancellation/errors. The end callback is captured for the document that began that stroke. Hosts can attach a history implementation without putting it inside the numerical engine. Settings changes during a stroke retain the engine's original settings snapshot. Opening/closing the overlay alone does not terminate a stroke, resize the canvas, replace terrain or reattach its listeners.

The host must still enforce actual access rules; omitting a brush is only a client interaction boundary. Components access browser APIs in effects after mount. The format module is browser-independent and uses standard Web Crypto; IndexedDB opens lazily. No Vite environment APIs enter reusable layers. Integration should consume the engine/components and supply the main host's own document/storage adapter, not embed the development website or its global stylesheet.

Sources use strict erasable TypeScript and explicit `.ts` imports for Node 24's test runner. A consuming Next.js checkout needs compatible React types and `allowImportingTsExtensions` with `noEmit` or an equivalent import convention. That future compatibility step does not authorize edits to the original website now.

## Numerical contract

`Terrain` has immutable discriminated metadata and a mutable row-major `Float32Array`. Both versions declare `id`, `surface: planar`, logical dimensions in `map-units`, resolution, elevations in meters and finite sea level. New maps are 512², neutral extent 1 × 1, sea level 0 m, every sample −100 m. x grows rightward and y downward. Engine operations preserve identity, metadata and the buffer.

Version 1 remains bounded with independent endpoint-inclusive samples: `x = column/(columns−1) × width`. Version 2 declares `topology: horizontal-periodic`, `sampleOwnership: unique-u-inclusive-v` and explicit `{worldId,surfaceId,patchId}`. Its x sample positions are `column/columns × width`; x=width is equivalent to x=0, not another sample. Both retain `y = row/(rows−1) × height` with actual top/bottom boundaries. Wrapped sampling canonicalizes x through A4 topology; distance uses its intrinsic shortest-wrap metric. A stroke retains unwrapped path coordinates so event spacing and winding survive the cut. Smooth snapshots actual connected neighbors before each dab. Existing tool arithmetic is shared.

The camera does not change this contract. Future geometries, physical scale, projections, tiling and historical canon remain separate decisions. Palette shading is elevation presentation, with no biome/climate assumptions.

## Full-screen workspace and camera

The host fills its viewport. The left toolbar is a scrollable nonmodal overlay, initially collapsed; the toggle, history/save and navigation controls float above the map. Mobile panel width leaves a reachable right edge. Navigation stacks vertically outside an open panel on narrow screens. Focus enters the panel heading when opened; Escape or the close toggle returns it to the opener if it was inside. Hidden controls leave the tab order. No focus trap prevents reaching the map or actions. Reduced-motion preferences suppress the entrance animation. Keyboard-only terrain drawing remains unimplemented.

Camera state is `{ zoom, centerX, centerY }`: normalized surface coordinates at the stage center. Zoom is 1–8 relative to a separate view mode. Fit uses contain scale and center (0.5, 0.5). Bounded Fill uses `max(stageWidth/worldWidth, stageHeight/worldHeight)` and permits panning to cropped portions. Periodic Fill uses stage height to scale one full vertical extent, then repeats horizontally across the entire stage. Both axes always use one geographic scale. Fit can leave real non-map margins; it remains a separate action. Fill resets zoom to 1 and preserves the working center where bounds allow.

Bounded translation keeps a smaller map wholly visible and a larger map covering the stage. Wrapped centerX is reduced modulo one period after every pan; large displacement is reduced before adding it. This avoids an indefinitely growing offset and changes neither geography nor the equivalent rendered position. Vertical constraints remain bounded. Pointer zoom preserves its physical anchor modulo a period unless bounded-edge constraints intervene.

The bounded view keeps a contain-sized backing bitmap and applies a uniform CSS transform; Fill and zoom do not allocate a zoom-squared raster. The periodic view uses one cached source plus a stage-sized DPR canvas and a transformed `repeat-x` CanvasPattern. Panning/zooming redraws that pattern without rebuilding the height field. All visible copies reference the same cache/authority. At most one animation frame is pending. The retained regression verifies 60 pointer events in one task produce one paint and no React commits; this is scheduling evidence, not a frame-rate guarantee.

The periodic renderer publishes its applied map rectangle, and pointer conversion, previews and readouts use that same painted transform. An internal canonical seam is not a stroke boundary; leaving the visible stage or a real top/bottom edge is. Repeated previews show the same footprint in all visible copies. Bounded previews use the uniformly transformed parent. Non-map margins never accept dabs. Changed view bounds terminate active sculpting before applying another transform. Mouse, pen and native touch use the same brush engine.

The optional native fullscreen action belongs to App. It requests fullscreen on its workspace only from a user click, observes `fullscreenchange`, catches request/exit failure and leaves terrain/history untouched. Unsupported browsers omit the button. Browser fullscreen is independent of Fill and is not required to remove sidebars.

### Presentation interpolation and later resolution

The editor interpolates the authoritative four neighboring heights bilinearly into a bounded display cache, then classifies/colorizes against sea level. Horizontal interpolation wraps for v2 and clamps for v1. Only cells crossing sea level receive a local-gradient shoreline coverage estimate; there is no whole-image blur. Canvas smoothing and CSS `image-rendering: auto` replace nearest-neighbor magnification. Exact hover values still come from the nearest authoritative Float32 sample, not the interpolated color.

For the default grid the desktop cache is approximately 1024² and the coarse-pointer cache approximately 768². Supersampling is capped at 4× per axis and falls toward 1× as source resolution increases; it never drops authoritative source samples to meet the coarse-pointer budget. The existing accepted maximum grid is 1,048,576 samples. Zoom never increases the cache. See A5's measured cache/CPU evidence and limits. These are display pixels, not additional terrain detail. Genuine higher-resolution/tiled terrain needs a new approved numerical, ownership, editing, history, memory and persistence design.

### Repositioning every future geometry

The surface provider and `MapProjection<ViewState>` contracts remain independent of this flat camera. A6 must introduce orientation/projection-cut/local-view state without rotating, reordering or resampling the fixed spherical authority. A7 must select an interior/exterior surface identity independently of its view and preserve each buffer/history. Replace the view adapter and projected footprint/hit-test implementation for those shapes; do not interpret periodic centerX as a globe rotation. The host will supply real World associations, active-surface policy and storage. No future geometry is exposed by A5.

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

### Version 2 and unchanged IndexedDB schema

Wrapped records use the same identifier with `formatVersion: 2`, explicit v2 metadata and the same exact little-endian Float32 payload. The checksum includes the canonical topology, ownership and World/surface/patch identity. The v1 reader/writer remain available; a frozen A3 fixture proves identical metadata, checksum and payload on re-encoding. Common payload helpers do not change that contract. Version dispatch rejects unknown formats and malformed records before document replacement.

IndexedDB database `serrian-tide-atlas`, schema version **1**, still contains `heightmaps` (keyPath `id`, full records) and `catalog` (keyPath `id`, small `{id,name,savedAt}` summaries). No schema upgrade, record conversion or migration is performed. Save validates before starting one atomic readwrite transaction across both stores; inside it, an existing ID cannot be replaced with a different format or v2 surface identity. Success is reported only after `transaction.oncomplete`. Listing reads summaries without loading full maps. Open loads and validates before any discard prompt or document replacement. Blocked/open/quota/transaction failures surface in the UI; they never falsely mark work saved. Connections close after operations and on version changes.

Rolling back to A4 leaves all v1 records usable. A4 cannot open v2 records and rejects their unsupported version; it must not convert them. A5 never overwrites a v1 record with a wrapped representation, so no old bounded authority needs reconstruction. Browser-local saves still require explicit Save and can be evicted; the absence of migration is not a backup or crash-recovery system.

The development host locks editing/name/document actions during async storage operations and finalizes an active stroke before encoding. Successful saves establish the checkpoint and update selection. New Map uses a fresh ID and never overwrites another map. Open/New explicitly guard unsaved work; corrupt Open keeps the map, name, history and camera intact. Browser departure uses the standard `beforeunload` warning where supported. Mobile process termination can bypass it, so explicit Save remains necessary. Browser-local data is profile/origin/device specific, can be cleared/evicted and is not synchronized. No autosave, session crash recovery, external file interchange, cloud adapter or invented accounts were added. Interchange remains a subsequent pass under the owner's revised roadmap; A7 now concerns additional geometries.

The adapter follows the browser's [IndexedDB transaction lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB). Gesture arbitration uses [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures). Checksums use [Web Crypto digest](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest); departure warnings have the documented [beforeunload limitations](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event).

## Review and scope

A0–A4 completion reports/screenshots remain historical and unchanged. The owner supplied Ember's A4 source/architecture approval and authorized A5 directly on main, including Fill/fullscreen and rendering supplements. A5's technical verification is recorded in [A5 completion](A5-COMPLETION.md); independent review and owner acceptance remain pending. Stop after A5. A6/A7, original-site integration, server/Production writes and deployment require separate authorization.
