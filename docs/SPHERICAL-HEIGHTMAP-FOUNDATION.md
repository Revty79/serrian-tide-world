# Numerical spherical provider — A6-A

This is the implemented in-memory foundation. It provides no globe renderer, spherical UI/brushes/history or browser save format. The existing bounded/periodic model and v1/v2 codecs are separate and unchanged. Physical shape is a round reference sphere; a true cube-shaped World is a different future geometry.

## Public contract and identity

`createSphericalTerrain({terrainId, identity: {worldId, surfaceId}, radiusMeters, cellsPerEdge?})` creates one surface and one private Float32 elevation buffer. IDs are supplied by the host, nonblank and at most 128 characters; none creates or guesses a database World record. Radius is required, positive and finite, with finite half-circumference. There is no Earth default, latitude/longitude grid or geographic viewing axis. Elevation units are meters; initial elevation is −100 everywhere and sea level is zero.

Representation provider is `equiangular-cube-sphere-vertices`, version 1, with fixed faces `px,nx,py,ny,pz,nz`. This version describes in-memory addressing and must not be confused with browser heightmap formatVersion 1. Metadata and its nested geometry/representation/identity/face list are immutable. A new resolution requires a new deliberately constructed terrain authority; there is no implicit resampler.

| API | Meaning |
| --- | --- |
| `keyAt(index)`, `samples()` | Validated canonical key and lazy enumeration of all unique keys |
| `resolve({worldId,surfaceId,patchId,column,row})` | Integer face-sample address to unique owner key |
| `aliases(key)` | One interior, two edge or three corner chart addresses for that node |
| `read(key)`, `write(key,value)` | Canonical access; writes validate identity/index and finite Float32 range before mutation |
| `copyElevations()` | Explicit independent Float32 snapshot, not another authority; allocates one payload-sized copy |
| `positionAt(address)`, `directionAt(key)` | Angular chart position or normalized physical direction |
| `neighbors(key,'edges'|'cells')` | Unique reciprocal graph neighbors from incident charts, sorted by canonical index |
| `step(address,'u-'|'u+'|'v-'|'v+')` | One cardinal graph step with target address/key and explicit reverse direction |
| `geometry.direction`, `positionsForDirection`, `canonicalPosition` | Chart/direction conversion and deterministic face containment/canonical representative |
| `geometry.referencePosition`, `metric.distance` | Reference position and intrinsic spherical distance in meters |
| `geometry.crossEdge`, `tangentTransform`, `derivatives`, `tangentVector` | Same-point chart transitions, analytical Jacobians and physical tangent representation |

Canonical keys contain World ID, surface ID, terrain ID, representation version, cellsPerEdge and index. Foreign surfaces/terrains, versions, resolutions and invalid indices fail before a write. Separate providers never share an elevation buffer. Signed zero is preserved. The private buffer cannot be corrupted by mutating a returned snapshot. Geometry functions never receive write access to the buffer.

## Fixed chart frame and geometry

Let `a,b` be angular coordinates in radians in `[−π/4,π/4]`. Each face uses the following fixed right-handed basis (`U × V = Normal`):

| Face | Normal | U | V |
| --- | --- | --- | --- |
| px | (1,0,0) | (0,1,0) | (0,0,1) |
| nx | (−1,0,0) | (0,−1,0) | (0,0,1) |
| py | (0,1,0) | (−1,0,0) | (0,0,1) |
| ny | (0,−1,0) | (1,0,0) | (0,0,1) |
| pz | (0,0,1) | (1,0,0) | (0,1,0) |
| nz | (0,0,−1) | (1,0,0) | (0,−1,0) |

```text
q = Normal + tan(a) U + tan(b) V
n = q / |q|
reference position = radiusMeters × n
distance(n1,n2) = radiusMeters × atan2(|n1 cross n2|, clamp(n1 dot n2,−1,1))
```

Endpoint slopes are explicitly ±1. Direction normalization first divides each component by the largest absolute component, avoiding overflow and subnormal-reciprocal problems. It rejects zero/nonfinite vectors. Radius validation prevents geodesic overflow. The metric is on the reference surface, not along elevated relief; physical placement/constraints for extreme elevations are future decisions.

For a normalized direction d, containing faces have `dot(d,Normal)` equal to its largest absolute component, within a declared roundoff tolerance of 64 × Number.EPSILON. Inverse angles are `atan2(dot(d,U),dot(d,Normal))` and similarly for V. Domain excess only within that tolerance is snapped to the edge; larger chart-domain violations are rejected. One face contains an interior point, two share an exact edge and three share a corner. Fixed face order chooses the canonical continuous representative. Tiny roundoff neighborhoods of cuts may return multiple equivalent chart candidates within the documented tolerance; exact sample ownership uses integers instead.

Geographic poles are directions chosen outside the authority, not special rows. For example +z is an ordinary pz center at even N, while an arbitrary chosen pole such as normalized (1,2,3) is handled by the same inverse mapping. Face/edge/corner queries and future view orientation do not rearrange arrays.

The A4 strategy is informed by the equiangular gnomonic construction and seam/stencil caveats described in [Purser, NOAA Office Note 496](https://repository.library.noaa.gov/view/noaa/19263). Atlas's fixed frames, ownership layout and APIs are project choices; no atmospheric model or its performance is adopted.

## Unique sample ownership

For N cells per edge, each logical face has `(N+1)²` vertex addresses. At column i, row j, use `a=(2i/N−1)π/4`, `b=(2j/N−1)π/4`. The authoritative unique count is:

```text
6(N−1)² face interiors + 12(N−1) edge interiors + 8 corners = 6N²+2
```

For **identity only**, construct integer cube-surface coordinates:

```text
Q = N Normal + (2i−N) U + (2j−N) V
```

These integers are topological labels, not equidistant physical sphere coordinates. One coordinate has magnitude N in a face interior, two on an edge and three at a corner. Equivalent face addresses produce identical Q without floating-point equality tests.

Buffer layout is fixed by representation version:

1. Face interiors in face order, row-major `(j−1)(N−1)+(i−1)` per face.
2. Edge interiors grouped by fixed axis pair xy, xz, yz. Within each pair signs are `−−,−+,+−,++`; the free axis increases from −N to +N, excluding endpoints. Edge ordinal is `pairIndex×4 + positiveFirst×2 + positiveSecond`.
3. Corners ordered by `positiveX×4 + positiveY×2 + positiveZ`.

Edge section starts at `6(N−1)²`; corner section starts at `6(N−1)²+12(N−1)`. Inverting a key reconstructs Q, then each incident face's exact `(i,j)` by dotting its integer U/V axes. There are no six authoritative arrays, duplicate edge/corner endpoints, per-node object cache or persistent neighbor table.

## Seams, neighbors and corners

All directed transitions (destination edge, with `rev` reversing the varying integer/angle coordinate):

| Source face | u-min | u-max | v-min | v-max |
| --- | --- | --- | --- | --- |
| px | ny/u-max | py/u-min | nz/u-max rev | pz/u-max |
| nx | py/u-max | ny/u-min | nz/u-min | pz/u-min rev |
| py | px/u-max | nx/u-min | nz/v-min rev | pz/v-max rev |
| ny | nx/u-max | px/u-min | nz/v-max | pz/v-min |
| pz | nx/v-max rev | px/v-max | ny/v-max | py/v-max rev |
| nz | nx/v-min | px/v-min rev | py/v-min rev | ny/v-min |

These 24 transitions pair into 12 reciprocal physical edges. A corner belongs to three faces. `neighbors('edges')` unions valid cardinal neighbors over all aliases; regular nodes have four and corners have three. `neighbors('cells')` unions nodes of incident quads, including face diagonals; regular nodes have eight and corners have six. Both sets deduplicate canonical keys, exclude self and are reciprocal. They do not invent a fourth face or a diagonal across an ambiguous corner.

`step` within a face moves one grid index. At an outgoing edge it maps to the adjoining face's same boundary node, then advances one node inward. It returns the destination chart's reverse direction. Round trips restore the canonical source key, even if the returned address uses an equivalent chart. At corners the two explicit outgoing edge choices are honored; there is no arbitrary u-then-v diagonal continuation. For graph traversal this is valid adjacency, **not** an exact finite geodesic integration rule or a claim that equiangular ghost nodes line up across charts.

The optional step seam result is a chart change of tangent basis at the crossed boundary point. Its position is the equivalent boundary point, while the returned sample is the next node; these locations must not be confused. For `J=[∂n/∂a,∂n/∂b]`:

```text
q_a = sec²(a) U
J_a = (q_a − n(n dot q_a)) / |q|          similarly for b
T_from_to = inverse(J_toᵀ J_to) J_toᵀ J_from
```

Applying this 2×2 matrix preserves the same Cartesian physical tangent `radius × J × components`. A constant 90-degree grid rotation would be insufficient because chart axes are generally nonorthogonal. Reciprocal transitions and full three-chart corner cycles restore components at that point. This is not parallel transport along a finite path; future directional tools need reviewed surface paths and transport.

## Resolution and measured memory

Default N=128 is a modest numerical test baseline. Allowed N is an integer 2…512, a bounded A6-A allocation policy rather than an eventual world-capacity promise. There is no automatic radius/scale selection. [Actual receipt](evidence/a6-a-numerical-receipt.json), produced by `node --expose-gc scripts/measure-spherical.mjs`:

| N | Unique elevations | Float32 bytes / measured live ArrayBuffer delta |
| --- | --- | --- |
| 16 | 1,538 | 6,152 |
| 64 | 24,578 | 98,312 |
| 128 | 98,306 | 393,224 |
| 256 | 393,218 | 1,572,872 |
| 512 | 1,572,866 | 6,291,464 |

Measurement samples Node's ArrayBuffer allocation before/after each constructor with GC between cases and confirms it equals the elevation buffer's actual byteLength. It excludes object/closure overhead and later copies/rendering/history/indices. Each explicit snapshot adds another payload-sized allocation; iterating keys/aliases/neighbors creates transient objects but no persistent global table. Construction timing in the receipt is a local single-run observation, not a browser editing or weak-device benchmark.

Future footprints can enumerate unique keys, obtain physical directions, query incident faces/neighbors and apply the reference metric without relying on projected pixel distances. A6-A does not implement complete brushes, accelerated cap enumeration, interpolation, Smooth weights, geodesic stroke integration, mutable resolution or spherical history. Browser performance and aggregate memory budgets must include those later features before UI acceptance.

## Future persistence preparation — no codec implemented

Spherical data must eventually receive its own separately approved versioned storage envelope. Do not send this provider through v1/v2's planar codecs or reinterpret their sample counts. The preparation contract is:

| Future field/policy | Required meaning |
| --- | --- |
| Parent World / surface / terrain identities | Bind actual host World records deliberately; retain separate independent interior/exterior or other surfaces |
| Physical geometry | `sphere`, explicit radius in meters, reference frame convention and elevation/sea-level units; never infer Earth parameters |
| Representation | Provider ID/version, N, fixed face bases/order, ownership/index algorithm version; reject unknown versions |
| Unique payload | Exactly 6N²+2 authoritative Float32 values in declared canonical order/endianness; no independently saved edge/face duplicates |
| Face/patch addressing | Six stable face IDs resolving back to shared canonical keys; derived aliases or halos remain disposable caches |
| Integrity and limits | Canonical metadata+payload checksum, finite values, count/byte/resource limits before allocation and validation before replacement |
| Historical compatibility | Separate immutable terrain revision/timeline/branch IDs and parent relationships; record geometry/representation/resolution compatibility per revision; never rewrite old history when a view changes |
| Upgrade/recovery | Explicit schema/format authorization, preservation of v1/v2 records/readers, tested interrupted-transaction behavior, backup/rollback and safe unknown-version handling |

This table is a plan, not a speculative backend/schema or new browser format. Existing IndexedDB version 1, both stores, v1/v2 codecs, history engine and actual saved records are untouched. No spherical Save/Open action is offered. Future persistence, projection/rotation UI and complete spherical brush/history work require separate checkpoints after A6-A review.
