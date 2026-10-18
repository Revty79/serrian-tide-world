# Atlas master roadmap — Phase 1 and long-term requirements

Updated October 17, 2026 for A6-B. This preserves the owner's complete geometry and eventual Atlas/Worlds requirements alongside the Phase 1 heightmap tool inventory. Future entries are requirements to plan and review, not authorization to implement them during A6-B.

## Current baseline

| Pass | Capability | Status |
| --- | --- | --- |
| A0 | Modular TypeScript terrain, versioned metadata, 512 × 512 Float32 grid, blank −100 m ocean, sea level 0, numerical color rendering | Implemented; source reviewed |
| A1 | Raise/Lower, map-unit radius, meters-per-dab strength, smooth falloff, distance-spaced strokes, pointer lifecycle, frame scheduling | Implemented; Ember's source review approved, per owner |
| A2 | Smooth, explicit-target Flatten, percentage intensity, elevation inspection, matching color legend, confirmed reset, aspect-preserving fitted display | Implemented; Ember's source and visual review approved, per owner |
| A3 | Zoom/Pan, bounded Undo/Redo, browser-local Save/Open, New Blank Map, full-screen workspace and overlay left tools | Implemented; Ember's source and visual review approved, per owner |
| A4 | World/surface identities, shape/topology/metric/projection contracts, bounded/periodic math examples, spherical/hollow strategy, preserved v1 editor and saves | Implemented; Ember source/architecture approval supplied by owner |
| A5 | Seam-aware brushes, continuous recentering, repeated full-screen Fill, bounded Fill/Fit, optional fullscreen, interpolated display and v2 local saves | Implemented; Ember source/visual approval supplied by owner |
| A6-A | Numerical equiangular cube-sphere, unique vertices, all face/edge/corner connectivity, geodesic metric and memory evidence | Implemented; independent source/numerical/architecture approval supplied by owner |
| A6-B | Numerical spherical Raise/Lower, bounded cap candidates, continuous great-circle strokes and exact bounded history | Implemented; independent review/acceptance pending; no spherical UI/persistence |
| Next spherical tool checkpoint | Smooth/Flatten with reviewed curved-surface neighbor weighting/interpolation and canonical multi-face history | Planned; separate authorization required |
| Subsequent spherical view checkpoint | Interactive spherical editing views, inverse projection, projected footprints, globe rotation/local views and movable cuts | Planned; separate authorization required |
| Subsequent spherical preservation checkpoint | Explicitly versioned spherical Save/Open, validation, resource budgets, compatibility and recovery | Planned; no spherical browser save format authorized yet |
| A7 and later geometry checkpoints | Hollow, cylindrical and other agreed initial geometries | Planned; exact scope/order requires authorization |
| Later Phase 1 | Remaining inventory below | Planned; pass boundaries and acceptance criteria still require authorization |

The owner subsequently directed that completed work stay on this repository's `main`, avoiding additional development branches. This changes Git delivery only; it does not authorize deployment, work in the original Serrian Tide website, or implementation of the planned inventory.

## Agreed implementation order

The owner moved the surface foundation ahead of the complete Azgaar-style toolset: **A4 surface architecture → A5 seam-aware editing/continuous navigation → A6 spherical terrain/polar continuity → A7 hollow, cylindrical and other agreed initial geometries → subsequent heightmap capability passes**. A6 is now explicitly divided into independently reviewable checkpoints: A6-A numerical foundation first; the spherical editing experience follows separately. The older labels assigning advanced brushes to A4, whole-map operations to A5 or interchange to A7 are superseded. The complete geometry inventory below does not promise that every shape fits inside A7.

See [World/surface architecture](WORLD-SURFACE-ARCHITECTURE.md) for capability status and outstanding decisions, and [A6-A completion](A6-A-COMPLETION.md) for numerical evidence. A5's periodic editor remains the latest UI. A6-A's six numerical charts represent a round sphere, not a physical cube. No unsupported shape choices are exposed. Bounded/periodic saves retain their exact v1/v2 interpretations without conversion, migration or a new spherical browser format.

## Complete future geometry and editing requirements

| Owner requirement | Current status and required future work |
| --- | --- |
| Spherical worlds | A6-A connected numerical provider and A6-B physical Raise/Lower/history exist. Later checkpoints deliver reviewed Smooth/Flatten, interactive views/rotation and separately approved storage |
| Cylindrical worlds | Descriptor and reusable flat lateral metric only. Physical circumference/length, bounded/connected/capped ends, normals and editing workflow remain future |
| Hollow spheres | Catalog contracts only. Interior and exterior must be independently editable and independently selectable, with distinct terrain/history and appropriate inward/outward elevation normals |
| True cube-shaped worlds | Future physical polyhedron with flat faces and real geometric edges/corners. Distinct from the cube-sphere numerical grid used for round worlds |
| Pyramid-shaped worlds | Future physical geometry; define base/apex/face arrangement, dimensions, shared samples, metrics and corner traversal before implementation |
| Tetrahedra and other polyhedral worlds | Future connected triangular/polygonal face providers, ownership, actual surface distances and singular-vertex rules |
| Torus and ring worlds | Future explicit geometry, units/parameters, supported habitable sides and physical metric. A flat doubly periodic quotient is not a physical torus. Exact ring configuration remains to be specified |
| Flat square and rectangular worlds | Current bounded editor and horizontally periodic rectangular representation; preserve aspect, units and real boundaries |
| Flat circular and triangular worlds | Outline descriptors only; valid-domain masks/meshes, clipping, boundary/neighbor handling and editing remain future |
| Custom connected or multi-face geometry | Versioned providers with explicit reciprocal seams, metrics, ownership and validated corners; no silent fallback to rectangle/sphere |
| Independent interiors/exteriors where geometry supports them | Surface identity/lifetime/terrain/history must be independent of parent World and view; support only explicitly defined valid configurations |
| Seam-crossing brushes and correct corner connectivity | A5 proves periodic tools; A6-A supplies spherical topology and A6-B proves physical Raise/Lower footprints/paths/history. Curved Smooth weighting and projected previews remain future |
| Continuous surface panning, globe rotation and movable map seams | Periodic recentering works. Every future shape must let creators center the working area via view state, without relocating/resampling stored geography |
| Surface-aware editing without projection-induced terrain distortion | Inverse projection, intrinsic brush distances and projected previews must agree. A distorted overview must never redefine physical influence or authoritative positions |
| Shape selection before world generation | Future creation workflow chooses supported physical shape, dimensions and eligible surface(s) before generation. Do not offer inert choices; generated terrain stays editable and representation is distinct from physical shape |

These future geometries are mandatory roadmap requirements, not functionality claimed by current descriptors. Initial supported configurations and acceptance checkpoints still need explicit approval.

## Eventual Atlas and Worlds requirements

| Owner requirement | Preservation and future boundary |
| --- | --- |
| Complete Azgaar-style heightmap authoring | Preserve the full tool, whole-map operation, template, analysis and interchange inventory below, adapted to authoritative meter elevations and each surface's topology |
| Living historical terrain and alternate timelines | Future explicit historical states/changes, branch identities and compatibility rules. Session Undo is not living history; no timeline implementation is included now |
| Worlds categories | Future categories supply civilizations, races, populations and historical information under explicit owner canon and host permissions. No synthetic demographics or simulation is inferred |
| Automatic editable illustrated 2D maps | Generate editable cartography from numerical heightmaps, including appropriate terrain stamps. Illustrated layers remain distinct from numerical geography and reusable across views/revisions |
| Military-style topographic rendering | Future elevation/contour/symbol/scale presentation from the same terrain, alongside illustrated styles; no separate conflicting geographical authority |
| Interconnected map scales | Link world, region, city, building and dungeon maps with explicit spatial/identity relationships; do not assume each uses the same resolution, geometry or editor |
| Existing Serrian Tide website integration | Atlas and rebuilt Worlds ultimately replace the current implementation inside the existing Next.js/TypeScript website. That host supplies authentication, server-side permissions, database and actual World records |

These long-term requirements remain planned. A6-A adds no generation, art/stamps, demographic system, timeline, nested-map runtime or original-site integration.

## Brush inventory

| Tool/control | Current status | Remaining definition or work |
| --- | --- | --- |
| Raise | Implemented in A1 | Preserve additive meter-based elevation behavior |
| Elevate | Planned | Define distinct gradual-elevation behavior and its deterministic numerical units; not silently considered equivalent to Raise |
| Lower | Implemented in A1 | Preserve additive negative elevation behavior |
| Depress | Planned | Define its distinction from Lower before implementation |
| Align | Planned | Define sampled-height alignment; A2's explicit-target Flatten does not implement the separately named Align tool |
| Smooth | Implemented in A2 | Local neighborhood blending with per-dab source snapshots and percentage intensity |
| Flatten | Implemented in A2 | Explicit positive, zero, or negative meter target; gradual blending and edge falloff |
| Disrupt | Planned | Define randomness, strength units, reproducibility, and bounds |
| Fill | Planned | Define selected-region behavior against the numerical heightmap |
| Line | Planned | Define endpoint-based terrain shaping and its meter-based parameters |
| Brush power | Partly implemented | Raise/Lower use m/dab; Smooth/Flatten use percent/dab. Future tools need accurate tool-specific units |
| Brush radius | Implemented | Logical map units, shown as a percentage of the shorter map side; viewport/DPR independent |
| Brush randomness | Planned | Define reproducibility and interaction with continuous strokes |
| Land/water targeting | Planned | Explicit all/land/water policies relative to sea level; no targeting filter exists in A2 |

## Whole-map operations

| Capability | Status |
| --- | --- |
| Rescale or shift the complete elevation range | Planned |
| Conditional adjustments over selected elevation intervals | Planned |
| Whole-map smoothing | Planned; the A2 Smooth brush is local only |
| Whole-map disruption | Planned |
| Clearing | Partly implemented: A2 explicitly confirms reset to −100 m while retaining identity/metadata. Other clearing policies remain planned |

## Template generation

All template-generation capabilities are planned and unimplemented: hills, pits, ranges, troughs, straits, masks, inversion, addition, multiplication, and smoothing. Template authoring, parameter validation, operation order, reproducible generation, and meter-based height mappings need their own design and verification pass. No template runner, procedural generator, or speculative saved-template schema is included in A2.

## Images, interchange, and presentation

| Capability | Status |
| --- | --- |
| Image conversion with adjustable height/color mappings | Planned |
| Heightmap preview and review aids | Partly implemented: the live numerical 2D editor and elevation legend exist; dedicated preview/export workflows are planned |
| Heightmap import/export | Planned for a subsequent pass; browser-local v1/v2 saves do not provide external interchange |
| Contours | Planned as a separate presentation layer |
| Hachures | Planned as a separate presentation layer |
| Basic 3D terrain preview | Planned; no 3D implementation in A2 |

## Terrain analysis and simulation

Drainage analysis, depression handling, and water erosion are planned. Their algorithms, constraints, numerical stability, and whether each operation only analyzes or explicitly changes terrain require separate decisions. A2 does not silently fill depressions, generate water systems, or simulate erosion.

## Navigation, preservation, and recovery

A3 implements pointer-centered zoom, bounded panning, Space/explicit Pan and two-finger navigation; stroke/reset Undo/Redo; explicit IndexedDB Save/Open; unsaved-change guards; and New Blank Map. A4 supplies pure surface contracts. A5 adds actual continuous periodic recentering, New Wrapped Map and v2 saves, default Fill, separate Fit Entire Map, native fullscreen and smoother elevation presentation. The full-screen stage and overlay tools remain the preferred interface architecture. Camera, history, document state, surface providers and storage remain separate from numerical authority. Saves are browser/profile/origin/device local and not synchronized. Autosave, crash/session recovery, external interchange and server persistence remain future scope. See [A5 completion](A5-COMPLETION.md).

## Architectural considerations for future passes

- Numerical elevation remains authoritative. Keep the Float32 engine, tool operations, application controls, display styles, and eventual storage formats separate. Future import/export must declare version, encoding, units, validation, and resolution explicitly.
- Retain planar editing and aspect-preserving display without assuming every World is an Earth-like sphere. Future geometry and coordinate systems require their own design; do not silently reinterpret existing map units.
- Recenter the working area on every eventually supported geometry without moving numerical geography: spherical rotation, movable cuts/local views and independent hollow surface selection belong to future view adapters. A5 proves only the periodic surface. Display interpolation adds no authoritative detail; higher-resolution/tiled terrain requires a separate numerical/storage design.
- Preserve future living-history goals by leaving room for explicit historical states and changes. A2 creates no timeline, revision-storage system, or historical canon.
- Atlas and rebuilt Worlds will ultimately replace the current implementation inside the existing Serrian Tide Next.js/TypeScript website. That host will own authentication, authoritative permissions, database access, and actual World-record associations. No guessed World schema or duplicate auth service belongs in this engine.
- Future map-style goals should consume the same numerical geography through distinct presentation layers. Contours, hachures, illustrated cartography, other map styles, and 3D preview must not redefine or silently rewrite the terrain.
- Azgaar is a capability reference, not an application or civilization/population model to copy. Serrian Tide's meter units, sea level, permissions, canon, and World identity remain its own.

The inventory was checked against the project's primary [Heightmap customization documentation](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Heightmap-customization) and [template-editor documentation](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Heightmap-template-editor). Their application semantics and data models are not adopted automatically. This roadmap records the owner's requested scope; exact future behavior still requires a bounded pass.

The owner supplied Ember's A6-A approval and separately authorized A6-B. The three spherical checkpoint categories above are the proposed remaining sequence; their exact letter labels/briefs still require authorization. Stop after A6-B; do not begin A6-C. Later work, integration and deployment require their own authorization. No future inventory item is authorized merely by appearing here.
