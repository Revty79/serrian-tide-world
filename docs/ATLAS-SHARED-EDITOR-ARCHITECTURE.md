# One Atlas, geometry adapters

2026-10-21. Supplemental owner directive for corrective pass 2, followed by explicit
owner acceptance at `d011a377e6a1ad76296e41740422fa5600f69082` and Cube-G authorization.
The shared-infrastructure audit and bounded migration proposal remain in force;
Cube-G adds the small adapters below. No broad refactor or Cube-H is authorized.

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
