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
merged. Hollow format 28 is reserved for the subsequent verified hollow stage.

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
Owner acceptance remains pending. Hollow implementation follows this published
Solid checkpoint; no next geometry or excavation work is included.
