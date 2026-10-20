# Physical solid cube — Cube-A

Cube-A implements the unchanged numerical solid exterior foundation. The separately authorized [Cube-B route provider](CUBE-SURFACE-ROUTES.md) now composes it with certified global reference-surface paths; the local-only methods described here retain their original restricted contracts. [Cube-C1](CUBE-TERRAIN-DABS.md) adds a separate numerical brush layer and a fully validated atomic patch hook; all original topology, ownership, identities and versions remain unchanged. It is independent of the six angular charts that represent the existing **round sphere**. It is not selectable in the editor and has no brushing, rendering, history adapter or Save/Open format. The existing v1–v4 codecs and UI do not import it.

## Configuration and identities

`src/surfaces/solid-cube.ts` supplies `physical-solid-cube`, version 1, configuration `solid`, role `exterior`, explicit `sideLengthMeters=L` and caller-provided World/surface IDs. IDs contain 1–128 characters and are snapshotted/frozen. This provider neither allocates World database records nor infers identity from a name. A face is scoped by `(worldId,surfaceId,patchId)`; the six stable patch IDs are `px,nx,py,ny,pz,nz`. Edge IDs are ordered incident face pairs; corner IDs are XYZ sign triples. These local IDs always need the parent World/surface scope.

The existing `WorldDefinition` can describe the provider through `shape.kind='custom'` and its versioned geometry ID. `SurfaceDefinition`, `ChartSeam`, `SurfacePosition` and `TangentTransform` remain usable unchanged. The explicit cube configuration carries dimensions; the generic custom descriptor is not a cube persistence schema. No host shape discriminator, selector or saved-record variant is added.

## Physical charts and local metric

The origin is the cube center, with fixed representation axes, not gravity, geographic north or a viewing convention. Each face has physical coordinates `u,v ∈ [-L/2,L/2]` **in meters**:

```text
P(face,u,v) = (L/2) N + u U + v V
```

| Face | Outward N | U | V | Reference position |
| --- | --- | --- | --- | --- |
| px | +X | +Y | +Z | (L/2,u,v) |
| nx | −X | −Y | +Z | (−L/2,−u,v) |
| py | +Y | −X | +Z | (−u,L/2,v) |
| ny | −Y | +X | +Z | (u,−L/2,v) |
| pz | +Z | +X | +Y | (u,v,L/2) |
| nz | −Z | +X | −Y | (u,−v,−L/2) |

`U×V=N`, and the frames are orthonormal. Local line element is `ds²=du²+dv²`, area scale 1. A face has area `L²`; the boundary area is `6L²`. Same-face segments have Euclidean physical length, e.g. a `(3,4)` meter displacement is 5 m and a face diagonal is `√2 L`. `sameFaceDistance` and `distanceToEdge` are explicitly **face-restricted**. Neither `SurfaceMetric.distance` for arbitrary faces nor `SurfaceTopology.advance` is supplied. Global shortest surface routes and directional continuation through vertices need a separately defined/certified polyhedral method. No great-circle or cylinder formula is used.

Coordinates outside the closed face are rejected. Exact boundary membership controls aliases; near-edge interior points are never snapped onto another face. Coordinate signed zero is canonicalized, while numerical elevation signed zero is preserved. `positionsForReference` accepts only actual points on the reference boundary, not directions, projections or interior-volume points. Elevation does not displace this reference geometry in Cube-A.

## Twelve physical edges and reciprocal folds

There are 24 directed seam records paired into twelve physical edges. Each identifies a source/destination edge and whether its along-edge coordinate reverses. `crossEdge` maps the **same physical boundary point** to the other chart. It does not advance a dab, duplicate a vertex or select a global path. Geometry and sample address crossings both require an explicit valid edge. A literal independently reasoned six-face net in the tests checks every destination and reversal, including all endpoints.

Across adjacent faces, outward normals differ by 90 degrees. If `A=N_from×N_to`, the one-sided tangent fold is the rigid rotation

```text
R(w) = A×w + A(A·w)
T = destination tangent components of R(source tangent vector)
```

This is a physical fold isometry, not equality of ambient tangent vectors or a smooth chart Jacobian. Matrices are signed orthogonal permutations with determinant +1; the reciprocal matrix is the inverse. Lengths and along-edge direction are preserved. For example +Z leaving the upper edge of px folds into −X entering pz. The returned transform fits the existing tangent component contract with meter coordinates.

## Eight singular corners

Each `(±L/2,±L/2,±L/2)` is one point with exactly three face aliases and three distinct one-sided normals. `normal` and `tangentVector` refer to the explicitly selected face. `canonicalPosition` selects the first incident face in the fixed face order only for address ownership, never to invent an averaged physical normal.

Three right-angle face sectors total `3π/2`; the angular deficit is `π/2`. There is no single smooth tangent plane or unique path-independent transport through the corner. A caller may explicitly choose either incident edge and request that pairwise fold. Traversing different face sequences can yield different transported tangents. Tests verify a +90-degree holonomy around the +++ corner and reject any implication that direct and two-fold transport must agree. No implicit corner-through route, spherical exponential map, brush stencil policy or elevated edge/corner embedding is introduced.

## One numerical authority

`src/terrain/solid-cube.ts` allocates exactly one private Float32 elevation buffer, initially −100 m with sea level 0 m. N denotes **cells per face edge**, with endpoint-inclusive `(N+1)×(N+1)` address grids. Face views are resolvers, not independently editable arrays.

Canonical ownership is the first incident face in `px,nx,py,ny,pz,nz` order:

| Owner group | Owned columns | Owned rows | Group size per face |
| --- | --- | --- | --- |
| px, nx | 0…N | 0…N | (N+1)² |
| py, ny | 1…N−1 | 0…N | (N−1)(N+1) |
| pz, nz | 1…N−1 | 1…N−1 | (N−1)² |

Owner groups are contiguous in that order, row-major within each group. This representation is versioned independently from the sphere, even though both closed six-chart grids have the same count:

```text
V = 6(N−1)² + 12(N−1) + 8 = 6N² + 2
  = 2(N+1)² + 2(N−1)(N+1) + 2(N−1)²
E = 12N²; F = 6N²; V−E+F = 2
```

Canonical sample keys include World, surface and terrain IDs, representation ID/version, L, N and canonical index. Foreign identities, dimension/resolution changes and spherical representation keys are rejected before access/mutation. Shared aliases resolve to the same key; no copy synchronization is necessary. Integer lattice coordinates determine ownership and reversal without floating tolerances. Symmetric physical coordinate calculation preserves bit-identical edge aliases even for odd N and decimal L.

`owner`, `aliases`, `resolve`, `positionAt`, `referencePositionAt` and explicit sample `crossEdge` provide address access. `neighbors` returns the undirected quad-mesh edge graph: four unique neighbors ordinarily, three at each corner. Reciprocal graph edges have length L/N on the reference surface. This graph is not a continuous global shortest-route method or an area-weighted brush definition.

Writes validate finite representable Float32 values, round once, and increment revision only for a changed canonical word, including +0/−0 changes. Invalid writes leave values/revision unchanged. `copyElevations` returns a defensive copy. No writable authority handle or bulk restore API is exposed. These are low-level writes for later approved numerical algorithms, not an interactive brush or Undo stack.

## Numerical and resource bounds

N is an integer from 2 through **256**, default 128. Both target resolutions are exhaustively verified. Dimensions must have positive finite L, half-length, diagonal, face area and total area; terrain creation additionally requires positive finite cell spacing and cell area. Underflow/overflow or non-finite input is refused before allocation. Limits reflect the supported Float64 numerical range, not a guessed planetary size. Revision is a nonnegative safe integer; a changed write at `Number.MAX_SAFE_INTEGER` fails before mutation.

| Resolution | Canonical vertices | Face addresses | Float32 authority bytes | Authority MiB |
| --- | --- | --- | --- | --- |
| N128 | 98,306 | 99,846 | 393,224 | 0.375008 |
| N256 | 393,218 | 396,294 | 1,572,872 | 1.500008 |

There are no retained sample-sized alias, coordinate or neighbor caches. Metadata, frames and six ownership groups are constant-size. Resolving/reading/writing an address is bounded constant work; aliases enumerate at most three faces, neighbors at most twelve candidate chart incidences. Lazy `samples()` yields at most `6N²+2` keys. Construction/fill and an explicit defensive copy cost O(N²); each copy allocates at most the authority byte length. JavaScript objects, allocator overhead, caller-retained copies and test/certificate allocations are additional costs. These payload bounds do not claim browser/phone performance or total process memory. No GPU, server, worker or paid service is needed.

## Future boundaries

Later cube paths must specify valid unfolding sequences, vertex ambiguity, ties, error/work limits and independent numerical certificates before claiming global shortest routes. Subsequent tools should reuse ordered input, revision leases, prepared-work acknowledgement and exact history where physically appropriate, while retaining cube-specific distance, visibility and numerical budgets. New renderers must consume this authority and independently meet the shared visual/painting standards, with early first-visible responsiveness measurements rather than assuming accepted sphere costs are acceptable.

Hollow cubes will require a separately authorized configuration and provider behavior: independently identified exterior and interior face groups under one World; independent terrain arrays, revisions, histories, saves and selection; inward interior normals and explicitly defined dimensions, clearance and elevation conventions. Coincident face names or a common parent must never merge their samples. Cube-A rejects `role='interior'` and hollow configurations; it does not instantiate them.

The [master roadmap](PHASE-1-HEIGHTMAP-ROADMAP.md) retains all eleven phases, Issue #1, conversion, creator-owned assets, mobile structures and flexible map hierarchies. The flat/wrapped visual overhaul is deferred. Cube-A passed Ember's source/architecture review; the owner separately authorized numerical-only Cube-B. [The route specification](CUBE-SURFACE-ROUTES.md) documents its complete family proof, exact comparison, physical tie handling, reconstruction and independent references. Cube-A ownership, versions and terrain remain unchanged. Cube-B passed Ember's review. The owner separately authorized Cube-C1 numerical single dabs only. Stop after Cube-C1 for Ember review and owner approval. Cube-C2 continuous strokes/history, Cube-D rendering, Cube-E editor, Cube-F persistence, Cube-G/H hollow cubes and Cube-I final acceptance remain future bounded checkpoints.
