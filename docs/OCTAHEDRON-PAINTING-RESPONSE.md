# Octahedron multi-face painting correction

This is Priority 1 of the [2026-10-23 course correction](ATLAS-PHASE2-COURSE-CORRECTION.md),
starting from `7d6a3f7`. The previous 300 ms painting gates did not establish
creator-usable multi-face response. This checkpoint measures and corrects the
reported defect before adding Octahedron connections.

## Measured cause and resulting behavior

With identical 60,000 m radius, 200 m/dab strength, -100 m starting terrain,
numerical detail, camera scale and backend, the original N256 four-face vertex
work took roughly 19-25 ms per dab in certified distance queries. One-face
queries were much cheaper. Display cost was similar between these modes.

Two related costs caused the difference. The prepared solver compiled and
tested global routes for nearby samples even when every shorter route was
provably confined to the local vertex neighborhood. A source or endpoint
exactly on a real join also failed the strict-interior portal test, causing
expensive grazing fallback. Repeated worker retirement added numerical warm-up
to later gestures. Candidate discovery, commit, atlas updates and GPU upload
were measured separately; they were not hidden by changing strength, smoothing,
resolution or geography.

The final matched vertex p95 input-to-captured-pixels results are milliseconds:

| N256 bank / backend | Ordinary before | Ordinary after | Held before | Held after |
| --- | ---: | ---: | ---: | ---: |
| Solid WebGL2 | 138.6 | 55.6 | 72.7 | 36.4 |
| Hollow outside WebGL2 | 142.5 | 56.2 | 69.7 | 38.8 |
| Hollow inside WebGL2 | 193.0 | 65.8 | 90.6 | 52.9 |
| Solid Canvas | 139.9 | 53.2 | 66.9 | 37.1 |
| Hollow outside Canvas | 135.0 | 57.2 | 71.0 | 39.6 |
| Hollow inside Canvas | 184.0 | 57.4 | 89.2 | 55.0 |

Certified distance work per ordinary N256 vertex dab falls to approximately
2.1-3.2 ms. At N128, ordinary vertex p95 falls from 74-92 ms to 40-47 ms;
held vertex p95 is 26-32 ms. All **36 ordinary before/after elevation hashes
match bit-for-bit**, including face, edge and vertex cases on each bank and
backend. Undo/Redo replays the complete exact words, not an approximate footprint.

The 72-scenario matrix uses a physical one-face circle, a circle unfolded across
a real edge and a closed four-face vertex ring. Planned path length is 240 km;
the 72-segment circle approximation is about 239.924 km, versus the 240 km ring.
Each before/after pair uses exactly the same points and numerical parameters.
Ordinary gestures traverse one cycle; sustained gestures retain the pointer
for four seconds. Timing records separate input-to-commit and commit-to-pixels.
Actual per-gesture travel, candidate counts and committed dabs remain in the raw
records. The final matrix requires p95 below 125 ms ordinary / 100 ms sustained,
with unchanged sharp backing and no discarded positions.

## Certified reuse and bounded execution

`polyhedron-local-domain.ts` selects the actual incident faces around a physical
vertex. It encloses the source-to-boundary distance using outward intervals.
Every surface route leaving those faces must reach a boundary segment first,
including its endpoints. Its length is therefore at least this ambient
source-to-boundary **lower bound**. If an actual feasible in-domain route's
upper bound is smaller, no outside route can be shortest. The accepted unfolding,
portal and witness machinery then suffices within that domain. Otherwise the
complete global solver is retained. No radius cutoff or ambient chord is
returned as a surface distance.

Exact triangle source/end membership fixes a portal parameter to 0 or 1;
convexity and ordered remaining crossings provide the real face-path witness.
For the implicit barycentric edge, TwoSum's residual must be zero: a rounded
`u+v===1` alone is insufficient. Ambiguous internal grazing retains the existing
fallback. Physical interval helpers are shared with the exhaustive reference;
that reference remains available for comparisons and unsupported local proofs.

The outward binary64 successor/predecessor uses two exact uint32 words instead
of allocating BigInts at every elementary interval operation. Directed results
match an independent BigInt reference across exponent/carry boundaries, zero,
subnormals, infinities and 50,000 seeded bit patterns. Error tolerances, candidate,
distance, path, queue, history, work-epoch and display limits are unchanged.

Completed worker runtimes already release their private terrain epoch. The host
may now retain that idle compiled realm after a validated `done` response.
Every new task still validates fresh geometry, identities and a private word
snapshot, under a fresh task ID and revision lease. Cancelled, malformed and
failed tasks retire the worker. Expendable hover previews do not consume the
retained painting worker. At most one idle painting realm plus one active
preview/painting task exists, as before. Tests cover reuse across four tools and
different metadata, exact history, preview isolation, cancellation, corruption
and disposal. There is no retained terrain authority in an idle worker.

## Evidence and verification boundary

The source-frozen final run passes all 1,497 unit checks and build/TypeScript,
plus 61 serial browser cases: eight performance cases / 72 scenarios, 17 Hollow
Octahedron, 15 Solid Octahedron, two touch/pen emulation, eight Pyramid, two
Solid Tetrahedron, two Hollow Tetrahedron and seven earlier-editor regressions.
These cover 20-second held strokes and work-epoch rollover, all twelve joins,
four tools, exact Save/Open, worker and graphics failure recovery, actual
GPU/Canvas pixels and the accepted Open Cylinder wall/rim endurance gates.
There are no unexpected failures, flaky cases, retries or skips.

The [receipt](evidence/octahedron-painting-response/receipt.json) verifies 681
frozen source/config inputs and 192 artifacts. The eight-case baseline is
reproducible from the original Git tree plus eight exact instrumentation/fixture
source overrides, independently checked against all 578 frozen baseline inputs.
Every ordinary before/after word hash matches. Geometry, terrain influence and
history kernels, rendering and old persistence implementations retain their
source hashes; the exhaustive reference and interval-step comparison independently
check the numerical changes. Actual fitted/vertex captures were visually inspected.
Mobile evidence is trusted touch/pen under browser emulation, not a physical
device or owner-session attachment. The existing bundle-size warning remains
nonblocking.

Instrumentation is opt-in and bounded. Worker input/ack/result transport uses
cross-realm epoch timestamps; worker scheduling wait, candidate selection,
source preparation, certified distance/path, canonical commit, atlas update,
GPU upload and presentation are recorded separately. Inclusive stages overlap:
source preparation is inside distance work, and distance/candidate work is inside
dab preparation. Their totals must not be added as independent time. Captured
pixel epochs provide the input-to-visible evidence.

This remains the existing shared painting and rendering system. No saved format
is changed, and no existing map is reinitialized. Basic connections remain a
required subsequent family checkpoint, with advanced displaced excavation
outside this assignment. Technical performance evidence is separate from the
owner's acceptance of painting feel.
