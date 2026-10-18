# A6-C — Spherical Smooth, Flatten and multi-face reliability

October 17, 2026. Repository `Revty79/serrian-tide-world`, branch `main`. Approved baseline: `7033fe5f5013db9bac6d74792db2a642182006e2`. The owner supplied Ember's A5.2 source/test/visual-evidence approval and authorized A6-C and direct-to-main delivery. Owner hands-on focused-layout acceptance remains separate. A6-C independent review remains pending.

## Delivered engine

One numerical sphere now supports Raise, Lower, Smooth and Flatten. All tools use the existing identity-bearing physical input, conservative spherical-cap candidates, unique canonical ownership, reference-sphere geodesic falloff, radius/4 great-circle dab spacing, frozen settings, failure/cancellation lifecycle and exact bounded history. No elevation, World/surface/terrain identity, radius, ownership or representation metadata changes merely because a tool or presentation is selected.

Flatten takes `targetElevation` in finite Float32-range meters relative to the provider's defined zero sea-level/reference-sphere datum, and `intensity` as a validated 0…1 blend factor (0…100%). Positive, negative and zero targets change numerical heights. With `b=intensity×falloff`, the convex expression is `(1−b)h+b×target`, rounded/saturated to finite Float32. This reaches small targets correctly at full influence even from extreme starting magnitudes. Zero intensity and unchanged Float32 values create no history operation.

Smooth uses unique edge-connected neighbors across charts: four normally, three at the eight cube corners. Let `θij` be actual reference-sphere angular distance. Weights `(minimumNeighborAngle/θij)²` normalize to inverse squared geodesic distances without squaring physical radii. The per-dab change is `intensity×falloff×Σwij(hj−hi)/(2Σwij)`. Half of the smoothing target stays at the current vertex; half uses the weighted neighbor mean. This accounts for unequal grid spacing, avoids full-intensity checkerboard swapping and preserves constant fields exactly, including signed zero. A convex target cannot create new local extrema.

The distance policy was selected over uniform chart weights and unproved area/count heuristics. A conservative area-aware diffusion operator would need explicit dual areas and flux conductances; this local artist smoothing tool does not claim mass/volume conservation, exact rotational isotropy of a finite cube grid or a continuum PDE solver. See [complete weighting rationale, API and A6-D requirements](SPHERICAL-SCULPTING.md).

Every affected value and Smooth neighbor is read before the first write of its dab, including neighbors outside the footprint. Only prepared output chunks are retained; there is no per-dab full-field input copy or persistent halo. Corruption rejects the entire failing dab; previously completed work finishes as one operation. Whole-sphere caps may legitimately prepare all samples, bounded by the existing N≤512 provider limit.

## Correctness and compatibility

- **153/153 numerical tests pass**, preserving all 135 baseline tests and adding 18 A6-C cases with internal loops over every face/edge/corner.
- The independent reference constructs a welded quad-perimeter graph from all six face lattices, evaluates mapping directions directly, uses chord/asin angles, scans the complete sphere and blends absolute weighted values. It does not call production neighbor/cap/smoothing/falloff code. It verifies varying fields, coarse/odd grids, all chart classes, arbitrary/near poles and broad caps.
- All four tools have reference coverage at six interiors, twelve edges, eight corners and arbitrary/near poles. Smooth/Flatten add exact equivalent-chart results, multi-face footprints, all twelve great-circle edge paths and a longer corner/multi-face path. Sparse versus 31-subsegment dense paths, including duplicate events, produce identical Float32 bits.
- Smooth checks constant fields through the Float32 range, signed zero, unequal physical spacing, degree-three corners, source neighbors outside a tiny cap, synchronous snapshot behavior, reversed neighbor enumeration and seam/corner spike damping. Physically scaled radii from 1e−200 to 1e200 produce identical tool results in the fixtures.
- Flatten checks positive/negative/zero targets, zero/partial/full intensity and extreme finite starting/target heights. Invalid blends/radii/targets, nonfinite sources/neighbors, foreign identities/history and independent surfaces/terrain instances are exercised.
- Full and partial strokes preserve bit-exact Undo/Redo, no-op Redo, actual-edit branching, frozen parameters and out-of-band revision protection. No provider/history implementation changed. Existing 16 MiB/100-entry policy and documented pending-operation restrictions remain.
- **151 browser tests pass; 1 existing intentional desktop native-touch skip**, across 152 desktop/mobile cases. The unchanged suite covers A0–A5.2 navigation, native pen/touch, screen-edge drawing and phase rebasing, Focus/context previews, Fullscreen, toolbar/focus, exact history, readouts and v1/v2 local Save/Open. Desktop, ultrawide, square and tall viewports remain covered.
- `npm.cmd run build` passes, including TypeScript. The same 47 modules and baseline output names `index-DPuYz-bs.css` / `index-D7ei0THh.js` confirm the spherical layer remains outside the browser bundle.

The numerical and browser results, protected-source checks and unchanged Raise/Lower digests are recorded in the [verification receipt](evidence/a6-c-verification.json). Browser execution used the existing ignored `.local/a5-2-playwright.config.ts` override: dedicated loopback port 5175, no server reuse, same projects/tests/two workers/zero retries. Historical screenshots and receipts regenerated by old tests were restored to their approved baseline bytes; they are not presented as new A6-C artifacts. No browser test or working editor source changed.

Raise/Lower's original benchmark script was rerun. Both N=128/256 edited digests, candidate/affected/write/change counts, the signed-zero Lower fixture and all twelve sparse/dense edge results match the frozen A6-B receipt exactly. The small edits to its original test file only narrow types for the new settings union and add a discriminant assertion; all previous numerical assertions remain.

## Measured performance and memory

Local Node 24.18.0 on Windows x64. One warmup followed by three measured runs per tool/resolution, 1,000,000 m reference radius, 80,000 m brush radius, 50% intensity, 2,500 m Flatten target and the same 272-dab multi-face path as A6-B. Timings include the stroke and history commit; fixture setup and digests are excluded.

| Tool | N | Cap candidate checks | Elevation reads, including neighbors | Median stroke + commit | Peak prepared payload | Retained one-operation history |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Smooth | 128 | 93,173 | 204,779 | 586.46 ms | 32,768 B | 80,056 B |
| Flatten | 128 | 93,173 | 40,959 | 91.45 ms | 32,768 B | 80,056 B |
| Smooth | 256 | 297,750 | 818,224 | 2,242.94 ms | 32,768 B | 317,344 B |
| Flatten | 256 | 297,750 | 163,648 | 279.21 ms | 32,768 B | 317,380 B |

N=128 has 98,306 unique samples / **393,224 B** authority; N=256 has 393,218 / **1,572,872 B**. One pending history copy has the same size. Authority + pending + prepared payload is 819,216 B and 3,178,512 B respectively in these fixtures. The first-commit live typed-payload accounting (authority + two snapshots + retained entry) is 1,259,728 B at N=128, and at most 5,035,996 B at N=256. There are exactly two full elevation copies **per tracked stroke**, zero per dab; the no-history tests use zero full copies. Each dab's transient neighborhood is at most four value/angle records. Prepared output is `32,768×ceil(changedSamples/4096)` bytes and at most `8S+32,768` bytes for any accepted resolution. Existing retained history and object/GC/runtime overhead are additional.

These are synchronous local numerical timings and counted live payloads, not total process RSS, peak allocations including garbage, or desktop/mobile globe interaction measurements. Large footprints and long synchronous paths can take longer; A6-D must separately validate scheduling/input/rendering budgets. Reproduce with `node scripts/measure-spherical-tools.mjs [output.json]`. The [raw receipt](evidence/a6-c-sculpting-receipt.json) includes all runs, paths, counters, memory accounting and exact Undo/Redo digests.

## Exact changed files

| File | Change |
| --- | --- |
| `src/terrain/spherical-brush.ts` | Discriminated settings, blend/target validation and two tools in the existing preparation/stroke path |
| `src/terrain/spherical-smoothing.ts` | Read-only connected geodesic-distance weighting kernel |
| `src/terrain/spherical-brush.test.ts` | Type narrowing only, plus settings discriminant assertion; prior behavior assertions preserved |
| `src/terrain/spherical-tools.test.ts` | Independent mesh oracle and 18 numerical regression cases |
| `scripts/measure-spherical-tools.mjs` | Reproducible N=128/256 numerical performance/history evidence |
| `docs/evidence/a6-c-sculpting-receipt.json` | Measured counters, timings, payloads and digests |
| `docs/evidence/a6-c-verification.json` | Baseline/source/build/browser and Raise/Lower preservation receipt |
| `docs/SPHERICAL-SCULPTING.md` | Four-tool API, mathematical policy, memory limits and documented A6-D interface |
| `docs/WORLD-SURFACE-ARCHITECTURE.md` | Current capabilities and future projection/provider boundary |
| `docs/ARCHITECTURE.md` | Pure numerical layer ownership and current stop point |
| `docs/PHASE-1-HEIGHTMAP-ROADMAP.md` | Owner-reported A5.2 approval, A6-C status, A6-D boundary; complete future inventory retained |
| `README.md` | Current engine, API, reproduction commands and review boundary |
| `docs/A6-C-COMPLETION.md` | This report |

## Remaining boundary and delivery

A6-D must supply physical rotation/recentering, suitable local/cutout/gore/multi-face views, projection-independent input conversion, correctly projected geodesic previews, predictable navigation/appropriate edge assistance and usable poles/transitions. Those requirements are documented, not implemented. The sphere must never be treated as a periodic rectangular terrain.

No spherical UI, 3D globe, browser spherical codec, other geometry, generator or Worlds integration is included. Existing bounded/periodic maps and save formats remain unchanged. The complete roadmap retains advanced tools, all world geometries, 2D illustrated/topographic cartography, living history, nested maps and [Issue #1](https://github.com/Revty79/serrian-tide-world/issues/1). Integration remains Step 9: Atlas + separately rebuilt Worlds and joint functionality; Step 10: completed combined system into Serrian Tide; Step 11: reusable historical/modern Earth foundation.

Delivered directly on `main`; the final handoff supplies the exact full commit SHA after push verification. This report's containing commit is identifiable with `git log -1 --format=%H -- docs/A6-C-COMPLETION.md`. No deployment or original-site/database mutation is part of delivery. **STOP after A6-C for review. Do not begin A6-D without authorization.**
