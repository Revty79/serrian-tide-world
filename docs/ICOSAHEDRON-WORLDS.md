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


## Hollow composition

The Hollow family starts from published Solid checkpoint `8df93fa`. Both banks
use that same geometry, canonical authority, brush, session, worker and renderer.
The parent owns bank selection, host locking and the combined save checkpoint.
It does not create another terrain editor. Outside, fitted inside editing,
connected maps and read-only cavity inspection retain the accepted controls.

The concentric outer and inner icosahedra are equally oriented and homothetic.
Their supporting planes are parallel. The unit inradius interval multiplied by
the edge-length difference encloses the complete shell gap; the existing
`32768 * EPSILON * outerEdge` guard is subtracted from its lower bound. Every
inner vertex is independently checked against every outer plane. Convexity then
covers all inner edges and faces. Touching, reversed, nonfinite or ambiguous thin
shells reject explicitly. A spherical radius difference is not used as clearance.

Each bank has `10 N^2+2` independent canonical words and its own surface/terrain
identity and history. The ordinary -100 m ocean start must fit both physical
bounds. The explicit 0 m reference shell remains available; no initialization
silently clamps terrain. The bank elevation limit is the smaller of one quarter
of certified clearance and the accepted geometry dimension bound.

Unused format version 30 stores both banks and the selected surface, with the
same strict validation, checksum, cooperative atomic Open and exact Float32
contracts. Versions 1-29 retain their meanings. Undo stacks remain transient.

The [Hollow receipt](evidence/icosahedron-hollow/receipt.json) records its final
technical verification independently of the immutable Solid receipt. Owner
acceptance remains a separate step.

## Hollow qualification

The 19 focused shell, bank, painting/history, strict format and World-catalog
checks pass. The installed-Chrome run passes 22 complete browser cases, plus
two touch/pen emulation cases. Twelve short family regressions pass in about
one minute. Four additional north/lower pixel checks at N128/N256 complete the
Solid view set: the tested camera vectors collectively face every physical
triangle. Rendering code and geography were not changed for these captures.
TypeScript and the production build pass.

Both banks match the Solid foundation's exact canonical words and output pixels
at identical geometry, pose, detail, role, backend and 0/-100 m starts. All six
Hollow GPU/Canvas field comparisons pass: maximum stable channel difference is
2 (the unchanged gate is 3), with stable land/ocean coverage and zero coverage or
silhouette violations. Fitted inside and perspective cavity captures were also
visually reviewed. Cavity navigation preserves both word hashes and history;
N256 p95 input-to-pixels is 16.0 ms WebGL2 / 51.5 ms Canvas, with Canvas present
p95 47.6 ms.

Matched 60 km brush profile observations, in milliseconds:

| Detail / backend / bank | Ordinary face, edge, vertex | Four-second held |
| --- | ---: | ---: |
| N128 / WebGL2 / exterior | 46.4-50.2 | 36.2-36.7 |
| N128 / WebGL2 / interior | 50.0-54.8 | 37.4-38.5 |
| N128 / Canvas / exterior | 43.3-52.0 | 31.3-33.0 |
| N128 / Canvas / interior | 43.8-46.6 | 32.3-34.0 |
| N256 / WebGL2 / exterior | 57.2-78.4 | 39.7-43.0 |
| N256 / WebGL2 / interior | 65.0-80.7 | 41.3-56.8 |
| N256 / Canvas / exterior | 80.0-86.9 | 50.5-66.8 |
| N256 / Canvas / interior | 92.7-103.2 | 59.3-68.0 |

Default-size physical workflow observations:

| Detail / backend | Outside p95 | Inside p95 |
| --- | ---: | ---: |
| N128 / WebGL2 | 52.1 ms | 48.7 ms |
| N128 / Canvas | 52.0 ms | 44.7 ms |
| N256 / WebGL2 | 75.0 ms | 76.6 ms |
| N256 / Canvas | 88.5 ms | 85.2 ms |

The N128 WebGL2 UI workflow checks all thirty joins separately on each bank.
Both details/backends cover four tools, bank isolation, actual sharp pixels,
navigation, read-only inspection/return, exact history, v30 Save/Open and
continued painting. The N256 Canvas endurance run retains each bank's held
pointer for twenty seconds:

- Exterior: 2 epochs, 358,120 distance queries, 65.1 ms p95, zero discarded positions, one exact history operation.
- Interior: 2 epochs, 450,317 distance queries, 86.7 ms p95, zero discarded positions, one exact history operation.

The opposite bank's word hash stays unchanged. No latency, pixel, history or work
limit was relaxed. The profile is an observation on the recorded desktop, not
a physical-mobile qualification or a guarantee for every computer.

At N256 the two canonical authorities total 5,242,896 bytes and the two prepared
indexed caches total 152,681,216 bytes. Presenter atlases/backing, worker snapshots,
save checkpoints and bounded history remain additional allocations under the
same Solid mechanisms. No global numerical capacity or work limit increased.
Very wide work still fails explicitly with an exact undoable committed prefix.
The full evidence is in the Hollow receipt above; final owner acceptance remains
pending. This pass ends with this family.

## Keeping later regression checks proportional

`node node_modules/@playwright/test/cli.js test --config=playwright.polyhedron-smoke.config.mjs`
runs two short normal workflows per completed polyhedron family: create, paint,
exact replay, Save/Open and continued painting, on WebGL2 and Canvas. Icosahedron
joins that reusable suite. Deep geometry, bank, pixel and endurance checks stay
focused on the new family; broader rendering checks are added when a shared
rendering mechanism changes, as they were for the Solid atlas repair.

