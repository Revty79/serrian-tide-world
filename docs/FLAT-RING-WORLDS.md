# Flat Ring Worlds

Pass 20 is operational and technically verified. Create **Flat Ring World** next to Flat Disc in the World shape selector. New geography starts at the shared -100 m blank ocean. Owner acceptance and physical-device review remain separate from the evidence below. This completes the currently authorized shape queue; stop here for owner/Ember inventory review.

## Publication

| Checkpoint | Commit | Frozen evidence |
| --- | --- | --- |
| A: geometry and numerical foundation | `d04d5e7951fb43d92494bf25ecd2619aa7c4e265` | [Foundation receipt](evidence/flat-ring-foundation/receipt.json) |
| B: operational editor | `94b1b3bdad9817529de95758798045ad2cb0d666` | [Editor receipt](evidence/flat-ring-editor/receipt.json) |
| C: final qualification | Publication commit containing this report and final receipt; its SHA is supplied with delivery. | [Final receipt](evidence/flat-ring-final/receipt.json) |

A/B receipts remain immutable at their own commits. C identifies passing cases and phase provenance; it does not imply every historical probe passed or was repeated against one identical source snapshot.

## Physical construction, topology and reuse

Material is the annular slab `Ri <= sqrt(x*x+y*y) <= Ro`, `0 <= z <= H`. Its single closed, connected genus-one boundary comprises upper/lower planar annuli, inward-facing inner and outward-facing outer cylindrical walls, and four real shared crease circles. Only angle is periodic. Upper/lower samples are distinct away from real joins. There are no center samples, filled disk caps, terrain across the opening or torus approximation. World, boundary and terrain have distinct stable identities.

The adapter reuses Open Cylinder positions, normals and canonical ownership. The editor reuses accepted cylinder Hermite reconstruction, gradients, palette/relief, coherent raster epochs, ConnectedWorkspace input/navigation, bounded workers, rolling ACK-gated scheduling, whole-gesture history and local persistence. Flat Ring supplies configuration, global distance certificates, physical focus and maps. Inner-wall focus looks through the real hole without fitted inversion.

Both backends retain that accepted field/shading. Flat Ring additionally qualifies four actual rays at material creases: intersect real walls/annular planes, select actual patches/normals, then reconstruct terrain. This geometry coverage correction is opt-in; existing Open Cylinder/Ringworld defaults remain unchanged. Wall/inner-rim focus uses 125% working zoom, caps/outer rims 150%, overview 100%; zoom remains adjustable.

## Supported creator configuration

| Control | Supported range/default |
| --- | --- |
| Ring Diameter | 1,000,000 to 1,000,000,000 m; default 2,000,000 m |
| Hole Diameter | 6 to 85% of Ring Diameter; default 700,000 m |
| Ring Width | `(Ring Diameter - Hole Diameter)/2`; default 650,000 m |
| Ring Thickness | 5 to 15% of Ring Diameter; default 150,000 m |
| Terrain Detail | Standard N128 or Higher N256; Small opening requires Higher |
| Presets | Standard, Wide, Narrow, Small opening, Large opening, Thin, Thick |

Changing Ring Diameter scales structural dimensions proportionately. Invalid dimensions/unsuitable detail are rejected before creation. Dimensions and detail are creation-only; saving another structure under an existing identity is rejected.

Presets use `(Ri/Ro,H/Ro)`: Standard `(0.35,0.15)`, Wide `(0.20,0.12)`, Narrow `(0.80,0.15)`, Small opening `(0.06,0.15)`, Large opening `(0.85,0.10)`, Thin `(0.35,0.10)`, Thick `(0.35,0.30)`.

Upper/lower maps are XY annuli with empty centers; the lower map is oriented from below. Inner/outer wall maps use their actual different circumferences and periodic cuts. Their 4x working zoom is adjustable to inspect the complete circumference. The complete boundary map unwraps all four connected regions. Every view edits the same canonical geography.

## Intrinsic distance and brushes

Influence follows globally certified distance on the reference boundary. Same-cap paths reuse the accepted planar annulus metric: a feasible chord or tangents plus an inner-circle arc. Inner-wall routes use the accepted helix and inner-to-rim certificates. Opposite caps/multi-rim routes add a cyclic-meridian dual calibration for `ds^2 = dm^2 + r(m)^2*dtheta^2`, paired with a physically feasible upper-bound path. Closed-cylinder relaxations require actual chord-containment verification. Unresolved certificates fail explicitly; graph distance and ambient shortcuts are not substitutes.

Brush radius is 0.5 to 18% of Ro, up to 20% when Ri/Ro is below 0.20. Default is `min(0.036Ro,0.30Ri,0.40H,0.18(Ro-Ri))`. The accepted physical visibility guard rejects dabs reaching hidden samples; rotate, reduce radius or use maps. Maps support legitimate influence around the hole and through both inner rims without chart barriers.

Maximum-radius tests cover every preset and configuration boundaries at smallest/largest World sizes. The Small opening browser probe confirms a 150,000 m brush cannot shortcut a 120,000 m ambient chord across the hole, while a 200,000 m brush reaches opposite upper geography around the inner arc and lower geography through the wall. Empty-hole clicks change nothing. Continuous strokes cross all four rims and the angular seam.

Optimization memoizes only immutable geometry calculations: one annular metric per geometry and at most 256 exact-radius endpoint angles. No rounded keys or cached heights/influence results. **108,084 candidate distance enclosures were exactly equal before and after optimization.**

## Detail and resource limits

Let `A=2N`, or `A=N` when `Ri/Ro<0.20`; `s=2*pi*Ro/A`; `Z=max(2,ceil(H/s))`; `P=max(2,ceil((Ro-Ri)/(2s)))`. Each annulus has `2P` radial cells. Single-owner canonical storage is `A*(2Z+4P)` Float32 words.

| Preset | N128 words | N256 words |
| --- | ---: | ---: |
| Standard | 17,920 | 68,608 |
| Wide | 19,968 | 77,824 |
| Narrow | 8,704 | 31,744 |
| Small opening | Unsupported | 24,064 |
| Large opening | 6,656 | 23,552 |
| Thin | 16,896 | 64,512 |
| Thick | 20,992 | 80,896 |

The unchanged hard cap is 131,072 words; the largest supported configuration uses 93,184 words (372,736 authority bytes). GPU crease duplication adds `4A` texture words; GPU geometry uses 2,359,920 bytes including annular map meshes. History stays 32 entries/8 MiB. Per-dab limits stay 8,192 candidates, 4,096 distance queries, 65,536 aggregate distance boxes and 65,536 prepared bytes. Queue/scheduling/GPU caps are unchanged. Settled Canvas stays within 1.5 million desktop or 650,000 coarse-pointer pixels; refinement yields to input.

Inherited clearance is `-min(width,H)/4 <= elevation <= min(width/2,Ri/4,H/4)`. Out-of-range operations fail; viewing/loading never silently clamp or rewrite geography.

## Browser measurements and rendering

Installed Chrome used hardware WebGL2 on AMD Radeon RX 6600 and forced Canvas fallback. Measurements capture trusted pointer input, commits and actual changed pixels. Nine-region Raise strokes are timed; all four tools are checked for admitted input, complete processing, changed geography and exact history.

| Standard preset | Worst regional painting p95 | Sustained 15 s map p95 | Worst first changed pixels |
| --- | ---: | ---: | ---: |
| N128 WebGL2 | 41.4 ms | 28.4 ms | 54.7 ms |
| N128 Canvas | 116.5 ms | 45.1 ms | 132.3 ms |
| N256 WebGL2 | 46.6 ms | 27.6 ms | 59.1 ms |
| N256 Canvas | 61.1 ms | 30.6 ms | 77.8 ms |

All pass unchanged ordinary p95 125 ms, sustained 100 ms and first-change 1,000 ms gates. Thin/Thick continuous four-rim strokes have worst p95 42.9 ms WebGL2/72.2 ms Canvas. The Small opening maximum-radius probe has 49 painted epochs/backend: p95 76.6 ms WebGL2/122.6 ms Canvas. Actual-pixel rotation p95 is 16.8 ms WebGL2/114.8 ms Canvas, below 150 ms. These are measurements on this PC.

The final **96-view** matched sweep covers Standard N128/N256 and all six alternate N256 presets with identical heights, camera, backing and appearance per pair. Independent wall/plane intersections and map domains check real material and hole coverage. Maximum stable GPU/Canvas and independent-field differences are **1 channel value**, Canvas four-ray coverage error **0**, and missing-material/geometry/coastline-envelope/GPU-silhouette violations **0**. The comparator checks every pixel in the existing two-pixel neighborhood; thresholds were not relaxed. Incremental output equals fresh reconstruction in **60 comparisons/backend**, with zero different channels. Reopened current/fresh outputs also match exactly.

Qualification comprises **46 distinct passing Flat Ring browser cases**, **19 passing affected-family regressions**, 297 relevant source checks, TypeScript and production build. Phases retain unaffected earlier tests with exact numerical equivalence/final pixel qualification after optimization. The 12 nonstandard configuration workflows predate final caches; the creator case was rerun after caption cleanup. GPU Thin/Thick joins used earlier 150% focus; final Canvas joins/all four standard workflows use qualified 125% wall/inner focus. The [selected-case manifest](evidence/flat-ring-final/selected-cases.json) identifies exact provenance, retained scope and superseded failed probes.

Regressions cover Flat Disc, solid/capped-hollow Cylinder, Open Cylinder, Ringworld, physical Torus, shared input/history/Save/Open and matched cylinder/annular pixels. The restored baseline has no separate Filled Torus provider, so no separate result is claimed. Unaffected World suites were not repeated wholesale.

## Exact history, Save/Open and recovery

Raise/Lower/Smooth/Flatten preserve exact whole-gesture Float32 Undo/Redo across all regions, rims and seam. Worker/host equality, large routes, active protocol faults, exact failed-prefix history and subsequent fresh strokes are verified. Graphics loss/restoration preserve current geography/output. Navigation preserves geography/history.

Dedicated **format 43** strictly validates exact keys, identities, topology/region mapping, dimensions/detail, sample count, finite/range-valid Float32 payload, checksum, controls and camera. Private decoded words preserve exact bits including negative zero. Unknown fields, corrupt payloads, invalid structures and identity replacement fail; failed Open retains the active document/output atomically. Browser Save/Open retains dimensions, view and geography, then supports continued painting. Existing formats keep their interpretation; legacy browser round trips passed.

## Limits and remaining owner acceptance

Structural resizing, unrestricted brush radii, arbitrary-height/depth excavation, holes/tunnels/links, custom geometry and further shapes are outside this pass. Presentation retains the accepted reference-body relief model and explicit clearance/visibility limits. The production build retains its existing large-chunk advisory; no packaging overhaul was undertaken.

Trusted CDP touch/pen drawing and two-finger navigation passed with the coarse-pointer budget. This is emulation, not a physical touchscreen result. Remaining acceptance is ordinary desktop painting/navigation/appearance review by the owner, physical touch/pen review on intended devices, and owner/Ember shape inventory. Automated results do not grant that acceptance. No website integration, database change or deployment is included.
