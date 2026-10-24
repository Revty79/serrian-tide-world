# Hourglass Worlds

## Physical construction

Construction version 1 is a closed faceted axial solid. Two broad planar
16-sided end caps taper through four homothetic frustum segments per side to a
positive-radius, positive-length waist. This is a separate Hourglass profile;
there are no bulbous lobes, overlapping shells, internal rendered disks or
zero-width connections. The facets define the physical boundary, rather than
approximating an unimplemented smooth surface.

The accepted Dumbbell's dyadic 16-vertex cross-section and mechanical boundary
builder now live in `surfaces/axial.ts`. Its published API remains through
compatibility exports. Twelve independent old-versus-new configurations across
three scales reproduce exact metadata, vertices, edges, profiles, normals,
frames, interval bounds, areas, volumes and angle defects. Sphere, Cube,
Cylinder and other families keep their providers and terrain interpretations.

World Size S is 100,000–1,000,000,000 m. Height is 0.4–1.5 S. End radii are
independently 0.8–1.2 times S/4. Waist radius is 0.25–0.6 times the smaller end
radius. Its center sits at 35–65% of the axial height and its length is 15% of
height. Both flares always have positive length. Straight taper is linear;
gently curved taper uses radius w+(R-w)(1.25t-0.25t²), sampled at t=0,¼,½,¾,1.
The physical surface is piecewise planar with intentional creases. Flat closed
ends are the initial supported end shape. Structural dimensions are fixed at
creation; viewing never remaps painted geography.

There are 162 vertices, 176 convex atlas polygons, 320 triangular charts and
480 chart edges (Euler characteristic 2). The 32 cap-fan polygons are coplanar
in two real terminal regions; numerical fan edges are not physical creases.
Each cap shares one gradient region. Straight-profile coplanar side strips
also share their physical gradient region. Three convex material regions
(first flare, waist, second flare) give exact visibility and Canvas order.
Their internal axial partition disks are never rendered.

## Geography and physical mathematics

The existing triangular-polyhedron Float32 authority welds every vertex, rim,
waist join and circumferential alias. Equivalent N128/N256 use n=32/64:
163,842/655,362 samples, 655,368/2,621,448 authoritative bytes. Cap centers are
separate canonical words. Blank geography is -100 m. Elevation limits are
±waistRadius/4. Heightmaps color the reference surface; displaced excavation
is outside this pass.

Physical frames induce each affine triangle's exact metric. The shared bounded
axial solver exhaustively unfolds feasible straight geodesic pieces and
propagates saddle-vertex routes using directed interval bounds. It retains the
Dumbbell's 8,192-window/65,536-placement source limits and geometry-only cache
limits (24 vertex entries and 8,192 retained placements). Unresolved influential
distances fail closed; graph paths supply upper witnesses only. No through-body
chord or approximate edge metric becomes brush influence.

For locations on one convex planar end cap, the real straight cap segment
attains the ambient lower bound and is globally shortest. Waist locations use
the accepted developed periodic polygonal-cylinder certificate when its escape
bound proves global validity. This certificate projects only the open body
between terminal planes, where every radius is at least the waist radius.
Other routes, including cap-to-flare and flare-to-waist, use the full solver.
The two end caps never wrap longitudinally. Pointer interpolation follows real
surface curves, independently of the certified influence metric.

The accepted brush policy requires a default radius covering at least three
native cells inside a 1,600-sample waist footprint estimate and the unchanged
4,096-sample preview cap. Unsupported dimension/detail combinations are
rejected before allocation. No common work, history, queue or display limits
are raised.

## Shared presentation

The accepted static-triangle GPU, indexed field, cube palette/relief, polygon
atlases, anisotropic texels, dirty journals and Canvas coverage mechanism are
shared through the axial adapters. Dumbbell compatibility entry points remain.
The camera-only nearest-triangle quarter-ray coverage cache remains bounded at
131,072 admitted pixels. Desktop/coarse settled budgets remain 1.5M/650k pixels.
Coplanar cap and straight-flare planes aggregate their real triangle charts for
picking; selecting a plane must not select only its first numerical triangle.

## Checkpoint A

This checkpoint is the geometry and numerical foundation. The normal creator,
operational Hourglass UI, browser Hourglass pixels and persistence are still
required before operational completion. Automated evidence is separate from
owner acceptance and physical-device input qualification.

Foundation validation passed 63 focused source checks, TypeScript and the
production build. Installed Chrome passed both Dumbbell painting/history/Save
workflows (p95 28.6 ms WebGL2, 36.2 ms Canvas) and all 17 matched N128 pixel
views. Stable/reference channel maximum was 3; coverage, outside and diagonal
violations were zero. These qualify the extraction, not the unfinished Hourglass
editor. Evidence is frozen in `evidence/hourglass-foundation/receipt.json`.
