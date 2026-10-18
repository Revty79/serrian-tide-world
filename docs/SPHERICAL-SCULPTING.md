# Spherical sculpting and numerical history — A6-B

This pure TypeScript layer consumes the A6-A numerical sphere. It implements Raise/Lower and exact bounded history without React, Canvas, browser storage or a globe UI. Existing planar/periodic behavior is preserved; only their unchanged falloff/saturation expressions were extracted into `brush-math.ts`.

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

Settings are captured/frozen per stroke. Radius is physical meters, positive and finite, angular radius at least 1e−12 radians and at most π (the maximum geodesic separation). This precision floor prevents meaningless sub-machine-scale footprints; it is not a geographic detail claim or a future UI radius choice. Strength is positive finite Float32-range meters per dab. Only Raise/Lower are accepted. Large caps may cover most/all of the sphere. Existing neutral planar map units are never converted implicitly.

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

Spherical Smooth/Flatten need a reviewed curved neighborhood/weighting policy. Interactive projected views, rotation, projected brush previews and cancellation/input integration remain later work. Spherical Save/Open needs its own approved codec/recovery contract. The current browser has no sphere option. All future shape/history/map-style/Worlds requirements in the [master roadmap](PHASE-1-HEIGHTMAP-ROADMAP.md) remain preserved. Stop after A6-B.
