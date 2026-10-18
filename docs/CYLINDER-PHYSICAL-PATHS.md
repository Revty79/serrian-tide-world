# Continuous physical cylinder paths — A7-B2B1

This module constructs traversable reference-surface paths for the solid capped exterior. It does not read or edit elevations, numerical ownership, camera state or projections. [B1](CYLINDER-GLOBAL-DISTANCE.md) remains the global distance optimizer; [B2A](CYLINDRICAL-SCULPTING.md) remains the isolated atomic dab engine. No cylinder brush stroke, history, renderer, selector, save format or website integration is introduced.

## Versioned interface

`reconstructCylinderPath(geometry, first, second, {version:1, absoluteToleranceMeters?, maxBoxes?, continuity?})` returns an immutable `physical-cylinder-path`, version 1. It contains normalized identity-bound start/end positions, route class, at most three physical pieces, explicit cumulative boundaries, nominal length and length enclosure, position/error bounds, a shortest-excess certificate, the underlying B1 result, candidate count and selection/uniqueness labels. Endpoints keep the caller's normalized chart aliases; each piece uses the appropriate one-sided sheet.

`atDistance(meters, boundary='outgoing')` accepts the closed nominal interval [0,length]. It returns position, reference XYZ, unit physical tangent (null for zero movement), piece index, traveled distance, `atEnd` and `oneSidedPatchId`. At an internal boundary, incoming selects the preceding piece and outgoing the following piece. They describe the same physical rim point, with different one-sided orientations. At whole-path endpoints the supplied normalized positions are returned exactly; `oneSidedPatchId` identifies the piece's sheet when that endpoint uses another valid rim alias. A zero-length path returns its first endpoint at zero, no pieces and `atEnd=true`; the separately exposed end is the same physical point, potentially another chart alias.

The opt-in B1 option `includeFeasibleRoutes:true` adds a frozen list of version-1 `{routeClass, angles, upperBoundMeters}` candidates. It exposes existing finite feasible parameters without additional subdivision/objective work. The default result has no added property. B1 lower/upper formulas, optimization order, precision checks and work limits are unchanged; tests compare default and opt-in original fields and counters exactly. This list contains one available feasible parameter set per family, not every minimizing geodesic.

## Reconstruction proof

Use physical theta=u on side/start disk and theta=−u on the end disk. Side rim points are canonically treated as their matching cap points, as in B1. Canonical query ordering puts a side endpoint first in side/cap queries and the start disk before the end disk in opposite-cap queries. Reconstruction reverses pieces when the original input order was reversed.

B1 proves that its complete finite family list includes a global minimizer; it does not supply oriented path uniqueness. Let signed lift d connect canonical endpoint angles, delta=abs(d), s=sign(d). Its unsigned candidate parameters x,y allocate angular change to disk chords. The following constructions recover feasible continuous routes.

| Family | Connected pieces |
| --- | --- |
| Same cap | The straight Cartesian chord between both disk points |
| Side | One straight unwrapped cylindrical segment |
| Via start or end cap | Side to entry rim, rim-to-rim disk chord, side from exit rim |
| Side to cap | Side to that cap's rim, chord to its endpoint; reverse for cap to side |
| Opposite caps | Start-point chord to start rim, side to end rim, end-rim chord to endpoint; reverse as needed |

### Side and cap interpolation

A side segment with endpoints (theta0,z0),(theta1,z1) is the straight segment in unwrapped coordinates (R theta,z):

```text
theta(t) = theta0 + t (theta1−theta0)
z(t) = (1−t)z0 + t z1
length = hypot(R(theta1−theta0), z1−z0)
XYZ(t) = (R cos(theta(t)), R sin(theta(t)), z(t))
```

Its speed is constant and physical arc length is that Euclidean unwrapped length. Display normalization wraps theta only after interpolation, so the angular cut cannot change the route or introduce a jump. Up to one alternative angular winding is offered; only a globally certified candidate can be selected.

A disk chord is `XY(t)=(1−t)XY0+t XY1`, with that disk's constant z. Its length is the Cartesian endpoint separation. A disk is convex, so every chord point lies on the actual disk. Recover radial/chart coordinates from norm and checked atan2; at exact radius zero, u=0 is an address convention, never a selected travel direction. The chord and its Cartesian tangent remain continuous through the center even though polar angle changes discontinuously. A chord between different end disks would cross the solid interior and is never a path piece.

### Via-cap family and Minkowski equality

Let a,b be the axial distances of both side endpoints from the chosen cap and H=a+b. B1's x is the rim-to-rim chord angle; remaining signed side angle is `d−s x`. Set:

```text
entryTheta = pTheta + (d−s x) a/H
exitTheta = entryTheta + s x
```

The two side displacement vectors have the same unwrapped slope. Their lengths sum to `hypot(H,R(delta−x))`, attaining the Minkowski bound used by B1. The intervening disk chord has length `2R sin(x/2)`. Thus the reconstructed piece sum realizes B1's feasible objective, rather than merely sharing its scalar estimate. H is positive for side-interior endpoints; zero-H rim degeneracies are already canonically same-cap cases. Zero-length pieces are omitted.

### Side/cap and opposite-cap families

For side/cap, x measures from the **cap endpoint** toward its rim join, not from the side endpoint. Set `entryTheta = qTheta − s x`; the side travels from pTheta to entryTheta at the cap's z, then the disk chord travels from radius R to q's radius. Its length is `hypot(axial,R(delta−x)) + D(qRadius,x)`.

For opposite caps, put start-rim theta at `pTheta+s x` and end-rim theta at `qTheta−s y`. The intervening side angle is `s(delta−x−y)`; B1 enforces x,y>=0 and x+y<=delta. The lengths are `D(pRadius,x) + hypot(L,R(delta−x−y)) + D(qRadius,y)`. End-disk chart signs are reversed when forming positions, not by mirroring geography. Degenerate rim endpoints can remove one/both cap pieces.

These constructions share identical join parameters (theta,R,cap z) between the side and disk. The physical locations agree; the normals need not. Start-rim side +Z folds to cap +radial and end-rim side +Z folds to cap −radial, as proved in the foundation. This is a sharp-fold isometry, not a common smooth tangent plane or an ambient shortcut. The independent audit evaluates endpoint/join coordinates again at 65 digits.

## Centers, ties and optional continuity

If one endpoint is a cap center, its angle is free. Both canonical angles anchor to the noncenter endpoint's physical angle, reproducing B1's zero angular separation without forcing travel along u=0. If both are centers on opposite caps, all common azimuths tie: use the supplied incoming tangent's XY azimuth, or deterministic theta=0 in the fixed representation frame. This default is an arbitrary tie convention, not a pole/north or singular brush direction.

For noncenter endpoints, construct the shortest signed lift, choosing positive at exact pi, and the complementary lift with opposite orientation. They reach the same physical endpoint modulo 2pi; their measured lengths are separately certified. A complementary lift is retained only if it fits the requested global shortest-error allowance. Same-cap chords need no angular alternatives. For equal-radius opposite-cap endpoints, swapping B1's x/y also yields a feasible symmetric candidate and is offered explicitly. At most six candidates survive construction and at most three pieces are retained.

Default selection takes minimum measured length in stable family/orientation/parameter order. Optional `continuity:{patchId,direction:[x,y,z]}` supplies the incoming physical tangent on a valid one-sided sheet at the first endpoint. It must be finite, nonzero and tangent; another sheet is allowed only as a genuine rim alias. Before comparing initial outgoing tangents, transport the incoming vector across the rim fold when needed. Prefer maximum tangent dot product among the certified candidates, then measured length/stable order. The result reports that alignment and selection policy.

**Uniqueness is never certified.** The B1 search may return one member of a continuous/discrete tied family; preference chooses among the available reconstructions, symmetric variants and free-center azimuth. It does not enumerate every stationary minimizer, guarantee a globally continuous shortest-path selection as endpoints cross arbitrary cut loci, or provide a general exponential map. Near-tie preference can select a slightly longer feasible route, always under the explicit shortest-excess limit. B2B2 must use physical input trajectories/waypoints and its own ambiguity policy rather than assume a unique geodesic from two endpoints.

## Arithmetic and shortest-path certificate

Let S=max(R,L), epsilon=Number.EPSILON, and

```text
G = max(8192 MIN_VALUE, 8192 epsilon S)
T = requested tolerance, default max(1e-6 R, 128 G)
```

For nonidentical points require T>=16G. B1 is queried **once**, at T/4, using its unchanged caller-lowerable box limit. Candidate family upper bounds above `globalLower+T/2` are excluded; the B1 incumbent always meets this gate when reconstruction succeeds. Independently measure the actual oriented piece sum m and accept it only when:

```text
m + G >= globalLower
m + G − globalLower <= T
```

The returned length enclosure is [max(0,m−G),m+G]; therefore the real feasible piece length exceeds the true global minimum by at most `max(0,m+G−globalLower) <= T`. This is a feasible approximate shortest route. Its nominal length is not falsely substituted for B1's certified minimum or asserted to lie inside B1's narrower enclosure when continuity selected a near-tie alternative. Identical physical points have exact zero length/error; location evaluation still reports the coordinate arithmetic guard G.

Lengths use scaled norms with square-root residual checks. Coordinates use fixed 15-term Taylor/Horner sin/cos polynomials after bounded range reduction, avoiding an assumed native sin/cos ulp contract. On [-pi/2,pi/2], real truncation is below 3e-27; coefficients/Horner and reduction are covered by the guard. For constructed angles (at most 3pi in magnitude), a conservative 128 epsilon S allowance per coordinate covers reduction, products and polynomials. Norms are Lipschitz in their components; at most three pieces, fixed-angle splits/joins and cumulative additions remain below 4096 epsilon S in this operation count. Polar inversion must pass a 512 epsilon normalized sine/cosine residual; conversion/interpolation allowance remains below G. MIN_VALUE terms cover subnormal absolute loss. Tiny radius overshoot from evaluation is clamped to the disk, and side interpolation to [0,L], only within this stated arithmetic policy. This changes no elevation/sample data.

This is a conservative Float64 arithmetic contract, not arbitrary-precision output. The [independent audit](evidence/a7-b2b1-independent-path-proof.json) checks exact Decimal piece lengths, parameterized locations, polar representations, endpoints and joins against every reported guard, plus the independent shortest references. Geometry at unattainable precision may fail even when B1 can return a scalar interval. In particular, a positive piece whose cumulative boundary cannot advance a Number fails; extreme 1e-30/1e30 aspect examples exercise this. Invalid identities/configuration/options, nonfinite/unrepresentable values, checked-root/polar failure, solver exhaustion, requested precision below the floor or failed length certification return explicit errors, never an allegedly usable partial path. Evaluations also validate their closed distance range; a later primitive failure throws without mutating anything.

## Bounded lazy spacing and partial traversal

`cylinderPathSpacings(path,{spacingMeters,residualMeters=0,fromMeters=0,toMeters=length,maxPoints=65536})` returns an O(1)-storage lazy iterator of physical locations. Residual is traveled meters since the previous emitted point and lies in [0,spacing). It does not automatically emit an initial point or apply a terrain dab. Points occur at:

```text
from + (k spacing − incomingResidual), k=1,2,…
```

They are strictly ordered and evaluated directly on the retained pieces, with no global distance call per step. A whole or partial traversal returns an explicit complete result containing outgoing residual, traversed-to distance, emitted count and roundoff bound. An exact end is emitted once when spacing reaches it; otherwise the tail contributes to residual. Zero movement emits nothing and keeps residual. After a partial range, use that residual with the next range or connected path.

Creation checks count before iteration and rejects more than the caller-lowered limit (hard cap 65,536). Select explicit partial ranges to process longer workloads. Each next call does constant work and retains no prior points. `return()` cancels immediately at the last yielded distance, returns its residual and prevents further evaluations; already complete iterators keep their complete result. No background work exists to cancel. Path construction itself is bounded synchronous work, not an interruptible worker job.

The spacing roundoff bound is `64 epsilon × max(spacing,abs(from),abs(to),span,MIN_VALUE) + 64 MIN_VALUE`. Spacing <=4 times that floor fails. A rounded endpoint step may be clamped within this bound; rounded residuals just outside [0,spacing) normalize to zero. Nonrepresentable advances fail rather than duplicate points. Residual is nominal Float64 state: B2B2 must carry/accumulate the returned error allowances and bound/rebase long accepted-input sequences; no claim of exact real-valued spacing across unlimited segments is made. The existing test proves whole-versus-split traversal agreement within the bound and continued spacing across paths.

## Resource and integration boundary

B1 still permits at most 32,768 evaluated boxes and 16,384 live boxes per construction; no increased numerical budget. Feasible parameters/candidate lists are constant-size (at most three original families, six reconstructions), selected path at most three pieces. Evaluation scans at most three boundaries. A sampler retains counters and one path, never a sample-sized array or per-point global-distance cache. Releasing references permits ordinary GC. Source terrain/metadata remains unchanged, including signed-zero words and revisions on the maximum 1,047,554-sample authority. [Node measurements](evidence/a7-b2b1-path-measurements.json) separate construction, evaluation, 65,536 lazy points, safe stops, explicit-GC observations and authority preservation. They are not cylinder browser/mobile responsiveness or a controlled speedup comparison.

The standalone TypeScript kernel remains independent of React/DOM, Vite, Next.js, storage/auth and numerical ownership. A future surface-specific view provider will supply its own projections/joins/inverses without resampling geography. B2B2 must connect these paths to B2A's epoch-guarded dabs, accepted-input scheduling, physical spacing/error residuals, pending-work cancellation, bounded exact before/after history handoff and one-operation Undo/Redo. The optional direction preference is a tool for that controller, not a substitute for its trajectory/ambiguity policy. Renderer, shape selection and explicit cylinder persistence remain later scopes. The eleven-phase roadmap and eventual existing Next.js/Worlds ownership remain unchanged.

**Stop after A7-B2B1 for Ember's independent review. Do not begin A7-B2B2 automatically.**
