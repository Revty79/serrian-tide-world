# World surfaces, geometry and topology

Current P1 context: spherical authority, tools, D2-R assistance and v3 preservation remain exact; P1 hardens CPU raster rendering and corrects the future integration roadmap. No additional geometry or integration is implemented. Earlier checkpoint details below describe the retained foundation; completion reports remain historical receipts.

A5.1 stabilization follows owner-supplied Ember source/numerical approval of A6-B at `bafedf08343eb48f2e1bd50b5a05db0da13a1dcb`. It corrects planar input and adds controlled edge-assisted view translation with continuous gesture winding, leaving the spherical provider and numerical authority untouched. See [A5.1 findings and evidence](A5-1-COMPLETION.md). The owner's A6-P1 [eleven-phase roadmap](PHASE-1-HEIGHTMAP-ROADMAP.md) supersedes the separate replacement-Worlds plan: complete linked maps before joining existing Worlds in isolated development at Phase 7, then bidirectional records and existing history/timelines at Phases 8–9; verify acceptance/compatibility/permissions before authorized rollout at Phase 10, with reusable Earth at Phase 11.

A5.2 follows Ember's owner-reported source, visual and automated-evidence approval of A5.1 at `cf146b4e0c441b4e81b2a7d516aaf77462ba587d`; owner hands-on acceptance remains outstanding. The focused wrapped presentation changes camera scale and decorative context only. One centered working period uses a movable geographic cut, with connected previews where the viewport permits. Full-height context and Fit remain selectable. See [A5.2 completion](A5-2-COMPLETION.md).

## Surface-specific workspace views

The eventual surface-specific view provider must determine the working projection, connected context arrangement, inverse positions and brush footprints for its actual geometry. The current `rendering/periodic-view.ts` policy serves only the horizontally periodic plane. Its rectangular previews must not become a universal Atlas interface or a source of authoritative geography.

A6-D1 supplies spherical rotation/recentering and an oriented six-chart cutout; D2 connects the four physical brushes and projected geodesic previews. These are views of a round reference sphere. Movable cuts/local views remain future. Physical cubes and pyramids need their own connected-face layouts. Cylinders may use lateral panels with separately connected circular end caps. Hollow worlds require independently selectable interior/exterior terrain and views. Providers must agree with the surface metric/topology, keep shared points authoritative, and let creators center work without relocating/resampling elevations. Those other geometry providers are not implemented by D2. Future editable professional illustrated cartography must follow these same surface-specific arrangements across every supported shape and valid map scale, as preserved in the master roadmap.

## Measurement and common terrain authority — Issue #1

[GitHub Issue #1](https://github.com/Revty79/serrian-tide-world/issues/1) requires future physical terrain measurements, numerical mountain elevations, distinct relative relief and key-saddle topographic prominence, slope/aspect/profiles, consistent 3D meshes and eventual Worlds links. Measurements and 3D geometry must consume the same elevations, physical dimensions, shape/radius and surface normals; annotations cannot stand in for real numerical height. Use surface-aware metrics and orientation at seams/corners/poles, explicit datums and accuracy/resolution limits, and revision-aware derived results. Phase 4 develops measurements before Phase 5 illustrated mapmaking and Phase 6 true 3D. Stable feature anchors support existing Worlds integration/record/history linkage in Phases 7–9. The [master roadmap](PHASE-1-HEIGHTMAP-ROADMAP.md) records the complete requirement and its separately authorized implementation boundary.

## Decision and implementation boundary

Preserve bounded/periodic editors and v1/v2 saves. A6-A/B/C supply numerical authority/tools/history; D1/D2 supply globe/net editing. E adds exact v3 browser-local preservation, independent of view orientation, without modifying the physical frame or existing save interpretation. See [provider](SPHERICAL-HEIGHTMAP-FOUNDATION.md), [tools/history](SPHERICAL-SCULPTING.md), [views](SPHERICAL-VIEWS.md) and [v3 preservation](SPHERICAL-PERSISTENCE.md).

New Wrapped Map remains the additional persistable editor geometry. The explicit spherical development preview is session-only and keeps the current planar document in place; it offers no sculpting or Save/Open. Bounded/periodic Fill, Focus, Fit and shared-authority repetition retain their meanings. Cylinder/Hollow World and physical polyhedron editors are not exposed.

## Seven independent concepts

| Concept | Meaning / owner | Current contract |
| --- | --- | --- |
| World identity | Parent world, later associated with a real Serrian Tide World by the authenticated host | `WorldDefinition.id`; no database key/schema invented |
| Physical shape | Reference geometry, independently of any map window | `WorldShape`: flat outline, sphere, cylinder, hollow sphere, versioned custom geometry |
| Surface identity | A particular habitable sheet, interior or exterior | `{worldId, surfaceId}` plus `SurfaceRole`; IDs are not inferred from shape or terrain |
| Terrain representation | Authoritative numerical elevations associated with that surface | Independent terrain ID and versioned provider; planar `Terrain` remains v1/v2, while A6-A's spherical provider has its own canonical layout |
| Topology | Coordinate equivalence, connected charts, boundaries and traversal | `SurfaceTopology`, `ChartSeam`, per-edge `PatchBoundaries` |
| Projection | A possibly cut/distorted/repeated 2D view of a surface | Generic `MapProjection<ViewState>` contract; A5's concrete flat repeated view uses the same applied rectangle for rendering/inverse sampling and never owns elevation |
| Camera | Where and how a view is presented to the creator | Fill/Fit and a rebased periodic phase in A5; future projection-specific view/rotation state remains separate from geography |

A patch is a chart of one surface, not another World or another independently authored geography. The six numerical cube-sphere faces share one surface/terrain identity and one private Float32 buffer. The physical shape is round; a true physical cube remains a separate future geometry. A hollow world's future interior and exterior require different surface and terrain identities under one parent World. Multiple surfaces are not different projections of one elevation array.

`defineWorld` snapshots/freeze-copies descriptors, validates finite positive shape parameters, nondegenerate triangles, parent identity, unique surface IDs and unique terrain IDs within a world. Hollow catalogs allow exactly one exterior, exactly one interior, or one of each, with inner reference radius smaller than outer. It does not instantiate providers or prove that an arbitrary set of seams embeds as a valid physical shape. Host/provider validation must do that before a configuration becomes editable. No global registry, persistence schema, auth service or history timeline is introduced.

## Capability matrix

| Configuration | Working through A6-D2 | Contract / remaining work |
| --- | --- | --- |
| Bounded rectangular or square planar map | Four brushes, history/save; pure normalization, traversal, Euclidean metric, endpoint-inclusive lattice and explicit legacy binding | Numerical/v1 save behavior preserved; default Fill, optional Fit and interpolated presentation |
| One periodic rectangular axis, other bounded | A4 canonical coordinates, shortest-wrap metric, lattice and tangent transport; A5 unique authority, all four brushes, repeated view, continuous pan, preview/hit testing, exact history and v2 Save/Open | Horizontally periodic flat quotient only; no spherical or complete cylindrical geometry |
| Two periodic rectangular axes | Pure normalization, metric and neighbor examples | Flat rectangular quotient (intrinsic flat torus), not an implemented embedded doughnut or spherical world |
| Circle or triangle | Validated flat-outline descriptors | Shape masks, boundary intersection, sample ownership, clipping and metrics around holes need later providers; no editor support |
| Arbitrary planar edge connections | Per-edge/seam contracts | Validate edge length/parameterization, inverse pairing, orientation, corner cycles and allowed orientability; no arbitrary gluing engine |
| Sphere | A6-A/B/C authority/tools/history, D2 globe/net sculpting/previews and E exact v3 local Save/Open | E review/owner acceptance; D2-R held-stroke limb assistance, weaker-device N256 hardening and physical-device qualification remain future |
| Cylinder | Radius/length descriptor, periodic flat-coordinate math useful for its lateral chart | A7: physical scale, independent end policies, caps/connections, transitions and editor |
| Hollow sphere | Validated parent/surface catalogs for inside, outside or both | A7: independent cube-sphere terrain stores, orientation/elevation constraints and active-surface workflow |
| Custom/multi-face world | Versioned geometry, topology and representation references; chart seam/tangent contracts | Provider implementation and proof required; nonmanifold, nonorientable, irregular and variable-curvature cases need research |
| Passages between distinct surfaces | Documented future connection category | No openings, tunnels, geology, gravity, traversal cost or simulation implemented |

## Complete required geometry and Worlds inventory

The owner's future geometry requirements include **spheres; cylinders; hollow spheres with independently editable interiors/exteriors; true physical cubes; pyramids; tetrahedra and other polyhedra; torus and ring worlds; flat squares, rectangles, circles and triangles; and custom connected/multi-face geometry**. Independent interior/exterior terrain is required wherever the chosen physical geometry supports it. Only configurations explicitly implemented and tested may be exposed. A cube-sphere grid is a representation of a sphere; a flat doubly periodic grid is not a physical torus. Pyramid parameters, supported polyhedral face sets, cylinder ends and exact ring configurations still need specification.

All future providers must support seam-crossing tools, correct shared-corner connectivity, intrinsic surface metrics and editing free of projection-induced changes to geographic influence. Creators must be able to center the working area through surface panning, globe rotation, movable cuts or local views without rewriting numerical geography. The eventual creation flow must select the physical world shape, dimensions and eligible surfaces **before world generation**. Shape, representation and view remain independent choices.

The complete Atlas/Worlds direction also preserves **all Azgaar-style heightmap authoring tools; living historical terrain and alternate timelines; Worlds categories supplying civilizations, races, populations and history; automatic editable illustrated 2D maps from heightmaps with appropriate terrain stamps; military-style topographic rendering; interconnected world, region, city, building and dungeon maps; and integration into the existing Serrian Tide Next.js/TypeScript website**. These are future requirements, not new A6-A runtime features. History branches, depicted terrain/stamps, map-scale links, data categories and host permissions require explicit contracts; they do not become hidden responsibilities of a sample array.

See the [master roadmap](PHASE-1-HEIGHTMAP-ROADMAP.md) for current status and the preserved full tool inventory. This list neither implements additional descriptors/providers nor expands A6-A authorization.

## Coordinates, topology and orientation

### Addressing and normalization

`SurfacePosition` is `{worldId, surfaceId, patchId, u, v}`. Coordinates belong to an explicit chart and have declared units. The working rectangular provider rejects foreign World/surface/patch identities and nonfinite numbers. It returns new positions and never changes input coordinates or terrain.

A bounded axis includes both endpoints `[0, L]`. Outside positions return `null`; no silent clamp or wrap occurs. A periodic axis uses `[0, L)`; `L` and zero are equivalent. Negative/multiple periods normalize with a remainder, negative zero becomes positive zero, and normalization is idempotent within normal JavaScript floating-point precision. Very large coordinates lose fractional precision; future continuous cameras should periodically rebase their view accumulator without modifying geographic/sample identities. A truly bounded end remains bounded even when the other axis wraps.

`advance` takes a displacement in source-chart coordinates and returns a canonical destination and tangent transport, or `null` beyond a bounded edge. It is not a universal curved-surface geodesic step API. In the flat examples it supports multiple wraps. A future spherical provider must define paths through its physical metric and return chart transitions; adding `du,dv` naively to another face is insufficient.

### Unique samples and neighbors

The mathematical rectangular lattice is independent of elevation storage. Bounded axes include both endpoints: step `L/(count−1)`. Periodic axes have one authoritative sample per period: step `L/count`, with no second sample at `L`. Last-to-first neighbors wrap in either direction, retain orientation, and have the same intrinsic spacing as ordinary neighbors. Offsets may cross several periods; unsafe/noninteger offsets and invalid source indices throw. Lattice dimensions whose spacing underflows or falls below coordinate precision are rejected. Bounded neighbors outside the valid index range return `null`.

This distinction is why the new periodic lattice cannot be applied as a flag to an old endpoint-inclusive v1 elevation array. Both old edges contain independently authored samples. A future explicit conversion must decide what happens to their differing values, preserve the original and test the result. A4 performs no conversion.

### Seam transport and future faces

`ChartSeam` identifies source/destination chart edges and whether the increasing edge parameter is preserved or reversed. A seam identifies chart representations of the same physical location on the same surface; it is not a tunnel to a different surface. `PatchBoundaries` gives each edge its own bounded/connected rule, so a cylinder's two ends need not share a policy. The rectangular example implements only matching opposite-edge translations.

Every traversal returns a 2 × 2 tangent Jacobian mapping source chart components into destination components. `transportTangent` validates finite, nonsingular transforms and rejects overflow. Tests cover identity, quarter-turn/inverse and reversed-basis transport. This proves the reusable algebra, not a completed cube-face adjacency implementation. Direction-dependent brushes must transport their frame along the path; a screen-right movement need not remain chart-right after crossing a face.

A later multi-face provider must validate reciprocal seams, inverse Jacobians, edge scale, corner ownership and consistent orientation around loops. At corners it must choose the next chart from the physical path, not just arbitrary u-then-v wrapping. Unsupported or invalid seam configurations must fail before editing, without falling back to planar math.

### Intrinsic distance and brush scale

Topology and metric are separate contracts. The working bounded metric is Euclidean on its reference plane. Periodic distances use the shortest translated displacement in each periodic dimension. A periodic-u chart measured in meters is also the intrinsic lateral-cylinder metric when u measures circumference arc length and v measures axial length, with no end-cap path. It is not a complete cylinder implementation.

Legacy map units have no established physical scale. The legacy adapter preserves `map-units` and never invents a conversion to meters. Physical curved providers use reference dimensions in meters; A6-A requires an explicit sphere radius. The metric measures distance on the physical reference surface, independent of screen pixels and map projection; computing travel distance along detailed elevated relief is separate future work.

Future operations must require radius/distance units to match the metric, enumerate candidate samples through the representation/topology, then apply the existing numerical falloff/strength/blend kernels. Projected circles are not a substitute for intrinsic distance. Smooth neighborhoods require provider-aware neighbors and, on irregular curved grids, an explicitly reviewed weighting policy. Ghost/halo values must be pre-operation snapshots or revision-consistent read caches, never independently editable duplicate terrain.

## Projection and seamless navigation — A5 and future shapes

The architecture separates these operations:

```text
pointer CSS position
  → inverse 2D camera transform
  → projection unproject(view state)
  → canonical World/surface/patch position
  → topology + physical metric + unique sample ownership
  → numerical edit / one history operation

unique numerical terrain
  → selected projection(view state), including visible copies
  → 2D camera transform
  → clipped viewport
```

`MapProjection<ViewState>` projects a surface point into zero or more 2D locations with copy IDs, and inversely returns a canonical position or `null`. Multiple visible copies are presentation references to the same authoritative sample. Its current declaration has no concrete implementation, screen-pixel dependency or elevation writes. Provider-local view state can contain a seam origin or orientation; it is not terrain metadata. Copy IDs identify projected instances, not geography.

For the implemented periodic rectangle, the normalized camera phase is rebased modulo one period after each pan, equivalent to an unwrapped position without indefinite accumulation. CanvasPattern repeats one cached period over the viewport. The cut moves relative to the viewport, so a continent spanning the original right/left boundary can be centered normally. Inverse mapping uses the painted rectangle and A4 canonical normalization. A dab gathers unique physical columns and applies the shortest-wrap metric; every sample is written at most once per dab. A stroke retains unwrapped path coordinates, distance spacing and residual across the transition. Hover, preview and hit testing use the same applied transform. See [A5 completion](A5-COMPLETION.md) for formulas and actual interaction evidence.

For spheres, view orientation/rotation and projection cut move independently of the fixed cube-sphere reference frame. A local tangent/azimuthal editing view can center arbitrary geography, including a pole or face edge, without a privileged longitude seam. A world overview may use a cut projection or cube net, but it is a resampled view. Reprojection/rotation must never rearrange or resample authoritative elevation arrays. Brush previews trace projected intrinsic footprints and may look distorted in a distorted overview while retaining the correct physical area/scale.

During active sculpting A5 holds the applied transform stable; navigation or a changed painted rectangle ends the partial stroke before another transform is used. Regressions cover wheel/pinch/pan arbitration, seam recentering, cancellation, tool changes, visible-copy deduplication, bounded-edge behavior and exact Undo. Cube corners/poles do not exist in this periodic rectangle and still require A6 proofs.

Repositioning the working area is a firm requirement for every eventually supported geometry. A6 must put globe orientation, movable overview cuts and local spherical editing centers in projection-specific view state while keeping the authoritative patch frame fixed. A7 must select hollow interior/exterior identity independently of orientation, and retain separate terrain and history for each. A5's flat camera/renderer is one view adapter, not a universal curved-surface projection. Future adapters must supply consistent projected footprints, inverse hit testing and singular-region handling. No camera action may relocate or resample geography.

Poles are ordinary physical locations in the cube-sphere, not a row of duplicated longitudes. Multi-face projections must handle uneditable gaps and deterministic inverse chart selection at shared boundaries. A projection can have singular/cut regions; numerical topology must not inherit them. No flat global projection preserves every distance or shape, so edit metrics remain on the surface.

## Spherical numerical foundation — A6-A

### Implemented reference geometry

The numerical provider uses six equiangular gnomonic cube-sphere patches. Each face has a fixed orthonormal basis `(N,U,V)` with `U × V = N`. For angular face coordinates `a,b ∈ [−π/4, π/4]` in radians, map to unit direction:

```text
n = normalize(N + tan(a) U + tan(b) V)
reference position = R n
```

Viewing/geographic orientation is separate from the fixed representation frame. The sphere need not have an Earth-like axis or special habitable poles. The cube's edges/corners are chart transitions, not physical cliffs or editable boundaries. An equiangular cube-sphere avoids longitude convergence and its privileged polar singularity, but is not equal-area, conformal or distortion-free. NOAA describes equiangular gnomonic face continuation and corner/stencil issues; that informs this choice without adopting its atmospheric model. [NOAA, *Mobius Net Cubed-Sphere Gnomonic Grids*](https://repository.library.noaa.gov/view/noaa/19263)

The ExoCubed research also uses a gnomonic equiangular grid to avoid the conventional polar singularity. Its fluid-simulation speed results do not predict Atlas/browser performance. [Chen and Li, *ExoCubed*, 2024](https://arxiv.org/abs/2403.06844)

### Authoritative sample ownership

Choose a vertex-sampled reference grid with `N` cells per face edge. Store each physical node once: six face interiors, twelve shared edge interiors and eight corners. Unique count is:

```text
6 (N−1)² + 12 (N−1) + 8 = 6 N² + 2
```

Each face's logical `(N+1)²` view resolves boundary nodes to canonical keys through integer cube-surface coordinates. Storage order is six face interiors, twelve signed-axis edge interiors and eight sign-bit corners. Keys include World/surface/terrain identity, representation version, resolution and canonical index. The fixed face bases/order, all 24 directed seams, edge reversal and corner aliases are implemented and tested. Ownership never depends on floating-vector equality. Face caches/halos may repeat reads but cannot become additional authorities. Independent future hollow surfaces require different keys even at matching directions.

The implemented provider keeps one private contiguous Float32 buffer, algorithmic aliases and no persistent per-node objects or neighbor table. Both cardinal and cell-touching neighbor sets are reciprocal; corners have degree 3/6 respectively, rather than a fictitious planar 4/8. One-cell directional traversal returns an explicit reverse direction and, when crossing a seam, its pointwise tangent change of basis. See the [provider specification](SPHERICAL-HEIGHTMAP-FOUNDATION.md) for exact tables/index formulas. This in-memory representation version is not a new browser save format.

### Distances, neighbors and brushes

Implemented reference-sphere distance is `R × atan2(|n₁ × n₂|, n₁ · n₂)` with robust unit normalization and finite/degenerate checks. Geometry uses double precision; elevations use Float32. A6-B narrows each spherical cap to conservative face-local rectangles, emits each canonical owner once, then checks exact geodesic influence. Strokes follow shortest great-circle arcs with radius/4 meter spacing and carried residuals. Nearly antipodal endpoints require an explicit intermediate position. No face-coordinate circle, screen distance or arbitrary directional axis substitutes for the surface metric.

Shared-edge chart conversions use the analytical mapping Jacobians and the destination Gram matrix, preserving the same physical tangent despite nonorthogonal chart axes. This is a change of basis at one point, not parallel transport along a finite geodesic. Three faces meet at a corner. A6-C's Smooth uses three unique connected neighbors there, four elsewhere, with normalized inverse-geodesic-square weights and a half-center target. Every dab reads its complete source neighborhood before any writes. The independent welded-mesh oracle checks all seams/corners/poles; projected footprint consistency and interactive editing remain A6-D requirements. Flatten uses explicit meter targets relative to the fixed zero sea-level/reference-sphere datum. See [weighting rationale and limitations](SPHERICAL-SCULPTING.md).

### Resolution and resource estimates

Default test resolution is `N=128`: 98,306 samples / 393,224 elevation bytes. The numerical provider accepts integer N=2…512. Actual measured ArrayBuffer deltas match `4 × (6N²+2)` at N=16,64,128,256,512; N=512 uses 6,291,464 bytes. See the [measured receipt](evidence/a6-a-numerical-receipt.json). This excludes object/closure overhead, copied snapshots and all future history/rendering/upload buffers. It is not a browser frame-rate or total-memory promise. The v1/v2 save cap is not applied to a nonexistent spherical save codec.

A6 must benchmark representative desktop/mobile browsers and establish a shared memory budget. Use visible-patch/tile rendering, bounded dirty regions and cache invalidation; consider workers only after profiling. Undo must record canonical changed keys across all touched patches as one stroke, with a documented aggregate budget across surfaces. Existing A3's one-grid history cannot be assumed to cover an entire multi-surface world unchanged. Initial implementation should use uniform resolution; adaptive refinement and cross-resolution seams are later research.

Changing projection or viewport resolution must affect presentation only. Changing authoritative resolution is an explicit future resampling operation with separate history/storage rules; sample keys include N to prevent cross-resolution confusion. No globe renderer or resampler is implemented in A6-A.

### Alternatives considered

| Alternative | Tradeoff / decision |
| --- | --- |
| Latitude/longitude rectangular authority | Familiar view, but polar convergence, seam ownership and high-latitude brush distortion; rejected as the authoritative editable grid |
| Equirectangular or Mercator display | May be an overview projection later; never defines spherical sample topology or brush distance |
| Icosahedral triangular mesh | Good global coverage, but different adjacency/stencils and less direct reuse of dense rectangular interiors; a future representation provider could support it |
| HEALPix / equal-area or other spherical tessellations | Worth researching if equal-area analysis dominates; requires dedicated neighbor/interpolation/editing adapters |
| Equidistant radial cube-sphere | Simple mapping but different spacing variation; equiangular is the initial proposal for more convenient patch coordinate continuation |
| Equal-area spherical cube mappings | Potential area advantage, more involved mapping/inverse/metric work; revisit if measured distortion or analysis needs justify it |

These alternatives are project assessments, not claims that another grid cannot work. A6-A proves ownership/topology/geometry; A6-B adds numerical geodesic Raise/Lower and bounded history; A6-C adds connected Smooth and explicit-target Flatten. UI/rendering, interactive performance and persistence still require later checkpoints. Distance-aware local smoothing does not claim an equal-area or conservative diffusion discretization.

## Hollow worlds and other geometry — A7

### Two independent surfaces under one World

A hollow descriptor has reference radii `0 < Ri < Ro`. Exterior and interior surfaces have different IDs, terrain representations, elevations, sea levels, projections and eventual historical revision streams. Either surface alone or both may exist. Matching angular coordinates do not imply equal elevations, shared geography, synchronized editing or shared sea levels. The parent identity relates the surfaces without merging their terrain.

Let `n` point radially outward from the center. Positive elevation always projects toward that surface's habitable space:

```text
exterior habitable normal = +n;   position = (Ro + hOutside) n
interior habitable normal = −n;   position = (Ri − hInside) n
```

Raising exterior terrain moves outward. Raising interior terrain protrudes inward into the cavity; lowering it cuts outward into the shell. An interior view reverses the appropriate chart/basis orientation to match its inward normal; it must not negate or reverse the authoritative elevation array just to draw it. Screen-y orientation belongs to projection. Future slope/normal/brush-direction calculations must use a consistent tangent frame for the selected surface.

For radially matched samples, provisional clearance is:

```text
clearance(n) = (Ro + hOutside(n)) − (Ri − hInside(n))
             = Ro − Ri + hOutside(n) + hInside(n)
```

Both radii must remain positive and clearance must exceed an agreed tolerance. This is a geometric check for the radial height-field model, not geology or gravity. Later implementations must handle different resolutions, interpolated extrema between samples, opposing deep cuts and numerical precision conservatively. They must explicitly define whether invalid edits are rejected or constrained; A4 imposes no hidden elevation clamp on legacy terrain. Overhangs, caves and arbitrary shell thickness cannot be represented by one radial height field per side.

A passage is a separate connection between regions of distinct surfaces, with its own identity, orientation, aperture and traversal rules. It is not a coordinate seam that makes the two independent geographies equivalent. A4 defines no passages, automatic openings or connection distance. Gravity, fluid flow and historical effects need their own approved specifications.

### Cylinders, outlines and custom extensions

For a cylinder's lateral surface, circumference arc length `s = R θ` has period `2πR`, with an independent axial coordinate. This is intrinsically flat. A7-A's mixed-unit chart uses `u=θ` radians and axial `v` meters, with the corresponding `R² du²+dv²` metric. [The implemented foundation](CYLINDRICAL-HEIGHTMAP-FOUNDATION.md) supports only a physical solid capped exterior: two real disks, welded rims, one numerical authority and reciprocal fold transitions. [A7-B1](CYLINDER-GLOBAL-DISTANCE.md) supplies complete global route families and bounded reference-distance enclosures, failing explicitly on unsupported precision/work/range. End policies for other future configurations remain independent: bounded edge, cap surface or a validated connection. Caps cannot be implemented by wrapping the axial coordinate. A7-B2A adds [bounded single-dab four-tool operations](CYLINDRICAL-SCULPTING.md) across this connected authority, with interval-aware reach, local polar/rim Smooth conductances and atomic source-epoch commits. No cylinder UI choice appears. A7-B2B1 adds [certified connected physical paths](CYLINDER-PHYSICAL-PATHS.md), one-sided rim tangents and bounded lazy spacing. A7-B2B2 adds [continuous numerical four-tool strokes and bounded exact history](CYLINDRICAL-STROKES.md), physical residual/error carry, ordered cooperative work and reversible interruption prefixes. A7-C adds [development-only physical/connected views and real editing](CYLINDRICAL-EDITING.md); normal selection/persistence remain A7-D.

Circle/triangle descriptors need valid-domain masks or appropriate meshes and real boundary tests; a rectangular bounding box is only an allocation/view aid. Optional connections must match edge lengths/parameterizations and consistent orientations. A triangle's corner cycles and a circle's arcs do not fit a naive opposite-rectangle-edge rule.

Versioned custom geometry/topology/representation providers provide the extension point. Providers must supply identity-safe normalization, metric, neighbor/footprint enumeration, seam transport and projection inverses plus tests. Unknown provider IDs/versions must be refused by the eventual host; do not fall back to a rectangle. Nonorientable surfaces need an explicit choice about habitable side/normal before supporting elevation; nonmanifold joins and time-varying topology remain research.

## Compatibility and eventual migration

A4's legacy adapter remains explicitly called and requires host-provided World/surface/patch IDs. It returns the original terrain/buffer unchanged, a bounded descriptor, metric/topology and endpoint-inclusive lattice. It never derives World identity from a terrain ID, marks an old map periodic, or saves anything. App does not automatically call it. A5 adds a discriminated v2 metadata/codec for newly created wrapped maps, reuses tool arithmetic and changes presentation. The v1 interpretation, canonical encoding, history semantics, IndexedDB schema and existing records remain preserved.

The frozen fixture `tests/fixtures/saves/a3-v1-heightmap.json` was encoded for A4 verification using the v1 encoder whose Git blob is identical to the approved A3 source. Its fixture wrapper stores elevation bytes as base64 for test transport, not a new app save/export format. The embedded v1 checksum and byte payload are fixed. Unit tests prove decode → explicit binding → encode with identical time/name produces identical metadata, checksum and bytes, including signed zero. Browser tests seed a disposable test profile, open the fixture through actual saved-map selection, navigate, edit/Undo, save unchanged bytes, then Redo/save changed bytes while keeping identity and metadata.

A5's v2 format records topology, unique-u/inclusive-v ownership and World/surface/patch identities, but is only one periodic rectangle. A future multi-surface format needs a separate explicit version, geometry/topology/representation provider versions, unique shared patch/chunk ownership, reference dimensions, independent sea levels, integrity checks and resource limits. Keep v1/v2 readers and catalog entries usable. Open legacy data as bounded planar first; any future conversion must create a new verified record after explicit policy/acceptance and leave the original available. Never overwrite v1 with an incompatible envelope or silently turn its ID into a World key.

A5 keeps IndexedDB schema version 1 and the existing two stores; it performs no schema upgrade or data migration. Mixed v1/v2 records work together. Its atomic Save rejects same-ID format/identity replacement and validates records before opening. A4 can still open v1 but refuses v2. See [integration architecture](ARCHITECTURE.md) for rollback limits. A6/A7 must test any future actual schema upgrade, interrupted transaction recovery, downgrade/error handling, backup/rollback and resource budgets. Session Undo is separate from future historical canon.

## Checkpoints and outstanding decisions

| Pass | Scope and acceptance focus |
| --- | --- |
| A4 — reviewed baseline | Pure contracts/examples, identity isolation, documented spherical/hollow/projection strategy, unchanged planar editor and v1 saves; Ember source/architecture approval supplied by owner |
| A5 — reviewed baseline | Seam-aware flat/periodic editor, continuous recentering, full-screen Fill/Fit, fullscreen, interpolated display, exact history and v2 saves; Ember approval supplied by owner |
| A6-A — reviewed baseline | Numerical spherical authority, unique shared vertices, edge/corner adjacency, metric and tangent basis conversions; independent approval supplied by owner |
| A6-B — reviewed baseline | Numerical geodesic Raise/Lower, conservative cap search, continuous shortest-arc strokes and private canonical history; Ember source/numerical approval supplied by owner; no globe UI or browser persistence |
| A5.1 — stabilization before A6-C | Planar input fixes, explained repetition and controlled screen-edge scrolling with one stroke/history operation; technical evidence in A5.1 completion |
| A5.2 — reviewed presentation before A6-C | Larger focused periodic working cycle with connected previews and movable view cut; selectable full-height/Fit; Ember source/test/visual-evidence approval supplied by owner; hands-on acceptance separate |
| A6-C — reviewed numerical tools | Connected Smooth and datum-relative Flatten, shared cap/spacing/lifecycle/history, independent reference and N=128/256 measurements; Ember approval supplied by owner |
| A6-D1 — viewing foundation | Implemented; owner supplied Ember's source/projection/screenshot/browser-evidence approval |
| A6-D2 — interactive editing | Owner supplied Ember's technical approval; final hands-on acceptance separate. Held-stroke limb assistance and N=256 editing hardening remain required |
| A6-E — local preservation | V3 exact Save/Open, validation, atomic local storage/failure recovery and fresh reopened history; independent review pending |
| Subsequent work — requires authorization | D2-R, weaker-device editing hardening and later agreed geometry/capabilities |
| A7-A — current authorized checkpoint | Physical solid capped-cylinder exterior numerical foundation, shared authority and sharp-rim folds; no cylinder editor/save/renderer; stop for independent review |
| A7-B1 — current distance checkpoint | Corrected mesh assertions, complete physical route families, bounded global distance/error interface and independent numerical references; no cylinder UI/brush/history/persistence |
| A7-B2A — single-dab checkpoint | Physical four-tool numerical preparation/atomic commit, conservative canonical footprints, interval-aware influence and polar/rim Smooth; no cylinder UI/strokes/history/persistence |
| A7-B2B1 — path checkpoint | Connected side/disk physical routes, length/error certificates, deterministic/direction-aware tie selection, distance evaluation and bounded lazy spacing; no cylinder painting/history/UI/persistence |
| A7-B2B2 - numerical stroke checkpoint | Physical paths connected to unchanged B2A dabs; corrected decimal spacing, accepted-input scheduling/cancellation and bounded exact whole-stroke history; no cylinder UI/persistence |
| A7-C - development editor checkpoint | Actual physical and connected side/disk views, exact stencils, shared numerical input/history, visibility protection and browser evidence; session-only |
| A7-D and later | Validated cylinder Save/Open and normal unified selection first; other agreed geometries/configurations remain separately authorized |
| Subsequent passes | Complete Azgaar-style heightmap toolset and later interchange/generation/analysis/presentation in separately reviewed scopes |

Review may subdivide these passes. The former A7 external interchange label is superseded by the owner's new ordering; import/export remains future work with no new pass number assigned here.

Open decisions: physical scale for legacy flat worlds; later spherical browser/UI memory budget; continuous render interpolation and any future area-conservative diffusion; geodesic paths/finite-path tangent transport for directional tools; overview/local projections and singular regions; allowed planar gluing configurations; persistence/migration/conversion policy; active-surface Undo presentation; clearance tolerance and invalid-edit behavior; cylinder ends/caps; parameters/providers for the complete future geometry inventory. A6-A fixes its versioned face bases, canonical ownership and initial numerical N; A6-C selects a local distance-aware Smooth policy. These are representation/tool decisions, not Earth assumptions or Serrian Tide canon. Remaining decisions are not exposed as functional UI.

The original Next.js/TypeScript application retains responsibility for authentication, server-side permissions, World records and database storage. The development shell remains replaceable, with numerical/view/session/codec layers separate from the browser host and IndexedDB adapter. No site integration or deployment is authorized. **Stop after A7-C for Ember's independent review; do not begin A7-D.** Owner acceptance remains separate. Editing documentation retains physical brushes, net edge assistance, D2-R and P1's weaker-device N=256 rendering improvements. The current eleven-phase master roadmap supersedes historical integration ordering; existing Worlds is the future target, with functional linked maps completed before integration.
