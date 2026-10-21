# Atlas surface presentation

The cylinder and sphere implement this standard independently. Display fields,
textures and images are disposable views of the active canonical Float32 terrain.
They never become new elevation authority, saved geography or history entries.

## Reconstruction and appearance

Reconstruct numerical elevation before classifying land, sea or terrain color.
Coastline coverage follows the reconstructed zero crossing. Additional coverage
rays resolve pixel footprints; they must not move sea level, blur terrain palette
colors together or add noise. Interpolation makes a display smoother without
creating geographical detail. Higher-resolution or tiled terrain needs a later
numerical/storage design and separate authorization.

Elevation Colors is the unshaded editing view. Optional Shaded Relief derives
from physical height change per surface distance and uses 5x display exaggeration.
Relief does not displace the reference surface, change measured elevations or
invent mountain heights. Palette and sea level are common; inverse projection,
reconstruction stencils, tangent gradients and visibility belong to each provider.

For a sphere, six equiangular cube charts share one numerical sample array.
`spherical-elevation.ts` publishes native-resolution elevation/world-tangent
gradient fields. Canonical aliases receive identical field words. Chart Jacobians
convert finite height differences to physical spherical slopes; alias estimates
are averaged deterministically. Bilinear reconstruction is continuous at every
edge/corner and introduces no elevation overshoot. Its derivative need not be
continuous; shared interpolated tangent gradients keep relief continuous. Poles
have no longitude singularity. These are charts of a round sphere, not cube faces
with separate physical ownership. Extreme display slopes are bounded; authority
retains all valid finite Float32 values.

## GPU and bounded fallback

`surface-renderer.ts` supplies the common renderer contract and capped backing
dimensions. Sphere presentation raycasts the analytic reference globe or the
oriented connected net. Cylinder presentation uses its own reference mesh and
coordinate system. Neither path implements 3D elevation displacement.

Retain GPU resources across camera changes. Upload derived fields by completed
source revision; upload sparse dirty rectangles when the preceding epoch matches,
and rebuild from the latest coherent field after missed epochs or context recovery.
Camera-only navigation and appearance changes do not upload terrain. Track actual
device, software rejection reason, resource count, upload bytes, context losses
and restorations. Reject software WebGL as evidence of hardware acceleration.

For sparse 3D texture uploads, both unpack row length and image height span the
complete source chart; skip offsets plus patch size must fit those dimensions.
Reset unpack state after each upload batch. These constraints are defined by the
[WebGL 2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/).

Sphere GPU storage is one RGBA32F six-layer texture, one program and one vertex
array. Four explicit texel fetches reconstruct elevation and world gradient; no
floating-texture linear-filter extension is required. Height normalization avoids
overflow in shader arithmetic. Extreme within-map dynamic ranges can exceed GPU
floating-point precision; CPU double arithmetic and canonical samples remain
available. This is a display limitation, not permission to quantize geography.

When WebGL2 is unavailable, software-rendered, failed or lost, use a coherent CPU
field snapshot. Work yields every 512 pixels and pumps roughly 6 ms per frame.
Sphere retains the previous pixel budgets: desktop 80k editing / 180k navigation /
420k settled; coarse-pointer 35k / 70k / 220k. Atomic runtime operations and browser
scheduling can exceed a requested slice. Publish only a complete image, retaining
its exact camera, viewport and source revision. Cancel obsolete camera jobs.
Context restoration recreates bounded resources and uploads the current field.

## Camera, input and revision boundaries

Requested and displayed cameras are distinct. Picking, previews and elevation
inspection use the displayed pose. Manual view changes end active painting;
new strokes wait for a valid displayed pose. Controlled limb/net assistance
requests a camera image first, then accepts its physical endpoint only when that
pose is presented. Release during CPU reconstruction remains on the displayed
pose. Each queued spherical endpoint captures its immutable visibility arc.

Double-buffered spherical display fields publish an entire derived epoch at once.
Later numerical commits queue the next patch. Pending feedback covers both
unprepared input and committed terrain awaiting presentation. Display completion
is separate from Save completion, exact history and the saved content checkpoint.

## Evidence and diagnostics

Report native input, numerical preparation, host validation/commit, derived-field
work, image submission and changed compositor terrain pixels separately. A RAF,
moving cursor, overlay or committed revision is not visible terrain evidence.
Measure p50/p95/max and sample counts. Bound diagnostic rings and state whether a
quantile covers the whole measurement or a retained window. Distinguish real
hardware from software fallback, and mobile emulation/page CPU throttling from a
physical device. Keep screenshots matched to the same saved numerical geography,
view, resolution and viewport. Owner visual/painting acceptance remains separate
from automated technical verification.

## Proposed bounded flat/wrapped follow-up

The owner accepted A7-P1C for progression and deferred this overhaul in favor of remaining geometries, beginning with accepted Cube-A/B/C1/C2A and accepted numerical-only Cube-C2B1 execution/history. The authorized C2B2 responsive execution checkpoint also adds no visual changes and claims no first-visible terrain-pixel or final interactive acceptance. Its browser evidence measures numerical processing and frame/task scheduling. C2B2 is now accepted for progression; Cube-D1 alone is separately authorized. Its [physical cube/net preview](SOLID-CUBE-VISUAL-PREVIEW.md) follows these elevation-first rules, using planar normals, real folded neighbors and the same canonical signed heights in both backends. First visible real coarse pixels, full detail, hardware/software paths, mobile CPU4x and memory are measured separately. **Stop after Cube-D1 for Ember’s technical review and the owner’s first visual acceptance. D2, the Cube-E editor, Cube-F persistence, history-capacity changes, hollow worlds, other geometries and website integration require separate authorization.** This flat/wrapped proposal remains future work, not the next authorized assignment. Separately authorize a later pass:

1. Capture matched v1/v2 geography, Fit/Fill/Focus/context views and native-input
   baseline measurements at the supported raster resolution.
2. Replace palette-raster enlargement with elevation-first reconstruction and
   optional physical planar gradients. Extend stencils periodically in X only
   where topology permits; bounded margins remain non-geographical.
3. Add persistent GPU presentation and the same revision/camera/fallback contract,
   preserving proportions, movable cuts and narrow connected previews.
4. Benchmark cooperative strokes before selecting any worker threshold. Retain
   periodic phase rebasing, screen-edge assistance, all four brushes, whole-gesture
   history and v1/v2 saves. Reuse ordering/lease/progress primitives; keep planar
   numerical kernels independent of sphere/cylinder mathematics.
5. Prove accepted-source complete words/history and mixed v1-v4 libraries, test
   native inputs and GPU failure, and deliver matched pixels and timing evidence.

This document proposes that follow-up; A7-P1C does not implement it or authorize
new geometry, terrain conversion, database, Worlds or main-site integration.
