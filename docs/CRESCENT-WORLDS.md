# Crescent Worlds

## Foundation checkpoint A

The physical provider is `physical-prismatic-crescent`, generation version 1.
The reference body is a closed extrusion of a polygonal crescent, with two real
planar geographical caps and real concave/convex lateral walls. Its wide central
body tapers continuously to two terminal vertical edges. End cap charts are
positive-area triangles, not collapsed quads or duplicate vertices. This is a
faceted physical solid; it is not a smooth surface hidden behind a faceted
approximation, a missing Ringworld section, texture mask or illuminated sphere.

Let R = World Size / 2, a = (360 − Opening)π/360 and t range from −1 to 1
over 32 equal angular intervals. With b = cos(πt/2), define
f(t) = b[1 + q(1 − b²)], q = 0 for Fine tips or 0.4 for Full tips.
The two outline curves are
`(Curvature × [R ± Width f(t)/2] cos(at), [R ± Width f(t)/2] sin(at))`.
Their endpoints coincide. Straight segments between these vertices DEFINE the
physical outline; fixed-order polynomial arithmetic reconstructs the same
binary64 coordinates independently of host sine/cosine implementations. The
solid is this bounded planar domain times `[-Thickness/2, Thickness/2]`.

World Size supports 100,000–1,000,000,000 m, Curvature 0.8–1.25, Opening
60–160°, Body Width 12.5–30% of World Size, Thickness 20–60% of Body Width,
and Fine/Full tip profiles. Opening measures the unscaled bend's angular gap. Curvature scales its x dimension, preserving
the circle-derived tapered profile while changing its physical curvature.
Parameters are immutable per World; changing topology after painting does not
trigger an automatic terrain remap. Unsupported parameters reject without
clamping. The default is Size 2,000,000 m, Curvature 1, Opening 90°, Width
500,000 m, Thickness 200,000 m and Fine tips.

There are 128 vertices, 128 physical polygons, 252 numerical triangles and
378 numerical edges. Euler characteristic is 2; every edge has exactly two
oppositely directed incident charts. Area is twice the planar domain area plus
perimeter times thickness; volume is planar area times thickness. Each chart
has an exact affine physical metric. Upper and lower surfaces remain separate;
their real wall/terminal connections share canonical words correctly.

The accepted triangular indexed authority supplies vertex/edge/interior ownership,
Float32 storage, validation and atomic patches. Equivalent N128/N256 profiles
use 32/64 subdivisions per chart, with `126 n² + 2` canonical samples:
129,026 / 516,098 words (516,104 / 2,064,392 authority bytes). New terrain starts
at the shared -100 m ocean. Elevations are bounded by ±Thickness/8, preserving
the accepted reference-surface architecture without introducing displaced meshes.
World, surface and terrain IDs are distinct. Existing geography is never changed
to hide a display defect or to fit a new representation.

Eight numerical foundation checks pass, including representative narrow, broad,
strong and gentle configurations, simple outlines, convex/concave turns, valid
terminal triangles, manifold orientation, physical area/volume, exact metrics,
deterministic reconstruction, welded aliases and independent upper/lower words.
Both detail profiles preserve exact private Float32 snapshots including negative
zero. TypeScript and production build pass. Frozen evidence and source hashes
are in `evidence/crescent-foundation/receipt.json`.

At checkpoint A this was a physical/numerical foundation; Crescent was not yet
exposed as an operational Atlas World. Certified concave-surface routing, brushes,
presentation, navigation, persistence and real-browser qualification continue
under the same authorized pass. In particular the existing convex polyhedron
global route enumeration must not be applied unchanged to this concave body:
shortest routes can pass through saddle vertices. See the
[CGAL shortest-path model](https://doc.cgal.org/latest/Surface_mesh_shortest_path/index.html)
for that distinction. Existing authority, brush, worker, history and appearance
mechanisms remain the integration targets. No other shape or excavation work
is authorized by this foundation.

## Operational checkpoint B

Crescent World is now a normal Atlas creation choice. All six parameters above
are meaningful physical dimensions/profile choices, with N128/N256 equivalent
detail. Upper, Underside, convex exterior, concave interior and both terminal
neighborhoods are editable. Physical view, World overview, physical Pan World,
Fit/zoom and six region centers use the accepted workspace. Upper and Underside
maps preserve the true crescent outline. The wall map develops the real closed
perimeter into a strip; the complete map coordinates these three charts. Dashed
boundaries are honest projection cuts. Use Physical view to cross cap/wall joins.

The accepted triangular authority, canonical aliases, four brush calculations,
rolling worker transport, host-authoritative atomic commits, proposal leases,
preview scheduling, exact whole-gesture history, controls and Atlas lifecycle
are reused. Private workers receive independent elevation snapshots. A bounded
single-entry immutable geometry cache avoids reconstructing identical geometry
for each private worker epoch; it contains no elevations, history or camera.
The terrain wrapper forwards the authority's live revision getter, rather than
capturing its initial value in an object spread.

### Physical distances and influence

A cap's shortest route is the shortest path inside the actual planar crescent
domain: exact-sign visibility predicates and interval-weighted Dijkstra over the
finite outline vertices. This is globally valid on the solid because orthogonal
projection of any competing surface path remains in that domain and cannot
increase length. The chord across the empty opening is rejected. Upper and lower
caps are independent; a route through the material is never admitted.

The lateral boundary develops exactly into perimeter/height coordinates. Local
cap/wall hinges and three-sector vertex cones include real convex and saddle
vertices. At a saddle, a shortest route may pass through the actual apex.
Outward interval arithmetic and verified Taylor angle enclosures bound these
routes. The independently implemented 70-digit Decimal reference checks 384
cone/apex cases across four configurations: 260 cone and 124 saddle-apex routes,
with zero failures and maximum interval width 5.18e-9 m.

For the remaining bounded neighborhood, a shortest route shorter than half the
thickness cannot visit both caps. Any repeated visit to one cap can be replaced
by its nonexpansive planar projection. Enumerate real perimeter entry/exit edges,
unfolded straight routes and planar reflex-vertex routes, including the feasible
wall-only class and both cap classes. The numerical unfolding guard is explicitly
`64 * 32768 * Number.EPSILON * R`; the qualification margin is eight times that
value. Its finite, scale-relative bounds are checked against the requested
precision. This is not a claim of arbitrary-distance wall-to-wall qualification.
Outside the qualified domain, the operation rejects explicitly and preserves
an exactly undoable committed prefix.

Candidate pruning uses ambient distance or planar projection only as LOWER
bounds. Actual influence uses physical surface distances. Connected native
pointer curves are subdivided through real material before the unchanged input
budget; their feasible path need not itself be the globally shortest route.
Brush radii remain below 24% of thickness; existing candidate, distance, input,
worker and history limits are unchanged. On a small World, choose strength to
suit its finite elevation clearance. Repeated 200 m/dab strokes can reach the
minimum-size World's +/-312.5 m elevation bound; use a lower strength there.
No silent height clamping or reinterpretation is introduced.

### Accepted field and sharp presentation

Crescent uses the actual polyhedral numerical display cache, physical-gradient
stencils, PolygonColorAtlas, cube-derived palette/relief and four-quarter-pixel
GLSL color pass. Coplanar cap strips share gradient stencils across their
artificial radial joins; other geometries keep their existing region rules.
Dirty field, atlas and texture updates retain the accepted revision journals.

The existing convex presenter cannot represent this concave body with additive
face composition. Its uniform-plane program also cannot portably hold all 252
complete chart frames within baseline WebGL2 uniforms. Crescent therefore has a
geometry adapter: real static triangles with GPU depth testing and a texture
array, plus Canvas physical wall-run ordering and cap composition using the
same accepted color tiles. The 252 layers fit the WebGL2 minimum of 256; the
static mesh is 51,408 bytes. The adapter changes hit selection/composition, not
the canonical terrain field or palette.

A single real union silhouette under the atlas fills 254/255 Canvas rounding
remainders at coplanar joins, without readback, enlarged geometry or changed
heights. Canvas color tiles stay current even while GPU output is active, so
context-loss fallback starts from the current painted epoch. The existing GPU
3-million-pixel, desktop Canvas 1.5-million-pixel and coarse-pointer Canvas
650,000-pixel caps remain unchanged. No expensive settled terrain rebuild occurs
inside a dab; presentation composites the current derived atlases.

Candidate visibility uses the exact prism decomposition: a real planar cap or
a real perimeter segment. A small immutable geometry-only table avoids repeated
252-triangle frame allocation for every candidate. It agrees with the original
full-triangle ray path in 50,400 comparisons across four supported configurations,
all physical faces, boundary aliases and ten camera directions. Picking retains
the original general triangle ray. The final sustained cap/wall joins have 42
commits each: WebGL2 p95 34.1/43.3 ms and Canvas 45.7/58.0 ms for outer/concave
joins. A preserved earlier Canvas run failed at 127.4 ms before this correction;
no gate or source-word precision was relaxed.

Independent raw-vertex triangle/depth references check nine matched camera/map
poses at each detail, including underside, concavity and both ends. The 18 views
use identical canonical Gaussian terrain, camera, 1000x660 backing, DPR 1 and
appearance. Stable GPU/Canvas and independent-field channel differences are at
most 2 (gate 3), with zero interior coverage, false-background, internal-diagonal
or cap-strip seam failures. Coverage is checked independently of either backend's
alpha. The silhouette allows the established two-pixel geometric antialias
footprint. Discontinuous coasts are classified through the accepted physical
atlas's two-texel reconstruction footprint, not subjected to a false exact-color
claim; raw coastal differences and side-by-side captures are retained. Viewing
preserves the complete source-word hash.

### Measured editor qualification

Installed Chrome uses actual AMD Radeon RX 6600 / ANGLE D3D11 and forced Canvas,
1440x950 at DPR 1. Observers read actual post-submit pixels, not just revision
counters. Six physical regions each exercise Raise, Smooth, Lower and Flatten
and exact whole-gesture Undo/Redo. Ordinary Raise traces last several seconds;
held map traces last 15 seconds. Upper painting preserves independent lower
interiors. All accepted positions are processed, none discarded, with no worker
or numerical failures in the four default-profile workflows.

| Detail | Backend | Six-region physical p95 range ms | Largest first response ms | Held map p95 ms |
| --- | --- | ---: | ---: | ---: |
| 128 | WebGL2 | 30.8-101.2 | 107.8 | 29.0 |
| 128 | Canvas | 33.9-102.5 | 117.8 | 33.2 |
| 256 | WebGL2 | 30.4-98.1 | 116.8 | 40.8 |
| 256 | Canvas | 36.0-103.3 | 110.3 | 51.0 |

The N256 Canvas row was repeated after the silhouette and visibility corrections.
Other rows retain the initial complete matrix; the GPU presentation is unchanged.
The current N128 GPU pilot also checks painting, exact history and v36 reopening.

These retain the existing ordinary 125 ms p95, held 100 ms, navigation 150 ms
and first-response 1000 ms gates. They are measurements on this PC, not universal
latency guarantees. The first N128 tip run exceeded the gate at 127.4 ms; its
raw failure is preserved. Reusing immutable geometry/source locations and
avoiding unnecessary visibility searches within the same convex cap strip
resolved that cause before the four-profile qualification. An earlier short
pilot's raw report was overwritten; its surviving transcribed diagnostic is
explicitly labeled as such and is not treated as a preserved raw trace.

Derived cache ownership is 15,417,288 bytes at N128 / 53,259,696 at N256, separate
from canonical authority, workers, canvas backing and GPU storage. N256 triangle/polygon
Canvas tile backing is 18,343,080 bytes; the field texture and mesh are separately
reported. Default workflow history peaked at 294,912 / 393,216 typed bytes;
pending input peaked at 4-6 positions, inside the unchanged 256-position cap.
No unknown geometry receives Crescent's qualified sample-count allowance.

### Strict format 36 and scope

Format 36 is newly allocated. All previous formats retain their meanings;
experimental formats 21-24 remain reserved. Saves strictly preserve distinct
World/surface/terrain identities, provider/generation, all dimensions and tip
profile, immutable topology, N128/N256 representation, finite exact Float32 words
including negative zero, normalized camera/map/pan and brush configuration.
SHA-256 covers the complete normalized header and little-endian payload.
Validation completes before active replacement. Save/Open uses normal Atlas UI
and permits continued editing with exact new history. Historical session Undo
is not serialized across Open, consistent with the accepted editors.

This is an exterior reference-surface editor, not displaced-terrain exploration.
The fixed 32-interval physical outline is visibly faceted at sufficiently close
zoom and is the actual supported model. Arbitrary proportions, hollow Crescent,
excavation, holes, tunnels, links, arbitrary meshes, professional cartography,
website integration and every subsequent shape remain outside this pass.
Technical browser qualification does not establish physical-device or owner
acceptance. The recovery branch remains untouched.

Operational source hashes, raw reports, captures and diagnostic qualifications
are frozen in `evidence/crescent-operational/receipt.json`. Final shared-family
regression and supported-configuration review are recorded separately at C.
