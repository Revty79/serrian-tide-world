# One Atlas, geometry adapters

**Current follow-up, 2026-10-22:** the owner-authorized hollow visual correction
and [operational Open Cylinder](OPEN-CYLINDER-EDITOR.md) reuse the actual accepted
cylinder field/raster/GPU components, session, viewport/input/scheduling and
physical connection controls. Closed public wrappers and worker provider
validation remain intact. Geometry hooks provide the actual annular mathematics;
one connected Open authority is never relabeled as closed-cylinder terrain.
The older Cube-I authorization below is historical. Stop after Open Cylinder for
Ember's review and owner hands-on approval; future geometry is not authorized.

**Current authorization, Cube-I (2026-10-21):** targeted cube-family verification
and hardening is authorized on provisional Cube-H acceptance. The owner has not
yet confirmed Cube-H hands-on acceptance. Stop after Cube-I for Ember/owner review;
no pyramid implementation or broad architecture migration is authorized. This
supersedes the historical authorization wording below.

2026-10-21. Supplemental owner directive for corrective pass 2, followed by explicit
owner acceptance at `d011a377e6a1ad76296e41740422fa5600f69082` and Cube-G authorization.
The shared-infrastructure audit and bounded migration proposal remain in force;
Cube-G adds the small adapters below. The owner accepted G at 543cb6211905a8fffc78013eec9b06d144b94e5b
and authorized Cube-H through H1–H5. No broad refactor or later geometry is authorized.

## What is already shared, and what should be

| System | Current implementation and decision |
| --- | --- |
| Active World and workspace | `App`, `atlas-document`, `WorkspaceChrome`, New/Open, name, Save, shared library and shortcuts already host one active document. Keep this host; do not add another editor shell per shape. |
| Input admission, progress, authority leases | `surface-work.ts` supplies `OrderedSurfaceInput`, `SurfaceProgressSignal`, `RevisionLease`, already used by sphere/cylinder worker adapters and legacy cube workers. This correction also reuses admission and progress directly in the cube UI session. |
| UI brush convention | `brush-defaults.ts` now owns the 200 m/dab additive default used by planar, sphere, cylinder and cube controls. Radius units and allowed ranges belong to the geometry adapter. No hidden strength multiplier. |
| Brush kernels | `brush-math.ts` already shares cubic radial falloff and Float32 saturation. Preserve it. Candidate discovery, certified physical distance and connected smoothing stencils are geometry-specific. |
| Scheduling and stage metrics | Mature sessions keep ordered numerical work separate from derived display, retain cheap work cooperatively and use workers where measurements justify them. `painting-metrics.ts` supplies existing shared stage recording. Cube retains the corrected independent display loop; its full per-dab timeline distinguishes queue/path, preparation, reservation, commit and display. A common scheduler interface is still an extraction opportunity. |
| Worker lifecycle | Shared lease/admission/progress primitives exist, but task envelopes, pooling, watchdog/fallback and acknowledgement code are duplicated. Cylinder/sphere workers prepare validated elevation changes from private epochs; accepted cube C2B2 workers compute pure path certificates. These proposal payloads and validators are not interchangeable. Share transport/lifecycle separately from provider validation. |
| Pointer arbitration | `attachSphericalEditing`, planar navigation/sculpting and inline cylinder/cube handlers repeat capture, exclusive paint/navigation, Space, wheel, delayed touch and two-finger handling. This is mostly reusable. This correction extracts the proven planar coalesced-event policy into `pointerSamples`, used unchanged by planar and now by cube. Hit tests, net cuts, visible-domain rules, camera transforms and surface edge assistance remain adapter callbacks. Keep accepted cube rotation and touch behavior stable. |
| Display scheduling | All need independent pointer feedback, coherent terrain epochs, local changed regions, bounded preparation, GPU failure fallback and throttled React updates. Cube's accepted dirty-region publisher remains intact; a bounded geometry-only inverse stencil cache removes repeated topology discovery. Projection, physical gradients, face aliases and shader sampling are geometry-specific. |
| History | Sphere uses snapshot-derived word patches, cylinder indexed chunk journals, cube reserved sorted unions and atomic replay. All promise one held gesture, exact words, revision/source validation, bounded storage, and failure-safe prefixes. The common contract is reusable; the implementations are not yet one generic journal. Preserve those stronger contracts during extraction. |
| Persistence | The shared IndexedDB adapter and one-document New/Open workflow already delegate strict v1–v5 codecs. Geometry metadata/layout validation stays provider-specific; atomic replacement, progress, error handling and local-library behavior stay shared. |

## Geometry adapter boundary

A provider supplies identity/topology, canonical keys and aliases, physical picking,
certified routes with ambiguity/continuation policy, spacing with an explicit error
contract, brush candidate discovery, authoritative prepared changes, and derived
field/projected views. Host infrastructure owns input ordering, task lifetime,
gesture boundaries, authority leases, history publication, display scheduling,
saved checkpoints and document replacement. Workers cannot become another authority.

Cube's new fixed-phase spacing is specialized mathematics inside the existing path
adapter. It reuses certified cube routes and the existing C1/session/history/display
pipeline. Its tiny, explicitly bounded phase error follows the established cylinder
principle of bounded storage with an accumulated uncertainty contract. It does not
copy cylindrical distance/topology or create another editor/execution architecture.
The legacy exact radical path and paired-worker implementation remain available for
numerical compatibility. Measured cheap interactive phase work stays cooperative.

The cylinder UI currently uses `0.2371 × radius` spacing; sphere and cube use `radius/4`.
That accepted difference is disclosed in brush parity testing, not silently changed
here. Standardizing UI spacing is a later explicit behavioral decision.

## Controlled migration after cube acceptance

1. Define a small shared stroke-host contract around the existing admission, lease,
   progress, cancellation/drain and epoch publication behavior. Adapt one mature
   editor first with unchanged numerical inputs, native interaction and exact saves.
   Keep provider work and validation callbacks explicit; no second authority.
2. Extract a DOM gesture adapter from the existing mature pointer controller using
   callbacks for physical hit/continuity, camera movement and assist. Adopt one
   viewport at a time, retaining pen/touch, two-finger, interruption and no-paint
   navigation proofs. Preserve the owner-corrected horizontal drag direction and
   the accepted vertical rotation.
3. Extract common worker transport/lifecycle, then field publication and exact word
   journals in separate bounded changes. Start from the mature indexed cylinder
   journal, preserving cube's reservation-before-publication and complete replay
   validation. Verify every existing shape/save version at each adoption point.

Before another geometry begins, review this inventory and select existing host
components plus specialized mathematical adapters. Any proposed new executor must
identify the established interface it cannot satisfy, demonstrate that limitation
with a concrete workload, and compare correctness, memory and native long-form
input-to-terrain latency against reuse. No new shape is authorized by this proposal.

## Cube-G adapter adoption

The owner's separate Cube-G authorization implements the hollow foundation using
this inventory, with no new numerical executor or authoring workspace:

- `surfaces/hollow-cube.ts`: parent dimensions/identities and a chart isometry
  (interior V reversal), normal/winding, row and fold adapters around the unchanged
  strict solid-cube reference mathematics. Public hollow roles remain explicit.
- `terrain/hollow-cube.ts`: two existing canonical terrain instances, independent
  revisions/keys and one parent catalog. A zero initial allocation is optional in
  the shared storage primitive; every prior solid caller retains −100 m by default.
  Read-only clearance screening accepts proposed samples without publishing edits.
- Existing `CubeEditorSession`, bounded phase, C1 preparation and exact history run
  on either intrinsic kernel in numerical integration tests. Surface selection and
  public-chart conversion are adapter responsibilities. No second brush/history
  implementation or return to accumulating radicals is involved.
- `CubePresentation` / GPU / Canvas receive an optional view orientation and physical
  scale, defaulting to the existing solid exterior. They retain the same fields and
  textures. Interior cuts, net handedness and normal direction are geometry/view
  mathematics. The accepted direct-drag helper is shared; a far-wall cutaway reverses
  its camera delta to retain surface-following input. No full fields are flipped.
- `surfaces/passages.ts` separates reciprocal linked anchors from connected 3D
  sphere/capsule volumes. Geometry-specific containment and portals live in
  `hollow-cube-passages.ts`. These are foundation contracts/queries, not another
  worker or navigation execution system.

The development inspection is a read-only adapter view, using accepted dark Atlas
stage styling and presentation ownership. Normal hollow creation, selected-surface
authoring, shell-safe transactional proposals, parent persistence and full linked/
physical passage workflows remain Cube-H. The controlled migration proposal above
is not silently expanded into that work or into another geometry.

## Cube-H adoption and remaining shared migration

H1–H5 keep the accepted execution path. HollowCubeDocument owns two ordinary
CubeEditorSession instances and a parent identity. Two cached CubeEditor
viewports supply ONE WorkspaceChrome through their existing view/tool contract.
The inward G chart is used at the public picking/annotation boundary; numerical
storage stays intrinsic. Coalesced pointer admission, touch/pen arbitration,
owner-corrected drag, bounded-phase spacing, C1 preparation, whole-gesture history
and independent local display scheduling are reused, without another executor.

Terrain publication adds a host policy around the accepted atomic publisher.
cubePatchBlocks factors its existing intrinsic-view/descriptor validation so
the hollow guard can inspect detached descriptors, then check both-surface and
excavation leases before the existing exact source validation and atomic write.
Changed samples get O(1) protected-ground lookups; support rectangles are prepared
cooperatively only on geometry changes. Save/Open uses the same support validator.

Entrances/excavation reuse TerrainHistory with a bounded Uint32 metadata buffer:
candidate preview, allocation-before-replacement and exact source-word replay.
This is the existing word journal, not a copied passage history. Each terrain
keeps its accepted cube history; the creator explicitly selects the Undo scope.
The shared IndexedDB store and App replacement lifecycle delegate a strict v6
parent codec; v1–v5 codecs retain their original contracts.

New geometry capabilities are isolated in hollow-cube-csg and its small GPU/Canvas
adapters. The established renderer projects six reference planes; those planes
cannot expose excavated walls or a camera inside a tunnel. The added adapter
therefore intersects rays with the reference shell DIFFERENCE the existing
sphere/capsule union. CPU passability, continuous camera routes, WebGL ray casting
and Canvas hit caches use that same volume. Canvas retains the established
affine terrain atlas and replaces only projected excavation regions; physical
inspection uses a bounded 24k-pixel fallback. No global terrain mesher is added.
The base solid shader stays selected for solid Worlds. Hollow CSG shader/secondary
terrain textures are created lazily when an excavation exists.

The geometry-neutral linked-anchor and physical-passage contracts remain separate.
Cube containment, planar apertures, shell subtraction and wall-relative controls
belong to cube adapters. Perspective eye placement is an optional presentation
view; the existing pointer controller handles looking and zooming. Traversal
follows continuously inside authored capsule/ball volumes and offers connected
branches at junctions. It does not switch maps to simulate passage travel.

Before another geometry, retain this inventory and the controlled migration above.
Extract shared lifecycle/transport/pointer infrastructure incrementally after cube
acceptance. A proposed new execution system must demonstrate the established
interface/workload limitation and compare against reuse. Cube-H does not authorize
Cube-I, that migration, or another geometry.

## Cube-I readiness inventory

These are working reuse boundaries, not a claim that every editor already uses one
generic implementation. Preserve the accepted numerical/provider validators.

| Contract | Reuse | Geometry-specific responsibility / remaining work |
| --- | --- | --- |
| Parent World and surface identity | `contracts.ts`, App/`atlas-document`, shared document replacement and local catalog | Provider dimensions, surface roles and stable terrain/surface IDs; never identify a public hollow interior as a solid exterior. |
| Physical geometry/topology | Surface contracts, canonical-key/alias ownership pattern | Charts, face domains, reference positions, positive normal, folds, winding and physical units. Cube's square six-face topology is not a generic polyhedron. |
| Brush candidates | C1 staged prepare/reserve/commit pattern and shared `brush-math` falloff/Float32 policy | Conservative discovery, distance certification and connected smoothing stencils. Share execution separately from candidate geometry. |
| Distance and spacing | Ordered path admission, bounded continuation/error contract, radius/4 cube/sphere convention | Certified route candidates, physical geodesics, ambiguity/tie policy, corner events and accumulated spacing bounds. Right-angle cube unfoldings do not apply unchanged to pyramids. |
| Input and gestures | `pointerSamples`, proven mouse/pen/touch arbitration, capture/cancel, Space/navigation conventions | Hit testing, visible domain, chart conversion, projection cuts, camera transforms and geometry-aware edge assistance. An incremental shared DOM adapter is a later extraction, not a copied new controller. |
| Numerical authority | Host revision/source leases, exact before/after words, atomic publication, bounded work/progress | Provider keys/layout, source validation and shell-specific policy. Workers remain proposals, never a second authority. |
| Scheduling | `surface-work`, stage metrics, ordered cooperative/worker lifetimes and independent display scheduling | Provider work envelopes/validators differ; reuse transport/lifecycle incrementally without exchanging incompatible proposal payloads. |
| Rendering/publication | Existing presentation ownership, local dirty regions, epoch coherence, GPU resource lifecycle and Canvas fallback | Field sampling, gradients, face interpolation, projection/picking and optional material-volume renderer. Cube's six-plane shaders are not arbitrary-face shaders. |
| Projections | One workspace's view/tool contract, navigation and derived views | Globe/net/side/cap/polyhedral arrangements and orientation. Views never convert authoritative terrain. |
| History | One gesture, exact word patches, reserve-before-publication, bounded retention and explicit stopped-prefix recovery | Existing providers retain their journals until a measured extraction preserves each stronger contract. Connection edits already reuse `TerrainHistory`. |
| Persistence | Shared IndexedDB catalog, App locking/draining, checkpoints, atomic Save/Open replacement and corruption handling | Strict versioned geometry/layout/orientation/word codecs. v1–v6 keep their established meaning. |
| Inside/outside | H parent host, independent sessions and cached fields, one workspace and selected history scope | Provider inward chart/normal, separate canonical identities, shell-envelope and clearance validator. Two cached surfaces are not two applications. |
| Connections/excavation | Geometry-neutral reciprocal links and physical passage graph, metadata journal and validated promotion | Provider containment, apertures, shell subtraction and normal/depth frames. Guided inspection is distinct from linked-map navigation and future free movement. |

Cube-I uses one optional **UI control value** in the existing CubeEditor for hollow
surfaces: tool, strength, intensity, target, requested physical radius and backend
follow the creator. Each surface enforces its existing radius range; no brush math
or execution has moved into React. A solid editor keeps local controls/defaults.
Passage movement updates the eye without resetting camera/zoom on every frame;
choosing a new segment aligns the view once. Canvas inspection retains its accepted 24k budget; optional higher-detail trials
were deferred to preserve responsiveness. Direct opening navigation reuses the
existing selected-surface/focus action; no new traversal or rendering engine is added.

## Practical Pyramid-A proposal (documentation only)

No pyramid code is included. Adopt unchanged the App lifecycle, WorkspaceChrome,
shared library/error/progress/checkpoint behavior, pointer-sample policy, physical
brush defaults/falloff, source leases and word-journal contracts. Keep mature
execution/display scheduling and worker transport patterns. A provider adapter must
first prove where direct adoption of a cube-specific implementation is impossible;
do not copy CubeEditor/CubePresentation and invent another execution system.

Proposed separately reviewable Pyramid-A boundaries:

1. **A1, physical contract:** settle the approved pyramid definition/dimensions,
   base and triangular faces, convexity/degeneracy limits, outward/inward orientation,
   reference charts and stable identities. Supply explicit seam/vertex witnesses.
2. **A2, canonical topology:** unique sample ownership on triangular faces/base,
   edge/vertex aliases, connected neighbor stencils and memory/layout limits. Reuse
   typed Float32 authority and atomic-patch contracts, rather than a separate map state.
3. **A3, metric adapter:** certify routes/unfoldings with non-right dihedral angles,
   candidate discovery, physical distance bounds and spacing through apex/edges.
   Verify against independent witnesses before adapting the existing brush executor.
4. **A4, readiness review:** demonstrate four-tool numerical parity, exact gesture
   replay and bounded failure/cancellation with accepted shared host contracts;
   identify the minimal triangular projection/field/picking and strict persistence
   adapters for the following usable-editor checkpoint. Keep creator testing early
   in that next sequence, rather than another prolonged read-only delivery campaign.

Each boundary is bounded by the one-week rule and owner/Ember review. A is not a
license for a broad refactor, hollow pyramid editor or later geometry. Any new
execution system proposal must document a demonstrated workload/interface limitation,
the reuse alternatives tested and the regression/performance comparison.

## Required underground architecture beyond the cube checkpoint

See [Underground access and network design](UNDERGROUND-NETWORK-ROADMAP.md) for the
owner's permanent distinction among physical breaches, network entrances and
linked-map access. The current capsule graph can express explicit branches/loops
and real connected voids, but fixed small buffers and cube-shell containment cannot
serve as the final world-spanning model. The plan requires a visual plan/profile
designer, explicit depth/region/level frames, versioned extensible volume contracts,
spatial paging/precision and later continuous collision-aware first-person movement.
Reuse the host, history and rendering systems; do not create a separate tunnel app.

## Cube-I correction: shared cuts, distinct authorship

`ThroughHole` is a separate versioned authored object with two physically
corresponding mouths, its own identity and circular size; it contains no tunnel
graph. `PhysicalPassage` retains independently anchored network portals and the
existing graph/volume contract. `LinkedEntrance` retains abstract reciprocal
World/map/location semantics. Hole selection and counts never use the network list.

Both physical types adapt to the accepted CSG ray, WebGL, Canvas and margin-clearance
machinery. Initial network proposals reuse the accepted Cube-B certified route
on the middle reference shell and existing perpendicular entrance necks. Preview
validation uses the same host leases and support validator as atomic publication.
The existing CubeEditor owns pointer handling and physical footprints; a generic
on-map control slot supplies sizing buttons. No brush engine is replaced.

The existing `TerrainHistory` gains bounded metadata-journal export/restore. v7
persists exact Undo/Redo chains, validates sources and every historical geometry,
and restores them without writing the current authority. v1-v6 interpretations and
original checksums remain intact; only explicit Save upgrades v6. This persistence
extension is required by the owner's hole edit-history supplement.

[Terrain-aware excavation checkpoints](CUBE-I-TERRAIN-EXCAVATION-CHECKPOINTS.md)
identify the missing watertight material reconstruction and geometry-specific
surface/aperture adapter. The owner's later scope correction defers this substantial
extension to a deliberately designed shared physical 3D architecture; it no longer
blocks Phase 2 cube-family acceptance.
It must preserve accepted canonical heights, coordinates, brush/history scheduling
and independent surface identities while bringing rendering, preview and clearance
into agreement. A reference-plane guard removal is not an implementation.

The first internal implementation is the geometry-only
[bilinear material adapter](CUBE-I-TERRAIN-MATERIAL.md). It snapshots the existing
canonical banks, defines explicit closed edge/corner joins and intersects the
existing capsule/sphere cutters. It does not introduce a new editor, execution
system or terrain authority. Normal editing still uses the saved reference-shell
contract. Further renderer, input, collision and persistence integration is paused.
The experiment is not the approved architecture for spheres, cylinders, pyramids
or irregular worlds. Design their shared requirements before resuming that work.
The Pyramid-A proposal above is retained as future documentation, not the next
authorized pass: the revised order is Hollow Sphere, Hollow/Open Cylinder, then
Solid/Hollow Pyramids, each requiring authorization after cube-family acceptance.
