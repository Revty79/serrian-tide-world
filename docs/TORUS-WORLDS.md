# Physical Torus Worlds

## Foundation checkpoint A

The physical provider is a circular ring torus:
P(u,v)=((R+r*cos(v))*cos(u),(R+r*cos(v))*sin(u),r*sin(v)). Its two
coordinates are periodic; tangent lengths are R+r*cos(v) and r. Surface area
is 4*pi*pi*R*r and volume is 2*pi*pi*R*r*r. The central opening is real empty
space. The torus has one exterior terrain bank, with no artificial edges.

The initial supported dimensions are tube radius r >= 10,000 m, major radius
R <= 1,000,000,000 m and 3 <= R/r <= 4. These bounds leave material clearance
and useful metric sampling. N128/N256 use 4N by N samples, with no duplicated
endpoints: 65,536 / 262,144 canonical Float32 words. Elevations start at -100 m
and are bounded by +/-r/8. They color the reference boundary; displaced material
meshing is not implemented. Existing geography is never clamped or converted.

The accepted indexed authority, ConnectedDab, ConnectedStroke, Smooth arithmetic,
physical path spacing and exact whole-gesture history are reused. Geometry
supplies periodic addresses, metric conductances, complete candidate bounds and
certified brush distances. Default radii are sampled using the largest physical
lattice spacing; the supported brush radius is below 0.3r. No work/history cap
was raised. The local distance provider rejects queries outside its qualified
short-path domain instead of returning an uncertified substitute.

## Distance certificate

For a brush-center latitude v0, use dimensionless coordinates x=a0*u, y=v-v0,
where a0 is a fixed positive coordinate scale and b(y)=(R/r+cos(v0+y))/a0.
The true metric is b(y)^2 dx^2+dy^2. A polynomial trial curve gives an interval
energy E and L=sqrt(2*E.upper). Every shorter constant-speed minimizer has energy
at most E.upper, stays in |y| <= L, and cannot wind once when L < 0.9 < pi.
Alternative winding classes therefore cannot be hidden shortcuts.

For endpoint-fixed variations with derivative norms X,Y, the energy Hessian is
bounded below by bmin^2*X^2 - M1*B*X*Y + (1-M2*B^2/8)*Y^2, where B=L/bmin,
M1 bounds |(b^2)'| and M2 bounds the negative part of (b^2)''. The provider uses
an explicit positive Gershgorin lower bound m, with an arithmetic guard.
The endpoint-zero bounds ||h||infinity <= ||h'||2/2 and
||h||2 <= ||h'||2/pi, with pi > 3, give the energy gap bound
||Euler residual||2^2/(18*m). Integrating the trial energy and squared residual
with outward interval polynomial arithmetic encloses the global shortest
distance in this qualified neighborhood. Taylor remainder and coefficient
roundoff are included; no host sine/cosine accuracy assumption is needed for
that certificate. Collocation proposes a trial; it is not treated as proof.

Pointer interpolation follows an actual angular surface curve. Its physical
arc length and inverse addresses use Simpson integration with an explicit
fourth-derivative bound. This curve is not claimed to be globally shortest;
brush influence independently uses the certified geodesic distance. Local
pointer jumps remain subject to the existing transition and spacing budgets.

The ray adapter centers a ray at its nearest point to the World center,
partitions the depressed quartic at its cubic stationary points, and bisects
the first real material boundary using the analytic torus signed distance.
It does not rely on finite ray-marching steps, a mesh or a filled center disk.

Eight numerical checks pass: geometry/metric/normals/volume, exact meridian and
short equatorial distances, oblique symmetric certificates and chord exclusion,
nearest rays including 1 mm grazing cases, certified pointer arcs, two-way
canonical ownership, all four tools with exact history, and bounded default
N128/N256 footprints. TypeScript and production build pass. Evidence is frozen
in `evidence/torus-foundation/receipt.json`.

This is a numerical foundation, not an operational Torus editor. Browser
rendering, painting latency, strict persistence and owner acceptance have not
been established by checkpoint A. The assignment remains limited to the solid
physical Torus; no excavation, Hollow Torus or Ringworld is included.

## Operational editor checkpoint B

The normal Atlas creator now offers **Torus World**, physical major/tube
dimensions and N128/N256. Physical view and the repeating Surface map edit the
same canonical words. Both chart cuts and their common corner are continuous;
the map repeats nearby context. Outer tube, Opening side, Tube top and Underside
focus controls, rotation, pan, zoom, Fit and map focus retain geography/history.
The central opening is empty space, not an independent hollow terrain bank.

The editor reuses ConnectedWorkspace, ConnectedPreviewSession, the connected
worker protocol, rolling input/history, accepted Hermite reconstruction,
elevation palette, physical relief, coherent Canvas raster, GPU resource and
backing policies, and the Cylinder dirty-rectangle merger. Geometry-specific
code supplies the metric, interpolation addressing, intersections, visibility,
projection and brush candidate bounds. No common work or history caps changed.

Format **34** stores physical dimensions, identities, representation/detail,
exact little-endian Float32 words and a header/payload SHA-256 checksum. Unknown
fields, foreign identities, unsupported dimensions/counts, nonfinite/out-of-
clearance words, invalid dates, corrupt payloads and cross-format overwrites are
rejected. Save has a source revision lease. Open validates and prepares before
replacing the active World. Undo history remains session-only. Formats 1-20 and
25-33 retain their meanings; the paused recovery branch's 21-24 remain reserved.

### Certified distance throughput

The energy/residual certificate above is retained. Trial degrees 4, 6, 8 and 12
are attempted until the requested enclosure is certified; there is no flat or
uncertified fallback. Interval trigonometry at a brush-center latitude is cached
by geometry. Polynomial arithmetic uses IEEE coefficients with a directed L1
coefficient error and uniform remainder. gamma(k), using twice unit roundoff
and a subnormal absolute term, bounds arithmetic; truncated powers join the
uniform remainder. Only tail-free trial polynomials are differentiated.
The velocity bound B includes both L/bmin and the trial derivative's L1 bound,
so the convex segment used by the energy-gap argument includes the actual trial.
Higher-degree trials retain the larger Taylor order for tighter requests.

Measured before/after on twenty identical N256 inner-equator dabs: 4,713 distance
queries took about 727 ms / 283 ms. Both evaluated all candidates and honored
the existing falloff-error contract. This addressed the measured full-loop
backlog without changing brush size, strength, spacing, detail or quality gates.

### Presentation and resource bounds

The CPU and GPU use the same accepted field, palette and slope model. CPU coast
classification conservatively includes the Hermite stencil. The analytic GPU
quartic partitions at its stationary points; its enclosing-sphere entry sign
is analytically nonnegative. Enforcing that sign prevents float32 cancellation
at the outer equator from skipping the front root and shading the rear tube.

Canvas keeps sharp settled pixels for conservative merged periodic dirty
regions. Ordinary batches use the accepted 2,048-pixel quantum and the existing
9 ms frame budget. Camera changes use coherent interactive frames followed by
idle refinement. Map inversion is cheap and does not allocate a hit cache.
Physical camera hits use exact double coordinates/shading so cached updates
and fresh output agree bit for bit. This derived cache is 25 bytes per raster
pixel, at most 37.5 MB under the desktop 1.5-million-pixel settled cap, or
16.25 MB under the coarse-pointer 650,000-pixel cap. The cache contains no
authoritative terrain. Front/spare RGBA buffers remain separately bounded.
At N256, canonical terrain and GPU elevation texture are each 1,048,576 bytes;
the full-screen GPU mesh is 48 bytes. Derived upload history is capped at
32 epochs and 1 MiB. No server GPU or new dependency is required.

### Acceptance boundary

This pass supports a circular solid Torus within the dimensions stated above.
Elevation colors/shades the reference boundary; it does not displace a mesh.
Excavation, Hollow Torus, Ringworlds and unrestricted shaping remain deferred.
Browser automation, pixel inspection and numerical evidence are technical
verification. Physical-device input and owner visual/interaction acceptance
remain separate.

## Operational measurements

Installed Chrome on the hardware AMD Radeon RX 6600, 1440 by 950 presentation,
with default physical radius/strength and idle refinement enabled. Values are
input-to-captured-terrain-pixels p95 milliseconds; physical/seam/loop columns
show the largest p95 among the tested strokes in that category.

| Detail | Backend | Four physical regions | Either/both seams | Full major/minor loops | 20-second held stroke |
| --- | --- | ---: | ---: | ---: | ---: |
| 128 | WebGL2 | 51.3 | 42.1 | 44.7 | 35.6 |
| 128 | Canvas | 75.3 | 100.2 | 107.4 | 54.8 |
| 256 | WebGL2 | 68.7 | 47.7 | 78.9 | 42.4 |
| 256 | Canvas | 95.0 | 64.6 | 93.9 | 47.3 |

The Canvas workflows retained 1440 by 950 sharp painting. All four workflows
processed every accepted input position, had zero unexpected failures/cancellations and restored
exact words through whole-gesture Undo/Redo and v34 Save/Open/continued editing.
The 14 pixel cases cover both details, physical outer/inner/top/bottom views,
zoom, periodic maps, and incremental versus fresh frames. Stable GPU/Canvas
channel differences are at most 1; independent signed-distance reference rays
found zero missing/extra material. Incremental texture and Canvas output match
fresh output byte for byte. Raw captures and timing epochs accompany the frozen
operational receipt under `evidence/torus-operational/`.

For subsequent changes, start with the affected numerical/format checks and the
relevant browser case. Run prior-family smoke checks at publication boundaries
or when shared behavior changes. Keep historical receipts immutable; unchanged
renderer source can retain its earlier full pixel qualification while current
creator smoke tests check shared integration. This avoids repeating every old
shape's complete acceptance suite after each local adapter change.

The [final review](TORUS-FINAL-REVIEW.md) records the compressed mobile-input
correction, stricter native-pixel silhouette proof, recovery/input checks and
remaining owner/device acceptance items.
