# Dodecahedron Worlds

This pass follows the published decahedron checkpoint `10bcde8` and the owner's
shapes-first scope. It implements the regular dodecahedron through the existing
Atlas systems. Owner acceptance remains separate from technical verification.

## Physical and numerical foundation

The golden-ratio construction has 20 vertices, 30 physical edges and 12 outward
regular pentagons. Each pentagon retains one physical face ID. Three affine
triangle charts per pentagon share canonical vertex/edge words, including both
internal diagonals. These diagonals are absent from creator guides and region
selection. Area is `3 sqrt(25+10 sqrt(5)) e²`; volume is
`(15+7 sqrt(5)) e³/4`. Irrational physical vertices, chart coordinates and the
inradius use the accepted outward interval arithmetic.

N128 stores 294,914 canonical Float32 words; N256 stores 1,179,650. The numerical
capacity profile is qualified only for this exact geometry/detail combination.
Candidate, distance, history, worker and display backing budgets remain the
accepted limits. No existing saved geography or representation is reinterpreted.

The certified local method inherited from the decahedron selects all three
physical pentagons incident to a source vertex (nine numerical charts). Every
path escaping this domain must touch its physical boundary. An interval lower
bound on source-to-boundary distance excludes outside routes only when a feasible
local surface witness is shorter. Local route sets contain at most four routes
in the checked domains. Same-pentagon distances use a genuine straight segment
inside that convex planar pentagon. Ambiguous joins retain the original
portal/polyline witness solver and its precision limits.

For nonlocal fallback, convexity proves that a shortest route need not leave and
reenter the same physical pentagon. The generic unfolding kernel can therefore
exclude these chart detours when explicitly declared by this geometry. It still
retains all 4,151 simple physical routes for the checked adjacent pair. This is
not arbitrary route truncation. The 8,192-placement retained-cache limit remains
in force. Cold nonlocal exhaustive queries are more expensive than local brush
queries; Node timings are not used to establish editor responsiveness.

The fixed net attaches eleven real physical joins and all 24 internal diagonals.
All 36 numerical triangles pass pairwise interior separation, attached-edge
coordinate equality and projection/inverse-projection checks.

## Shared editor and presentation

The geometry supplies thin adapters to the existing canonical authority, brush,
worker protocol, cooperative preparation, indexed display cache, polygon color
atlas, polyhedral WebGL2/Canvas presenter, exact history and Atlas workspace.
Solid Save/Open uses version 27. Versions 1–20, reserved recovery 21–24 and
published decahedron 25/26 retain their meanings. The recovery branch is not
merged. Hollow format 28 uses the same strict physical representation with two independent banks.

Initial technical checks: 22 focused tests pass, including topology, dimensions,
canonical ownership, every physical edge/vertex/diagonal footprint at N128/N256,
near-join interval certificates against the original witness solver, all four
tools with exact whole-gesture history, field reconstruction and strict v27
round trips including signed zero. The 54-join browser sweep passes without a failed or discarded stroke.
N128/N256 incremental GPU and Canvas images, field arrays and complete polygon
color atlases match fresh reconstruction exactly. The N256 physical pixel
comparison passes the unchanged three-channel-level color tolerance, with no
coverage, silhouette or internal-diagonal gaps. The full suite passes 1,560/1,560; TypeScript and production build pass.
The receipt resolves initial failed fixtures against their final passing cases.

Evidence and final measured results will be recorded at the publication
checkpoint. Holes, tunnels, links, arbitrary excavation and the next geometry
remain outside this pass.

The polygon atlas dirty update now projects the complete neighboring
interpolation-cell stencil. Bounded immutable UV ranges for 16-pixel gutter
tiles also find clamped off-polygon texels that feed silhouette filtering. Their
Float64 allocation is included in the display-cache resource receipt. No full
polygon repaint is required for an ordinary boundary dab. Pixel fixtures use
physical atlas coordinates and an independent canonical sign-change mask
through the actual Canvas minification filter; the terrain color tolerance
remains three channel levels. Both stable land and ocean remain required.

## Solid publication verification

All 33 unique browser cases pass after the recorded corrections: normal editor
workflows at both details and backends, the complete 54-join sweep, physical and
map painting, sustained face/edge/vertex painting, exact history, v27 Save/Open,
continued editing, worker-fault recovery, graphics loss/restoration, real pixel
comparisons, touch/pen emulation, four matched Octahedron performance references,
eight prior-family smoke checks and two decahedron incremental-image checks.
The eight prior-family smoke checks took about 36 seconds in total.

| Detail/backend | Ordinary face/edge/vertex p95 input-to-visible | Held painting p95 |
| --- | --- | --- |
| N128 WebGL2 | 56.5–57.7 ms | 39.2–44.0 ms |
| N128 Canvas | 41.0–46.7 ms | 26.5–27.5 ms |
| N256 WebGL2 | 66.2–84.1 ms | 43.7–69.0 ms |
| N256 Canvas | 66.5–91.2 ms | 38.0–57.2 ms |

The matching Octahedron ordinary ranges are 32.4–44.8 / 25.8–42.1 ms at N128
(WebGL2 / Canvas), and 49.8–51.3 / 50.7–54.5 ms at N256. Dodecahedron has a larger
authority and display: N256 owns 1,179,650 canonical samples and about 117 MB of
cache ArrayBuffers per bank. Its held numerical commit times remain close to
the reference; display and initial preparation add measurable latency. The
actual editor remains responsive, with no discarded positions, failed strokes
or increasing backlog in these profiles. These are development-PC results,
not a guarantee for every physical mobile device.

Actual hardware is the RX 6600 through Chrome/ANGLE D3D11, with software=false.
Desktop captures use 1440×950 backing within the existing 1.5-million-pixel cap.
Stable land and ocean colors stay within the unchanged three-channel-level
limit; final observed maxima are one level. Silhouette, coverage and internal
polygon seams have no violations. Viewing leaves canonical hashes unchanged.
The browser touch/pen qualification uses Pixel 7 emulation, not a physical phone.

Raw timings, source hashes, compact reports, resource receipts and selected
pixels are in [the Solid receipt](evidence/dodecahedron-solid/receipt.json).
Owner acceptance remains pending. Solid was published as `ba2941a8e96c730839799dd96266ec71393c99f6` before
Hollow implementation began. No next geometry or excavation work is included.

## Hollow implementation and focused verification

Hollow Dodecahedron composes two published Solid sessions. Its concentric,
homothetic regular dodecahedra use distinct surface/terrain IDs, canonical
arrays and histories. Supporting-plane clearance is the interval-enclosed
unit inradius times the outer/inner edge-length difference, less the accepted
roundoff guard. Every inner vertex is checked against every actual outer plane.
The cavity and material volumes use the regular solid formula; no sphere or
box is substituted. Reversed, touching, nonfinite and ambiguously thin shells
reject. Per-bank finite elevation bounds remain conservative; geography is
never clamped to conceal an invalid shell. Safe worlds start at -100 m; the
explicit 0 m reference shell remains available.

Both banks inherit the exact Solid terrain, painting, renderer, workspace,
worker, camera and history mechanisms. Paint Inside uses inward normals and a
fitted editing overview. Cavity inspection is read-only; returning restores
editing pose and controls. Parent v28 saves both complete Float32 banks and the
selected bank, with strict metadata/count/clearance/integrity checks and atomic
replacement. Transient undo stacks remain transient.

The focused numerical/format/catalog run passes 19/19. It covers real plane
containment, invalid/thin cases, bank identities and isolation, inward normals,
all four tools across the three-face vertex and pentagon diagonals, exact history,
failed-dab prefix recovery, signed-zero round trips at N128/N256, corruption and
source-lease/cancellation rejection. The production build and TypeScript pass.
The preceding Solid checkpoint preserves the full 1,560-test run; it is not
represented as a new full-suite execution after the Hollow additions.

Matched 0 m and -100 m references at both details produce identical words and
identical Solid/Hollow pixels on WebGL2 and Canvas for both bank roles. Actual
N256 cavity navigation measures 21.2 ms p95 input-to-pixels on hardware WebGL2
and 67.0 ms on Canvas (63.1 ms p95 Canvas presentation), without terrain or
history writes. Outside, fitted-inside and cavity pixel evidence uses the
appropriate physical-polygon or perspective triangle atlas support. Stable
land and ocean retain the three-level color tolerance, with independent
canonical coast-support masks; coast edge pixels retain their backend-specific
accepted reconstruction. Raw paired captures are provided for review.

| Detail/backend | Outside ordinary p95 range | Inside ordinary p95 range |
| --- | --- | --- |
| N128 WebGL2 | 54.7-60.4 ms | 55.8-61.0 ms |
| N128 Canvas | 29.6-48.0 ms | 32.1-58.2 ms |
| N256 WebGL2 | 66.5-83.8 ms | 75.1-100.2 ms |
| N256 Canvas | 70.5-95.3 ms | 80.9-87.9 ms |

The existing work limits remain in force. Very wide work can exhaust a bounded
operation and retain an explicit undoable failed prefix; it is never reported
as a successful incomplete footprint. Nonlocal distance queries retain the
complete, more expensive physical-route fallback. The audited ordinary
footprints and local stroke transitions use the certified local method.

All 35 unique Hollow-stage browser checks pass: 22 core cases (including the
initial workflow), two touch/pen cases, ten short prior-Solid workflows and a
fresh N256 Canvas Hollow Decahedron performance reference. The prior reference's
worst ordinary p95 is 90.7 ms; Hollow Dodecahedron's worst is 100.2 ms. The ten
short prior-Solid workflows together take about 51 seconds.

The 20-second N256 Canvas map gesture completes on each bank with no failures:
exterior uses two worker epochs and 503,478 distance queries; interior uses three
epochs and 579,156 queries. Each remains one exact Undo/Redo operation, preserves
the opposing bank, and measures 77.1 / 71.2 ms p95 input-to-visible response.
All six Hollow pixel comparisons pass with stable-color maxima of two channel
levels, zero coverage/silhouette/diagonal violations and unchanged canonical
hashes. Context loss/restoration retains both painted banks. All four ordinary
Hollow workflows preserve both banks and selected role through v28 Save/Open,
then continue painting with exact replay.

The [Hollow receipt](evidence/dodecahedron-hollow/receipt.json) includes compact
reports, source hashes, raw timings, owned ArrayBuffer counts, actual paired
pixels and selected workflow captures. The main checkout and remote commit
are verified separately at publication.
Owner acceptance remains pending. Physical mobile hardware is not qualified
by the browser-emulated touch/pen checks. No holes, tunnels, links, arbitrary
excavation, host integration, deployment or subsequent shape is included.
