# Cube-C1 delivery receipt

Implementation: [`02078ef941bd0e3c03de3052a9d513d2bc018df4`](https://github.com/Revty79/serrian-tide-world/commit/02078ef941bd0e3c03de3052a9d513d2bc018df4). Parent/accepted Cube-B delivery: `647e40c91b1ce6304088bc544a38ca4886022933`. Target: standalone `main`. This receipt is committed after the implementation and adds only this document and its exact file inventory.

## Committed inventory

The implementation changes **89 files**: **8 source/test/verification files** (seven new; one additive terrain extension), **8 documentation files** (six existing/two new), and **73 evidence/manifest files**. The [complete committed inventory](evidence/cube-c1-implementation-files.json) records every Git blob/size and exact working SHA-256/size, including the manifest. The [classified delivery manifest](evidence/cube-c1-delivery-manifest.json) hashes the other 88 files; its own hash is omitted to avoid self-reference.

Manifest SHA-256: `3fbedb1c0bf8564a0a7e917e34da918fe287bbb8a8d07c1b138255591aeb95da` (Git blob `31232453fbe4d73aa960fa9c24b7aa854d7f6aaf`). Git clean filters may normalize Windows text endings; committed blob IDs are the portable identities, while working SHA-256 identifies the actual local tested/evidence bytes.

The [completion report](CUBE-C1-COMPLETION.md) lists all eight source/test/driver paths. The [numerical specification](CUBE-TERRAIN-DABS.md) describes exact fixed-chart footprint completeness, the connected Smooth stencil, finite influence/error contract, cooperative work limits, signed-zero semantics and atomic source-epoch publication. There is no per-sample full route reconstruction, new elevation authority, cube UI or save schema.

## Executed verification

| Verification | Actual result |
| --- | --- |
| Final focused tests | 50 passed, no failures/skips; 4.751 s wall |
| Final complete numerical suite | 587 passed, no failures/skips; 15.557 s wall |
| Final independent oracle | 1052 geometry cases; 110 complete dabs / 2860 raw words; 215 selected N128/N256 words across four tools; all pass |
| Final resource run | 128 successful ordinary/wide trials and two expected zero-write cap failures; 13.830 s driver wall |
| Fresh accepted Cube-A/B certificates | Both pass; original ownership/aliases/1,966,080 neighbor checks and 301 global route cases preserved |
| Full desktop/mobile browser suite | 328 passed, four existing conditional skips, zero failures/flaky; 1397.943 s wall |
| Final typecheck/build | Exit 0; 0.534 / 0.504 s wall; existing build warning retained |
| Preservation | 2435 accepted Git blobs exact; all original Cube-A terrain bytes exact after stripping only two additive C1 regions |
| Product output | Accepted HTML/main JavaScript hashes exact; no product/dev/browser-test imports of numerical cube terrain/dab modules |
| Regression artifacts | 301 decompressed entries verified by size/SHA-256: 299 generated files and two exact accepted inputs; 3 archives below 40 MiB each |

The [completion report](CUBE-C1-COMPLETION.md) links every actual log, certificate, resource measurement, source snapshot, preservation result and archive. Initial validation retained a local harness error (328 connection refusals on the previous pass's port, not application assertions); the affected historical JSON was restored and hash-verified, and the complete corrected suite passed. The failed attempt/recovery are retained explicitly.

After the browser run, raw patch validation was narrowly hardened against caller map/species, typed-view accessors, forged element prototypes and disguised shared buffers. Two adversarial tests were added. All eight numerical/certificate/resource/type/build phases were repeated against the final 256-file source registry. The [source bridge](evidence/cube-c1-source-bridge.json) records the two changed numerical/test files, their complete browser-era source snapshots, the other 254 identical files, absence of product imports and identical final production hashes. No browser consumer, UI, numerical footprint/kernel, history, codec, dependency or base configuration changed. The two source registries are intentionally distinct; do not describe them as identical.

## Bounds, measured limits and stop

Hard limits are 131,072 canonical candidates, 400,000 discovery slots, 65,536 changed words, 786,432 prepared typed-buffer bytes, 655,360 source reads and 16,000,000 bounded preparation steps. A pump accepts 1–4096 steps (default 256). Exhausted work, unmet influence accuracy, invalid data or a stale epoch fail before dab publication. The synchronous private commit validates every word and source guard before writes; it preserves per-changed-word revision semantics and the one canonical Float32 authority. Raw typed-array internal brands and extents use captured intrinsic getters rather than caller property overrides.

Final observed maxima: initialization 3.7653 ms, one 256-step pump 2.7188 ms, atomic commit 3.0589 ms; 93,193 candidates / 1,664,950 charged steps. These are desktop Node observations, not universal frame or mobile guarantees. Wide N256 preparation remains roughly half to one second; a new wide dab per pointer event is not an acceptable future stroke strategy. Process memory includes source/snapshot/diagnostics/garbage and is not an isolated allocation bound. C2 scheduling, device behavior and worker handoff remain unimplemented and require separate review/authorization.

N128/N256 dry runs preserve all **491,524 canonical Float32 words**, source revisions, ownership, identities and version-1 metadata. Distances are reference-surface-only, not elevation-displaced travel. Smooth uses real connected three/four-neighbor edges and pre-dab values; no smooth corner tangent is invented.

No continuous strokes/history, rendering, editor, normal workspace integration, Save/Open, hollow geometry, other shape, conversion, generator or site/Worlds/hosting/database/Docker/deployment/Production change is added. The eleven master phases, thirteen-item geometry order, Issues #1/#2, future independent hollow surfaces and existing Worlds integration remain intact. Flat/wrapped visual work stays deferred.

**Stop after Cube-C1 for Ember's independent review and owner approval. Cube-C2 has not begun.**
