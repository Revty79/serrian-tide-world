# Physical cylinder single-dab sculpting — A7-B2A

This is a pure TypeScript numerical component for the solid capped exterior defined in [the authority specification](CYLINDRICAL-HEIGHTMAP-FOUNDATION.md). It has no browser host, renderer, input controller, history, selector or persistence format. The [B1 global distance contract](CYLINDER-GLOBAL-DISTANCE.md), physical dimensions, sharp rims and canonical layout are unchanged. Distances refer to the fixed reference surface, not displaced relief.

## Settings and lifecycle

`prepareCylindricalDab(terrain, center, settings, limits?)` snapshots and validates settings and normalizes an identity-bound `SurfacePosition`. Settings version 1 requires a finite positive `radiusMeters` and one of:

| Tool | Parameters | Unrounded update with influence w |
| --- | --- | --- |
| Raise | positive finite Float32-range `strengthMeters`, rounding to a positive Float32 | h + strength × w |
| Lower | same | h − strength × w |
| Smooth | `intensity` in [0,1] | h + intensity × w × delta |
| Flatten | intensity in [0,1], explicit finite Float32-range `targetElevation` in meters | (1 − intensity × w)h + intensity × w × target |

Strength is meters per dab, not meters per second. Radius is intrinsic reference-surface meters, not chart units or pixels. No default target, frame rate or pointer spacing is inferred. Zero intensity validates identity/settings but is a ready no-op without distance queries. Flatten at full influence/intensity assigns its target directly, preserving a signed-zero target. Smooth with zero delta preserves the original word, including signed zero. Changed results use existing finite Float32 saturation and rounding; no new terrain clamp is introduced.

The job exposes frozen `settings`, `center`, `sourceRevision`, a status, statistics, `pump(maxSamples=64)`, `commit()` and `cancel()`. Pump accepts 1–512 candidate steps. It prepares changed words while status is `preparing`, becomes `ready` on complete enumeration and writes only on explicit commit. A preparation/commit failure releases patches and becomes `failed`; cancellation of preparing/ready work releases patches and becomes `cancelled`. Neither state can commit. A successful job becomes `committed`. Invalid pump sizes and premature commits throw without writing.

## Conservative candidates and canonical ownership

For center cylindrical coordinates (rho,theta,z) and candidate (r,phi,z2), the reference chord satisfies:

```text
chord² = (r−rho)² + 4 r rho sin²((phi−theta)/2) + (z2−z)²
chord <= intrinsic surface distance
```

Any sample with distance below B must therefore have axial and radial differences below B and `2 sqrt(r rho) |sin(delta/2)| < B`. The generator intersects these necessary conditions with side rows, each cap's radial rows, and periodic angular intervals. It uses `2 asin(B/(2 sqrt(r rho)))` where the argument is below one; at a center or a large angular radius it includes all columns. End-cap chart angles reverse the physical angle. Rows/columns receive an extra lattice cell, and dimensional windows receive a `1024 epsilon × max(dimension,B)` guard. This is deliberately overinclusive. Extreme intermediate ranges widen windows conservatively; finite supported geometry and later distance checks still govern success.

Iteration follows canonical storage order: side including both rims, start center/interior rings, end center/interior rings. Caps never emit their aliased outer ring. Every center is emitted once. Split angular windows are sorted and nonoverlapping; no terrain-sized deduplication table is required. Small regular and odd lattices exhaustively compare every canonical center against all samples at three radii. Alias, wrap and connected-region tests separately check ownership and affected words.

A guarded Cartesian chord can exclude a remaining sample. It is **only a lower bound**: a chord through the solid interior cannot paint another surface. Actual weights always come from B1's global intrinsic interval. A large footprint may legitimately reach side and both disks or take a cap shortcut between side positions. Candidate generation is local for local brushes; large brushes can meet the hard work limit and fail atomically rather than silently truncate coverage.

## Distance boundaries, influence and accuracy

Let B be the radius and [lo,hi] the B1 distance enclosure. The open footprint uses `hi < B` to certify a positive influence; `lo >= B` certifies zero. An interval crossing B is refined. There is no inside/outside decision based on a rounded midpoint or a screen-space distance.

Influence is the monotone cubic `f(t)=(1−t)²(1+2t)` for 0<t<1, one at zero, zero at/after one. `cylinderFalloffEnclosure` evaluates enclosing endpoint weights after expanding divided ratios by `32 epsilon × max(1,lo/B,hi/B)`, then allows relative polynomial rounding of `32 epsilon` and subnormal terms. Its midpoint weight has an explicit absolute error. Relative polynomial padding preserves the tiny quadratic boundary tail; an arbitrary absolute blur/weight floor would not. Exact identical positions return w=1.

`maxFalloffError` defaults to 1e-6 and accepts 1e-9…1e-3. Initial distance tolerance is B times that setting. If classification overlaps or the falloff error is too large, tolerance decreases by 16, up to six query attempts for that candidate. B1 precision/work/range failures propagate. Exact boundary equality can remain unresolvable under Float64 intervals: **the entire dab then fails without committing previously prepared samples**. This intentionally conservative behavior is a current usability limitation for future controllers to handle explicitly.

Statistics report the maximum accepted falloff error and conservative pre-round elevation error in meters. Contributions before the final arithmetic allowance are:

```text
Raise/Lower: strength × weightError
Flatten: intensity × abs(target−h) × weightError
Smooth: intensity × abs(delta) × weightError + stencilRoundoff
```

An additional `128 epsilon × max(abs(h),abs(unroundedResult),MIN_VALUE)` bounds ordinary update arithmetic. Saturation is nonexpansive. Final Float32 rounding adds its magnitude-dependent quantization (tests conservatively allow `max(abs(ideal),abs(stored)) × 2^-23 + 2^-149`). These are approximation bounds against the stated continuous falloff and local smoothing formula, not a claim of bit-identical arbitrary-precision results or exact physical diffusion. The receipt records actual ideal errors and Float32 word matches.

The independent Python standard-library generator uses 65-digit Decimal continuous distances, derivative/root enumeration from B1's independent reference and a separately assembled undirected smoothing graph. It does not execute production TypeScript distance, candidate or brush code. Eight center/radius cases cover 32 canonical samples each and all four tools: both near-rim directions, a center fan, opposite-center nonunique routes, all regions and footprint distances perturbed by ±1e-9 relative. The reference root search is evidence checked against B1's proven enclosure, not a replacement global-completeness proof.

## Smooth on the polar lattice and sharp rims

Smooth is a local lazy graph filter derived from finite-volume-style scalar conductances. It does not reuse a uniform rectangular stencil. Normalize lengths by R and define `q=L/(Z R)`, `d=1/P`, `a=2pi/A`, `r=j/P`. The dual cell areas divided by R² are:

| Node | Area / R² |
| --- | --- |
| Side interior | a q |
| Shared rim | a (q/2 + d/2 − d²/8) |
| Disk interior ring | a r d |
| Single disk center | pi d²/4 |

These are side strips, cap annuli and one center disk, with rims sharing a side half-strip and cap half-annulus. Their sum is exactly the reference total area `2pi R L + 2pi R²` in real arithmetic. Each undirected edge receives the same positive conductance in either direction:

| Edge | Conductance |
| --- | --- |
| Side angular | q/a |
| Side axial, including side-to-rim | a/q |
| Rim angular | (q+d)/(2a) |
| Rim ↔ outer interior cap ring | a(1−d/2)/d |
| Cap angular at radius r | d/(r a) |
| Cap radial between r and r+d | a(r+d/2)/d |
| Center ↔ first ring | a/2, for each of A neighbors |

These approximate dual interface length divided by intrinsic spacing; they account for unequal radial/angular spacing and the cap center's high valence. Rim flux adds the appropriate adjacent half-strips across the physical fold, using scalar intrinsic continuity. It never averages fictitious ambient normals. Center neighbors are all first-ring samples; angular orientation introduces no privileged ray. Unsupported underflow/overflow in q, areas or conductances fails before commit.

For each immutable source neighborhood:

```text
delta_i = sum_j g_ij (h_j − h_i) / (2 sum_j g_ij)
```

The weights are scaled by their maximum before accumulation. A finite-volume operator would be `sum g(hj−hi)/area_i`; choosing local half-CFL pseudo-time `area_i/(2 sum g)` yields this delta. Thus the unequal areas are recognized, but the time step is **local**: this is not a uniform-time, area-conservative heat solve. At least half of the value remains at the node even at full intensity/influence. Nonnegative convex weights preserve constants and obey a maximum principle under repeated applications; the half-center prevents alternating sign oscillation of the full neighbor average. Spatially varying influence is also bounded. No mass/area-mean conservation claim is made. Ring conductances are a low-order geometric approximation, especially on coarse grids. Tests independently assemble every edge, check reciprocity/area sum, all center neighbors, constants/signed zeros and repeated extrema behavior. Roundoff allowance is `128 epsilon × neighborCount × max(abs(hj−hi))`.

## Atomic source epoch and memory/work bounds

The authority is private and synchronous. Preparation captures its monotone revision and reads only that source epoch; no dab writes occur while preparing. Each pump checks revision before and after its work, and commit checks it again. External writes invalidate the job, including writes between ready and commit. This provides an immutable logical source snapshot without copying the full terrain or retaining all Smooth source neighborhoods. A future worker adapter must preserve equivalent epoch isolation; sharing a mutable buffer would violate this contract.

Only changed results are retained in 1024-entry index/value chunks (8192 payload bytes each). `commitPreparedPatch` detaches descriptors, validates all ordinary nonshared typed arrays, strictly increasing unique indices, finite Float32 words, total count, identity, source revision and revision overflow before the first authority write. Its final synchronous loop allocates nothing and calls no caller callbacks. Object.is retains signed-zero distinctions. Revision advances once per changed canonical word, matching existing cylinder semantics; it is not a stroke/history identifier. Cancellation and distance, arithmetic, allocation, budget or epoch failure leave this dab's authority unchanged. Already accepted external writes are preserved on conflict.

| Hard limit | Maximum |
| --- | --- |
| Candidates encountered | 65,536 |
| Global distance calls, including refinements | 16,384 |
| Total evaluated boxes across successful distance calls | 262,144 |
| Boxes in one query | 32,768 (B1 unchanged) |
| Live boxes in one query | 16,384 (B1 unchanged) |
| Prepared changed samples | 65,536 |
| Configured prepared typed payload | 1,048,576 bytes; count limit further caps it at 524,288 bytes |
| Candidate steps in one cooperative pump | 1…512, default 64 |

Callers may lower exposed limits, never raise them. A failed B1 query contributes a conservative `failedQueryBoxAllowance`, not a fabricated actual box count; successful boxes plus that allowance stay within the total budget. Candidate counting may include the first rejected over-budget item; distance-call counting includes only actual calls. There is no sample-sized distance/position/neighbor cache or full authority copy. Neighbors are at most 1024 at a center and four elsewhere; live solver state and temporary JS objects are additional to patch payload. The authority remains at most 4,190,216 bytes.

Pumps are candidate-count bounded, not hard real-time slices. An individual synchronous distance call and a high-valence Smooth estimate cannot be preempted. The measured maximum pump and commit times must inform B2B; this pass makes no mobile frame-time guarantee. [Measurements](evidence/a7-b2a-dab-measurements.json) retain raw preparation/commit/pump counts and times, query/box/read statistics, precommit and final hashes, explicit-GC heap/ArrayBuffer observations and safe-stop results. Stack clearance and explicit collection are outside timings; these observations are not exact JS working-set or browser memory claims.

## Physical paths delivered; A7-B2B2 integration boundary

A7-B2B1 now supplies [versioned connected physical routes](CYLINDER-PHYSICAL-PATHS.md), certified lengths, one-sided tangents, optional direction preference and bounded distance/residual iteration. Continuous drawing must still supply accepted physical trajectories and a continuation/ambiguity policy through rims, ties and cut loci. `bestAngles` from B1 is not a unique path. Select consistent routes with explicit ambiguity policy; carry meter spacing residuals along the selected physical path, without hidden skips, duplicate dabs or treating Euclidean/screen interpolation as a cylinder geodesic.

An input/session adapter must queue accepted input safely, schedule bounded preparation, define interruption/cancellation and source conflicts, and record exact before/after Float32 words across accepted dabs as one stroke history operation. A single-dab atomic patch is not whole-stroke Undo/Redo. Projection inverses and previews must describe the same intrinsic footprint on side, both disks, rims and centers, including changing cuts and recentering. A surface-specific view provider determines connected layouts; rectangular side previews are not universal. Weaker-device work/memory budgets and pending-work cancellation require browser proof. No new browser UI or performance claim follows from these Node tests.

B2B2 will also need a bounded read-only prepared-change iterator or an equivalent validated transaction handoff containing canonical keys and exact before/after words. Capture must remain tied to the source epoch, merge each key's first-before/final-after into history and check aggregate stroke budgets before commit. This job currently keeps its patch private and returns only a changed-word count; that future history handoff is deliberately not implemented. The controller must distinguish discarding a pending dab from the separately specified treatment of already committed dabs when a stroke is interrupted.

Cylinder creation/selection remains absent until viewing, interactive editing and explicit validated persistence are ready. A later format must retain identities/provider/version/dimensions/resolution/ownership, exact words, integrity/resource checks and atomic Save/Open, while preserving v1/v2/v3. No conversion, other shape, existing-site/Worlds integration or database change is included. The modular kernel remains compatible with the eventual Next.js host and its existing authentication, server permissions and World records under the unchanged eleven-phase roadmap.

**Stop after A7-B2B1 for independent review; do not begin A7-B2B2.**
