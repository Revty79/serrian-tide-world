# Cube-A — True solid cube numerical foundation

Approved starting point: A7-P1C delivery `ee92f24f899a5776c43943cdeeb0b8ed049d1b8a`, implementation `b32cf840adfe5189831ba7082e129390d2e197ce`. The owner accepted the sphere hands-on and authorized Cube-A; Ember accepted published source/evidence for development progression without independently rerunning complete suites. Work is confined to `serrian-tide-world` on `main`.

Implementation and exact delivery inventory: see [delivery receipt](CUBE-A-DELIVERY.md), recorded after the implementation commit. This report describes the bounded numerical foundation, not a selectable cube editor. Independent Cube-A review and authorization of a next checkpoint remain outstanding.

## Result and source inventory

| File | Change |
| --- | --- |
| `src/surfaces/solid-cube.ts` | Independent versioned physical solid cube provider: explicit L meters; six planar, outward-oriented square faces; twelve real edges/eight singular corners; exact chart aliases; reciprocal edge records; scoped ChartSeams; rigid right-angle tangent folds; face metric, restricted distance and edge-distance functions; input/range validation |
| `src/terrain/solid-cube.ts` | One private bounded Float32 authority; shared boundary ownership; World/surface/terrain/provider/version/L/N checked keys; lazy samples, exact aliases, reciprocal mesh neighbors and explicit edge address conversion; finite writes and exact changed-word revisions |
| `src/surfaces/solid-cube.test.ts` | Independent literal net, Cartesian expectations, lengths, all directed transitions, corner aliases/holonomy, invalid inputs and compatibility with the existing custom World descriptor |
| `src/terrain/solid-cube.test.ts` | Independent integer box enumeration, ownership and mesh counts, exhaustive N128/N256 physical aliases, Float32 words/signed zero/revisions, decimal/odd-grid aliases, identity isolation and memory/range limits |
| `scripts/verify-solid-cube.mjs` | Reproducible exhaustive N128/N256 geometry/ownership/word/neighbor certificate with actual Node timings |

Existing runtime, editor, tests, persistence, dependency and build-configuration files are unchanged. Five existing documentation files are updated: README, architecture, World/surface architecture, master roadmap and visual standard. The new [foundation specification](SOLID-CUBE-FOUNDATION.md) defines units, topology, ownership, limits, corner behavior and future boundaries. All evidence/delivery files are enumerated in the receipt inventory.

## Numerical evidence

See [exhaustive geometry certificate](evidence/cube-a-final-geometry-certificate.txt), [focused test log](evidence/cube-a-final-focused.txt) and [foundation mathematics](SOLID-CUBE-FOUNDATION.md).

| Property | N128 | N256 |
| --- | --- | --- |
| Canonical vertices, `6N²+2` | 98,306 | 393,218 |
| Face-interior vertices | 96,774 | 390,150 |
| Edge-interior vertices | 1,524 | 3,060 |
| Shared corners | 8 | 8 |
| Exact face-address/word/physical-position checks | 99,846 | 396,294 |
| Mesh edges | 196,608 | 786,432 |
| Mesh quads | 98,304 | 393,216 |
| Directed reciprocal neighbor/physical-length checks | 393,216 | 1,572,864 |
| Euler characteristic | 2 | 2 |
| Private Float32 payload bytes | 393,224 | 1,572,872 |

All face embeddings are independently specified as Cartesian planes. A literal expected net verifies all 24 directed transitions, including reversal, reciprocal return, boundary endpoints and inverse orthogonal tangent matrices. Every canonical vertex has a unique independently enumerated physical point. Face aliases share one sample, not synchronized copies. Small-N tests independently enumerate the boundary of an `(N+1)³` box; target-N sweeps check every face address, value and physical location, then the complete reciprocal neighbor graph. Every alias is checked against the expected exact Float32 word. Separate tests exercise +0/−0, fractional and extreme finite values across every boundary edge and corner.

Local meter lengths include the independent 3–4–5 result, length-L edges, `√2 L` face diagonals and known distances to each boundary. The reference area is `6L²`; cube corner radius differs from face-center radius, so this is a physical cube rather than a round cube-sphere. No spherical great-circle, cylinder distance or curved projection arithmetic is imported.

At a corner, three one-sided face normals remain distinct. An explicit fold choice is valid; automatic smooth continuation is undefined. The +++ corner loop produces the expected 90-degree holonomy, and direct versus two-edge tangent transport differs. This is intentional physical behavior, not an alias inconsistency. No global shortest-route claim is made.

## Verification

Final results are recorded in [validation commands, exit codes and wall times](evidence/cube-a-validation.json), the [full numerical log](evidence/cube-a-final-numerical-regression.txt), [browser log](evidence/cube-a-browser-regression.txt) and [structured browser report](evidence/cube-a-browser-result.json).

Focused numerical tests: **29/29 passed**. Full numerical regressions: **500/500 passed**, no skips or failures. Desktop/mobile browser regressions: **328 passed, 4 existing conditional skips, 0 failures, 0 flaky**, exit 0 in **1,594.700 s** (26 min 34.7 s wall). Final typecheck: exit 0. Final production build: exit 0.

The final focused/certificate/numerical/type/build checks were repeated after the new provider's sparse/array-like vector validation was tightened. Numerical regressions took **17.070 s**, typecheck **0.540 s**, and build **0.549 s**. All eleven recorded validation phases exited 0; the interrupted browser attempt is separately identified rather than counted as a passing full run.

The build retains the existing Vite chunk-size warning. The accepted production HTML and main JavaScript bundle are byte-identical; Cube-A is not imported by the product. Browser tests exercise the unchanged unified workspace, existing geometries, navigation, brushes, exact history, native input and mixed v1–v4 preservation. No cube screenshots or interactive traces are claimed because Cube-A deliberately has no UI.

The first browser attempt was stopped after default artifact filenames overwrote 11 historical evidence files. Every affected file was restored to its exact accepted Git blob; the [recovery record](evidence/cube-a-interrupted-run.json) identifies them. The final run uses an isolated working directory and the same unmodified test sources, with a separate strict loopback server. It receives exact copies of the two accepted sphere fixture inputs. Historical evidence is protected and is not replaced by new results.

The isolated run produced **299 new browser artifacts** plus two exact accepted input fixtures. All **301 entries** are delivered in three archives, each below 40 MiB: [part 1](evidence/cube-a-browser-artifacts-1.zip), [part 2](evidence/cube-a-browser-artifacts-2.zip), [part 3](evidence/cube-a-browser-artifacts-3.zip). The [entry manifest](evidence/cube-a-browser-artifacts.json) distinguishes generated outputs from inputs; [archive verification](evidence/cube-a-browser-archive-proof.json) checks every decompressed size and SHA-256. These are existing-editor regression artifacts, not cube UI evidence. Exact browser/final-numerical/config/preservation/archive drivers are included as TXT under the Cube-A evidence prefix.

## Preservation

[Preservation audit](evidence/cube-a-preservation.json) checks every protected accepted Git blob, the unchanged eleven-phase table, Issues #1/#2, exact test-source hashes, and accepted build hashes. The final numerical/type/build [registry](evidence/cube-a-tested-source.json) and [source freeze](evidence/cube-a-source-freeze.json) cover **242 files**. The browser run's original [registry](evidence/cube-a-browser-tested-source.json) and [freeze](evidence/cube-a-browser-source-freeze.json) are preserved separately. After that successful run, only the two new, unimported cube geometry/geometry-test files changed to reject sparse/array-like vectors. The [source bridge](evidence/cube-a-source-bridge.json) records both hashes and the 240 unchanged registry entries. Product/browser consumers did not change; accepted HTML/main-bundle hashes remain exact. Final numerical tests, the certificate, typecheck and build exercise the tightened provider. The browser suite was not redundantly rerun for this unimported numerical guard correction.

All existing spherical, cylindrical, bounded and wrapped providers, brush/history/session modules, codecs, saved fixtures, library behavior, numerical budgets and dependency versions are preserved. The original Serrian Tide website, its Worlds/Atlas, separately rebuilt Worlds, database, Docker, deployments and Production were untouched. No server GPU, service or infrastructure was introduced. The historical 184-case P1C accepted-source certificate remains preserved; this checkpoint does not claim an independent rerun of its 90,440,416 comparisons.

## Limits and actual timings

Maximum N is 256. One authority allocation is 0.375008 MiB at N128 or 1.500008 MiB at N256. Explicit copies, JS bookkeeping, test allocations and runtime overhead are extra; this is a payload bound, not a total heap/RSS claim. Construction and copies are synchronous bounded O(N²) operations; a future editor must separately design cancelable preparation and measure device behavior. No worker scheduling or numerical budget changes were needed for this foundation.

In the single Windows/Node v24.18.0 certificate trial, construction took **0.800 ms / 0.500 ms**, alias sweeps **209.554 ms / 688.744 ms**, and complete reciprocal graph sweeps **1733.640 ms / 7271.947 ms** at N128/N256 respectively. Verification/temporary allocations and GC are included in the sweeps. These are not percentile benchmarks, browser measurements or physical-phone evidence, and differences between construction trials do not establish a performance improvement.

The owner accepts P1C's hands-on sphere experience. Its slower first-visible changes in 31/32 groups remain a follow-up, alongside CPU-fallback/weak-device costs and lack of physical-phone testing. Faster drain in 48/64 sustained trials is a separate outcome. None of these costs become an assumed acceptable standard for future cube rendering or painting.

Not implemented: global shortest cube routes, automatic corner-through paths, brushes, exact stroke history adapter, renderer/projections/navigation, world-shape selection, Cube Save/Open, hollow/interior cubes, conversion, generation, 3D displacement, illustrated cartography or integration. Elevation is a scalar on the reference boundary; future elevated sharp-edge/corner geometry must be specified rather than implied by the sample aliases.

## Roadmap and stopping point

The [master roadmap](PHASE-1-HEIGHTMAP-ROADMAP.md) records A7-P1C acceptance, the owner's 13-item geometry priority order, deferred flat/wrapped overhaul and all eleven unchanged master phases. It explicitly preserves non-destructive conversion, independent eligible interior/exterior surfaces, creator-owned mapping assets, vehicle/mobile-structure mapping, flexible linked-map hierarchies and Issue #1's terrain measurement/3D/Worlds requirements as future scope. Existing Worlds remains the eventual integration target in the approved sequence.

Proposed next bounded checkpoint: **Cube-B — certified physical polyhedral surface routes and corner/path semantics**, numerical only. Define valid face unfoldings, route families, vertex/tie handling, precision/work limits and independently checked lengths before brushes or UI. Hollow cubes later need independent surface/terrain/history/persistence/selection under one parent World. Neither proposal is implemented or authorized by this report.

**Stop after Cube-A for Ember's independent review and the owner's authorization.**
