# Phase 2: Solid and Hollow Pyramids

Owner authorization starts at `ebbb86b2e7a3764da38905a3e5d70620a7ee3c51`.
The corrected Open Cylinder is accepted for progression. The authorized scope
is a right square Solid Pyramid followed by a closed Hollow Pyramid, with
separately verifiable published checkpoints. Stop after this family for review.
No other shape, website, database, Production, hosting or Docker work is included.

## Checkpoint 1: physical topology and canonical authority

`surfaces/pyramid.ts` defines four genuine triangular faces and one square base,
five vertices and eight edges. Base width and perpendicular height are physical
meters. The apex is centered above the base; normals and metric frames are
derived from real vertices. Height/width ratios outside 0.05 through 20 reject
explicitly, together with nonfinite/degenerate dimensions and foreign positions.
This bounded aspect-ratio range also bounds subsequent numerical conditioning.

`terrain/pyramid.ts` uses the accepted `createIndexedFloat32Authority` unchanged.
Triangular faces use a uniform barycentric lattice; the base uses its ordinary
square lattice. A triangle is not represented by a collapsed square raster.
Canonical layout contains five vertex words, eight edge-interior strips, four
triangle interiors and one base interior. Shared edges and the apex have one
word each. Total samples are exactly `3*N*N+2`: 49,154 at N128 and 196,610 at
N256. Integer subdivisions 4 through 256 are supported by this foundation.
Neighbors join actual physical aliases, including every edge and apex.

Validation covers all chart addresses and canonical owners at N4, N7, N16,
N128 and N256; alias positions/words, reciprocal connected neighbors, actual
face incidence, normals, metric determinants, dimensional rejection, foreign
keys, stale epochs and atomic clearance rejection. The N7 case caught and
corrected a cancellation error in a boundary barycentric weight. No coordinate
snapping was introduced. TypeScript, all nine focused tests and the complete
1,374-test numerical/unit suite pass with no failures or cancellations.

This first checkpoint changes no editor, save format or existing geometry.
It is a physical/numerical foundation, not a creator-usable delivery yet.

## Reuse selected for subsequent checkpoints

The accepted connected brush executor supplies all four kernels, certified
falloff, ordered physical spacing, cooperative work, staged publication and
whole-gesture history. The shared worker protocol/runtime supplies proposal and
acknowledgement handling; pyramid metadata and geometric routes stay explicit.
The Atlas host, workspace/input controller, local catalog and versioned atomic
replacement remain the editor host. Rendering will reuse accepted polyhedral
field/color/relief mechanisms, shared graphics initialization and bounded
presentation. Sharp settled frames and local updates must remain sharp during
painting. Projection, triangle addressing and non-right-angle folds are adapters.

Convex surface distances require genuine unfolded face routes, not ambient
chords through the volume. A shortest path on a convex polyhedron does not
revisit a face. The five-face topology therefore permits exhaustive simple-face
routes with straight unfolded candidates and verified edge crossings. See
[Chen and Han, Shortest Paths on a Polyhedron](https://h.web.umkc.edu/hanyij/html/research/ppath90.pdf).
Arithmetic enclosure, ambiguous crossings and work limits must be explicit;
an unsupported certificate rejects before terrain publication.

## Checkpoint 2: certified routes and numerical editing

`pyramid-path.ts` exhaustively unfolds simple face routes. Outward binary64
intervals enclose each transform and portal predicate; only proven side or
ordering exclusions remove a possible shortest route. Ambiguous grazing routes
retain their lower bounds. The upper bound comes from a feasible sequence of
actual common-edge points joined within convex faces, with outward-rounded
physical lengths. A requested precision or work limit that cannot be established
rejects explicitly. The fixed five-face enumeration is bounded independently
of resolution; no recursive distance boxes or closed-volume shortcuts are used.
The separate route count is exposed, while the accepted executor's recursive
box count remains zero for this finite analytic adapter.

`pyramid-brush.ts` adapts the unchanged connected dab and stroke executors.
Candidate discovery projects the ambient brush ball conservatively into each
real face lattice, deduplicates canonical words and publishes ordered patches.
Actual intrinsic distances determine falloff. Raise/Lower/Flatten use the
accepted kernels, and Smooth reuses the connected half-CFL arithmetic with
positive physical-neighbor conductances. History remains the accepted exact
whole-gesture journal. Cancellation or failed preparation publishes no partial
dab; committed prefixes remain governed by that journal.

The radius policy measures the longest lattice edge. The preferred default is
at least three such intervals, subject to the explicit bounded footprint domain.
`wellSampled` is false when the requested dimensions/detail cannot meet it;
the operational editor must reject or request greater detail rather than silently
claiming an adequately sampled default. At the standard 2,000,000 m base width /
1,600,000 m height, the default is 133,920 m at N128 and N256, spanning 8.6 and
17.1 longest lattice intervals respectively. No strength multiplier is added.

All 19 pyramid tests and the complete 1,384-test numerical/unit suite pass,
with TypeScript clean. Added cases include all face pairs, apex/base/corner
transitions, all four tools, exact replay, atomic failure, independent adjacent
normal-section witnesses at aspect extremes, and 300 seeded complete-boundary
route comparisons. Existing regression thresholds are unchanged.

[The numerical receipt](evidence/pyramid-numerical-checkpoint.json) records
30 dabs per N128/N256 side/base case. N256 p95 numerical preparation plus
canonical commit was 14.2 ms on a side and 14.7 ms on the base. These Node
measurements are not browser input, rendering or visible-response evidence.
The operational checkpoint must measure those independently, including joins,
sustained painting, actual pixels and camera motion.

## Checkpoint 3: operational Solid Pyramid

The [operational review](PYRAMID-SOLID-EDITOR.md) and
[raw receipt/captures](evidence/pyramid-solid-editor/receipt.json) document the
normal Atlas editor, shared worker/workspace/brush/history, sharp GPU/Canvas
presentation, continuous visible joins and strict format 15. All 1,398 unit
tests, production build, six N128/N256 ordinary/held browser workflows, two
actual output-pixel cases and seven accepted-family browser regressions pass.
The owner independently confirmed the visual and held-brush improvements.
Technical delivery does not substitute for final family acceptance.

## Remaining authorized sequence

1. Nested closed Hollow Pyramid, independent banks and proven shell clearance.
2. Operational hollow outside/inside editing, read-only cavity inspection,
   editable nets, persistence and compatible connection interfaces.
3. Final existing-family regressions, actual Canvas/WebGL pixels and measured
   input-to-commit / commit-to-visible evidence, then stop for owner review.

## Checkpoint 4: closed Hollow Pyramid foundation

`surfaces/hollow-pyramid.ts` validates two centered right square pyramids with
explicit outer/inner widths, heights and inner base elevation. The inner base
corners, base and apex must lie strictly inside every outer halfspace. Convexity
then covers every inner face and edge. Outward interval arithmetic encloses the
slant-plane distances; the smallest lower bound, including the base-plane gap,
must exceed the supported numerical separation. Intersecting, touching,
degenerate, nonfinite and ambiguously thin shells reject before allocation.

`terrain/hollow-pyramid.ts` creates two ordinary pyramid authorities, with
distinct terrain/surface identities and the actual common World descriptor.
Stored heights are neither negated nor copied. Cavity normals point inward.
Each bank's absolute elevation limit is at most one quarter of minimum shell
clearance and one eighth of its own minimum physical dimension. This bounds a
reference-height envelope; it is not a claim of displaced-mesh collision proof.
The ordinary -100 m ocean rejects when clearance cannot contain it; explicit
0 m reference-shell initialization remains available without clamping.

The geometry/topology frames are immutable, including nested vector/vertex
arrays, and normals use the snapshotted role rather than caller-owned input.
Focused tests verify all inner vertices against all five real outer planes,
independent N128/N256 apex/edge words, foreign identity rejection, shell bounds,
inward orientation, thin-shell initialization and mutation isolation. The
operational solid checkpoint was published first as `2207edc`.

Checkpoint 4 validation: all 1,404 numerical/unit tests pass with no failures,
cancellations or skipped cases, with TypeScript clean. The complete suite ran
sequentially at lower priority during continued owner use.


## Checkpoint 5: operational Hollow Pyramid

The [operational hollow review](PYRAMID-HOLLOW-EDITOR.md) and
[current publication receipt](evidence/pyramid-hollow-editor/receipt.json)
record the normal two-bank editor, continuous visible joins, sharp fitted/maps
and cavity presentation, corrected inside drag axes and strict two-bank v16.
The owner explicitly requested publishing the current corrected checkpoint
before the remaining regressions, then fixing/pushing any later failures.
At this publication the final frozen-runtime family regression receipt remained
pending. Checkpoint 6 records the completed follow-up; neither checkpoint is a
final owner acceptance claim.

## Checkpoint 6: final family verification and review

The [final family review](PYRAMID-FINAL-REVIEW.md) and
[source-fingerprinted receipt](evidence/pyramid-final-regression/receipt.json)
complete the authorized delivery sequence. The runtime published as `3a96f05`
passes 1,414 unit tests, TypeScript/build and 114 browser test executions:
15 Hollow Pyramid, eight Solid Pyramid, four touch/pen emulation, 68 existing
family compatibility, 12 matched rendering parity and seven focused solid/Open
Cylinder compatibility cases. The Open Cylinder cases retain their accepted
backing/pixel gates and exercise sustained annular rims and continuous joins.

The final parity run found a test-only asynchronous readback defect. Capturing
non-preserved GPU buffers before awaiting a terrain hash fixes all six WebGL
cases without changing renderers, numerical results or comparison thresholds.
Both the failed attempt and complete passing rerun are preserved. All other
published product/test source bytes match the preceding checkpoint.

Actual RX 6600 WebGL2 and forced Canvas output, separate input/commit/pixel
timings, native camera direction, twenty-second held gestures, exact history,
strict v15/v16 persistence and graphics recovery are recorded. Touch/pen uses
browser emulation, not a physical phone. Pyramid hole/tunnel authoring remains
conditionally deferred as documented in the family review.

Stop here for Ember review and owner acceptance. No subsequent geometry or
host-site, database, hosting, Production or Docker work is included.
