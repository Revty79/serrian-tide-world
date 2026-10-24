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
