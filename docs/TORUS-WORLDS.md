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
