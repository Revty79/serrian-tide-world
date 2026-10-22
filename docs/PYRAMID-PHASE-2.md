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

## Remaining authorized sequence

1. Certified paths, physically sampled brushes and four-tool numerical editing.
2. Operational Solid Pyramid in New World / Map, views, pixel/performance tests
   and a strict new save version. Publish before the full hollow implementation.
3. Nested closed Hollow Pyramid, independent banks and proven shell clearance.
4. Operational hollow outside/inside editing, read-only cavity inspection,
   editable nets, persistence and compatible connection interfaces.
5. Final existing-family regressions, actual Canvas/WebGL pixels and measured
   input-to-commit / commit-to-visible evidence, then stop for owner review.
