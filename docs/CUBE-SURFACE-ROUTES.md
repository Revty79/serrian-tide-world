# Cube-B — certified physical cube surface routes

Cube-A's six flat square faces, twelve right-angle edges, eight corners, configuration/representation versions, sample ownership and Float32 authority are unchanged. Cube-B adds a separate `createSolidCubeRouter(configuration).route(first,second,options?)`. It reads only reference geometry and identity-checked physical positions. No elevation, terrain revision, camera, projection, brush, history, save record or database participates.

The result is the **global shortest continuous reference-surface distance**, with every distinct equal-length shortest physical curve and a deterministic selected route. The minimum squared length and reconstructed positions are exact rational/binary expressions for the supplied IEEE Float64 inputs. Reported meter lengths are certified intervals, not claimed exact decimal roots. This is neither elevated-relief travel nor a mesh-edge approximation.

## 1. Why the candidate families are complete

This argument is for the closed physical cube with L>0. It establishes the search family before any numerical experiment. Relevant background is the unfolding construction and shortest-path discussion in Davis, Dods, Traub and Yang, [*Geodesic trajectories on regular polyhedra*, §§1–2](https://mathcs.bethel.edu/yang/papers/geodesics.pdf), and Sharir and Schorr, [*On Shortest Paths in Polyhedral Spaces*](https://doi.org/10.1137/0215014). The cube-specific completeness argument, degeneracy treatment and implementation bounds follow here; passing reference cases is not a substitute for them.

**Existence.** The boundary is compact and connected by finite-length surface paths. For example, join each endpoint to a face corner and connect the corners along cube edges, giving a length below 6L. Take a sequence approaching the length infimum, parametrized at constant speed with uniformly bounded lengths. Compactness and equicontinuity give a uniformly convergent subsequence. Its limit stays on the closed boundary and joins the endpoints. Curve length is lower semicontinuous, since it is the supremum of polygonal partition sums. The limit attains the infimum. Nonrectifiable curves cannot improve it.

**No interior singular corner.** Three π/2 face sectors meet at a corner, total angle 3π/2. If a nonzero minimizing path passed through that corner, take nearby incoming/outgoing points at radius r. One of the two connecting cone sectors has angle β≤3π/4<π. Unfold that sector: its chord has length `2r sin(β/2)<2r`, lies inside the convex sector and avoids the vertex. For sufficiently small r it maps back onto valid incident faces without reaching another cube corner. This strictly shortens the path. Hence a shortest route can start or end at a corner, but cannot pass through one internally. No smooth tangent plane at that vertex is asserted.

**Regular local straightness.** Inside a face, a bent path can be shortened by its planar chord. At a nonvertex edge, unfold the two incident faces about their shared edge. The local intrinsic metric is Euclidean; a bend in that unfolded neighborhood can likewise be shortened. Successive regular crossings of a shortest path therefore unfold into one straight line.

**No face revisit.** Suppose a minimizing path visits the relative interior of a face, leaves it, then returns. Choose two interior points enclosing the excursion. Their straight chord lies inside that convex square and has length at most any connecting spatial curve. Equality requires that curve to be the same monotone straight chord. An excursion outside the face cannot satisfy equality, so replacement is strictly shorter. Thus each face interior is visited at most once.

**Edge-running and endpoint degeneracies.** A locally straight path that follows an edge for a positive interval cannot turn away from it at a regular point; in the unfolded neighborhood that would be a bend. Continuing past its end corner is forbidden internally by the corner argument. Consequently a nonzero shortest path containing an edge-running interval is entirely a segment of that physical edge, representable within either incident closed face. All other nonzero shortest routes have ordinary face-interior pieces and isolated edge crossings. A point on an edge has two valid starting/ending charts; a corner has three. Enumerating every incident endpoint face includes the actual first/last positive piece. Same-point aliases represent one constant curve.

**Finite exhaustive family.** Each remaining shortest route visits at most the six distinct physical faces, with at most five crossings. Its ordered faces form a simple path in the cube's face-adjacency graph. Unfold that sequence, place the physical endpoints in the first/last squares, and join their images by a straight segment. The preceding arguments guarantee that this construction includes **every** global shortest physical curve. It is not a restriction to two or three faces, a chosen net, a winding heuristic or a local optimizer. A four-face example below shows why a smaller guessed family is unsafe. Nonminimal longer local geodesics are outside this global-shortest contract.

## 2. Exact finite enumeration and feasibility

The graph has six labelled vertices, with each face adjacent to four others and not to its opposite. The algorithm enumerates every neighbor choice without a repeated label, stopping at the target. Its finite counting recurrence is

```text
C(S,v,b) = 1                                      if v=b
         = sum C(S union {w},w,b)                  otherwise,
           over w adjacent to v, w not in S
```

Every simple sequence has exactly one next-label choice at each step, so this recurrence neither omits nor duplicates a sequence. Evaluating it for the fixed six-vertex graph yields the matrix below, in `px,nx,py,ny,pz,nz` order:

```text
 1 28 26 26 26 26
28  1 26 26 26 26
26 26  1 28 26 26
26 26 28  1 26 26
26 26 26 26  1 28
26 26 26 26 28  1
```

There are 798 sequences across all ordered face pairs. Each endpoint has at most three aliases, giving the conservative bound `3×3×28=252` sequences per query. The static table contains face labels only, never World identities, elevations or sample data.

Each face has an orthonormal signed-permutation basis in the unfolding plane and a center at integer multiples of H=L/2. The destination basis is the source basis multiplied by the inverse of Cube-A's edge-fold matrix. Matching edge midpoints places the next square on the opposite side of the shared edge. The implementation checks that side/orientation condition; it does not flatten all six faces by one projection or assume a nonoverlapping global net. Nonconsecutive unfolded squares may overlap, but retain their physical labels.

For a sequence, let `P+tD`, 0≤t≤1, be its unfolded endpoint segment. Each requested shared edge intersects this line in either an exact parameter, an exact closed interval when collinear, or the empty set. A valid traversal needs `0≤t1≤…≤tk≤1`, with each ti in its edge's intersection interval. The earliest feasible greedy choice is complete: taking the smallest admissible next parameter cannot make any later lower bound harder to satisfy. If it exceeds an upper bound, no ordered choice exists.

Between consecutive crossing parameters both endpoints lie in the assigned closed square; convexity keeps the entire intervening line piece in that face. Thus ordered feasibility is sufficient as well as necessary. Endpoints, zero-length chart pieces and edge-collinear intervals are included. Different choices of where to switch charts along a common edge describe the same physical edge curve. A strict interior corner contact is rejected by an exact predicate, justified by the shortestness proof above. All endpoint corner aliases remain eligible.

## 3. Exact comparison and certified lengths

Every finite input Number is decoded from its IEEE bits as an integer times a power of two, including subnormals. H and both physical XYZ endpoints are lifted onto a common exact dyadic grid. Unfolding uses only integer translations and signed permutations. For each feasible sequence,

```text
distance squared = (Dx² + Dy²) * 2^(2e)
```

The common e is shared by every candidate in that query. Comparing integer squared lengths therefore determines the actual global minimum and exact equality of minima **without square roots, epsilon ties or rounded distance comparisons**. Face coordinates, edge parameters and reconstruction use reduced BigInt rational arithmetic. Endpoint ordering compares the stored physical coordinates directly, and aliases normalize to the same physical problem.

Meter lengths need not be rational or representable as a Number. For a squared value `n/d * 2^e`, binary search the ordered bit patterns of all nonnegative finite Float64 values. Each trial is compared by **exactly squaring its decoded dyadic value and cross-multiplying integers**. No `Math.sqrt`, trigonometric approximation or unspecified transcendental error enters certification. At most 64 exact squared comparisons find the floor representable root and determine equality. Return `[floor,nextFloat(floor)]`, or `[root,root]` only if equality is exact. If no finite upper endpoint exists, throw `range`.

The enclosure is therefore exact or spans one adjacent Float64 interval. `maxIntervalWidthMeters` optionally requires a positive finite maximum width for the total and every returned segment length; unmet precision throws `precision`, not a rounded substitute. A positive subnormal segment length can be enclosed by `[0,Number.MIN_VALUE]` while its exact parameter/coordinates remain nonzero. Zero segments are identified by exact fractions, never a rounded length. The supplied decimal notation is not treated as infinitely precise: the exact problem is the stored IEEE input geometry, not an imagined higher-resolution terrain.

For a segment with exact route-parameter difference Δt, its squared length is `minimumSquared * Δt²`. Segment intervals are certified independently; parameters telescope exactly to 1, proving that the actual segment lengths sum to the reported exact total root. Adding rounded segment estimates is not used to certify the total.

## 4. Reconstruction, direction and ties

`routes` contains every distinct minimizing physical curve. Each has the ordered positive-length face sequence, exact face-local and XYZ vertices, edge crossing locations/parameters, Cube-A edge IDs/orientation transforms and per-piece meter length bounds. The runtime verifies that reconstructed points lie inside their assigned faces, consecutive world points agree, both requested physical endpoints match, and every shared-edge coordinate/reversal satisfies Cube-A's connection. The returned `distanceSquared` and rational vertices allow independent replay.

An exact world point means `numerator[axis]/denominator * 2^exponent` meters; an exact chart coordinate means `n/d * 2^exponent` meters. These are computational objects containing BigInts, **not a new Atlas save format**. No approximate projection or numerical resampling is needed to reconstruct the curve.

`direction.du/dv` are one-sided face displacements per unit of the total route parameter, not unit tangents. At a regular crossing they are related by the existing 90-degree fold transform. Corner endpoints expose all incident face identities and the selected route's one-sided first/last pieces. No transport through a corner or averaged normal is supplied. A zero-length query returns one vertex, no segments/crossings and `undefined-zero-length` direction policy.

Different chart descriptions of the same curve do not create false ties. After removing zero pieces, the implementation identifies physical XYZ polylines modulo repeated/forward-collinear interior vertices. It prefers fewer positive pieces and then fixed face order for equivalent descriptions. Distinct physical curves with equal exact squared length remain separate; `unique=false` reports that ambiguity. No tolerance merges near ties.

Queries are solved in lexicographic physical endpoint order, with a fixed tie order. A reversed request reverses those **same** curves, vertices, edge transitions and parameters, negates their one-sided directions and uses reciprocal fold transforms. It does not run a different direction-dependent tie selection. The selected index is query-local, not a persisted feature identity.

## 5. Bounds and failure contract

| Limit | Contract |
| --- | --- |
| Geometry | Existing Cube-A version 1 solid exterior; identity and dimension validation unchanged |
| Candidate sequences | At most 252 per query; optional lower `maxCandidates` fails if exhausted before completion |
| Faces/crossings per candidate | At most six distinct faces/five transitions |
| Returned physical minimizers | At most 252; optional lower `maxReturnedRoutes` fails rather than truncating ties |
| Exact work | At most 200,000 charged units; optional lower positive integer `maxWorkUnits` |
| Integer size | At most 16,384 bits per checked arithmetic value |
| Length enclosure | Exact equality or adjacent finite Float64 endpoints; requested narrower width fails |

A work unit covers an exact helper/check or a Euclidean-GCD remainder step; one helper performs only a bounded number of arithmetic operations on bounded-size integers. Each Float64 decode strips at most 52 trailing mantissa bits; root searches use at most 64 comparisons. Unfolding and graph walks have the fixed limits above. This is a deterministic computation bound, not a wall-clock or per-frame promise. Exhaustion throws `CubeRouteCertificationError('work')`; no partially searched distance is returned.

The dimension validation bounds L below 2^512, while the least nonzero input coordinate is 2^-1074. A conservative 1,600-bit bound covers common-grid coordinates including unfolding translations. Crossing numerators/denominators have that order; homogeneous reconstructed point numerators use fewer than 3,205 bits. Parameter differences use fewer than 3,205 bits, and segment squared-length numerator/denominator products remain below about 9,620/6,410 bits. The root-comparison exponent alignment and homogeneous-vector collinearity products stay below 13,100 bits. The 16,384-bit guard leaves margin; unsupported arithmetic still fails explicitly. GCD remainder steps are charged, helper results are size-checked, and intermediate products are bounded by their bounded operands; the guard is not a claim that an intermediate product is inspected before it is formed.

Stored candidate state is capped by 252 minimizers, six frames and five crossing parameters each; the implementation retains no sample-sized or per-World global cache. The shared table is the fixed 798 face sequences. Returned results are immutable. JavaScript object overhead, allocation/GC transients and caller-retained results are extra; result serialization size and process memory snapshots are measured separately in the completion evidence, not misreported as exact heap bounds. Worst-case work may fail within a requested budget even for a valid geometric problem.

Bad dimensions/configurations, foreign identities, invalid coordinates/options throw RangeError through the provider contract. `work`, `precision` and `range` identify certification/resource failures. An internal witness/topology inconsistency throws `certificate` and returns no answer. There is no fallback to a spherical metric, cylindrical route, mesh graph, interior chord or uncertified local minimum.

## 6. Independent references and literal examples

The Python standard-library oracle does not import TypeScript, Cube-A frames, tangent matrices or runtime edge tables. It labels the eight cube corners and reflects whole squares across shared corner pairs. It tests route feasibility with whole-square slab clipping, recomputes minimum squared lengths using `fractions.Fraction`, and independently counts shortest curves by their exact initial physical directions. It also checks every returned face, endpoint, crossing, parameter, directional fold, total/segment length enclosure and Float64 adjacency. Its reference search includes nonminimal corner-through candidates rather than sharing the runtime's corner-rejection predicate. The geometric completeness proof still stands separately from these tests.

| Literal physical example | Expected result |
| --- | --- |
| Same face, displacement (3,4) meters | Exactly 5 m; planar chord attains the spatial lower bound |
| Adjacent face centers | One length-L route through the shared edge midpoint |
| Opposite face centers | Four distinct length-2L routes, one via each other face; spatial chord L is not a surface route |
| Opposite corners | Six length-√5·L routes from the 2L-by-L unfoldings; no internal corner contact |
| Two points on one physical edge | One straight physical curve, despite two chart aliases |
| Identical point through any corner/edge alias | One constant curve, no defined tangent |

For L=10, take px `(u,v)=(-4,-3)` and nx `(-3,4)`. In the literal `px → ny → pz → nx` net, face centers are `(0,0),(-10,0),(-10,10),(-20,10)`. The endpoint images are `(-4,-3)` and `(-16,13)`, giving displacement `(-12,16)` and exactly 20 m. Crossings occur at fractions `1/12,1/2,11/12`, at physical XYZ points `(5,-5,-5/3)`, `(0,-5,5)` and `(-5,5/3,5)`. This valid four-face minimum is checked against the independent complete oracle, rather than assuming a three-face strip is sufficient.

As a precision stress case, move one opposite-face-center endpoint by `Number.MIN_VALUE` along +u. One of the four routes becomes strictly shorter even though a rounded 20 m comparison cannot distinguish them. Exact squared comparison returns a unique route and enclosure `[19.999999999999996,20]` for L=10. Extreme admitted dimensions, near-edge/corner positions, all center pairs, corner pairs, edge directions, reversal and N128/N256 sample-address queries are included in the recorded certificates.

## 7. Architecture and next boundary

`cube-route-exact.ts` contains bounded exact arithmetic/root enclosures; `solid-cube-routing.ts` composes the unchanged physical geometry and supplies the exhaustive path provider. These modules have no renderer, DOM, React, worker, codec, database or server dependency. The Python oracle is an optional development-verification program using its standard library; neither the application nor npm test/build depends on Python. No package or deployment change is introduced.

Sample integration is explicit composition: obtain a valid Cube-A key/address, call its existing `owner`/`positionAt`, then query the router. The physical result is independent of N, elevation or revision. N128/N256 tests preserve every canonical word (including signed zero), identity, revision, 6N²+2 ownership count and both version-1 configurations. Future numerical editing must budget route queries and consume exact/interval semantics deliberately; this pass does not add a stroke scheduler, brush footprint, scalar interpolation or history transaction.

Future cube rendering, navigation, brushing and persistence remain separate passes. Hollow cubes later require independently editable interior/exterior surfaces under one parent World, with their own terrain/history/persistence/selection and reviewed geometry conventions. The cube-specific sequence/bit/work bounds are not a universal provider for other shapes. Keep the owner-approved geometry order and eleven master phases, defer flat/wrapped visual migration, and integrate only with existing Serrian Tide Worlds in the authorized later phases.

**Stop after Cube-B for Ember's independent review and owner authorization. Do not begin Cube-C automatically.**
