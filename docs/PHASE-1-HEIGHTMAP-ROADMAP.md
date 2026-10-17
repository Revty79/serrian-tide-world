# Phase 1 heightmap authoring roadmap

Updated October 17, 2026. This records the owner's expanded Phase 1 direction: a complete range of Azgaar-style heightmap authoring capabilities adapted to Serrian Tide's numerical elevation model. It is an inventory and planning document, not authorization to implement future passes.

## Current baseline

| Pass | Capability | Status |
| --- | --- | --- |
| A0 | Modular TypeScript terrain, versioned metadata, 512 × 512 Float32 grid, blank −100 m ocean, sea level 0, numerical color rendering | Implemented; source reviewed |
| A1 | Raise/Lower, map-unit radius, meters-per-dab strength, smooth falloff, distance-spaced strokes, pointer lifecycle, frame scheduling | Implemented; Ember's source review approved, per owner |
| A2 | Smooth, explicit-target Flatten, percentage intensity, elevation inspection, matching color legend, confirmed reset, aspect-preserving fitted display | Implemented; Ember's independent review pending |
| A3 | Navigation, Undo/Redo, Save/Load and recovery work to be defined in its own pass | Planned; not authorized by A2 |
| Later Phase 1 | Remaining inventory below | Planned; pass boundaries and acceptance criteria still require authorization |

The owner subsequently directed that completed work stay on this repository's `main`, avoiding additional development branches. This changes Git delivery only; it does not authorize deployment, work in the original Serrian Tide website, or implementation of the planned inventory.

## Brush inventory

| Tool/control | Status after A2 | Remaining definition or work |
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
| Heightmap import/export | Planned; the in-memory v1 contract is not an already-defined file encoding |
| Contours | Planned as a separate presentation layer |
| Hachures | Planned as a separate presentation layer |
| Basic 3D terrain preview | Planned; no 3D implementation in A2 |

## Terrain analysis and simulation

Drainage analysis, depression handling, and water erosion are planned. Their algorithms, constraints, numerical stability, and whether each operation only analyzes or explicitly changes terrain require separate decisions. A2 does not silently fill depressions, generate water systems, or simulate erosion.

## Navigation, preservation, and recovery

Zoom/Pan, Undo/Redo, saving/loading, recoverable sessions, and recovery workflows remain planned for separately authorized work. A2 adds none of them. The local example still resets on page reload. Confirmed Reset Terrain is the only whole-map command currently exposed, and cancellation is not Undo.

## Architectural considerations for future passes

- Numerical elevation remains authoritative. Keep the Float32 engine, tool operations, application controls, display styles, and eventual storage formats separate. Future import/export must declare version, encoding, units, validation, and resolution explicitly.
- Retain planar editing and aspect-preserving display without assuming every World is an Earth-like sphere. Future geometry and coordinate systems require their own design; do not silently reinterpret existing map units.
- Preserve future living-history goals by leaving room for explicit historical states and changes. A2 creates no timeline, revision-storage system, or historical canon.
- Atlas and rebuilt Worlds will ultimately replace the current implementation inside the existing Serrian Tide Next.js/TypeScript website. That host will own authentication, authoritative permissions, database access, and actual World-record associations. No guessed World schema or duplicate auth service belongs in this engine.
- Future map-style goals should consume the same numerical geography through distinct presentation layers. Contours, hachures, illustrated cartography, other map styles, and 3D preview must not redefine or silently rewrite the terrain.
- Azgaar is a capability reference, not an application or civilization/population model to copy. Serrian Tide's meter units, sea level, permissions, canon, and World identity remain its own.

The inventory was checked against the project's primary [Heightmap customization documentation](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Heightmap-customization) and [template-editor documentation](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Heightmap-template-editor). Their application semantics and data models are not adopted automatically. This roadmap records the owner's requested scope; exact future behavior still requires a bounded pass.

Stop after A2 for Ember's review. Owner hands-on testing begins only after Ember approves A2 technical readiness. No future inventory item is authorized merely by appearing here.
