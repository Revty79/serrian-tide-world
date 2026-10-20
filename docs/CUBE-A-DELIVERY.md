# Cube-A delivery receipt

Implementation: [`a06685da8e2de257849998483235f4d042c6e6e9`](https://github.com/Revty79/serrian-tide-world/commit/a06685da8e2de257849998483235f4d042c6e6e9). Parent/accepted A7-P1C receipt: `ee92f24f899a5776c43943cdeeb0b8ed049d1b8a`. Delivery target: standalone repository `main`. This receipt records the completed implementation; its commit adds only this receipt and the complete file inventory.

## Exact changed-file inventory

The implementation changes **45 files**: **5 source/test/verification files**, **7 documentation files** (five existing and two new), and **33 evidence/manifest files**. The [complete inventory](evidence/cube-a-implementation-files.json) lists every path, committed Git blob/size and original working SHA-256/size, including the manifest itself. The [delivery manifest](evidence/cube-a-delivery-manifest.json) classifies and hashes the other 44 files; it omits its own hash to avoid self-reference.

Manifest SHA-256: `1b45771c7fcbc90322780ae75e34ffc7e6fc848f9c7aa5b7ed93006fdff31373` (Git blob `6ffe9f73e2c4d8bc655140d81487d836ded23918`). Text clean filters can normalize Windows line endings; committed Git blob IDs are the portable check, and working SHA-256 records the exact local tested/evidence bytes.

Runtime additions are only `src/surfaces/solid-cube.ts` and `src/terrain/solid-cube.ts`. Their two test files and `scripts/verify-solid-cube.mjs` complete the five-file source/test/verification inventory. No previous runtime, editor, numerical provider, browser test, codec, dependency or build configuration changes.

## Exact verification results

| Verification | Result |
| --- | --- |
| Focused Cube-A numerical tests | 29 passed, 0 failed/skipped |
| Full numerical regressions | 500 passed, 0 failed/skipped; final 17.070 s wall |
| Desktop/mobile browser suite | 328 passed, 4 existing conditional skips, 0 failures/flaky; 1,594.700 s wall |
| Exhaustive N128/N256 certificate | 496,140 exact face-alias word/position checks, 1,966,080 reciprocal physical-neighbor checks; all pass |
| Final typecheck | Exit 0; 0.540 s |
| Final production build | Exit 0; 0.549 s; existing chunk-size warning retained |
| Recorded validation phases | 11 exit 0; interrupted initial browser attempt separately identified |
| Protected accepted Git blobs | 2,355 exact, including 238 source/config/dev files and 2,070 historical evidence files |
| Accepted production output | HTML and main JavaScript SHA-256 exact; no cube import/UI change |
| Browser archive entries | All 301 decompressed sizes/hashes exact: 299 generated artifacts plus two accepted input fixtures, three archives below 40 MiB each |

[Completion report](CUBE-A-COMPLETION.md) links the actual logs, structured browser results, mathematical proofs, payload/timing limits, source registries and source bridge. The post-browser sparse-vector guard correction affected only two new unimported numerical cube files; final numerical/certificate/type/build checks were repeated. Existing browser consumers did not change. Do not interpret the final 242-file numerical registry as the original browser registry; both exact snapshots are retained.

N128 has **98,306** vertices / **393,224 bytes** of private Float32 authority. N256 has **393,218** vertices / **1,572,872 bytes**. All twelve physical edges, both directions, and all eight three-face corners are covered. Tangent folds preserve length and invert exactly; corner holonomy demonstrates why a global smooth tangent assumption is invalid. Local physical lengths/areas are explicit; no globally shortest cube route is claimed.

## Acceptance, preservation and stopping point

The owner accepted A7-P1C for progression after hands-on testing and Ember's published-source/evidence review; Ember did not independently rerun the complete suites. P1C's first-visible regression in 31/32 groups, weak-device/CPU-fallback costs and lack of physical-phone tests remain explicit follow-ups. Faster drain in 48/64 sustained cases is separate. Those costs are not assumed acceptable for future cube work.

Existing bounded/wrapped/sphere/cylinder functionality and v1–v4 saves are preserved. The master eleven-phase table and Issues #1/#2 remain intact; the owner's geometry order, independent eligible interiors/exteriors, creator-owned assets, mobile structures and flexible linked-map hierarchies are documented as future scope. Flat/wrapped visual migration is deferred. No original website, existing/rebuilt Worlds, database, Docker, deployment or Production changes occurred.

Cube-A implements no editor, renderer, brushes, save format, hollow cube, conversion, generation or integration. Proposed next checkpoint: **Cube-B — certified physical polyhedral routes and corner/path semantics**, numerical only, before brushing/UI. This is a proposal, not authorization.

**Stop after Cube-A for Ember's independent review and the owner's authorization.**
