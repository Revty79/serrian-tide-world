# Solid decahedron operational checkpoint

The picker calls this **Solid decahedron world**. Its precise geometry is a
pentagonal trapezohedron: ten planar convex kites, twenty physical edges,
twelve vertices, two five-valent poles and ten three-valent ring vertices.
This implements the owner's Geometry Pass 1 from main `39d3e5b`.
Implementation, automated verification and owner acceptance are separate.

## Geometry and reuse

R is the equatorial ring radius and pole height. Ring vertices alternate between
z = +/- R(1-cos36)/(1+cos36). The resulting kites are planar with outward winding;
height and equatorial diameter are 2R. The maximum spatial diameter also includes
the ring vertex height. Physical area, volume, support-plane inradius and
outward interval bounds scale with the actual coordinates.

Each kite has two affine triangle charts. Physical face/edge provenance remains
separate from those charts. One canonical lattice welds chart diagonals,
physical edges and poles; no extra terrain bank or artificial geographic edge
is created. A non-overlapping ten-kite strip keeps every internal diagonal and
nine real physical joins attached. Other edges are honest map cuts.

Terrain authority, four brushes, physical radii, connected sessions, workers,
prepared patches, whole-gesture history, Atlas controls, projection/navigation,
field reconstruction, palette, relief, WebGL lifecycle and local-map transactions
reuse the existing polyhedral mechanisms. Diagonal gradients use a shared
physical-plane stencil. Canvas uses one affine color atlas per complete kite to
avoid antialiasing a numerical diagonal; it samples the accepted color field and
updates only transformed dirty regions. Existing shapes retain their atlases.
GPU updates reuse the existing dirty journal for partial texture uploads.

Certified route bounds and precision/work limits are retained. A same-kite
straight path stays in that convex physical face. Local certificates are
accepted only below the interval escape bound; uncertain cases retain the
original witness solver/global fallback. Cache eviction bounds retained route
placements without truncating a route search. The candidate broad phase uses
the accepted guarded ambient chord lower bound solely to exclude samples that
cannot be reached by the physical brush.

## Capacity and persistence

N128 has 163,842 canonical Float32 words; N256 has 655,362. The larger display
capacity is qualified only for this exact geometry/provider/topology/detail;
unknown and older profiles retain their limits. Input, per-dab, history and
backing budgets are unchanged. Default radius uses the accepted 0.0837R Atlas
scale, with the original physical radius domain available.

Strict format **25** preserves exact Float32 words, signed zero, physical
dimensions, identities, numerical detail and checksummed metadata. Formats
1-20 keep their meaning. Recovery formats 21-24 remain on the untouched recovery
branch; 26 is reserved for the subsequent Hollow checkpoint. No excavation,
holes, tunnels, links, terrain displacement or next-shape implementation is
included.

## Verification

See [the checkpoint receipt](evidence/decahedron-solid/receipt.json), raw browser
measurements, paired output pixels, workflow/recovery screenshots and check logs
in the same directory. Tests include every physical/chart join, all tools,
exact gesture replay, v25 Open and continued painting, sustained input,
hardware WebGL2, forced Canvas, context/worker recovery and touch/pen emulation.
The pixel checks include complete physical-kite coverage across chart diagonals;
backend comparisons retain the existing three-channel stable-pixel tolerance.
Coastline reconstruction is evaluated within the accepted atlas filter support.

At matched 60 km physical brush radius, 200 m/dab and 240 km physical paths,
Chrome input-to-output-pixel p95 spans 27.7-74.7 ms for ordinary strokes and
23.4-52.1 ms for four-second held strokes across faces, edges and poles. These
are 24 measured scenarios, not isolated numerical timings. Matched Octahedron
reference scenarios span 28.5-55.1 ms ordinary and 22.4-33.5 ms held. The retained
gates are below 125 ms ordinary and below 100 ms for those held profiles;
the separate twenty-second endurance workflows retain the 125 ms gate.

Touch/pen evidence is browser emulation, not a physical-device acceptance.
The ordinary build retains its existing large-bundle warning. A visually usable
implementation and passing technical checks still require owner acceptance.
