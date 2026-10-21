# Cube-G: hollow cube foundation

2026-10-21. The owner explicitly accepted solid checkpoint
`d011a377e6a1ad76296e41740422fa5600f69082` after hands-on testing and closed E/F.
Cube-G implements the bounded hollow numerical/physical foundation and inspection.
**Stop for Ember's independent GitHub review and owner authorization before Cube-H.**

## Inspect it

Run the existing development server and open `/dev/hollow-cube.html`:
**http://127.0.0.1:5260/dev/hollow-cube.html** on the current local preview.

1. Switch **Exterior / Interior**, then **Folded surface / Unfolded map**.
   All six face buttons inspect the selected physical surface. U is amber, V mint;
   move over terrain for its exact surface identity, sample, elevation and normal.
2. Drag/zoom using the solid cube's accepted direction. The interior folded view
   is an explicitly labelled orthographic cutaway: near walls omitted, inward-
   facing far walls visible. It is not yet a free-flight camera inside the cavity.
3. **Shell & passages** shows correctly scaled concentric boundaries. Amber is
   projected actual sphere/capsule volume, including a shaft, chamber and branch;
   violet dashes connect two linked-location anchors, without excavated volume.
4. Build other valid side lengths or N128/N256. Invalid dimensions report an error
   and preserve the prior inspection. Automatic and independent Canvas are available.

This is synthetic, development-only inspection. There is no painting, authoring,
Save/Open or normal hollow World choice. The normal solid World remains available.

## Geometry and ownership

`hollow-cube.ts` defines a versioned parent and oriented surface adapters. Both
reference cubes are concentric and axis aligned. Validation requires
`0 < innerSide < outerSide`, distinct representable half-sides, positive finite
cavity/shell volume, finite areas and coordinate ranges. Nominal perpendicular
wall thickness is `(outerSide - innerSide) / 2`. Shell volume uses the factored
difference of cubes, avoiding subtraction of nearly equal large volumes.

Each surface owns one accepted shared-boundary Float32 cube lattice. World ID is
shared; surface and terrain IDs, buffers, sample ownership and revisions are distinct.
The default N128 pair uses 786,448 authoritative bytes; N256 uses 3,145,744 bytes.
New hollow reference buffers start at zero directly in their sole allocation.
The solid kernel's default remains −100 m, with the same strict v1 geometry checks.

| Adapter | Exterior | Interior |
| --- | --- | --- |
| Reference side | Outer length | Inner length |
| Normal | Accepted outward normal | Negative outward normal |
| Public chart | Accepted U,V | Accepted U, negative V |
| Public chart winding | U × V = outward normal | U × V = inward normal |
| Kernel mesh winding | CCW | CW |
| Positive elevation | Toward outside | Into cavity |
| Lowering | Into shell | Toward shell |

Coordinates, row addressing, tangent transport and edge reversal are mapped through
that chart isometry. Every face, all twelve physical edges and eight corners reuse
accepted topology and within-surface aliases. No seam crosses to the other surface.
At edges/corners normals are selected-face one-sided normals, not invented averages.
Elevation-displaced edge joining is deliberately separate from reference topology.

`referenceTerrain` / `kernelConfiguration` explicitly name the unchanged intrinsic
solid-cube kernel used for storage, paths and brushes. Its v1 metadata is not an
interior World descriptor. The parent and oriented surface descriptors carry the
actual hollow role. These kernels must not be independently saved as solid Worlds;
Cube-H needs a versioned parent save containing both surfaces and passage state.
No existing v1–v5 codec or saved descriptor has been relaxed or reinterpreted.

## Shared execution and presentation

No new painting engine, worker protocol, history implementation, saved-map workspace
or navigation engine was introduced. Numerical integration tests instantiate the
existing `CubeEditorSession` on each reference kernel, map only chart coordinates,
and retain bounded-phase spacing, all four accepted C1 brushes, exact whole-gesture
history, isolation, cancellation/work limits and atomic publication.

The existing `CubePresentation`, field preparation, shaders, texture/atlas ownership,
GPU recovery and Canvas renderer accept a small optional surface-view adapter:
normal orientation and physical scale. Default exterior behavior is unchanged.
Interior cutaway rays select the opposite reference intersection; lighting uses real
inward normals. The unfolded interior projection reverses view handedness while
using the oriented chart. It does not invert heights, copy/reverse the terrain array,
or simulate inward geometry by mirroring the solid canvas alone.

`dragCube` extracts the exact owner-accepted rotation delta for reuse by solid and
inspection. The inspector uses existing Atlas stage/canvas styling and presentation
ownership; it is not another authoring workspace. It retains one derived display
per surface, so switching surface, projection or camera never re-seeds, re-routes or
copies a full field. Construction occurs once per explicitly rebuilt inspection.
See the [shared architecture inventory](ATLAS-SHARED-EDITOR-ARCHITECTURE.md).

## Reference clearance and its limits

At a matching planar reference location the nominal gap is
`thickness + exteriorHeight + interiorHeight`: both positive signs increase clearance.
The read-only extrema screen conservatively uses
`thickness + min(0, exteriorMinimum) + min(0, interiorMinimum)`.
It does not let distant positive peaks compensate for lowering. Nonpositive results,
or heights that reach/cross the relevant center plane, produce explicit unsafe
results. Hypothetical bounded patches are checked without changing any terrain.
Both source revisions must still match after a scan; stale results fail explicitly.
The scan yields every 4,096 samples and makes no full-array copies.

This is a **reference/sample-envelope screen, not volumetric collision certification**.
Separate extrema can conservatively reject edits that are locally separated. An
unimplemented displaced mesh, interpolation choice, unsampled extrema, joined edges,
corner offsets, self-intersections and tunnel/terrain intersections require additional
checks. A nonzero shared height at a fold has different one-sided displaced XYZs;
G does not pretend those already form a closed displaced shell. Nothing is silently
clamped. Cube-H must integrate explicit proposal/revision validation with atomic
history publication before exposing actual hollow authoring.

## Both passage types

`passages.ts` supplies geometry-neutral, versioned identities and contracts:

- **Linked entrance:** two stable reciprocal navigation anchors at surface or map
  locations. Surface coordinates can be validated by the owning adapter; external
  map IDs are references, not a claim that those maps are already resolved. A link
  has no excavated volume or intrinsic through-wall distance.
- **Physical passage:** a connected union of 3D junction/chamber spheres and
  constant-radius segment capsules, with explicit surface portals and apertures.
  Graph limits are 256 nodes, 512 segments and 64 portals. Positive finite sizes,
  unique IDs, real nonzero segments, connected ownership and bounded coordinates
  are validated. Segment radii fit endpoint balls, so graph connectivity corresponds
  to connected physical volume. Volume-membership queries and a reversible centerline
  witness demonstrate outside → shaft → chamber → inside and return.

`hollow-cube-passages.ts` adds the reference-shell constraints. Internal spheres and
capsules must stay in shell material. Segment/cavity separation minimizes the
piecewise quadratic distance to the actual inner box, not just endpoint samples.
Portals must agree with exact surface anchors and fit a single face, away from
edges/corners and the opposite boundary. Portal segments are face-normal, making
their opening a bounded declared circular disk. Branches and larger chambers are
allowed inside the shell. Missing openings, disconnected graphs, foreign surfaces,
oblique undeclared apertures and hidden cavity crossings fail explicitly.

Floating 3D volume checks use a scale-relative guard of `128 × EPSILON × outerSide`;
radii at/below that coordinate resolution are rejected. This is a conservative
double-precision reference-volume validator, not a new formal exact arithmetic
certificate. Oblique/edge/corner apertures need an expanded opening contract later.
The inspector shows actual projected ball/capsule volume, but **does not subtract it
from terrain**, build excavation meshes, author links or implement travel controls.
These are required Cube-H work, not optional substitutions with linked entrances.

## Verification and measurements

The concise [results receipt](evidence/cube-g-results.json) records numerical and
browser checks, explicit owned memory and N128/N256 construction/display timings.
Final checks: **1,001/1,001 numerical tests**, **14/14 hollow inspection browser
checks**, **34/34 solid-cube browser regressions**, **20/20 legacy/D1 browser
regressions**, TypeScript and Vite production build passed. No skipped/flaky cases.
Analytic pixel checks cover every face, folded/net, outward/inward, using actual
Canvas and WebGL readback. Native UI tests exercise both surfaces, all face views,
both nets, orbit/zoom, exact sample identity, unchanged authority hashes, reversible
volume witness, unsafe proposals, invalid dimensions and the normal creation gate.
Solid-cube painting, exact history, v5 Save/Open and old geometries/codecs are covered
by focused regressions. Mobile is emulation, not physical-device evidence.

| Desktop observation, two surfaces | N128 | N256 |
| --- | --- | --- |
| Neutral model construction | 0.3–0.4 ms | 0.6–0.9 ms |
| Synthetic geography seeding | 186–188 ms | 624–636 ms |
| Reference clearance scan | 16–18 ms | 45–46 ms |
| First terrain after presentation starts | 73–173 ms | 69–75 ms |
| Full fields: automatic / Canvas | 1.03 s / 0.62 s | 0.56 s / 1.82 s |
| Canonical authority, both surfaces | 0.79 MB | 3.15 MB |
| Full derived fields, both surfaces | 3.20 MB | 12.68 MB |
| CPU face atlas, Canvas mode | 3.17 MB | 12.63 MB |

Automatic mode used actual Radeon RX 6600 WebGL2. The first measured GPU driver
initialization blocked for **624 ms**; subsequent observed initialization was about
4–7 ms. This cold-start cost remains a limitation. N256 Canvas full preparation
requires about **1.82 seconds after the roughly 0.67-second model/seed/scan**, with
coarse terrain/loading feedback before full detail. Navigation presentation medians
were 0.1–0.4 ms; per-case p95 ranged 0.2–6.4 ms, with a separate 55.7 ms cold GPU
presentation outlier. Field-refresh count stayed one per surface through camera,
surface and projection changes. These are observations, not device guarantees.

Representative [inward cutaway](evidence/cube-g-interior.png) and
[reference shell / passage volumes](evidence/cube-g-shell.png) accompany the receipt.

Timings distinguish model construction, synthetic seeding, clearance scan and each
presentation's first/full terrain. They are single development-machine observations,
not universal latency guarantees. Memory sums explicit authority/field/atlas/texture
allocations and canvas backing estimates; driver/browser overhead, temporary source
snapshots and StrictMode cancelled setup are excluded. No per-frame full geometry
reconstruction or field refresh occurs during navigation.

## Cube-H and stop boundary

Cube-H still requires the full selected-surface authoring workflow, shell-aware edit
safety, linked entrance authoring/navigation, genuine excavated tunnels/caves with
connected physical volume, history integration and versioned parent Save/Open.
Cube-I remains final solid/hollow family verification and owner acceptance.
No hollow editing, next geometry or architectural migration starts in this pass.
Original website, existing Worlds/Atlas, databases, shared server configuration,
Docker, hosting and Production are untouched.
