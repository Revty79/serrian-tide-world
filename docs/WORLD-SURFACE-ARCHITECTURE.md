# World surfaces, geometry and topology — A4

Status: architecture foundation, October 17, 2026. Approved baseline: A3 `7c4c7158d3b8dfd8e5af6194852e3382c90de0c7`.

## Decision and implementation boundary

Keep the working A0–A3 planar editor and save format intact. Add an opt-in mathematical surface layer, leaving curved/connected editing and continuous navigation for the authorized later passes. Adopt a six-patch equiangular gnomonic cube-sphere with uniquely owned shared vertices as the proposed spherical terrain strategy. The strategy is a project design decision, not a completed spherical implementation or performance claim.

No new geometry choice is exposed in the UI. The existing camera still fits and bounds the planar map. The new modules are not imported by the development application, so they do not silently change editing or add unsupported modes to its bundle.

## Seven independent concepts

| Concept | Meaning / owner | A4 contract |
| --- | --- | --- |
| World identity | Parent world, later associated with a real Serrian Tide World by the authenticated host | `WorldDefinition.id`; no database key/schema invented |
| Physical shape | Reference geometry, independently of any map window | `WorldShape`: flat outline, sphere, cylinder, hollow sphere, versioned custom geometry |
| Surface identity | A particular habitable sheet, interior or exterior | `{worldId, surfaceId}` plus `SurfaceRole`; IDs are not inferred from shape or terrain |
| Terrain representation | Authoritative numerical elevations associated with that surface | Independent `terrainId` and versioned representation provider; existing `Terrain` remains v1 planar |
| Topology | Coordinate equivalence, connected charts, boundaries and traversal | `SurfaceTopology`, `ChartSeam`, per-edge `PatchBoundaries` |
| Projection | A possibly cut/distorted/repeated 2D view of a surface | `MapProjection<ViewState>` contract only; projection instances never own elevation |
| Camera | Where and how a view is presented to the creator | Existing planar camera unchanged; future projection-specific view/rotation state is separate from geography |

A patch is a chart of one surface, not another World or another independently authored geography. Six cube faces will share one surface/terrain identity. A hollow world's interior and exterior will have different surface and terrain identities under one parent World. Multiple surfaces are not different projections of the same elevation array.

`defineWorld` snapshots/freeze-copies descriptors, validates finite positive shape parameters, nondegenerate triangles, parent identity, unique surface IDs and unique terrain IDs within a world. Hollow catalogs allow exactly one exterior, exactly one interior, or one of each, with inner reference radius smaller than outer. It does not instantiate providers or prove that an arbitrary set of seams embeds as a valid physical shape. Host/provider validation must do that before a configuration becomes editable. No global registry, persistence schema, auth service or history timeline is introduced.

## Capability matrix

| Configuration | Working in A4 | Contract / remaining work |
| --- | --- | --- |
| Bounded rectangular or square planar map | Existing editor; new pure normalization, traversal, Euclidean metric, endpoint-inclusive lattice and explicit legacy binding | Current numerical/UI behavior unchanged |
| One periodic rectangular axis, other bounded | Pure canonical coordinates, shortest-wrap metric, discrete neighbors, identity tangent transport | Mathematical flat quotient only; A5 must implement actual wrapped edits and movable view seam |
| Two periodic rectangular axes | Pure normalization, metric and neighbor examples | Flat rectangular quotient (intrinsic flat torus), not an implemented embedded doughnut or spherical world |
| Circle or triangle | Validated flat-outline descriptors | Shape masks, boundary intersection, sample ownership, clipping and metrics around holes need later providers; no editor support |
| Arbitrary planar edge connections | Per-edge/seam contracts | Validate edge length/parameterization, inverse pairing, orientation, corner cycles and allowed orientability; no arbitrary gluing engine |
| Sphere | Radius descriptor, chart/metric/projection contracts and selected cube-sphere design | A6: shared samples, all seams/corners/poles, spherical metrics/brushes, projections and continuity proofs |
| Cylinder | Radius/length descriptor, periodic flat-coordinate math useful for its lateral chart | A7: physical scale, independent end policies, caps/connections, transitions and editor |
| Hollow sphere | Validated parent/surface catalogs for inside, outside or both | A7: independent cube-sphere terrain stores, orientation/elevation constraints and active-surface workflow |
| Custom/multi-face world | Versioned geometry, topology and representation references; chart seam/tangent contracts | Provider implementation and proof required; nonmanifold, nonorientable, irregular and variable-curvature cases need research |
| Passages between distinct surfaces | Documented future connection category | No openings, tunnels, geology, gravity, traversal cost or simulation implemented |

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

Legacy map units have no established physical scale. The legacy adapter preserves `map-units` and never invents a conversion to meters. Physical curved providers will use reference dimensions in meters. The metric measures distance on the physical reference surface, independent of screen pixels and map projection; computing travel distance along detailed elevated relief is separate future work.

Future operations must require radius/distance units to match the metric, enumerate candidate samples through the representation/topology, then apply the existing numerical falloff/strength/blend kernels. Projected circles are not a substitute for intrinsic distance. Smooth neighborhoods require provider-aware neighbors and, on irregular curved grids, an explicitly reviewed weighting policy. Ghost/halo values must be pre-operation snapshots or revision-consistent read caches, never independently editable duplicate terrain.

## Projection and seamless navigation plan — A5 onward

The pipeline will be:

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

For a periodic rectangular surface, keep an unwrapped view offset and repeat only visible map tiles. Move the seam by changing that view offset/projection cut. A continent crossing the original right/left boundary can then be centered normally. Inverse projection maps either visible copy to the same canonical sample. A dab straddling the cut gathers both sides but deduplicates sample keys and writes each sample once. A stroke carries physical arc-length spacing and residual distance across the transition; neither its strength nor its history boundaries depend on the display cut. Hover sampling, preview and hit testing must use the same transform revision.

For spheres, view orientation/rotation and projection cut move independently of the fixed cube-sphere reference frame. A local tangent/azimuthal editing view can center arbitrary geography, including a pole or face edge, without a privileged longitude seam. A world overview may use a cut projection or cube net, but it is a resampled view. Reprojection/rotation must never rearrange or resample authoritative elevation arrays. Brush previews trace projected intrinsic footprints and may look distorted in a distorted overview while retaining the correct physical area/scale.

At an active pointer interaction, A5 must either hold the view transform stable or explicitly rebase the stroke under the same captured physical point. Add regression proof for wheel/pinch/pan arbitration, seam movement during hover, active-stroke lifecycle, visible-copy deduplication, corner crossings and exact Undo. A4's bounded camera is intentionally unchanged and does not claim this functionality.

Poles are ordinary physical locations in the cube-sphere, not a row of duplicated longitudes. Multi-face projections must handle uneditable gaps and deterministic inverse chart selection at shared boundaries. A projection can have singular/cut regions; numerical topology must not inherit them. No flat global projection preserves every distance or shape, so edit metrics remain on the surface.

## Spherical terrain strategy — A6

### Selected proposal

Use six equiangular gnomonic cube-sphere patches. Each face has a fixed orthonormal basis `(N,U,V)` with `U × V = N`. For face coordinates `a,b ∈ [−π/4, π/4]`, map to unit direction:

```text
n = normalize(N + tan(a) U + tan(b) V)
reference position = R n
```

World orientation is separate from patch coordinates. The sphere need not have an Earth-like axis or special habitable poles. The cube's edges/corners are chart transitions, not physical cliffs or editable boundaries. An equiangular cube-sphere avoids longitude convergence and its privileged polar singularity, but is not equal-area, conformal or distortion-free. NOAA describes equiangular gnomonic face continuation and the additional corner/stencil issues; that informs this choice without adopting its atmospheric simulation model. [NOAA, *Mobius Net Cubed-Sphere Gnomonic Grids*](https://repository.library.noaa.gov/view/noaa/19263)

The ExoCubed research also uses a gnomonic equiangular grid to avoid the conventional polar singularity. Its fluid-simulation speed results do not predict Atlas/browser performance. [Chen and Li, *ExoCubed*, 2024](https://arxiv.org/abs/2403.06844)

### Authoritative sample ownership

Choose a vertex-sampled reference grid with `N` cells per face edge. Store each physical node once: six face interiors, twelve shared edge interiors and eight corners. Unique count is:

```text
6 (N−1)² + 12 (N−1) + 8 = 6 N² + 2
```

Each face's logical `(N+1)²` view resolves boundary nodes to canonical owner keys. Stable keys use surface identity plus face-interior, edge or corner identity and integer sample index. A fixed basis/face ordering and canonical edge directions will be defined and tested in A6. Floating vector equality or duplicated endpoint writes must not determine ownership. Face caches/halos can repeat values for reading/rendering but cannot become additional authorities. Independent hollow surfaces have different keys even at matching angular directions.

A node/patch store can keep interiors contiguous and resolve boundary ownership algorithmically. Avoid allocating full per-node JavaScript objects or an all-to-all neighbor table. Existing row-major Float32 storage remains useful for dense interiors, while the adapter resolves shared boundaries. New surface representation/version is required; do not pretend six grids fit into v1's single planar buffer.

### Distances, neighbors and brushes

Reference-sphere distance is `R × atan2(|n₁ × n₂|, n₁ · n₂)` with unit vectors, finite checks and antipodal/near-zero tests. Use double-precision geometry with Float32 relative elevations. A dab enumerates intersecting patches then tests geodesic distance against its meter radius. One global sample key is visited at most once. Path interpolation and dab spacing follow the surface rather than linearly interpolating screen pixels or raw face coordinates.

At shared edges, rotate/transform tangent directions and fetch the actual adjacent samples. Three faces meet at a cube corner, so the planar assumption of one uniform rectangular 3 × 3 neighborhood cannot silently carry through. Define/verify corner stencil, interpolation and metric weighting before claiming Smooth/Flatten consistency. Test a brush centered on every face edge, every corner, the chosen geographic poles, and equivalent physical paths expressed in different charts/projections. Seam/pole continuity requires both position and numerical neighbor correctness; pretty rendering is insufficient.

### Resolution and resource estimates

At `N=256`, 393,218 unique Float32 elevations occupy about 1.5 MiB per surface. At `N=512`, 1,572,866 occupy about 6 MiB per surface; two hollow surfaces start around 12 MiB. These are payload estimates, not total browser memory. Masks, source snapshots, history, projected rasters, caches, index structures and upload buffers add to them. The current v1 save cap of 1,048,576 samples is not a spherical-world capacity promise.

A6 must benchmark representative desktop/mobile browsers and establish a shared memory budget. Use visible-patch/tile rendering, bounded dirty regions and cache invalidation; consider workers only after profiling. Undo must record canonical changed keys across all touched patches as one stroke, with a documented aggregate budget across surfaces. Existing A3's one-grid history cannot be assumed to cover an entire multi-surface world unchanged. Initial implementation should use uniform resolution; adaptive refinement and cross-resolution seams are later research.

Changing projection or viewport resolution only changes presentation caches. Changing terrain resolution is an explicit numerical resampling operation with its own history/storage rules, not a camera action. No globe renderer or resampler is implemented in A4.

### Alternatives considered

| Alternative | Tradeoff / decision |
| --- | --- |
| Latitude/longitude rectangular authority | Familiar view, but polar convergence, seam ownership and high-latitude brush distortion; rejected as the authoritative editable grid |
| Equirectangular or Mercator display | May be an overview projection later; never defines spherical sample topology or brush distance |
| Icosahedral triangular mesh | Good global coverage, but different adjacency/stencils and less direct reuse of dense rectangular interiors; a future representation provider could support it |
| HEALPix / equal-area or other spherical tessellations | Worth researching if equal-area analysis dominates; requires dedicated neighbor/interpolation/editing adapters |
| Equidistant radial cube-sphere | Simple mapping but different spacing variation; equiangular is the initial proposal for more convenient patch coordinate continuation |
| Equal-area spherical cube mappings | Potential area advantage, more involved mapping/inverse/metric work; revisit if measured distortion or analysis needs justify it |

These alternatives are project assessments, not claims that another grid cannot work. The selected strategy remains subject to A6 numerical continuity and performance acceptance. A4 does not prove its edge tables, interpolation, footprint or rendering implementation.

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

For a cylinder's lateral surface, use circumference arc length `u = R θ`, period `2πR`, and axial `v`. This is intrinsically flat. End policies are independent: bounded edge, cap surface or a validated connection. Caps cannot be implemented by wrapping the axial coordinate. A disk cap and curved side require different chart metrics and tangent transport. A7 must define the exact initial configurations and tests before UI choices appear.

Circle/triangle descriptors need valid-domain masks or appropriate meshes and real boundary tests; a rectangular bounding box is only an allocation/view aid. Optional connections must match edge lengths/parameterizations and consistent orientations. A triangle's corner cycles and a circle's arcs do not fit a naive opposite-rectangle-edge rule.

Versioned custom geometry/topology/representation providers provide the extension point. Providers must supply identity-safe normalization, metric, neighbor/footprint enumeration, seam transport and projection inverses plus tests. Unknown provider IDs/versions must be refused by the eventual host; do not fall back to a rectangle. Nonorientable surfaces need an explicit choice about habitable side/normal before supporting elevation; nonmanifold joins and time-varying topology remain research.

## Compatibility and eventual migration

A4 does not alter `TerrainMetadata`, existing brushes/sampling/rendering/history, the application, the v1 codec, IndexedDB schema or existing browser data. `describeLegacyPlanarTerrain` is an explicitly called in-memory adapter requiring host-provided World/surface/patch IDs. It returns the original terrain/buffer unchanged, a bounded rectangular world descriptor, a bounded metric/topology and the matching endpoint-inclusive lattice. It never derives World identity from a terrain ID, marks an old map periodic, or saves anything. It is not invoked automatically by App.

The frozen fixture `tests/fixtures/saves/a3-v1-heightmap.json` was encoded for A4 verification using the v1 encoder whose Git blob is identical to the approved A3 source. Its fixture wrapper stores elevation bytes as base64 for test transport, not a new app save/export format. The embedded v1 checksum and byte payload are fixed. Unit tests prove decode → explicit binding → encode with identical time/name produces identical metadata, checksum and bytes, including signed zero. Browser tests seed a disposable test profile, open the fixture through actual saved-map selection, navigate, edit/Undo, save unchanged bytes, then Redo/save changed bytes while keeping identity and metadata.

A future multi-surface format should have its own explicit version, World/surface identities, geometry/topology/representation provider versions, units, unique patch/chunk ownership, reference dimensions, independent sea levels, integrity checks and resource limits. Keep the v1 reader and catalog entries usable. Open legacy data as bounded planar first; any conversion should create a new verified record after explicit policy/acceptance and leave the v1 original available. Do not overwrite v1 records with an incompatible envelope or silently turn their IDs into World keys.

A5/A6/A7 must design and test any actual IndexedDB schema/version upgrade, interrupted transaction recovery, downgrade/error handling, backup/rollback and format resource budgets when persistence expands. A4 proposes this migration boundary without implementing or scheduling an untested migration. Histories are session operations; future historical canon is separate data and remains unimplemented.

## Checkpoints and outstanding decisions

| Pass | Scope and acceptance focus |
| --- | --- |
| A4 — current | Pure contracts/examples, identity isolation, documented spherical/hollow/projection strategy, unchanged planar editor and v1 saves |
| A5 — requires authorization | Seam-aware flat/periodic editing and continuously movable view seam; unique sample ownership, same-transform hit testing, exact multi-seam stroke history and deliberate storage policy |
| A6 — requires authorization | Spherical shared-node terrain, full edge/corner/polar continuity, physical brush distance, projection/pointer integration, benchmarks and versioned persistence |
| A7 — requires authorization | Initial hollow, cylindrical and other agreed geometries; independent surface workflow, normals/clearance/end policies and explicit supported configuration list |
| Subsequent passes | Complete Azgaar-style heightmap toolset and later interchange/generation/analysis/presentation in separately reviewed scopes |

Review may subdivide these passes. The former A7 external interchange label is superseded by the owner's new ordering; import/export remains future work with no new pass number assigned here.

Open decisions: physical scale for legacy flat worlds; exact cube face bases/canonical ownership tables; initial N/browser memory budget; curved Smooth weighting and corner interpolation; tangent-frame continuity for directional tools; chosen overview/local projections and their singular regions; allowed planar gluing configurations; migration/conversion policy; how active-surface Undo is presented; clearance tolerance and invalid-edit behavior; initial cylinder end/cap models; which custom topologies warrant research. None are silently resolved as Serrian Tide canon or exposed as functional UI.

The original Next.js/TypeScript application will retain responsibility for authentication, server-side permissions, World records and database storage. The development shell remains replaceable, with reusable client components separate from this pure surface layer. No main-site integration or deployment is authorized. Stop after A4 for independent review; A5 is not started.
