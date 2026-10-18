# Spherical viewing and projection foundation — A6-D1

Current hosting (A6-F1): the shared Atlas workspace owns one active planar/wrapped/spherical document, common creation, name, Save/Open, library, history, status and fullscreen. See [Unified workspace](UNIFIED-WORKSPACE.md). The separate launch/Return to map statements below describe historical checkpoints and retained test hosts. Numerical algorithms and v1/v2/v3 contracts are unchanged. Stop after F1 for review; globe-limb held-stroke navigation and N=256 mobile editing hardening remain outstanding.


This retains D1's mathematical/read-only foundation. D2 adds editing, revision patches, previews/history and gesture arbitration ([editing](SPHERICAL-EDITING.md)); E adds exact local preservation ([v3 specification](SPHERICAL-PERSISTENCE.md)). Statements below about D1's fixed fixture/no sculpting describe its separate historical mode. The D1/E hosting statements below are historical.

The numerical terrain remains the A6-A/B/C provider. `spherical-view.ts` supplies pure physical/view conversion; `spherical-raster.ts` derives display-only images. Neither imports React, DOM, persistence or database code. `SphericalViewport` owns browser presentation/input; `SphericalPreview` is the replaceable development host that creates an explicitly sized session-only fixture. A future Next.js host can supply a real authorized provider instead of this fixture without adopting the development shell or inventing World records.

## Authority and development lifetime

The preview requires a positive explicit radius in meters, with finite πR, and offers N=128 or N=256. There is no Earth-scale default. Its World/surface/terrain IDs are ephemeral UUIDs required by the provider contract, not actual database World identities or canonical geographic claims. Sea level remains zero meters relative to the reference sphere. The four named synthetic fixture features are mathematical spherical caps at fixed directions; they test continuity across edges/corners and are not a procedural geography generator.

The host initializes each canonical sample once in batches of 4,096, yielding an animation frame between batches, then builds one face texture per frame. Cancellation abandons the session. The underlying planar/wrapped document, canvas/camera, history and storage remain mounted in an inert subtree. The preview overlays them, including inside the existing fullscreen root; it never replaces the document. Returning restores keyboard access/focus. Preview data is neither encoded nor passed to IndexedDB. The GUI has no spherical brush/history/save controls. Ctrl/⌘ S in the ready preview explains that it is session-only.

## View contracts and camera frame

`SphericalView` contains `mode`, a right-handed orthonormal `{right,up,forward}` frame, a 1…4 display zoom and bounded net pan. The initial frame looks along +X with +Z up; these are representation axes, not an Earth pole, geographic prime meridian or world rotation. Pure functions return new view objects and never write terrain. `recenterSphere` targets any physical direction, preserves the prior up reference where possible and chooses a deterministic fallback when looking along that up axis. Drag rotations compose camera-space yaw/pitch and re-orthonormalize; there is no latitude clamp or polar navigation singularity. `projectSphere` returns zero or more visible occurrences with chart IDs. `unprojectSphere` returns one unit physical direction or null. `inspectSphere` separately resolves the canonical chart/sample and reads its actual Float32 height.

View validation rejects nonfinite/invalid viewport dimensions, zoom, pan and camera frames. World/surface identity and position validation remain the numerical provider's responsibility. The viewport's future host must supply the matching terrain/display cache and invalidate it on numerical revision; D1 holds the fixture fixed after initialization. Projection interfaces use physical directions, while existing face-address APIs remain available to tools. The input layer does not substitute net pixels or angular face distances for geodesic distances.

## Orthographic globe

For unit geographic direction d, camera axes r/u/f, CSS center c and radius ρ:

```text
z = dot(d,f); hidden when z < 0 (roundoff tolerance 1e−14)
x = cx + ρ dot(d,r)
y = cy − ρ dot(d,u)
ρ = .42 × min(viewportWidth,viewportHeight) × zoom
```

For an in-disk screen point, put `a=(x−cx)/ρ`, `b=(cy−y)/ρ` and `z=sqrt(1−a²−b²)`. The inverse is `normalize(a r+b u+z f)`. Points outside the viewport/disk return null; a 1e−14 squared-radius tolerance handles roundoff on the limb. Only the front hemisphere is sampled/rendered. A zoomed globe can crop into the screen; rotating brings any desired location to its center. It is a uniform reference sphere with view lighting, not a terrain-extrusion mesh. Elevation affects color and readout, not silhouette or occlusion.

Forward/inverse comparisons use direction-vector error below 2e−12 for the face/edge/corner/recenter fixtures and below 1e−10 for 500 seeded ordinary round trips. Orthographic inversion is ill-conditioned at the limb: floating-point radial error is square-root amplified. Tests accept 1e−7 direction error at rotated exact limbs. Recenter before precise future editing near a silhouette. Native pointer coordinates also have CSS-pixel quantization; on a small net a numerical sample may occupy less than a screen pixel. Readouts always resolve the actual input position; zoom in to distinguish nearby samples. Display interpolation creates no new geographic detail.

## Oriented six-face spherical net

This is a cutout of the six **spherical charts**, arranged like an unfolded cube. It is not a physical cube and is not an isometric paper development of a sphere. Each equiangular gnomonic square necessarily distorts spherical lengths/areas. The actual metric, radius, directions and shared vertex ownership remain spherical.

```text
         pz
    ny   px   py   nx
         nz
```

The tile positions are `(ny:0,1), (px:1,1), (py:2,1), (nx:3,1), (pz:1,0), (nz:1,2)`. Let Q=π/4 and chart angles u/v span [−Q,Q]. Local screen coordinates s/t increase right/down:

| Charts | s | t |
| --- | --- | --- |
| px, nx, py, ny | (u/Q+1)/2 | (1−v/Q)/2 |
| pz | (v/Q+1)/2 | (u/Q+1)/2 |
| nz | (1−v/Q)/2 | (1−u/Q)/2 |

The cap rotations/reflections above are essential. All twelve physical edge pairs and eight corners are verified through the A6-A geometry, including reversed seam parameters. Exactly **five** edge pairs coincide as joined folds; **seven** are paired visual cuts. Solid guides mark joins, dashed amber guides mark cuts, and the controls explain the distinction. Cut occurrences are multiple views of the same physical sample, never separate terrain. Forward mapping returns every incident visible chart occurrence. At a coincident join/corner, inverse hit testing uses stable `CUBE_FACES` order; canonical physical sample resolution removes address ambiguity. Empty tiles and out-of-screen positions return null, not invented geography. Fold classification uses net geometry before viewport clipping, so pan/zoom cannot turn a join into a cut.

At reset, tile side is `min(viewportWidth/4.4,viewportHeight/3.6)`, with uniform display zoom. Net pan is stored in tile units and clamped to ±3 horizontally/±2 vertically, enough to center every face; gaps remain invalid. The camera frame is retained when switching to the net. Net selection plus **Center selection** switches to the globe and looks at the same physical location. Reset keeps the chosen projection, resets zoom/pan/orientation and leaves terrain unchanged.

## Display caches, scheduling and memory

Texture construction takes one temporary Float32 source snapshot, resolves one face's canonical index lattice at a time, interpolates scalar elevation on that face, then applies the existing palette at the real sea-level datum. Derived RGBA texture resolution is `min(2N,512)+1` vertices per side. All edges/corners refer to the same source samples. The renderer interpolates this display texture, without inventing higher-resolution authority or changing save bytes. The initial host does not update terrain after building these caches; no numerical reconstruction occurs during navigation.

Six RGBA payloads total 1,585,176 bytes at N=128 and 6,316,056 at N=256. They are copied into six Canvas2D texture surfaces once. The temporary snapshot is 393,224 / 1,572,872 bytes respectively; one face index lattice is at most 66,564 / 264,196 bytes at these resolutions. These temporary values are derived/private copies, not writable face authorities. JavaScript/GC and browser graphics overhead are additional.

Orthographic rendering ray-casts a bounded image through the cached textures; the far side never enters the raster. Desktop navigation uses at most 180,000 pixels, settled display 420,000; coarse-pointer/mobile uses 70,000 / 220,000. Actual row/column products round down. Navigation schedules a settled redraw after 180 ms without further updates. The globe result buffer is reused for equal dimensions, and the scratch canvas is reused. The full visible canvas is capped at DPR 1.5 and 3,000,000 backing pixels. Net views reuse Canvas2D texture images. No GPU server, paid service, WebGL requirement or network rendering is involved.

Pointer events update view state and request one animation frame; repeated events coalesce. Hover inspection uses the same frame scheduler without repainting terrain. A 100-event test burst produces at most two paints. A refinement timer may add a later settled paint. Texture caches are retained across rotation, zoom and projection switching, and numerical provider reads are limited to inspection, not raster reconstruction. Browser receipts report CPU render function cost and counted payloads; they do not claim total process RSS or hardware-independent frame rate.

## Controls and next checkpoint

- Mouse/pen drag or one touch rotates the globe and pans the net; two touches combine midpoint navigation and pinch zoom. Wheel changes zoom. Tap/click inspects/selects a location.
- Focus the canvas for arrows (navigation), +/− (zoom), Home (reset), Enter (inspect the exact center). Visible buttons supply projection switching, zoom, reset, centering a selected point, six reference directions, return and optional fullscreen.
- Escape, blur, pointer cancellation/lost capture, visibility and resize end navigation gestures. Controls overlay the full viewport. The original editor is inert while the preview is active. The View controls panel supports keyboard focus, Escape/close and return to its toggle.

**A6-D2 obligations, not implementation:** explicitly arbitrate rotate/pan versus paint; project actual geodesic brush caps across cuts/limbs; feed physical directions into the existing great-circle engine; preserve single-operation exact history and chart-independent readouts; support centerable poles/transitions and appropriate edge-assisted navigation without periodic repetition. Respect view changes/cancellation during active strokes. Maintain revision-aware incremental display invalidation instead of rebuilding all six textures per pointer event/dab. Measure numerical dabs, dirty-cache updates, render and input latency together at N=128/256 on desktop and weaker devices; A6-C's 272-dab Smooth cost cannot be hidden by a fast view. Investigate bounded neighbor/geometry caches and scheduling only with independent numerical equivalence checks. Future rendering interpolation, higher-resolution/tiled authority, GPU acceleration and persistence each need separately scoped design/validation.

The D1 obligations above are addressed by [D2 editing](SPHERICAL-EDITING.md), with automatic held-stroke globe limb rotation still isolated as D2-R. [E preservation](SPHERICAL-PERSISTENCE.md) is now implemented. **STOP after A6-E.** Weaker-device N=256 editing hardening, other shapes, extrusion, generation, living history and Worlds integration remain future. The master roadmap, Issue #1 and steps 9 → 10 → 11 remain intact.
