# Global closed-cylinder reference distance — A7-B1

This extends the accepted [A7-A reference geometry](CYLINDRICAL-HEIGHTMAP-FOUNDATION.md). The supported physical surface remains a solid capped cylinder exterior of radius R>0 and length L>0. No terrain sampling, elevation, camera, mesh, view projection, renderer, brush, history or persistence participates in a distance query.

`geometry.globalDistance(a,b,options?)` now returns a **bounded approximation to the global intrinsic reference-surface distance in meters**. `sameRegionDistance` retains its restricted meaning. The implementation does not claim a bit-exact real number, an elevated-relief distance or a unique shortest path. It throws `CylinderDistanceUnsupportedError` instead of returning an uncertified partial answer when precision, representable range or work limits prevent the requested enclosure.

## 1. Physical locations and chart equivalence

Inputs are identity-checked by the immutable geometry provider and its validated charts. Convert u to physical θ (`θ=u` on side/start cap, `θ=−u` on end cap). Side endpoints at z=0 or z=L become their corresponding cap-rim locations. This makes a rim point independent of which chart described it before route selection. No numerical terrain is converted or touched.

Use Δ equal to the shortest absolute angular separation, in [0,π]. If either endpoint is a disk center its angle is arbitrary and Δ can be set to zero: the center's radial chord may use the other point's radial direction. Two cap centers therefore have distance L+2R; a side point at axial distance h from a cap center has distance h+R. There is no center direction singularity in the metric. Antipodal angular points admit both orientations with equal lengths; the distance API does not select a unique oriented path.

## 2. Complete route families

Reference geometry is flat in each disk and in the unrolled cylindrical side. A disk chord is admissible and shortest between its endpoints in that convex disk. Any path has length at least the Euclidean chord between its endpoints; consequently two points on the **same cap** have a globally shortest disk chord, even if they are on its rim. This fact does not license using 3D chords for points in different regions.

Between two fixed side rim/endpoint addresses, a side-only path unrolls to a straight line. Its length is `hypot(R δθ, δz)` for a chosen angular lift. Additional whole turns cannot improve that length. Portions along a rim are included as degenerate side/cap boundary paths.

The following reductions justify the complete families; they are not guesses about which family wins:

1. Replace each side portion by an unrolled straight segment and each cap portion by a planar chord. If a path revisits one disk, replace everything between its first and last visits by that disk's direct chord. This removes revisits and never lengthens the path. When both endpoints are in different disks, only **start disk → side → end disk** is needed after this reduction.
2. For **side → cap C**, a detour through the other cap is unnecessary. Add its side segment vectors in the unrolled (Rθ,z) plane, using signed axial displacements. The norm of their sum is at most their total length (Minkowski). It is an admissible single side segment from the side endpoint to rim C. Transfer the other cap's rim-to-rim chord, by an in-plane rotation, to disk C and concatenate it with C's final chord; replace this pair by the direct chord in C. Angular increments still add to the original endpoint angle, while the planar triangle inequality makes the new cap piece no longer. Thus this reduction preserves endpoints and reduces or preserves total length.
3. For **side → side**, keep the first visited cap. If the path also visits the other cap, concatenate the two rotated rim-to-rim chord increments in the kept disk and replace them by its direct chord. Merge the remaining side vectors with their signed axial displacement. Again the disk triangle inequality and Minkowski inequality do not increase length. The merged side segment remains inside z∈[0,L]. Therefore an optimum needs **no cap, start cap only, or end cap only**, never both caps as distinct visits.
4. Choose each individual segment's shorter angular separation. Circular triangle inequality gives Δ≤the sum of these nonnegative separations. Reduce separations, if needed, to sum exactly Δ, all in one angular orientation. Every segment length is nondecreasing in its own separation on [0,π], so this cannot increase cost. Rotation symmetry realizes the reduced segments with the prescribed endpoints. Thus the compact angular domains below include an optimum; no extra winding or alternating angular route can be shorter.

These reductions establish existence of a shortest route in the listed families, without asserting uniqueness of every shortest route. They include endpoints on rims, zero-length cap pieces, centers, ties and arbitrary positive aspect ratios. The physical side/cap normal changes are those of A7-A; no smooth fictitious tangent plane is introduced. Where a minimizing route crosses a rim regularly, its stationary angles enforce matching tangential component under A7-A's 90-degree fold. Boundary/grazing/degenerate routes remain in the search rather than being excluded by stationarity assumptions.

The argument also covers rectifiable paths with arbitrarily many crossings: finite chartwise paths approximate their lengths on this compact piecewise-smooth surface (use regular Cartesian cap charts at centers and one-sided charts at rims). Apply the reductions to those finite paths, then take a limit in the compact angular parameter domains. Continuous objectives retain the limiting length. Infinitely many alternating rim contacts therefore introduce no missing shorter family.

## 3. Continuous objectives

For an endpoint at disk radius r (0≤r≤R), define its distance to a rim point at angular separation β:

```text
D(r,β) = sqrt((R−r)² + 4Rr sin²(β/2)),    0≤β≤π
H(h,s) = sqrt(h² + (Rs)²).
```

Stable scaled forms avoid subtracting two nearly equal squared radii. Same-cap distance between radii r0,r1 uses `sqrt((r0−r1)²+4r0r1 sin²(Δ/2))`.

| Endpoints / family | Minimized reference length | Domain |
| --- | --- | --- |
| Same cap | Disk chord directly | No optimization |
| Side/side, no cap | H(abs(z0−z1),Δ) | No optimization |
| Side/side via cap C | H(h0+h1,Δ−β)+D(R,β) | 0≤β≤Δ |
| Side/cap | H(h,Δ−β)+D(r,β) | 0≤β≤Δ |
| Opposite caps | D(r0,β)+H(L,Δ−β−γ)+D(r1,γ) | β≥0, γ≥0, β+γ≤Δ |

For the one-cap side/side route, h0,h1 are the axial distances to that cap. For fixed total side angle s, minimizing the two side lengths gives H(h0+h1,s), attained by splitting s in proportion to h0,h1; this is the equality case of Minkowski. Zero heights follow by continuity. Both cap choices compete with the direct side route. A same-side distance is therefore **not** generally its side-only helical length.

For example R=1, L=5, side points (θ,z)=(0,.02) and (π,.03) have a 2.05 m route over the start cap, shorter than the approximately π-meter side-only route. Its 3D chord is about 2.000025 m and leaves the physical surface: it is a lower bound, not the answer.

## 4. Global bounded optimization

Production does not depend on Newton convergence, local minimization, a selected stationary root or a sample-neighbor graph. It uses branch-and-bound on a 1D interval or a 2D triangle, represented by clipped rectangles. A min heap tracks a lower bound for every unexplored domain; feasible paths supply upper bounds. Side-only and same-cap formulas supply analytic candidates with a floating-point enclosure. Pruning removes only domains whose lower bound cannot beat the incumbent upper bound.

For a fixed endpoint q in a disk, write `f(β)=|R e(β)−q|`. At nonsingular points,

```text
f'' = (|p'|² − (p·p')²/|p|²)/|p| + p·p''/|p| >= −R.
```

The first term is nonnegative; `|p''|=R`. The same bound holds for the one-sided extension at the rim coincidence, where `f(β)=2R sin(β/2)`. Hence f is R-semiconvex on [0,π]. On [l,u], midpoint m, width w:

```text
f(β) >= f(m)+f'(m)(β−m)−R w²/8.
```

This affine minorant is valid throughout the interval, not merely at its midpoint. Sum both cap minorants and the **convex** side term to obtain a continuous lower objective. Over a clipped rectangle, for any fixed β+γ its affine part is minimized on a boundary (or is constant along that section). Thus its global minimum occurs on a rectangle edge or a clipping-edge endpoint. Each axis edge is a convex 1D problem. Its endpoints and possible stationary minimum suffice. Along β+γ=Δ the side term is constant and the affine part is linear, so endpoints suffice.

The interior edge minimum uses the convex conjugate formula. For affine slope a∈[0,R), minimizing `a v + H(h,d−v)` without interval restriction gives value `a d+h sqrt(1−(a/R)²)`. Endpoint derivatives decide whether it can lie in the interval; near-zero derivatives conservatively include this value. This avoids using an ill-conditioned stationary argument as the lower bound when a≈R. A separate feasible stationary estimate may improve the upper bound. Monotonic individual cap/side minima and the required axial travel also strengthen each box's lower bound.

Bisect the widest interval in the lowest-bound box. Children cover its clipped domain; infeasible children vanish. Every computed feasible route is an upper candidate. The minimum unresolved lower bound together with analytic candidate lower bounds encloses the **global** optimum. Terminate only when upper−lower≤the requested meter tolerance. There is no asymptotic-convergence claim masquerading as a finite-error result.

## 5. Floating-point contract and failure modes

Each route is normalized by S=max(R,required axial travel); normalized radius/height are at most one, angles at most π and radial ratios lie in [0,1]. Large irrelevant detours are excluded using a guarded axial lower bound. No squaring of raw astronomical or microscopic dimensions is needed. Geometry and results must remain finite and representable.

The distance kernel evaluates sine/cosine at half angles with fixed Taylor/Horner polynomials through powers 29/28 on [0,π/2]. The next omitted terms are below **3×10⁻²⁷**. This removes dependence on unspecified `Math.sin`/`Math.cos` accuracy for bounds. Coefficients, Horner operations, angle/ratio normalization and scale conversion use Float64. Norms use a scaled two-component sum of squares. Every `Math.sqrt` used in the kernel must pass a squared residual check (32ε·input + 8 minimum subnormal); an inaccurate primitive fails explicitly. Its normal-range relative root error is bounded by approximately 17ε including the rounded product. An injected-bad-root regression proves this failure path.

A conservative **2048εS** allowance (ε=`Number.EPSILON`) is subtracted from each lower bound and added to each feasible upper value, with at least 4096 minimum subnormals. Normalized arguments and the fixed operation counts bound the normalization, polynomial, norm, derivative/affine-envelope, edge minimization and rescaling errors. In particular cap slope errors enter an affine envelope over at most π radians, not through an unbounded inverse Hessian. Scaled norms' division/square/sum/root/rescale errors are below 32ε in the normal range; polynomial/derivative and envelope arithmetic fit inside the remaining allowance. Endpoint derivative uncertainty has an extra 64εR slack. Underflow terms are below the precision floor; overflow/nonfinite enclosures fail. This is a numerical enclosure under the checked IEEE Float64 arithmetic contract, not a formal arbitrary-precision interval package or a claim of extra geographic precision.

The default tolerance is `max(1e-6 R, 8 floor)` where `floor=max(4096*Number.MIN_VALUE,2048ε*max(R,required endpoint axial distance))`. A nonzero query requesting less than four floors fails immediately. Other unachievable precision cases also fail. Identical canonical physical points return exactly [0,0], even for a smaller positive tolerance. A value near overflow that has no finite enclosure is unsupported rather than clamped. Some valid reference geometries therefore cannot supply every requested precision/range in Float64.

For example R=10³⁰⁷ m and L=1.77×10³⁰⁸ m pass reference-geometry validation, but their cap-center distance L+2R=1.97×10³⁰⁸ m exceeds the finite Number range. The distance query explicitly fails with `range`; it does not return infinity or a falsely bounded finite answer.

Hard limits are **32,768 evaluated boxes** and **16,384 live queued boxes** per query. `maxBoxes` can lower the work limit, never raise it. Exhaustion throws `CylinderDistanceUnsupportedError` with code `work-budget`; precision/arithmetic failure uses `precision`, unrepresentable enclosure uses `range`. Invalid tolerances, budgets, geometry and foreign/invalid positions fail before successful output. No partially optimized value is returned as success. Queue storage is bounded objects; there is no authority-sized allocation, sample table, terrain-dependent cache or retained per-query state.

## 6. Result and later brush contract

Successful output includes:

- `value` / `upperBoundMeters`: conservative upper endpoint, meters.
- `lowerBoundMeters`, `absoluteErrorBoundMeters = upper−lower`, requested tolerance, global-reference-surface scope and method ID `continuous-route-affine-bounds-v1`.
- `bestRoute` and unsigned `bestAngles` for the best feasible family. Degenerate pieces may have length zero; opposite-cap family can degenerate to side-only or a one-cap shortcut when endpoints are rims.
- `possibleRouteClasses`: a conservative, potentially overinclusive class list from initial lower bounds, **not** a uniqueness/tie certificate. Mirrored/continuous tied paths within a class are not enumerated.
- Evaluated-box, objective-evaluation and peak-queue counts.
- A7-B2B1 adds opt-in `includeFeasibleRoutes:true`: frozen version-1 feasible class/unsigned-angle/upper-bound records already found by B1. No extra search, changed arithmetic or larger limits. Default result shape remains unchanged.

A7-B2A implements [interval-aware numerical dabs](CYLINDRICAL-SCULPTING.md) without changing this distance kernel. For continuous influence, Raise/Lower/Smooth/Flatten must use interval-aware reach. `upper≤brushRadius` certifies inside; `lower>brushRadius` certifies outside. A boundary-overlapping interval requires refinement or an explicitly reviewed influence-error policy; it is not silently rounded into a brush hit. Numerically failed/ambiguous work must not partially write a dab. Enumerate canonical owners once, including both sides of rims and center fans, and apply each numerical update once. Use cheap justified lower bounds for culling and bounded local candidates before expensive distance queries; the reference 3D chord is a valid **culling lower bound only**. Existing neighbor distance alone is not a continuous metric.

The distance query itself does not interpolate paths. A7-B2B1 [reconstructs connected oriented routes](CYLINDER-PHYSICAL-PATHS.md) from its feasible parameters and certifies actual physical lengths, with deterministic/optional incoming-direction selection and bounded lazy spacing. It does not enumerate all tied minimizers or supply a general exponential map. B2A supplies isolated smoothing/influence; B2B2 must integrate continuous dabs, accepted-input scheduling/cancellation and exact whole-stroke history. Matching projected previews and weaker-device browser scheduling remain later. Do not run a worst-budget query for every sample in an unbounded synchronous dab. These are later editing responsibilities; they are not unhandled route classes being returned as successful distances.

## 7. Independent evidence

`scripts/reference-cylinder-distance.py` uses Python's standard-library Decimal at 65 digits, Taylor trigonometry, dense edge-root bracketing/bisection and four independent impact-parameter branches to seed high-precision stationary systems. It uses no production box/envelope code. Thin near-rim interior optima explicitly exercise the reference branch enumeration. The frozen [reference receipt](evidence/a7-b1-high-precision-reference.json) contains 12 independently calculated lengths/angles. This root search alone is not a proof of globality; its independently computed candidates are checked against the production global enclosure. The mathematical completeness/envelope proof supplies the missing global guarantee.

Tests also include analytic side, disk, center, radial and opposite-cap fixtures; genuine cap shortcuts; every sampled odd-A rim alias; full angular wrapping; ties; scale factors 10⁻¹⁰⁰…10¹⁰⁰; aspect ratios 10⁻⁹…10⁹; deterministic symmetry and triangle inequalities; elevation/identity/revision preservation; and explicit precision/budget/range/input failures. An independent direct rim-grid sequence (16…256 subdivisions) converges from above using Cartesian chords and unrolled side lengths. Its convergence is not called an exact graph/mesh distance.

Run `node --expose-gc scripts/measure-cylinder-distance.mjs` for actual reference error, bounded work, Node timing and memory observations. [The receipt](evidence/a7-b1-distance-measurements.json) separates those from existing desktop/mobile workspace/browser regressions. No cylinder UI renderer exists, so this pass claims no cylinder screenshot or interactive/mobile brush performance. Existing v1/v2/v3, spherical assistance/P1 rendering and the unified workspace remain separate preserved functionality.

B1 remains the preserved optimizer with opt-in feasible-parameter reporting. B2A adds isolated dabs and B2B1 adds physical paths; their specifications and completion reports record independent boundaries. **Stop after A7-B2B1 for independent review; do not begin A7-B2B2.**
