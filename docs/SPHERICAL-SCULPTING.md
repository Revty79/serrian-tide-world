# Spherical sculpting and numerical history — A6-C

This pure TypeScript layer consumes the A6-A numerical sphere. All four tools share A6-B's cap enumeration, geodesic influence, great-circle spacing, lifecycle and exact bounded history. A6-C adds Smooth/Flatten without changing the planar/periodic editor, save codecs, spherical authority or Raise/Lower numerical expressions. There is no React, Canvas, browser storage or globe UI in this engine.

## API and lifecycle

```ts
const history = new SphericalHistory(terrain);
const point = { ...terrain.metadata.identity, direction: [1, 1, 1] as const };
const stroke = startSphericalBrushStroke(terrain, point, {
  tool: 'raise', radiusMeters: 80_000, strengthMeters: 200,
}, history);
try {
  stroke.moveTo({ ...terrain.metadata.identity, direction: [0, 1, 0] });
} finally {
  stroke.end(); // Keeps a completed or partially completed stroke as one history operation.
}
history.undo();
history.redo();
```

`SphericalBrushPoint` carries World/surface identity plus either a finite nonzero 3D direction or an A6-A `SurfacePosition` (`patchId,u,v` angular face coordinates). The future UI supplies physical positions through its inverse projection. Normalization removes vector magnitude, not geographic information. Foreign identities, invalid chart coordinates, zero/nonfinite directions and history from a different provider instance are rejected.

Settings are captured/frozen per stroke. Radius is physical meters, positive and finite, angular radius at least 1e−12 radians and at most π (the maximum geodesic separation). This precision floor prevents meaningless sub-machine-scale footprints; it is not a geographic detail claim or a future UI radius choice. Large caps may cover most/all of the sphere. Existing neutral planar map units are never converted implicitly.

`SphericalBrushSettings` is a discriminated union. Raise/Lower retain positive finite Float32-range `strengthMeters` per dab. Smooth takes `intensity`; Flatten takes `intensity` and `targetElevation`. Intensity is a finite blend factor **0…1**, equivalent to 0…100%; zero is a supported no-op. Targets are finite Float32-range meters relative to the provider's defined sea-level datum: metadata `seaLevel=0`, the reference sphere at `radiusMeters`. Positive targets are outward above that datum; negative targets are below it. This pass does not add a configurable datum or change radius. Example settings:

```ts
{ tool: 'smooth', radiusMeters: 80_000, intensity: .5 }
{ tool: 'flatten', radiusMeters: 80_000, intensity: .75, targetElevation: 2500 }
```

Starting applies one dab. `moveTo` supplies physical path segments. Repeated identical positions and stationary time add no dabs. `end` is idempotent, finalizes optional history and stops all later movement; cancellation can call it to preserve completed work. Only one engine stroke can be active per provider instance. Do not interleave unrelated provider writes or manual history operations inside a stroke. Finish before Undo/Redo, clear or starting another history operation; conflicts are refused. History is optional for numerical consumers, and automatic when passed as the fourth argument.

Invalid or ambiguous segment endpoints reject before that segment modifies data and leave the previous anchor/residual intact, allowing a valid intermediate or explicit end. A failed dab validation ends the stroke and commits its previously completed portion; the failing dab writes nothing. Use `finally` to end after caller-side errors.

The returned `statistics` copy reports dabs, unique candidate checks per dab summed over the stroke, affected sample-visits, actual writes and peak prepared typed-array payload bytes. A sample can intentionally receive multiple dabs during a stroke; this is distinct from duplicate application within one dab.

## Numerical influence and canonical writes

For geodesic distance d and brush radius r, influence is zero at/beyond r. For `t=d/r < 1`:

```text
falloff = clamp((1−t)²(1+2t), 0, 1)
newHeight = Float32(clamp(currentHeight ± strengthMeters × falloff, −Float32Max, Float32Max))
```

The formulas and operation order match A5's existing expressions. Elevation is independent of radius or projected face scale. The reference sphere supplies physical distance; there is no privileged pole or artificial seam wall. Equivalent face addresses resolve the same physical centers and canonical samples. Every write calls `terrain.write(terrain.keyAt(index), value)`. Authority remains one private buffer; metadata, radius, ownership, representation version and identities remain unchanged.

Each dab reads/validates all affected values and prepares its changed values before writing any. Finite validation is per affected region; the real provider's private buffer additionally maintains a finite-write invariant globally. There is no global elevation scan per dab. Preparation uses 4,096-sample typed chunks containing canonical Uint32 indices and Float32 values. No changes means no chunks; otherwise payload is `32,768 × ceil(changedSamples/4096)` bytes. No independently editable face or halo copies exist.

## Flatten and geometry-aware Smooth — A6-C

Flatten uses `b = intensity × falloff` and `next = Float32((1−b)h + b×targetElevation)`, with the shared finite saturation guard. This convex form reaches the explicit target at full influence even when h and target differ by extreme magnitudes; `h + b(target−h)` can lose a small target through cancellation. Signed-zero equality is treated as no numerical change by the brush, so unchanged zeros retain their original bits. History still records/restores any zeros changed by real edits exactly.

Smooth uses the **unique edge-connected graph**, not chart-local 3×3 kernels or cell diagonals. An ordinary vertex, including a shared edge vertex, has four neighbors; each of the eight cube corners has three. Incident face aliases are welded before enumeration. Neighbor elevations just outside the brush cap are legitimate source data, but only samples inside the geodesic footprint are written.

For center vertex i and its connected neighbors j, measured on the reference sphere:

```text
θij = atan2(|ni × nj|, ni · nj)
wij = (minj θij / θij)²
Δi = Σj wij(hj−hi) / (2 Σj wij)
nexti = Float32(hi + intensity × falloffi × Δi)
```

Normalized weights are equivalent to inverse **geodesic distance squared**, since common radius and minimum-distance factors cancel. Ratios avoid overflow/underflow from squaring extreme physical radii. Shorter grid edges receive more influence. Half of the target weight stays at the center, half goes to the normalized neighbor mean. This lazy graph smoother damps a full-intensity checkerboard instead of swapping its two phases. The target is convex, so it introduces no new local extrema. Difference accumulation preserves an exactly constant Float32 field, including signed zero, without cancellation drift. Degree normalization avoids a special gain/loss merely because a cube corner has three neighbors.

Distance weighting was selected for this local sculpting tool over uniform chart weights, which ignore unequal physical spacing. Area-aware finite-volume diffusion would additionally require explicit dual-cell areas and flux conductances; weighting only by incident face counts or approximate vertex areas would not establish conservation or isotropy. This smoother does **not** claim equal-area tessellation, a conservative diffusion PDE, exact rotational invariance of a finite cube grid, or volume preservation. Its physical footprint and neighbor weights are independent of the viewing projection. Future erosion/volume-analysis tools need their own discretization and acceptance tests.

All source reads finish before the first write of a dab. The pending output chunks therefore provide the same result as a pre-dab source snapshot, without copying the elevation field or storing a persistent halo. Each sample's transient neighborhood contains at most four value/angle records, released immediately. No `copyElevations` occurs per dab; tracked strokes still use only the existing begin/commit copies. Whole-sphere caps can legitimately prepare O(S) output, bounded by N≤512; there are no extra O(S) Smooth input copies. Small caps cost O(candidates + affected neighbors), not O(S).

The independent test oracle reconstructs a complete welded quad-edge mesh from all six chart lattices, computes directions directly from the equiangular mapping, uses chord/asin angles, visits every vertex instead of cap bounds, and blends absolute weighted elevations. It calls neither production neighbors, cap search, directionAt, smoothing nor falloff kernels. Resolution/address ownership is the shared A6-A contract, not a second writable terrain. Tests compare nonconstant fields at all interiors/edges/corners and poles, near-single-vertex caps and multi-face/whole-sphere footprints. Reversed neighbor enumeration and isolated seam/corner spikes provide additional checks; the oracle verifies synchronous pre-dab behavior rather than a directional in-place sweep.

## Conservative spherical-cap search

`sphericalCapCandidates` returns at most six face-local rectangles and a lazy unique-sample iterator. It is a conservative superset, not a projected approximation to brush influence. Exact geodesic checks discard false positives.

For unit cap center c, angular radius α and an axis e, put `q=c·e`. The extrema of `p·e` on the cap are:

```text
maximum = 1 if q ≥ cos α, otherwise q cos α + sqrt(1−q²) sin α
minimum = −1 if −q ≥ cos α, otherwise q cos α − sqrt(1−q²) sin α
```

On a cube-sphere face, `p·Normal ≥ 1/sqrt(3)` and gnomonic slopes are `(p·U)/(p·Normal)` and `(p·V)/(p·Normal)`. Intersect the normal range with that positive face domain; discard an empty face. Interval division using all numerator/positive-denominator endpoint combinations bounds each slope. Clamp to the face slope interval [−1,1], apply atan, convert to vertex indices and pad outward by one lattice cell. Component bounds also expand by 128 × Number.EPSILON to protect roundoff. This derivation is project code, not an adoption of S2's different projection/index system. [S2's cap definition](https://s2geometry.io/devguide/basic_types.html) describes the reference spherical region terminology.

Every true cap sample lies inside each incident chart's conservative rectangle. Only its first canonical face alias emits it. This gives unique physical candidates without allocating a Set proportional to the sphere. Interior nodes are already owned by their face; boundary nodes check their owner alias. Large caps may legitimately enumerate every sample; small caps inspect a bounded subset. Region construction and unique ownership do not mutate elevations.

The deterministic candidate oracle tests 29 centers (five special plus 24 seeded directions) at eight angular radii, including zero, near-zero, hemispherical and π. At N=16 every exact cap sample must be present, and no candidate key may repeat. Brush tests independently compare numerical influence to brute-force geodesic evaluation.

## Great-circle strokes

`greatCircleArc` normalizes endpoints and measures `θ = atan2(|a×b|,a·b)`. For an unambiguous shortest arc, define `normal=normalize(a×b)` and `tangent=normal×a`:

```text
position(f) = normalize(a cos(fθ) + tangent sin(fθ)), 0 ≤ f ≤ 1
segment length = sphereRadius × θ
dab spacing = radiusMeters / 4
```

The basis form avoids division by sin θ in the interpolation weights. Endpoints return their supplied normalized directions. Angular differences ≤64 epsilon count as stationary; the prior anchor is retained so tiny successive displacements can accumulate instead of disappearing event by event. Segments within 1e−8 radians of antipodal are rejected: the caller must supply a physical intermediate to define the route. No arbitrary great-circle axis is invented. This agrees with the need to handle degenerate antipodal interpolation explicitly; spherical interpolation itself follows great-circle arcs. [UT Austin graphics course notes](https://www.cs.utexas.edu/~fussell/courses/cs395t/mc-course.pdf)

Residual distance carries between segments, including chart seams/corners. Neither seam transitions nor event timing restart spacing. A 64-epsilon distance tolerance handles a dab exactly at an endpoint. A segment requesting more than 65,536 dabs is rejected before processing it; increase radius or provide shorter segments. This is a synchronous numerical work bound, not an automatic resampler or a UI timing policy.

Identical physical paths with more events agree within floating-point arithmetic. The 12 adjacent-face fixtures with 31 subsegments and duplicate events produce **identical Float32 bits** to sparse endpoints. General paths still inherit double-precision rounding and Float32 accumulation; a changed physical polyline is a different path.

## Exact history and memory policy

`SphericalHistory(terrain, budgetBytes=16*1024*1024, entryLimit=100)` binds one provider instance. It uses the A3 history principles, with no mutable authority view. `begin` captures one private Float32 snapshot viewed as Uint32 words. `commit` captures another independent snapshot, validates finite values, compares exact bits and retains the cheaper representation:

- Sparse changed indices + before/after words: `12 × changedCount + 64` accounted bytes.
- Contiguous before/after span: `8 × spanCount + 64` accounted bytes.

The 64-byte allowance approximates each entry's bookkeeping; it is not a measurement of all JavaScript overhead. No-op commits retain Redo and add no entry. Actual new recorded edits discard incompatible Redo. Undo/Redo restore word-equivalent Float32 values, including signed zero, through canonical keys into the original authority. State IDs track positions in history. Oldest Undo entries are evicted to keep total retained Undo+Redo within both caps; moving an entry between stacks does not duplicate it.

Constructor budget must fit one worst-case full-surface entry `2 × elevationByteLength + 64`, ensuring an accepted full operation can be retained. At N=512 that is **12,582,992 bytes**, fitting the default 16 MiB budget; consecutive full operations therefore retain only the newest that fits. N remains capped at 512 by the provider. This does not promise large UI operations are interactive on mobile.

The provider's read-only `revision` increments on actual Float32-bit changes, including +0/−0 transitions, and ignores same-bit writes. History detects an out-of-band revision before beginning or applying another operation, clears stale entries and throws while preserving current elevations. Explicit `clear` establishes a fresh baseline. Do all related edits inside tracked operations; unrelated writes during a pending operation cannot be distinguished from that operation's intentional writes. No historical timeline, branch storage or persistence is implied by this session history.

Transient costs are explicit: one `4S`-byte pending snapshot, another `4S`-byte commit snapshot, plus a new entry of at most `8S+64` bytes before eviction, where S is unique sample count. The live authority is `4S`; retained history is at most its budget. At N=512 the conservative live typed-payload bound during commit is about 46 MiB with an already full 16 MiB history, excluding object/GC/browser overhead. Dab preparation is released after each dab; its worst-case full-cap chunks add at most about `8S+32,768` bytes while preparing, rather than six authority arrays. Garbage collection may retain released allocations longer. No browser/process RSS ceiling is claimed.

## Reproduction and remaining work

Run `node scripts/measure-spherical-brush.mjs [output.json]` for deterministic multi-face Lower/signed-zero history, event-frequency evidence and measured N=128/256 Raise benchmarks. [Committed receipt](evidence/a6-b-sculpting-receipt.json) includes all paths, units, counters, raw timing runs, payload accounting and digests. One warmup precedes three runs per resolution. Timing includes initial dab, 272-dab path and history commit; digest computation is excluded. This is a local Node benchmark, not an interactive globe/mobile rendering result.

Run `node scripts/measure-spherical-tools.mjs [output.json]` for A6-C's N=128/256 Smooth/Flatten timings, candidate/read counts, exact history digests and typed-array payload accounting. One warmup precedes three measured runs for each tool/resolution. See the [A6-C receipt](evidence/a6-c-sculpting-receipt.json) and [completion report](A6-C-COMPLETION.md). These are local numerical measurements, not globe/mobile frame-rate evidence. Raise/Lower's original script and committed A6-B receipt remain unchanged.

## A6-D interface requirements — D1 foundation, D2 implementation

A6-D1 now implements the read-only globe/net, rotation/recentering and physical inspection foundation described in [SPHERICAL-VIEWS.md](SPHERICAL-VIEWS.md). The remaining requirements below concern the separately authorized future editing workflow; no GUI brush or spherical persistence is added by D1.

- Rotate/recenter the spherical working surface through view state while keeping the canonical geographic frame and elevation samples fixed. A sphere must not be implemented as a horizontally periodic rectangle.
- A flattened view may use cutouts, gores, connected faces or local spherical projections. A surface-specific view provider must choose layout, movable cuts, forward/inverse mapping and singular-region behavior; periodic side strips are not the universal interface.
- Convert screen input to identity-bearing physical directions or validated chart positions independently of the selected projection. Then feed the existing engine. Never infer physical brush size from chart pixels or resample the authority when changing the view.
- Project the actual geodesic cap for previews, including split footprints at cuts. Readout, hit testing and rendering must agree with the same applied view state.
- Preserve predictable pan/rotate/zoom and painting arbitration, native touch behavior, cancellation and one-operation history. Add edge-assisted drawing only where appropriate to the spherical view, updating the physical path consistently as the view moves.
- Make poles, corners and face/cut transitions usable and centerable. A camera action cannot change elevation, ownership, radius, identity or history. Future hollow interiors/exteriors remain independently selected surfaces.

D2 supplies globe/net sculpting, physical previews, GUI history and incremental rendering ([editing](SPHERICAL-EDITING.md)). Its cooperative generator, hemisphere domain and immutable Smooth geometry cache retain the verified numerical results. E adds a separate [v3 preservation layer](SPHERICAL-PERSISTENCE.md), draining queued input before a stable Save; reopened geography starts fresh history. No brush/geometry algorithm changes in E. Held-stroke globe limb rotation remains D2-R, and weaker-device N=256 editing hardening remains required; extrusion is future. The complete roadmap, Issue #1 and steps 9 → 10 → 11 remain unchanged. **Stop after A6-E; do not begin the next pass.**
