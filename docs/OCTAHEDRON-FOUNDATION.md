# Regular Octahedron physical and numerical foundation

The owner-authorized overnight queue reaches this stage after the operational
Solid Tetrahedron (`52da75b1851ecf08750b627a5751c3a72321b695`) and Hollow Tetrahedron
(`6bcfec0faf7f09eddbe1da712836741643abd64f`) pass their technical gates and are
published to main. This checkpoint delivers the requested Octahedron foundation.

## Actual geometry

The regular octahedron has six axis vertices at `+/- edge/sqrt(2)`, twelve edges
between different axes and eight equilateral triangles. Face IDs encode their
three physical half-space signs. Each face selects one vertex from each axis;
negative determinant triples reverse winding so every physical normal points
outward. Exactly two faces meet each edge and four meet every vertex.

Dimensions are explicit: supported finite edge length 1 through 1,000,000,000 m,
circumradius `edge/sqrt(2)`, inradius `edge/sqrt(6)`, axial height `sqrt(2)*edge`,
area `2*sqrt(3)*edge^2` and volume `sqrt(2)*edge^3/3`. The centroid is zero.
Frozen outward interval vertex coordinates and equilateral chart bounds feed the
accepted certificates. Physical inward normals are available as an orientation
adapter; this does not implement or imply a Hollow Octahedron World.

## Canonical authority and accepted executor

`createTriangularPolyhedronTerrain` is the existing indexed Float32 authority.
There are exactly `4*N*N + 2` canonical words: 65,538 at N128 and 262,146 at N256.
The six vertices and twelve edges own their words once; face interiors never
own duplicates. Vertex aliases cover all four incident triangles. Complete
geometry, identities, representation and resolution protect keys and patches.
The supported numerical lattice is integer N4 through N256, including verified
non-power-of-two cases. Private snapshots, finite physical elevation limits,
source revision leases and atomic writes remain unchanged.

`createPolyhedronBrush` supplies the actual existing candidate projection,
certified distances, smoothing weights and connected dab/stroke/history engine.
The Octahedron wrapper adds no painting engine and raises no hard work, queue,
history, distance or display budget. Default brush radius at edge 1,000,000 m is
approximately 68,341 m, with maximum lattice spacing 7,812.5 m at N128 and
3,906.25 m at N256. It exceeds three spacings at both resolutions. Very small
geometry requires an explicitly supported starting elevation rather than
silently clamping the ordinary -100 m ocean.

The certified path adapter enumerates the real convex face graph and unfolds
only actual shared edges. Tests cover all 64 ordered face pairs, including 32
ordered genuinely nonadjacent pairs, portal order, vertex and edge continuity,
reverse distances and explicit precision/work exhaustion. An independent
analytic opposite-vertex path is `sqrt(3)*edge`; adjacent face centroids are
`edge/sqrt(3)` apart on the surface. Ambient material chords are never published
as a substitute for a surface route.

## Verification and operational boundary

Twelve focused tests pass, including all-face ownership at N128/N256, four-face
vertices, symmetric neighbors, foreign/stale patches, conservative candidates,
all four brushes, exact whole-gesture history and atomic cancellation.
Forty-eight recorded dabs at N128/N256 have complete Float32 words identical to
the exhaustive certified solver. Isolated numerical preparation peaked at
43.9 ms in that run; this is not a worker or input-to-visible editor claim.
The full 1,463-unit suite and build/TypeScript pass.

An operational editor is deferred for concrete compatibility work. The existing
accepted polyhedral display cache has a 196,610-sample interactive cap. The
Octahedron's N256 authority has 262,146 words and the unchanged cache correctly
rejects it; a regression preserves that limit. The Tetrahedron net also assumes
that each non-base face is directly adjacent to its central base. An octahedron
has genuinely nonadjacent faces and needs a verified non-overlapping eight-face
net adapter. Worker configuration, strict Save/Open and native UI/pixel testing
must accompany any future operational editor. This foundation does not expose
an unfinished option in the ordinary Atlas selector or invent a saved format.

The [receipt](evidence/octahedron-foundation/receipt.json) verifies 592 frozen
source/configuration files and 132 hashed evidence artifacts. Every inherited
source file matches the published Hollow Tetrahedron runtime after Git's standard
CRLF-to-LF normalization. The final browser stages pass 68 desktop/phone-size
compatibility cases, twelve matched solid/hollow GPU/Canvas comparisons and seven
focused earlier-family/Open Cylinder checks, with no failures, retries or skips.
That is 87 completed browser checks, run serially at BelowNormal priority.

The matched old-family pixel matrix uses equal canonical heights, pose, zoom,
detail and backing, with both -100 m and 0 m starts. Stable color error is at
most one channel value and there are zero silhouette violations. The Open Cylinder
cases retain the original 1.49-million-pixel active-frame gate and test sustained
rim strokes, continuous visible joins, exact history and reopened geography on
both backends. They run at their accepted 1920-by-1080 desktop viewport.

Installed headless Chrome uses the development PC graphics path; forced Canvas
pairs are separate evidence. Phone-size and touch/pen emulation do not establish
physical-device or owner-session acceptance. Verification used isolated port 5265
and retained prior published evidence without overwriting its receipts.
No later geometry family is started. Independent technical review and owner
acceptance remain outstanding.
