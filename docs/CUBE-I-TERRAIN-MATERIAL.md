# Cube-I terrain material reconstruction

**Preserved experiment; further 3D integration is paused by owner scope correction.**
This is an internal research dependency of future terrain-aware excavation.
It is not exposed in normal editing yet, does not remove the 0 m guard, and does
not change the interpretation of any v1–v7 file. UI/rendering/persistence work is
still required before terrain-aware holes or tunnels can be called delivered.

`hollow-cube-material.ts` introduces the explicit reconstruction contract
`cube-bilinear-envelope-v1`. It consumes detached, revision-checked snapshots of
the two existing canonical elevation banks. No brush, path, publication, worker,
terrain-history or terrain-coordinate formula is replaced.

For each face, with its existing reference half-side `H`, normal `n`, tangents
`u/v`, and bilinearly interpolated canonical height `h`, the level constraint is
`dot(p,n) <= H + h(u,v)` outside and `dot(p,n) <= H - h(u,v)` for the cavity.
Each closed envelope is the intersection of its six constraints; material is
the exterior envelope minus the interior envelope and authored cutting volumes.

Beyond a reference face's tangential extent the height continues at the clamped
edge/corner value. The constraints are continuous, so their intersection has no
uncovered edge seam. Face interiors retain their normal-height meaning and World
coordinates. At displaced edges, several constraints meet and clip each other:
an offset point from one face alone may be covered by another face's material.
This explicit joining rule must be recorded in a new material-bearing save
contract, rather than silently applying a new embedding to existing Worlds.
Stored heights, canonical aliases, accepted `elevatedPosition`, surface identities
and brush distances are unchanged. The adapter must derive actual intersections;
it must not treat a face-normal offset point as a universal seam vertex.

The initial conservative admission proof requires every exterior level to exceed
every interior level, with positive interior levels. This guarantees a positive
closed shell and cavity but can reject some geometrically valid local variations.
The existing editor's reserved elevation ranges satisfy this sufficient condition.
Rejections must be visible; neither heights nor holes are silently clamped.

CPU rays enumerate projected grid/clamp crossings for each potentially intersected
face. Within a cell the height along a ray is quadratic. Coefficients come from
local sample differences, and scaled quadratic roots use the stable `q` formula.
All candidate roots are checked against the other face constraints. This avoids a
fixed ray-march step that could skip a small rim. At exact edges deterministic
face order chooses one of the valid normals; the material boundary stays closed.
The interior cutaway selects the far cavity wall, preserving existing navigation.

Authored sphere/capsule cuts reuse the existing CSG primitive and ray machinery.
CPU sphere/cylinder intersections now calculate distance at closest approach,
avoiding subtraction of world-distance squares to recover a tiny radius. The GPU
already uses this closest-approach formulation. The new terrain adapter applies
the same material/cut boundaries to first hits and conservative ball clearance.
Clearance across a union junction may conservatively reject a ball that would
fit; it never approves one on the basis of a reference-plane opening alone.

At N256 a material snapshot contains `2 × 6 × 257²` Float32 heights: **3,170,352
bytes**. N128 uses **798,768 bytes**. No allocation scales with hole diameter or
screen zoom. Preparation yields every eight rows and rejects cancellation or a
changed terrain revision before returning. Rays have a finite grid-dependent
work bound; they do not return a successful prefix after an iteration limit.
The current CPU implementation is a correctness foundation, not yet an approved
full-viewport renderer or a formal arbitrary-scale floating-point error proof.

Numerical checks cover signed heights on both surfaces, mountain/seabed/inner
mountain levels and normals, signed edge/corner joins, oblique rays compared with
an independent occupancy search, submeter through-cuts, bent connected passages,
ball clearance, cancellation, stale sources and invalid shell envelopes. A shared
capsule test covers a 0.25 m diameter at a billion-meter ray distance.

Future work, requiring a shared architecture design and separate authorization:
derive actual circular mouth/rim intersections, prepare the same material
for both renderers, connect accurate picking/preview/inspection, and version the
save contract. Local coordinate frames and viewing-scale precision must precede
relaxing the current GPU display guard. Then apply the same adapter to independently
chosen tunnel mouths and the existing routed graph. Keep ordinary painting and
legacy records protected throughout. No new geometry family is authorized.
