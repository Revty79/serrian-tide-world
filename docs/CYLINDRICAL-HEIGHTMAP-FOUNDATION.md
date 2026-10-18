# Physical closed-cylinder foundation — A7-A / A7-B1 / A7-B2A

This provider implements a **solid, closed, capped cylinder exterior**, independently of all existing representations. It is pure TypeScript without React, DOM, storage, authentication or a host dependency. A7-B1 adds [bounded global reference-surface distance](CYLINDER-GLOBAL-DISTANCE.md) and corrects the mesh-count documentation below without changing canonical storage. A7-B2A adds [atomic numerical four-tool dabs](CYLINDRICAL-SCULPTING.md). It is not selectable in New World / Map. There is no cylinder renderer, interactive brush/stroke, history integration, codec or migration.

## Version and physical frame

`createCylinderGeometry` requires `provider: physical-closed-cylinder`, `version: 1`, `configuration: solid-capped`, `role: exterior`, positive finite `radiusMeters = R`, positive finite `lengthMeters = L`, and explicit `identity: {worldId, surfaceId}`. Identity strings contain 1–128 characters and cannot be blank. Metadata is an immutable detached snapshot. Unknown provider/version/configuration/role fails. No default physical dimensions, gravity, habitable orientation, poles or geographical north are inferred.

The reference axis is Cartesian +Z, from z=0 to z=L. The angular cut is a representation convention, not a physical boundary. Future open, hollow, interior/exterior, domed or separately connected variants need explicitly validated provider configurations, topology and ownership. Literal types declare the currently supported configuration; they are not an assertion that all cylinders have caps or exactly one surface. World/surface contracts remain extensible; no existing representation is changed to fit this provider.

Geometry uses Float64 JavaScript numbers. Dimensions must also produce finite circumference and maximum side-region distance. Terrain resolution rejects spacings below the normal Float64 range (`R / radialCells / angularSamples >= 2^-1022`, `L / axialCells >= 2^-1022`) rather than admitting subnormal grids whose distinct positions may collapse. Calculations have floating-point roundoff; “exact” below describes the analytic surface formula, not arbitrary-precision arithmetic. Finite angular inputs normalize modulo 2π; huge input angles retain only the precision available in a Number.

## Charts, reference positions and orientation

The three charts use **u in radians**, v in meters. This mixed-unit chart is deliberate. Circumferential meters on the side are `s = R u`. On a cap the angular scale is its local radius v. Canonical angles lie in [−π,π). No endpoint is a second authoritative sample.

| Region | Physical angle θ | Domain of v | Reference position | Outward normal |
| --- | --- | --- | --- | --- |
| `side` | u | 0…L | (R cos θ, R sin θ, v) | (cos θ, sin θ, 0) |
| `cap-start` | u | 0…R | (v cos θ, v sin θ, 0) | (0,0,−1) |
| `cap-end` | −u | 0…R | (v cos θ, v sin θ, L) | (0,0,+1) |

At every regular point, `∂position/∂u × ∂position/∂v` points outward. The end cap's angular orientation is reversed, including its rim aliases. These are actual planar disks, not axial wrapping, another world or a mirrored independent authority.

```text
       cap-end: disk at z=L, outward +Z
             rim θ  <=> side (θ,L)
                 | curved side |
             rim θ  <=> side (θ,0)
       cap-start: disk at z=0, outward -Z

side angular cut: u=-π <=> u=+π at every axial position
cap angular cuts: the same physical radial line; no real boundary
```

The cap center has infinitely many angular coordinate descriptions but one physical point. `normalize` returns u=0 there. Polar tangent coordinates are singular at the center and `tangentVector` explicitly rejects them. `capCartesianTangent` returns a regular physical XY-plane vector; it does not invent a preferred radial direction at the center. At a sharp rim there are two valid one-sided normals, not a single smoothed normal. A future displaced mesh must define its rim treatment without silently altering this reference geometry or introducing elevation cracks.

## Rim aliases and tangent fold

`crossRim` requires an exact rim address. It converts the same physical point and is reciprocal:

| From side | Cap address | Destination tangent components (du,dv) |
| --- | --- | --- |
| (u,0) | cap-start (u,R) | (du,+dv) |
| (u,L) | cap-end (−u,R) | (−du,−dv) |

The inverse uses the same diagonal transform. At the start, side +Z maps to cap +radial; at the end it maps to cap −radial. The circumferential physical tangent stays unchanged. Both metric norms at the rim are `sqrt((R du)^2 + dv^2)`, so these transforms are isometries of the **folded one-sided tangent planes**. They are 90-degree rotations about the rim tangent, not changes of basis in a fictitious common ambient tangent plane. A transverse path may continue across the fold with matching unfolded direction; this local condition is not a solution for finite global paths. There is no smooth tangent plane or classical smooth-surface normal exactly on the rim. No finite-step exponential map or universal `SurfaceTopology.advance` is claimed.

## One canonical numerical authority

`createCylindricalTerrain({terrainId, geometry, resolution})` requires integer resolutions:

- A = `angularSamples`: 4…1024, equal around the side and both caps.
- Z = `axialCells`: 2…512.
- P = `radialCells`: 2…256, equal for both caps in representation version 1.

Side addresses `(column,row)` have row 0…Z, axial position `L row/Z`. Caps have row 0…P, radius `R row/P`. Integer angular columns wrap modulo A. The cap-end physical angular index is `−column mod A`; other charts use `column`. Angular endpoints do not allocate new storage. Sample keys include World, surface, terrain, representation ID/version, all three resolutions, R, L and canonical index. Foreign keys are rejected. Matching all fields denotes the same logical terrain identity; callers must give different logical terrains distinct IDs. Even separately constructed instances with matching metadata have independent buffers.

There is exactly **one private Float32Array**, initialized to −100 m with sea level 0. Neither side nor caps expose writable array views. Rim ownership always belongs to the side; cap outer-ring addresses alias it. Each cap center has one owner. Indexing is integer arithmetic, not approximate 3D position welding.

Let S = A(Z+1), C = 1+A(P−1). Storage order is:

| Owner | Canonical index |
| --- | --- |
| Side row j, column c | jA+c |
| Start center | S |
| Start interior ring j=1…P−1, column c | S+1+(j−1)A+c |
| End center | S+C |
| End interior ring j=1…P−1, column c | S+C+1+(j−1)A+c |
| Start outer ring P,c | side 0,c |
| End outer ring P,c | side Z,(−c mod A) |

Thus the complete unique count is

```text
V = A(Z+1) + 2[1+A(P−1)] = A(Z+2P−1)+2.
```

Each rim owner has two finite chart aliases. Each center has A normalized lattice aliases (all other integer columns wrap into these). All other samples have one. Side rim positions and cap aliases produce bit-identical reference coordinates, including odd angular counts: sample conversion first computes the shared physical angular index and then applies chart orientation. It does not compare independently rounded trigonometric positions to decide ownership.

`read`/`write` validate keys. Writes validate finite input and finite `Math.fround` before mutation. The stored result is precisely Float32 rounding; `Object.is` detects signed-zero changes. Revision advances only when stored bits change. Invalid writes leave all values/revision intact. `copyElevations` and `snapshot` return detached storage; snapshots retain the immutable source metadata, source identity and captured revision. They are numerical copies, not new Worlds, conversions or persistence records. Mutating a returned copy cannot mutate the authority. No history implementation is implied by the revision counter.

## Connectivity proof

Regular nodes have two angular neighbors and two transverse neighbors. At a side rim, the outward axial neighbor is replaced by the cap's adjacent interior-ring sample using the appropriate angular reversal. Cap outer-ring neighbors therefore resolve back to that side rim. A center is adjacent to every first-ring sample, degree A; the first-ring inward neighbor is the center. No center self-edges or duplicate neighbor applications occur. These are topological adjacency relationships, not uniform-distance or equal-area stencils. Center valence is bounded by 1024; `aliases`/`neighbors` allocate only their bounded result, not persistent tables.

For an independent cell complex, join adjacent side rows with A quads; on each cap join successive nonzero rings with A quads, and use A triangles from its single center to its first ring. Weld outer cap rings to the appropriate side rings with reversed end-cap orientation. There are:

```text
F = AZ + 2A(P−1) + 2A = A(Z+2P)
E = A(2Z+4P−1)
V−E+F = 2
```

Each cap has P−1 annular quad bands (including the band joining its last interior ring to the shared rim), plus its center fan. Also, all V−2 noncenter nodes have degree 4 and the two centers degree A, giving `E=[4(V−2)+2A]/2`. The A7-A documented E and F each omitted 2A; their errors canceled in Euler. A7-B1 corrects those formulas and independently asserts actual generated V/E/F counts for A=4,7,9,32, including odd counts. Canonical terrain structure is unchanged.

Every directed cell edge has exactly one oppositely directed partner, the graph is connected, and the closed orientable surface is genus zero. This is the topology of a closed cylinder boundary; it does not imply sphere reference geometry. The independent symbolic mesh test derives physical weld labels without using provider indices/alias logic, checks every paired directed edge, compares every neighbor to the mesh, and proves actual V, E, F and V−E+F=2. Separate exhaustive tests cover every chart address, rim, angular wrap, alias count and reciprocal neighbor for four resolutions (including odd A). A maximum-grid test visits all 1,047,554 canonical indices and proves owner→resolve identity. The authority is never three arrays stitched after editing.

## Physical measurements and deliberate limits

`circumferenceMeters = 2πR`. The analytic side metric is `ds² = R² du² + dv²`. `sameRegionDistance` returns the shortest path **restricted to the side** by unrolling the cylinder and choosing the shortest angular lift:

```text
sqrt((R wrapAngle(u1-u2))² + (v1-v2)²).
```

On either disk the straight XY segment lies in that convex disk, so its Euclidean planar length is the exact region-intrinsic shortest path. In particular a radial distance is `abs(r1-r2)` for equal physical angle. These measurements exclude displaced relief. Every result says `scope: region-restricted`; different-region inputs fail. The provider intentionally does **not** implement generic `SurfaceMetric.distance` with a misleading global contract.

Even a same-side pair can take a shorter route over a cap: opposite points on a rim are πR apart along the side and only 2R across the disk. A7-B1's `globalDistance` compares all necessary continuous route families and returns a lower/upper enclosure with an explicit meter error bound, or fails on unsupported precision/work/range. A 3D chord for points in different regions generally leaves the physical surface and is never exposed as an exact surface distance. See [completeness, optimization and accuracy specification](CYLINDER-GLOBAL-DISTANCE.md).

A7-B1 supplies the bounded global distance minimum over justified complete route families, including shortcuts, both rim choices, angular wrapping, center/rim endpoints and ties. A7-B2A now supplies [interval-aware single-dab influence and polar/rim Smooth](CYLINDRICAL-SCULPTING.md), conservative candidates and atomic source-epoch patches. A7-B2B still needs actual path reconstruction/continuation at ties and cut loci, physical stroke spacing, exact whole-stroke history, matching previews and device scheduling. The graph alone does not establish conservative/equal-area diffusion. Stroke spacing, footprints, saturation, queued visibility and residuals must use consistent physical geometry. Distance work has a hard per-query budget; weaker-device brush scheduling remains later scope.

## Resource and precision bounds

Maximum version-1 authority: **1,047,554 samples / 4,190,216 bytes**, below 4 MiB. A snapshot adds exactly the same payload; callers own copy lifetimes, and total copies are not automatically budgeted. The provider retains O(1) metadata and no sample-sized position, alias or adjacency cache. Geometry is analytic reference geometry; Float32 elevations have normal magnitude-dependent precision and finite rounding. Stored elevations are not clamped to reference dimensions, converted into a valid displaced mesh, or promised to preserve non-self-intersection at arbitrarily extreme relief. Elevated rim normals/mesh joins require a later explicit model.

Run `node --expose-gc scripts/verify-cylinder-foundation.mjs` for actual isolated Node allocation measurements at 128/64/32, 256/128/64 and maximum resolution. The [receipt](evidence/a7-a-cylinder-allocation.json) distinguishes exact typed payload from JS object, browser, history and renderer costs. Measurements are not mobile performance claims. Existing numerical/rendering/history budgets remain unchanged because the provider is not imported by the product host.

## A7-B2A delivery and later integration gate

Later views must be supplied by a surface-specific provider: rectangular side, **both circular caps**, real joins, useful combined layout and recenterable local views. Projection cuts, navigation and repeated views only read the same authority. They must not relocate/resample stored geography. Accurate inverse hit testing, physical footprint previews, seam/corner/center interaction and aspect handling must precede selectable creation. Rectangular repeated previews are not a universal interface for all shapes.

A7-B2A implements numerical Raise, Lower, Smooth and Flatten across joins using B1 enclosures and one canonical update per dab. See the [single-dab specification](CYLINDRICAL-SCULPTING.md) and [completion evidence](A7-B2A-COMPLETION.md). Whole-stroke exact-bit Undo/Redo remains future. Queries overlapping a brush boundary need refinement/an approved error policy; failed distance queries cannot cause partial dabs. The selected physical brush must agree with previews across charts; centers cannot acquire directional singularities. A later codec needs explicit provider/version/dimensions/resolution/ownership/identity/role, exact Float32 words, checksum/resource limits and atomic host behavior, while preserving v1/v2/v3. No cylinder data is passed to those old codecs now. No conversion is authorized. Cylinder selection stays absent until functional views, editing and persistence are reviewed.

Open/hollow cylinders, independent interior surfaces, domed ends, passages and other connections remain future configurations. All other Phase 2 geometries/conversions and the full linked-map requirement remain in the [master roadmap](PHASE-1-HEIGHTMAP-ROADMAP.md). This is a modular component for eventual integration into **existing Worlds** under the original Next.js/TypeScript host's authentication, permissions, database and World records. No alternate lore database or auth is introduced.

**Stop after A7-B2A for independent review; do not begin A7-B2B.**
