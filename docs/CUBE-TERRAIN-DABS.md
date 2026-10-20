# Cube-C1 — physical brushes and atomic single dabs

Cube-C1 is a numerical-only extension of the accepted physical solid cube. Cube-A's six planes, twelve real edges, eight singular corners, first-incident-face ownership, `6N²+2` canonical Float32 words, identities and version-1 metadata remain authoritative. Cube-B's certified route definitions and source are unchanged. This pass adds Raise, Lower, Smooth and Flatten for **one dab**, cooperative preparation and a bounded atomic publication hook. It adds no dragging, history, view, editor, renderer, shape choice or save format.

## Public contract and units

`prepareSolidCubeDab(terrain, center, settings, limits?)` returns a bound prepared operation. Settings have `version:1`, a positive finite `radiusMeters`, and one of:

| Tool | Settings and response |
| --- | --- |
| Raise / Lower | Positive representable `strengthMeters`, signed by the selected tool, multiplied by physical radial influence |
| Smooth | `intensity` in [0,1], blending toward the connected lazy graph estimate below |
| Flatten | `intensity` in [0,1] and an explicit finite `targetElevation` in meters, including positive, zero, negative and negative zero |

Intensity 0–1 represents 0–100%. Elevation and strength must fit finite Float32 range. Results saturate at the existing finite Float32 limits and round with `Math.fround`. No terrain resolution, numerical elevation or configuration changes when making a plan. Centers are validated physical meter-based `SurfacePosition`s, never screen coordinates. Equivalent edge/corner aliases canonicalize to the same exact Cartesian center and produce identical canonical changes.

The handle exposes immutable settings/center/limits/plan metadata and copied numerical statistics. `pump(steps=256)` accepts 1–4096 bounded work steps. Status advances from `preparing` to `ready`; only explicit `commit()` publishes. `cancel()` releases prepared buffers and prevents publication. Failures set `failed` and release buffers. No timers, automatic jobs, DOM, worker, GPU or server service are involved.

`preparedChanges(expectedTerrain)` yields frozen scalar `{index,before,after}` records from a ready, bound source epoch. It never exposes mutable prepared arrays. Source revision and state are checked before each yield and after iteration. This is a deliberate handoff for a separately authorized Cube-C2 adapter, not an implemented stroke/history protocol or persistence schema.

## Exact conservative discovery

The plan reads Cube-A's actual lattice positions, including their stored IEEE Float64 rounding, and decodes H=L/2, R, the center XYZ and at most 257 coordinate values onto one exact dyadic integer grid. It does not replace those positions with idealized infinite-precision `L*j/N` coordinates.

For a target face with unit normal n, let `a=C·n-H`. The spatial chord is a lower bound for any surface travel. If `a²>=R²`, that face cannot have positive influence. Otherwise define `F=R²-a²`. Necessary conditions for a target with chart coordinates (u,v) are:

```text
(u-C·U)² < F
(v-C·V)² < F
```

The sorted Cube-A coordinate array permits exact monotone integer binary searches for the two axis intervals. Their rectangular product conservatively contains every positive-influence sample; it need not equal the physical footprint. There is no rounded square root, approximate radius/index conversion or heuristic face limit. Exact equality at R contributes zero by the kernel definition, so excluding those boundary-only rows/columns cannot omit a change.

Rectangles stream in fixed face/row/column order. Each address resolves through Cube-A; only its real owner face emits a candidate. Shared edge/corner addresses are skipped rather than accumulated twice. The emitted canonical indices are checked strictly increasing. No sample-sized visited set, replicated face elevations or full-world candidate array is allocated.

## Complete distance evaluation without full route reconstruction

The accepted [Cube-B proof](CUBE-SURFACE-ROUTES.md) establishes that every shortest physical cube route can be represented by a simple face sequence. C1 uses that same family, Cube-A's real fold transforms, exact squared distances and ordered closed-edge intersections. It compiles the unfoldings once per center, not per sample. There are 133 sequences from one fixed incident start chart across all six target charts, at most 28 for a target face, and at most five portals per sequence.

**Why fixed endpoint charts are complete.** Choose any incident closed chart at each endpoint. A shortest curve cannot leave that closed face and later return to a different point on it: the convex square's straight chord would be strictly shorter unless the curve already is that same monotone face segment. Thus if the chosen start chart is absent from the positive-length face sequence, prepend it as a zero-length endpoint piece. Do the analogous append for the chosen target chart. The added chart cannot have occurred internally without this chord shortcut. If both endpoints lie on one closed face, its chord already attains the global spatial lower bound. Consequently a complete shortest representative still has no repeated face and appears among the fixed-endpoint simple sequences. Edge-running paths are the same physical edge segment, and zero-length queries are constant. Corners remain valid endpoints, not invented smooth tangent planes.

Per sample, C1 first computes the exact spatial chord squared. It rejects a chord on/outside R. If the two endpoints share a closed face, the chord is exactly the global surface distance and needs no unfolding search. Otherwise each precompiled target image gives an integer squared length. Values on/outside the radius or no better than the current valid minimum are pruned before portal tests. Remaining candidates undergo exact ordered line/edge feasibility with unreduced integer fractions: no GCD, square root, path-object reconstruction, tangent construction or full Cube-B route call in the sample loop.

Portal intersections can be points or collinear intervals. The earliest admissible nondecreasing crossing parameters are complete; square convexity keeps each intervening segment on the correct physical face. Closed zero-length chart pieces are valid. This distance-only search may retain nonminimal corner-through candidates: they are actual connected curves and cannot undercut the true minimum. The complete family includes a genuine minimizing curve, so including these extra valid curves does not change that minimum. No transport through a singular corner is asserted.

Only after every relevant sequence is considered is an inside squared length returned. If none is strictly inside R, influence is zero. The same exact minimum drives equal-route cases; no unique path or tie direction is invented. This is not a spatial chord shortcut through the interior, spherical distance, mesh-edge travel, texture wrapping or guessed local net. It measures the **reference surface**, independently of displaced elevation.

## Certified ratio and deterministic influence

For an inside sample, the exact common-grid ratio is `q=d²/R²`, in [0,1). `cubeBrushRatioRoot` returns the exact representable root or the floor Float64 and its next representable neighbor. `Math.sqrt` supplies only a seed. Exact BigInt comparisons of the decoded trial squared against q certify the result. At most eight local adjustments (two comparisons each) are followed, if necessary, by a complete finite bit-pattern search. The total is bounded by 79 comparisons. Tests deliberately replace the sqrt seed with zero and verify the fallback. A subnormal root may be enclosed by `[0,Number.MIN_VALUE]` without changing exact footprint membership.

This avoids relying on the accuracy of an implementation-approximated square root; see the primary [ECMAScript Math.sqrt contract](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.sqrt). The accepted [unfolding reference](https://mathcs.bethel.edu/yang/papers/geodesics.pdf) supplies background; the fixed-chart completeness and bounds are stated above independently of passing tests.

Let t be the **certified floor** ratio root. The defined deterministic Number kernel is evaluated as `tail=1-t; weight=tail*tail*(1+2*t)`, clamped to [0,1]. This specified finite arithmetic is distinct from claiming the ideal real-valued cubic is exactly representable. Its ideal monotone cubic lies between outward-rounded evaluations at the two certified root endpoints. Each elementary bound uses the next Float64 outward; the returned absolute error encloses the difference from the defined weight. Default `maxFalloffError=1e-12` can be tightened to zero or relaxed up to 1e-3; an unmet request fails before publication. There is no silent accuracy relaxation. Exact physical membership still makes all samples at/on the outer radius zero influence.

Raise/Lower add signed `strengthMeters*weight`. Flatten uses `(1-blend)*current+blend*target`, where `blend=intensity*weight`, with exact zero/full-blend branches. Smooth uses the estimate below. All read the same pre-dab source epoch. The report records observed maximum weight and pre-round elevation error bounds; those are not claims that the ideal real-valued brush always rounds to the identical Float32 at a rounding tie. The finite kernel, pre-dab ordering and Float32 result are deterministic and independently compared word for word.

No-op intensity performs no elevation reads/writes. Constant Smooth preserves the current word, including -0. A delta that underflows to Float32 zero preserves the old zero sign; a full explicit Flatten target still selects its own signed zero. Prepared before/after values retain exact Float32 words. Elevations are never smoothed or resampled by presentation changes.

## Connected Smooth and singular corners

Smooth is a local lazy graph filter on Cube-A's **physical mesh edges**, not exact heat flow or a global radius-average brush. An ordinary or edge sample has four real neighbors; a corner has three. Every neighboring pair lies on a common closed face and differs along one Cartesian lattice axis. That physical segment is itself a global shortest reference route. The code verifies this segment and uses inverse-square physical-length conductance, scaled by the nominal spacing to avoid overflow/underflow:

```text
w_j = (sampleSpacing / actualPhysicalNeighborLength_j)²
estimateDelta = sum_j w_j*(preDabElevation_j-current) / (2*sum_j w_j)
next = current + intensity*radialWeight*estimateDelta
```

On a uniform cube this is half a neighbor-mean step; intensity 1 does not promise complete equalization in one dab. It is a convex, constant-preserving, lazy update. Neighbors outside the radial footprint still contribute their pre-dab values. Neighbor keys are read in canonical order. At a corner three directions meet on the 3π/2 cone; the stencil uses those three actual edges, without averaging face normals or inventing a tangent plane. The inverse-length weights also use Cube-A's actual rounded positions at non-power-of-two cell counts. A conservative floating arithmetic error allowance is recorded separately from falloff error.

## Atomic epoch and publication

Preparation never calls `write` or modifies revision. At most 64 blocks, each with 1024 indices, before words and after words, retain only actual changes. Each block uses Uint32/Float32/Float32 storage. The hard prepared payload is 786,432 bytes; descriptor/object overhead, the compiled plan, source authority, stack/GC and caller-retained scalar records are additional.

The added `commitPreparedPatch(binding,expectedRevision,blocks)` preserves the original terrain provider and ownership. It snapshots all caller descriptors without invoking caller map/species. Captured intrinsic getters validate the actual element/buffer brands and extents, ignoring spoofed view accessors/prototypes. It then validates all blocks: exact bound identities, ordinary nonshared typed arrays, finite Float32 values, valid extents, at most 65,536 samples, strictly increasing unique canonical indices, exact signed before words, source revision and revision capacity. Only after the entire patch passes does the private loop publish. That loop performs no allocation, callback or caller-property access. Revision increments once per changed word, matching existing `write` semantics. Stale source, a bad later block, shared buffer, duplicate index, foreign identity or invalid value cannot partially publish.

Atomic commit is synchronous but capped, separately measured and excluded from cooperative preparation timings. Future C2 integration must account for this publication cost; no worker handoff or frame guarantee is claimed here.

## Hard bounds and explicit failure

| Resource | Limit |
| --- | --- |
| Existing Cube-A cells/edge | 2–256; required N128/N256 verified |
| Per-center compiled sequences | 133; at most 28 per target face, six faces/five portals |
| Compiled lattice coordinate values | N+1, at most 257; no N² routing cache |
| Conservative address slots | 400,000 |
| Canonical candidates | 131,072 |
| Changed words / atomic patch samples | 65,536 |
| Prepared typed-buffer bytes | 786,432 |
| Source reads | 655,360 |
| Charged preparation work | 16,000,000, including initialization |
| Steps per `pump` | 1–4096, default 256 |
| Grid input integers | Checked at most 2,200 bits |
| Ratio numerator/denominator | Checked at most 4,400 bits |

Optional limits can only lower these values. A charged step is one input decode/compile/bound-search step, one discovery slot, one chord test, one candidate image with at most five portals, one exact root comparison, or one bounded scalar/stencil update. Each performs a bounded number of bounded-size integer/Number operations. Integer fraction comparisons and portal products are bounded by the finite input exponents; the largest finite radius combined with the least nonzero Float64 input needs fewer than 2,100 grid bits. Cube dimensions are more restrictive. Intermediate exact products and root exponent alignment stay below 16,384 bits. These are computation/storage bounds, not wall-clock promises or a JS heap limit.

`CubeDabCertificationError` distinguishes work, precision, source and certificate failures. Invalid settings, keys, lattice positions or malformed raw patches fail validation. No partial or approximate footprint is published as exact. If an overlarge footprint exceeds the candidate/change/read/work limits it fails as one unpublished operation. This checkpoint deliberately does not split a giant brush into independently visible partial dabs.

## Verification and future boundary

The [completion report](CUBE-C1-COMPLETION.md) links focused tests, full regressions, independent Python certificates, measured N128/N256 resources, source hashes and preservation evidence. The oracle reuses the accepted independent Fraction/reflected-square/slab reference, not the fast TypeScript evaluator. Literal Cartesian neighborhoods and raw IEEE Float32 words independently check complete small dabs and selected larger-grid results. Whole source buffers/revisions are unchanged during dry runs, and the original Cube-A/B exhaustive certificates are rerun.

Measured Node preparation slices are evidence for a bounded foundation, not acceptance of continuous interactive painting, physical-phone performance, GPU/CPU rendering or a finished cube editor. C2 must design ordered strokes, scheduling/cancellation and exact whole-gesture history. Cube-D rendering, Cube-E editor, Cube-F Save/Open, Cube-G/H independent hollow surfaces and Cube-I final acceptance remain separately authorized future checkpoints. No incomplete cube is exposed as a normal World choice.

The eleven-phase master roadmap, approved geometry order, deferred flat/wrapped visual work and eventual integration with existing Serrian Tide Worlds remain intact. No website, Worlds, database, Docker, hosting, deployment or Production changes occur.

**Stop after Cube-C1 for Ember review and owner approval. Do not begin Cube-C2.**
