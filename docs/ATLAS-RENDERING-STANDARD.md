# Atlas rendering and shared editor standard

Owner direction, 2026-10-22: **Use what works. Reinvent only when proven
unworkable.** This is a standing requirement for every subsequent Atlas shape.
It supplements the current hollow-world correction and Open Cylinder work;
it does not authorize additional shapes or a replacement terrain engine.

Atlas is one editor. New geometry inherits the accepted presentation, input,
camera interaction, numerical editing, scheduling, history, persistence and
workspace behavior wherever those implementations remain valid. Demonstrate a
specific incompatibility before replacing an accepted mechanism. Extract shared
infrastructure incrementally; keep the accepted solid renderers operational.

The owner accepted the specific painted-coastline correction after identifying
the 0 m versus -100 m initialization difference in matched captures. Normal new
hollow worlds now default to the same **-100 m blank ocean** as solids. The
explicit **Reference shell (0 m)** option preserves level-shell hole/tunnel
authoring. This later direct authorization covers new-world initialization; it
does not authorize modifying an existing map's heights or reinterpreting saves.
Thin shells that cannot safely contain a -100 m ocean require the explicit
reference-shell option or larger clearance; never clamp elevations silently.

## Existing reference implementations

| Family | Accepted terrain presentation, reused by solid and hollow | Geometry adapters |
| --- | --- | --- |
| Cylinder | `cylindrical-elevation.ts`: shape-preserving numerical Hermite reconstruction and interpolated physical gradients. `cylindrical-raster.ts`: coherent terrain epochs, palette, relief, coastline coverage and Canvas output. `cylindrical-webgl.ts`: the same field/color functions in both programs. | Wall/disk chart coordinates, physical normals, fitted projection and camera rays; `hollow-cylinder-display.ts` supplies actual excavation intersections. |
| Open Cylinder | The actual accepted cylinder Hermite, coherent raster/cache, field/color/coast GLSL, GPU resources, backing/refinement policy and editor session/workspace are shared. See `ConnectedWorkspace`, `ConnectedPreviewSession`, `coherent-terrain-raster.ts` and `cylindrical-terrain-glsl.ts`. | Four real annular patches, shared crease ownership, inner-wall/rim row orientation, fitted inversion, actual open-volume rays and protected reference-shell excavation. No filled disk caps or fabricated closed-worker metadata. |
| Sphere | `spherical-elevation.ts`: canonical alias-aware height/gradient field and shared terrain color pass. `spherical-field-raster.ts`: common Globe/net raster and coast coverage. `spherical-webgl.ts`: shared field and terrain shading. | Cube-sphere chart lookup, projection, cavity rays and shell/capsule subtraction. |
| Cube | `solid-cube-field.ts`: canonical bilinear elevation/gradient sampling and terrain color. `solid-cube-canvas.ts`: accepted face atlas and its ordinary presentation. `solid-cube-webgl.ts`: accepted field, palette, oriented relief and four-ray terrain presentation. | Face projection, normals, joins and box/capsule subtraction. Physical cut regions extend the accepted face presentation. |
| Solid and Hollow Pyramid | The same `polyhedralDisplayColor` extracted from the accepted cube color pass, unchanged cube GLSL palette/relief functions, four-ray GPU coverage, sharp face atlases, indexed display epochs and shared graphics/backing policy. Both variants use `PyramidDisplayCache` and `PyramidPresentation`. | Four real triangles and a square base, barycentric field addresses, five-plane picking, physical frames and cavity perspective. Canvas cavity inspection samples that same atlas through exact inverse plane homographies; no alternate terrain or smoothing pass. |
| Solid and Hollow Regular Tetrahedron | The same generic polyhedral display cache, palette/relief, sharp atlas, incremental epochs, four-ray GPU and graphics/backing mechanisms used by Pyramid. `PolyhedronPresentation` accepts real face count/triangle flags and a geometry projection; Pyramid keeps its compatibility entry points. | Four real equilateral triangles including the base, canonical edge/vertex ownership, true normals, four-plane picking and a connected triangular net. Nested hollow banks use this identical field and presenter with inward physical normals, fitted inside editing and center-cavity projection. See the [solid](TETRAHEDRON-SOLID-EDITOR.md) and [hollow](TETRAHEDRON-HOLLOW-EDITOR.md) operational reviews. |

The operational regular Octahedron reuses this same polyhedral presenter, field,
worker and input/history system. Its verified eight-triangle net uses the shared
triangular projection factory; Tetrahedron retains its original net and public
entry points. A geometry-qualified N128/N256 Octahedron profile admits 262,146
canonical samples after actual pixels, memory, input latency and recovery pass.
Other profiles retain their prior cap; work/history/backing limits do not change.
See the [Solid Octahedron review](OCTAHEDRON-SOLID-EDITOR.md).

The existing families have different accepted reconstruction mathematics. This
standard does not silently replace cylinder Hermite reconstruction with cube
bilinear reconstruction, or reinterpret saved geography. A hollow variant uses
its corresponding family's accepted field and shading, rather than choosing a
lower-quality terrain path because excavation geometry is different.

`elevation-colors.ts` is the common CPU palette, including the allocation-free
output form used in the spherical raster. `surface-renderer.ts` defines finite
backing dimensions and display receipts. `raster-quality.ts` supplies bounded
settled density and actual boundary coverage. `excavation-interval-glsl.ts`
shares capsule math and conservative projected cut bounds. GPU programs retain
the accepted terrain functions; geometry adapters select the actual surface.

## Presentation contract

* Canonical elevation arrays remain the authority. Display fields, textures,
  atlases and images are derived, read-only epochs. Viewing cannot write terrain.
* Select the real hit and bank first, reconstruct numerical elevation and
  physical gradients, then apply the accepted palette and shading. Rock bore
  walls come from real excavation geometry. A color mask cannot replace a hole.
* Coast coverage uses the reconstructed signed elevation. Use actual subpixel
  geographical samples at a boundary. Preserve a pixel's center color when its
  subpixel samples all have the same material/coast class; do not blur ordinary
  ramps or alter geography to conceal the sample grid. Cut layers retain
  unchanged accepted terrain and composite only physically changed coverage;
  avoid synchronous readback/recoloring of the underlying atlas during input.
* Match actual backing density, device pixel ratio, numerical detail and camera
  when comparing variants. A large HTML canvas does not prove that its internal
  ray grid has sufficient resolution.
* Retain a coherent responsive image during input. Optional refinement must
  yield, stop while painting or draining accepted work, cancel obsolete epochs,
  and resume when the display is idle. A renderer must never make a gesture wait
  for a complete settled image.
* A new terrain/cut/opposing-bank revision gets a fast current image before idle
  refinement. Annotation-only changes must not trigger a costly identical raster.
* Keep resources bounded and release temporary hit fields after publishing a
  refined image. Preserve accepted context-loss and Canvas fallback behavior.
* Fitted editing, read-only immersive inspection and editable connected maps
  follow the same interaction rules across applicable shapes. Their physical
  projections may differ. Inspection pauses painting and both toolbar and
  keyboard history replay, and returning restores the previous editing state.

The current settled Canvas policy is at most 1.5 million pixels on desktop and
650,000 for coarse-pointer input, within the existing backing-density limits.
These are display budgets, independent of numerical resolution. Keep the proven
interactive budgets; a uniform large raster during painting violates this
contract. GPU backing and ordinary cube atlas limits remain explicitly bounded.

Ordinary cylinder-family terrain updates may retain that settled image while
rerendering conservative dirty rectangles, including periodic copies, through
the same coherent field/color/coverage pass. The bound includes the complete
intrinsic dab and reconstruction stencil. Camera/scene changes, unknown source
revision chains, inspection and cuts use the existing complete raster path.
Do not discard a sharp settled frame merely to enlarge a tiny interactive image.
Optional graphics information queries have a separate error boundary; a debug
renderer probe error must not be reported as a later resource-allocation error.

## Required acceptance evidence

Every new shape or presentation change must provide all of the following:

1. Equivalent solid/hollow geography where applicable: identical canonical
   heights, camera, zoom, appearance, sample detail and backend. Test both 0 m
   and -100 m initial conditions where those differences could obscure a defect.
2. Actual output-pixel comparisons with the accepted renderer or an independent
   geographical reference. Check stable terrain color/relief, coastline and
   silhouette coverage, seams and real hole boundaries. A successful return,
   revision match or nonempty screenshot alone is insufficient.
3. N128/N256 or comparable detail, Canvas and actual WebGL2, fitted editing and
   physical inspection, plus ordinary sustained painting/navigation with
   refinement enabled. Report software fallback honestly.
4. Exact canonical words and object identities before/after viewing, whole-
   gesture Undo/Redo, interruption recovery and strictly versioned Save/Open.
   Keep the existing solid and hollow editor regressions green.
5. Raw visual evidence, ordinary responsiveness observations, bounded resource
   evidence and clear limitations. Separate browser emulation, physical-device
   evidence and owner acceptance.

`tests/atlas-render-parity.spec.ts` is the matched solid/hollow pixel gate.
Its production-renderer fixtures use real Raise arithmetic and the same complete
height authority for each pair. A rear-wall cut enables the physical-cut path
without changing the visible front terrain. `tests/hollow-render-quality.spec.ts`
adds ordinary Atlas workflows with actual holes, both banks, all three views and
read-only history checks. Connection/guide and sustained-paint suites verify
excavation and responsiveness separately.

`pyramid-pixels.spec.ts` and `hollow-pyramid-pixels.spec.ts` compare actual
Canvas/WebGL output against the same canonical field and physical hit reference,
including fitted inside and perspective cavity views. The workflow, navigation,
context-loss and touch suites cover editing and history separately. See the
[Pyramid family review](PYRAMID-FINAL-REVIEW.md) for the final source receipt and
the conditional deferral of pyramid excavation.

Pixel parity allows the existing bounded raster footprint and minor numeric
channel rounding at edges; it cannot be used to excuse missing material, shifted
geography, visibly lower display resolution or an unresponsive editor. Review
the actual captures as well as numeric thresholds. A proposed replacement must
document why the accepted mechanism failed and provide comparative evidence.

This gate applies to Open Cylinder, any later authorized solid/hollow pyramids,
tetrahedra, polyhedra, tori, ringworlds, fragmented/irregular worlds and subsequent
Atlas geometries. No future geometry is authorized merely by appearing here.
