# Phase 1 heightmap authoring roadmap

Updated October 17, 2026. This records the owner's expanded Phase 1 direction: a complete range of Azgaar-style heightmap authoring capabilities adapted to Serrian Tide's numerical elevation model. It is an inventory and planning document, not authorization to implement future passes.

## Current baseline

| Pass | Capability | Status |
| --- | --- | --- |
| A0 | Modular TypeScript terrain, versioned metadata, 512 × 512 Float32 grid, blank −100 m ocean, sea level 0, numerical color rendering | Implemented; source reviewed |
| A1 | Raise/Lower, map-unit radius, meters-per-dab strength, smooth falloff, distance-spaced strokes, pointer lifecycle, frame scheduling | Implemented; Ember's source review approved, per owner |
| A2 | Smooth, explicit-target Flatten, percentage intensity, elevation inspection, matching color legend, confirmed reset, aspect-preserving fitted display | Implemented; Ember's source and visual review approved, per owner |
| A3 | Zoom/Pan, bounded Undo/Redo, browser-local Save/Open, New Blank Map, full-screen workspace and overlay left tools | Implemented; Ember's source and visual review approved, per owner |
| A4 | World/surface identities, shape/topology/metric/projection contracts, bounded/periodic math examples, spherical/hollow strategy, preserved v1 editor and saves | Implemented; independent review and owner acceptance pending |
| A5 | Seam-aware editing and continuous navigation with a movable visible seam | Planned; not authorized by A4 |
| A6 | Spherical terrain and polar/face/corner continuity | Planned; not authorized by A4 |
| A7 | Hollow, cylindrical and other initial world geometries | Planned; not authorized by A4 |
| Later Phase 1 | Remaining inventory below | Planned; pass boundaries and acceptance criteria still require authorization |

The owner subsequently directed that completed work stay on this repository's `main`, avoiding additional development branches. This changes Git delivery only; it does not authorize deployment, work in the original Serrian Tide website, or implementation of the planned inventory.

## Agreed implementation order

The owner moved the surface foundation ahead of the complete Azgaar-style toolset: **A4 surface architecture → A5 seam-aware editing/continuous navigation → A6 spherical terrain/polar continuity → A7 hollow, cylindrical and other initial geometries → subsequent heightmap capability passes**. Review may subdivide these boundaries. The older labels assigning advanced brushes to A4, whole-map operations to A5 or interchange to A7 are superseded; those capabilities remain planned, without a newly assigned pass number.

See [World/surface architecture](WORLD-SURFACE-ARCHITECTURE.md) for capability status and outstanding decisions. A4's mathematical periodic examples are not an interactive wrapping editor. Circle/triangle, spherical, cylindrical, hollow and custom descriptors do not expose unsupported UI options. Current planar saves retain their exact v1 interpretation; no automatic data migration occurs.

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
| Heightmap import/export | Planned for a subsequent pass; the existing browser-local v1 save format does not provide external interchange |
| Contours | Planned as a separate presentation layer |
| Hachures | Planned as a separate presentation layer |
| Basic 3D terrain preview | Planned; no 3D implementation in A2 |

## Terrain analysis and simulation

Drainage analysis, depression handling, and water erosion are planned. Their algorithms, constraints, numerical stability, and whether each operation only analyzes or explicitly changes terrain require separate decisions. A2 does not silently fill depressions, generate water systems, or simulate erosion.

## Navigation, preservation, and recovery

A3 implements pointer-centered zoom, bounded panning, Space/explicit Pan and two-finger navigation; stroke/reset Undo/Redo; explicit IndexedDB Save/Open; unsaved-change guards; and New Blank Map. Its full-screen map workspace and collapsible overlay tools are the preferred long-term interface architecture. A4 preserves these features and the v1 format unchanged. Camera, history, document state, surface providers and storage adapters remain separate from numerical terrain. Saves are browser/profile/origin/device local and not synchronized. Autosave, crash/session recovery, external interchange and server persistence remain future scope. See [A3 completion](A3-COMPLETION.md) and [A4 completion](A4-COMPLETION.md).

## Architectural considerations for future passes

- Numerical elevation remains authoritative. Keep the Float32 engine, tool operations, application controls, display styles, and eventual storage formats separate. Future import/export must declare version, encoding, units, validation, and resolution explicitly.
- Retain planar editing and aspect-preserving display without assuming every World is an Earth-like sphere. Future geometry and coordinate systems require their own design; do not silently reinterpret existing map units.
- Preserve future living-history goals by leaving room for explicit historical states and changes. A2 creates no timeline, revision-storage system, or historical canon.
- Atlas and rebuilt Worlds will ultimately replace the current implementation inside the existing Serrian Tide Next.js/TypeScript website. That host will own authentication, authoritative permissions, database access, and actual World-record associations. No guessed World schema or duplicate auth service belongs in this engine.
- Future map-style goals should consume the same numerical geography through distinct presentation layers. Contours, hachures, illustrated cartography, other map styles, and 3D preview must not redefine or silently rewrite the terrain.
- Azgaar is a capability reference, not an application or civilization/population model to copy. Serrian Tide's meter units, sea level, permissions, canon, and World identity remain its own.

The inventory was checked against the project's primary [Heightmap customization documentation](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Heightmap-customization) and [template-editor documentation](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Heightmap-template-editor). Their application semantics and data models are not adopted automatically. This roadmap records the owner's requested scope; exact future behavior still requires a bounded pass.

The owner confirmed Ember's A3 source/visual approval and authorized A4 surface architecture. Stop after A4 for review; A5 and later work, integration and deployment require their own authorization. No future inventory item is authorized merely by appearing here.
