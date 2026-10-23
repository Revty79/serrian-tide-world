# Dodecahedron: measured architecture stop

This is the historical stop report. The later shapes-first implementation uses
the decahedron polygon adapter and certified local domains; see
[Dodecahedron Worlds](DODECAHEDRON-WORLDS.md) for the subsequent implementation,
current verification and remaining acceptance status. The measurements below
retain their original diagnostic scope.

Overnight Queue 2 Pass 3 stops at a diagnostic architecture review. The last
operational checkpoint is Solid/Hollow Octahedron, published at
`b111fe3c85a8f80f5c856c28131f74f5a2cbf8d1`. No Dodecahedron editor, terrain
authority, saved format, production geometry provider or selector is delivered.
Pass 4 and the sequential Icosahedron passes have not started. Full-family
Pass 7 is therefore not complete.

The owner's instruction is explicit: "If a major architectural obstacle
appears, document it, preserve the last passing checkpoint and stop that
expansion rather than forcing an invalid solution." The two obstacles below
require a shared topology/distance architecture checkpoint before interactive
pentagonal terrain can meet the accepted correctness and responsiveness gates.
This is a technical stop under that rule, not an owner-acceptance decision.

## Reproducible, bounded investigation

Run from the standalone repository root:

```powershell
node scripts/probe-dodecahedron-architecture.mjs .local/dodecahedron-topology.json
node --expose-gc --max-old-space-size=512 scripts/probe-dodecahedron-architecture.mjs .local/dodecahedron-benchmark.json --benchmark
```

The diagnostic is independent of terrain arrays and saved worlds. It derives
supporting planes from the standard 20 golden-ratio vertices, verifies 12 convex
regular pentagons and 30 twice-owned edges, outward winding, three edges at
each vertex, equal side lengths, 108-degree planar angles and equal physical
dihedrals. The resulting dihedral is approximately 116.565051 degrees.

These Float64 constructions are **diagnostic**, not an interval-certified
production geometry provider. No successful certificate is claimed for this
rounded model. Exact BigInt dynamic programming counts all simple physical
face routes with at most `12*2^12` memo states per endpoint; it never allocates
the full global route cache. One adjacent-pair allocation and prepared-kernel
benchmark are optional, with a separate 512 MiB Node old-generation heap limit.

Three fresh benchmark processes ran serially at BelowNormal priority on the
development PC, Node v24.18.0. They do not measure browser input-to-visible
latency, GPU presentation or a completed Dodecahedron brush. Raw reports and
source hashes are in the [receipt](evidence/dodecahedron-architecture/receipt.json).

## Current chart contracts cannot represent a pentagonal face

The shared geometry interface exposes `isTriangle(face)`. Its consumers interpret
false as a four-corner chart. Relevant implementation points are:

- `src/terrain/triangular-polyhedron.ts`: requires real triangles and stores
  vertex/edge/triangle-interior canonical samples. The actual sample-count
  function rejects the genuine pentagonal incidence at N128 and N256 before
  allocation, as the probe verifies.
- `src/surfaces/polyhedron-path.ts`: `nativePoint` chooses vertex 2 or 3 as
  the second chart direction; `physicalBounds` uses exactly three barycentric
  or four bilinear vertex weights. A fifth physical vertex is not represented.
- `src/surfaces/polyhedron-distance-prepared.ts`: assumes the corresponding
  affine chart directions and coordinates in `[0,1]` for its coefficient bounds.
- `src/rendering/pyramid-field.ts`, `polyhedron-presentation.ts`,
  `polyhedron-perspective-atlas.ts` and `triangular-polyhedron-view.ts`: sampling,
  ray coverage, clipping, map picking and field reconstruction use triangle or
  square domains. Their terrain-quality policy is reusable, but a pentagonal
  numerical/chart adapter is not present.

The probe makes the mismatch concrete. In the existing non-triangle vertex-0,
vertex-1, vertex-3 basis, one regular-pentagon vertex has coordinates
`(-0.61803398875, 0.61803398875)` outside the accepted unit square. At an interior
`(u,v)=(0.5,0.25)` on a 1,000,000 m edge, the existing four-vertex bilinear
physical formula differs from the affine chart point by **77,254.249 m**.
Calling a pentagon a non-triangle would therefore corrupt physical certificates
as well as clipping valid geography. This is not a proposal to alter elevations
or hide a display defect.

A correct pentagonal provider is possible. Internal triangulation can reuse
accepted mathematical kernels, but it needs one canonical pentagonal terrain
identity, exact welded internal ownership, physical-face routes and a consistent
sampling/rendering contract. Declaring 60 independent triangular faces would
introduce artificial geography and does not satisfy the assignment.

## Exhaustive route preparation is not responsive at this topology

The genuine face graph has 12 nodes of degree five. From one representative
face there are 4,151 simple routes to each adjacent face, 4,734 to each of five
other faces and 5,170 to the opposite face. Accepted Octahedron has 15, 16 or
18 respectively. These are exact graph counts; the optional allocation benchmark
independently confirms 4,151 and 15 with the actual `polyhedronUnfoldings` code.

**The 32,768 route safety cap is not exceeded.** That initial possibility was
tested and disproved. The failure is time/memory scaling below the cap.
`polyhedronUnfoldings` allocates all simple paths before any endpoint portal
exclusions. Prepared distance builds per-source coefficients for all those
routes; moving the brush source invalidates that prepared cache.

The following ranges come from the three fresh runs, one adjacent pair only:

| Existing mechanism | Octahedron reference | Diagnostic Dodecahedron |
| --- | ---: | ---: |
| Routes / retained placement references | 15 / 90 | 4,151 / 41,120 |
| Cold unfolding allocation | 2.1-3.0 ms | 130.9-151.1 ms |
| Retained unfolding heap delta after GC | 0.14-0.15 MB | 23.49 MB |
| First prepared source/endpoint | 2.7-20.4 ms | 219.1-256.0 ms |
| Moving-source query median, eight per run | 0.92-1.51 ms | 200.2-214.2 ms |
| Moving-source query range across runs | 0.74-1.67 ms | 186.5-280.7 ms |
| 64 warm endpoint queries, same source | 3.11-4.35 ms total | 115.6-157.0 ms total |
| Retained prepared-source heap delta | 0.07-0.11 MB | 27.11-27.16 MB |

The diagnostic only feeds strictly interior points near a real common edge into
the accepted preparation/evaluation kernel. Its rounded charts are sufficient
to expose allocation/work scaling; their returned values are not promoted to
certified distance evidence. Heap deltas are process-local GC observations,
not browser memory or total World memory. RSS deltas and all timing samples are
reported separately; no unmeasured whole-world multiplication is presented as
an allocation measurement.

Roughly 200 ms for a single new-source/endpoint kernel call is already slower
than an accepted complete ordinary Octahedron dab and display. A real brush has
many candidates and additional work. A worker preserves input handling but does
not remove this commit latency. Prewarming geometry alone does not fix it: the
moving-source tests run with the geometry unfolding cache already warm.

## Required next architecture checkpoint

Before continuing Pass 3, establish a genuine pentagonal canonical provider and
geometry-domain contract, preserving the indexed authority, shared brush tools,
worker protocol, exact history and atomic storage. Add a bounded certified route
strategy or certified early exclusions that avoid exhaustive per-source work;
prove that exclusions cannot remove a shortest feasible route. Bound retained
caches as well as query counts. Reuse the accepted palette, interpolation,
antialiasing, Canvas and WebGL mechanisms through a polygon/triangulation adapter.

The restart gate needs physical edge/three-face vertex coverage, canonical
ownership and internal-triangulation seam tests, numerical footprints and memory
at N128/N256-equivalent physical density, then actual development-PC painting
and pixel evidence. Those are future requirements, not delivered capabilities.
No route truncation, ambient-chord substitution, safety-budget increase, new
painting engine or unrelated renderer was introduced during this investigation.

Production source, existing maps and the verified Octahedron implementation are
unchanged from `b111fe3`. The diagnostic script, evidence and this handoff are
the only additions after that operational checkpoint.
