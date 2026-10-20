# Cube-C2A: continuous physical stroke reconstruction

This is an isolated numerical provider for the solid exterior cube. It composes the accepted Cube-B route certificates and emits positions suitable for the accepted Cube-C1 single-dab API. It never reads or writes terrain and does not create a stroke transaction, scheduler, worker, history operation, editor, renderer or save format.

The accepted starting checkpoint is Cube-C1 implementation `02078ef941bd0e3c03de3052a9d513d2bc018df4`, delivery `bb0940dd2778f2277c1d9c7c5e4a498bfc48c272`. The [completion report](CUBE-C2A-COMPLETION.md) separates executed evidence, proofs and limitations. Cube-C2B requires separate authorization.

## Contract and ordering

`createSolidCubeStrokePath(configuration, radiusMeters, limits?)` lives in `src/surfaces/solid-cube-stroke-path.ts`. The geometry configuration is validated and snapshotted by Cube-A. A gesture has one immutable physical spacing: `radiusMeters / 4`. The positive quarter must be exactly representable as a Number; underflow or an inexact subnormal quarter is rejected.

| Operation | Contract |
| --- | --- |
| `accept(position)` | Validate identity/closed-face coordinates; snapshot a canonical physical position; assign a monotone zero-based sequence. Returns false if the eight-position queue is full, without accepting that position. The host must retain and retry it. Invalid input or an exhausted total-input budget terminates explicitly. |
| `pump()` | At most one initial dab, full certified route query/selection, regular dab, route-finalization or completion transition. Never loops over the entire gesture. Stops progressing when the output queue is full. |
| `take()` | Remove the next immutable `path` or `dab` event. Each nonzero segment's path certificate precedes its regular dabs. There is no implicit publication acknowledgement. |
| `release()` | Stop accepting positions and drain the already accepted sequence. No extra off-spacing endpoint stamp. An empty gesture has no initial dab. |
| `cancel()` | Stop work, discard pending inputs/output and release retained route/arc/context references. Already taken centers are historical numerical output, not committed terrain. |
| status/statistics | Distinguish accepting, draining, complete, cancelled and failed. Accepted/processed/discarded counts, active sequence, work and retained shapes support later host progress accounting. |

An initial accepted input produces exactly one initial dab. Repeated physical observations, including different aliases of the same edge/corner, are counted as processed zero-length inputs and cannot reset spacing or tangent context. They are not silently coalesced with nonzero travel. Subsequent physical observations use the complete certified shortest route family between the consecutive positions. Changing the pump/drain/admission batching cannot reorder accepted geography.

The provider does not infer the travel between observations. A sparse long movement means the selected shortest connecting surface path, which can differ from an unobserved detour. Adding an actual bend changes the specified path. Subdividing the same selected physical curve is a sampling change; adding a waypoint that forces a different tied curve is an intent change.

## Route selection and singularities

All candidate curves come from unchanged Cube-B. They have real planar segments, exact rational edge crossings and checked Cube-A fold orientations. They cannot pass through the cube interior or use a spherical/cylindrical distance. A positive-length shortest segment cannot pass internally through a positive-curvature cube corner; a corner can be an observed endpoint connecting two separately specified segments.

Selection follows this explicit order:

1. A unique certified physical route is used directly (`unique`).
2. For an immediate nonzero A→B→A retrace with multiple shortest routes, use the same Cube-B physical route index in reverse (`exact-backtrack`). Cube-B canonical endpoint solving guarantees that this index describes the reversed same curve. Duplicate observations do not destroy this context.
3. At an exact corner, otherwise reset continuation context and choose Cube-B's canonical certified curve (`corner-reset`). No transport through a fabricated smooth corner tangent plane occurs. An explicit immediate retrace needs no such tangent plane.
4. With no previous nonzero direction, use the canonical curve (`canonical-no-context`). The event reports the number of physically distinct minimizers; the canonical choice is a documented ambiguity policy, not recovered intent.
5. Otherwise, compare the initial one-sided direction of every tied curve with the previous route's final one-sided direction. At an ordinary edge use Cube-A's actual pairwise right-angle isometry to put these directions on the candidate face. Maximize signed normalized dot product exactly. Incoming norm is common; dot signs and squared rational cross-products compare the scores without approximate angles or square roots. A unique best direction reports `continuation`. An exact remaining score tie uses Cube-B's canonical order and reports `canonical-context-tie`.

Equal-length opposite-face routes therefore use established physical continuation where available. Canonical fallback is explicitly reported only after checking relevant context. Reversing a standalone observation pair reverses the same canonical route. Reversing a whole multi-input gesture can have different context at ambiguous waypoints; this policy does not promise to recover a unique intended path where the observations permit several.

Edge-aligned routes retain Cube-B's physical-curve deduplication. Input chart aliases do not create extra routes or stamp an extra dab. Corners have valid incident face positions and one-sided directions; they never acquire an averaged normal/tangent plane.

## Exact carried arc length and center rounding

For certified segment lengths `L_i` and physical spacing `s`, let `A_i = Σ(j<i) L_j`. The initial center is at distance zero. Regular centers lie at global arc distances `k*s`, for positive integer `k`; segment i emits exactly those satisfying `A_i < k*s <= A_i + L_i`. The integer ordinal advances only when a dab event is emitted. The residual is consequently carried across every input and face boundary, without summing rounded Number lengths. A crossing/end at an exact spacing multiple belongs to the preceding segment once; no new segment adds an initial dab.

Cube-B returns an exact nonnegative rational squared length times a power of two. Its root is represented in `cube-stroke-exact.ts` as a rational linear combination of positive integer square roots. To combine equivalent terms, reduce `r/s` by gcd and check whether both remaining numerator and denominator are integer squares. This is an exact rational-square-class test and needs no integer factorization. Perfect-square terms become rational. Distinct square classes are linearly independent over the rationals; structural cancellation detects exact zero, including exact spacing endpoints and collinear subdivision equivalences. Low-level arc helpers consume normalized internal values; the public stroke provider accepts positions and limits, not caller-supplied algebraic expressions.

Nonzero signs are certified using outward rational bounds for the integer square roots. At precision p, integer square root gives the exact floor of `sqrt(r)*2^p`; the next integer provides its upper bound. Negative coefficients reverse the bounds. Precision doubles from 64 to at most 4096 fractional bits. A comparison whose sign cannot be proved within precision/work/bit bounds fails explicitly; it never guesses with an epsilon.

Within a route, `t = (k*s - A_i) / L_i`. Division by one positive radical remains a rational linear combination of radicals. Multiplication by a fixed square class preserves the distinction of the existing classes, avoiding quadratic renormalization. Exact comparisons locate the face segment and exact affine chart expressions compute u/v. Each ideal coordinate is rounded **once**, nearest/even, after both endpoints of its certified rational interval round to the same Number. Rational midpoint ties are resolved exactly. The resulting chart point is validated/canonicalized through Cube-A. Each regular dab includes its ideal face and u/v bound witnesses.

Every emitted Number position lies on a real closed cube face. The ideal centers have exact physical radius/4 spacing; Number coordinates represent them with certified nearest/even coordinate rounding. Actual distances between rounded centers are not asserted to be exactly s. Extremely small spacing relative to world-coordinate resolution can produce indistinguishable rounded positions, and a sufficiently difficult sign/rounding query can fail its precision/work budget. No interpolation creates additional terrain resolution. Quantizing a new observation onto a nearby Number curve can also change the specified path; the density invariance proof applies to subdivision of the same exact physical curve, not arbitrary nearby pointer samples.

### Spacing invariance argument

Replacing a selected route by exact subsegments of that same curve preserves its physical arc length and every global distance `k*s`. Rational-square-class combination represents their length sum identically as an algebraic number. Exact comparisons choose the same intervals of the same physical curve. Affine interpolation yields the same ideal physical centers, and nearest/even coordinate rounding produces the same canonical Number positions. No elevation, mesh subdivision, chart count or event count appears in this argument. It does not apply when the extra observations select a different ambiguous curve, specify a bend, or exhaust a resource bound.

## Work, memory and scheduling

| Resource | Hard limit; callers may only lower |
| --- | --- |
| Pending accepted inputs | 8 |
| Total accepted inputs | 256 |
| Output events retained by provider | 8 |
| Dabs including the initial one | 4096 |
| Exact arc terms | 128 distinct rational square classes |
| Arc refinement | 4096 fractional bits |
| BigInt range | Unchanged Cube-B 16,384-bit checked values |
| One pump's admitted exact helper work | 200,000; routing and arc work share it |
| Aggregate admitted path work | 16,000,000 |

A full Cube-B call remains bounded by its original 252 candidates/results, six faces, 200,000 work units and integer limit. Routing happens once per nonzero accepted segment, never per dab and never per elevation sample. The active selected route is reused for all its dabs. Duplicate positions bypass routing. The provider retains one previous endpoint-pair/index and one outgoing direction for continuity; it does not keep an unbounded gesture cache. Repeated opposite-direction observations still pay for fresh Cube-B certification. A broader cache could help repeated pairs but would require bounded identity/configuration/direction-aware entries and does not solve continuously varying input; it is deferred.

Two cumulative arc arrays, a one-term route length, one selected route, one continuation and the fixed queues bound retained intermediate shapes. Temporary expressions are bounded by the same term/bit/work limits. The original router's transient full tie set remains under its original limits. These are logical allocation bounds, not a claim about exact JavaScript object/GC heap bytes. Output retained by a host is the host's responsibility.

Route failures do not expose an incomplete certificate. The entire allowed routing work is conservatively charged when Cube-B fails before returning a work count. A failed helper's rejected next tick is not additional admitted work. Failure clears pending numerical state; already consumed path output cannot be represented as a successfully completed stroke. No elevations can be partially modified because this layer has no terrain access.

This provider is designed for cooperative/worker consumption but **does not implement an asynchronous scheduler**. A pump cannot be interrupted halfway through its synchronous Cube-B call or algebraic decision. Cancellation takes effect at the next call boundary. Measurements include the resulting maximum pump duration. C2B must decide placement/preemption strategy and stop correctly under the same bounds rather than increasing them for animation.

## C1 composition and future C2B host

For a `dab` event the future host may call `prepareSolidCubeDab(authority, event.center, frozenSettings)`. Cube-C1 still validates canonical ownership, physical footprints, connected pre-dab Smooth, source epoch, preparation buffers and atomic single-dab publication. C2A tests prepare all four tools at emitted centers and cancel them after comparing exact results; no series of independently committed dabs is mislabeled a whole gesture transaction.

C2B must own the authority/settings/revision lease, ordered host input admission, worker transport where justified, preparation/commit acknowledgements, cancellation/release/drain, exact committed-prefix accounting and one complete gesture Undo/Redo. It must bind the path's full geometry configuration to that authority, not merely compare the World/surface identity strings. `inputSequence` identifies the source accepted endpoint, `ordinal` the global dab, and processed progress means all centers of that input interval have been emitted, not painted. No current path event authorizes a write or guarantees a terrain revision. The existing sphere/cylinder ordered-input and revision-acknowledged progress architecture remains unchanged; this provider uses plain immutable data and BigInt values compatible with future structured-clone transport.

The six-face geometry, terrain sample ownership, elevations, C1 numerical limits, original route proof and all v1–v4 formats remain unchanged. Existing product/dev editors do not import the cube path modules. The eleven-phase roadmap, thirteen-entry geometry priority inventory, Issues #1/#2, deferred flat/wrapped visual work and future host integration remain in force.
