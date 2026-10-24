# Dumbbell Worlds

## Foundation model

Construction version 1 is an actual closed faceted solid with two substantial
bulbs, two tapered shoulders, a narrower material neck and two terminal vertices.
Its facets define the physical reference boundary. It does not claim smooth
spherical lobes or an ideal circular surface of revolution beneath those facets.
There are no overlapping sphere/cylinder shells, hidden internal disks or
independent terrain banks. All 320 triangle charts cover one connected exterior.

The fixed generating cross-section has sixteen dyadic vertices. Four vertices
in its first quadrant are (1,0), (15/16,6/16), (11/16,11/16), (6/16,15/16);
quarter turns generate the rest. Every positive-radius station is a homothetic
copy. The profile's outer lobe stations, relative to a lobe center and scale R,
are (-R,0), (-7R/8,R/2), (-R/2,7R/8), (0,R), (3R/5,4R/5), followed by a real
tapered shoulder to the neck. The second lobe reverses that construction.
Terminal fans have real positive-area triangles and one canonical vertex each.

World Scale S sets reference radius S/4. First and second lobe scale factors
independently range from 0.8 to 1.2. Neck radius is 0.25–0.45 times the smaller
lobe radius. Neck length is 0.1–2 reference radii. Compact/Extended shoulders
have longitudinal lengths 0.35/0.65 times their respective lobe radii. Supported
scale is 100,000–1,000,000,000 m. Actual center spacing and terminal extent are
derived and retained. Structural dimensions are creation-time values.

There are 162 physical vertices, 176 convex physical polygons, 320 triangle
charts and 480 chart edges. Euler characteristic is 2. Polygon fan diagonals
are numerical joins. Outward frames provide actual physical tangent vectors,
area and metric, not a uniform cylindrical or ideal spherical approximation.
Facet interiors are flat; integrated Gaussian curvature is the vertex angle
defect, including negative defects at the neck joins. Total defect is 4 pi.
Volume independently equals the sum of polygonal frustum volumes.

## Canonical geography and physical distance

The accepted indexed Float32 authority and vertex/edge/triangle ownership are
reused. Equivalent N128/N256 use 32/64 subdivisions per chart: 163,842/655,362
words (655,368/2,621,448 authority bytes). Every shared location has one word;
the two terminal vertices are different words. Initial elevation is -100 m.
Bounds are plus/minus one quarter of the generating neck radius. Elevations
color the reference boundary; displaced terrain and excavation are deferred.

Influence uses an exhaustive bounded set of straight unfolded geodesic pieces.
A shortest route can be chosen without leaving and reentering a convex physical
polygon: replace such an excursion with its planar segment. Certified ambient
source-to-portal lower bounds exclude only portals unreachable within the brush
reach. Intersections of outward angular cones exclude impossible straight rays.
Uncertain angular or portal cases are retained. The accepted interval unfolding
and portal certificates enclose each remaining segment.

Shortest paths can pass through saddle vertices. Every physical vertex whose
ambient lower bound is within reach is therefore a permitted intermediate
source. Directed lower/upper Dijkstra propagation over the certified straight
pieces includes these paths. Any excluded piece is at least the complete reach
and cannot improve an influential path. Real face/edge paths supply finite upper
witnesses. Influential distances must meet the original requested enclosure;
no approximate edge graph, ambient chord or unresolved shooting result becomes
brush influence. A certified lower bound outside the brush proves exactly zero
influence without resolving its irrelevant upper witness.

Preparation fails closed above 8,192 windows or 65,536 retained placements for
a complete source. The geometry-only vertex cache retains at most 8,192
placements and 24 entries. No common dab, history, pending-input or memory cap
is raised. These are qualified local brush metrics, not a promise to solve an
arbitrary unrestricted global-distance query interactively.

For two neck locations an additional exact certificate avoids repeating the
general solver. Euclidean projection onto the closed convex neck prism is
nonexpansive. Lobe surfaces between the outer radius=neck-radius cuts project
onto the real lateral boundary, including the perimeter at each neck end.
Any route leaving that domain first travels to one of those axial cut planes.
Below that escape lower bound, the developed periodic polygonal cylinder gives
the global intrinsic distance. Cached interval affine coordinates retain the
accepted arithmetic guard. The special case is checked against the complete
window solver, including neck joins and the circumferential map cut.

Pointer interpolation follows real face segments, preferring certified unfolded
segments. Ambiguous vertex passages can use actual face/edge curves with bounded
physical lengths. Pointer curves need not be globally shortest; influence has
its independent intrinsic certificate. Exact gesture history remains shared.

## Presentation preparation

The accepted prismatic static-triangle/depth renderer has been extracted into
a shared triangle presenter. Its field, palette, relief, dirty uploads, atlas,
graphics recovery and backing policies remain the existing implementations.
Dumbbell Canvas ordering uses three convex regions separated by the two axial
join planes. Their painter order follows the camera's axial component; real
triangle depth handles WebGL visibility. Internal join disks are not rendered.
The map has a longitudinal strip plus two separate terminal fan charts. Its
circumferential coordinate is deliberately distorted where radius changes;
painting continues to use the real metric.

Checkpoint A is a geometry/numerical foundation. The Dumbbell option is not yet
in the normal creator, and operational browser painting, Dumbbell rendered-pixel
quality, persistence and final owner acceptance remain checkpoint B/C work.
Numerical probes are not browser latency evidence. In particular, short necks
need browser capacity qualification before being advertised at every detail and
brush size.

Checkpoint A verification: 20 Dumbbell numerical/geometry checks and 25 focused
shared-system regressions passed, including 1,920 independent visibility/picker
comparisons and map roundtrips for all 320 charts. TypeScript and production
build passed. The shared renderer extraction also passed installed-Chrome Arc
normal creator/painting/exact Save/Open on both backends, plus sixteen matched
hardware WebGL2/Canvas pixel views (stable-channel maximum 3; no coverage,
outside, diagonal or coplanar-strip violations). Arc p95 input-to-visible-pixel
was 31.6 ms GPU and 39.5 ms Canvas. These measurements qualify the affected Arc
regression, not the unfinished Dumbbell editor. Evidence is frozen in
`evidence/dumbbell-foundation/receipt.json`.
