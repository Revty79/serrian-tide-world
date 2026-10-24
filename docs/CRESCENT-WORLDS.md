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
and Fine/Full tip profiles. Curvature scales the bend's x dimension, preserving
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

This checkpoint is a physical/numerical foundation. It does not expose Crescent
as an operational Atlas World. Certified concave-surface routing, brushes,
presentation, navigation, persistence and real-browser qualification continue
under the same authorized pass. In particular the existing convex polyhedron
global route enumeration must not be applied unchanged to this concave body:
shortest routes can pass through saddle vertices. See the
[CGAL shortest-path model](https://doc.cgal.org/latest/Surface_mesh_shortest_path/index.html)
for that distinction. Existing authority, brush, worker, history and appearance
mechanisms remain the integration targets. No other shape or excavation work
is authorized by this foundation.
