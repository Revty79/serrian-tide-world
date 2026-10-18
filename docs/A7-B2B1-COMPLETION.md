# A7-B2B1 completion — continuous physical cylinder paths

Approved baseline: `e37aff66e549bc3e33085cb0d3fe48bf118fff01`, branch `main`. The owner authorized immediate A7-B2B1 development and direct-main publication. [Delivery metadata](evidence/a7-b2b1-delivery.json) records the exact implementation SHA. [Verification](evidence/a7-b2b1-verification.json) contains the complete changed-file/hash inventory and preservation checks. Ember's independent review and owner acceptance remain separate.

## Delivered path foundation

Version-1 physical paths now reconstruct every B1 family into actual connected side geodesics and same-disk chords: side-only, either-cap side shortcuts, side/cap in either direction, same cap and opposite caps. Rim aliases, angular wrap, centers and reversed input order are supported. Explicit piece lengths/cumulative boundaries allow evaluation at a traveled distance without another global distance query or sample-neighbor traversal.

Returned paths expose normalized endpoints, physical pieces, nominal/interval length, position and shortest-excess error information, validity, nonuniqueness, selection policy and optional incoming-direction alignment. Rim evaluation names its one-sided sheet and supports incoming/outgoing boundary choice. Disk interpolation is Cartesian and traverses the center without a polar tangent singularity. View/camera/projection and numerical sample ownership do not define the path.

B1 exposes existing feasible class/unsigned-angle/upper-bound parameters **only on request**. The optimizer/envelope arithmetic, branch order, primitive checks and work limits are unchanged. Reconstruction orients those parameters, partitions via-cap side angles to attain B1's Minkowski equality, forms cap chords and reverses pieces where necessary. Every accepted route has measured physical length consistent with the certified global lower bound under its declared total tolerance. See [the complete geometric specification and proof](CYLINDER-PHYSICAL-PATHS.md).

Default tie selection is deterministic. Optional physical incoming tangents select the best alignment among certified reconstructions, with actual rim-fold transport. Complementary angular lifts, symmetric equal-radius opposite-cap variants and free opposite-center azimuth are handled explicitly. **Uniqueness is not certified**, and every tied minimizer is not enumerated. Near-tie preference may choose a slightly longer path, always under the reported shortest-excess bound. This is not a globally continuous argmin/exponential-map promise across arbitrary cut loci.

The bounded lazy spacing iterator supports carried nominal meter residual, partial ranges, strict ordering, zero movement, explicit completion and cancellation. It computes physical locations only. No terrain dabs, accepted-input controller or whole-stroke history are implemented.

## Independent numerical and continuity evidence

The preserved twelve B1 65-digit ideal-distance fixtures cover direct side, both cap-shortcut families, side/cap and opposite-cap thin/tied/unequal-dimension cases. New tests also verify analytic disk-center chords, wrapping, center-to-center routes, exact/near angular ties, cap-choice ties and both rim folds. The [independent path audit](evidence/a7-b2b1-independent-path-proof.json) uses Python standard-library Decimal at 65 digits to reintegrate actual pieces, evaluate every recorded physical sample independently and compare endpoints/joins and shortest-gap certificates. It executes no production TypeScript. The receipt records the measurement input and reference-definition hashes.

| Independent ideal fixture | Reconstructed length m | Decimal piece sum − ideal m | Nominal length error m | Declared length guard m |
| --- | --- | --- | --- | --- |
| side-shortcut | 2.05000000000000 | -1.4216e-32 | 1.4216e-32 | 3.6380e-12 |
| side-start-interior-minimum | 2.49537917034036 | 8.8112e-13 | 1.7381e-16 | 5.4570e-12 |
| side-end-interior-minimum | 2.46115961131933 | 1.9129e-13 | 1.1622e-17 | 5.4570e-12 |
| side-direct | 1.34164078649987 | 0.0000e+0 | 1.7846e-17 | 3.6380e-12 |
| side-cap-interior | 2.21895608205285 | 1.4657e-12 | 1.9684e-16 | 3.6380e-12 |
| side-cap-near-rim | 2.03686136013624 | 3.2137e-13 | 1.4182e-16 | 3.6380e-12 |
| side-cap-near-center | 1.71942257779956 | 1.4592e-14 | 1.6075e-16 | 3.6380e-12 |
| opposite-interior | 3.40316343036056 | 9.9464e-12 | 1.3758e-16 | 3.6380e-12 |
| opposite-squat | 2.09780551878406 | 3.1293e-11 | 2.3934e-16 | 1.8190e-12 |
| opposite-long | 100.735865520513 | 2.5541e-10 | 9.4257e-15 | 1.8190e-10 |
| opposite-near-rims | 2.01987606487283 | 7.2020e-12 | 5.6885e-17 | 1.8190e-12 |
| opposite-symmetric-tie | 2.50000000000000 | -1.4216e-32 | 1.4216e-32 | 1.8190e-12 |

All **29 actual paths / 1312 physical locations** pass independent 65-digit length, interpolation, polar-coordinate, endpoint and rim-join bounds. Maximum observed position-error/declared-guard ratio across scales is **2.6219e-4**. All independently reintegrated physical lengths satisfy the requested shortest-excess certificate; the receipt retains every exact Decimal error/guard. Near-tie preference is checked against its explicit tolerance rather than falsely requiring the same unique minimizer.

All 1024 pairs of the small odd canonical lattice's 32 endpoints are reconstructed and checked for piece lengths, physical interpolation, rim continuity and unchanged terrain. Every shared rim/center alias is separately tested. Additional deterministic random tests cover 200 physical endpoint pairs and reversed queries; scales 1e-100…1e100 and aspect ratios 1e-9…1e9 are exercised with their reported precision floors. Spacing tests compare whole/split traversal, continued residuals on a connected path, exact end, zero movement, cancellation and bounded failures.

## Accuracy/work limits and safe failure

With S=max(R,L), reconstruction guard G=max(8192 MIN_VALUE,8192 epsilon S), default total tolerance T=max(1e-6 R,128G). Nonidentical paths require T>=16G. One B1 query uses T/4. An accepted measured length m must have `m+G >= globalLower` and `m+G−globalLower <= T`; its interval is [max(0,m−G),m+G]. The independent audit checks the physical piece sum against this interval and the global shortest-gap certificate. Zero movement has exact zero length; evaluated coordinates retain their own guard.

Fixed Taylor coordinates, residual-checked scaled norms and checked polar inversion support the explicit Float64 allowance. This does not add geographic detail or arbitrary precision. A positive piece whose cumulative boundary cannot advance a Number fails explicitly; 1e-30/1e30 extreme-aspect cases demonstrate this limit. Requested precision below the floor, nonfinite/unrepresentable output, failed arithmetic checks, malformed/foreign input, work exhaustion or failed route certification returns no usable partial route. Distance evaluation outside [0,length] is rejected.

The unchanged B1 maximum is 32,768 evaluated boxes / 16,384 live boxes per construction; callers can only lower maxBoxes. Reconstruction offers at most six constant-size candidates and retains at most three pieces. Each distance evaluation scans at most three boundaries. Lazy spacing preflights a caller-lowered maximum of 65,536 points, stores no prior points and evaluates no global distances. Explicit partial ranges provide continuation. `return()` stops immediately at the last emitted distance. The result includes a residual roundoff allowance; B2B2 must carry/accumulate that allowance over successive accepted segments and handle lost resolution explicitly. No hard mobile frame-time or unlimited-precision residual claim is made.

## Actual Node performance and memory

Environment: AMD Ryzen 5 5600G with Radeon Graphics, win32 10.0.26300, Node v24.18.0. The 1,500-query deterministic workload (seed 83, mixed regions, R=1,000,000 m and L/R=1e-6…1e6) has **zero failures**. Construction median **0.0792 ms**, p95 **0.8002 ms**, maximum **3.8467 ms**; whole measured workload 309.72 ms. Maximum observed work: **925 boxes**, **92 queued boxes**, **3 pieces**, **3 retained certified candidates**.

For 100 batches of 257 retained-path evaluations, batch median 0.3339 ms and maximum 0.9494 ms. The lazy 65,536-point traversal takes **46.768 ms** and finishes with residual 0 m; a separate cancellation stops after one point. None of these evaluations runs a fresh global distance query. Explicit path-work, path-precision, cumulative-resolution and spacing-budget failures are recorded.

Post-GC retained ArrayBuffer delta is **0 bytes**. Observed heap before/after GC: 10546104/10670608 bytes; maximum sampled heap 15016424 bytes. These include measurement/caller/VM state, not an exact cache or working-set bound. Maximum-authority before/after hashes and revision are identical. The path code has no terrain buffer access or persistent terrain-sized storage.

The [raw measurement receipt](evidence/a7-b2b1-path-measurements.json) includes environment, 29 cold reference/analytic/tie/scale cases, 1,500 deterministic mixed-region path constructions, 100×257 distance-evaluation batches, 65,536 lazy points, cancellation and precision/work safe stops. Initialization/proof copies and explicit GC are outside construction/evaluation timings. It separately proves unchanged hash/revision on the maximum 1,047,554-sample authority, including signed-zero and modified elevations. Heap includes caller/receipt/VM state and sampled readings do not establish a peak working-set bound. No cylinder browser/mobile responsiveness or controlled improvement comparison is claimed.

## Complete regressions and preservation

- **338/338 numerical tests pass**, zero failures/skips: all 303 baseline tests plus 35 new path/spacing tests. Recorded total 5155.18 ms.
- **238 browser cases pass; four intentional skips**, total 242, zero failures/retries/flaky cases. Two retained desktop native-touch skips and two opt-in CPU profiling diagnostics. Full desktop/mobile duration 11.88 minutes.
- **TypeScript and production build pass**: 73 modules, Vite compilation 171 ms, baseline asset IDs unchanged.
- **154 unaffected source/fixture/config/benchmark files** match the baseline after EOL normalization; **351 historical completion/evidence files** are byte-identical. B1 math/search body hashes match exactly. All 150 runtime/test/configuration files have identical before/after browser-run digests.

Reproduce:

```powershell
node --expose-gc scripts/measure-cylinder-paths.mjs
python scripts/reference-cylinder-paths.py
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
```

The final full browser run uses unchanged desktop Chromium and Pixel 7 projects, two workers and zero retries, with a fresh direct strict-port Vite server on 5193. Runtime/test/configuration sources are frozen before/after the run. [Full browser JSON](evidence/a7-b2b1-browser-results.json), [browser output](evidence/a7-b2b1-browser.txt), [numerical log](evidence/a7-b2b1-numerical.txt), [TypeScript/build output](evidence/a7-b2b1-build.txt) and [source digests](evidence/a7-b2b1-frozen-source.json) retain actual results. Historical test capture paths are restored byte-for-byte from the approved baseline after new captures are archived under this pass prefix.

- [Desktop N256 held limb capture](evidence/a7-b2b1-desktop-n256-limb-held.png), [mobile capture](evidence/a7-b2b1-mobile-n256-limb-held.png), with N128 variants in the inventory.
- [Desktop exact sample/visibility proof](evidence/a7-b2b1-desktop-n256-limb-proof.json), [mobile proof](evidence/a7-b2b1-mobile-n256-limb-proof.json). All four N128/N256 receipts show zero mismatches/hidden-hemisphere painting and positive newly exposed geography.
- [Desktop N256 interaction trace](evidence/a7-b2b1-desktop-n256-regression-trace.zip), [mobile trace](evidence/a7-b2b1-mobile-n256-regression-trace.zip), with raw N128/N256 editing regression observations under this pass prefix.

These are preserved **existing spherical workspace** captures/traces. There is no cylinder renderer or browser painting, so no cylinder screenshots or interaction/performance claims are fabricated. Existing v1/v2/v3, mixed libraries, exact history, mouse/pen/touch, native navigation, globe/net tools, D2-R limb assistance and P1 rendering remain unchanged. Production assets retain their baseline IDs; cylinder paths are absent from the product graph.

## Changed-file inventory

The verification receipt lists every path, byte count and SHA-256 (excluding itself and later delivery metadata). Changes are confined to:

- `src/surfaces/cylinder-distance.ts`: compatible opt-in feasible-parameter result; preserved solver math/control/work limits.
- `src/surfaces/cylinder-path.ts`, `cylinder-path-math.ts`, `cylinder-path-spacing.ts`: versioned physical reconstruction, arithmetic/evaluation and lazy residual traversal.
- `src/surfaces/cylinder-path.test.ts`, `cylinder-path-spacing.test.ts`: 35 independent numerical/geometry/state/budget/ownership tests.
- `scripts/measure-cylinder-paths.mjs`, `reference-cylinder-paths.py`: reproducible actual measurements and independent 65-digit audit.
- This completion report, `docs/CYLINDER-PHYSICAL-PATHS.md`, current README/cylinder/integration/world-surface/master-roadmap updates and new `docs/evidence/a7-b2b1-*` receipts/captures/traces.

No original numerical/test/runtime/config/benchmark file except the opt-in B1 reporting addition changes. All B2A brush/authority modules remain identical, as do spherical/planar engines and every old test. Historical evidence/reports remain byte-identical. No UI, input, history, codec, package or deployment changes. No source, records or database in the original Serrian Tide website or Worlds project is touched; no paid service or GPU requirement.

## Remaining B2B2 and stop boundary

A7-B2B2 must connect accepted physical trajectories to B2A dabs, choose/continue routes through ambiguous input, apply physical spacing/residual/error policy, bound pending work on weaker devices, define accepted-input/cancellation/conflict behavior and record exact first-before/final-after words as one whole-stroke Undo/Redo operation. The B2A private patch still needs its bounded history handoff. Independent path construction and point iteration do not establish those capabilities.

Cylinder viewing, projected preview/inverse matching, shape selection and explicit cylinder persistence remain later scopes. All other shapes/conversions and the complete eleven-phase roadmap remain intact, including Issue #1, comprehensive tools, illustrated and fully interconnected maps before existing Worlds integration, 3D, host permissions/records, living history/alternate timelines, acceptance and modern/historical Earth.

**Stop after A7-B2B1 for Ember's independent review. Do not begin A7-B2B2 automatically.** Owner hands-on acceptance remains separate.
