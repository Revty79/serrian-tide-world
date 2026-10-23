# Icosahedron Worlds

This shapes-first pass follows `ea56878`. Creator labels use the actual shape
name. Technical verification and owner acceptance remain separate.

## Geometry and numerical methods

The regular icosahedron uses the twelve cyclic golden-ratio vertices
`(0, +/-1, +/-phi) e/2`, with twenty outward equilateral triangles and thirty
edges. Five triangles meet at every vertex. Its area is `5 sqrt(3) e^2`, volume
is `5 (3+sqrt(5)) e^3/12`, inradius is `sqrt(3) (3+sqrt(5)) e/12`, and circumradius
is `sqrt(10+2 sqrt(5)) e/4`. Physical vertices and chart coordinates use outward
interval arithmetic. Faces are genuine physical triangles, without decorative
sphere projection or extra numerical subdivisions into polygon charts. Each real
triangle declares its own physical-face identity. This lets the existing
physical-face atlas supply correct opaque filter gutters, while terrain and
distance calculations retain the same twenty triangular charts.

The accepted triangular lattice owns each physical vertex and edge sample once.
Its canonical count is `10 N^2+2`: 163,842 at N128 and 655,362 at N256. The fixed
connected net attaches nineteen real edges. Tests check pairwise interior
separation, attachment coordinates, inverse picking, every edge and all vertices.

The accepted local distance certificate selects a five-face vertex star. Every
route leaving it must reach its boundary; a certified ambient distance to that
boundary is only an exclusion lower bound. A shorter feasible local surface
witness establishes global optimality. Accepted influence always uses intrinsic
surface distance. Ambiguous portal signs retain the original interval/polyline
witness solver and its precision requirements.

The dual graph has at most 780 simple routes for a face pair. Exhaustive global
fallback is therefore viable without arbitrary route truncation. Cold Node
probes took roughly 85-136 ms for nonlocal route preparation; those probes do
not establish painting responsiveness. Short vertex probes took under 1 ms.
Existing exact shared-chart witnesses and ambiguous local certificates are
selected through those truthful physical-face identities. Retained geometry caches are capped at
8,192 placements, and moving-source global target caches at four entries.
Eviction changes reuse only; all required routes are still evaluated.

## Shared implementation

Thin geometry adapters reuse the triangular terrain authority, certified brush,
connected worker runtime, scheduling, input, preview, history and Atlas controls.
The indexed polyhedral display field, accepted palette and physical relief,
four-ray WebGL2 presentation, sharp Canvas atlases, backing policy, context
recovery and common projection factory remain the rendering foundation.

Raise, Lower, Smooth and Flatten retain the common radius/strength semantics.
The default radius uses the accepted edge-based policy already used by the
dodecahedron: `0.0837 * edge`, subject to the existing three-spacing minimum.
It is 83.7 km for a 1,000 km edge, with 10.7 / 21.4 lattice spacings per radius
at N128 / N256. The initial minimum-dimension default was 126.5 km and measured
149.1 ms p95 on N256 Canvas, so it was not adopted. Radius controls and all brush
arithmetic remain unchanged. Work limits,
history limits and rendering backing budgets are unchanged. Oversized work
fails explicitly and retains exact undoable committed prefixes.

Solid persistence uses unused format version 29, with strict geometry, identity,
detail, count, finite-bound, timestamp, encoding and checksum validation.
Float32 words, including signed zero, round-trip exactly. Undo stacks remain
transient. Versions 1-20, the recovery allocations 21-24, and 25-28 keep their
existing meanings.

## Solid qualification

Installed Chrome 134.0.6998.166 uses the AMD Radeon RX 6600 through ANGLE/D3D11,
with `software:false`. The explicit Canvas run disables WebGL2. The matched
Octahedron-correction profile retains a 60 km brush, 200 m/dab strength, 240 km
paths, 72 input segments, and ordinary/four-second held gestures. The vertex
ring spans the actual five-face cone, with angle `5 pi/3`.

Observed p95 input-to-captured-pixel ranges, in milliseconds:

| Detail / backend | Ordinary face, edge, vertex | Held face, edge, vertex |
| --- | ---: | ---: |
| N128 / WebGL2 | 50.4-52.2 | 34.4-36.7 |
| N128 / Canvas | 37.3-49.6 | 26.7-33.6 |
| N256 / WebGL2 | 58.3-72.6 | 36.0-41.2 |
| N256 / Canvas | 63.2-78.6 | 50.8-53.1 |

These are observations on this computer, not universal latency guarantees.
The unchanged gates remain below 125 ms ordinary and 100 ms held. Default-size
brush workflows are measured separately in the workflow records. All profiles
retain sharp 1440 x 950 backing, worker execution, complete input, and exact
whole-gesture replay.

The indexed cache owns 19,727,984 bytes at N128 and 76,340,608 at N256 after full
preparation, including fields, canonical aliases, initial atlases, physical-face
atlases, gutter indices and gradient stencils. Authority uses 655,368 / 2,621,448
bytes per surface. GPU fields use 5,325,120 / 21,135,680 bytes. Presenter atlas
copies, Canvas tiles, backing surfaces, history and worker snapshots are
additional bounded allocations; these figures are not whole-browser RSS.
History remains 32 entries / 8 MiB / 262,144 stroke samples. Preview and stroke
candidate/query/box/patch and queue caps retain their accepted values.

The first actual Canvas capture exposed dark one-pixel face joins. The inherited
triangular texture's transparency/filter edge and clip composition caused the
coverage loss. Each real triangle now supplies its truthful physical-face
provenance to the existing polygon atlas, with its proven opaque clamped
filter gutters. Canvas pattern presentation combines complementary polygon clip
coverage without multiplying it by a second image-rectangle edge. It uses the
same numerical field, colors, gradients, atlas density and geometry. This small
shared physical-atlas repair also applies to existing decahedron/dodecahedron
fitted views. Other accepted rendering paths remain intact. The final -100/0 m
join probe checks 20,500 interior join pixels per height, with minimum alpha 254
and zero violations of its original alpha-250 gate.

Affected-family mathematical, ownership, worker, history, rendering and
persistence checks cover 60 test files. The initial run passed 228/229; one new
reference comparison incorrectly required identical rounding from two different
certified distance enclosures. Its corrected independent test uses the existing
published pre-round error bounds plus Float32 rounding, with fresh nonconstant
geography. That two-case rerun passed. Exact history and persistence word gates
were unchanged. TypeScript and the production build pass; the existing bundle
size notice remains nonblocking.

Raw reports, timings, captures, diagnostics and normalized source hashes are
preserved in [the Solid receipt](evidence/icosahedron-solid/receipt.json).
The publication matrix passed 20 new-family browser cases, 20 selected prior-family
regression cases, and two touch/pen cases. Nine affected default/recovery workflows
then passed again with the adopted edge-based default and stricter 125 ms ordinary /
100 ms sustained gates. The final 19-case Icosahedron unit run, TypeScript and build
also passed. The earlier assertion diagnostic and pre-adoption timings remain in the
receipt; they are not represented as passing final-default evidence.
Touch evidence uses Pixel 7 browser emulation with trusted CDP touch/pen, not a
physical device. Owner acceptance remains pending.

No hosting, database, website, holes, tunnels, links, excavation or subsequent
shape work belongs to this pass.

### Adopted default and endurance

| Default workflow | N128 WebGL2 | N128 Canvas | N256 WebGL2 | N256 Canvas |
| --- | ---: | ---: | ---: | ---: |
| p95 input-to-pixels | 51.7 ms | 59.0 ms | 95.0 ms | 115.8 ms |

The 20-second N256 WebGL2 map gesture completed 2 work epochs / 471,380 distance queries, at 44.5 ms p95, as one exact undoable operation.

The 20-second N256 Canvas map gesture completed 2 work epochs / 388,110 distance queries, at 66.1 ms p95, as one exact undoable operation.

