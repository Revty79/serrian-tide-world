# Pyramid basic physical connections

This checkpoint extends the accepted Solid/Hollow Pyramid editors. The final
technical result and exact validation inputs are recorded in
`docs/evidence/pyramid-connections/receipt.json`. Owner acceptance is separate.

## Creator behavior

- The solid has one exterior terrain bank. A direct bore has two real exterior
  mouths; its entrance and exit controls are distinct.
- The hollow has its existing independent exterior and cavity banks. A direct
  bore joins their actual boundaries. A normal that misses the cavity rejects;
  a physical tunnel can follow a contained route instead.
- Holes support preview, confirmation, width, movement and removal. Physical
  networks support independently chosen portals, branches, material junctions,
  chambers, extra portals, relocation, removal and guided centerline inspection.
- Reciprocal map links retain independent anchor identities. External map
  destinations remain stored but unresolved in this standalone host. Links
  neither excavate material nor change a brush's physical surface distances.
- New worlds still default to the accepted -100 m ocean. Solid Pyramid now also
  offers explicit level reference ground. Holes/tunnels require exactly 0 m
  throughout their conservative opening support, including interpolation and
  gradient neighbors. Existing geography is never leveled automatically.
- Outside Physical view, cavity inspection and guided inspection show the real
  subtraction. The fitted Inside editor and Surface map use entrance markers.
  The map and both physical editing overviews retain the existing terrain tools.

Direct holes in face interiors use the actual face normal. A real crease has
no unique normal: its reference entrance axis points toward/from that convex
boundary's strict interior seed. Both mouths, complete free endpoint balls,
positive material depth and requested width are validated. Near-edge/near-apex
authoring uses the same numerical geometry as ordinary face authoring.

## Geometry and safety

`PolyhedronMaterial` uses the real five outer supporting planes and, for a
hollow world, the real five cavity planes. Outward interval bounds establish
nesting, clearance and complete material containment. No cylinder dimensions,
proxy sphere, auxiliary terrain bank or substitute World identity is created.

The existing `PhysicalPassage` sphere/capsule union remains authoritative.
Internal balls and whole capsules must fit the material. Exterior entrance
stubs cannot cross the cavity. A bounded physical waypoint search proposes
routes around a cavity; every accepted edge still requires its complete volume
certificate. Its Euclidean layout costs are not terrain-paint distances.
Acute apices use real eroded/expanded plane clips to propose entrance depths,
followed by the same containment proof, instead of an arbitrary fraction of
global clearance.

The existing limits remain: 48 total hole/node/segment cutting primitives,
eight independent networks, 128 map links, 256 KiB connection words, and a
4 MiB/64-operation exact connection journal. Independent physical object bounds
cannot overlap; a connected branch belongs in the same network. Unproved narrow
routes or exhausted bounded searches reject without publishing a replacement.

`PolyhedronConnectionStore` reuses `TerrainHistory` and validation before
publication. Preview creates no history entry. Terrain and connection history
remain separate scopes. Complete host patches, including worker commits and
terrain-history replay, pass the existing indexed authority's sample guard.
Undo/Redo revalidates support before moving a connection cursor; changed ground
cannot silently restore an invalid old cut. Host locking and connection locking
are independent, including overlapping failed Save attempts.

## Shared presentation and navigation

The ordinary accepted polyhedral shader, sharp Canvas atlases, palette,
numerical interpolation and physical-slope shading remain in use. A lazily
compiled CSG extension clips the genuine convex material and reuses the accepted
sphere/capsule intervals. Exposed reference surfaces read their actual terrain
bank; exposed rock has no invented terrain chart.

Canvas preserves the full sharp baseline outside conservative projected cut
support. Like the accepted Cube, it separates physical geometry from terrain
coloring: a bounded kind/Float64-UV/shade cache lets painting recolor unchanged
intersections. The cache owns at most 100,000 samples and 2,600,000 typed-array
bytes, with a bounded index map, for one editing pose. View/geometry changes
invalidate it. It owns no canonical elevations or history. Inspection pauses
painting and uses the existing coherent progressive/idle-refinement policy;
travel does not build an unused geometry cache for every changing eye position.

Prepared capsule queries cache immutable geometry and avoid per-ray temporary
vectors. The ordinary accepted `rayCapsuleInterval` is unchanged. Exact interval
comparisons cover world scales, tangencies, parallel rays, endpoint spheres and
snapshot ownership; complete graph-ray comparisons cover solid and hollow
unions. An experimental AABB/primitive-compaction optimization was slower on
fixed development-PC rays and is not used.

The shared guide requests an actual World-space look direction. The workspace
adapter converts it to its accepted perspective-frame convention: existing
cylinder cameras use +forward; the polyhedral camera uses -forward. This keeps
the Cylinder/Open Cylinder behavior and faces Pyramid travel along its real leg.
Normal editing navigation and camera poses retain their existing mechanisms.

## Persistence and compatibility

New explicit formats **21 (solid)** and **22 (hollow)** bind the canonical
connections, exact connection journal and the complete legacy terrain payload
with an integrity checksum. Their terrain children retain the strict v15/v16
contracts, including exact Float32 words, signed zero, configuration, detail,
identities and hollow bank selection. Formats 1–20 are not reinterpreted.

The normal editor migrates existing v15/v16 maps on Save. Local IDB replacement
permits that forward migration only for the same geometry, detail and identities;
it rejects downgrades and incompatible replacements. Open validates the full
record and current reference-ground support before replacing the active world.
Terrain undo history retains its existing lifetime; the new persisted journal
is specifically the connection history.

## Review evidence

The receipt separates units, build, normal-editor browser workflows, actual
output-pixel comparisons, migrations/transaction guards, prior-shape regressions
and graphics configuration. Installed Chrome on the development PC and forced
Canvas are tested separately. Pixel tests check unchanged baseline pixels,
exposed rock, a solid through-bore and actual opposite-bank geography, together
with unchanged source elevation words. Painting timing joins actual commits to
captured output epochs, rather than measuring only numerical completion.

Reference-ground excavation is the supported scope. Displaced-terrain CSG,
unrestricted free flight and the full Phase 5 Tunnel Designer remain separate
work. Tetrahedron and Octahedron connections follow as independent family
checkpoints under the authorized course-correction queue.

The [permanent excavation requirement](ATLAS-UNIVERSAL-EXCAVATION.md) applies
to both solid and hollow Pyramids. This basic checkpoint requires at least two
portals per network and offers certified routes with junction/branch/chamber
edits. Blind entrances, enclosed networks without surface portals, freehand
route creation, arbitrary cross-sections/rooms, sectional editing and cross-map
underground design remain missing. They belong to the later shared designer;
this family must not be described as fully excavation-feature-complete.
