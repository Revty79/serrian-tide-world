# Cube-I correction: physical excavation checkpoints

The owner's Hole/Tunnel/Map Link correction and adjustable-hole supplement remain
authoritative. **The later scope correction defers terrain-aware endpoints to the
future shared physical 3D architecture. They no longer block Cube-I Phase 2.**
Keep reference-shell functions and explicit zero-height safeguards. Cube-family
acceptance still requires Ember's review and the owner's approval of actual use.

The latest owner priority correction cancels dedicated extreme fast-brush
optimization. Ordinary painting is owner-accepted and remains protected by
regression tests; extreme-speed measurements are optional diagnostics. The subsequent
scope correction pauses major terrain-aware rendering/editor/collision/persistence
integration. Preserve the [isolated material research](CUBE-I-TERRAIN-MATERIAL.md)
and verify current Phase 2 functionality. The following material dependencies are
required future work, not authorization to continue their implementation now.

## Checkpoint 1: separate authorship and reviewable placement

Implemented for the existing reference-shell domain:

- **Cut Hole:** one location determines physically corresponding exterior/interior
  mouths. A `ThroughHole` has its own World/object/mouth identities, circular
  dimensions and geometry version. It has no network, nodes, segments or junctions.
  Holes have separate selection, width, move and remove controls and counts.
- Circular width is adjustable before placement. The accepted face-circle preview
  uses that exact radius; numerical width and on-map Smaller/Larger controls share
  it. Existing holes resize in place, preserving object and mouth identities.
  Their CSG capsule uses the same radius as the preview and margin-clearance query.
  Guided inspection uses the selected physical radius after resizing, not the
  current creation-tool width.
  No wall-thickness fraction caps a hole's width: both mouths must fit their actual
  faces, with supported World-relative precision and bounded cutting resources.
- **Create Tunnel:** pick entrance, pick exit (either surface/face), validate and
  inspect a proposed physical cut, then explicitly create it. Proposal validation
  uses the host's existing leases and support checks without publishing terrain,
  connection words or history. Cancellation publishes no excavation. The route
  reuses Cube-B's certified face routing on a middle shell, with perpendicular
  entrance necks; it is an initial template, not the future visual designer.
- **Map Links:** reciprocal World/map/location anchors retain their identities,
  abstract semantics and separate advanced controls. They may support interiors,
  underground map layers, other worlds, solar systems and games. They excavate
  nothing and cannot substitute for traversing a continuous physical tunnel.
- v7 adds holes and the bounded exact metadata journal. Holes, tunnel geometry and
  map links use the established shared word history (64 entries / 4 MiB). Both
  Undo and Redo stacks survive Save/Open. Loading validates word chains, resource
  bounds and all historical connection geometries before promotion; replay still
  rechecks today's terrain support. Terrain gesture histories remain session-only.
  v1-v6 retain their original interpretation. Opening v6 does not rewrite it;
  explicit Save upgrades v6 to v7 atomically after immutable metadata checks.
  Old v6 capsule shafts retain their original network identities and are not
  silently reclassified as holes or assigned guessed authoring intent.

The accepted brush executor, terrain authority, numerical tools, worker protocol
and renderers remain in use. Holes only adapt to the same CSG primitives. The
v7 journal API extends the existing history class; it introduces no replacement
execution or replay engine.

## Why reference-shell safeguards remain necessary

The current material is an outer reference cube minus its inner reference cavity
and authored ball/capsule cuts. Terrain is stored independently on each canonical
surface and displayed as color/relief on those planes. The CPU ray tracer, WebGL
shader and Canvas cache agree on that reference solid. A portal's node is required
to equal its reference-surface anchor. Protection validation requires exactly
zero height over the conservative interpolation/lowering support of each cut.

Lifting that validation, adding a height to the portal, or drawing a dark disc
would leave material, visible terrain, clearance and saved geography inconsistent.
Flattening the creator's mountain or seabed is also not a solution.

At an ordinary face location, the expected signed surface levels are:

- exterior level: outer half-side + exterior height;
- interior level: inner half-side - interior height;
- direct normal-path length: wall thickness + both signed heights.

These are endpoint relationships, not a certificate for an entire aperture.
Heights vary across its rim and a route can encounter other terrain. A tunnel must
intersect those actual surfaces at independently selected endpoints. A direct hole
must derive the opposite intersection along its direct axis, rather than choose
an arbitrary exit or assume the reference-shell endpoint is still the surface.

The accepted `elevatedPosition` applies a face-normal offset. At nonzero shared
edges/corners adjacent faces have different normals; that function alone does not
define a watertight displaced solid. A new reconstruction must explicitly resolve
these joins. Do not silently change accepted surface coordinates, normals, brush
distances, canonical samples or stored heights to hide this missing contract.

## Future bounded checkpoints, separately authorized

1. **Terrain material and aperture contract.** Specify a versioned, watertight
   reconstruction from both canonical height banks, including bilinear/triangle
   interpolation, edge/corner joins, normal convention, signed depth and error
   bounds. Keep physical embedding behind the geometry adapter. Certify local
   positive/negative height fixtures on both surfaces, mountain-to-coast,
   mountain-to-seabed and mountain-to-inner-mountain relationships. This decision
   is a dependency for the renderer and cutter, not a license to alter the brush.
2. **Terrain-aware circular holes.** Intersect a direct cutting volume with that
   material, derive both complete aperture rims and check neighboring surfaces,
   thin spots and supported precision. Use a versioned hole geometry contract;
   preserve existing v1 reference cuts. Publish actual terrain/cut boundaries in
   WebGL and Canvas, the placement/resize preview and CPU clearance/ray queries.
   Stage preparation cooperatively and cache by both terrain revisions plus
   geometry epoch. Prove exact atomic history, Save/Open, failure/cancellation and
   positive/negative terrain fixtures before replacing the current guard.
3. **Terrain-aware tunnel mouths/routes.** Apply the same surface/material and
   aperture adapter to independently chosen network portals. Validate the entire
   swept volume and its actual openings; endpoint metadata alone is insufficient.
   Preserve the pick/preview/confirm workflow, existing graph identities, branches,
   chambers and exact history. Larger scales need the documented precision,
   paging and bounded-resource contracts rather than one larger synchronous array.
4. **Acceptance regression.** Compare accepted solid/hollow N128/N256 painting,
   ordinary input, navigation, both renderers, physical cuts/clearance, metadata and
   terrain replay, and v1-v7 saves. Terrain-aware excavation is complete only when
   the editor, visible surface, cutter, preview and passability agree. Guided
   inspection remains distinct from future free, collision-aware 3D navigation.

This substantial material/presentation extension is postponed by explicit owner
direction. Checkpoint 1 must not be reported as completing it. Preserve
working checkpoints. If any individual pass approaches one week, stop and request
owner/Ember direction on narrowing or deferring that pass. No pyramid or unrelated
geometry work may start while this cube correction and its acceptance are open.

Independent width/height, custom outlines, noncircular sections and different end
sizes require extensible aperture geometry and supported cutter/renderer/clearance
adapters, not overloaded radius values. The visual Tunnel Network Designer remains
required alongside professional multiscale mapmaking; comprehensive first-person
collision-aware exploration stays in the established full-3D phase.
