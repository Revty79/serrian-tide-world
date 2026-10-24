# Arc Worlds

## Foundation A

`physical-prismatic-arc`, generation 1, defines a bounded annular-sector prism.
A circular generating centerline has radius `r = World Scale / (2 * Curvature)`
and an independently controlled span. Its width is constant except at explicitly
beveled terminal collars. There are no straight Horseshoe arms, Crescent belly
or tapering tips, hidden ring sectors or longitudinal periodic aliases.

The generated straight facets are the actual physical reference solid. At each
angle theta, outer/inner points are `(r +/- Width/2) * (cos(theta), sin(theta))`
in x/z. Those two chains run between `-Span/2` and `+Span/2` and join through two
positive-width radial end faces. Extrusion through `[-Thickness/2, Thickness/2]`
gives complete upper/lower caps and real inner, outer and terminal walls.
Deterministic fixed-order sine/cosine arithmetic is the accepted prism family's.

Thirty longitudinal intervals keep all 244 numerical triangles inside the
WebGL2 minimum of 256 array layers. The first/last angular interval is
`min(Span/30, Width/(4*r))`; the remaining 28 intervals are equal and symmetric.
Flat ends keep full width. Beveled ends narrow just their terminal boundary to
75% width, joined through actual sloping lateral faces in those two collars.
No end face collapses. All interior transverse widths remain full width.

World Scale is a uniform physical unit, not a maximum bounding-box assertion.
Supported scale is 100,000–1,000,000,000 m; curvature 0.8–1.6; span 30–358 degrees;
width 8–25% of scale; thickness 20–60% of width; ends flat or beveled. These
ranges keep positive inner radii, nonzero end separation, valid charts, useful
terrain clearance and nonoverlapping shared map interiors. The default is scale
2,000,000 m, curvature 1, span 220 degrees, width 20%, thickness 10%, flat ends.
Structural dimensions are creation-time parameters and never remap painted data.

The physical model has 124 vertices, 122 physical polygons, 244 triangles and
366 numerical edges, Euler characteristic 2. Every edge has two oppositely
oriented incident triangles. Cap strip diagonals and neighbors are welded;
distinct ends and upper/lower locations retain separate canonical terrain.
Surface area is twice the planar footprint area plus perimeter times thickness;
volume is footprint area times thickness. Chart frames supply affine physical
metrics and real outward normals.

For the generating circle, angular length is r times angle. For this documented
faceted reference, an equal-angle straight edge has length
`2*r*sin(deltaTheta/2)`. Inner and outer travel therefore differ in the exact
ratio of their radii; no flat angular parameter is treated as a physical meter.
All implemented metrics use actual physical vertices and frames. This does not
claim an analytically smooth circle underneath the faceted surface.

The existing triangular indexed authority owns Float32 elevations, revisions,
private snapshots and canonical vertex/edge/triangle-interior aliases. N128/N256
equivalent detail is n32/n64 per chart, `122*n*n+2` words: 124,930 / 499,714
samples (499,720 / 1,998,856 authority bytes). New terrain starts at -100 m;
finite elevation limits remain +/-Thickness/8. No shared resource limit changes.

Ten Arc foundation tests cover short, moderate, long, broad, thin, thick,
minimum/maximum scale, beveled and near-closed profiles; manifold orientation,
no outline intersections, width/radius/span, physical metrics, exact ownership,
independent terminals and deterministic reconstruction. Fifty-one current
Crescent/Horseshoe focused regressions remain passing. The separate foundation
receipt freezes executed source and raw checks.

This checkpoint establishes geometry and numerical authority only. The Arc is
not yet exposed as an operational creator option. Shared prism brush/routing,
presentation, editor integration, strict Save/Open and real-browser qualification
continue within Pass 10. The current actual format inventory ends at Horseshoe
37; 21–24 remain reserved. Arc integration will allocate its own unused format.

No Hollow Arc, excavation, link, displaced material, other geometry, website
integration, deployment or database work is included. Owner acceptance and
physical-device testing remain separate. The protected recovery branch remains
at `35f7f5d34edf861c33c5eb4decad92d41664c749`.

## Operational B

The statements above describe the frozen A checkpoint. B adds the normal
**Arc World** creator, all six structural controls, numerical detail, the Atlas
workspace and strict format **38**. The format inventory is frozen at A;
21–24 remain reserved and no previous format changes its interpretation.
Upper/Underside maps preserve the actual bounded footprint. Wall map follows
the complete physical perimeter; cuts remain explicit map cuts. Physical
rotation, Pan World, overview, Fit arc, wheel zoom and ten region focus choices
operate on the same geography. Occluded inward/end focus clears actual opposing
material using the geometry's real clearance, with ordinary ray picking intact.

Arc uses the accepted triangular authority, field/gradient cache, sharp polygon
atlases, palette and relief, four-quarter-pixel GPU presentation, ordered Canvas
wall runs and true cap silhouette. Its presenter/view entry points alias the
shared prism implementations. The capacity exception requires this exact
provider/generation, 244 triangular charts, 124 vertices, 366 edges, n32/n64
and `122*n*n+2` canonical samples. Existing capacity profiles are unchanged.
There is no separate Arc color field or alternate quality tier.

A broad, 30-degree Arc exposed a faint Canvas antialias pixel outside a very
thin/sheared atlas clip. The shared Canvas presenter now also applies its
already-constructed exact physical union as a final destination-in mask. It
reuses the existing path and scratch layer, leaves interior color/field values
intact and introduces no expanded silhouette or hidden material. Both complete
Canvas workflows are repeated after that change; GPU workflow code is unchanged.
All final matched default/variant pixel checks use the corrected source.

The existing connected brush, four tools, candidate pruning, worker protocol,
host-validated canonical commits, input subdivision, rolling scheduling, preview,
dirty journals and whole-gesture history remain authoritative. Save captures
the current validated editor state and exact Float32 words, including -0.
Header and payload share one checksum. Strict reconstruction checks raw and
derived geometry, topology, three identities, limits and every record key.
Corrupt Open validates before replacement; incompatible saved geometry cannot
replace the existing World. No painted geography is resized or remapped.

### Connected distance and separated ends

The shared prism router uses real footprint visibility/shortest paths, physical
wall arclength, certified unfolded cap/wall hinges and local vertex cones;
interval certificates bound numerical error. Ambient chord distance is only a
lower bound. Unsupported global path requests retain the accepted explicit
failure/prefix semantics, rather than inventing a through-solid shortcut.
Native input is subdivided within the existing brush/thickness bounds.

Near-closed geometry exposed two narrowly corrected certificate cases. A cap
edge's actual incident-wall alias now receives the globally exact straight
route on that convex wall. A geometry adapter may also supply a certified lower
bound to a real perimeter edge, preventing an unrelated nearby end from
unnecessarily shrinking a valid hinge/cone neighborhood. Existing Crescent and
Horseshoe geometries do not supply this optional hook.

For Arc, the projection of any surface path stays within its real material
footprint. This footprint meets z=0 only at x >= b, where b is the actual
central inner vertex. For point/edge hulls wholly on opposite sides of z=0
and with x <= b, any path therefore has length >= `2*b - max(A.x)-max(B.x)`.
Outward interval arithmetic certifies this total-x-variation lower bound.
Elsewhere it returns zero. The shared router retains actual surface-distance
authority; this cut bound only excludes impossible shortcuts and certifies
local escape distances. No terminal edge becomes a periodic alias.

The operational receipt records the exact executed source, raw checks, matched
pixel views and actual input-to-pixels timing. Initial failed terminal alias/
escape and short-point fixture checks are retained as diagnostic evidence.
The pixel fixture's initial high-frequency bands, then its wide views with
broader bands, had too few stable-ocean pixels outside the accepted two-texel
coast support. Both raw attempts are preserved. Final qualification uses broad
deterministic bands and matched closer framing, with exactly the same coverage,
stable-land/ocean, color, seam and silhouette thresholds. Short-Arc overview
framing centers the actual body. These are test-data/camera changes only.
For the minimum-span broad profile, long, skinny facets make the independent
two-texel interval support span most of a facet. Its deterministic bands therefore
follow the longitudinal angle in the body, with radial/vertical variation in
the real terminal collars. This supplies substantial stable terrain on every
face without changing the support reference or any acceptance gate.
Complementary configuration, continuous joins, close-end isolation, navigation,
recovery, emulated input and affected prior-family checks finish in C. A test
appearing in B's source inventory does not imply that its C qualification ran
at B. Owner acceptance and physical-device qualification remain separate.
