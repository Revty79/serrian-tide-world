# Horseshoe Worlds

## Foundation checkpoint A

Provider `physical-prismatic-horseshoe`, generation 1, defines a genuine closed
U-shaped prism. Two straight substantial arms join a common elliptical half-bend.
The gap is actual external empty space; both terminal ends are positive-width
closed physical faces. This construction differs from Crescent's taper-to-edge
profile. It is the actual faceted reference solid, not a hidden Torus section,
mask, decorative connector or smooth body approximated only for display.

World Scale S is a uniform physical length unit. The bend's longitudinal radius
is `r = S / (2 * Bend Curvature)` and its transverse radius is half Arm Spacing.
Arm Length, Arm Spacing, Body Width and Body Thickness are explicit fractions of
S. Changing S therefore scales every material coordinate. Creator controls use
percentages for those ratios and expose the corresponding physical dimensions.
Scale is not a claim that the maximum bounding-box dimension always equals S.

In the x/z plane the bend's inner/outer chains use
`(-(r +/- Width/2) cos(theta), -(Spacing/2 +/- Width/2) sin(theta))`,
with theta from -pi/2 to pi/2. Straight arms extend from x=0 to Arm Length at
z=+/-Spacing/2. The generating ellipses meet straight arm lines tangentially;
the actual faceted chains retain their real segment angles. Those segments define
the actual outline. Fixed-order polynomial arithmetic reconstructs these same
binary64 vertices independently of host sine/cosine implementations.

Six sections per arm and sixteen through the bend form 28 longitudinal cap
strips and 58 real perimeter edges. Flat ends retain full body width. Beveled
ends narrow only the last Width/4 of each arm to a flat terminal face 75% of body
width, adding real sloping lateral boundaries without creating pointed tips.
Every cap strip has positive area; the two ends remain distinct outer/inner
vertices. The outline is extruded through `[-Thickness/2, Thickness/2]`.

Supported scale is 100,000-1,000,000,000 m; curvature 0.8-1.6; Arm Length 15-100%
of scale; Body Width 8-25%; Arm Spacing at least 105% of Body Width and at most
90% of scale; Thickness 20-60% of Body Width. These bounds maintain a positive
inner bend and real arm gap. The default is scale 2,000,000 m, curvature 1,
arm length 50%, spacing 70%, width 20%, thickness 10% and flat ends.
Structural dimensions are creation-time parameters; existing terrain is not
silently regenerated or remapped by a configuration change.

The closed manifold has 116 vertices, 114 physical polygons, 228 numerical
triangles and 342 numerical edges (Euler characteristic 2). Every edge has two
oppositely directed incident triangles. The surface area is twice planar domain
area plus perimeter times thickness; volume is planar area times thickness.
Each chart has an affine physical metric, exact shared vertex/edge ownership
and stable outward normals. Upper/lower, different arms and the two end faces
retain independent words where their physical locations differ.

The accepted triangular indexed authority owns the same Float32 terrain,
validated identities, aliases, exact private snapshots and live revision getter.
N128/N256 equivalent profiles use N32/N64 per chart: `114 n^2 + 2` canonical
words, 116,738 / 466,946 samples (466,952 / 1,867,784 authority bytes).
New geography starts at the accepted -100 m ocean. Elevations retain the prism
family's finite +/-Thickness/8 bound. No shared work/history/backing limit rises.

The narrow extraction `polygon-prism.ts` reuses Crescent's actual welded
cap-strip/wall construction and geometry/metric helpers. Four pre-extraction
Crescent physical-model fingerprints remain bit-for-bit identical, including
vertices, frames, interval bounds, ordering and metrics. All 27 focused Crescent
checks and eight Horseshoe foundation checks pass, as do TypeScript/build.
The frozen foundation receipt records the executed source and raw results.

This checkpoint establishes physical geometry and numerical ownership. The
Horseshoe is not yet exposed as an operational Atlas editor. Shared prism
surface routing, brush/presentation/session adapters, strict persistence and
real-browser qualification continue under Pass 9. Format inventory currently
ends at 36 (Crescent); 21-24 remain reserved. Operational integration will use
an independently allocated format without reinterpreting existing data.

No excavation, hollow variant, later geometry, website integration or deployment
is included. The protected recovery branch is unchanged.

## Operational editor

The creator now offers **Horseshoe World**, N128/N256 equivalent detail and all
seven physical construction controls above. Names describe physical shapes;
there is no dice-number label. Fourteen focus targets cover both upper and
lower arms, both bend caps, inner/outer bend, four straight arm sides and two
closed terminal faces. Inward-arm focus rises across the actual gap to clear
the opposite arm; the picker continues to intersect the real solid.

Horseshoe and Crescent bind the shared `polygon-prism`, `prismatic-distance`,
`prismatic-brush`, `prismatic-view` and `prismatic-presentation` modules. Crescent
keeps its public entry points. Terrain ownership, physical gradient field,
polygon atlas, palette/relief, worker protocol, input scheduling, history and
Atlas Save/Open remain the accepted implementations. Physical rendering uses
static real triangles/depth; Canvas retains ordered wall runs and complete cap
silhouettes. Coplanar arm strips share gradient regions; bend facets, beveled
lateral pieces and end walls retain their actual distinct normals.

Cap distance uses an exact-sign visibility graph in the true U footprint with
outward interval edge lengths and Dijkstra bounds. Wall distance unfolds the
real perimeter. Cap/wall and vertex neighborhoods retain certified hinge/cone
and saddle-apex routes. The bounded general prism search is qualified below
half body thickness minus its numerical margin; unsupported distant wall
queries explicitly fail rather than substitute a chord. Long cap gestures are
subdivided along genuine connected routes. The brush continues to prune by
global lower bounds. For opposite arms, any projected real path must cross
z=0 at or behind the inner bend, so total x variation supplies a cheap certified
lower bound. This eliminates gap searches without joining the arms or changing
the accepted distance calculation.

Format **37**, `horseshoe-prism-welded-triangles-v1`, is a new allocation after
Crescent 36. Reserved formats 21-24 remain untouched. It preserves raw and
derived dimensions, end construction, distinct World/surface/terrain identities,
canonical Float32 words including negative zero, editor controls, map/physical
camera and navigation. Strict exact-key/schema and derived-dimension validation,
finite physical limits and SHA-256 header/payload checks finish before replacing
the active World. Save detects concurrent authority edits. The local store
rejects incompatible geometry under an existing World identity. Reopened edits
begin fresh undo history, as in the accepted family.

Capacity is qualified only for this exact topology and N32/N64 chart lattice.
There are 228 GPU array layers, within WebGL2's guaranteed minimum of 256.
Existing Canvas 1.5M desktop/650k coarse and GPU 3M backing limits, field/history,
worker queues and scheduling limits remain unchanged. No terrain displacement,
excavation, hollow boundary, link, future shape or host integration is included.

The frozen operational and completion receipts record source hashes, executed
browser profiles, independent reference results, raw diagnostics and captured
pixels. Technical qualification and owner acceptance remain separate. Trusted
CDP touch/pen input and phone viewport emulation do not establish physical-device
performance or owner approval.
