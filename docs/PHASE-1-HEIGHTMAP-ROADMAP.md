# Atlas master roadmap — Phase 1 and long-term requirements

Updated October 18, 2026 for A6-D2-R globe-limb assisted sculpting on A6-F1 baseline `44f3cea0e81809ad0a29328a9cad9d20eada1214`. This preserves the owner's complete geometry, cartography and eventual Atlas/Worlds requirements alongside the Phase 1 heightmap inventory. Future entries do not authorize implementation during D2-R.

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
| A6-B | Numerical spherical Raise/Lower, bounded cap candidates, continuous great-circle strokes and exact bounded history | Implemented; Ember source/numerical approval supplied by owner; no spherical UI/persistence |
| A5.1 stabilization, before A6-C | Predictable horizontal input, explained periodic copies and controlled screen-edge scrolling within one stroke/history entry | Ember source, visual and automated-evidence approval supplied by owner; owner hands-on acceptance remains outstanding |
| A5.2 presentation refinement, before A6-C | Focused wrapped editing cycle, connected side previews, selectable full-height context and Fit, movable view cut | Implemented; Ember source/test/visual-evidence approval supplied by owner; owner hands-on focused-layout acceptance remains separate |
| A6-C | Spherical Smooth/Flatten, connected inverse-geodesic-square weighting and canonical multi-face history | Implemented; Ember source/numerical-evidence approval supplied by owner |
| A6-D1 | Session-only orthographic globe, rotation/zoom/recenter, oriented six-face net and physical inspection | Implemented; Ember source/projection/screenshot/browser-evidence approval supplied by owner |
| A6-D2 | Blank sphere, four tools on globe/net, geodesic previews, shared history, input arbitration and incremental rendering | Owner supplied Ember's source/visual/numerical/browser approval; final hands-on acceptance separate |
| A6-E | Explicit v3 spherical Save/Open, exact validation/restoration, atomic local writes and failure recovery; v1/v2 compatibility | Ember source, persistence, visual and automated-evidence approval supplied by owner; see SPHERICAL-PERSISTENCE.md and E completion evidence |
| A6-F1 | One workspace, explicit supported-shape creation, shared mixed library/document controls and safe replacement | Implemented for review; see UNIFIED-WORKSPACE.md and F1 evidence |
| A6-D2-R | Safe automatic globe rotation/recentering during a held limb stroke, changing physical visibility and exact history | Implemented for independent review on the owner's explicit authorization; see A6-D2-R completion and evidence. Net assistance preserved |
| N=256 editing hardening — future | Weaker-device N=256 brush/display responsiveness | Remains required and separately authorized; D2-R retains all existing numerical/rendering budgets |
| A7 and later geometry checkpoints | Hollow, cylindrical and other agreed initial geometries | Planned; exact scope/order requires authorization |
| Later Phase 1 | Remaining inventory below | Planned; pass boundaries and acceptance criteria still require authorization |

The owner subsequently directed that completed work stay on this repository's `main`, avoiding additional development branches. This changes Git delivery only; it does not authorize deployment, work in the original Serrian Tide website, or implementation of the planned inventory.

## Agreed implementation order

The owner moved the surface foundation ahead of the complete Azgaar-style toolset: **A4 surface architecture → A5 seam-aware editing/continuous navigation → A6 spherical terrain/polar continuity → A7 hollow, cylindrical and other agreed initial geometries → subsequent heightmap capability passes**. A6 is now explicitly divided into independently reviewable checkpoints: A6-A numerical foundation first; the spherical editing experience follows separately. The older labels assigning advanced brushes to A4, whole-map operations to A5 or interchange to A7 are superseded. The complete geometry inventory below does not promise that every shape fits inside A7.

After A6-B approval, the owner inserted **A5.1 navigation/wrapping/screen-edge stabilization before A6-C**. That correction was completed and technically reviewed before the separately authorized A5.2 refinement.

The owner supplied Ember's A5.2, A6-C, D1, D2 and E technical approvals and separately authorized A6-F1 unified workspace/shape selection, then A6-D2-R globe-limb assistance. Owner hands-on acceptance remains separate. Stop after D2-R for review; the N=256 weaker-device editing performance checkpoint still requires separate authorization.

The owner's corrected downstream master-roadmap order is mandatory:

| Step | Required order |
| --- | --- |
| 9 | Introduce Atlas into the separately rebuilt Worlds system, then develop the integrated functionality that makes Atlas and Worlds work together. |
| 10 | Complete acceptance and integration of the rebuilt Worlds + Atlas system into the existing Serrian Tide application. |
| 11 | Reusable historical/modern Earth foundation, the final Earth content milestone. |

This records integration order only. A6-E performs none of these integrations or content milestones.

See [World/surface architecture](WORLD-SURFACE-ARCHITECTURE.md), [numerical foundation](A6-A-COMPLETION.md), [editing](SPHERICAL-EDITING.md) and [E preservation](SPHERICAL-PERSISTENCE.md). A6-F1 hosts A5.2 planar/wrapped and D2/E spherical editing/preservation in one Atlas workspace with one active document and a shared mixed library. The six charts represent a round sphere, not a physical cube. Bounded/periodic saves keep exact v1/v2 interpretations without conversion or migration; spheres use their own v3 format.

## Complete future geometry and editing requirements

| Owner requirement | Current status and required future work |
| --- | --- |
| Spherical worlds | A6-A/B/C authority/tools/history, D2 globe/net editing and E v3 browser-local preservation exist. Held-stroke globe limb rotation and N=256 editing hardening remain future |
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
| Seam-crossing brushes and correct corner connectivity | A5 proves periodic tools; A6-A/B/C supply spherical topology and four physical tools/history. D2 connects accurate projected previews and editing, with safe net-cut termination |
| Continuous surface panning, globe rotation and movable map seams | Periodic recentering works. Every future shape must let creators center the working area via view state, without relocating/resampling stored geography |
| Surface-aware editing without projection-induced terrain distortion | Inverse projection, intrinsic brush distances and projected previews must agree. A distorted overview must never redefine physical influence or authoritative positions |
| Shape selection before world generation | A6-F1 selects bounded flat, horizontally wrapped flat or spherical worlds before terrain creation; explicit sphere radius and N=128/256. Future shapes and eligible surface(s) require approved providers before generation. Do not offer inert choices; generated terrain stays editable and representation is distinct from physical shape |

These future geometries are mandatory roadmap requirements, not functionality claimed by current descriptors. Initial supported configurations and acceptance checkpoints still need explicit approval.

## Eventual Atlas and Worlds requirements

| Owner requirement | Preservation and future boundary |
| --- | --- |
| Complete Azgaar-style heightmap authoring | Preserve the full tool, whole-map operation, template, analysis and interchange inventory below, adapted to authoritative meter elevations and each surface's topology |
| Living historical terrain and alternate timelines | Future explicit historical states/changes, branch identities and compatibility rules. Session Undo is not living history; no timeline implementation is included now |
| Worlds categories | Future categories supply civilizations, races, populations and historical information under explicit owner canon and host permissions. No synthetic demographics or simulation is inferred |
| Automatic editable professional illustrated 2D cartography | Must eventually work across every supported world shape and valid map scale, including globe and appropriate flat/cartographic views. Derive editable illustration placement from authoritative terrain and appropriate Worlds data; changing style never changes numerical geography. See the explicit cross-shape/scale requirement below |
| Military-style topographic rendering | Future elevation/contour/symbol/scale presentation from the same terrain, alongside illustrated styles; no separate conflicting geographical authority |
| Interconnected map scales | Link world, region, city, building and dungeon maps with explicit spatial/identity relationships; do not assume each uses the same resolution, geometry or editor |
| Existing Serrian Tide website integration | Atlas and rebuilt Worlds ultimately replace the current implementation inside the existing Next.js/TypeScript website. That host supplies authentication, server-side permissions, database and actual World records |

These long-term requirements remain planned. A6-E adds no generation, art/stamps, demographic system, timeline, nested-map runtime or original-site integration.

## Illustrated cartography across every supported shape and scale

The owner's requirement is automatic, professionally illustrated **editable 2D cartography on every supported world shape and valid map scale**. Future generated illustrated geography must appear on a globe as well as appropriate flat/cartographic projections. Cylinders need their actual lateral/end-cap arrangements; hollow worlds need independently selected interior/exterior surfaces; physical cubes, pyramids and other polyhedra need correct connected-face geometry. Other supported shapes require their own valid view providers. Rectangular side previews are not a universal interface.

This includes regional, city, building/interior and dungeon maps wherever their type and geometry permit. Do not force a spherical world projection onto a floor plan or invent unsupported connections. Illustration placement must derive from authoritative terrain plus appropriate Worlds data and stable physical/location anchors. It remains editable across projection/style changes; visual style must never silently rewrite elevation, topology, scale or other numerical geography. This is future scope only: D2 adds no illustrated generator or other shape/scale editor.

## Terrain measurement and Worlds linkage — GitHub Issue #1

[Issue #1: terrain elevation, geographic feature measurement, 3D and Worlds linkage](https://github.com/Revty79/serrian-tide-world/issues/1) is an explicit future requirement, not implemented by A6-E. Schedule its numerical measurement and feature-analysis capabilities during advanced heightmap/3D preparation **before automatic illustrated 2D map generation**, and make them available to the separately rebuilt Worlds integration in **Step 9**. Scope the exact checkpoint after geometry and higher-resolution dependencies are clear.

| Requirement | Planned behavior |
| --- | --- |
| Real elevations and physical dimensions | Query/set numerical meter elevations at physical positions, sea-level/datum conventions per shape, extrema and future unit-display conversion. Retain current readouts, Raise/Lower and explicit-target Flatten; a graphic label never substitutes for a stored height. |
| Mountains and other landforms | Detect or manually delineate summits, ranges, ridges, saddles/passes, valleys, basins, hills and cliffs. Keep summit elevation, rise above explicitly selected surrounding terrain, and topographic prominence with its key saddle distinct; do not invent an objective mountain base. |
| Measurements | Elevation differences, surface distances, selected-route distances, areas, slope/gradient, aspect, profiles/cross-sections, ascent/descent and relief. Use physical surface metrics across seams/edges/corners, with explicit interior/exterior conventions and no assumed Earth scale. |
| Consistent 3D and cartography | Mesh height, physical shape/radius, normals, slope and steepness must use the same authoritative elevation data as measurements and 2D annotations. Derived features can inform stamps, contours, relief, scale bars and topographic/military symbols without a separate visual height field or seam cracks. |
| Worlds — Step 9 | Stable feature/location IDs and geometric anchors link named terrain to actual World records, descriptions, regions, owner/canon/campaign permissions, history and alternate timelines. Map and written information must be mutually navigable. Recalculate or revision-key derived measurements when terrain/history changes. |
| Accuracy and device budgets | Expose sampling resolution, physical scale and uncertainty; avoid unjustified precision and claims about sub-resolution landforms. Cache or incrementally compute derived data with explicit edit invalidation, preserving weaker-device and GPU-free hosting options. |

Future acceptance must cover numerical target-height editing with Undo/Save and matching 3D terrain, defensible prominence/relief values, surface-aware seams/poles/orientation, consistent profiles/slopes/overlays, refreshed derived measurements and World-record navigation. Volume/earthwork calculations require separate scope. This is documentation only; no measurement/feature-analysis tools, 3D runtime or Worlds links are added now.

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
- Connected-context presentation belongs to a future surface-specific view provider. A5.2's rectangular side strips apply only to the current periodic plane. Spheres need rotatable/local or cutout projections; physical cubes and pyramids need connected-face arrangements; cylinders may combine lateral panels with separately connected circular end caps. Do not impose rectangular side previews on those surfaces.
- Preserve future living-history goals by leaving room for explicit historical states and changes. A2 creates no timeline, revision-storage system, or historical canon.
- Atlas and rebuilt Worlds will ultimately replace the current implementation inside the existing Serrian Tide Next.js/TypeScript website. That host will own authentication, authoritative permissions, database access, and actual World-record associations. No guessed World schema or duplicate auth service belongs in this engine.
- Future map-style goals should consume the same numerical geography through distinct presentation layers. Contours, hachures, illustrated cartography, other map styles, and 3D preview must not redefine or silently rewrite the terrain.
- Azgaar is a capability reference, not an application or civilization/population model to copy. Serrian Tide's meter units, sea level, permissions, canon, and World identity remain its own.

The inventory was checked against the project's primary [Heightmap customization documentation](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Heightmap-customization) and [template-editor documentation](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Heightmap-template-editor). Their application semantics and data models are not adopted automatically. This roadmap records the owner's requested scope; exact future behavior still requires a bounded pass.

The owner supplied Ember's D2/E approvals and separately authorized F1 and then D2-R on main. Independent review and owner hands-on acceptance of the latest work remain separate. N=256 editing performance hardening remains required and unimplemented. **Stop after A6-D2-R; do not begin the next pass without authorization.** Later work, integration and deployment require their own authorization. No future inventory item or GitHub issue is authorized merely by appearing here.

## A6-F1 unified workspace and future conversion

[Issue #2](https://github.com/Revty79/serrian-tide-world/issues/2) is the permanent one-workspace/shape-selection contract. F1 supplies one New World / Map workflow, one active document, shared Save/Open/name/history/tools/status, and contextual planar/wrapped/globe/net view providers. Numerical engines and v1/v2/v3 formats remain unchanged. No unavailable geometry is offered as functional.

A separate future conversion phase must let a creator explicitly preview, configure, cancel, and accept a non-destructive projection onto a compatible physical shape. Preserve the source and create a new identity with traceable origin. Account for topology, dimensions/physical units, resolution, distortion, area/distance/elevation tradeoffs, face connectivity, cuts, seams, poles, caps, eligible surfaces and incompatible regions. Arbitrary texture wrapping cannot implement accurate general conversion. Switching a view or choosing New never converts existing terrain.

A6-D2-R now adds automatic globe rotation/recentering during a held stroke near the visible limb, immutable per-segment viewing planes and continuous great-circle dab spacing within one history operation. Weaker-device N=256 editing hardening remains outstanding. The full geometry, cartography, map-scale, measurement, 3D, histories and Worlds inventory above remains mandatory, including Issue #1 and integration Steps 9, 10 and 11. Stop after D2-R; do not begin another pass without authorization.
