# Hollow Sphere: physical networks and reciprocal links

This extends radial-hole checkpoint `8687797`. Holes, physical networks and
conceptual links remain independent objects in one Atlas document. Technical
verification and the owner/Ember hands-on acceptance are separate.

## Creator workflow

In Atlas tools, choose **Connection tools → Physical tunnels**. Set a supported
width, choose the entrance, then independently choose the exit. Dimensions and
object selection pause during each location pick; Cancel unlocks them. Switch Inside /
Outside or Globe / Net between those picks. Review the proposed actual geometry
in the three orthographic diagram planes, its coordinates and opening views.
**Confirm tunnel change** publishes only after whole-volume and terrain-support
checks. Cancelling publishes no geometry and adds no history.

A selected network supports a material-junction chamber, a short branch, an
additional independent opening, a relocated opening and junction movement at an
explicit depth from the outer reference sphere. Each proposed geometry edit has
the same review and confirmation. Opening relocation preserves the portal,
endpoint-node and first-segment identities; existing interior branches remain
connected. The proposed replacement is rendered in place of the original network.
Remove network and Undo / Redo use the parent's exact connection journal.

**Inspect tunnel → Start passage inspection** starts in the actual free space
beside a chosen portal. Travel follows its radial approach and connected graph
sections. Every section stops at its real junction; choose a connected branch,
reverse, or emerge through an opening. Drag to look and wheel / two fingers to
zoom during travel. Returning restores the editing pose and brush choices.
Painting, geometry controls and Undo / Redo pause during this read-only view.
This is bounded guided travel, without free flight or displaced-terrain collision.

**Connection tools → Map links** places two conceptual local anchors or one local
anchor and an explicit external World/map/location identity. Selected anchors can
be relocated; reciprocal identities remain stable. Follow map link can focus a
local destination. External destinations are retained and report clearly that
this standalone host cannot yet open them. Links remove no material and have no
physical travel path. They support removal, Undo / Redo and Save/Open.

## Physical certificates and conservative limits

The shared sphere/capsule graph and capsule ray intervals are reused. There is no
cube face, box-containment or cube-portal calculation in these spherical routes.
Each nonportal ball fits strictly between the two reference spheres. Every
nonportal capsule has an exact minimum centerline distance from the origin above
`innerRadius + radius`, and maximum endpoint radius below `outerRadius - radius`.
These conditions certify the entire straight capsule, not just sampled points.
Portals match real surface anchors. Their leaf stubs follow the actual radial
normal into shell material. Separate same-surface portal balls cannot overlap.

The initial constructor uses radial stubs and a bounded great-circle polyline at
the middle shell radius. It subdivides according to capsule clearance. A route
that cannot fit the primitive budget rejects before allocation/publication.
Branches use a local reference direction, without assigning geographic north or
gravity. Chambers may enlarge only within the actual material clearance.

- Reference-cut shell thickness: at least `outerRadius * 1e-4`.
- Opening radius: `outerRadius * 1e-5` through
  `min(shellThickness * 0.2, innerRadius * 0.1)`.
- Eight networks and 128 links per World; at most 48 total hole, node and segment
  cutting primitives, inside the existing 256 KiB connection-word budget.
- Independent hole/network bounding boxes cannot overlap. Join volumes as branches
  within one network instead. This conservative initial restriction is explicit.
- Conservative zero-height support masks cover all cuts plus interpolation and
  gradient neighbors on both banks. Complete dabs and terrain history replay
  validate before any write. Geometry proposals and replay rebuild support before
  publishing. Sculpted mountains/seabeds are not excavated.

Outside Globe and read-only cavity/passage views show actual reference-shell
subtraction and rock walls. The fitted Inside editor and Six-face net show
reference opening/link markers. Their marker-only behavior is stated in the UI.
Both editing modes retain the same authoritative geography and accepted brush.

## Persistence and compatibility

Version 10 checksums both exact elevation banks, complete connections and bounded
exact connection Undo/Redo. Every historical geometry state is validated.
Version 8 remains the featureless two-bank record; version 9 remains holes-only,
including historical states. Neither version silently gains network semantics.
A document keeps its minimum version after removing advanced objects because its
journal may still contain them. Existing v8/v9 records reopen with their original
meaning. Local saves permit only forward upgrades with identical immutable World
geometry, resolution and identities. Other shapes and browser database version 1
retain their existing contracts.

Save/Open validates private metadata/buffer copies before candidate promotion.
Failed support, geometry, integrity and journal checks preserve the active World.
Camera positions are transient, as in the existing guided cube inspection.

## Verification

The compact receipt is [hollow-sphere-connections.json](evidence/hollow-sphere-connections.json).
It records the completed numerical, browser, native-input and compatibility gates,
including earlier failed attempts and their corrections. Cylinder work follows
this stable checkpoint; capped/open cylindrical editors are not implemented here.


The full numerical suite passed **1,243** cases and typecheck/build passed.
Browser groups passed: 12 network/guide workflows; eight v8/v9 local-store
upgrades with continued two-bank sculpting; four final native/Home/visual cases;
four final placement-control cases; eight sustained-painting cases; 22 existing
sphere/radial-hole/cube-view cases; and four existing cube physical-passage cases.
Groups overlap and are not summed as unique coverage.

With one seven-primitive northern tunnel present, all sustained cases injected
900 moves over 15 seconds. Chromium dispatched 891–900 trusted moves, with
110–127 changing-terrain observations while held. First changed pixels appeared
at 70.4–190.6 ms on a 100 ms observer cadence; release to coherent display took
33.8–335.4 ms. This is painting away from protected opening support. Exact whole
terrain Undo/Redo passed, and the other bank stayed unchanged. N256 WebGL2 inside
Save took 1.64 s and reopen 5.08 s, retaining both hashes and the network.

The counted two-bank/cache/connection/support subtotal including one network
journal entry is 17,115,084 bytes at N128 and 67,387,340 at N256. Terrain histories,
active GPU/canvas resources, transient snapshots, workers, process and driver
memory are excluded. Full compact per-case measurements are in the receipt.
