# Cube-B delivery receipt

Implementation: [`9545209ed0f45adfc6be586984f14bd5ed5f5909`](https://github.com/Revty79/serrian-tide-world/commit/9545209ed0f45adfc6be586984f14bd5ed5f5909). Parent/accepted Cube-A receipt: `09626c6c5d748909ccd5e45ac65e234fe988f7b0`. Target: standalone repository `main`. This receipt is added after the implementation and records its exact files; the receipt commit adds only this document and the implementation file inventory.

## Exact implementation and evidence inventory

The implementation changes **44 files**: **6 source/test/verification files**, **8 documentation files** (six existing and two new), and **30 evidence/manifest files**. The [complete committed inventory](evidence/cube-b-implementation-files.json) lists every path, committed Git blob/size and exact working SHA-256/size, including the delivery manifest itself. The [classified manifest](evidence/cube-b-delivery-manifest.json) enumerates and hashes the other 43 files; its own hash is omitted to avoid self-reference.

Manifest SHA-256: `59b57291a4afcbd32d3a9c3c39f1dca6d9c067b27ec03e2c05e830045e81cf91` (Git blob `a7df9dfdac585fedc5beea8f870410b1b257ab42`). Git clean filters can normalize Windows line endings; committed Git blob IDs provide portable identity and working SHA-256 records the local tested/evidence bytes.

Runtime additions are only `src/surfaces/cube-route-exact.ts` and `src/surfaces/solid-cube-routing.ts`. Their two focused test files, `scripts/cube-route-reference.py` and `scripts/verify-solid-cube-routes.mjs` complete the six-file numerical/test/reference inventory. All previous runtime, numerical providers, editors, browser tests, codecs, dependencies and build configuration remain unchanged.

## Certified result

The separate route provider exhausts all simple physical-face unfoldings, compares squared distances exactly, preserves all genuine minimum curves and reconstructs exact face/XYZ paths with checked Cube-A edge orientation. The [independent completeness proof and bounds](CUBE-SURFACE-ROUTES.md) establish why this family contains every global shortest curve; successful test cases are not offered as that proof. Corner endpoints retain one-sided directions, while interior singular-corner passage is excluded mathematically. Deterministic physical endpoint ordering makes the same selected curves reverse consistently.

Lengths are exact values or certified adjacent-Float64 intervals. Exact squared lengths, rational vertices, ordered faces, crossings, parameters, one-sided displacements and length bounds are returned. At most 252 candidates, six faces/five crossings, 252 returned curves, 200,000 charged work units and 16,384 bits per checked arithmetic value are permitted; lower requested limits or unattainable precision fail explicitly. No partially searched approximation is returned as exact.

## Verification actually executed

| Verification | Result |
| --- | --- |
| Focused Cube-B tests | 37 passed, 0 failed/skipped; 0.343 s wall |
| Full numerical suite | 537 passed, 0 failed/skipped; 16.075 s wall |
| Independent Fraction/reflected-square oracle | 301 cases, 837 exact segments, 412 crossings; all pass; 7.642 s driver wall including timing groups |
| Fresh Cube-A exhaustive certificate | All pass; 1,966,080 reciprocal neighbor checks; 9.804 s wall |
| Desktop/mobile browser suite | 328 passed, 4 existing conditional skips, 0 failures/flaky; 1630.927 s wall |
| Typecheck / production build | Both exit 0; 0.515 / 2.690 s wall; existing chunk warning retained |
| Source freeze | All 249 source/test/driver/dev/configuration files identical throughout all seven phases |
| Protected accepted files | 2396 exact Git blobs, including 243 source/config/dev files and 2104 historical evidence files |
| Accepted production output | HTML/main JavaScript hashes exact; numerical cube routes are not imported |
| Browser archive replay | 301 decompressed entries verified by exact size/SHA-256: 299 generated artifacts and two accepted inputs; 3 archives below 40 MiB each |

[Completion report](CUBE-B-COMPLETION.md) links every actual log, certificate, timing/resource report, source registry and regression archive. The unchanged existing browser suite ran in an isolated evidence directory against an owned strict loopback server. These are existing-editor regression screenshots and measurements, not a new cube UI or a physical-phone test. Historical evidence was preserved.

Independent references include all center/corner pairs, edge/corner endpoints, near-edge/corner cases, equal-length choices, exact reversal, a literal winning four-face unfolding, smallest-subnormal displacement, a below-ULP tie break, invalid/foreign inputs and extreme admitted dimensions. N128/N256 sample-address integration preserves **491,524 Float32 words**, all revisions, ownership, identities and versions. No routing operation reads or changes elevation.

Actual Node query p50 values range from 0.2605 ms (same face) to 6.3276 ms (opposite corners); the largest observed query was 12.9227 ms. The measured proof maximum was 18,974 work units / 6,344 integer bits. Timing covers 100 queries per group after ten warmups. Raw process memory includes retained proof cases/results, routers, diagnostic state and GC effects; serialized result bytes are not heap bounds or a persistence schema. No mobile, frame-rate or universal improvement claim is made.

## Boundaries and review gate

This is continuous reference-boundary routing on the current solid exterior cube. It does not measure elevation-displaced travel, supply a cube brush/history/scheduler/UI/renderer/save codec, add hollow/interior geometry, convert worlds or implement another shape. Rational BigInt witnesses are a deliberate numerical contract for future adapters, not a new save format. Tight valid requests may fail a resource or precision limit. Python is standard-library, independent-verification only; runtime, npm numerical tests, typecheck and build do not depend on it.

All eleven master phases, Issues #1/#2, the approved geometry order, independently editable future interiors/exteriors, creator-owned assets, vehicles/mobile structures, linked map hierarchies and future integration into the existing Serrian Tide Worlds system remain intact. Flat/wrapped visual migration stays deferred. A7-P1C's first-visible/weak-device/fallback/physical-phone qualifications remain explicit. The original website, Worlds, databases, Docker, deployment and Production were untouched.

**Cube-B stops here for Ember's independent review and the owner's authorization. Cube-C has not begun.**
