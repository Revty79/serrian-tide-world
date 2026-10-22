# Underground access, physical breaches and network design

Permanent owner requirements recorded during Cube-I, 2026-10-21. This is a required
Atlas roadmap, not authorization to implement the future passes below. Keep the
eleven master phases and approved geometry order unchanged. Cube-H owner acceptance
and final cube-family acceptance are still pending.

## Authoritative Cube-I correction

Use **Hole**, **Tunnel** and **Map Link** as distinct operations and contracts.
A hole is an independently authored direct breach with corresponding opposite-side
mouths, not a network entry. A tunnel has independently chosen entrance/exit
locations and a designed continuous physical route. Map links are abstract
reciprocal World/map/location connections; they can support interiors, underground
layers, solar systems and games, and do not inherently remove material.

Both physical operations must intersect actual positive/negative sculpted terrain
on both sides in the future shared physical 3D architecture. The owner explicitly
defers that advanced integration; it no longer blocks Phase 2 Cube-I acceptance.
The reference-shell/zero-height restriction remains an explicit temporary domain,
not fulfillment of the future requirement.
[Correction checkpoints and dependencies](CUBE-I-TERRAIN-EXCAVATION-CHECKPOINTS.md)
record the implemented separate circular-hole and reviewed-tunnel workflow, v7
metadata history, and the remaining terrain material/rendering/clearance work.

Hole dimensions must span physically valid small and ship-scale circular openings,
with placement preview, numerical and on-map control, identity-preserving resize,
and exact replay/persistence. Validate against each World's geometry and supported
precision/resources, not a universal size cap. Independent width/height, custom
outlines, alternative shapes and unequal mouth sizes are required extensibility.

## Three distinct capabilities that can be composed

| Capability | Required meaning | Current foundation and gap |
| --- | --- | --- |
| Physical through-hole / breach | Remove material directly through a separating surface or shell, connecting the environments on either side. No extended tunnel network is required. May be extremely large, underwater, or traversable by ships/vehicles. | I adds independent circular ThroughHole objects, one-pick placement and resize/move controls using shared CSG. Terrain-aware mouths and advanced shapes remain unfinished; H capsule shafts retain legacy network identities. |
| Physical tunnel entrance and extended network | An actual aperture enters connected underground volume. Routes can curve, branch, loop, descend through shafts/slopes and levels, form caves/caverns/chambers and travel across mountains, continents or a whole world within declared resource limits. Multiple entrances/exits and maps/regions may share the same physical network. | H subtracts real connected ball/capsule volumes and supports junctions, branches, chambers, additional portals and explicit graph loops. It is limited to one reference cube shell and a small bounded model; it is not the complete visual designer or world-spanning representation. |
| Linked-map access/navigation | Preserve a surface anchor, corresponding underground anchor, geographic location and elevation/depth relationship. An immediate transition to a local cave, mine, basement, dungeon or other map/region is valid when changing scale/layer. | LinkedEntrance preserves reciprocal surface or external World/map/location identities. External destinations are honestly unavailable in this standalone app. Explicit underground layer/datum anchors and navigation between actual multiscale documents remain future work. A link alone removes no material. |

A surface opening may lead directly to a local underground map, enter a physical
network, or be one of its exits. Local underground access must not require crossing
a hollow world's entire wall or reaching an opposite surface. A physical breach
or entrance may additionally carry a map link; neither physical feature is a
teleport. Conversely, a series of map transitions cannot stand in for physically
traversing a world-spanning tunnel. Cube-H's automatic matching exterior/interior
shaft is one useful template, not a universal definition of underground access.

Underwater/vehicle-scale geometry must eventually be validated at its physical
scale and with appropriate clearance. Water/environment association and any fluid
simulation need explicit contracts and verification; the current reference-shell
renderer does not establish those capabilities.

## Required visual Tunnel Network Designer

Develop this within the existing Atlas workspace alongside **Phase 5 professional
multiscale illustrated mapmaking**, including dungeons, underground levels, interiors
and linked maps. Reusable identity/geometry groundwork may be introduced earlier
in a separately authorized bounded pass when a concrete workflow needs it.

Creators draw routes directly on an underground plan, with top-down and side-profile
views and eventually 3D editing. Support curves, branches, intersections, loops,
multiple entrances/exits, chambers, natural caves/caverns, constructed passages,
shafts, slopes and connected levels. Controls must express width, height, depth
and passage shape. Creators can edit, delete, extend and reconnect a network and
link dungeon, mine, basement and underground maps. Complex design must not require
manual entry of individual XYZ nodes. Both direct breaches/local access and extended
network entrance authoring must be available as distinct workflows in one World.

## Contract assessment

Reuse `surfaces/passages.ts`: stable World/network/node/segment/portal and reciprocal
anchor identities; graph connectivity; physical meter coordinates; actual ball and
capsule unions. Reuse geometry-specific containment/portal validators and H's
transactional source leases, exact word journal, save validation and actual CSG
rendering. Keep the App lifecycle, tools, pointer arbitration and presentation
infrastructure. A tunnel is connected Atlas geography, not another application or
an independent editing engine.

Current limitations and required future extensions:

- A straight capsule chain approximates curves; it does not encode editable curve
  handles or an error-bounded swept curve. Circular radii cannot specify independent
  height/width, arbitrary cross-sections or natural/constructed wall profiles.
- Authored graph loops work. Geometric crossings union physically, but the current
  guided inspector offers only authored graph junctions. A future designer must
  explicitly split/connect crossing routes or mark grade-separated crossings.
- Public anchors identify a surface position or an external map location. Add
  explicit underground region/level identity, geographic anchors, coordinate frame,
  physical scale, datum, depth convention and surface relationship. "Depth" must be
  provider-aware; one cube-face frame is not a universal underground coordinate system.
- Model physical opening semantics explicitly: breach versus network entrance,
  adjacent environments, aperture geometry, connected volume and optional linked
  destination. Local access must not require two portals across the entire shell.
- H's 48 primitives, eight networks and 256 KiB connection buffer are deliberate
  interactive safety bounds. They are not a world-spanning schema. Plan spatially
  indexed, paged/chunked volumes with stable identities across chunk boundaries,
  precision/floating-origin or hierarchical coordinate policy, bounded resident
  resources, cancellation and incremental invalidation. Arbitrary distance means
  scalable declared budgets, not unlimited synchronous work or one larger fixed array.
- Retain the exact v6 interpretation. New primitive/anchor/partition contracts need
  an explicitly versioned codec, validated migration/extension policy and exact
  save/history transactions. Never silently reinterpret existing capsule records.
- Current passability is a point/margin query and guided centerline inspection.
  Future navigation needs actor/vehicle shapes, conservative continuous swept collision,
  wall/floor/ceiling clearance, loaded-neighborhood guarantees and consistent behavior
  at connected unions, chunk joins and surface apertures.
- Reference-shell/zero-height support is retained only as a safe interim guard.
  Terrain-aware physical material, apertures and matching render/clearance queries
  are mandatory future work under the deliberately designed shared physical 3D
  architecture. The owner pauses that integration during Phase 2 Cube-I. Future
  free exploration still belongs in comprehensive 3D.

## Proposed bounded checkpoints

Each checkpoint requires its own authorization, targeted compatibility tests and
review. If it approaches one week, preserve working progress and ask the owner/Ember
to narrow or defer it. The Cube-I correction now implements separate reference-shell hole authorship and reviewed tunnel placement; the broader designer/scaling passes below remain future work.

1. **Underground-A: contracts and local access.** Define breach versus entrance,
   local underground anchors/layers/datum and their optional map links. Validate one
   small direct-opening workflow without an obligatory full-wall shaft. Prove exact
   existing-v6 compatibility and future-version round trips before exposing new saves.
2. **Designer-A: visual plan editing.** In the shared Atlas workspace, draw/select/
   extend/reconnect/delete a bounded network; make explicit branches/loops, multiple
   entrances and chambers. Use existing validated volumes/history; support top-down
   plan and depth/profile controls. Acceptance: design a branching mine without XYZ
   entry, undo it, save/reopen and retain physical connectivity.
3. **Designer-B: curves, sections and levels.** Add error-bounded curves, shaft/slope
   and linked-level authoring, independent width/height/shape and natural/constructed
   profiles. Stage these separately if the combined pass exceeds the time rule.
4. **Network-Scale: geographic partitioning.** Add the measured spatial index,
   precision and paging strategy required for long routes across multiple regions
   or maps. Prove continuity, exact transaction/recovery and bounded resource use
   across partitions; do not simulate a continuous route using instant map jumps.
5. **Phase 6 exploration checkpoints.** After comprehensive displaced 3D material
   rendering, add free first-person-style bidirectional movement, actor/vehicle
   collision, real surface entrances, curved routes, branches, chambers and levels,
   then streamed long-distance traversal. Editor excavation, map anchors, renderer,
   visibility and collision must agree on the same physical geography. Guided
   inspection remains an optional aid; Cube-H/I does not fulfill free navigation.

See the [master roadmap](PHASE-1-HEIGHTMAP-ROADMAP.md) and
[shared architecture inventory](ATLAS-SHARED-EDITOR-ARCHITECTURE.md).
